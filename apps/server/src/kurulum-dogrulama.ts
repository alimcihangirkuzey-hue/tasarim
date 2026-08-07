/* KURULUM İLANLARININ AÇILIŞTA DOĞRULANMASI (K-1/C modül sınırı).

   ÖLÇÜLEN YARA — İLAN EDİLMİŞ AMA GERÇEKLEŞMEMİŞ BİR GÜVENCE. `is-kollari.ts`
   başlığı şunu yazıyordu:

     "FAIL-LOUD: tanınmayan iş kolu adı SESSİZCE atlanmaz — uygulama ayağa
      kalkmaz. Sessiz atlama, yanlış yazılmış tek bir harf yüzünden kiracıya
      YANLIŞ ŞABLON KÜMESİ göstermek demek olurdu ve bunu kimse fark etmezdi."

   Bu tur, iddianın SİSTEM DÜZEYİNDE doğru olmadığını komutla ölçtü. Doğrulama
   yalnız okuyucu fonksiyonun içindeydi ve okuyucu YALNIZ istek anında
   çağrılıyordu. `TEZGAH_IS_KOLLARI=tabelacii` (fazladan bir harf) ile ölçüm:

     BOOT           → BAŞARILI      (iddia: "ayağa kalkmaz")
     /api/is-kollari→ her istekte 500
     /api/health    → 200           (bozuk kurulum SAĞLIKLI görünüyor)

   ve zincirin sonu tam da önlenmek istenen şeydi: arayüz sorgusu düşünce
   `isKollari.data` undefined kalır, süzgeç `undefined` alır ve DARALTMA HİÇ
   UYGULANMAZ — yani tek harflik yazım hatası, kiracıya BÜTÜN iş kollarını
   açar. Sessiz atlamadan beter: sessiz GENİŞLEME.

   NE YAPAR: kurulum ilanlarını açılışta bir kez okur. Okuma fırlatırsa süreç
   ayağa kalkmaz. Böylece güvence, yorumda değil kodda yaşar.

   NİYE AÇILIŞTA (istek başına değil): yanlış yapılandırma bir ÇALIŞMA ZAMANI
   hatası değil KURULUM hatasıdır; kurulumu yapan kişi oradadır ve mesajı
   görür. İstek anına bırakmak, hatayı onu düzeltemeyecek olan operatöre —
   üstelik 500 olarak — gösterir.

   OKUMA HÂLÂ İSTEK BAŞINADIR: bu dosya değerleri DONDURMAZ, yalnız
   doğrular. Dondurmak, ortam değişkenini değiştiren kurulumu yeniden
   başlatmaya zorlardı ve iki uç testi bunun tersini çiviliyor. */

import path from "node:path";
import { ACILIS_TAKIMI_ENV, dogrulaTakimKapsami } from "./acilis-takimi.js";
import { IS_KOLLARI_ENV, isKollariIlani } from "./is-kollari.js";
import { KUNYE_ENV, kurulumKunyesi } from "./kurulum-kunyesi.js";
import { ROOT_DIR } from "./paths.js";
import { VERI_DIZINI_ENV, veriDiziniIlani } from "./veri-dizini.js";
import { CIKTI_DILI_ENV, PARA_BIRIMI_ENV, dogusVarsayilanlari } from "./dogus-varsayilanlari.js";

export interface KurulumIlani {
  ad: string;
  /** Bu ilanın okuduğu ortam değişkenleri — nöbetçi kapsamı BURADAN türer. */
  env: readonly string[];
  oku: () => unknown;
}

/* Açılışta doğrulanan kurulum ilanları — ortam değişkeniyle yapılandırılan
   her ilan buraya girer.

   `env` ALANI NİYE VAR (2026-08-06, doğuş varsayılanları paketi): nöbetçi
   önce ilan ADINDAN env adına ELLE yazılmış bir switch'le geçiyordu; yani
   kapsamın kendisi testin içinde ikinci kez beyan ediliyordu ve dördüncü ilan
   eklendiğinde o switch'i güncellemeyi unutmak, ilanı sessizce kapsam dışında
   bırakırdı — nöbetçinin önlemek için var olduğu şeyin ta kendisi. Kapsam
   artık İLANIN KENDİ BEYANIDIR. */
export const KURULUM_ILANLARI: ReadonlyArray<KurulumIlani> = [
  { ad: "is-kollari", env: [IS_KOLLARI_ENV], oku: isKollariIlani },
  { ad: "kurulum-kunyesi", env: [KUNYE_ENV], oku: kurulumKunyesi },
  /* Veri dizini ilanı ASIL olarak paths.ts'te, yol türetilirken denetlenir
     (bozuk yol `ensureDirs()`'e ulaşmadan). Burada İKİNCİ KEZ okunur çünkü
     açılış denetiminin sözleşmesi "ortamla yapılandırılan HER ilan buradadır"
     — listede olmayan ilan, nöbetçinin göremediği ilandır. */
  { ad: "veri-dizini", env: [VERI_DIZINI_ENV], oku: () => veriDiziniIlani(path.join(ROOT_DIR, "data")) },
  /* Tek ilan, İKİ değişken: para birimi ve çıktı dili aynı doğuş anını
     yapılandırır ve birlikte okunur (biri bozuksa diğerinin geçerli olması
     kurulumu "yarı doğru" yapardı). */
  { ad: "dogus-varsayilanlari", env: [PARA_BIRIMI_ENV, CIKTI_DILI_ENV], oku: dogusVarsayilanlari },
  /* Takım ilanı İKİ AŞAMADA doğrulanır ve ikisi de açılışta koşar: önce kendi
     biçimi (tanınmayan/tasarlanamaz/boş tür), sonra İŞ KOLU İLANIYLA ÇELİŞKİ.
     İkincisi olmadan süzgeç, kurulumcunun yazdığı kalemi sessizce düşürürdü —
     yazdığı takım ile aldığı takım farklı olur ve bunu söyleyen hiçbir şey
     olmazdı. `env` yalnız kendi değişkenini beyan eder: iş kolu değişkeni
     zaten kendi ilanıyla denetimdedir. */
  { ad: "acilis-takimi", env: [ACILIS_TAKIMI_ENV], oku: () => { dogrulaTakimKapsami(); } },
];

/**
 * Kurulum ilanlarını okuyup doğrular; ilki fırlattığında fırlatır.
 *
 * Hata mesajı ilanın adıyla önlenir: birden çok ilan varken "hangisi" sorusu
 * mesajın kendisinden cevaplanmalıdır, yığın izinden değil.
 */
export function kurulumuDogrula(
  ilanlar: ReadonlyArray<{ ad: string; oku: () => unknown }> = KURULUM_ILANLARI
): void {
  for (const ilan of ilanlar) {
    try {
      ilan.oku();
    } catch (e) {
      throw new Error(`kurulum ilanı geçersiz (${ilan.ad}): ${(e as Error).message}`);
    }
  }
}
