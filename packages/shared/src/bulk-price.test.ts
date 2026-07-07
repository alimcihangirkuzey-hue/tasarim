import { describe, expect, it } from "vitest";
import { CatalogSchema, type Catalog } from "./schemas.js";
import { applyBulkPrice, bulkPricePreview, bulkPriceReason } from "./bulk-price.js";

function makeCatalog(): Catalog {
  return CatalogSchema.parse({
    categories: [
      {
        id: "c1", name_fr: "Sandwichs", order: 1,
        items: [
          { id: "i1", name_fr: "Döner", order: 1, prices: [{ label: "seul", value: 8 }, { label: "menu", value: 10.5 }] },
          { id: "i2", name_fr: "Assiette", order: 2, visible: false, prices: [{ label: "seul", value: 7.37 }] },
        ],
      },
      {
        id: "c2", name_fr: "Boissons", order: 2,
        items: [{ id: "i3", name_fr: "Ayran", order: 1, prices: [{ label: "seul", value: 2 }] }],
      },
    ],
  });
}

describe("toplu fiyat motoru (FAZ4 §4)", () => {
  it("kabul 3 senaryosu: +%5 ve X,90 — 8,00→8,90 (eşitlik yukarı), 7,37→7,90, 10,50→10,90", () => {
    const { changes } = applyBulkPrice(makeCatalog(), {
      scope: "all", op: { kind: "percent", value: 5 }, rounding: "x90",
    });
    const by = (id: string, label: string) => changes.find((c) => c.itemId === id && c.label === label)!;
    /* 8,00 → 8,40 → aday 7,90|8,90 eşit → YUKARI 8,90 */
    expect(by("i1", "seul").after).toBe(8.9);
    /* 10,50 → 11,03 → 10,90 (0,13) vs 11,90 (0,87) → 10,90 */
    expect(by("i1", "menu").after).toBe(10.9);
    /* görünmez ürün de güncellenir: 7,37 → 7,74 → 7,90 */
    expect(by("i2", "seul").after).toBe(7.9);
    /* 2,00 → 2,10 → 1,90 (0,20) vs 2,90 (0,80) → 1,90 */
    expect(by("i3", "seul").after).toBe(1.9);
  });

  it("0,50 yuvarlama ve float güvenliği: 7,88 → 8,00 değil 7,90? hayır — 0,50 adımı 8,00", () => {
    const cat = CatalogSchema.parse({
      categories: [{ id: "c", name_fr: "X", items: [{ id: "i", name_fr: "Y", prices: [{ label: "seul", value: 7.5 }] }] }],
    });
    const { changes } = applyBulkPrice(cat, { scope: "all", op: { kind: "percent", value: 5 }, rounding: "r050" });
    /* 7,50×1,05 = 7,875 → kuruş 788 → 0,50 adımına 8,00 */
    expect(changes[0].after).toBe(8);
  });

  it("+sabit negatif (indirim) tabanı 0'ın altına düşmez; set + 0,10 yuvarlama", () => {
    const cat = makeCatalog();
    const { changes } = applyBulkPrice(cat, { scope: "all", op: { kind: "add", value: -3 }, rounding: "none" });
    const ayran = changes.find((c) => c.itemId === "i3")!;
    expect(ayran.after).toBe(0); /* 2 − 3 → 0 (clamp) */

    const set = applyBulkPrice(cat, { scope: "all", op: { kind: "set", value: 9.94 }, rounding: "r010" });
    expect(set.changes.every((c) => c.after === 9.9)).toBe(true);
  });

  it("kategori kapsamı yalnız o kategoriyi değiştirir; girdi katalog DEĞİŞMEZ", () => {
    const cat = makeCatalog();
    const { catalog: next, changes } = applyBulkPrice(cat, {
      scope: { categoryId: "c2" }, op: { kind: "add", value: 0.5 }, rounding: "none",
    });
    expect(changes.map((c) => c.itemId)).toEqual(["i3"]);
    expect(next.categories[1].items[0].prices[0].value).toBe(2.5);
    /* immutability */
    expect(cat.categories[1].items[0].prices[0].value).toBe(2);
    expect(cat.categories[0].items[0].prices[0].value).toBe(8);
  });

  it("önizleme = uygulama (aynı hesap); değişmeyenler listede yok", () => {
    const cat = makeCatalog();
    const op = { scope: "all" as const, op: { kind: "set" as const, value: 8 }, rounding: "none" as const };
    const preview = bulkPricePreview(cat, op);
    const { changes } = applyBulkPrice(cat, op);
    expect(preview).toEqual(changes);
    /* i1 seul zaten 8,00 → listede olmamalı */
    expect(preview.some((c) => c.itemId === "i1" && c.label === "seul")).toBe(false);
  });

  it("gerekçe metni deterministik", () => {
    const cat = makeCatalog();
    expect(bulkPriceReason({ scope: "all", op: { kind: "percent", value: 5 }, rounding: "x90" }, cat))
      .toBe("toplu fiyat: %+5 · X,90 · tümü");
    expect(bulkPriceReason({ scope: { categoryId: "c2" }, op: { kind: "add", value: 0.5 }, rounding: "none" }, cat))
      .toBe("toplu fiyat: +0.50 · yuvarlama yok · kategori: Boissons");
  });
});
