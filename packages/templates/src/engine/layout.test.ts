import { describe, expect, it } from "vitest";
import { CatalogSchema } from "@tezgah/shared";
import type { FlowEntry } from "./binding.js";
import {
  checkDpi,
  estimateWidth,
  flowColumns,
  layoutGrid,
  solveFontScale,
  wrapText,
  type FlowBlock,
  type GridSpec,
} from "./layout.js";

/* ---- yardımcı test verisi ---- */
const catalog = CatalogSchema.parse({
  categories: [
    {
      id: "cat_a",
      name_fr: "Sandwichs",
      order: 1,
      items: Array.from({ length: 9 }, (_, i) => ({
        id: `a${i + 1}`,
        name_fr: `Ürün ${i + 1}`,
        order: i + 1,
      })),
    },
    {
      id: "cat_b",
      name_fr: "Pizzas",
      order: 2,
      items: [
        { id: "b1", name_fr: "Margherita", order: 1 },
        { id: "b2", name_fr: "Regina", order: 2 },
      ],
    },
  ],
});
const [catA, catB] = catalog.categories;

function flowOf(...parts: Array<["cat", number] | ["items", number, number]>): FlowEntry[] {
  const out: FlowEntry[] = [];
  for (const p of parts) {
    if (p[0] === "cat") {
      const c = p[1] === 0 ? catA : catB;
      out.push({ kind: "category", category: c });
    } else {
      const c = p[1] === 0 ? catA : catB;
      for (let i = 0; i < p[2]; i++) out.push({ kind: "item", item: c.items[i], category: c });
    }
  }
  return out;
}

describe("estimateWidth / wrapText", () => {
  it("uzunlukla monoton artar; büyük harf daha geniştir", () => {
    expect(estimateWidth("dönerr", 4, 0.5)).toBeGreaterThan(estimateWidth("döner", 4, 0.5));
    expect(estimateWidth("DÖNER", 4, 0.5)).toBeGreaterThan(estimateWidth("döner", 4, 0.5));
  });

  it("geniş kutuda tek satır, dar kutuda kelimeden sarar", () => {
    const wide = wrapText("Döner Kebab", { font_mm: 4, ratio: 0.5, maxWidth_mm: 60, maxLines: 2 });
    expect(wide).toEqual({ lines: ["Döner Kebab"], truncated: false });

    const narrow = wrapText("Döner Kebab", { font_mm: 4, ratio: 0.5, maxWidth_mm: 14, maxLines: 2 });
    expect(narrow.lines).toEqual(["Döner", "Kebab"]);
    expect(narrow.truncated).toBe(false);
  });

  it("satıra sığmayan tek kelime karakterden bölünür", () => {
    const out = wrapText("Kuzukulağılıoğulları", {
      font_mm: 4,
      ratio: 0.5,
      maxWidth_mm: 12,
      maxLines: 6,
    });
    expect(out.lines.length).toBeGreaterThan(1);
    expect(out.lines.join("")).toBe("Kuzukulağılıoğulları".replace("ğıl", "ğıl")); // birleşim kayıpsız
  });

  it("maxLines aşımı truncated bayrağı üretir (sessiz kırpma yok, M8)", () => {
    const out = wrapText("Veau ou dinde crudités sauce au choix supplément fromage", {
      font_mm: 3,
      ratio: 0.5,
      maxWidth_mm: 20,
      maxLines: 2,
    });
    expect(out.truncated).toBe(true);
    expect(out.lines).toHaveLength(2);
  });
});

describe("solveFontScale", () => {
  it("max'ta sığıyorsa max döner", () => {
    expect(solveFontScale({ min: 3.2, max: 4.6, fits: () => true })).toEqual({
      font_mm: 4.6,
      fits: true,
    });
  });

  it("aralıkta ilk sığan boyu bulur (0.2 adım, deterministik)", () => {
    const out = solveFontScale({ min: 3.2, max: 4.6, fits: (f) => f <= 3.6 });
    expect(out).toEqual({ font_mm: 3.6, fits: true });
  });

  it("hiçbiri sığmazsa min + fits:false (çağıran flow/warn uygular)", () => {
    const out = solveFontScale({ min: 2.4, max: 3.2, fits: () => false });
    expect(out).toEqual({ font_mm: 2.4, fits: false });
  });
});

describe("layoutGrid — shrink-then-warn geometrisi (M8, kabul §7/6)", () => {
  const spec: GridSpec = {
    cols: 3,
    availW_mm: 190,
    availH_mm: 200,
    gap_mm: 4,
    rowH_mm: 60,
    catH_mm: 12,
  };

  it("kategori şeridi + hücre akışı; sığmayanlar overflow'a sayılır", () => {
    /* catA + 5 ürün → şerit(12) + satır1(y16) + satır2(y80) → y=144
       catB: 144+12+4+60=220 > 200 → catB ve 2 ürünü taşar */
    const layout = layoutGrid(flowOf(["cat", 0], ["items", 0, 5], ["cat", 1], ["items", 1, 2]), spec);
    const cells = layout.placed.filter((p) => p.kind === "cell");
    const cats = layout.placed.filter((p) => p.kind === "category");
    expect(cats).toHaveLength(1);
    expect(cells).toHaveLength(5);
    expect(layout.overflow).toHaveLength(2);
    expect(layout.cellW_mm).toBeCloseTo((190 - 2 * 4) / 3, 5);
  });

  it("hücre koordinatları deterministik: kolon x, satır y", () => {
    const layout = layoutGrid(flowOf(["cat", 0], ["items", 0, 5]), spec);
    const cells = layout.placed.filter((p) => p.kind === "cell");
    expect(cells[0]).toMatchObject({ x: 0, y: 16 });
    expect(cells[1].x).toBeCloseTo(64.666, 2);
    expect(cells[3]).toMatchObject({ x: 0, y: 80 }); // ikinci satır başı
  });

  it("kapasite dolunca kalan ürünler taşar (9 hücre → 3 taşma)", () => {
    /* şeritsiz akış: 3 satır × 3 kolon = 9 sığar (y=0,64,128; 128+60=188 ≤ 200) */
    const items: FlowEntry[] = catA.items.map((it) => ({ kind: "item", item: it, category: catA }));
    const twelve = [...items, ...catB.items.map((it): FlowEntry => ({ kind: "item", item: it, category: catB })), { kind: "item", item: catA.items[0], category: catA } as FlowEntry];
    const layout = layoutGrid(twelve, spec);
    expect(layout.placed.filter((p) => p.kind === "cell")).toHaveLength(9);
    expect(layout.overflow).toHaveLength(3);
  });

  it("asılı başlık bırakılmaz: şeritten sonra satır sığmıyorsa şerit de taşar", () => {
    const tight: GridSpec = { ...spec, availH_mm: 70 }; /* 12+4+60=76 > 70 */
    const layout = layoutGrid(flowOf(["cat", 0], ["items", 0, 3]), tight);
    expect(layout.placed).toHaveLength(0);
    expect(layout.overflow).toHaveLength(3);
  });
});

describe("flowColumns — shrink-then-flow akışı", () => {
  const blk = (kind: "category" | "item", h: number): FlowBlock =>
    kind === "category"
      ? { entry: { kind: "category", category: catA }, h_mm: h }
      : { entry: { kind: "item", item: catA.items[0], category: catA }, h_mm: h };

  it("sütunları doldurur, sayfaya böler (7×30mm, 100mm sütun, 2 sütun/sayfa)", () => {
    const out = flowColumns(Array.from({ length: 7 }, () => blk("item", 30)), 100, 2);
    expect(out.pages).toHaveLength(2);
    expect(out.pages[0][0]).toHaveLength(3);
    expect(out.pages[0][1]).toHaveLength(3);
    expect(out.pages[1][0]).toHaveLength(1);
  });

  it("kategori bloğu sütun sonunda asılı kalmaz (keep-with-next)", () => {
    const out = flowColumns(
      [blk("item", 30), blk("item", 30), blk("item", 30), blk("category", 10), blk("item", 30)],
      100,
      2
    );
    /* cat 90mm kullanılmış sütuna sığardı (100) ama sonraki 30 ile birlikte sığmaz → ikisi de 2. sütuna */
    expect(out.pages[0][0]).toHaveLength(3);
    expect(out.pages[0][1].map((b) => b.entry.kind)).toEqual(["category", "item"]);
  });

  it("sütundan uzun blok taze sütunda tek başına durur (sonsuz döngü yok)", () => {
    const out = flowColumns([blk("item", 30), blk("item", 150), blk("item", 30)], 100, 2);
    expect(out.pages[0][0].map((b) => b.h_mm)).toEqual([30]);
    expect(out.pages[0][1].map((b) => b.h_mm)).toEqual([150]);
    expect(out.pages[1][0].map((b) => b.h_mm)).toEqual([30]);
  });

  it("boş girişte tek boş sayfa döner", () => {
    expect(flowColumns([], 100, 2).pages).toEqual([[[]]]);
  });
});

describe("checkDpi (CONSTITUTION §9.2)", () => {
  it("300 dpi hedefi: ok / yellow / red eşikleri", () => {
    expect(checkDpi(800, 600, 67.7, 50.8).level).toBe("ok"); // ~300 dpi
    expect(checkDpi(400, 300, 67.7, 50.8)).toMatchObject({ level: "yellow" }); // ~150 dpi sınırda
    expect(checkDpi(300, 200, 67.7, 50.8).level).toBe("red");
    expect(checkDpi(0, 0, 10, 10).level).toBe("red");
  });
});
