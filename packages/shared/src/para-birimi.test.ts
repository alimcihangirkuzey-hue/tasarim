/* PARA BİRİMİ İLANI (K-1/D — sektörsüz dil / hedef kesimin kendi para birimi).

   ÖLÇÜLEN YARA: `CurrencySchema` iki üyeliydi — EUR ve CHF. K-1'in hedef
   kesimini ürün sahibi adıyla saydı ("ozalit baskıcı matbaa tabelacı
   menücüler") ve bu kesim fiyatını TL yazar; sistem TL'yi İFADE EDEMİYORDU.
   Sonuç sessiz bir yanlıştı, hata değil: K-2 kanıt turunda tohumlanan Türk
   tabelacı müşterinin TL büyüklüğündeki fiyatları (2400 · 850 · 1250) baskı
   yüzeyine "2 400,00 €" olarak düştü.

   İKİNCİ YARA, AYNI PAKETTE: küme ÜÇ YERDE tekrarlıydı — shared enum, iki
   ekranın elle yazılmış <option> listesi ve web'in kendi `Currency` tipi.
   Enum'a üye eklemek diğer üçünü sessizce eskitirdi; nitekim bu paket tam da
   onu yapıyor. Artık seçiciler ilandan türer.

   ÜÇÜNCÜ DELİK: `formatPrice` gövdesi `if (CHF) ... ; return EUR` idi — yani
   enum'a eklenen her yeni para birimi SESSİZCE euro gibi basardı. Tüketici
   switch'e çevrildi; aşağıdaki test bunu davranışla çakıyor. */

import { describe, expect, it } from "vitest";
import {
  CurrencySchema,
  PARA_BIRIMLERI,
  PARA_BIRIMI_SECENEKLERI,
  formatPrice,
  fiyatMetni,
  type Currency,
} from "./index.js";

describe("para birimi ilanı", () => {
  it("ÖN-KOŞUL: küme birden çok üye taşıyor ve TRY İÇİNDE", () => {
    /* Bu satır olmadan aşağıdaki "her üye" döngüleri tek üyeli bir kümede de
       hiçbir şey ayırt etmeden yeşil kalırdı. */
    expect(CurrencySchema.options.length).toBeGreaterThan(1);
    expect(CurrencySchema.options).toContain("TRY");
  });

  it("HER ÜYE İLAN TABLOSUNDA — ölü/eksik ilan yok", () => {
    for (const k of CurrencySchema.options) {
      expect(PARA_BIRIMLERI[k], `${k}: ilan yok`).toBeTruthy();
      expect(PARA_BIRIMLERI[k].kod, `${k}: kod tutmuyor`).toBe(k);
      expect(PARA_BIRIMLERI[k].etiket.length, `${k}: etiket boş`).toBeGreaterThan(0);
    }
    /* Ters yön: ilanda enum'da olmayan üye de olmamalı. */
    expect(Object.keys(PARA_BIRIMLERI).sort()).toEqual([...CurrencySchema.options].sort());
  });

  it("SEÇENEK SIRASI = İLAN SIRASI (yazım sırası değil)", () => {
    expect(PARA_BIRIMI_SECENEKLERI.map((p) => p.kod)).toEqual([...CurrencySchema.options]);
  });
});

describe("fiyat biçimi — her para birimi kendi yerelinde", () => {
  it("EUR bugünkü biçimini BİREBİR korur", () => {
    expect(formatPrice(7.5, "EUR")).toBe("7,50 €");
    /* Binlik ayracı DAR BÖLÜNMEZ BOŞLUK (U+202F) — fr-FR'nin Intl çıktısı.
       Mevcut `.replace(/\u00a0/g," ")` yalnız NORMAL bölünmez boşluğu
       bunu değil. Bu paket o davranışı DEĞİŞTİRMEZ; testin düz boşluk yazması
       kendi hatamdı ve gerçek karakter buraya çivileniyor ki bir gün sessizce
       değişirse görünsün. */
    expect(formatPrice(1250.5, "EUR")).toBe("1\u202f250,50 €");
  });

  it("CHF elle biçimlenen İSTİSNA olarak kalır (FAZ1-GOREV §2.2)", () => {
    expect(formatPrice(22, "CHF")).toBe("22.00");
  });

  it("TRY tr-TR standardında basar — euro gibi DEĞİL", () => {
    const tl = formatPrice(1250.5, "TRY");
    expect(tl).toContain("₺");
    expect(tl, "euro sembolü TL fiyatına sızdı").not.toContain("€");
    expect(tl, "tr-TR ondalık ayracı virgül").toContain("1.250,50");
  });

  it("VARSAYILAN ARGÜMAN bugünkü davranış (EUR)", () => {
    expect(formatPrice(7.5)).toBe(formatPrice(7.5, "EUR"));
  });

  it("HİÇBİR İKİ PARA BİRİMİ AYNI DİZEYİ ÜRETMEZ — sessiz düşme yakalanır", () => {
    /* Yaranın nöbetçisi: bir üye biçimlendiriciye bağlanmayı unutursa
       başka bir para biriminin çıktısına DÜŞER ve bu test onu görür. */
    const ciktilar = CurrencySchema.options.map((k) => formatPrice(1250.5, k));
    expect(new Set(ciktilar).size, `çakışan çıktı: ${ciktilar.join(" | ")}`).toBe(
      CurrencySchema.options.length,
    );
  });

  it("BİRİM KURALI her para biriminde aynı tipografiyi uygular", () => {
    /* journal 2026-07-28-birim-alani: "/" ile başlayan birim BİTİŞİK. */
    for (const k of CurrencySchema.options) {
      const bitisik = fiyatMetni({ value: 24, birim: "/m²" }, k);
      expect(bitisik, `${k}`).toBe(`${formatPrice(24, k)}/m²`);
      expect(fiyatMetni({ value: 24, birim: "" }, k), `${k}: boş birim`).toBe(formatPrice(24, k));
    }
  });
});

describe("şema kabulü", () => {
  it("TRY geçerli bir müşteri para birimi olarak PARSE edilir", () => {
    expect(CurrencySchema.parse("TRY")).toBe("TRY" satisfies Currency);
  });

  it("TANINMAYAN kod hâlâ REDDEDİLİR — küme açılmadı", () => {
    expect(() => CurrencySchema.parse("USD")).toThrow();
  });
});
