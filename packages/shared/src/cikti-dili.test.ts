/* ÇIKTI DİLİ İLANI (K-1/D — sektörsüz dil).

   ÖLÇÜLEN YARA: dil seçeneği listesi arayüzde ELLE yazılıydı —
     <option value="fr">Français</option> … ×3
   yani şemanın ikinci kopyasıydı. Üstelik AYNI JSX bloğunda, bir satır
   yukarıda, para birimi seçicisi ZATEN ilandan türüyordu
   (`PARA_BIRIMI_SECENEKLERI`). Doğru desen komşusundaydı.

   BEDELİ: şemaya dördüncü bir dil eklendiği gün seçicide SESSİZCE eksik
   kalırdı — kullanıcı o dili seçemez, kimse de bir şeyin kırıldığını fark
   etmezdi (`gorunurTurler` paketinin ölçtüğü sınıfın aynısı).

   BU DOSYA NİYE VAR — VE NİYE BURADA: bir negatif kontrol (ilan sırasını
   ters çevirmek) HİÇBİR testi kırmızıya döndürmedi. Sebep ölçüldü: web
   tarafındaki iddia türetilmiş listeyi KENDİSİYLE karşılaştırıyordu
   (totoloji) — sıra değişince iki taraf birlikte değişiyordu. Sıra
   sözleşmesi ancak YETKİLİ KAYNAĞA (şemanın kendisine) karşı ölçülebilir,
   ve o kaynak burada yaşar. */

import { describe, expect, it } from "vitest";
import { CIKTI_DILLERI, CIKTI_DILI_SECENEKLERI, MenuLanguageSchema } from "./schemas.js";

const KODLAR = MenuLanguageSchema.removeDefault().options;

describe("ön-koşul — şema gerçekten çok seçenekli", () => {
  it("ŞEMA en az iki dil ilan ediyor", () => {
    /* Tek seçenekli bir şemada aşağıdaki sıra ve tamlık iddiaları hiçbir şey
       ölçmezdi. */
    expect(KODLAR.length).toBeGreaterThan(1);
  });
});

describe("ilan ŞEMADAN türer", () => {
  it("SIRA ŞEMANIN sırasıdır — yazım sırası DEĞİL", () => {
    /* Yetkili kaynağa karşı ölçülür: `CIKTI_DILLERI` nesnesindeki anahtar
       yazım sırası değişse bile bu iddia şemayı izler. */
    expect(CIKTI_DILI_SECENEKLERI.map((d) => d.kod)).toEqual([...KODLAR]);
  });

  it("TAM — şemadaki her dil ilanda var, fazlası YOK", () => {
    expect(Object.keys(CIKTI_DILLERI).sort()).toEqual([...KODLAR].sort());
  });

  it("HER DİLİN ETİKETİ VAR ve kodun kendisi DEĞİL", () => {
    /* Etiketi kod olarak bırakmak ("fr") operatöre ham veri göstermek olurdu;
       `sablonAdi`'nın kayıtsız kimlikte kimliği döndürmesinden farklı — orada
       ad BİLİNMİYOR, burada ilan onu YAZMAK ZORUNDA. */
    for (const d of CIKTI_DILI_SECENEKLERI) {
      expect(d.etiket.length, d.kod).toBeGreaterThan(0);
      expect(d.etiket, d.kod).not.toBe(d.kod);
    }
  });

  it("ETİKETLER BİRBİRİNDEN FARKLI — seçici ayırt edilebilir olmalı", () => {
    const etiketler = CIKTI_DILI_SECENEKLERI.map((d) => d.etiket);
    expect(new Set(etiketler).size).toBe(etiketler.length);
  });
});
