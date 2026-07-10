/* Çip kütüphanesi çekirdeği — F7-B1. SAF (DOM/IO yok). SEED ∪ DB modeli
   (parse_synonyms/themes hizası): kod-seed "çekirdek" + ingredient_library DB.
   Bu dosya route'ların TÜM mantığını taşır; route'lar ince tutkaldır. */

import { z } from "zod";
import { foldTr } from "./parse.js";
import { SEED_CHIPS } from "./seed-chips.js";
import type { IngredientChip } from "./sector.js";

/* Kod-seed çip kütüphanesi — F7-B2 tohum verisi (seed-chips.ts). SEED ∪ DB
   modelinin "çekirdek" tarafı (parse_synonyms/themes hizası). */
export const INGREDIENT_SEED: IngredientChip[] = SEED_CHIPS;

/* ingredient_library (migration v8) satırı. NOT: tags kolonu YOK — learned çip
   tagsizdir; tags yalnız kod-seed'de yaşar (ResolvedChip.tags kaynağı kod-seed). */
export interface IngredientLibraryRow {
  id: string;
  tr: string;
  fr: string;
  de: string;
  usage_count: number;
  source: "seed" | "learned";
  created_at: string;
}

/* Birleşik çip — GET /api/ingredients çıktısı (kaynak işaretiyle). */
export interface ResolvedChip {
  id: string;
  tr: string;
  fr: string;
  de: string;
  tags: string[];
  source: "seed" | "learned";
  usage_count: number;
}

/** Dedup/eşleşme anahtarı: TR katlaması (aksansız küçük harf) — "Soğan" ≡ "sogan". */
export function chipKey(tr: string): string {
  return foldTr(tr).trim();
}

/**
 * SEED ∪ DB birleşimi — SAF.
 *
 * ÖNCELİK KURALI (mimar kararı #4 — kopyala-yaz): kod-seed tabandır; aynı id'li
 * DB satırı (source="seed" override) kod-seed'in tr/fr/de/usage_count'ını EZER.
 * Bu override, SONRADAN gelen kod-seed güncellemesini de ezer — bilinçli atölye
 * düzeltmesi kazanır. (Kod-seed'e eşitlenen bayat override'ların temizliği ileri
 * bir BAKIM notudur; merge burada override'ı her zaman üstün tutar.)
 *
 * TAGS her zaman KOD-SEED'den korunur (DB'de tags kolonu yok — ŞERH 1). Kod-seed'i
 * olmayan DB satırı learned (veya orphan seed-override) sayılır: tags:[] ile eklenir.
 * Sıra: usage_count azalan, sonra tr (TR sıralaması) — çok kullanılan öne.
 */
export function mergeIngredients(
  seed: IngredientChip[],
  dbRows: IngredientLibraryRow[]
): ResolvedChip[] {
  const byId = new Map<string, ResolvedChip>();
  for (const s of seed) {
    byId.set(s.id, {
      id: s.id, tr: s.tr, fr: s.fr, de: s.de, tags: s.tags, source: "seed", usage_count: 0,
    });
  }
  for (const r of dbRows) {
    const base = byId.get(r.id);
    if (base) {
      /* seed override: DB tr/fr/de/usage ezer; tags kod-seed'de KALIR (ŞERH 1) */
      byId.set(r.id, { ...base, tr: r.tr, fr: r.fr, de: r.de, usage_count: r.usage_count });
    } else {
      /* learned veya orphan seed-override: yeni çip, kod-seed yok → tags:[] */
      byId.set(r.id, {
        id: r.id, tr: r.tr, fr: r.fr, de: r.de, tags: [], source: r.source, usage_count: r.usage_count,
      });
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.usage_count - a.usage_count || a.tr.localeCompare(b.tr, "tr")
  );
}

/** Birleşik listede tr'ye göre (foldTr) mevcut çipi bul — mükerrer koruması.
    SEED çiple eşleşme de bulunur (learned satır açılmaz — ŞERH 2). */
export function findChipByTr(list: ResolvedChip[], tr: string): ResolvedChip | undefined {
  const k = chipKey(tr);
  return list.find((c) => chipKey(c.tr) === k);
}

/** PATCH hedefi çözümü — SAF (mimar #4 kopyala-yaz).
    - Mevcut DB satırı (learned VEYA seed-override) → update.
    - Kod-seed (DB'de yok) → override INSERT (base=seed).
    - Bilinmeyen → not-found (404). */
export type PatchTarget =
  | { action: "update"; id: string }
  | { action: "insert-override"; base: IngredientChip }
  | { action: "not-found" };

export function resolvePatchTarget(
  seed: IngredientChip[],
  dbRows: IngredientLibraryRow[],
  id: string
): PatchTarget {
  if (dbRows.some((r) => r.id === id)) return { action: "update", id };
  const seedChip = seed.find((s) => s.id === id);
  if (seedChip) return { action: "insert-override", base: seedChip };
  return { action: "not-found" };
}

/* --- API şemaları --- */

/** POST gövdesi: tr zorunlu, fr/de opsiyonel (source=learned route'ta atanır). */
export const IngredientCreateSchema = z.object({
  tr: z.string().min(1),
  fr: z.string().optional(),
  de: z.string().optional(),
});
export type IngredientCreate = z.infer<typeof IngredientCreateSchema>;

/** PATCH gövdesi: çeviri tamamlama — fr/de'den EN AZ BİRİ dolu olmalı (ŞERH 3;
    boş patch → 400). tr değiştirilemez (kimlik/dedup anahtarı). */
export const IngredientPatchSchema = z
  .object({
    fr: z.string().optional(),
    de: z.string().optional(),
  })
  .refine(
    (p) => (p.fr?.trim() ?? "") !== "" || (p.de?.trim() ?? "") !== "",
    { message: "En az bir çeviri (fr/de) dolu olmalı" }
  );
export type IngredientPatch = z.infer<typeof IngredientPatchSchema>;
