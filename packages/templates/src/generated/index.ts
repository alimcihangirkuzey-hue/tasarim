/* ÜRETİLMİŞ ŞABLONLAR — mimar kararı #12.
   Bu barrel şablon fabrikası tarafından OTOMATİK yeniden yazılır
   (apps/server /api/factory/generate); elle düzenleme bir sonraki üretimde
   ezilir. Üretilen şablon klasörleri (generated/<id>/) elle rafine EDİLEBİLİR. */

import type { TemplateEntry } from "../types.js";
import { entry as g0 } from "./kabul-fabrika/index.js";

export const GENERATED: Record<string, TemplateEntry> = {
  "kabul-fabrika": g0,
};
