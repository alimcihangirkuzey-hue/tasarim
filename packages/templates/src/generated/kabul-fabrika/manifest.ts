/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12). Elle rafine edilebilir. */

import type { TemplateManifest } from "../../types.js";

export const manifest: TemplateManifest = {
  id: "kabul-fabrika",
  type: "menu",
  profile_version: 1,
  name_tr: "Kabul Fabrika Menü",
  bleed_mm: 0,
  safe_mm: 3,
  formats: { custom: { w_mm: 210, h_mm: 297, label_tr: "Özel (210×297 mm)" } },
  defaultFormat: "custom",
  params: [],
  slots: [
    { id: "title", kind: "text", bind: null, default_fr: "NOTRE CARTE", font_mm: { min: 3, max: 14 }, maxLines: 1 },
    { id: "logo", kind: "image", bind: "brand.logo_primary" },
    { id: "halal", kind: "badge", bind: "brand.badges.halal", optional: true },
    { id: "phone", kind: "text", bind: "brand.contact.phone", font_mm: { min: 3, max: 14 }, maxLines: 1 },
    { id: "hours", kind: "text", bind: "brand.contact.hours", font_mm: { min: 3, max: 14 }, maxLines: 1 },
    { id: "footnote", kind: "text", bind: "catalog.footnote_fr", font_mm: { min: 3, max: 14 }, maxLines: 1 },
  ],
  repeater: {
    id: "items",
    bind: "selection.items",
    overflow: "shrink-then-warn",
    itemSlots: [
      { id: "name", kind: "text", bind: "item.name_fr" },
      { id: "price", kind: "price", bind: "item.prices" },
      { id: "photo", kind: "image", bind: "item.photo" },
    ],
  },
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};
