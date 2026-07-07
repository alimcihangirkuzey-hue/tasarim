/* menu-trifold — roll fold (FAZ2-GOREV §6.1, CONSTITUTION §3/§7.3).
   Panel haritası SABİTTİR: dış yüz [iç kanat 97 | arka 100 | ön 100],
   iç yüz [100 | 100 | 97]. Kullanıcı panel sırası düşünmez. */

import type { TemplateManifest } from "../types.js";

export const manifest: TemplateManifest = {
  id: "menu-trifold",
  type: "menu",
  name_tr: "Trifold Menü (roll fold)",
  bleed_mm: 3,
  safe_mm: 5,
  formats: {
    "a4-landscape": { w_mm: 297, h_mm: 210, label_tr: "A4 yatay (3 panel)" },
  },
  defaultFormat: "a4-landscape",
  params: [
    { id: "showDesc", type: "toggle", default: false, label_tr: "Açıklamaları göster" },
    {
      id: "qrSource",
      type: "choice",
      options: ["review", "tel", "delivery", "instagram"],
      default: "review",
      label_tr: "QR kaynağı",
    },
  ],
  slots: [
    { id: "logo", kind: "image", bind: "brand.logo_primary" },
    { id: "slogan", kind: "text", bind: "brand.slogan_fr", font_mm: { min: 4, max: 6.5 }, maxLines: 2 },
    { id: "cover_photo", kind: "image", bind: null, optional: true },
    { id: "flap_title", kind: "text", bind: null, default_fr: "NOS INCONTOURNABLES", font_mm: { min: 5, max: 7 }, maxLines: 2 },
    { id: "phone", kind: "text", bind: "brand.contact.phone" },
    { id: "address", kind: "text", bind: "brand.contact.address", maxLines: 3 },
    { id: "hours", kind: "text", bind: "brand.contact.hours", maxLines: 2 },
    /* Arka kapakta QR STANDART slottur (mimar kararı #2) */
    { id: "qr", kind: "qr", bind: null },
    { id: "footnote", kind: "text", bind: "catalog.footnote_fr", font_mm: { min: 2.2, max: 3 } },
  ],
  repeater: {
    id: "items",
    bind: "selection.items",
    overflow: "shrink-then-flow",
    itemSlots: [
      { id: "name", kind: "text", bind: "item.name_fr", font_mm: { min: 3, max: 4 }, maxLines: 2 },
      { id: "desc", kind: "text", bind: "item.desc_fr", font_mm: { min: 2.3, max: 2.8 }, maxLines: 2 },
      { id: "price", kind: "price", bind: "item.prices" },
    ],
  },
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};

/* Panel haritası (mm, net sayfa uzayı) — CONSTITUTION §3 roll fold */
export const OUTER_PANELS = [
  { x: 0, w: 97, role: "flap" as const },
  { x: 97, w: 100, role: "back" as const },
  { x: 197, w: 100, role: "front" as const },
];
export const INNER_PANELS = [
  { x: 0, w: 100 },
  { x: 100, w: 100 },
  { x: 200, w: 97 },
];
export const FOLDS_OUTER = [97, 197];
export const FOLDS_INNER = [100, 200];
