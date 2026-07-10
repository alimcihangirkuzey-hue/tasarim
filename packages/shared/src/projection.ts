/* Sipariş Modu projeksiyonu — F7-A (K1). SAF, DETERMİNİSTİK: intake CEVAPLARINI
   katalog parçasına çevirir. Katalog baskının tek kaynağı kalır (M1) — katalog-içi
   modifier ağacı YOK; projeksiyon akış sonunda bir kez çalışır.

   Eşlemeler:
   - varyant → prices[] (etiketli); value null → prices'e GİRMEZ + pending (K3/M8)
   - çip → ingredients[] (inline denormalize) VE desc_fr içerik listesi (virgüllü)
   - ek-ikram (extras) → desc_fr'ye GÖRSEL ayraçla (" · ") ek (karar D2) — içerik
     listesinden ayrılabilir kalır. Yapısal `extras` alanı gerekirse render/UI
     fazında açılır (TODO).

   Şablonlar dokunulmaz: render bugünkü desc_fr'den çalışır. desc_fr menü diline
   göre kurulur; TAM çok-dilli render henüz yok (TODO, K2). */

import { z } from "zod";
import {
  IngredientRefSchema,
  type Category,
  type IngredientRef,
  type Item,
  type MenuLanguage,
  type PriceVariant,
} from "./schemas.js";

/* İçerik listesi ayracı (çipler arası) vs ek-ikram ayracı (görsel ayrım — D2) */
const CONTENT_SEP = ", ";
const EXTRA_SEP = " · ";

export const IntakeVariantSchema = z.object({
  label: z.string().default("seul"),
  value: z.number().nonnegative().nullable().default(null), // null → fiyat-bekliyor (K3)
});
export type IntakeVariant = z.infer<typeof IntakeVariantSchema>;

export const IntakeItemSchema = z
  .object({
    category_name: z.string().min(1),
    name: z.string().min(1),
    variants: z.array(IntakeVariantSchema).default([]),
    chips: z.array(IngredientRefSchema).default([]),
    extras: z.array(z.string()).default([]),
  })
  .passthrough(); // bilinmeyen intake anahtarları korunur (veri kaybetmeme)
export type IntakeItem = z.infer<typeof IntakeItemSchema>;

/* IntakeAnswers — OrderDetails.passthrough zemininde: çekirdek tipli ama esnek */
export const IntakeAnswersSchema = z
  .object({
    items: z.array(IntakeItemSchema).default([]),
  })
  .passthrough();
export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;

export interface ProjectionResult {
  categories: Category[];
  /** Fiyat-bekliyor ürünler (prices boş kaldı) — sessiz boşluk yok (K3/M8) */
  pending: Array<{ name: string; category: string }>;
}

/** Çipin menü diline göre görünen etiketi; boşsa TR→diğer dile düşer.
    D1 refine en az bir dolu dil garanti eder; yine de güvenli fallback. */
function chipLabel(chip: IngredientRef, lang: MenuLanguage): string {
  const order = lang === "de" ? [chip.de, chip.tr, chip.fr] : [chip.fr, chip.tr, chip.de];
  return (order.find((s) => s.trim() !== "") ?? "").trim();
}

/** desc_fr'yi kur: içerik listesi (çipler, virgüllü) + ek-ikram (görsel ayraçla).
    Ek-ikram içerik listesinden GÖRSEL olarak ayrılabilir kalır (D2). */
function buildDesc(chips: IngredientRef[], extras: string[], lang: MenuLanguage): string {
  const content = chips.map((c) => chipLabel(c, lang)).filter((s) => s !== "").join(CONTENT_SEP);
  const cleanExtras = extras.map((e) => e.trim()).filter((e) => e !== "");
  return [content, ...cleanExtras].filter((s) => s !== "").join(EXTRA_SEP);
}

/**
 * Intake cevaplarını katalog parçasına çevirir — SAF, DETERMİNİSTİK.
 * idSeed dış verilir (catalog-import deseni) ki çıktı testte sabitlenebilsin.
 * Aynı kategori adlı ürünler ilk-görülme sırasıyla gruplanır.
 */
export function projectIntake(
  answers: IntakeAnswers,
  idSeed: string,
  menuLang: MenuLanguage = "fr"
): ProjectionResult {
  const prefix = `ord_${idSeed}`;
  const catOrder: string[] = [];
  const byCat = new Map<string, IntakeItem[]>();
  for (const item of answers.items) {
    if (!byCat.has(item.category_name)) {
      byCat.set(item.category_name, []);
      catOrder.push(item.category_name);
    }
    byCat.get(item.category_name)!.push(item);
  }

  const pending: ProjectionResult["pending"] = [];
  const categories: Category[] = catOrder.map((catName, ci) => ({
    id: `${prefix}_c${ci + 1}`,
    name_fr: catName,
    order: ci + 1,
    items: byCat.get(catName)!.map((it, ii): Item => {
      const prices: PriceVariant[] = it.variants
        .filter((v): v is IntakeVariant & { value: number } => v.value !== null)
        .map((v) => ({ label: v.label, value: v.value }));
      /* boş fiyat = fiyat-bekliyor: sessiz değil, pending'e işaretlenir (K3/M8) */
      if (prices.length === 0) pending.push({ name: it.name, category: catName });
      return {
        id: `${prefix}_c${ci + 1}_i${ii + 1}`,
        name_fr: it.name,
        desc_fr: buildDesc(it.chips, it.extras, menuLang),
        photo: null,
        prices,
        ingredients: it.chips,
        tags: [],
        visible: true,
        order: ii + 1,
      };
    }),
  }));

  return { categories, pending };
}
