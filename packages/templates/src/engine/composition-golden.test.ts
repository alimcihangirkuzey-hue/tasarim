/* ALTIN KAYIT REGRESYON TESTİ — Dynamic Composition Engine çıkarımı.

   `composition-golden.json`, motor çıkarılmadan ÖNCE mevcut analyzeList /
   analyzeFlyer çıktısından üretilmiş yapısal parmak izidir (sayfa · sütun ·
   blok sırası · y konumları · font · uyarılar). Bu test refactor'ün görsel
   yerleşimi DEĞİŞTİRMEDİĞİNİ kanıtlar. Bilinçli bir yerleşim değişikliği
   yapılırsa altın kayıt GT kanıtıyla birlikte güncellenir — sessizce değil. */

import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/composition-golden.json";
import { analyzeList } from "../menu-liste-premium/analyze.js";
import { analyzeFlyer } from "../flyer/analyze.js";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
} from "@tezgah/shared";

const round = (n: number) => Math.round(n * 1000) / 1000;

function client(cats: number, per: number, longNames = false): ClientDTO {
  return {
    id: "cli_g",
    name: "Golden",
    slug: "golden",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({}),
    catalog: CatalogSchema.parse({
      categories: Array.from({ length: cats }, (_, c) => ({
        id: `c${c}`,
        name_fr: `Catégorie ${c + 1}`,
        order: c,
        items: Array.from({ length: per }, (_, i) => ({
          id: `c${c}i${i}`,
          name_fr: longNames
            ? `Produit très long avec description étendue ${c + 1}-${i + 1} supplémentaire`
            : `Produit ${c + 1}-${i + 1}`,
          desc_fr: "tomate · mozzarella · basilic",
          prices: [{ label: "seul", value: 9.5 + i }],
          order: i,
        })),
      })),
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const listDoc = (params: Record<string, unknown>) =>
  DocumentStateSchema.parse({ template_id: "menu-liste-premium", params });
const flyerDoc = (params: Record<string, unknown>) =>
  DocumentStateSchema.parse({ template_id: "flyer", params });

function fingerprintList(c: ClientDTO, params: Record<string, unknown>) {
  const a = analyzeList(c, listDoc(params));
  return {
    format: a.format,
    columns: a.columns,
    colW: round(a.colW),
    pageCount: a.pages.length,
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
    pages: a.pages.map((p) => ({
      cols: p.columns.map((col) =>
        col.map((pl) => ({
          k: pl.row.kind,
          id: pl.row.kind === "item" ? pl.row.item.id : pl.row.id,
          y: round(pl.y),
          h: round(pl.row.h),
          f: pl.row.kind === "item" ? round(pl.row.nameFont) : null,
        }))
      ),
    })),
  };
}

function fingerprintFlyer(c: ClientDTO, params: Record<string, unknown>) {
  const a = analyzeFlyer(c, flyerDoc(params));
  return {
    items: a.mini.items.map((i) => ({
      id: i.id,
      x: round(i.x),
      y: round(i.y),
      w: round(i.w),
      h: round(i.h),
    })),
    warnings: a.warnings.map((w) => JSON.stringify(w)),
  };
}

const CASES: Array<{ ad: string; cats: number; per: number; params: Record<string, unknown>; long?: boolean }> = [
  { ad: "bos", cats: 0, per: 0, params: {} },
  { ad: "tek-urun", cats: 1, per: 1, params: {} },
  { ad: "30-urun-2sutun", cats: 3, per: 10, params: {} },
  { ad: "80-urun-2sutun", cats: 8, per: 10, params: {} },
  { ad: "120-urun-3sutun", cats: 12, per: 10, params: { columns: 3 } },
  { ad: "200-urun-2sutun", cats: 10, per: 20, params: {} },
  { ad: "200-urun-3sutun-desc", cats: 10, per: 20, params: { columns: 3, showDesc: true } },
  { ad: "uzun-adlar", cats: 4, per: 8, params: {}, long: true },
  { ad: "a3-100urun", cats: 10, per: 10, params: { format: "a3-portrait" } },
  { ad: "fiyat-kolon", cats: 5, per: 8, params: { priceLayout: "columns" } },
];

describe("ALTIN KAYIT — motor çıkarımı yerleşimi değiştirmedi (menu-liste-premium)", () => {
  for (const cs of CASES) {
    it(`${cs.ad}: sayfa/sütun/blok/y/font birebir aynı`, () => {
      const beklenen = (golden as Record<string, unknown>)[cs.ad];
      expect(beklenen, `altın kayıtta '${cs.ad}' yok`).toBeDefined();
      expect(fingerprintList(client(cs.cats, cs.per, cs.long), cs.params)).toEqual(beklenen);
    });
  }
});

describe("ALTIN KAYIT — flyer ızgarası birebir aynı", () => {
  it("3 ürün (kapasite altı): hücre konumları aynı, uyarı yok", () => {
    expect(fingerprintFlyer(client(1, 3), {})).toEqual(golden["flyer-3urun"]);
  });
  it("8 ürün (kapasite üstü): 4 hücre + görünür taşma uyarısı aynı", () => {
    expect(fingerprintFlyer(client(1, 8), {})).toEqual(golden["flyer-8urun"]);
  });
  it("21x21 8 ürün: 6 hücre + uyarı aynı", () => {
    expect(fingerprintFlyer(client(1, 8), { format: "21x21" })).toEqual(golden["flyer-21x21-8urun"]);
  });
});

describe("DETERMİNİZM — aynı girdi, aynı çıktı", () => {
  it("liste 200 ürün: iki ayrı koşum bit-birebir eşit", () => {
    const c = client(10, 20);
    expect(fingerprintList(c, {})).toEqual(fingerprintList(c, {}));
  });
  it("flyer: iki ayrı koşum bit-birebir eşit", () => {
    const c = client(1, 8);
    expect(fingerprintFlyer(c, {})).toEqual(fingerprintFlyer(c, {}));
  });
});
