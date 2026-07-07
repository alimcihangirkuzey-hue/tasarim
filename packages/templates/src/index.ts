/* Şablon kayıt defteri — CONSTITUTION §5.7: editör ve print yalnızca buradan okur.
   Yeni şablon eklemek = klasör ekle + aşağıdaki haritaya yaz; başka dosyaya dokunulmaz. */

import type { TemplateEntry } from "./types.js";
import { menuGridCells } from "./menu-grid-cells/index.js";
import { menuListePremium } from "./menu-liste-premium/index.js";

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

export const TEMPLATES: Record<string, TemplateEntry> = {
  [menuGridCells.manifest.id]: menuGridCells,
  [menuListePremium.manifest.id]: menuListePremium,
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
