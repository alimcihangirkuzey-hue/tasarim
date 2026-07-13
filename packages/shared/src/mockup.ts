/* F8-D — mockup profesyonelleştirme sabitleri (ADR-005: mockup ≠ baskı provası).

   MOCKUP_MAX_W: anti-kaçış çözünürlük TAVANI — ekran/sunum için yeter, baskı
   için bilerek YETMEZ. Canlı önizleme (MockupPage) ve JPG üretimi (server
   mockup rotası) AYNI sabiti kullanır (dedupe). "Yüksek-çöz mockup" yolu
   bilerek YOKTUR (koruma = yolun yokluğu; ileride istenirse F8-E kapısı).

   MOCKUP_WATERMARK: damga metni, sardığı mockup'ın ÇIKTI dilini izler.
   de = CH-Almancası, ß'siz (M9/DE-CH). "MOCKUP" çekirdeği dil-nötr sabit. */

import type { MenuLanguage } from "./schemas.js";

export const MOCKUP_MAX_W = 1600;

export const MOCKUP_WATERMARK: Record<MenuLanguage, string> = {
  fr: "ne pas utiliser pour l'impression",
  de: "nicht zum Drucken verwenden",
  tr: "baskı provası değildir",
};

/** Damga tam metni — bilinmeyen/bozuk dil güvenli fr'ye düşer. */
export function mockupWatermarkText(lang: MenuLanguage): string {
  return `MOCKUP — ${MOCKUP_WATERMARK[lang] ?? MOCKUP_WATERMARK.fr}`;
}
