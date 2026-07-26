/* garment — manifest (C-P2: index.tsx'ten AYRILDI, react-siz — manifest-yalnız
   identity alt-yolu bunu import eder). Tişört / Önlük, FAZ3-GOREV §6. */

import type { TemplateManifest } from "../types.js";

export const manifest: TemplateManifest = {
  id: "garment",
  type: "tekstil",
  profile_version: 1,
  name_tr: "Tişört / Önlük",
  bleed_mm: 0,
  safe_mm: 0,
  formats: { libre: { w_mm: 300, h_mm: 400, label_tr: "Alan bazlı (cm)" } },
  defaultFormat: "libre",
  params: [
    {
      id: "garment_kind",
      type: "choice",
      options: ["tshirt", "apron_bavette", "apron_taille"],
      default: "tshirt",
      label_tr: "Ürün",
    },
    { id: "fabric_color", type: "color", default: "#FFFFFF", label_tr: "Kumaş rengi" },
    {
      id: "technique",
      type: "choice",
      options: ["impression", "broderie"],
      default: "impression",
      label_tr: "Teknik",
    },
  ],
  slots: [
    { id: "logo", kind: "image", bind: "brand.logo_primary" },
    { id: "logo_mono", kind: "image", bind: "brand.logo_mono" },
  ],
  /* Tekstil PDF ÜRETMEZ: impression tekniği alan başına 300dpi alfa PNG,
     broderie tekniği text→path SVG paketi üretir (garment.ts kind seçimi
     technique'ten). print/preview bilinçli YOK — exports.ts kanal bekçisi
     bu ilana dayanarak tekstile PDF üretimini reddeder. */
  production_channels: ["png", "broderie"],
  /* technique paramının seçenekleriyle birebir: baskı + nakış (registry bağı) */
  production_techniques: ["impression", "broderie"],
  themes: ["or-noir", "aras-orange", "velours-rouge"],
  /* Profil şiddet katmanı (4.5): koyu kumaşta renkli logo tekstilde salt bir
     "öneri" değil, üretim riskidir (baskı/nakış sonucu ekranda görünenden
     ayrışır) — çekirdek info bu profilde warning'e sıkılaşır. low-dpi ise
     BLOCKER (ürün sahibi onayı 2026-07-26): tekstilde 300 DPI altı logo
     üretilemez kalitede çıktıdır, baskı geri alınamaz, ürün ziyan olur —
     4.7 "kabul edilemez; istisna verilemez" birebir uyar; garment bunu
     zaten yalnız impression tekniğinde ve HEP red düzeyinde üretir. Diğer
     ailelerde low-dpi çekirdek warning KALIR. Tablo kayıt-defteri-geneli
     nöbetçiyle çivili (profil-siddet.test.ts); kalem eklemek o nöbetçiyi
     ve journal kaydını birlikte ister. */
  severity_overrides: { "mono-suggest": "warning", "low-dpi": "blocker" },
  /* Mockup sahne tercihi (7.2 "Önizleme türleri"): tekstil belgesine garment
     sahnesi 2 puanla öne gelir; sahnenin fabric_color'ı belgenin fabric_color
     paramıyla eşleşirse +1 (koyu/renkli kumaş sahne eşleşmesi) — eski
     EditorPage skorlamasının birebir taşınmışı (referans-kopya golden:
     mockup-tercihi.test.ts). */
  mockup_tercihi: { sahne_turleri: ["garment"], sahne_puani: 2, eslesme_parami: "fabric_color" },
};
