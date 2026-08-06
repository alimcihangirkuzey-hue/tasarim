/* ŞABLON SEÇİM SORUSU — İLANDAN TÜRETİLİR (K-1/A, tek tık akışı).

   ÖLÇÜLEN YARA: bir ürün türünün ≥2 şablon seçeneği olduğunda akış bir
   `window.confirm` soruyordu ve sorunun metni i18n'de ELLE yazılıydı:

     "Menü şablonu seç: Tamam = Resimli Izgara, İptal = Premium Liste"

   Üç şey birden ölçüldü:

   1. METİN ZATEN KAYMIŞ. İlan `menu: ["menu-grid-cells", "menu-liste-premium"]`
      diyor; manifestlerin adları "Resimli Izgara Menü" ve **"Premium Yazılı
      Menü"**. Soru "Premium Liste" diyor — sistemde BÖYLE BİR AD YOK. Elle
      tutulan kopya çoktan ilandan ayrışmış.

   2. SIRA SÖZLEŞMESİ YAZILI DEĞİL. "Tamam = ilk seçenek" varsayımı yalnız
      çağrı yerindeki `secenekler[0]`'da yaşıyordu. `SIPARIS_SABLONLARI.menu`
      bir gün ters sıralanırsa diyalog "Resimli Izgara" derken Premium'u
      açardı — sessiz, kapısız, testsiz.

   3. SORU MENÜYE ÖZGÜ AMA HER TÜR İÇİN SORULUYOR. Metin "Menü şablonu seç"
      diye başlıyor ama koşul `secenekler.length >= 2` — türden bağımsız.
      Bugün yalnız `menu` iki seçenekli olduğu için LATENT; `tabela` ikinci
      bir şablon aldığı gün tabelacıya "Menü şablonu seç" sorulacaktı.

   ÇÖZÜM: soru ilandan + kayıt defterinden türer. Ad da, sıra da, tür adı da
   tek kaynaktan gelir; elle yazılan tek şey kalıbın kendisidir.

   İKİLİ SEÇİCİNİN ÖN-KOŞULU AÇIK: `window.confirm` iki seçenek sunabilir.
   Üçüncü bir şablon eklendiği gün SESSİZCE erişilemez olmasın diye bu katman
   FIRLATIR — ve `sablonSorusu.test.ts` aynı ön-koşulu GERÇEK ilana karşı
   ölçer, yani fırlatma üretimde asla tetiklenmez: kırmızı test daha önce
   davranır. Gerçek bir N-seçenekli seçici arayüz tasarımı işidir ve o gün
   yazılır; bu katman onu SESSİZCE ERTELEMEZ. */

import { TEMPLATES } from "@tezgah/templates";

/** İkili seçicinin taşıyabileceği en fazla seçenek. */
export const IKILI_SECENEK = 2;

/**
 * Şablon kimliğinin operatöre görünen adı.
 *
 * Kayıtsız kimlik (fabrika/generated) için kimliğin kendisi döner — uydurma
 * ad üretmek, olmayan bir şablonu varmış gibi göstermek olurdu.
 */
export function sablonAdi(tid: string): string {
  return TEMPLATES[tid]?.manifest.name_tr ?? tid;
}

/**
 * İki seçenekli şablon sorusunun metni.
 *
 * @param turAdi ürün türünün çevrilmiş adı (çağıran i18n'den verir)
 * @param secenekler İLAN sırasında şablon kimlikleri — sıra sözleşmedir:
 *   onay (Tamam) İLK seçeneği seçer
 */
export function sablonSecimSorusu(turAdi: string, secenekler: readonly string[]): string {
  if (secenekler.length !== IKILI_SECENEK) {
    throw new Error(
      `şablon sorusu ${IKILI_SECENEK} seçenek bekler, ${secenekler.length} geldi ` +
        `(${secenekler.join(", ")}) — N-seçenekli seçici gerekiyor, ikili diyalog ` +
        `fazlasını sessizce gizlerdi`,
    );
  }
  return `${turAdi} şablonu seç: Tamam = ${sablonAdi(secenekler[0]!)}, İptal = ${sablonAdi(secenekler[1]!)}`;
}

/**
 * Onay cevabını şablon kimliğine çevirir.
 *
 * SIRA SÖZLEŞMESİ TEK YERDE: "Tamam = ilk seçenek" kuralı burada yaşar ve
 * soruyu üreten fonksiyonla AYNI dosyadadır — metin ile davranışın ayrışması
 * ancak bu iki satırın birlikte değiştirilmesiyle mümkün.
 */
export function sablonSec(secenekler: readonly string[], onay: boolean): string {
  if (secenekler.length !== IKILI_SECENEK) {
    throw new Error(`şablon seçimi ${IKILI_SECENEK} seçenek bekler, ${secenekler.length} geldi`);
  }
  return onay ? secenekler[0]! : secenekler[1]!;
}
