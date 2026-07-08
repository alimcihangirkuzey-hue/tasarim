/* menu-liste-premium — tipografi ağırlıklı liste (FAZ1-GOREV §5, ARAS listesi) */

import type { TemplateManifest } from "../types.js";
import { CHROME_SLOTS } from "../parts/PageChrome.js";

export const manifest = {
  id: "menu-liste-premium",
  type: "menu",
  name_tr: "Premium Yazılı Menü",
  bleed_mm: 3,
  safe_mm: 5,
  formats: {
    "a4-portrait": { w_mm: 210, h_mm: 297, label_tr: "A4 dikey" },
    "a3-portrait": { w_mm: 297, h_mm: 420, label_tr: "A3 dikey" },
  },
  defaultFormat: "a4-portrait",
  params: [
    {
      id: "format",
      type: "choice",
      options: ["a4-portrait", "a3-portrait"],
      default: "a4-portrait",
      label_tr: "Format",
    },
    {
      id: "columns",
      type: "choice",
      optionsByFormat: {
        /* FAZ5 §3 (mimar #14): a4-portrait'e 3 sütun yoğun varyant eklendi
           (a3-portrait zaten 3 destekli; a4-landscape bu şablonda yok) */
        "a4-portrait": [1, 2, 3],
        "a3-portrait": [2, 3],
      },
      default: 1,
      defaultByFormat: { "a4-portrait": 1, "a3-portrait": 2 },
      label_tr: "Sütun sayısı",
    },
    { id: "showDesc", type: "toggle", default: true, label_tr: "Açıklamaları göster" },
    {
      id: "priceLayout",
      type: "choice",
      options: ["inline", "columns"],
      default: "inline",
      label_tr: "Fiyat düzeni",
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
  slots: [
    ...CHROME_SLOTS,
    /* Dekor foto slotları: sabit konumlu, boş bırakılabilir (dekupe PNG) */
    { id: "deco1", kind: "image", bind: null, optional: true },
    { id: "deco2", kind: "image", bind: null, optional: true },
    { id: "deco3", kind: "image", bind: null, optional: true },
    { id: "qr", kind: "qr", bind: null, optional: true },
  ],
  repeater: {
    id: "items",
    bind: "selection.items",
    overflow: "shrink-then-flow",
    itemSlots: [
      { id: "name", kind: "text", bind: "item.name_fr", font_mm: { min: 3.2, max: 4.4 }, maxLines: 2 },
      { id: "desc", kind: "text", bind: "item.desc_fr", font_mm: { min: 2.4, max: 3 }, maxLines: 2 },
      { id: "price", kind: "price", bind: "item.prices" },
    ],
  },
  themes: ["or-noir", "aras-orange", "velours-rouge"],
} satisfies TemplateManifest;
