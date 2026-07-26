/* KALİTE KAPISI ŞİDDET KATMANI — Canonical 4.7 (INFO/WARNING/BLOCKER) v1.
   ============================================================================
   Uyarı türlerinin şiddeti daha önce İLANSIZDI: EditorPage satır-içi bir
   sezgiyle sınıflıyordu, export modalı hiç ayırmıyordu; kod yorumları
   empty-price'ı "bilgi uyarısı", mono-suggest'i "öneri" ilan ederken panel
   ikisini de düz kusur gibi gösteriyordu. Sınıflandırma artık BURADA,
   bildirilmiş ve tüketimli yaşar (ilan = davranış).

   İKİ AYRI BOYUT vardır ve karıştırılmamalıdır:
   · severityOf — 4.7 şiddet sözlüğü (kalite kapısı anlamı taşır).
   · warningEmphasis — GÖRÜNÜM vurgusu (panelin kırmızı sınıfı); bugünkü
     ürün davranışının birebir taşınmışıdır, şiddet İDDİA ETMEZ.

   BLOCKER DİSİPLİNİ: bugün hiçbir uyarı yolu üretimi gerçekten DURDURMUYOR;
   bu yüzden hiçbir tür blocker İLAN EDEMEZ — bloklamayan "blocker" yalan
   ilandır. Bir türü blocker'a yükseltmek, o yolu gerçekten durduran
   enforcement ile AYNI pakette gelmek zorundadır (ürün sahibi kararı;
   severity.test.ts nöbetçisi bu disiplini kilitler). */

import type { LayoutWarning } from "./layout.js";

export const WARNING_SEVERITIES = ["info", "warning", "blocker"] as const;
export type WarningSeverity = (typeof WARNING_SEVERITIES)[number];

/** Çalışma-zamanı tür listesi — union ile tsc-çapraz-kilitli (aşağıdaki
    Record bir türü unutursa ya da fazlasını sayarsa derleme PATLAR). */
export const WARNING_TYPES = [
  "overflow-items",
  "text-truncated",
  "low-dpi",
  "empty-required",
  "empty-price",
  "mixed-variants",
  "qr-contrast",
  "contrast",
  "mono-suggest",
  "fine-detail",
  "broderie-info",
  "min-font",
  "overflow-strategy-violation",
] as const satisfies readonly LayoutWarning["type"][];

/* Tür → şiddet: EXHAUSTIVE Record — yeni uyarı türü eklemek burada sınıf
   İLAN ETMEDEN derlenemez (sınıfsız tür sessizce giremez). */
const SEVERITY_BY_TYPE: Record<LayoutWarning["type"], WarningSeverity> = {
  /* info — bilgilendirme/öneri, kusur değil (kayıtlı niyet: kod yorumları) */
  "broderie-info": "info",
  "empty-price": "info",
  "mono-suggest": "info",
  /* warning — görünür kusur; düzeltme ister, üretimi durdurmaz */
  "overflow-items": "warning",
  "text-truncated": "warning",
  "low-dpi": "warning",
  "empty-required": "warning",
  "mixed-variants": "warning",
  "qr-contrast": "warning",
  "contrast": "warning",
  "fine-detail": "warning",
  "min-font": "warning",
  "overflow-strategy-violation": "warning",
  /* blocker — BOŞ (bkz. başlık: enforcement'sız blocker ilan edilemez) */
};

export function severityOf(w: LayoutWarning): WarningSeverity {
  return SEVERITY_BY_TYPE[w.type];
}

/** Panelin kırmızı GÖRÜNÜM vurgusu — eski satır-içi kuralın birebir taşınmışı
    (EditorPage:627'deki `overflow-items || level red` ifadesi). Şiddet değil,
    görünüm; referans-kopya testiyle çivili. */
export function warningEmphasis(w: LayoutWarning): boolean {
  return w.type === "overflow-items" || ("level" in w && w.level === "red");
}
