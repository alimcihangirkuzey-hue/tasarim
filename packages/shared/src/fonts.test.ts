import { describe, expect, it } from "vitest";
import { GLYPH_COVERAGE, missingCoverageGlyphs } from "./fonts.js";

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
