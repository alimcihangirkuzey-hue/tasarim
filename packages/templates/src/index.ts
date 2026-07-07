/* Şablon kayıt defteri — CONSTITUTION §5.7: editör ve print yalnızca buradan okur.
   Yeni şablon eklemek = klasör ekle + aşağıdaki haritaya yaz; başka dosyaya dokunulmaz. */

import type { TemplateEntry } from "./types.js";

export * from "./types.js";

export const TEMPLATES: Record<string, TemplateEntry> = {
  /* menu-grid-cells ve menu-liste-premium bu fazda buraya kaydolur */
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
