/* vitrophanie — manifest (C-P2: index.tsx'ten AYRILDI, react-siz — manifest-
   yalnız identity alt-yolu bunu import eder). Üç kompozisyon (bandeau/centre/
   colonne) ortak SLOT_DEFS + makeManifest paylaşır, FAZ3-GOREV §4. */

import type { TemplateManifest } from "../types.js";

export type VitroVariant = "bandeau" | "centre" | "colonne";

export const SLOT_DEFS = [
  /* Dosya gereksinimi İLANI — KOŞULLU (Canonical 7.2/502 dosya gereksinimleri +
     4.5 "bildirimsel, deterministik, test edilebilir"; journal
     2026-07-26-kosullu-gereklilik-v2). ESKİ ŞERH KALKTI: v1'de bu aile BİLEREK
     ilan ETMİYORDU — logo/logo_mono zorunluluğu `mode` paramına bağlı olduğu
     için yokluk/zorunlu ikilisine sığmıyor, uyarı index.tsx'te iki elle `if`
     satırından doğuyordu. Koşul dili v2 ile geldi (`param_esittir`) ve
     zorunluluk artık İLANDADIR: uyarıyı jenerik motor (eksikZorunluVarliklar)
     bu ilandan üretir — ilan ile davranış ayrışamaz.

     mode KAPALI KÜMEDİR ve iki dal TAM BÖLÜMDÜR (impression|decoupe): her
     belgede iki slottan tam biri zorunludur, üçüncü hâl yoktur — bu yüzden
     `param_esittir` bu aileyi %100 kapsar (ölçüm: paket beyanı).

     TEK İLAN NOKTASI ÜÇ MANİFESTİ KAPATIR: bandeau/centre/colonne aynı
     SLOT_DEFS'i makeManifest üzerinden paylaşır — koşul burada BİR KEZ yazılır,
     üç profilde birden davranışa döner (production_substrate'in tek noktadan
     ilanı emsali, aşağıda). */
  {
    id: "logo",
    kind: "image" as const,
    bind: "brand.logo_primary",
    gereklilik: { kosul: { kind: "param_esittir" as const, param: "mode", deger: "impression" } },
  },
  {
    id: "logo_mono",
    kind: "image" as const,
    bind: "brand.logo_mono",
    gereklilik: { kosul: { kind: "param_esittir" as const, param: "mode", deger: "decoupe" } },
  },
  { id: "hours", kind: "text" as const, bind: "brand.contact.hours", maxLines: 1 },
  { id: "slogan", kind: "text" as const, bind: "brand.slogan_fr", maxLines: 2 },
  { id: "phone", kind: "text" as const, bind: "brand.contact.phone", maxLines: 1 },
];

export function makeManifest(variant: VitroVariant, name_tr: string): TemplateManifest {
  return {
    id: `vitro-${variant}`,
    type: "cam",
    profile_version: 1,
    name_tr,
    bleed_mm: 0, // gerçek bleed param'dan; manifest değeri taban
    safe_mm: 0,
    formats: { libre: { w_mm: 1000, h_mm: 1000, label_tr: "Serbest (cm)" } },
    defaultFormat: "libre",
    params: [
      { id: "w_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "Genişlik (cm)" },
      { id: "h_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "Yükseklik (cm)" },
      { id: "mode", type: "choice", options: ["impression", "decoupe"], default: "impression", label_tr: "Mod" },
      { id: "miroir", type: "toggle", default: false, label_tr: "Miroir (içten uygulama)" },
      { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Kesim rengi" },
      { id: "bleed_mm", type: "choice", options: [0, 3, 5], default: 0, label_tr: "Bleed (mm)" },
    ],
    slots: SLOT_DEFS,
    /* impression modu bugün print+preview PDF üretir (doExport varsayılan
       dalı), decoupe modu kesim SVG'si — üç kanal da FİİLİ davranıştır */
    production_channels: ["print", "preview", "decoupe"],
    /* mode paramının seçenekleriyle birebir: baskı + kesim (registry bağı) */
    production_techniques: ["impression", "decoupe"],
    /* substrat (7.2/501 malzeme yarısı): cam kaplama vinili — impression VE
       decoupe taşıyan tek taşıyıcı; üç vitro kompozisyonu TEK noktadan ilan */
    production_substrate: "vinil",
    themes: ["or-noir", "aras-orange", "velours-rouge"],
  };
}

export const VITRO_BANDEAU_MANIFEST = makeManifest("bandeau", "Vitrophanie — Saat Bandı");
export const VITRO_CENTRE_MANIFEST = makeManifest("centre", "Vitrophanie — Merkez Logo");
export const VITRO_COLONNE_MANIFEST = makeManifest("colonne", "Vitrophanie — Menü Kolonu");
