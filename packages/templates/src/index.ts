/* Şablon kayıt defteri — CONSTITUTION §5.7: editör ve print yalnızca buradan okur.
   Yeni şablon eklemek = klasör ekle + aşağıdaki haritaya yaz; başka dosyaya dokunulmaz. */

import { MATERIAL_TYPES, isMaterialType, type MaterialType, type TemplateEntry } from "./types.js";
import { menuGridCells } from "./menu-grid-cells/index.js";
import { menuListePremium } from "./menu-liste-premium/index.js";
import { menuTrifold } from "./menu-trifold/index.js";
import { flyer } from "./flyer/index.js";
import { carteFidelite } from "./carte-fidelite/index.js";
import { vitroBandeau, vitroCentre, vitroColonne } from "./vitrophanie/index.js";
import { enseignePanneau } from "./enseigne/index.js";
import { garment } from "./garment/index.js";
import { GENERATED } from "./generated/index.js";

export * from "./types.js";
export * from "./themes.js";
export * from "./engine/binding.js";
export * from "./engine/layout.js";
export * from "./engine/params.js";
export * from "./engine/qr.js";
export * from "./engine/custom-size.js";
export * from "./parts/price.js";
export { analyzeGrid } from "./menu-grid-cells/index.js";
export type { GridAnalysis, CellLayout } from "./menu-grid-cells/analyze.js";
export { analyzeList } from "./menu-liste-premium/index.js";
export type { ListAnalysis, ListRow } from "./menu-liste-premium/analyze.js";

export { analyzeTrifold } from "./menu-trifold/index.js";
export type { TrifoldAnalysis } from "./menu-trifold/analyze.js";
export { analyzeFlyer } from "./flyer/index.js";
export type { FlyerAnalysis } from "./flyer/analyze.js";
export { analyzeFidelite } from "./carte-fidelite/index.js";
export type { FideliteAnalysis } from "./carte-fidelite/analyze.js";
export * from "./engine/ratio.js";
export { analyzeVitro } from "./vitrophanie/index.js";
export type { VitroAnalysis } from "./vitrophanie/index.js";
export { analyzeEnseigne } from "./enseigne/index.js";
export type { EnseigneAnalysis } from "./enseigne/index.js";
export { analyzeGarment } from "./garment/index.js";
export type { GarmentAnalysis, GarmentAreaLayout, LineSource } from "./garment/index.js";

export * from "./factory/sanitize.js";
export * from "./factory/analyze.js";
export * from "./parts/chrome-title.js";

/* ── Kimlik katmanı yük-zamanı invaryantı (C-P0; Canonical 7.2 #1) ────────

   İlan edilen tür DAVRANIŞLA doğrulanır, yoksa alan süs olur (bu deponun
   "ilan = davranış" dersi; emsal: sector-registry.ts yük-zamanı parse'ı ve
   taşma sözlüğünün motor/manifest ayrışması, types.ts:10-14).

   İNVARYANT KAYIT DEFTERİNİ KURAN YOLUN İÇİNDEDİR, ayrı bir çağrı değildir:
   TEMPLATES doğrudan kurVeDogrula() çıktısıdır. Önceki hâlde `dogrulaKimlik(
   TEMPLATES)` bağımsız bir deyimdi ve onu silmek 220 testi de yeşil bırakıyordu
   (adversarial tur B2: sahte-yeşil) — "sessiz kabul yoktur" vaadi silinebilir
   bir cümleydi. Artık doğrulamayı çıkarmak TEMPLATES'i tanımsız bırakır; vaat
   yapısaldır. Fonksiyon export edilir ki red yolları izole birim-testle
   sınanabilsin (identity.test.ts). */

/** El yazımı kayıtlar (mimar #12: fabrika üretimi GENERATED'ı bunlar ezer) */
const EL_YAZIMI: readonly TemplateEntry[] = [
  menuGridCells,
  menuListePremium,
  menuTrifold,
  flyer,
  carteFidelite,
  vitroBandeau,
  vitroCentre,
  vitroColonne,
  enseignePanneau,
  garment,
];

function dogrulaGiris(key: string, entry: TemplateEntry): void {
  const m = entry.manifest;
  if (!isMaterialType(m.type)) {
    throw new Error(
      `Şablon "${key}": bilinmeyen materyal türü "${String(m.type)}" (izinli: ${MATERIAL_TYPES.join(", ")})`
    );
  }
  if (!Number.isInteger(m.profile_version) || m.profile_version < 1) {
    throw new Error(
      `Şablon "${key}": profile_version pozitif tamsayı olmalı (bulunan: ${String(m.profile_version)})`
    );
  }
  /* Harita anahtarı ile manifest.id ayrışamaz: ayrışırsa getTemplate(id)
     başka bir manifest'in kimliğiyle cevap verir. */
  if (m.id !== key) {
    throw new Error(`Şablon "${key}": manifest.id "${m.id}" harita anahtarıyla uyuşmuyor`);
  }
}

/**
 * Kayıt defterini KURAR ve YÜKLENİRKEN doğrular — tek geçiş.
 * `generated` (fabrika) üzerine el yazımı yazılır (el yazımı kazanır, kasıtlı).
 * El yazımı KÜME İÇİ çift-id REDDEDİLİR (B3: obje-literali sessizce ezerdi).
 */
export function kurVeDogrula(
  generated: Record<string, TemplateEntry>,
  elYazimi: readonly TemplateEntry[]
): Record<string, TemplateEntry> {
  const defter: Record<string, TemplateEntry> = { ...generated };
  const gorulen = new Set<string>();
  for (const entry of elYazimi) {
    const id = entry.manifest.id;
    if (gorulen.has(id)) {
      throw new Error(`Şablon id çakışması: "${id}" iki kez kayıtlı (el yazımı)`);
    }
    gorulen.add(id);
    defter[id] = entry; /* GENERATED'i ezmesi kasıtlı — yerleşik kimlik kazanır */
  }
  for (const [key, entry] of Object.entries(defter)) {
    dogrulaGiris(key, entry);
  }
  return defter;
}

/* Fabrika üretimi şablonlar (mimar #12) el yazımı kayıtlarla birleşir;
   çakışmada el yazımı kazanır. Doğrulama bu kuruluşun İÇİNDEDİR. */
export const TEMPLATES: Record<string, TemplateEntry> = kurVeDogrula(GENERATED, EL_YAZIMI);

export function getTemplate(id: string): TemplateEntry {
  const entry = TEMPLATES[id];
  if (!entry) {
    throw new Error(`Bilinmeyen şablon: ${id} (kayıtlılar: ${Object.keys(TEMPLATES).join(", ") || "yok"})`);
  }
  return entry;
}

export function listTemplates(): TemplateEntry[] {
  return Object.values(TEMPLATES);
}

/* ── Saf sorgu API'si (C-P0) — tür artık OKUNUR bir boyut ─────────────── */

/** Verilen materyal türündeki kayıtlı şablonlar (kayıt sırasıyla) */
export function listTemplatesByType(type: MaterialType): TemplateEntry[] {
  return Object.values(TEMPLATES).filter((e) => e.manifest.type === type);
}

/** Şablonun materyal türü; bilinmeyen id için getTemplate gibi fırlatır */
export function materialTypeOf(id: string): MaterialType {
  return getTemplate(id).manifest.type;
}

/** Kayıtlı şablonu OLAN materyal türleri (MATERIAL_TYPES sırasıyla) */
export function registeredMaterialTypes(): MaterialType[] {
  const kayitli = new Set(Object.values(TEMPLATES).map((e) => e.manifest.type));
  return MATERIAL_TYPES.filter((t) => kayitli.has(t));
}
