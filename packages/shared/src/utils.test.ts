import { describe, expect, it } from "vitest";
import { formatPrice, slugify } from "./utils.js";

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
