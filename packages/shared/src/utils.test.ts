import { describe, expect, it } from "vitest";
import { formatPrice, slugify, fiyatMetni } from "./utils.js";

/* Kabul §7/7: formatPrice EUR ve CHF */
describe("formatPrice", () => {
  it("EUR — fr-FR biçimi, virgül + € (M9)", () => {
    expect(formatPrice(7.5)).toBe("7,50 €");
    expect(formatPrice(10)).toBe("10,00 €");
    expect(formatPrice(0)).toBe("0,00 €");
    expect(formatPrice(9.9, "EUR")).toBe("9,90 €");
  });

  it("CHF — nokta ondalık, iki hane, sembolsüz (FAZ1-GOREV §2.2)", () => {
    expect(formatPrice(22, "CHF")).toBe("22.00");
    expect(formatPrice(7.5, "CHF")).toBe("7.50");
    expect(formatPrice(0, "CHF")).toBe("0.00");
  });
});

describe("slugify", () => {
  it("TR ve FR karakterlerini güvenli çevirir (M9)", () => {
    expect(slugify("Antalya Kebab — Lyon")).toBe("antalya-kebab-lyon");
    expect(slugify("İstanbul Şiş & Çöp")).toBe("istanbul-sis-cop");
    expect(slugify("Bœuf à l'étouffée")).toBe("boeuf-a-l-etouffee");
  });
});

describe("fiyatMetni — birim-farkında fiyat metni (journal 2026-07-28-birim-alani)", () => {
  it("boş birim = formatPrice BİREBİR (sıfır-davranış sözleşmesi)", () => {
    /* Alan eklenmiş ama birim girilmemiş hiçbir belgede tek karakter
       değişmemeli — yedi render yolunun fiyatMetni'ne bağlanabilmesinin
       ön koşulu bu eşitliktir. */
    expect(fiyatMetni({ value: 7.5, birim: "" }, "EUR")).toBe(formatPrice(7.5, "EUR"));
    expect(fiyatMetni({ value: 22, birim: "" }, "CHF")).toBe(formatPrice(22, "CHF"));
  });

  it('"/" ile başlayan birim BİTİŞİK: bölü-birim geleneği', () => {
    expect(fiyatMetni({ value: 24, birim: "/kg" }, "EUR")).toBe("24,00 €/kg");
    expect(fiyatMetni({ value: 12, birim: "/saat" }, "EUR")).toBe("12,00 €/saat");
    expect(fiyatMetni({ value: 22, birim: "/kg" }, "CHF")).toBe("22.00/kg");
  });

  it("diğer birimler boşlukla: miktar sınıfı (şerh: doğal evi ürün adıdır, sansürlenmez)", () => {
    expect(fiyatMetni({ value: 3.5, birim: "330ml" }, "EUR")).toBe("3,50 € 330ml");
  });
});
