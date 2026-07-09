import { describe, expect, it } from "vitest";
import { analyzeSvg, deriveSizeMm, MAX_SVG_BYTES } from "./analyze.js";
import { sanitizeSvg } from "./sanitize.js";

/* InDesign/Illustrator benzeri fixture SVG'ler — FAZ6-GOREV §3, mimar #19 */

describe("deriveSizeMm — #19(a) türet-önce-sor", () => {
  it("fiziksel birimler mm'ye çevrilir (mm/cm/in/pt)", () => {
    expect(deriveSizeMm('<svg width="210mm" height="297mm" viewBox="0 0 210 297">')).toEqual({ w: 210, h: 297 });
    expect(deriveSizeMm('<svg width="21cm" height="29.7cm">')).toEqual({ w: 210, h: 297 });
    expect(deriveSizeMm('<svg width="8.5in" height="11in">')).toEqual({ w: 215.9, h: 279.4 });
    const pt = deriveSizeMm('<svg width="595.276pt" height="841.89pt">')!;
    expect(pt.w).toBeCloseTo(210, 0);
    expect(pt.h).toBeCloseTo(297, 0);
  });

  it("px / % / birimsiz → null (baskıda güvenilmez, kullanıcıya sorulur)", () => {
    expect(deriveSizeMm('<svg width="800px" height="600px" viewBox="0 0 800 600">')).toBeNull();
    expect(deriveSizeMm('<svg width="100%" height="100%">')).toBeNull();
    expect(deriveSizeMm('<svg width="800" height="600">')).toBeNull();
    expect(deriveSizeMm('<svg viewBox="0 0 800 600">')).toBeNull(); // yalnız viewBox
  });
});

describe("analyzeSvg — fixture aileleri (§3)", () => {
  it("yalnız-outline: canlı metin yok, path var → looksOutlined", () => {
    const svg = `<svg width="300mm" height="100mm" viewBox="0 0 300 100"><path d="M0 0 L10 10"/><path d="M5 5 L9 9"/></svg>`;
    const a = analyzeSvg(svg);
    expect(a.liveTextCount).toBe(0);
    expect(a.pathCount).toBe(2);
    expect(a.looksOutlined).toBe(true);
    expect(a.fonts).toEqual([]);
    expect(a.sizeMm).toEqual({ w: 300, h: 100 });
  });

  it("canlı metin + font: aile adları tespit edilir (yığının ilki, jenerik atlanır)", () => {
    const svg = `<svg width="210mm" height="297mm">
      <text style="font-family:'Bebas Neue', sans-serif">DÖNER</text>
      <text font-family="Custom Sans">7,50 €</text>
      <text style="font-family: Inter">note</text></svg>`;
    const a = analyzeSvg(svg);
    expect(a.liveTextCount).toBe(3);
    expect(a.looksOutlined).toBe(false);
    expect(a.fonts.sort()).toEqual(["Bebas Neue", "Custom Sans", "Inter"]);
  });

  it("gömülü raster (data:) sayılır, harici sayılmaz", () => {
    const svg = `<svg width="100mm" height="100mm"><image href="data:image/png;base64,iVBOR"/></svg>`;
    const a = analyzeSvg(svg);
    expect(a.embeddedRasterCount).toBe(1);
    expect(a.externalRasters).toEqual([]);
  });

  it("harici raster (http/file/göreli) eksik varlık olarak listelenir; yerel #ref sayılmaz", () => {
    const svg = `<svg width="100mm" height="100mm">
      <image xlink:href="http://cdn.x/a.png"/>
      <image href="file:///C:/foto.jpg"/>
      <image href="resimler/b.png"/>
      <rect fill="url(#grad1)"/></svg>`;
    const a = analyzeSvg(svg);
    expect(a.embeddedRasterCount).toBe(0);
    expect(a.externalRasters).toEqual(["http://cdn.x/a.png", "file:///C:/foto.jpg", "resimler/b.png"]);
  });

  it("ölçüsüz viewBox: sizeMm null ama viewBox okunur", () => {
    const svg = `<svg viewBox="0 0 800 600"><text style="font-family:Inter">x</text></svg>`;
    const a = analyzeSvg(svg);
    expect(a.sizeMm).toBeNull();
    expect(a.viewBox).toEqual({ x: 0, y: 0, w: 800, h: 600 });
  });

  it("script'li: sanitize temizler, sonra analiz temiz (script kalmaz)", () => {
    const dirty = `<svg width="210mm" height="297mm"><script>alert(1)</script><text style="font-family:Inter">Menü</text></svg>`;
    const clean = sanitizeSvg(dirty);
    expect(clean.removed).toContain("script bloğu");
    const a = analyzeSvg(clean.svg);
    expect(clean.svg).not.toMatch(/<script/i);
    expect(a.liveTextCount).toBe(1);
    expect(a.fonts).toEqual(["Inter"]);
  });

  it("25MB üstü → tooBig", () => {
    const big = `<svg width="100mm" height="100mm"><text>` + "a".repeat(MAX_SVG_BYTES + 10) + `</text></svg>`;
    const a = analyzeSvg(big);
    expect(a.tooBig).toBe(true);
  });
});
