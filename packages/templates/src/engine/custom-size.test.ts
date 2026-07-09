import { describe, expect, it } from "vitest";
import { DocumentStateSchema } from "@tezgah/shared";
import type { TemplateManifest } from "../types.js";
import { customSizeMm, effectiveCustomSize, supportsCustomSize } from "./custom-size.js";

const doc = (params: Record<string, unknown>) =>
  DocumentStateSchema.parse({ template_id: "x", params });

const factoryManifest = {
  id: "arsiv-vitrin", type: "menu", name_tr: "Vitrin", bleed_mm: 3, safe_mm: 3,
  formats: { custom: { w_mm: 750, h_mm: 1900, label_tr: "Özel" } },
  defaultFormat: "custom", params: [], slots: [], themes: ["or-noir"],
} as unknown as TemplateManifest;

const builtinManifest = {
  id: "menu-liste-premium", type: "menu", name_tr: "Liste", bleed_mm: 3, safe_mm: 5,
  formats: { "a4-portrait": { w_mm: 210, h_mm: 297, label_tr: "A4" } },
  defaultFormat: "a4-portrait", params: [], slots: [], themes: ["or-noir"],
} as unknown as TemplateManifest;

describe("customSizeMm (#21 belge override, Zod-only)", () => {
  it("geçerli width/height mm → döner", () => {
    expect(customSizeMm(doc({ width_mm: 750, height_mm: 1900 }))).toEqual({ w_mm: 750, h_mm: 1900 });
  });
  it("sınır dışı / eksik → null", () => {
    expect(customSizeMm(doc({ width_mm: 20, height_mm: 1900 }))).toBeNull();
    expect(customSizeMm(doc({ width_mm: 750, height_mm: 4000 }))).toBeNull();
    expect(customSizeMm(doc({}))).toBeNull();
    expect(customSizeMm(doc({ width_mm: "abc", height_mm: 100 }))).toBeNull();
  });
  it("30 ve 3000 sınırları dahil", () => {
    expect(customSizeMm(doc({ width_mm: 30, height_mm: 3000 }))).toEqual({ w_mm: 30, h_mm: 3000 });
  });
});

describe("supportsCustomSize / effectiveCustomSize", () => {
  it("fabrika (custom-format) destekler; yerleşik desteklemez", () => {
    expect(supportsCustomSize(factoryManifest)).toBe(true);
    expect(supportsCustomSize(builtinManifest)).toBe(false);
  });
  it("fabrika: override yoksa manifest.custom, varsa override", () => {
    expect(effectiveCustomSize(factoryManifest, doc({}))).toEqual({ w_mm: 750, h_mm: 1900 });
    expect(effectiveCustomSize(factoryManifest, doc({ width_mm: 500, height_mm: 500 }))).toEqual({ w_mm: 500, h_mm: 500 });
  });
  it("yerleşik: her zaman null (custom ölçü almaz — M8)", () => {
    expect(effectiveCustomSize(builtinManifest, doc({ width_mm: 500, height_mm: 500 }))).toBeNull();
  });
});
