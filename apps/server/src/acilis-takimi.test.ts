/* AÇILIŞ TAKIMININ KURULUM İLANI (K-1/A × K-1/C).

   ÖLÇÜLEN YARA: K-1/A "paket şablonları" (ÇOĞUL) diyor; sistemde tek ve
   değiştirilemez bir takım vardı (`OPENING_KIT`, kod sabiti) ve içeriği
   menü · flyer · sadakat kartı · vitrophanie — dördü de menü/matbaa işi.
   Bir tabelacı kurulumunda süzgeç dördünü de düşürüyor, uç 409 dönüyor ve
   "Açılış Takımı" düğmesi o kiracıda HİÇ ÇALIŞMIYOR (`preset-kapsami.test`
   bunu zaten ölçüyor). Yani K-1/A'nın ana kaldıracı hedef kesimin bir
   kısmında kullanılamazdı.

   ÜRÜN KARARI UYDURULMADI: "bir tabelacının takımında ne olmalı" sorusunun
   cevabı verilmedi — yazılabileceği yer açıldı. Değer boş → bugünkü dört
   kalem birebir. */

import { describe, expect, it } from "vitest";
import { OPENING_KIT } from "@tezgah/shared";
import { SEKTORLER, siparisSektoru } from "@tezgah/templates/identity";
import {
  ACILIS_TAKIMI_ENV,
  TAKIM_TURLERI,
  acilisTakimiIlani,
  dogrulaTakimKapsami,
  tasarlanabilirTurler,
  type AcilisTakimiIlani,
} from "./acilis-takimi.js";
import { isKollariIlani } from "./is-kollari.js";

const KOLLAR = (...s: string[]) => isKollariIlani(s.join(","));

describe("ön-koşul — ilan GERÇEKTEN bir şey tanıyor", () => {
  it("TÜR LİSTESİ ŞEMADAN gelir ve BOŞ DEĞİLDİR", () => {
    /* Bu satır olmadan aşağıdaki "tanınmayan tür reddedilir" iddiaları, hiçbir
       türü tanımayan bozuk bir listeyle de yeşil kalırdı: her şey reddedilir,
       testler "reddediyor" der ve mekanizma ölçülmemiş olurdu. */
    expect(TAKIM_TURLERI.length).toBeGreaterThan(3);
    expect(TAKIM_TURLERI).toContain("tabela");
  });

  it("TASARLANABİLİR küme, tüm türlerin ÖZ ALT KÜMESİ", () => {
    /* Öz alt küme olmasaydı "tasarlanamaz tür reddedilir" testi konusuz
       kalırdı — reddedilecek bir tür bulunamazdı. */
    const t = tasarlanabilirTurler();
    expect(t.length).toBeGreaterThan(0);
    expect(t.length).toBeLessThan(TAKIM_TURLERI.length);
  });
});

describe("DEĞER BOŞ → BUGÜNKÜ DAVRANIŞ BİREBİR", () => {
  it("tanımsız ilanda takım OPENING_KIT'tir — details ALANLARI DAHİL", () => {
    /* `details` özellikle ölçülür: ilan edilen takım onları taşımaz, yani
       varsayılan yolun onları KORUDUĞU ayrıca çivilenmelidir. */
    const i = acilisTakimiIlani(undefined);
    expect(i.kaynak).toBe("varsayilan");
    expect(i.kalemler).toEqual(OPENING_KIT.items);
    expect(i.kalemler[0]!.details).toEqual({ format: "a3" });
  });

  it("BOŞ DİZE ve yalnız boşluk da varsayılan sayılır", () => {
    expect(acilisTakimiIlani("").kaynak).toBe("varsayilan");
    expect(acilisTakimiIlani("   ").kaynak).toBe("varsayilan");
  });
});

describe("İLAN EDİLMİŞ takım", () => {
  it("YAZILAN TÜRLER, YAZILAN SIRADA — ve boşluklar kırpılır", () => {
    const i = acilisTakimiIlani(" tabela , tisort ");
    expect(i.kaynak).toBe("yapilandirma");
    expect(i.kalemler.map((k) => k.product_type)).toEqual(["tabela", "tisort"]);
  });

  it("SIRA YENİDEN DİZİLMEZ — ilan bir KÜME değil, İŞ LİSTESİDİR", () => {
    /* `is-kollari`den BİLEREK ayrılan karar: orada sıra ilan sırasına çekilir
       (küme), burada kurulumcunun yazdığı sıra korunur. İki yazım aynı
       sonucu vermez ve VERMEMELİDİR. */
    expect(acilisTakimiIlani("tisort,tabela").kalemler.map((k) => k.product_type)).toEqual([
      "tisort",
      "tabela",
    ]);
    expect(acilisTakimiIlani("tabela,tisort").kalemler.map((k) => k.product_type)).toEqual([
      "tabela",
      "tisort",
    ]);
  });

  it("TEKRAR SERBEST — iki ayrı tabela meşru bir taleptir", () => {
    expect(acilisTakimiIlani("tabela,tabela").kalemler).toHaveLength(2);
  });

  it("İLAN EDİLEN kalem `details` TAŞIMAZ — yazılı sınır", () => {
    /* Sonuç, ölçüsüz vitrophanie'nin bugün zaten yaptığı şeydir: kalem
       `olcu_bekliyor` doğar ve eksik alan rozetiyle görünür. Biçimi de ilana
       taşımak ("menu:a3") ayrı bir dilim; buraya sıkıştırmak doğrulanmamış
       bir ayrıştırma dili eklemek olurdu. */
    expect(acilisTakimiIlani("menu").kalemler[0]).toEqual({ product_type: "menu" });
  });
});

describe("FAIL-LOUD — yanlış yapılandırma sessizce geçmez", () => {
  it("TANINMAYAN tür fırlatır ve GEÇERLİLERİ söyler", () => {
    expect(() => acilisTakimiIlani("tabelaa")).toThrow(
      new RegExp(`${ACILIS_TAKIMI_ENV}.*tanınmayan ürün türü.*"tabelaa"`),
    );
    expect(() => acilisTakimiIlani("tabelaa")).toThrow(/tabela/); // geçerliler listelenir
  });

  it("TASARLANAMAZ tür AYRI bir mesajla fırlatır", () => {
    /* Ayrı mesaj bilinçli: kurulumcu GEÇERLİ bir ürün türü yazmıştır; sorun
       yazımda değil, o türün şablonunun olmamasındadır. Tek mesajda
       birleştirmek onu yazım hatası aramaya gönderirdi. */
    const tasarlanamaz = TAKIM_TURLERI.filter((t) => !tasarlanabilirTurler().includes(t));
    expect(tasarlanamaz.length, "tasarlanamaz tür yok — test konusuz").toBeGreaterThan(0);
    expect(() => acilisTakimiIlani(tasarlanamaz[0]!)).toThrow(/tasarlanamaz \(şablon seçeneği yok\)/);
    expect(() => acilisTakimiIlani(tasarlanamaz[0]!)).not.toThrow(/tanınmayan/);
  });

  it("İLAN EDİLMİŞ AMA BOŞ fırlatır — 'takım istemiyorum' talebi DEĞİL", () => {
    /* `is-kollari` ile aynı gerekçe: bu bir yazım hatasının biçimidir; niyet
       buysa değişken KALDIRILIR. */
    expect(() => acilisTakimiIlani(",,")).toThrow(/hiçbir kalem içermiyor/);
    expect(() => acilisTakimiIlani(" , ")).toThrow(/hiçbir kalem içermiyor/);
  });
});

describe("İŞ KOLU ÇELİŞKİSİ — süzgeç sessizce düşürmez, kurulum DURUR", () => {
  it("İLAN EDİLEN takım iş kolu dışı kalem taşırsa FIRLATIR", () => {
    /* Yaranın kendisi: kurulumcu dört kalem yazar, ikisini alır ve bunu
       söyleyen hiçbir şey olmaz. */
    expect(() =>
      dogrulaTakimKapsami(acilisTakimiIlani("menu,tabela"), KOLLAR("tabelaci")),
    ).toThrow(/"menu" \(menu-uretici\).*iş kollarında değil/);
  });

  it("TAMAMI iş kolu içindeyse SESSİZ geçer", () => {
    expect(() =>
      dogrulaTakimKapsami(acilisTakimiIlani("tabela"), KOLLAR("tabelaci")),
    ).not.toThrow();
  });

  it("VARSAYILAN takım denetlenmez — yazılmamış şey çelişki üretemez", () => {
    /* OPENING_KIT'in tabelacı kurulumunda tamamen süzülmesi KAYITLI ve
       kasıtlı davranıştır (uç 409 ile gerekçesini söyler). Onu çelişki
       saymak bugünkü kurulumları geriye dönük bozardı. */
    expect(() => dogrulaTakimKapsami(acilisTakimiIlani(""), KOLLAR("tabelaci"))).not.toThrow();
  });

  it("İŞ KOLU İLANI YOKSA denetlenmez — daraltma yok, çelişki de yok", () => {
    expect(() => dogrulaTakimKapsami(acilisTakimiIlani("menu"), isKollariIlani(""))).not.toThrow();
  });
});

describe("KAÇIŞ KAPISI — iş kolundan BAĞIMSIZ tür çelişki sayılmaz", () => {
  /* BU BLOĞUN NEDEN SENTETİK OLDUĞU ÖLÇÜLDÜ VE YAZILDI: ortam yolundan bu
     dala BUGÜN ULAŞILAMAZ. Sektörü `null` olan tek tür `diger`dir ve o aynı
     zamanda TEK tasarlanamaz türdür — yani ayrıştırıcı onu zaten reddeder.
     Kuralı yalnız ortam yoluyla sınamak, onu ölçülmeden yeşil bırakmak
     olurdu (bu deponun altı turdur ödediği sınıf). Bu yüzden ilan doğrudan
     enjekte edilir. */
  it("ÖN-KOŞUL: bugün sektörsüz tür ortam yolundan GİREMEZ", () => {
    const sektorsuz = TAKIM_TURLERI.filter((t) => siparisSektoru(t) === null);
    expect(sektorsuz.length, "sektörsüz tür yok — kaçış kapısı konusuz").toBeGreaterThan(0);
    for (const t of sektorsuz) {
      expect(tasarlanabilirTurler(), `${t} artık tasarlanabilir — kaçış kapısı ULAŞILIR oldu`).not.toContain(t);
    }
  });

  it("SEKTÖRSÜZ kalem taşıyan ilan çelişki DEĞİLDİR", () => {
    const sektorsuz = TAKIM_TURLERI.find((t) => siparisSektoru(t) === null)!;
    const takim: AcilisTakimiIlani = {
      kalemler: [{ product_type: sektorsuz }],
      kaynak: "yapilandirma",
    };
    expect(() => dogrulaTakimKapsami(takim, KOLLAR("tabelaci"))).not.toThrow();
  });

  it("SEKTÖRLÜ kalem AYNI ilanda çelişki ÜRETİR — kural gerçekten ayrım yapıyor", () => {
    /* Yukarıdaki testin tek başına anlamı yok: her şeyi kabul eden bozuk bir
       denetim onu da yeşil bırakırdı. */
    const sektorsuz = TAKIM_TURLERI.find((t) => siparisSektoru(t) === null)!;
    const takim: AcilisTakimiIlani = {
      kalemler: [{ product_type: sektorsuz }, { product_type: "menu" }],
      kaynak: "yapilandirma",
    };
    expect(() => dogrulaTakimKapsami(takim, KOLLAR("tabelaci"))).toThrow(/"menu"/);
  });
});

describe("TÜRETİM sağlam — elle ikinci tablo yok", () => {
  it("her TASARLANABİLİR türün iş kolu GERÇEKTEN ilan edilmiş bir koldur", () => {
    for (const t of tasarlanabilirTurler()) {
      const s = siparisSektoru(t);
      expect(s, `${t} tasarlanabilir ama sektörü yok`).not.toBeNull();
      expect(SEKTORLER, t).toContain(s!);
    }
  });
});
