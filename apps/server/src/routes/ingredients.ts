/* Çip kütüphanesi servisi — F7-B1. SEED ∪ DB (parse_synonyms hizası): tüm mantık
   @tezgah/shared'daki saf fonksiyonlarda; burası ince tutkal (db oku/yaz).
   ingredient_library migration v8'de kuruldu (tags kolonu YOK). */

import type { FastifyInstance } from "fastify";
import {
  INGREDIENT_SEED,
  mergeIngredients,
  type IngredientLibraryRow,
} from "@tezgah/shared";
import { db } from "../db.js";

const selectAll = "SELECT id, tr, fr, de, usage_count, source, created_at FROM ingredient_library";

export function ingredientRoutes(app: FastifyInstance): void {
  /* Birleşik çip listesi: kod-seed ∪ DB, kaynak işaretiyle (usage_count↓, tr). */
  app.get("/api/ingredients", async () => {
    const rows = db.prepare(selectAll).all() as IngredientLibraryRow[];
    return mergeIngredients(INGREDIENT_SEED, rows);
  });
}
