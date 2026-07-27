/* menu-liste-premium — tipografi ağırlıklı liste (FAZ1-GOREV §5, ARAS listesi) */

import type { TemplateManifest } from "../types.js";
import { CHROME_SLOTS } from "../parts/chrome-slots.js";

export const manifest = {
  id: "menu-liste-premium",
  type: "menu",
  profile_version: 1,
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
      options: ["review", "tel", "delivery", "instagram", "menu"], // mimar #16: dijital menü adresi
      default: "review",
      label_tr: "QR kaynağı",
    },
    /* Canonical 4.4 kontrollü benzersizlik: 0 = taban ritim (bugünkü yerleşim
       birebir); 1+ tohumları boşluk ritmini KAPALI varyant kümesinden seçer
       (deterministik, belgeyle taşınır, kullanıcı kilitleyebilir) */
    { id: "designSeed", type: "number", default: 0, min: 0, max: 9999, step: 1, label_tr: "Tasarım tohumu (0 = taban)" },
  ],
  slots: [
    ...CHROME_SLOTS,
    /* Dekor foto slotları: sabit konumlu, boş bırakılabilir (dekupe PNG) —
       gereklilik ilânı yok (ölü `optional` alanı kaldırıldı); qr de boş kalabilir.
       Dosya ROLÜ İLANI (7.2/502): bind:null oldukları için rol TÜRETİLEMEZ —
       kabul ELLE yazılır (bu manifestteki logo slotu türetir, bunlar ilan eder;
       rolün AYNI manifest içinde farklılaşmasının kanıtı). Dekor bir MARKA
       LOGOSU değildir: "logo" bilerek dışarıda. */
    { id: "deco1", kind: "image", bind: null, kabul: ["photo", "other"] },
    { id: "deco2", kind: "image", bind: null, kabul: ["photo", "other"] },
    { id: "deco3", kind: "image", bind: null, kabul: ["photo", "other"] },
    { id: "qr", kind: "qr", bind: null },
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
  production_channels: ["print", "preview"],
  production_techniques: ["impression"],
  /* substrat (7.2/501 malzeme yarısı): menü baskı kâğıdı — yalnız impression taşır */
  production_substrate: "kagit",
  themes: ["or-noir", "aras-orange", "velours-rouge"],
} satisfies TemplateManifest;
