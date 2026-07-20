/* carte-fidelite — FAZ2-GOREV §6.3: 85×54 mm, bleed 2 mm, ön-arka.
   Damga kutuları NUMARALIDIR (mimar tasarımı); katalog akışı kullanmaz. */

import type { TemplateManifest } from "../types.js";

export const manifest = {
  id: "carte-fidelite",
  type: "kart",
  profile_version: 1,
  name_tr: "Sadakat Kartı",
  bleed_mm: 2,
  safe_mm: 3,
  formats: {
    carte: { w_mm: 85, h_mm: 54, label_tr: "85×54 kart" },
  },
  defaultFormat: "carte",
  params: [
    {
      id: "stampCount",
      type: "choice",
      options: [8, 10, 12],
      default: 10,
      label_tr: "Damga sayısı",
    },
  ],
  slots: [
    { id: "title", kind: "text", bind: null, default_fr: "CARTE DE FIDÉLITÉ", font_mm: { min: 4.5, max: 6 }, maxLines: 1 },
    { id: "subtitle", kind: "text", bind: null, default_fr: "1 menu acheté = 1 tampon", font_mm: { min: 2.2, max: 2.8 }, maxLines: 2 },
    { id: "reward", kind: "text", bind: null, default_fr: "11ᵉ KEBAB OU PIZZA OFFERT !", font_mm: { min: 3, max: 4.2 }, maxLines: 1 },
    { id: "logo", kind: "image", bind: "brand.logo_primary" },
    { id: "phone", kind: "text", bind: "brand.contact.phone" },
    { id: "address", kind: "text", bind: "brand.contact.address", maxLines: 2 },
    { id: "services", kind: "text", bind: null, default_fr: "Sur place · à emporter · Livraison", maxLines: 1 },
    { id: "hours", kind: "text", bind: "brand.contact.hours", maxLines: 1 },
  ],
  themes: ["or-noir", "aras-orange", "velours-rouge"],
} satisfies TemplateManifest;
