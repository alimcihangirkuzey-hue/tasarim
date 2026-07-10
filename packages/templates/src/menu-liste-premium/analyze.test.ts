import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeList, listMetrics } from "./analyze.js";

function makeClient(itemCount = 10, currency: "EUR" | "CHF" = "EUR"): ClientDTO {
  return {
    id: "cli_l",
    name: "Liste Test",
    slug: "liste-test",
    notes: "",
    currency,
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "cat_s",
          name_fr: "Sandwichs",
          order: 1,
          items: Array.from({ length: itemCount }, (_, i) => ({
            id: `s${i}`,
            name_fr: `Sandwich ${i}`,
            desc_fr: "Crudités, sauce au choix",
            order: i,
            prices: [
              { label: "seul", value: 7.5 },
              { label: "menu", value: 10 },
            ],
          })),
        },
        {
          id: "cat_p",
          name_fr: "Pizzas",
          order: 2,
          items: [
            { id: "p0", name_fr: "Margherita", order: 0, prices: [{ label: "seul", value: 9 }] },
          ],
        },
      ],
    }),
    assets: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "menu-liste-premium", params });

describe("analyzeList", () => {
  it("az içerik tek sayfaya büyük fontla sığar (shrink gerekmez)", () => {
    const a = analyzeList(makeClient(6), doc());
    expect(a.pages).toHaveLength(1);
    expect(a.nameFont).toBe(4.4); // max
  });

  it("çok içerik: önce shrink, min fontta da sığmazsa flow (M8)", () => {
    const a = analyzeList(makeClient(60), doc());
    expect(a.nameFont).toBe(3.2); // min'e inmiş
    expect(a.pages.length).toBeGreaterThan(1); // devam sayfasına akmış
    /* sessiz kırpma yok: tüm satırlar sayfalara dağılmış olmalı */
    const total = a.pages.flatMap((p) => p.columns.flat()).length;
    expect(total).toBe(63); // 60 sandviç + 1 pizza + 2 kategori
  });

  it("columns düzeni: kolon başlıkları ilk ürünün etiketlerinden", () => {
    const a = analyzeList(makeClient(4), doc({ priceLayout: "columns" }));
    const cat = a.pages[0].columns[0].find((r) => r.row.kind === "category");
    expect(cat && cat.row.kind === "category" ? cat.row.colHeaders : []).toEqual(["seul", "menu"]);
  });

  it("karışık varyantlı kategori columns düzeninde uyarı üretir", () => {
    const client = makeClient(3);
    client.catalog.categories[0].items[1].prices = [{ label: "XL", value: 12 }];
    const a = analyzeList(client, doc({ priceLayout: "columns" }));
    expect(a.warnings.some((w) => w.type === "mixed-variants")).toBe(true);
  });

  it("CHF: fiyat metinleri sembolsüz", () => {
    const a = analyzeList(makeClient(3, "CHF"), doc());
    const item = a.pages[0].columns[0].find((r) => r.row.kind === "item");
    expect(item && item.row.kind === "item" ? item.row.priceTexts[0] : "").toBe("7.50 / 10.00");
  });

  it("a3-portrait varsayılanı 2 sütun; sütun genişliği deterministik", () => {
    const a = analyzeList(makeClient(6), doc({ format: "a3-portrait" }));
    expect(a.columns).toBe(2);
    expect(a.colW).toBeCloseTo((277 - 8) / 2, 4);
  });

  /* ---- FAZ5 §3: 3 sütunlu yoğun (compact) varyant (mimar #14) ---- */

  it("listMetrics: cols=3 yoğun set (font tavanı düşük, dar aralık, tek satır desc, kısa dots)", () => {
    const compact = listMetrics(3, 4.4, 2);
    const normal = listMetrics(2, 4.4, 2);
    expect(compact.compact).toBe(true);
    expect(compact.nameMaxFont).toBeLessThan(normal.nameMaxFont); // bir kademe düşük
    expect(compact.nameLineH).toBeLessThan(normal.nameLineH); // satır aralığı sıkı
    expect(compact.descMaxLines).toBe(1); // açıklama tek satır
    expect(compact.dotsMaxLen).toBeLessThan(normal.dotsMaxLen); // dots kısa
    expect(normal.compact).toBe(false);
  });

  it("cols=3 a4-portrait: sütun genişliği + compact metrikler + font compact tavanı aşmaz", () => {
    const a = analyzeList(makeClient(74), doc({ columns: 3 })); // 75 ürünlük gerçek boyut
    expect(a.columns).toBe(3);
    expect(a.metrics.compact).toBe(true);
    expect(a.colW).toBeCloseTo((190 - 2 * 8) / 3, 4); // içerik 190mm, 2 gap
    expect(a.nameFont).toBeLessThanOrEqual(3.6); // compact tavan aşılmaz
    /* yoğun mod 75 ürünü üç sütuna dağıtır (kırpma yok) */
    const total = a.pages.flatMap((p) => p.columns.flat()).length;
    expect(total).toBe(77); // 75 ürün + 2 kategori
    expect(a.pages[0].columns.length).toBe(3); // üç sütun da kullanıldı
  });

  it("cols=3 yoğunluk kazancı: 75 ürün 3 sütunda daha büyük fontla ve ≤ sayfada sığar", () => {
    const three = analyzeList(makeClient(74), doc({ columns: 3 }));
    const two = analyzeList(makeClient(74), doc({ columns: 2 }));
    /* 3 sütun compact: ≤ 2 sütunun sayfa sayısı */
    expect(three.pages.length).toBeLessThanOrEqual(two.pages.length);
    /* yoğunluk kazancı: 3 sütun fontu compact tavanında (3.6) tutar,
       2 sütun aynı içeriği sığdırmak için tabana (3.2) iner */
    expect(three.nameFont).toBeGreaterThan(two.nameFont);
  });

  it("cols=3: min-font tabanına dayanırsa M8 uyarısı + akış (sessiz kırpma yok)", () => {
    const a = analyzeList(makeClient(200), doc({ columns: 3 })); // taban aşımı zorlanır
    expect(a.nameFont).toBe(3.2); // okunabilirlik tabanı (min)
    expect(a.pages.length).toBeGreaterThan(1); // taşan sayfaya aktı
    expect(a.warnings.some((w) => w.type === "min-font" && w.slotId === "name")).toBe(true);
    const total = a.pages.flatMap((p) => p.columns.flat()).length;
    expect(total).toBe(203); // 201 ürün + 2 kategori, hepsi yerleşti
  });

  it("cols=2 normalde min-font uyarısı ÇIKMAZ (yalnız compact modda)", () => {
    const a = analyzeList(makeClient(200), doc({ columns: 2 }));
    expect(a.warnings.some((w) => w.type === "min-font")).toBe(false);
  });
});
