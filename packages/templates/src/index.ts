/* Şablon kayıt defteri — CONSTITUTION §5.7: editör ve print yalnızca buradan okur.
   Yeni şablon eklemek = klasör ekle + aşağıdaki haritaya yaz; başka dosyaya dokunulmaz. */

import type { TemplateEntry } from "./types.js";
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

/* Fabrika üretimi şablonlar (mimar #12) el yazımı kayıtlarla birleşir;
   çakışmada el yazımı kazanır (yerleşik kimlikler ezilemez). */
export const TEMPLATES: Record<string, TemplateEntry> = {
  ...GENERATED,
  [menuGridCells.manifest.id]: menuGridCells,
  [menuListePremium.manifest.id]: menuListePremium,
  [menuTrifold.manifest.id]: menuTrifold,
  [flyer.manifest.id]: flyer,
  [carteFidelite.manifest.id]: carteFidelite,
  [vitroBandeau.manifest.id]: vitroBandeau,
  [vitroCentre.manifest.id]: vitroCentre,
  [vitroColonne.manifest.id]: vitroColonne,
  [enseignePanneau.manifest.id]: enseignePanneau,
  [garment.manifest.id]: garment,
};

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
