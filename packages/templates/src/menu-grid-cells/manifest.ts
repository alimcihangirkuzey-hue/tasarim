/* menu-grid-cells — "resimli ızgara" (FAZ1-GOREV §4, MADO'S iskeleti) */

import type { TemplateManifest } from "../types.js";
import { CHROME_SLOTS } from "../parts/PageChrome.js";

export const manifest: TemplateManifest = {
  id: "menu-grid-cells",
  type: "menu",
  name_tr: "Resimli Izgara Menü",
  bleed_mm: 3,
  safe_mm: 5,
  formats: {
    "a4-portrait": { w_mm: 210, h_mm: 297, label_tr: "A4 dikey" },
    "a4-landscape": { w_mm: 297, h_mm: 210, label_tr: "A4 yatay" },
    "a3-portrait": { w_mm: 297, h_mm: 420, label_tr: "A3 dikey" },
  },
  defaultFormat: "a4-portrait",
  params: [
    {
      id: "format",
      type: "choice",
      options: ["a4-portrait", "a4-landscape", "a3-portrait"],
      default: "a4-portrait",
      label_tr: "Format",
    },
    {
      id: "cols",
      type: "choice",
      optionsByFormat: {
        "a4-portrait": [2, 3],
        "a4-landscape": [4, 5],
        "a3-portrait": [4, 5, 6],
      },
      default: 3,
      defaultByFormat: { "a4-portrait": 3, "a4-landscape": 4, "a3-portrait": 4 },
      label_tr: "Kolon sayısı",
    },
    { id: "showDesc", type: "toggle", default: true, label_tr: "Açıklamaları göster" },
    {
      id: "priceStyle",
      type: "choice",
      options: ["arrow", "plain"],
      default: "arrow",
      label_tr: "Fiyat stili",
    },
    /* Mimar kararı #2 (FAZ2-GOREV §5): opsiyonel QR, default kapalı */
    { id: "showQr", type: "toggle", default: false, label_tr: "QR göster" },
    {
      id: "qrSource",
      type: "choice",
      options: ["review", "tel", "delivery", "instagram"],
      default: "review",
      label_tr: "QR kaynağı",
    },
  ],
  slots: [...CHROME_SLOTS, { id: "qr", kind: "qr", bind: null, optional: true }],
  repeater: {
    id: "items",
    bind: "selection.items",
    overflow: "shrink-then-warn",
    itemSlots: [
      { id: "photo", kind: "image", bind: "item.photo" },
      { id: "name", kind: "text", bind: "item.name_fr", font_mm: { min: 3.2, max: 4.6 }, maxLines: 2 },
      { id: "desc", kind: "text", bind: "item.desc_fr", font_mm: { min: 2.4, max: 3 }, maxLines: 2 },
      { id: "price", kind: "price", bind: "item.prices" },
    ],
  },
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};
