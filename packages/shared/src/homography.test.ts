import { describe, expect, it } from "vitest";
import { mapPoint, quadTransform, validateQuad } from "./homography.js";
import type { Quad } from "./schemas.js";

const rectQuad = (x: number, y: number, w: number, h: number): Quad => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

function expectCorners(m: number[], srcW: number, srcH: number, quad: Quad) {
  const src = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ];
  src.forEach((p, i) => {
    const out = mapPoint(m, p.x, p.y);
    expect(out.x).toBeCloseTo(quad[i].x, 4);
    expect(out.y).toBeCloseTo(quad[i].y, 4);
  });
}

describe("quadTransform (FAZ3-GOREV §3.1)", () => {
  it("kimlik: kaynak dikdörtgen kendine gider, matris birim", () => {
    const q = rectQuad(0, 0, 200, 100);
    const { matrix3d } = quadTransform(200, 100, q);
    expectCorners(matrix3d, 200, 100, q);
    expect(matrix3d[0]).toBeCloseTo(1, 6); // m11
    expect(matrix3d[5]).toBeCloseTo(1, 6); // m22
    expect(matrix3d[3]).toBeCloseTo(0, 6); // perspektif yok
    expect(matrix3d[7]).toBeCloseTo(0, 6);
  });

  it("öteleme + ölçek (affine): perspektif terimleri sıfır, köşeler eşleşir", () => {
    const q = rectQuad(50, 30, 400, 240);
    const { matrix3d, css } = quadTransform(200, 120, q);
    expectCorners(matrix3d, 200, 120, q);
    expect(matrix3d[3]).toBe(0);
    expect(matrix3d[7]).toBe(0);
    expect(css.startsWith("matrix3d(")).toBe(true);
  });

  it("perspektif (yamuk): dört köşe birebir eşleşir, perspektif terimi sıfırdan farklı", () => {
    const q: Quad = [
      { x: 100, y: 80 },
      { x: 520, y: 120 },
      { x: 480, y: 400 },
      { x: 140, y: 360 },
    ];
    const { matrix3d } = quadTransform(300, 200, q);
    expectCorners(matrix3d, 300, 200, q);
    expect(Math.abs(matrix3d[3]) + Math.abs(matrix3d[7])).toBeGreaterThan(0);
    /* orta nokta da quad içinde kalmalı (projektif tutarlılık) */
    const mid = mapPoint(matrix3d, 150, 100);
    expect(mid.x).toBeGreaterThan(100);
    expect(mid.x).toBeLessThan(520);
  });

  it("deterministik: aynı girdi aynı css", () => {
    const q = rectQuad(10, 10, 100, 50);
    expect(quadTransform(80, 40, q).css).toBe(quadTransform(80, 40, q).css);
  });

  it("kendini kesen quad (papyon) hata fırlatır", () => {
    const bowtie: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },   // BR ile BL yer değişmiş
      { x: 100, y: 100 },
    ];
    expect(() => quadTransform(100, 100, bowtie)).toThrow(/kendini kesiyor/);
  });

  it("dejenere (doğrusal) quad hata fırlatır; geçersiz kaynak boyutu hata", () => {
    const line: Quad = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
      { x: 150, y: 150 },
    ];
    expect(() => validateQuad(line)).toThrow(/dejenere/);
    expect(() => quadTransform(0, 100, rectQuad(0, 0, 10, 10))).toThrow(/kaynak/);
  });
});
