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
   göre kurulur; istenen dil boşsa fallback (fr→tr→de / de→fr→tr) + çeviri boşluğu
   işareti (translationGaps, sessiz değil). TAM çok-dilli render henüz yok (TODO, K2). */

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
    /* Kategori notu (F7-C/E) — UI menü diline çözer (SectorPackCategory.note'tan);
       projeksiyon Category.note_fr'ye taşır (katalogda alan zaten var). */
    category_note: z.string().optional(),
    /* "İçerik basılmasın" (F7-C/B4): true → çipler BASILMAZ (ingredients:[], desc
       yalnız ek-ikram). Çipler answers_json'da yine saklanır (denetim izi). */
    hide_content: z.boolean().default(false),
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
  /** Çeviri boşlukları (MERGE-F7-A önkoşulu): istenen menü dili boş olan çipte
      fallback kullanıldı — sessiz değil, işaretlenir. missingLang boş kalan dil,
      usedLang basılan fallback dili, label kullanılan etiket. */
  translationGaps: Array<{
    category: string;
    item: string;
    label: string;
    missingLang: MenuLanguage;
    usedLang: "tr" | "fr" | "de";
  }>;
}

/* Çipi menü diline çöz: istenen dil boşsa FALLBACK zinciri — fr istenirse
   fr→tr→de, de istenirse de→fr→tr (müşteriye bakan menüde tr son çare; MERGE
   önkoşulu). D1 refine ≥1 dolu dil garanti eder. Basılan etiketle birlikte HANGİ
   dilin kullanıldığını da döndürür (çeviri boşluğunu işaretlemek için). */
function resolveChip(
  chip: IngredientRef,
  lang: MenuLanguage
): { label: string; usedLang: "tr" | "fr" | "de" } {
  /* CILA4/EK-1: tr dalı eklendi (tr→fr→de). de: de→fr→tr; fr (varsayılan): fr→tr→de. */
  const chain: Array<"tr" | "fr" | "de"> =
    lang === "de" ? ["de", "fr", "tr"] : lang === "tr" ? ["tr", "fr", "de"] : ["fr", "tr", "de"];
  for (const l of chain) {
    const s = chip[l].trim();
    if (s !== "") return { label: s, usedLang: l };
  }
  return { label: "", usedLang: lang }; // teorik: refine ≥1 dil garanti eder
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
  const translationGaps: ProjectionResult["translationGaps"] = [];
  const categories: Category[] = catOrder.map((catName, ci): Category => {
    const catItems = byCat.get(catName)!;
    /* Kategori notu (F7-C/E): bu kategorideki ilk dolu category_note → note_fr */
    const catNote = catItems.map((it) => it.category_note?.trim()).find((n) => n) ?? "";
    return {
    id: `${prefix}_c${ci + 1}`,
    name_fr: catName,
    order: ci + 1,
    ...(catNote ? { note_fr: catNote } : {}),
    items: catItems.map((it, ii): Item => {
      const prices: PriceVariant[] = it.variants
        .filter((v): v is IntakeVariant & { value: number } => v.value !== null)
        .map((v) => ({ label: v.label, value: v.value }));
      /* boş fiyat = fiyat-bekliyor: sessiz değil, pending'e işaretlenir (K3/M8) */
      if (prices.length === 0) pending.push({ name: it.name, category: catName });

      /* "İçerik basılmasın" → çipler basılmaz (ingredients + desc'ten düşer, B4). */
      const shownChips = it.hide_content ? [] : it.chips;
      /* Çipleri menü diline çöz; istenen dil boşsa fallback + çeviri boşluğu
         işareti (sessiz değil — MERGE önkoşulu). Ek-ikram görsel ayraçla ekli (D2). */
      const chipLabels: string[] = [];
      for (const chip of shownChips) {
        const { label, usedLang } = resolveChip(chip, menuLang);
        if (label === "") continue;
        chipLabels.push(label);
        if (usedLang !== menuLang) {
          translationGaps.push({ category: catName, item: it.name, label, missingLang: menuLang, usedLang });
        }
      }
      const cleanExtras = it.extras.map((e) => e.trim()).filter((e) => e !== "");
      const desc_fr = [chipLabels.join(CONTENT_SEP), ...cleanExtras]
        .filter((s) => s !== "")
        .join(EXTRA_SEP);

      return {
        id: `${prefix}_c${ci + 1}_i${ii + 1}`,
        name_fr: it.name,
        desc_fr,
        photo: null,
        prices,
        ingredients: shownChips,
        tags: [],
        visible: true,
        order: ii + 1,
      };
    }),
    };
  });

  return { categories, pending, translationGaps };
}
