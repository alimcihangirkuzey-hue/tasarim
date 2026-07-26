/* seed.ts — determinizm + kapalı küme testleri (Canonical 4.4 / 4.1) */

import { describe, expect, it } from "vitest";
import { seededUnit, seededVariant } from "./seed.js";

describe("seededUnit — deterministik birim sayı", () => {
  it("aynı tohum + aynı tuz = AYNI sayı (tekrar üretilebilirlik, 4.4)", () => {
    for (const seed of [0, 1, 7, 42, 9999]) {
      expect(seededUnit(seed, "x")).toBe(seededUnit(seed, "x"));
    }
  });

  it("[0,1) aralığında kalır (geniş tarama)", () => {
    for (let s = 0; s < 500; s++) {
      const u = seededUnit(s, "aralik");
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("farklı tohumlar farklı sayılar üretir (tarama: en az %90 benzersiz)", () => {
    const seen = new Set<number>();
    for (let s = 0; s < 100; s++) seen.add(seededUnit(s, "cesitlilik"));
    expect(seen.size).toBeGreaterThan(90);
  });

  it("tuz kararları AYRIŞTIRIR: aynı tohum, farklı tuz → bağımsız sayılar", () => {
    const a = Array.from({ length: 50 }, (_, s) => seededUnit(s, "karar-a"));
    const b = Array.from({ length: 50 }, (_, s) => seededUnit(s, "karar-b"));
    expect(a).not.toEqual(b);
  });
});

describe("seededVariant — kapalı kümeden kontrollü seçim", () => {
  const KUME = ["a", "b", "c", "d", "e"] as const;

  it("her tohum kümenin İÇİNDEN seçer, asla dışına çıkmaz (rastgelelik değil)", () => {
    for (let s = 0; s < 200; s++) {
      expect(KUME).toContain(seededVariant(s, KUME, "t"));
    }
  });

  it("deterministik: aynı tohum aynı varyant", () => {
    for (let s = 0; s < 20; s++) {
      expect(seededVariant(s, KUME, "t")).toBe(seededVariant(s, KUME, "t"));
    }
  });

  it("küme dağılımı ölü değil: 200 tohumda 5 varyantın 5'i de seçiliyor", () => {
    const secilen = new Set<string>();
    for (let s = 0; s < 200; s++) secilen.add(seededVariant(s, KUME, "t"));
    expect([...secilen].sort()).toEqual([...KUME].sort());
  });

  it("boş küme fail-loud", () => {
    expect(() => seededVariant(1, [], "t")).toThrow(/boş varyant kümesi/);
  });
});
