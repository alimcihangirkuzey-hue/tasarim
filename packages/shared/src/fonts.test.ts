import { describe, expect, it } from "vitest";
import { GLYPH_COVERAGE, REPO_FONT_FAMILIES, missingCoverageGlyphs, missingFontFamilies } from "./fonts.js";

describe("glif kapsam bekçisi (mimar #18)", () => {
  it("küme büyük/küçük FR+TR + € içerir", () => {
    for (const ch of ["ç", "ğ", "ı", "İ", "ö", "ş", "ü", "œ", "Œ", "Ç", "Ğ", "Ş", "€", "à", "Â", "ê", "ï"]) {
      expect(GLYPH_COVERAGE).toContain(ch);
    }
  });

  it("tam kapsam → eksik yok", () => {
    const all = new Set([...GLYPH_COVERAGE].map((c) => c.codePointAt(0)!));
    expect(missingCoverageGlyphs((cp) => all.has(cp))).toEqual([]);
  });

  it("boş font → tüm küme eksik", () => {
    const missing = missingCoverageGlyphs(() => false);
    expect(missing.length).toBe([...GLYPH_COVERAGE].length);
  });

  it("yalnız ASCII font → aksanlılar eksik, ASCII 'i' kapsanır", () => {
    const missing = missingCoverageGlyphs((cp) => cp < 128);
    expect(missing).toContain("ğ");
    expect(missing).toContain("İ");
    expect(missing).toContain("€");
    expect(missing).not.toContain("i"); // 'i' ASCII → eksik değil
  });

  it("kısmi eksik: yalnız İ/ğ yoksa yalnız onlar raporlanır", () => {
    const drop = new Set(["İ".codePointAt(0), "ğ".codePointAt(0)]);
    const missing = missingCoverageGlyphs((cp) => !drop.has(cp));
    expect(missing).toEqual(["ğ", "İ"]); // GLYPH_COVERAGE sırası: küçük ğ önce, sonra büyük İ
  });
});

describe("missingFontFamilies (fabrika font bekçisi, mimar #19c)", () => {
  const installed = [...REPO_FONT_FAMILIES, "Poppins"]; // repo ∪ bir custom

  it("kurulu aile eksik değil (büyük/küçük harf duyarsız)", () => {
    expect(missingFontFamilies(["Inter", "poppins", "ARCHIVO BLACK"], installed)).toEqual([]);
  });

  it("kurulu olmayan aile raporlanır, tekilleştirilir", () => {
    expect(missingFontFamilies(["Bebas Neue", "Inter", "bebas neue"], installed)).toEqual(["Bebas Neue"]);
  });

  it("boş/whitespace atlanır", () => {
    expect(missingFontFamilies(["  ", "Inter"], installed)).toEqual([]);
  });

  it("repo 6 ailesi tam", () => {
    expect(REPO_FONT_FAMILIES).toHaveLength(6);
    expect(REPO_FONT_FAMILIES).toContain("Pacifico");
  });
});
