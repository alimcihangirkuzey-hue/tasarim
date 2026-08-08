/* ŞABLON SEÇİCİ — N seçenekli, GERÇEK iptalli (K-1/A, tek tık akışı).

   ÖLÇÜLEN YARA (`2026-08-06-sablon-secim-sorusu` paketinin kendi açık bulgusu):
   ≥2 şablonlu bir türde seçim bir `window.confirm` ile yapılıyordu ve bunun
   İKİ ayrı bedeli vardı:

   1. OPERATÖR VAZGEÇEMİYORDU. İşletim sistemi kutusunun "İptal"i turu iptal
      etmiyor, İKİNCİ ŞABLONU seçiyordu. Yani "yanlış düğmeye bastım" diyen
      operatörün önündeki tek çıkış, istemediği şablonla bir belge açmaktı —
      ve toplu turda bu, N belgenin tamamı demekti.
   2. ÜÇÜNCÜ ŞABLON SIĞMIYORDU. `confirm` iki cevap taşır. Önceki paket bunu
      sessiz bırakmamak için fırlatan bir ön-koşul + nöbetçi koymuştu: üçüncü
      şablon eklendiği gün SÜRÜM DURACAKTI. Doğru davranıştı ama çözüm değildi.

   BU BİLEŞEN İKİSİNİ DE KAPATIR: seçenek sayısı ilandan gelir (2 de olur 5 de),
   her seçenek KENDİ düğmesidir ve "Vazgeç" gerçekten vazgeçer — çağıran `null`
   alır, hiçbir belge açılmaz.

   ARTIK İNCE BİR SARMALAYICIDIR (2026-08-06, klon vazgeçmesi paketi): modal
   makinesi (söz · çözülme temizliği · Escape · zemin) `SecimSorusu`'na taşındı,
   çünkü aynı yaranın İKİNCİ yeri ölçüldü (müşteri klonlama). Burada kalan tek
   şey ŞABLONA ÖZEL olan: soru metni, ad çözümü ve kimliğin ikinci satırda
   görünmesi. Bu dosyanın testleri taşımadan sonra DEĞİŞMEDEN yeşil kaldı —
   davranışın birebir korunduğunun kanıtı odur. */

import { useCallback } from "react";
import { t } from "../i18n";
import { sablonAdi } from "../lib/sablonSorusu";
import { ASGARI_SECENEK, useSecimSorusu } from "./SecimSorusu";

export { ASGARI_SECENEK };

export interface SablonSecici {
  /**
   * Operatöre şablonu sorar.
   *
   * @param turAdi ürün türünün çevrilmiş adı (çağıran i18n'den verir)
   * @param secenekler İLAN sırasında şablon kimlikleri
   * @returns seçilen kimlik, ya da VAZGEÇİLDİYSE `null`
   */
  sor: (turAdi: string, secenekler: readonly string[]) => Promise<string | null>;
  /** Modal — çağıran bileşen ağacına koyar; açık soru yoksa `null`. */
  eleman: JSX.Element | null;
}

export function useSablonSecici(): SablonSecici {
  const soru = useSecimSorusu();

  const sor = useCallback(
    (turAdi: string, secenekler: readonly string[]): Promise<string | null> =>
      /* SENKRON FIRLATMA KORUNUR: `sor` az seçenekte fırlatır ve bu çağrı
         zincirinde de senkron kalmalıdır — `async` yapmak hatayı reddedilen
         bir söze çevirir ve çağıranın `try/catch`i onu göremezdi. */
      soru.sor({
        baslik: `${turAdi} — ${t("orders.template_pick_title")}`,
        ipucu: t("orders.template_pick_hint"),
        secenekler: secenekler.map((tid) => ({
          deger: tid,
          ad: sablonAdi(tid),
          /* KİMLİK DE GÖRÜNÜR: kayıtsız bir şablonda `sablonAdi` kimliğin
             kendisini döndürür ve iki satır aynı olur — operatör "bu ne" diye
             sorabilir. Uydurma ad üretmiyoruz, gizlemiyoruz da. */
          aciklama: tid,
        })),
        vazgecEtiketi: t("orders.template_pick_cancel"),
      }),
    [soru],
  );

  return { sor, eleman: soru.eleman };
}
