/* "BU İŞ NE?" REHBERİNİN GÖRÜNÜRLÜĞÜ (K-1/C modül sınırı).

   ÖLÇÜLEN YARA: Belgeler sekmesi `mode="guide"` ile AÇILIR (DocumentsPanel:103)
   — yani rehber, operatörün belge açarken gördüğü İLK ekrandır. Rehberin beş
   seçeneği elle listelidir ve kurulumun iş kollarını HİÇ okumuyordu. Oysa
   `aktifSektorler` AYNI bileşende zaten hesaplanıyor (satır 113) ve hemen
   altındaki "doğrudan seç" listesine veriliyor (SektorluSablonSecenekleri).
   Veri elinin altındaydı; rehber ona bakmıyordu.

   ÖLÇÜLEN SONUÇ: beş rehber seçeneğinin hedef iş kolları ilandan okununca
   üçü `menu-uretici`, ikisi `matbaa` çıkıyor — `tabelaci`, `tekstil-baski` ve
   `cam-giydirme` için TEK SEÇENEK YOK. Yani modül bir tabelacıya kiralandığında
   (TEZGAH_IS_KOLLARI=tabelaci) operatörün gördüğü İLK ekran, kurulumun hiç
   yapmadığı beş işi öneriyordu; daraltılmış gerçek liste ise "doğrudan seç"in
   arkasında saklıydı.

   AYNI HÜKMÜN BEŞİNCİ YÜZEYİ: 7.1/481 önce şablon seçicisinde, sonra iki
   sipariş türü seçicisinde, sonra açılış takımında uygulanmıştı. Rehber, en
   görünür olanıydı ve atlanmıştı.

   BOŞ REHBER ÇİZİLMEZ: daraltma sonrası hiç seçenek kalmayan kurulumda rehber
   boş bir ızgara göstermek yerine DOĞRUDAN SEÇ moduna düşer — o liste zaten
   daraltılmıştır ve boşalmaz. Boş ızgara, operatöre "burada yapacak bir şey
   yok" der; oysa yapılacak iş vardır, yalnız rehberin küratörlü listesinde
   yoktur.

   LİSTE KÜRATÖRLÜ KALIR: hangi şablonun "rehbere değer bir başlangıç noktası"
   olduğu bir İÇERİK kararıdır (FAZ5 §8) ve uydurulmaz. Bu katman yalnız
   DARALTIR — listeye şablon EKLEMEZ. */

import { hedefSektorOf, type Sektor } from "@tezgah/templates/identity";

/** Rehber seçeneğinin bu katmanın okuduğu kadarı (şablon kimliği). */
export interface RehberSecenegi {
  tid: string;
}

/**
 * Kurulumun iş kollarına göre görünür rehber seçenekleri.
 *
 * @param aktif undefined → süzme YOK (bugünkü davranış birebir; yapılandırma
 *   yapılmamış kurulumda ve uç henüz yanıtlamamışken de bu yol geçerlidir)
 */
export function gorunurRehberSecenekleri<T extends RehberSecenegi>(
  secenekler: readonly T[],
  aktif: readonly Sektor[] | undefined
): T[] {
  if (!aktif) return [...secenekler];
  return secenekler.filter((o) => {
    const s = hedefSektorOf(o.tid);
    /* Kayıtsız/sektörsüz şablon (fabrika-üretimi, kimlik kapsamı dışı) DÜŞMEZ:
       `gorunurSablonlar` ile aynı sözleşme — iş kolundan bağımsız olan şey,
       daraltmanın konusu değildir. */
    return s === null || aktif.includes(s);
  });
}
