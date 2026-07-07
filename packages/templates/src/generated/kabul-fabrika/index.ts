/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12) */
import type { TemplateEntry } from "../../types.js";
import { manifest } from "./manifest.js";
import { GeneratedTemplate } from "./Template.js";

export const entry: TemplateEntry = { manifest, Component: GeneratedTemplate };
