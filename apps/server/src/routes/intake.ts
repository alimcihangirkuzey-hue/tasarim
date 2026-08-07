/* Sipariş Modu intake commit — F7-C. ATOMİK tek uç (tek transaction; hata → tam
   rollback → yarım müşteri/kayıt YOK, D). Adımlar: müşteri (yeni ise) yarat →
   catalog_history yedek → projectIntake APPEND (ŞERH 1: mevcut kategori/ürün ASLA
   değişmez/silinmez, M5) → usage_count bump (B1 #5 borcu) → intake_record yaz
   (denetim izi, K1). */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CatalogSchema,
  CurrencySchema,
  INGREDIENT_SEED,
  IntakeAnswersSchema,
  MenuLanguageSchema,
  appendIntakeCategories,
  defaultBrandKit,
  defaultCatalog,
  newId,
  nowISO,
  planUsageBump,
  projectIntake,
  type Catalog,
  type IngredientLibraryRow,
  type IntakeRecordDTO,
} from "@tezgah/shared";
import { db } from "../db.js";
import { uniqueSlug } from "./clients.js";
import { extractSurfaces, upsertClientSurfaces } from "../surfaces.js";

const IntakeCommitSchema = z
  .object({
    client_id: z.string().optional(),
    new_client: z
      .object({
        name: z.string().min(1).max(120),
        currency: CurrencySchema.optional(),
        menu_language: MenuLanguageSchema.optional(),
      })
      .optional(),
    answers: IntakeAnswersSchema,
    /* Doneler/şartlar çeklisti — esnek (UI şekli, denetim izi olarak saklanır) */
    checklist: z.record(z.unknown()).default({}),
  })
  .refine((b) => !!b.client_id !== !!b.new_client, {
    message: "client_id VEYA new_client — tam biri gerekli",
  });

type ClientRow = { id: string; menu_language: string; currency: string; catalog_json: string };

const SEED_IDS = new Set(INGREDIENT_SEED.map((c) => c.id));

/* Uca özgü olan YALNIZ DB satır biçimidir; dışa dönen DTO tek kaynaktan
   (@tezgah/shared IntakeRecordDTO) gelir — render.ts'in ExportRow/toDTO kuralı:
   kolon adı ≠ API alanı sürüklenmesi tek yerde yakalanır. */
type IntakeRecordRow = {
  id: string;
  client_id: string;
  answers_json: string;
  checklist_json: string;
  created_at: string;
};

/* GÖRÜNÜR/SABİT TAVAN (render.ts:410-412 emsali): sınırsız gövde yerine belgeli
   bir kesim. Sayfalama borcu doğarsa additive açılır — sessiz kırpma DEĞİL. */
const INTAKE_RECORDS_LIMIT = 100;

/* SAVUNMALI ÇÖZÜM (render.ts toIntegrationEventDTO emsali): bu iki sütunu yazan
   tek yol yukarıdaki commit'tir ve JSON.stringify eder — ama bozuk TEK bir satır
   denetim izinin TAMAMINI okunmaz kılmamalıdır (izin değeri sürekliliğindedir).
   Bozuk/dizi/skaler gövde {} olur, satırın geri kalanı görünür kalır. */
function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* düşülür — aşağıdaki boş nesne döner */
  }
  return {};
}

function toIntakeRecordDTO(r: IntakeRecordRow): IntakeRecordDTO {
  return {
    id: r.id,
    client_id: r.client_id,
    answers: parseJsonObject(r.answers_json),
    checklist: parseJsonObject(r.checklist_json),
    created_at: r.created_at,
  };
}

export function intakeRoutes(app: FastifyInstance): void {
  app.post("/api/intake", async (req, reply) => {
    const body = IntakeCommitSchema.parse(req.body ?? {});
    /* F8-A ATOMİKLİK: yüzeyleri transaction'dan ÖNCE doğrula — bozuksa
       ChecklistSurfacesSchema.parse ZodError fırlatır → setErrorHandler 400'e
       çevirir, transaction HİÇ AÇILMAZ (yeni müşteri/intake_record/katalog
       doğmaz; sessiz yarım kayıt YASAK). */
    const surfaces = extractSurfaces(body.checklist);
    const now = nowISO();
    const idSeed = now.slice(0, 19).replace(/[:T-]/g, "");

    const result = db.transaction(() => {
      /* 1. Müşteri: mevcut yükle ya da YENİ yarat (clients create deseni birebir) */
      let client: ClientRow;
      let createdClient = false;
      if (body.client_id) {
        const row = db
          .prepare("SELECT id, menu_language, currency, catalog_json FROM clients WHERE id = ?")
          .get(body.client_id) as ClientRow | undefined;
        if (!row) throw Object.assign(new Error("client_not_found"), { statusCode: 404 });
        client = row;
      } else {
        const nc = body.new_client!;
        const id = newId("cli");
        const row = {
          id,
          name: nc.name.trim(),
          slug: uniqueSlug(nc.name),
          notes: "",
          currency: nc.currency ?? "EUR",
          menu_language: nc.menu_language ?? "fr",
          brandkit_json: JSON.stringify(defaultBrandKit()),
          catalog_json: JSON.stringify(defaultCatalog()),
          created_at: now,
          updated_at: now,
        };
        db.prepare(
          `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
           VALUES (@id, @name, @slug, @notes, @currency, @menu_language, @brandkit_json, @catalog_json, @created_at, @updated_at)`
        ).run(row);
        client = { id, menu_language: row.menu_language, currency: row.currency, catalog_json: row.catalog_json };
        createdClient = true;
      }

      const current: Catalog = CatalogSchema.parse(JSON.parse(client.catalog_json));
      const hadCategories = current.categories.length > 0;

      /* 2. Projeksiyon (menü diline göre). CILA4/EK-1: tr de geçer (tr→fr→de);
         bilinmeyen değer güvenli fr'ye düşer (MenuLanguageSchema.catch). */
      const menuLang = MenuLanguageSchema.catch("fr").parse(client.menu_language);
      const projected = projectIntake(body.answers, idSeed, menuLang);

      /* 3. T1b/FIX-3: birleşme-duyarlı APPEND (ŞERH 1 / M5 korunur). Projeksiyon
         kategorisi mevcutta foldTr eşleşmesi buluyorsa mükerrer AÇILMAZ — ürünler
         mevcut kategoriye eklenir (mevcut satırlar dokunulmaz); eşleşmeyenler
         eskisi gibi sona eklenir, order yeniden numaralanır. */
      const merge = appendIntakeCategories(current.categories, projected.categories);
      const nextCatalog: Catalog = { ...current, categories: merge.categories };

      /* 4. catalog_history yedek (geri-al güvencesi) */
      db.prepare(
        `INSERT INTO catalog_history (id, client_id, catalog_json, reason, created_at) VALUES (?, ?, ?, ?, ?)`
      ).run(newId("ch"), client.id, client.catalog_json, "Sipariş Modu intake öncesi", now);

      /* 5. Katalog yaz */
      db.prepare("UPDATE clients SET catalog_json = ?, updated_at = ? WHERE id = ?").run(
        JSON.stringify(nextCatalog),
        now,
        client.id
      );

      /* 6. usage_count bump (B1 #5): kullanılan kütüphane çipleri (chip_id'li) */
      const usedIds = body.answers.items
        .flatMap((it) => it.chips)
        .map((c) => c.chip_id)
        .filter((x): x is string => !!x);
      const dbRows = db
        .prepare("SELECT id, tr, fr, de, usage_count, source, created_at FROM ingredient_library")
        .all() as IngredientLibraryRow[];
      const plan = planUsageBump(SEED_IDS, dbRows, usedIds);
      const inc = db.prepare("UPDATE ingredient_library SET usage_count = usage_count + 1 WHERE id = ?");
      for (const id of plan.increment) inc.run(id);
      const insSeed = db.prepare(
        `INSERT INTO ingredient_library (id, tr, fr, de, usage_count, source, created_at)
         VALUES (@id, @tr, @fr, @de, 1, 'seed', @created_at)`
      );
      for (const id of plan.insertSeed) {
        const seed = INGREDIENT_SEED.find((c) => c.id === id);
        if (seed) insSeed.run({ id: seed.id, tr: seed.tr, fr: seed.fr, de: seed.de, created_at: now });
      }

      /* 7. intake_record (denetim izi, K1) */
      const intakeId = newId("intk");
      db.prepare(
        `INSERT INTO intake_records (id, client_id, answers_json, checklist_json, created_at) VALUES (?, ?, ?, ?, ?)`
      ).run(intakeId, client.id, JSON.stringify(body.answers), JSON.stringify(body.checklist), now);

      /* 8. F8-A: yapısal yüzeyler → müşteri profili (UPSERT, aynı transaction —
         atomik). intakeId denetim izi köprüsü. Boşsa no-op. */
      const surfaceResult = upsertClientSurfaces(db, client.id, surfaces, intakeId, now);

      return {
        client_id: client.id,
        created_client: createdClient,
        intake_id: intakeId,
        /* T1b: artık GERÇEKTEN YENİ açılan kategori sayısı (birleşenler hariç) */
        applied_categories: merge.addedCategories,
        /* T1b/FIX-3 görünürlüğü (M8): mevcut kategorilere birleşenler */
        merged_into_existing: merge.mergedInto,
        catalog_had_categories: hadCategories, // ŞERH 1 uyarısı UI özetinde
        pending: projected.pending,
        translationGaps: projected.translationGaps,
        skipped_bumps: plan.skipped, // ŞERH 4: sessiz değil
        surfaces_saved: surfaceResult.total, // F8-A: özet/sonuç ekranı görünürlüğü (M8)
      };
    })();

    reply.code(201);
    return result;
  });

  /* DENETİM İZİ OKUMA UCU — KAYITLI KUSURUN KAPANIŞI.
     intake_records bugüne kadar YALNIZ yazıldı. Bu, depoda ADIYLA kayıtlı bir
     kusurdu: render.ts:407-409 ve render-channel.test.ts:289-291, yeni tabloya
     okuma ucu açarken bunu emsal DEĞİL kusur diye işaretler — *"Bu bir DESEN
     değil, kayıtlı bir KUSURDUR; yeni tablo onu tekrarlamaz — 'orada da yok'
     bir gerekçe olamaz."* Aynı gerekçe kendi tablosuna da uygulanır: yazılıp
     hiç okunmayan tablo denetim izi değil, ölü depodur (9.1/665 — denetim izi
     değişmezdir; değişmezlik OKUNABİLİRLİK olmadan denetlenemez).

     404 client_not_found: surfaces.ts:12-13 (müşteri-alt-kaynağı) deseni. Boş
     dizi dönmek "bilinmeyen müşteri" ile "hiç intake'i olmayan müşteri"yi
     birbirine karıştırırdı — denetimde bu iki cevap aynı şey değildir.
     Sıra created_at DESC: denetim önce "az önce ne oldu" diye sorar. İkincil
     anahtar rowid DESC — nowISO milisaniye çözünürlüğündedir ve aynı saniyede
     iki commit created_at'te EŞİTLENEBİLİR; eşitlikte SQLite'ın döndüreceği
     sıra tanımsız kalırdı. rowid ekleme sırası hakkında yalan söylemez
     (render-channel.test.ts:64-66'nın `sonIz` şerhiyle aynı gerekçe).

     SALT OKUMA: bu uç yazma/güncelleme/silme yolu AÇMAZ — intake_records
     append-only bir izdir (düzenleme TODO:168'in ayrı işi). */
  app.get<{ Params: { id: string } }>("/api/clients/:id/intake-records", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id);
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    const rows = db
      .prepare(
        `SELECT id, client_id, answers_json, checklist_json, created_at
           FROM intake_records
          WHERE client_id = ?
          ORDER BY created_at DESC, rowid DESC
          LIMIT ?`
      )
      .all(req.params.id, INTAKE_RECORDS_LIMIT) as IntakeRecordRow[];
    return rows.map(toIntakeRecordDTO);
  });
}
