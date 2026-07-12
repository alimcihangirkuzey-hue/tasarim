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
  defaultBrandKit,
  defaultCatalog,
  newId,
  nowISO,
  planUsageBump,
  projectIntake,
  type Catalog,
  type IngredientLibraryRow,
} from "@tezgah/shared";
import { db } from "../db.js";
import { uniqueSlug } from "./clients.js";

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

export function intakeRoutes(app: FastifyInstance): void {
  app.post("/api/intake", async (req, reply) => {
    const body = IntakeCommitSchema.parse(req.body ?? {});
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

      /* 3. APPEND (ŞERH 1 / M5): sona ekle, order yeniden numaralandır. Projeksiyon
         id'leri (ord_<seed>) mevcutlarla çakışmaz; mevcut kategori/ürün dokunulmaz. */
      const mergedCats = [...current.categories, ...projected.categories].map((c, i) => ({ ...c, order: i + 1 }));
      const nextCatalog: Catalog = { ...current, categories: mergedCats };

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

      return {
        client_id: client.id,
        created_client: createdClient,
        intake_id: intakeId,
        applied_categories: projected.categories.length,
        catalog_had_categories: hadCategories, // ŞERH 1 uyarısı UI özetinde
        pending: projected.pending,
        translationGaps: projected.translationGaps,
        skipped_bumps: plan.skipped, // ŞERH 4: sessiz değil
      };
    })();

    reply.code(201);
    return result;
  });
}
