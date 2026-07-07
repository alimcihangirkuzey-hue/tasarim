import { describe, expect, it } from "vitest";
import { relToMM, scaleRule } from "./ratio.js";

describe("relToMM (oransal layout)", () => {
  it("0-1 kutu sayfa mm'sine çevrilir", () => {
    expect(relToMM({ x: 0.1, y: 0.25, w: 0.8, h: 0.5 }, 2000, 800)).toEqual({
      x: 200, y: 200, w: 1600, h: 400,
    });
  });
  it("tam sayfa kutusu birebir", () => {
    expect(relToMM({ x: 0, y: 0, w: 1, h: 1 }, 1234, 567)).toEqual({ x: 0, y: 0, w: 1234, h: 567 });
  });
});

describe("scaleRule (1:10 kuralı)", () => {
  it("5000 mm sınırı: eşit → 1:1, üstü → 1:10 + damga", () => {
    expect(scaleRule(5000, 800)).toEqual({ scale: 1, stamp: null });
    expect(scaleRule(5001, 800)).toEqual({ scale: 10, stamp: "ÉCHELLE 1:10" });
    expect(scaleRule(800, 6000)).toEqual({ scale: 10, stamp: "ÉCHELLE 1:10" });
    expect(scaleRule(2000, 800)).toEqual({ scale: 1, stamp: null });
  });
});
