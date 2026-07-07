import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeGrid } from "./analyze.js";

function makeClient(overrides: Partial<ClientDTO> = {}): ClientDTO {
  return {
    id: "cli_test",
    name: "Test Kebab",
    slug: "test-kebab",
    notes: "",
    currency: "EUR",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "cat_s",
          name_fr: "Sandwichs",
          note_fr: "Pain au choix",
          order: 1,
          items: Array.from({ length: 8 }, (_, i) => ({
            id: `it${i + 1}`,
            name_fr: `Döner Spécial ${i + 1}`,
            desc_fr: "Veau ou dinde, crudités, sauce au choix",
            order: i + 1,
            prices: [
              { label: "seul", value: 7.5 },
              { label: "menu", value: 10 },
            ],
          })),
        },
      ],
    }),
    assets: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const baseDoc = () =>
  DocumentStateSchema.parse({ template_id: "menu-grid-cells" });

describe("analyzeGrid", () => {
  it("varsayılan a4-portrait cols=3: deterministik yerleşim + logo uyarısı", () => {
    const a = analyzeGrid(makeClient(), baseDoc());
    expect(a.format).toBe("a4-portrait");
    expect(a.cols).toBe(3);
    expect(a.pages).toBe(1);
    const cellCount = a.layout.placed.filter((p) => p.kind === "cell").length;
    expect(cellCount + a.layout.overflow.length).toBe(8);
    expect(a.warnings.some((w) => w.type === "empty-required" && w.slotId === "logo")).toBe(true);
    /* aynı girdi → aynı çıktı */
    const b = analyzeGrid(makeClient(), baseDoc());
    expect(JSON.stringify([...b.cells.keys()])).toBe(JSON.stringify([...a.cells.keys()]));
  });

  it("kapasite üstü seçim overflow-items uyarısı üretir (kabul §7/6)", () => {
    const client = makeClient();
    /* 24 ürün: a4-portrait 3 kolonda kesin taşar */
    client.catalog.categories[0].items = Array.from({ length: 24 }, (_, i) => ({
      id: `x${i}`,
      name_fr: `Ürün ${i}`,
      desc_fr: "",
      photo: null,
      prices: [{ label: "seul", value: 5 }],
      tags: [],
      visible: true,
      order: i,
    }));
    const a = analyzeGrid(client, baseDoc());
    const warn = a.warnings.find((w) => w.type === "overflow-items");
    expect(warn).toBeDefined();
    expect(a.layout.overflow.length).toBeGreaterThan(0);
  });

  it("CHF müşteride fiyatlar nokta ondalıklı ve sembolsüz (kabul §7/4)", () => {
    const a = analyzeGrid(makeClient({ currency: "CHF" }), baseDoc());
    const first = [...a.cells.values()][0];
    expect(first.prices.map((p) => p.text).join(" ")).toContain("7.50");
    expect(first.prices.map((p) => p.text).join(" ")).not.toContain("€");
  });

  it("EUR müşteride FR biçimi (7,50 €) ve çift varyant çifti", () => {
    const a = analyzeGrid(makeClient(), baseDoc());
    const first = [...a.cells.values()][0];
    const joined = first.prices.map((p) => p.text).join(" | ");
    expect(joined).toContain("seul 7,50 €");
    expect(joined).toContain("menu 10,00 €");
  });

  it("multipage akışı (FAZ4 §8): 80 ürün uyarısız N sayfaya dağılır; her ürün tam bir kez", () => {
    const client = makeClient();
    client.catalog.categories = [1, 2, 3].map((c) => ({
      id: `cat${c}`,
      name_fr: `Catégorie ${c}`,
      note_fr: undefined,
      order: c,
      items: Array.from({ length: c === 3 ? 28 : 26 }, (_, i) => ({
        id: `c${c}i${i}`,
        name_fr: `Produit ${c}-${i}`,
        desc_fr: "",
        photo: null,
        prices: [{ label: "seul", value: 6 }],
        tags: [],
        visible: true,
        order: i,
      })),
    })); // toplam 80 ürün
    const doc = DocumentStateSchema.parse({
      template_id: "menu-grid-cells",
      params: { flow: "multipage" },
    });

    const p0 = analyzeGrid(client, doc, 0);
    expect(p0.pages).toBeGreaterThan(1);
    expect(p0.warnings.some((w) => w.type === "overflow-items")).toBe(false);
    expect(p0.contBand).toBeNull();

    /* tüm sayfalardaki hücreler: 80 ürün, tam bir kez */
    const seen: string[] = [];
    for (let i = 0; i < p0.pages; i++) {
      const pi = analyzeGrid(client, doc, i);
      for (const pl of pi.layout.placed) if (pl.kind === "cell") seen.push(pl.item.id);
      if (i > 0) {
        expect(pi.contBand).not.toBeNull();
        expect(pi.contBand!.pageLabel).toBe(`Page ${i + 1}/${p0.pages}`);
        /* devam sayfası içerik alanı daha yüksek (ince bant) */
        expect(pi.geo.content.h).toBeGreaterThan(p0.geo.content.h);
      }
    }
    expect(seen).toHaveLength(80);
    expect(new Set(seen).size).toBe(80);

    /* aynı seçim single modda uyarı verir (davranış korunur) */
    const single = analyzeGrid(client, DocumentStateSchema.parse({ template_id: "menu-grid-cells" }));
    expect(single.pages).toBe(1);
    expect(single.warnings.some((w) => w.type === "overflow-items")).toBe(true);
  });

  it("format param geçerliyse uygulanır, geçersizse varsayılana düşer", () => {
    const doc = DocumentStateSchema.parse({
      template_id: "menu-grid-cells",
      params: { format: "a4-landscape" },
    });
    expect(analyzeGrid(makeClient(), doc).cols).toBe(4); // landscape default
    const bad = DocumentStateSchema.parse({
      template_id: "menu-grid-cells",
      params: { format: "yok-boyle-format", cols: 99 },
    });
    const a = analyzeGrid(makeClient(), bad);
    expect(a.format).toBe("a4-portrait");
    expect(a.cols).toBe(3);
  });
});
