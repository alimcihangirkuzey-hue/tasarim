/* flyer — FAZ2-GOREV §6.2: a5-portrait + 21x21, ön-arka */

import type { TemplateManifest } from "../types.js";

export const manifest: TemplateManifest = {
  id: "flyer",
  type: "flyer",
  profile_version: 1,
  name_tr: "Flyer (kampanya)",
  bleed_mm: 3,
  safe_mm: 5,
  formats: {
    "a5-portrait": { w_mm: 148, h_mm: 210, label_tr: "A5 dikey" },
    "21x21": { w_mm: 210, h_mm: 210, label_tr: "21×21 kare" },
  },
  defaultFormat: "a5-portrait",
  params: [
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
    /* Kampanya slotu: katalogdan kopyalanabilir ya da serbest yazılır (override) */
    { id: "campaign_title", kind: "text", bind: null, default_fr: "OFFRE SPÉCIALE", font_mm: { min: 7, max: 12 }, maxLines: 2 },
    { id: "campaign_price", kind: "text", bind: null, default_fr: "10€", font_mm: { min: 14, max: 26 }, maxLines: 1 },
    { id: "campaign_sub", kind: "text", bind: null, default_fr: "2 dürüm + boisson", font_mm: { min: 3.4, max: 5 }, maxLines: 2, optional: true },
    { id: "phone", kind: "text", bind: "brand.contact.phone" },
    { id: "address", kind: "text", bind: "brand.contact.address", maxLines: 3 },
    { id: "hours", kind: "text", bind: "brand.contact.hours", maxLines: 2 },
    /* Teslimat bloğu: bölgeler + minimum sipariş serbest metni; boşsa gizlenir */
    { id: "delivery_note", kind: "text", bind: null, optional: true, maxLines: 4 },
    { id: "qr", kind: "qr", bind: null },
    { id: "footnote", kind: "text", bind: "catalog.footnote_fr", font_mm: { min: 2.2, max: 3 } },
  ],
  repeater: {
    id: "items",
    bind: "selection.items",
    overflow: "shrink-then-warn",
    itemSlots: [
      { id: "photo", kind: "image", bind: "item.photo" },
      { id: "name", kind: "text", bind: "item.name_fr", font_mm: { min: 3, max: 3.8 }, maxLines: 2 },
      { id: "price", kind: "price", bind: "item.prices" },
    ],
  },
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};
