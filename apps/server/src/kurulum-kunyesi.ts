/* KURULUM KÜNYESİ — modül sınırı katmanı (K-1/C, ürün sahibi kararı 2026-08-06:
   "bu sistemi bir modul olarak ozalitlere kiralık veya satılık ... kiracı-başına
   marka").

   ÖLÇÜLEN YARA: bu sistemin kendi adı, MÜŞTERİYE GİDEN iki basılı yüzeye elle
   gömülüydü — `PresentPage` ("Bon pour accord" onay sayfası) ve `FichePage`
   (nakışçı fişi) altbilgisinde `TEZGÂH — Atelier graphique`. Modül bir
   ozalitçiye kiralanıp o ozalitçi kendi müşterisine onay sayfası bastığında,
   sayfanın künyesinde KİRACININ değil SATICININ adı çıkardı. Bu kozmetik bir
   kusur değildir: onay sayfası kiracının müşterisiyle arasındaki belgedir.

   NE YAPAR: künyeyi tek yerden ilan eder ve kuruluma göre okunur kılar.

   KİMLİK-BİLGİSİ-KAPILI, DEĞER BOŞ (K-1'in verdiği biçim): yapılandırma
   `TEZGAH_KURULUM_KUNYESI` ortam değişkenidir. TANIMSIZ/BOŞ → bugünkü dize
   BİREBİR basılır; yani mevcut kurulum hiçbir şey yapmadan aynı çıktıyı verir.

   VARSAYILAN BİR KARAR DEĞİLDİR: aşağıdaki `VARSAYILAN_KUNYE`, reponun BUGÜNKÜ
   gerçeğinin tek kopyaya taşınmış hâlidir. Modülün TİCARİ ADI ürün sahibinin
   kararıdır (K-1'de açıkça açık bırakıldı) ve burada TEMSİL EDİLMEZ — bu dosya
   yalnız mekanizmadır. Karar geldiğinde değişecek yer bu tek satırdır.

   KAPSAM SINIRI (bilerek dar): yalnız MÜŞTERİYE GİDEN BASILI künye. Operatörün
   kendi ekranındaki başlık (`index.html` <title>, i18n `app.title`) DOKUNULMADI
   — orayı değiştirmek uygulamanın adını değiştirmektir ve o, ticari ad kararının
   ta kendisidir.

   FAIL-LOUD, iki kısıtta da: künye A4 altbilgisinde 2.8mm punto ile TEK SATIR
   basılır ve tarihle aynı satırı paylaşır. Ölçü: FichePage'de yazı alanı
   210−2×16 = 178mm; sağdaki tarih ~14mm; künyeden sonra gelen sabit ek
   (" · fichier DST/PES: à produire par le brodeur", 44 karakter) ~62mm. Künyeye
   kalan ~95mm, 2.8mm puntoda karakter başına ~1.4mm ile ~68 karakter. Tavan
   bunun altında, 60'ta tutuldu. Uzun künye SESSİZCE taşardı ve taşmayı ancak
   basılmış kâğıtta görürdünüz; satır sonu ise altbilgi düzenini bozardı. */

export const KUNYE_ENV = "TEZGAH_KURULUM_KUNYESI";

/** Reponun BUGÜNKÜ basılı künyesi — yeni bir karar değil, tek kopyaya taşıma. */
export const VARSAYILAN_KUNYE = "TEZGÂH — Atelier graphique";

/** Altbilgi genişliğinden ölçülen tavan (dosya başlığındaki aritmetik). */
export const KUNYE_AZAMI = 60;

export interface KurulumKunyesi {
  /** Basılı yüzeylerin altbilgisine yazılacak künye */
  kunye: string;
  /** "varsayilan" = yapılandırma yok · "yapilandirma" = kurulum kendi künyesini verdi */
  kaynak: "varsayilan" | "yapilandirma";
}

/**
 * Ortam değişkenini okur ve doğrular.
 *
 * Her çağrıda YENİDEN okunur (modül yüklenirken dondurulmaz) — `is-kollari`
 * ile aynı gerekçe: testler env'i test başına değiştirir ve dondurulmuş bir
 * değer o testleri sessizce yanlış ölçerdi.
 */
export function kurulumKunyesi(ham = process.env[KUNYE_ENV]): KurulumKunyesi {
  const metin = (ham ?? "").trim();

  /* Boşluk-yalnızca değer YAPILANDIRMA SAYILMAZ, varsayılana düşer. `is-kollari`
     boş listede fırlatır çünkü orada boş küme kurulumu KULLANILAMAZ hâle
     getirirdi; burada boş künye yalnızca "künye istemiyorum" demek olurdu ve o
     bir ürün kararıdır (künye kaldırılabilir mi?). Uydurmak yerine bugünkü
     davranışı sürdürüyoruz. */
  if (metin === "") return { kunye: VARSAYILAN_KUNYE, kaynak: "varsayilan" };

  if (/[\r\n]/.test(metin)) {
    throw new Error(`${KUNYE_ENV}: künye TEK SATIR olmalıdır — satır sonu altbilgi düzenini bozar`);
  }

  if ([...metin].length > KUNYE_AZAMI) {
    throw new Error(
      `${KUNYE_ENV}: künye ${[...metin].length} karakter, tavan ${KUNYE_AZAMI} — ` +
        "A4 altbilgisi 2.8mm puntoda bunu tek satıra sığdıramaz ve taşma ancak basılmış kâğıtta görülürdü"
    );
  }

  return { kunye: metin, kaynak: "yapilandirma" };
}
