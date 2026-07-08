import { describe, expect, it } from "vitest";
import {
  SelectionSchema,
  setCategoryItemOrder,
  setCategoryOrder,
  swapSelectionItem,
} from "./schemas.js";

describe("swapSelectionItem (FAZ5 §5)", () => {
  it("aynı kategoride eski→yeni, sıra korunur, eski excluded'a, yeni excluded'dan çıkar", () => {
    const sel = SelectionSchema.parse({ excluded_items: ["D"] });
    const next = swapSelectionItem(sel, "cat", "B", "D", ["A", "B", "C"]);
    expect(next.item_order.cat).toEqual(["A", "D", "C"]); // D, B'nin yerinde
    expect(next.excluded_items).toContain("B"); // eski dışlandı
    expect(next.excluded_items).not.toContain("D"); // yeni geri geldi
  });

  it("tekrar eklenmez: yeni id zaten gösteriliyorsa çift çıkmaz", () => {
    const sel = SelectionSchema.parse({});
    const next = swapSelectionItem(sel, "cat", "A", "C", ["A", "B", "C"]);
    /* A→C: [C, B, C] → dedup → [C, B] */
    expect(next.item_order.cat).toEqual(["C", "B"]);
    expect(next.item_order.cat.filter((x) => x === "C")).toHaveLength(1);
  });

  it("saf: girdi selection değişmez; override anahtarları (excluded dışı) korunur", () => {
    const sel = SelectionSchema.parse({ excluded_items: ["X"], item_order: { other: ["z"] } });
    const snapshot = JSON.stringify(sel);
    const next = swapSelectionItem(sel, "cat", "B", "D", ["A", "B"]);
    expect(JSON.stringify(sel)).toBe(snapshot); // immutable
    expect(next.item_order.other).toEqual(["z"]); // başka kategori dokunulmadı
    expect(next.excluded_items).toContain("X"); // mevcut dışlama korundu
  });
});

describe("setCategoryItemOrder / setCategoryOrder (FAZ5 §6)", () => {
  it("kategori içi ürün sırasını yazar (saf)", () => {
    const sel = SelectionSchema.parse({});
    const next = setCategoryItemOrder(sel, "cat", ["c", "a", "b"]);
    expect(next.item_order.cat).toEqual(["c", "a", "b"]);
    expect(sel.item_order.cat).toBeUndefined(); // immutable
  });

  it("kategori sırasını yazar (saf)", () => {
    const sel = SelectionSchema.parse({ category_order: ["a", "b"] });
    const next = setCategoryOrder(sel, ["b", "a"]);
    expect(next.category_order).toEqual(["b", "a"]);
    expect(sel.category_order).toEqual(["a", "b"]); // immutable
  });
});
