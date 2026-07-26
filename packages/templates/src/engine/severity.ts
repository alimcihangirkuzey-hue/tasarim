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

   BLOCKER DİSİPLİNİ: bir türü blocker ilan etmek, o yolu gerçekten durduran
   enforcement ile AYNI pakette gelmek zorundadır — bloklamayan "blocker"
   yalan ilandır (severity.test.ts nöbetçisi kümenin tamamını çiviler).
   Bugünkü blocker kümesi {empty-required, overflow-strategy-violation}
   ürün sahibi onayıyla (2026-07-26) yükseldi ve enforcement'ı bu paketle
   geldi: export modalı blocker varken üretimi DURDURUR (4.7: "istisna
   verilemez"), sunucu export rotası 409 backstop'u taşır. */

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
  /* warning — riskli ama kabul edilebilir; kayıtlı onayla geçilir (modal +
     snapshot gömme o izi tutar: kim/ne zaman/hangi sürüm/ne) */
  "overflow-items": "warning",
  "text-truncated": "warning",
  "low-dpi": "warning",
  "mixed-variants": "warning",
  "qr-contrast": "warning",
  "contrast": "warning",
  "fine-detail": "warning",
  "min-font": "warning",
  /* blocker — istisna verilemez; çözülmeden üretim serbest bırakılamaz
     (4.7). Zorunlu alan boş = eksik içerikle baskı; strateji ihlali =
     ilanın söylediğiyle çıktının yaptığı ayrışmış — ikisi de kabul edilemez */
  "empty-required": "blocker",
  "overflow-strategy-violation": "blocker",
};

export function severityOf(w: LayoutWarning): WarningSeverity {
  return SEVERITY_BY_TYPE[w.type];
}

/** Üretimi durduran uyarılar (4.7 BLOCKER satırı) — export kapısı bunları okur */
export function blockersOf(warnings: readonly LayoutWarning[]): LayoutWarning[] {
  return warnings.filter((w) => severityOf(w) === "blocker");
}

/** Sunucu backstop'u için TİPSİZ giriş: istemcinin JSON gövdesindeki `type`
    dizesi blocker sınıfında mı? (Sunucu tam analiz KOŞAMAZ — tam registry
    react taşır, C-P2 kazanımı geri alınmaz; bu denetim istemcinin DÜRÜST
    bildirdiği engeli yine de basmaya çalışan UI hatalarına karşı savunmadır,
    kötü niyetli istemciye karşı değil — tek-operatör pilot sınırı kayıtlı.) */
export function isBlockerType(t: string): boolean {
  return Object.hasOwn(SEVERITY_BY_TYPE, t) && SEVERITY_BY_TYPE[t as LayoutWarning["type"]] === "blocker";
}

/** Panelin kırmızı GÖRÜNÜM vurgusu — eski satır-içi kuralın birebir taşınmışı
    (EditorPage:627'deki `overflow-items || level red` ifadesi). Şiddet değil,
    görünüm; referans-kopya testiyle çivili. */
export function warningEmphasis(w: LayoutWarning): boolean {
  return w.type === "overflow-items" || ("level" in w && w.level === "red");
}
