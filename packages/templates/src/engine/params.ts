/* Param çözümü — manifest varsayılanları + format'a bağlı seçenekler */

import type { DocumentState } from "@tezgah/shared";
import type { ParamDef, ParamValue, TemplateManifest } from "../types.js";

export function currentFormat(manifest: TemplateManifest, doc: DocumentState): string {
  const raw = doc.params["format"];
  if (typeof raw === "string" && manifest.formats[raw]) return raw;
  return manifest.defaultFormat;
}

function defFor(param: ParamDef, format: string): ParamValue {
  return param.defaultByFormat?.[format] ?? param.default;
}

export function paramOptions(param: ParamDef, format: string): ParamValue[] {
  return param.optionsByFormat?.[format] ?? param.options ?? [];
}

/** Belge parametresi; geçersiz/eksik değer manifest varsayılanına düşer (deterministik) */
export function paramValue(
  manifest: TemplateManifest,
  doc: DocumentState,
  id: string
): ParamValue {
  const param = manifest.params.find((p) => p.id === id);
  if (!param) return "";
  const format = currentFormat(manifest, doc);
  const raw = doc.params[id];
  if (param.type === "toggle") {
    return typeof raw === "boolean" ? raw : defFor(param, format);
  }
  const opts = paramOptions(param, format);
  if (raw !== undefined && opts.some((o) => o === raw)) return raw as ParamValue;
  const d = defFor(param, format);
  return opts.some((o) => o === d) ? d : (opts[0] ?? d);
}
