/* enseigne-panneau — manifest (C-P2: index.tsx'ten AYRILDI, react-siz —
   manifest-yalnız identity alt-yolu bunu import eder). Tabela (tek panel),
   FAZ3-GOREV §5. */

import type { TemplateManifest } from "../types.js";

export const SLOTS = [
  { id: "logo", kind: "image" as const, bind: "brand.logo_primary" },
  { id: "title", kind: "text" as const, bind: null, maxLines: 1 },
  { id: "services", kind: "text" as const, bind: null, default_fr: "kebab · tacos · burger", maxLines: 1 },
  { id: "phone", kind: "text" as const, bind: "brand.contact.phone", maxLines: 1 },
];

export const manifest: TemplateManifest = {
  id: "enseigne-panneau",
  type: "tabela",
  profile_version: 1,
  name_tr: "Tabela (tek panel)",
  bleed_mm: 0,
  safe_mm: 0,
  formats: { libre: { w_mm: 3000, h_mm: 600, label_tr: "Serbest (cm)" } },
  defaultFormat: "libre",
  params: [
    { id: "w_cm", type: "number", default: 300, min: 50, max: 2000, step: 1, label_tr: "Genişlik (cm)" },
    { id: "h_cm", type: "number", default: 60, min: 20, max: 500, step: 1, label_tr: "Yükseklik (cm)" },
    { id: "bleed_mm", type: "choice", options: [0, 3, 5], default: 0, label_tr: "Bleed (mm)" },
  ],
  slots: SLOTS,
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};
