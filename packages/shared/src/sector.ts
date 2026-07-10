/* Sipariş Modu — sektör paketi veri modeli (İSKELET) — F7-A (K1/K2).
   Sektör paketi = hazır kategori+ürün setleri + ürün-başına akıllı sorular +
   öğrenen içerik çipleri kütüphanesi. Akış sonunda CEVAPLAR deterministik
   PROJEKSİYON'la kataloğa çevrilir (bkz. projection.ts): soru→varyant/not,
   çip→ingredients[]. Katalog baskının tek kaynağı kalır (M1).

   ÖNEMLİ: Bu dosya YALNIZ şema/tip taşır — TOHUM İÇERİĞİ (gerçek sektör
   paketleri: kebap/pizza/lokanta/café/pastane) YOKTUR. İçerik F7-B'de,
   kullanıcı onayıyla eklenir. Örnek yapı yalnız testtedir (sector.test.ts). */

import { z } from "zod";

/* Çok-dilli görünen ad — kategori/ürün başlıkları. TR taban (tıkla), FR/DE
   basılır (boş bırakılabilir; çok-dilli render TODO). */
export const LocalizedNameSchema = z.object({
  tr: z.string().min(1),
  fr: z.string().default(""),
  de: z.string().default(""),
});
export type LocalizedName = z.infer<typeof LocalizedNameSchema>;

/* Öğrenen kütüphane içerik çipi (kütüphane KAYDI — katalog içine gömülen
   referans IngredientRef'tir, schemas.ts). id kütüphane anahtarı; tr tıklama
   etiketi (taban), fr/de basılınca dolar; tags gruplama (ör. "sauce","viande"). */
export const IngredientChipSchema = z.object({
  id: z.string().min(1),
  tr: z.string().min(1),
  fr: z.string().default(""),
  de: z.string().default(""),
  tags: z.array(z.string()).default([]),
});
export type IngredientChip = z.infer<typeof IngredientChipSchema>;

/* Ürün-başına akıllı soru. kind: boolean (ek kaymak ister mi?) · choice
   (seçenekli) · portion (yarım/taneli porsiyon). affects: projeksiyonda
   cevabın nereye düştüğü — "variant" → prices[] etiketi · "note" → ürün notu
   (desc_fr ek-ikram). options yalnız choice/portion için anlamlı. */
export const QuestionKindSchema = z.enum(["boolean", "choice", "portion"]);
export type QuestionKind = z.infer<typeof QuestionKindSchema>;

export const QuestionAffectsSchema = z.enum(["variant", "note"]);
export type QuestionAffects = z.infer<typeof QuestionAffectsSchema>;

export const QuestionOptionSchema = z.object({
  value: z.string().min(1),
  label_tr: z.string().min(1),
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const QuestionSchema = z.object({
  id: z.string().min(1),
  label_tr: z.string().min(1),
  kind: QuestionKindSchema,
  options: z.array(QuestionOptionSchema).optional(),
  affects: QuestionAffectsSchema,
});
export type Question = z.infer<typeof QuestionSchema>;

/* Pakete gömülü kategori → ürün ağacı. default_chips / questions kütüphane
   ve soru bankasına id ile bağlanır (denormalize değil — pakette referans). */
export const SectorPackItemSchema = z.object({
  name: LocalizedNameSchema,
  default_chips: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
});
export type SectorPackItem = z.infer<typeof SectorPackItemSchema>;

export const SectorPackCategorySchema = z.object({
  name: LocalizedNameSchema,
  items: z.array(SectorPackItemSchema).default([]),
});
export type SectorPackCategory = z.infer<typeof SectorPackCategorySchema>;

/* Sektör paketi kökü. questions = paket soru bankası; chips = paketin tohum
   çip seti (kütüphaneye "seed" olarak girer). id/label_tr operatöre gösterilir. */
export const SectorPackSchema = z.object({
  id: z.string().min(1),
  label_tr: z.string().min(1),
  categories: z.array(SectorPackCategorySchema).default([]),
  questions: z.array(QuestionSchema).default([]),
  chips: z.array(IngredientChipSchema).default([]),
});
export type SectorPack = z.infer<typeof SectorPackSchema>;
