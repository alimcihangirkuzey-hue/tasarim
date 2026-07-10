import { describe, expect, it } from "vitest";
import { CatalogSchema } from "./schemas.js";
import { applyCatalogImport, parseCatalogText, parsePrice } from "./catalog-import.js";

describe("parsePrice", () => {
  it("virgül/nokta/tam sayı ondalıkları + € eki", () => {
    expect(parsePrice("8,00")).toBe(8);
    expect(parsePrice("8.50")).toBe(8.5);
    expect(parsePrice("10")).toBe(10);
    expect(parsePrice("7,5 €")).toBe(7.5);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("bedava")).toBeNull();
  });
});

describe("parseCatalogText (FAZ5 §4)", () => {
  it("temiz metin: kategori + ürünler; aksan/TR korunur", () => {
    const p = parseCatalogText(
      [
        "KATEGORİ: Pizzas",
        "Pizza Margherita | 8,00 | Sauce tomate, mozzarella",
        "Pizza Döner | 11.00",
        "KATEGORİ: Boissons",
        "Ayran | 2",
      ].join("\n")
    );
    expect(p.catCount).toBe(2);
    expect(p.itemCount).toBe(3);
    expect(p.skipped).toHaveLength(0);
    expect(p.categories[0].name_fr).toBe("Pizzas");
    expect(p.categories[0].items[0]).toEqual({
      name_fr: "Pizza Margherita",
      value: 8,
      desc_fr: "Sauce tomate, mozzarella",
    });
    expect(p.categories[0].items[1].value).toBe(11);
    expect(p.categories[1].items[0].name_fr).toBe("Ayran");
  });

  it("K3: fiyatsız ürün ATLANMAZ (alınır + pending); yalnız kategorisiz/adsız gerçek skip", () => {
    const p = parseCatalogText(
      [
        "Kategori öncesi ürün | 5",   // kategori yok → gerçek skip
        "KATEGORİ: Test",
        "Fiyatsız ürün",               // fiyat yok → ALINIR + pending (K3)
        "Geçerli | 9,90",
        "| 4",                         // ad yok → gerçek skip
        "",                            // boş → sessizce geç (skip listesinde değil)
      ].join("\n")
    );
    expect(p.itemCount).toBe(2); // fiyatsız + geçerli, ikisi de alındı
    /* no-price ARTIK skip değil: yalnız kategorisiz + adsız gerçek skip */
    expect(p.skipped.map((s) => s.reason)).toEqual(["no-category", "empty-name"]);
    expect(p.skipped.map((s) => s.line)).toEqual([1, 5]);
    /* fiyatsız ürün SAYI değil KALEM listesi olarak pending (intake UI + operatör) */
    expect(p.pending).toEqual([{ name: "Fiyatsız ürün", category: "Test" }]);
    /* alınan fiyatsız ürünün value'su null (previewToCategories → prices:[]) */
    const test = p.categories.find((c) => c.name_fr === "Test")!;
    expect(test.items.find((i) => i.name_fr === "Fiyatsız ürün")!.value).toBeNull();
    expect(test.items.find((i) => i.name_fr === "Geçerli")!.value).toBe(9.9);
  });

  it("çeşitli KATEGORİ önekleri (TR/FR) tanınır", () => {
    const p = parseCatalogText("Catégorie: Desserts\nBaklava | 3,5");
    expect(p.catCount).toBe(1);
    expect(p.categories[0].name_fr).toBe("Desserts");
  });
});

describe("applyCatalogImport", () => {
  const base = CatalogSchema.parse({
    categories: [
      { id: "cat_x", name_fr: "Mevcut", order: 1, items: [
        { id: "it_x", name_fr: "Var Olan", order: 1, prices: [{ label: "seul", value: 5 }] },
      ] },
    ],
  });

  it("append: sona ekler, mevcut korunur, order yeniden numaralanır; girdi değişmez", () => {
    const p = parseCatalogText("KATEGORİ: Yeni\nÜrün A | 6");
    const next = applyCatalogImport(base, p, "append", "SEED");
    expect(next.categories.map((c) => c.name_fr)).toEqual(["Mevcut", "Yeni"]);
    expect(next.categories.map((c) => c.order)).toEqual([1, 2]);
    expect(next.categories[1].items[0]).toMatchObject({ name_fr: "Ürün A", prices: [{ label: "seul", value: 6 }] });
    /* immutability */
    expect(base.categories).toHaveLength(1);
  });

  it("replace: tümü değişir, footnote korunur; deterministik id (seed)", () => {
    const p = parseCatalogText("KATEGORİ: Tek\nX | 1");
    const a = applyCatalogImport(base, p, "replace", "SEED");
    const b = applyCatalogImport(base, p, "replace", "SEED");
    expect(a.categories.map((c) => c.name_fr)).toEqual(["Tek"]);
    expect(a.footnote_fr).toBe(base.footnote_fr);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // aynı seed → aynı çıktı
  });

  it("çıktı CatalogSchema'dan geçer (DB'ye yazılabilir)", () => {
    const p = parseCatalogText("KATEGORİ: Grill\nAdana | 14,50 | Agneau\nİskender | 16");
    const next = applyCatalogImport(base, p, "append", "SEED");
    expect(() => CatalogSchema.parse(next)).not.toThrow();
  });

  it("K3: içe aktarılan fiyatsız ürün prices:[] (fiyat-bekliyor); CatalogSchema geçer", () => {
    const p = parseCatalogText("KATEGORİ: Boissons\nAyran"); // fiyatsız satır
    expect(p.pending).toEqual([{ name: "Ayran", category: "Boissons" }]);
    const next = applyCatalogImport(base, p, "append", "SEED");
    const cat = next.categories.find((c) => c.name_fr === "Boissons")!;
    expect(cat.items[0].prices).toEqual([]); // boş fiyat → analiz empty-price verir
    expect(() => CatalogSchema.parse(next)).not.toThrow();
  });
});
