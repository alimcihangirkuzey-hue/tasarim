/* SİPARİŞ KALEMİ TÜR SEÇİCİSİNİN GÖRÜNÜRLÜĞÜ (K-1/C modül sınırı).

   ÖLÇÜLEN İKİ YARA:

   1. TÜR LİSTESİ EL YAZIMIYDI. ProjectsPanel'deki `TYPES` dizisi, şemadaki
      `ProductTypeSchema.options`'ın birebir ikinci kopyasıydı. Bugün aynı
      oldukları için hiçbir şey görünmüyordu; şemaya yeni bir ürün türü
      eklendiği gün seçicide SESSİZCE eksik kalırdı — operatör türü göremez,
      kimse de bir şeyin kırıldığını fark etmezdi. Liste artık şemadan
      TÜRETİLİR ve sıra ilan sırasıdır.

   2. İŞ KOLU DARALTMASI BU YÜZEYE UĞRAMIYORDU. `is-kollari` katmanı
      (TEZGAH_IS_KOLLARI) 7.1/481'in "kullanıcı yalnızca yaptığı işi görür"
      hükmünü uyguluyordu ama YALNIZ şablon seçicisinde. Tabelacıya
      daraltılmış bir kurulumda operatör hâlâ "Tişört · Önlük · Menü" türlerini
      görüyor ve ekleyebiliyordu — modül kiralanan işletmenin hiç yapmadığı iş.

   TÜRETİLMİŞ, EL YAZIMI DEĞİL: tür → iş kolu bağı `siparisSektoru`'dur
   (SIPARIS_MATERYALI × HEDEF_SEKTOR). Burada ikinci bir tablo YOKTUR.

   KAÇIŞ KAPISI ASLA KAPANMAZ: iş kolundan bağımsız türler (siparisSektoru
   null — bugün `diger`) her kurulumda görünür. Liste bu yüzden HİÇBİR
   yapılandırmada boşalamaz; boşalsaydı daraltma "sipariş alamıyorum"a
   dönüşür, görünürlük kısıtı yetki kısıtı olurdu. */

import { ProductTypeSchema, type ProductType } from "@tezgah/shared";
import { siparisSektoru } from "@tezgah/templates/identity";
import type { Sektor } from "@tezgah/templates/identity";

/** Şemadan türetilmiş tam tür listesi — ilan sırasıyla. */
export const SIPARIS_TURLERI: readonly ProductType[] = ProductTypeSchema.options;

/**
 * Kurulumun iş kollarına göre görünür tür listesi.
 *
 * @param aktif undefined → süzme YOK (bugünkü davranış birebir; yapılandırma
 *   yapılmamış kurulum ve uç henüz yanıtlamamışken de bu yol geçerlidir)
 * @param korunanTur iş kolu kapalı olsa bile görünür kalması gereken tür
 *   (seçili olan) — `gorunurSablonlar` ile aynı sözleşme
 */
export function gorunurSiparisTurleri(
  aktif: readonly Sektor[] | undefined,
  korunanTur?: ProductType,
): ProductType[] {
  if (!aktif) return [...SIPARIS_TURLERI];
  return SIPARIS_TURLERI.filter((t) => {
    if (t === korunanTur) return true;
    const s = siparisSektoru(t);
    return s === null || aktif.includes(s);
  });
}
