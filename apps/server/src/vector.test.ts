/* text→path birim testleri — mimar kararı #7 (fontkit) */

import { describe, expect, it } from "vitest";
import { injectPaths, runToPath, type TextRun } from "./vector.js";

const baseRun: TextRun = {
  id: 0,
  text: "KEBAB 7,50 €",
  x: 100,
  y: 50,
  size: 8,
  family: '"Oswald", "Inter", sans-serif',
  weight: 700,
  anchor: "start",
  fill: "#101010",
  letterSpacing: 0,
  ctm: [1, 0, 0, 1, 0, 0],
};

describe("runToPath (fontkit)", () => {
  it("glif path'leri üretir; deterministik", () => {
    const a = runToPath(baseRun);
    const b = runToPath(baseRun);
    expect(a).toBe(b);
    expect(a).toContain("<path d=");
    expect(a).not.toContain("<text");
    expect((a.match(/<path /g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it("anchor=end/middle başlangıcı sola kaydırır", () => {
    const start = runToPath({ ...baseRun, anchor: "start" });
    const end = runToPath({ ...baseRun, anchor: "end" });
    const tx = (s: string) => Number(/translate\((-?[\d.]+),/.exec(s)![1]);
    expect(tx(end)).toBeLessThan(tx(start));
    const mid = runToPath({ ...baseRun, anchor: "middle" });
    expect(tx(mid)).toBeGreaterThan(tx(end));
    expect(tx(mid)).toBeLessThan(tx(start));
  });

  it("letterSpacing toplam genişliği büyütür (son glif ilerlemesi)", () => {
    const tight = runToPath({ ...baseRun, anchor: "end" });
    const loose = runToPath({ ...baseRun, anchor: "end", letterSpacing: 1 });
    const tx = (s: string) => Number(/translate\((-?[\d.]+),/.exec(s)![1]);
    expect(tx(loose)).toBeLessThan(tx(tight)); // daha geniş → end offset daha negatif
  });

  it("yerel matris çıktı grubuna aynen taşınır", () => {
    const rotated = runToPath({ ...baseRun, ctm: [-1, 0, 0, 1, 2000, 0] });
    expect(rotated).toContain("matrix(-1,0,0,1,2000,0)");
    /* olağan durum: birim matris (ata dönüşümleri DOM konumundan gelir) */
    const plain = runToPath(baseRun);
    expect(plain).toContain("matrix(1,0,0,1,0,0)");
  });

  it("bilinmeyen font ailesi Inter'e düşer (çökmek yok)", () => {
    const out = runToPath({ ...baseRun, family: "Comic Sans MS" });
    expect(out).toContain("<path d=");
  });
});

describe("injectPaths", () => {
  it("yer tutucuları doldurur; <text> kalırsa hata fırlatır", () => {
    const svg = `<svg><path data-tpid="0"/></svg>`;
    const out = injectPaths(svg, [baseRun]);
    expect(out).toContain("matrix(1,0,0,1,0,0)");
    expect(() => injectPaths(`<svg><text>k</text></svg>`, [])).toThrow(/<text>/);
  });
});
