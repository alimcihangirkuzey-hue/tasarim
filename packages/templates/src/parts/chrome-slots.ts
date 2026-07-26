/* CHROME_SLOTS — PageChrome.tsx'ten AYRILDI (C-P2, manifest-yalnız alt-yol).
   PageChrome.tsx bir .tsx'tir (react/jsx-runtime taşır); menu-grid-cells ve
   menu-liste-premium'un manifest.ts'leri yalnız bu SAF veriye ihtiyaç duyar.
   PageChrome.tsx kendi CHROME_SLOTS'unu artık BURADAN re-export eder — tek
   kaynak, iki tüketici (react-bağımlı render yolu + react-sız kimlik yolu). */

import type { SlotDef } from "../types.js";

export const CHROME_SLOTS: SlotDef[] = [
  /* Dosya gereksinimi İLANI (7.2/502): chrome taşıyan menü aileleri (grid,
     liste-premium) logosuz üretime çıkamaz — empty-required'ı analyze'lar
     artık jenerik motordan (eksikZorunluVarliklar) BU ilanla üretir */
  { id: "logo", kind: "image", bind: "brand.logo_primary", gereklilik: "zorunlu" },
  { id: "title", kind: "text", bind: null, default_fr: "NOTRE CARTE", font_mm: { min: 8, max: 14 }, maxLines: 1 },
  { id: "phone", kind: "text", bind: "brand.contact.phone", font_mm: { min: 3.4, max: 4.4 }, maxLines: 1 },
  { id: "address", kind: "text", bind: "brand.contact.address", font_mm: { min: 2.6, max: 3.2 }, maxLines: 1 },
  { id: "hours", kind: "text", bind: "brand.contact.hours", font_mm: { min: 2.6, max: 3.2 }, maxLines: 1 },
  /* boş kalabilir (gereklilik ilânı yok) — ölü `optional` alanı kaldırıldı */
  { id: "halal", kind: "badge", bind: "brand.badges.halal" },
  { id: "footnote", kind: "text", bind: "catalog.footnote_fr", font_mm: { min: 2.2, max: 3 }, maxLines: 1 },
];
