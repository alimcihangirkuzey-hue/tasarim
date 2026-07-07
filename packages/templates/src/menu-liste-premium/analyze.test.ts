import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeList } from "./analyze.js";

function makeClient(itemCount = 10, currency: "EUR" | "CHF" = "EUR"): ClientDTO {
  return {
    id: "cli_l",
    name: "Liste Test",
    slug: "liste-test",
    notes: "",
    currency,
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
});
