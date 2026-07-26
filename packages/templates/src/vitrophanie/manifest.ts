/* vitrophanie — manifest (C-P2: index.tsx'ten AYRILDI, react-siz — manifest-
   yalnız identity alt-yolu bunu import eder). Üç kompozisyon (bandeau/centre/
   colonne) ortak SLOT_DEFS + makeManifest paylaşır, FAZ3-GOREV §4. */

import type { TemplateManifest } from "../types.js";

export type VitroVariant = "bandeau" | "centre" | "colonne";

export const SLOT_DEFS = [
  { id: "logo", kind: "image" as const, bind: "brand.logo_primary" },
  { id: "logo_mono", kind: "image" as const, bind: "brand.logo_mono" },
  { id: "hours", kind: "text" as const, bind: "brand.contact.hours", maxLines: 1 },
  { id: "slogan", kind: "text" as const, bind: "brand.slogan_fr", maxLines: 2 },
  { id: "phone", kind: "text" as const, bind: "brand.contact.phone", maxLines: 1 },
];

export function makeManifest(variant: VitroVariant, name_tr: string): TemplateManifest {
  return {
    id: `vitro-${variant}`,
    type: "cam",
    profile_version: 1,
    name_tr,
    bleed_mm: 0, // gerçek bleed param'dan; manifest değeri taban
    safe_mm: 0,
    formats: { libre: { w_mm: 1000, h_mm: 1000, label_tr: "Serbest (cm)" } },
    defaultFormat: "libre",
    params: [
      { id: "w_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "Genişlik (cm)" },
      { id: "h_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "Yükseklik (cm)" },
      { id: "mode", type: "choice", options: ["impression", "decoupe"], default: "impression", label_tr: "Mod" },
      { id: "miroir", type: "toggle", default: false, label_tr: "Miroir (içten uygulama)" },
      { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Kesim rengi" },
      { id: "bleed_mm", type: "choice", options: [0, 3, 5], default: 0, label_tr: "Bleed (mm)" },
    ],
    slots: SLOT_DEFS,
    themes: ["or-noir", "aras-orange", "velours-rouge"],
  };
}

export const VITRO_BANDEAU_MANIFEST = makeManifest("bandeau", "Vitrophanie — Saat Bandı");
export const VITRO_CENTRE_MANIFEST = makeManifest("centre", "Vitrophanie — Merkez Logo");
export const VITRO_COLONNE_MANIFEST = makeManifest("colonne", "Vitrophanie — Menü Kolonu");
