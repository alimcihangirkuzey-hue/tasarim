/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12) */
import type { TemplateEntry } from "../../types.js";
import { manifest } from "./manifest.js";
import { GeneratedTemplate } from "./Template.js";
import { analyzeGenerated } from "./analyze.js";

export const entry: TemplateEntry = {
  manifest,
  Component: GeneratedTemplate,
  /* CE bağlaması: editör uyarıları şablonun KENDİ analizinden (motor + ilan) */
  warnings: (client, doc) => analyzeGenerated(client, doc).warnings,
};
