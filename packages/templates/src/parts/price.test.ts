/* priceLines birim-farkındalığı — journal 2026-07-28-birim-alani.
   Tipografi kuralı ("/" bitişik, diğerleri boşluklu) SHARED'da çivilidir
   (utils.test.ts); burada yalnız BAĞLANTININ kurulduğu ölçülür: birim dolu
   varyantın metni baskı yoluna (grid priceLines) taşınır. */
import { describe, expect, it } from "vitest";
import { PriceVariantSchema } from "@tezgah/shared";
import { priceLines } from "./price.js";

const OPTS = { font_mm: 3.2, ratio: 0.5, maxWidth_mm: 200 };

describe("priceLines — birim alanı (journal 2026-07-28-birim-alani)", () => {
  it('CANLI YARA kapanışı: tek varyant + birim "/kg" → baskıda "24,00 €/kg"; etiket yine gizli', () => {
    const p = PriceVariantSchema.parse({ label: "seul", value: 24, birim: "/kg" });
    /* tek varyantta etiket ("seul") basılmaz — o davranış AYNEN korunur,
       yalnız değer metni birim-farkında olur */
    expect(priceLines([p], "EUR", OPTS)).toEqual([{ text: "24,00 €/kg" }]);
  });

  it('çok varyantta birim kendi varyantının metninde; "label fiyat" düzeni korunur', () => {
    const prices = [
      PriceVariantSchema.parse({ label: "S", value: 3.5, birim: "330ml" }),
      PriceVariantSchema.parse({ label: "L", value: 5, birim: "" }),
    ];
    expect(priceLines(prices, "EUR", OPTS)).toEqual([{ text: "S 3,50 € 330ml · L 5,00 €" }]);
  });

  it("boş birim (parse default) → bugünkü çıktı BİREBİR (sıfır-davranış)", () => {
    const p = PriceVariantSchema.parse({ label: "seul", value: 7.5 });
    expect(p.birim).toBe(""); // parse default'u doldurur
    expect(priceLines([p], "EUR", OPTS)).toEqual([{ text: "7,50 €" }]);
  });
});
