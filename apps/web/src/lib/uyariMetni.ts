/* OPERATÖRE GÖRÜNEN UYARI METNİ — TEK KAYNAK (K-1/B).

   ÖLÇÜLEN YARA: bu tablo `EditorPage.tsx` içinde DOSYA-YERELdi. Toplu dışa
   aktarım engellenen kalemin gerekçesini söylemeye başlayınca ikinci bir
   etiketleme yazmak gerekiyordu — yani aynı uyarı kümesi iki yerde, iki
   ifadeyle anlatılacaktı. Bu repo o bedeli defalarca ödedi (yapıştır
   önizlemesi, sipariş türü seçicileri, para birimi listesi): ikinci kopya
   önce sessizce eskir, sonra iki ekran aynı belge için farklı şey söyler.

   Taşıma sırasında METİNLER DEĞİŞMEDİ — editörün bugün gösterdiği dizeler
   birebir aynıdır; değişen yalnız nerede yaşadıklarıdır. */

import type { LayoutWarning } from "@tezgah/templates";
import { t, tf } from "../i18n";

/** Uyarıyı operatörün okuyacağı tek satıra çevirir. */
export function uyariMetni(w: LayoutWarning): string {
  switch (w.type) {
    case "overflow-items":
      return tf("editor.warn_overflow", { n: w.count });
    case "text-truncated":
      return `${t("editor.warn_truncated")} (${w.itemId ?? w.slotId})`;
    case "low-dpi":
      return `${tf("editor.warn_low_dpi", { dpi: w.effectiveDpi })} (${w.itemId ?? w.slotId})`;
    case "empty-required":
      return t("editor.warn_empty_logo");
    case "mixed-variants":
      return `${t("editor.warn_mixed")}: ${w.categoryId}`;
    case "qr-contrast":
      return t("editor.warn_qr_contrast");
    case "contrast":
      return tf("editor.warn_contrast", { ratio: w.ratio });
    case "mono-suggest":
      return t("editor.warn_mono_suggest");
    case "fine-detail":
      return t("editor.warn_fine_detail");
    case "broderie-info":
      return t("editor.warn_broderie_info");
    case "min-font":
      return t("editor.warn_min_font");
    case "empty-price":
      return `${t("editor.warn_empty_price")} (${w.itemId})`;
    case "overflow-strategy-violation":
      /* Şablon "ürün düşmez" ilan etmiş ama yüzey sabit kapasiteli olduğu için
         ürün düştü. Operatör görsün ki manifest ilanı düzeltilebilsin. */
      return `${t("editor.warn_strategy_violation")} (${w.declared}, ${w.dropped})`;
  }
}
