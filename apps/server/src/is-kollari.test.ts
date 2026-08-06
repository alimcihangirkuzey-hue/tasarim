/* KURULUM İŞ KOLU İLANI testleri (K-1/C modül sınırı).

   Saf katman: env metni → doğrulanmış ilan. Uç ayrı testte değil, burada
   yeterli — rota tek satırdır ve bu fonksiyonu döndürür.

   ÖLÇÜLEN SÖZLEŞMELER: varsayılan AÇIK (yapılandırma yoksa bugünkü davranış
   birebir), tanınmayan ad FAIL-LOUD, sıra İLAN sırası. */

import { describe, expect, it } from "vitest";
import { SEKTORLER } from "@tezgah/templates/identity";
import { IS_KOLLARI_ENV, isKollariIlani } from "./is-kollari.js";

describe("isKollariIlani — kimlik-bilgisi-kapılı, değer boş", () => {
  it("YAPILANDIRMA YOKSA HEPSİ ETKİN — bugünkü davranış birebir korunur", () => {
    /* K-1/C'nin verdiği biçim: mekanizma hazır, değer boş. Tek-operatörlü
       yerel kurulum hiçbir şey yapmadan çalışmaya devam etmeli. */
    for (const ham of [undefined, "", "   "]) {
      const ilan = isKollariIlani(ham);
      expect(ilan.kaynak, String(ham)).toBe("varsayilan");
      expect(ilan.aktif).toEqual(SEKTORLER);
      expect(ilan.tumu).toEqual(SEKTORLER);
    }
  });

  it("DARALTMA çalışır — yalnız ilan edilen kollar etkin", () => {
    const ilan = isKollariIlani("tabelaci");
    expect(ilan.kaynak).toBe("yapilandirma");
    expect(ilan.aktif).toEqual(["tabelaci"]);
    /* `tumu` daralmaz: arayüzün "hepsi mi, değil mi" ayrımı buna bakar. */
    expect(ilan.tumu).toEqual(SEKTORLER);
  });

  it("SIRA İLAN SIRASIDIR — yazım sırası kurulumları farklı sıralamasın", () => {
    const tersYazim = [...SEKTORLER].reverse().join(",");
    expect(isKollariIlani(tersYazim).aktif).toEqual(SEKTORLER);
  });

  it("boşluk ve boş alanlar hoşgörülür (elle yazılan env gerçeği)", () => {
    expect(isKollariIlani(" tabelaci , matbaa ,").aktif).toEqual(
      SEKTORLER.filter((s) => s === "tabelaci" || s === "matbaa")
    );
  });

  it("TANINMAYAN AD FAIL-LOUD — sessizce atlanmaz", () => {
    /* Sessiz atlama, tek harflik yazım hatası yüzünden kiracıya YANLIŞ şablon
       kümesi göstermek demekti ve kimse fark etmezdi. Reponun kendi deseni:
       yük-zamanı doğrulama uygulamayı ayağa kaldırmaz. */
    expect(() => isKollariIlani("tabelacı")).toThrow(/tanınmayan iş kolu/i);
    expect(() => isKollariIlani("tabelaci,matbaacilik")).toThrow(/matbaacilik/);
    /* Hata mesajı geçerli kümeyi SÖYLER — operatör neyi yazacağını bilsin. */
    expect(() => isKollariIlani("yok")).toThrow(new RegExp(SEKTORLER[0]!));
  });

  it("DOLU AMA BOŞ liste yapılandırma HATASIDIR", () => {
    /* "Hiçbir şey gösterme" bir talep değil, kaza: kurulum sessizce
       kullanılamaz hâle gelirdi. */
    expect(() => isKollariIlani(",")).toThrow(/hiçbir iş kolu içermiyor/i);
    expect(() => isKollariIlani(" , , ")).toThrow(/hiçbir iş kolu içermiyor/i);
  });

  it("değişken adı sözleşmedir (belgelenen ad değişirse test kırılır)", () => {
    expect(IS_KOLLARI_ENV).toBe("TEZGAH_IS_KOLLARI");
  });
});
