/* Belge-tarafı serbest ölçü — FAZ6-GOREV §2/§5, mimar kararı #21.
   Yalnız FABRİKA hattı (custom-format destekli şablonlar) custom ölçü alır;
   yerleşik kurallı şablonlar almaz (M8 düzen garantileri standart formatlara göre).
   Belge override'ı Zod-only: doc.params.width_mm/height_mm (migrationsız), 30–3000mm. */

import type { DocumentState } from "@tezgah/shared";
import type { TemplateManifest } from "../types.js";

export const CUSTOM_MIN_MM = 30;
export const CUSTOM_MAX_MM = 3000;

/** doc.params.width_mm/height_mm geçerliyse (30–3000mm) döner; yoksa null. */
export function customSizeMm(doc: DocumentState): { w_mm: number; h_mm: number } | null {
  const p = doc.params as Record<string, unknown> | undefined;
  const w = Number(p?.["width_mm"]);
  const h = Number(p?.["height_mm"]);
  const ok = (v: number) => Number.isFinite(v) && v >= CUSTOM_MIN_MM && v <= CUSTOM_MAX_MM;
  return ok(w) && ok(h) ? { w_mm: w, h_mm: h } : null;
}

/** Şablon custom-format destekliyor mu (fabrika şablonu) */
export function supportsCustomSize(manifest: TemplateManifest): boolean {
  return manifest.defaultFormat === "custom" || "custom" in manifest.formats;
}

/** Etkin custom ölçü: yalnız custom-destekli şablonda; belge override'ı > manifest.custom.
    custom-destekli değilse null (çağıran manifest.formats'ı kullanır). */
export function effectiveCustomSize(
  manifest: TemplateManifest,
  doc: DocumentState
): { w_mm: number; h_mm: number } | null {
  if (!supportsCustomSize(manifest)) return null;
  const override = customSizeMm(doc);
  if (override) return override;
  const fmt = manifest.formats.custom ?? manifest.formats[manifest.defaultFormat];
  return fmt ? { w_mm: fmt.w_mm, h_mm: fmt.h_mm } : null;
}
