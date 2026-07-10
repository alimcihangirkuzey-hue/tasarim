/* Çip kütüphanesi servisi — F7-B1. SEED ∪ DB (parse_synonyms hizası): tüm mantık
   @tezgah/shared'daki saf fonksiyonlarda; burası ince tutkal (db oku/yaz).
   ingredient_library migration v8'de kuruldu (tags kolonu YOK). */

import type { FastifyInstance } from "fastify";
import {
  IngredientCreateSchema,
  IngredientPatchSchema,
  INGREDIENT_SEED,
  findChipByTr,
  mergeIngredients,
  newId,
  nowISO,
  resolvePatchTarget,
  type IngredientLibraryRow,
  type ResolvedChip,
} from "@tezgah/shared";
import { db } from "../db.js";

const selectAll = "SELECT id, tr, fr, de, usage_count, source, created_at FROM ingredient_library";

function allRows(): IngredientLibraryRow[] {
  return db.prepare(selectAll).all() as IngredientLibraryRow[];
}

export function ingredientRoutes(app: FastifyInstance): void {
  /* Birleşik çip listesi: kod-seed ∪ DB, kaynak işaretiyle (usage_count↓, tr). */
  app.get("/api/ingredients", async () => mergeIngredients(INGREDIENT_SEED, allRows()));

  /* Öğrenme ucu: yeni çip (source=learned). Mükerrer koruması: tr birleşik listede
     (SEED VEYA learned) varsa YENİSİ AÇILMAZ, mevcut dön (created:false — ŞERH 2). */
  app.post("/api/ingredients", async (req, reply) => {
    const body = IngredientCreateSchema.parse(req.body ?? {});
    const merged = mergeIngredients(INGREDIENT_SEED, allRows());
    const dup = findChipByTr(merged, body.tr);
    if (dup) return { created: false, chip: dup };

    const row: IngredientLibraryRow = {
      id: newId("ing"),
      tr: body.tr.trim(),
      fr: body.fr?.trim() ?? "",
      de: body.de?.trim() ?? "",
      usage_count: 0,
      source: "learned",
      created_at: nowISO(),
    };
    db.prepare(
      `INSERT INTO ingredient_library (id, tr, fr, de, usage_count, source, created_at)
       VALUES (@id, @tr, @fr, @de, @usage_count, @source, @created_at)`
    ).run(row);
    reply.code(201);
    /* GET ile aynı ResolvedChip şekli (created_at sızmaz) */
    const chip: ResolvedChip = {
      id: row.id, tr: row.tr, fr: row.fr, de: row.de, tags: [], source: "learned", usage_count: 0,
    };
    return { created: true, chip };
  });

  /* Çeviri tamamlama (fr/de doldurma). "TAMAMLAMA" semantiği: boş/verilmemiş alan
     mevcut değeri EZMEZ (fill, clear değil — || ). Seed çipin düzeltmesi kopyala-yaz
     ile source=seed override satırı açar (#4); learned/override satırı update edilir. */
  app.patch<{ Params: { id: string } }>("/api/ingredients/:id", async (req, reply) => {
    const patch = IngredientPatchSchema.parse(req.body ?? {});
    const target = resolvePatchTarget(INGREDIENT_SEED, allRows(), req.params.id);
    if (target.action === "not-found") return reply.code(404).send({ error: "not_found" });

    if (target.action === "update") {
      const cur = db.prepare(`${selectAll} WHERE id = ?`).get(target.id) as IngredientLibraryRow;
      db.prepare("UPDATE ingredient_library SET fr = ?, de = ? WHERE id = ?").run(
        patch.fr?.trim() || cur.fr,
        patch.de?.trim() || cur.de,
        target.id
      );
    } else {
      /* insert-override: kod-seed'i DB'ye override olarak yaz (source=seed) */
      const base = target.base;
      db.prepare(
        `INSERT INTO ingredient_library (id, tr, fr, de, usage_count, source, created_at)
         VALUES (@id, @tr, @fr, @de, 0, 'seed', @created_at)`
      ).run({
        id: base.id,
        tr: base.tr,
        fr: patch.fr?.trim() || base.fr,
        de: patch.de?.trim() || base.de,
        created_at: nowISO(),
      });
    }

    /* Güncel birleşik çipi dön (override'da tags kod-seed'den korunur — ŞERH 1) */
    const chip = mergeIngredients(INGREDIENT_SEED, allRows()).find((c) => c.id === req.params.id);
    return { chip };
  });
}
