/* YOKLUK İDDİALARININ BİÇİMİ — ÖLÇÜLDÜ, SONRA ÇİVİLENDİ (K-1/B borcu).

   NEREDEN GELDİ: `2026-08-07-cmyk-kapsami` paketinin açık bulgusu (`K1B-CMYK-3`)
   şunu diyordu — "anlık yokluk iddiası (`expect(queryBy…).toBeNull()`) arkasında
   asenkron bir koşul varsa 'gerçekleşmedi' değil 'HENÜZ gerçekleşmedi' ölçer;
   sınıf iki dosyada kapatıldı ama DEPO GENELİNDE TARANMADI".

   TARAMA BU TURDA YAPILDI VE SONUÇ ŞU: `apps/web` testlerindeki **33** anlık
   yokluk iddiasının tamamı geçici olarak SINIRLI BEKLEMEYE çevrildi
   (`await expect(findBy…).rejects.toThrow()`) ve takım koşuldu.
   **Hiçbiri geç render gizlemiyordu — 0 test kırmızıya döndü.** Yani geçen
   turda bulunan yarış YAYGIN BİR SINIF DEĞİL, CMYK düğmesine özgüydü: orada
   düğmeyi kapılayan sorgu (`cmykStatus`), testin beklediği sorgudan BAŞKAYDI.
   33 siteyi kalıcı olarak çevirmek, ölçülen sıklığı SIFIR olan bir riske
   karşılık web takımına ~33 sn eklerdi; çevrilmedi ve gerekçesi budur.

   AMA ÖLÇÜM İKİNCİ VE ASIL BULGUYU VERDİ — ÇARE EVRENSEL DEĞİL:
   deneyde TEK bir test kırmızıya döndü ve sebebi geç render değildi.
   `EditorPage.test.tsx` **sahte zamanlayıcı** (`vi.useFakeTimers`) kullanıyor;
   `findBy*`'in bekleme penceresi GERÇEK zamana bağlıdır ve sahte zamanlayıcı
   altında hiç ilerlemez — söz asla reddedilmez, test vitest'in 5000 ms tavanına
   kadar ASILI KALIR. Ölçülen: dönüşümde 5010 ms'de düştü; aynı dosya izole
   koşumda 248 ms. Yani "yokluk iddialarını sınırlı beklemeye çevir" tarifi,
   sahte zamanlayıcı kullanan dosyalarda YANLIŞTIR ve sessiz bir kilit üretir.

   BU DOSYANIN İŞİ: geçen turda getirilen çareyi, ONU KİLİTLEYECEK ortamla aynı
   dosyada kullanmayı ENGELLEMEK. Kural mekaniktir, yazım âdetine dayanmaz:
   bir test dosyası ya sahte zamanlayıcı kullanır ya sınırlı-bekleme yokluk
   iddiası — ikisini birden değil. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const BU_DOSYA = fileURLToPath(import.meta.url);
const WEB_SRC = path.dirname(BU_DOSYA);

/** Sahte zamanlayıcı kurulumu — `findBy*`'in gerçek-zaman penceresini dondurur. */
const SAHTE_ZAMAN = /\bvi\.useFakeTimers\s*\(/;

/** Sınırlı-bekleme yokluk iddiası: `await expect(screen.findBy…).rejects…` */
const SINIRLI_YOKLUK = /find(?:By|AllBy)[A-Za-z]*\([^;]*\)\s*\)\s*\.rejects/s;

function testDosyalari(): Array<{ ad: string; kaynak: string }> {
  const bulunan: Array<{ ad: string; kaynak: string }> = [];
  const gez = (dizin: string): void => {
    for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) gez(tam);
      /* KENDİNİ TARAMAZ — ve bu bir negatif kontrolün ürünü: desenlerden biri
         "asla eşleşmesin" diye bozulduğunda ön-koşul YEŞİL KALDI, çünkü
         bozulmuş desen metin olarak BU DOSYADA duruyordu ve tarayıcı onu
         kendi kaynağında buluyordu. Yani nöbetçi, kendi yazdığı örneklerle
         kendini besliyordu: ön-koşullar gerçek test dosyalarını değil bu
         dosyanın YORUMLARINI ölçüyordu. */
      else if (tam !== BU_DOSYA && /\.test\.tsx?$/.test(g.name)) {
        bulunan.push({ ad: path.relative(WEB_SRC, tam), kaynak: fs.readFileSync(tam, "utf8") });
      }
    }
  };
  gez(WEB_SRC);
  return bulunan;
}

describe("ön-koşul — tarama GERÇEKTEN iki biçimi de görüyor", () => {
  /* Bu blok olmadan aşağıdaki "çakışma yok" iddiası, hiçbir şey bulamayan
     bozuk desenlerle de yeşil kalırdı: iki kümenin kesişimi boş olur ve test
     "kural tutuyor" derdi. Bu deponun defalarca ödediği kör nokta. */

  it("SAHTE ZAMANLAYICI kullanan dosya GERÇEKTEN var", () => {
    const d = testDosyalari().filter((f) => SAHTE_ZAMAN.test(f.kaynak));
    expect(d.length, "sahte zamanlayıcı deseni hiçbir dosyayı bulmuyor").toBeGreaterThan(0);
  });

  it("SINIRLI-BEKLEME yokluk iddiası kullanan dosya GERÇEKTEN var", () => {
    /* Geçen turda getirilen çare; kullanılmıyorsa bu kuralın konusu yok
       demektir ve o zaman kuralın kendisi ölü olurdu. */
    const d = testDosyalari().filter((f) => SINIRLI_YOKLUK.test(f.kaynak));
    expect(d.length, "sınırlı-bekleme deseni hiçbir dosyayı bulmuyor").toBeGreaterThan(0);
  });
});

describe("SAHTE ZAMANLAYICI ile SINIRLI BEKLEME aynı dosyada olamaz", () => {
  it("çakışan dosya YOK", () => {
    /* ÖLÇÜLEN KİLİT: `findBy*` penceresi gerçek zamana bağlıdır; sahte
       zamanlayıcı altında hiç ilerlemez, söz asla reddedilmez ve test 5000 ms
       tavanına kadar asılı kalır. Deneyde bu tam olarak yaşandı
       (EditorPage.test.tsx: 5010 ms'de düştü, izole koşumda 248 ms). */
    const cakisan = testDosyalari()
      .filter((f) => SAHTE_ZAMAN.test(f.kaynak) && SINIRLI_YOKLUK.test(f.kaynak))
      .map((f) => f.ad);
    expect(
      cakisan,
      "Bu dosya hem sahte zamanlayıcı hem sınırlı-bekleme yokluk iddiası " +
        "kullanıyor: `findBy*` penceresi gerçek zamana bağlıdır ve sahte " +
        "zamanlayıcı altında ilerlemez — söz asla reddedilmez ve test SESSİZCE " +
        "zaman aşımına kadar asılı kalır. Ya iddiayı `waitFor` + `queryBy` ile " +
        "kurun (sahte zamanı siz ilerletirsiniz) ya da o dosyada gerçek " +
        "zamanlayıcı kullanın.",
    ).toEqual([]);
  });
});
