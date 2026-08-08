/* KALEM BİÇİMİ ile ŞABLON BİÇİMİ — İKİ AYRI SÖZLÜK, ÖLÇÜLÜP ÇİVİLENDİ (K-1/A).

   ÖNCEKİ PAKETİN AÇIK BULGUSU (`K1A-BICIM-1`) şöyle yazılmıştı: "geçerli biçim
   kümesi HİÇ İLAN EDİLMEMİŞTİR". Bu tur ölçtü ve YARISI YANLIŞ çıktı — `menu`
   türünün şablonları biçim seçeneklerini gerçekten ilan ediyor. Ama ilan
   edilen değerler kalemin yazdığı değerle AYNI SÖZLÜKTEN DEĞİL.

   BU DOSYA BİR KARAR VERMEZ, BİR OLGUYU ÇİVİLER. Köprü kurmak (ör.
   "a3" → "a3-portrait") ürün/tasarım kararıdır; ölçüm bugün ikisinin hiç
   buluşmadığını söylüyor (`PARAM_AKISI` bu türlerde `null`). Karar geldiği
   gün ölçüm hazır olsun, ve o güne kadar iki taraftan biri sessizce
   değişmesin diye. */

import { describe, expect, it } from "vitest";
import {
  OPENING_KIT,
  ProductTypeSchema,
  pricingInputsOf,
  type ProductType,
} from "@tezgah/shared";
import { MANIFESTS, siparisParamlari, siparisSablonlari } from "@tezgah/templates/identity";
import {
  kalemBicimiZorunluMu,
  koprusuOlabilecekTurler,
  sablonBicimSecenekleri,
} from "./kalem-bicimi.js";

const TURLER = ProductTypeSchema.options;

describe("ön-koşul — iki taraf da GERÇEKTEN okunuyor", () => {
  it("KALEM tarafı: `format` zorunlu olan tür VAR ve olmayan da VAR", () => {
    /* Bu satır olmadan aşağıdaki bütün iddialar, hiçbir türü ayırt etmeyen
       bozuk bir okumayla da yeşil kalırdı. */
    const zorunlu = TURLER.filter((t) => kalemBicimiZorunluMu(t));
    expect(zorunlu.length).toBeGreaterThan(0);
    expect(zorunlu.length).toBeLessThan(TURLER.length);
  });

  it("ŞABLON tarafı: biçim ilan eden tür VAR ve etmeyen de VAR", () => {
    const ilanli = TURLER.filter((t) => sablonBicimSecenekleri(t).length > 0);
    expect(ilanli.length).toBeGreaterThan(0);
    expect(ilanli.length).toBeLessThan(TURLER.length);
  });

  it("HER tür için şablon listesi okunabiliyor (tarama konusuz değil)", () => {
    const toplam = TURLER.reduce((n, t) => n + siparisSablonlari(t).length, 0);
    expect(toplam, "hiçbir tür şablon taşımıyor — tarama bozuk").toBeGreaterThan(5);
  });

  it("MODÜL SINIRI YETİYOR: sipariş köprüsünün her şablonu identity kaydında VAR", () => {
    /* `sablonBicimSecenekleri` manifesti C-P2 sınırına uyup `MANIFESTS`ten
       (identity, react'siz) okur — tam kayıttan değil. Bu okumanın SESSİZCE
       kör kalabileceği tek durum, köprüde adı geçen bir şablonun identity
       kapsamı dışında olmasıdır (fabrika/generated). Bugün öyle bir id YOK ve
       `dogrulaSiparisKoprusu` yük zamanında zaten kayıtsız id'yi geçirmiyor —
       bu yüzden bu dosyada ikinci bir "kayıtsız id" kapısı yazılmadı. Sınır
       kayarsa burası kırmızıya döner; sessiz boş dizi dönmez. */
    const kapsamDisi = TURLER.flatMap((t) =>
      siparisSablonlari(t).filter((id) => !Object.hasOwn(MANIFESTS, id))
    );
    expect(kapsamDisi, "identity kapsamı dışı şablon — biçim okuması sessizce körleşir").toEqual([]);
  });
});

describe("ISIRMAYAN OLUMSUZ KONTROL — kayda geçirildi", () => {
  it("`format` bugün HİÇBİR türde opsiyonel değil (ama opsiyonel girdi VAR)", () => {
    /* OLUMSUZ KONTROL ISIRMADI, VE BU BİR BULGU. `kalemBicimiZorunluMu`
       içindeki `&& g.zorunlu` koşulu silindiğinde bu dosyanın 10 testinin
       HİÇBİRİ kırmızıya dönmedi — çünkü bugünkü ilanda `format` girdisini
       taşıyan dört türün DÖRDÜ de onu ZORUNLU ilan ediyor. Yani bayrak
       okuması, yalnız `format` sorusuna bakan bir ölçümle ayırt EDİLEMEZ.

       Bayrağı silmedik: işlevin adı "zorunlu mu" diyor, silmek adı yalana
       çevirirdi. Onun yerine ayırt edilemezliğin KENDİSİ çivilendi. İki
       yarısı da gerekli:
         (a) `format` hiçbir türde opsiyonel DEĞİL — bugünkü olgu;
         (b) opsiyonel girdi kavramı kayıt defterinde GERÇEKTEN var
             (`print_qty` · `sizes`) — yoksa (a) boş bir doğru olurdu.
       Biri opsiyonel bir `format` ilan ettiği gün burası kırmızıya döner ve
       "bayrak bu ölçümde ne yapıyor" sorusu okuyucunun önüne gelir. */
    const opsiyonelBicim = TURLER.filter((t) =>
      pricingInputsOf(t).some((g) => g.alan === "format" && !g.zorunlu)
    );
    expect(opsiyonelBicim, "opsiyonel `format` doğmuş — zorunluluk bayrağı artık ayırt edici").toEqual(
      []
    );

    const opsiyonelAlanlar = TURLER.flatMap((t) =>
      pricingInputsOf(t)
        .filter((g) => !g.zorunlu)
        .map((g) => g.alan)
    );
    expect(
      opsiyonelAlanlar.length,
      "hiçbir girdi opsiyonel değil — yukarıdaki iddia boş doğru"
    ).toBeGreaterThan(0);
  });
});

describe("ÖLÇÜLEN TABLO — bugünkü hâl çivili", () => {
  it("KALEM biçimi DÖRT türde zorunlu", () => {
    expect(TURLER.filter((t) => kalemBicimiZorunluMu(t))).toEqual([
      "menu",
      "flyer",
      "trifold",
      "fidelite",
    ]);
  });

  it("ŞABLON biçimini YALNIZ `menu` ilan ediyor", () => {
    /* flyer · trifold · fidelite: kalem `format` İSTER ama hiçbir şablonu onu
       parametre olarak İLAN ETMEZ — yani değer bugün ATIL. Gereklilik gerçek
       (kalem tamlığı), tüketicisi yok. */
    const ilanli = TURLER.filter((t) => sablonBicimSecenekleri(t).length > 0);
    expect(ilanli).toEqual(["menu"]);
    expect(sablonBicimSecenekleri("menu")).toEqual([
      "a4-portrait",
      "a4-landscape",
      "a3-portrait",
    ]);
    for (const t of ["flyer", "trifold", "fidelite"] as const) {
      expect(sablonBicimSecenekleri(t), t).toEqual([]);
    }
  });

  it("İKİ SÖZLÜK AYRIK: varsayılan takımın menü biçimi şablon seçeneği DEĞİL", () => {
    /* ASIL BULGU. `OPENING_KIT` menü kalemine `format:"a3"` yazar; şablonun
       ilan ettiği küme `a3-portrait` içerir, `a3` İÇERMEZ. İkisi bugün hiç
       buluşmadığı için kimse fark etmiyor. */
    const kitBicimi = (OPENING_KIT.items.find((k) => k.product_type === "menu")!.details as {
      format?: string;
    }).format;
    expect(kitBicimi).toBe("a3");
    expect(sablonBicimSecenekleri("menu")).not.toContain(kitBicimi);
  });

  it("SEBEP ÖLÇÜLDÜ: kalem biçimi belge PARAMLARINA hiç gitmiyor", () => {
    /* İki sözlüğün çarpışmamasının MEKANİZMASI: `PARAM_AKISI` bu dört türde
       `null`dur, yani `siparisParamlari` ön-dolum üretmez. Köprü kurulacaksa
       önce burası açılmalıdır; bu paket onu AÇMAZ. */
    for (const t of ["menu", "flyer", "trifold", "fidelite"] as const) {
      const p = siparisParamlari({
        product_type: t,
        qty: 1,
        width_cm: null,
        height_cm: null,
        details: { format: "a3" },
      } as never);
      expect(p, `${t}: param akışı doğmuş — köprü sessizce açılmış olabilir`).toBeNull();
    }
  });
});

describe("NÖBETÇİ — köprü sorusu doğduğu gün konuşur", () => {
  it("KÖPRÜYE HAZIR tür bugün YALNIZ `menu`", () => {
    /* Köprüye hazır = kalem biçimi ZORUNLU **ve** şablon biçimi İLANLI.
       İkinci bir tür bu duruma girdiği gün (ör. flyer şablonuna `format`
       paramı eklenirse) "iki sözlük nasıl buluşacak" sorusu kendiliğinden
       gündeme gelir ve bu satır kırmızıya döner. */
    expect(koprusuOlabilecekTurler(TURLER)).toEqual(["menu"]);
  });

  it("KURAL SAF: sentetik kümeyle de doğru çalışır", () => {
    /* Bugünkü kayıt defteriyle `koprusuOlabilecekTurler` yalnız tek bir sonuç
       üretiyor; kuralın "ikisi birden" olduğunu ölçmek için girdiyi
       daraltıyoruz — biçim ZORUNLU ama şablon ilanı OLMAYAN türler boş küme
       vermeli. */
    expect(koprusuOlabilecekTurler(["flyer", "trifold", "fidelite"] as ProductType[])).toEqual([]);
    expect(koprusuOlabilecekTurler(["tabela", "tisort"] as ProductType[])).toEqual([]);
  });
});
