/* DİFERANSİYEL REGRESYON — refactor ÖNCESİ kod ile ŞİMDİKİ kod yan yana.
   ============================================================================
   Altın kayıt (composition-golden.json) 13 sabit vakayı çiviler. Bu dosya
   ondan bağımsız ve daha güçlüdür: `main`'den çıkarılmış refactor-öncesi
   `__baseline.ts` ile bugünkü `analyze.ts`'i AYNI girdilerle koşturup
   çıktılarını karşılaştırır. Yüzlerce kombinasyon üretir.

   NEDEN GEREKLİ: bir doğrulama turu, altın kayıt vaka ADLARININ yanıltıcı
   olduğunu gösterdi — "30-urun-2sutun" aslında `columns: 1` ile koşuyordu
   (A4 varsayılanı 1'dir), yani A4'te 2 sütunlu yerleşim HİÇBİR altın vakada
   kapsanmıyordu. Sabit vaka listesi böyle kör noktalar üretir; kombinasyon
   taraması üretmez.

   __baseline.ts dosyaları `git show main:...` ile üretilir ve bu paketle
   birlikte commit edilir; sonraki geliştirici köken iddiasını yeniden
   doğrulayabilsin diye. */

import { describe, expect, it } from "vitest";
import { analyzeList } from "../menu-liste-premium/analyze.js";
import { analyzeList as analyzeListEskiHam } from "../menu-liste-premium/__baseline.js";
/* Taban ELLE DÜZENLENMEZ; sonradan eklenen additive alanlar (imbalance_mm)
   tabanda yoktur — parmak izi onları okumadığı için tip burada genişletilir */
const analyzeListEski = analyzeListEskiHam as unknown as typeof analyzeList;
import { analyzeFlyer } from "../flyer/analyze.js";
import { analyzeFlyer as analyzeFlyerEski } from "../flyer/__baseline.js";
import { analyzeTrifold } from "../menu-trifold/analyze.js";
import { analyzeTrifold as analyzeTrifoldEski } from "../menu-trifold/__baseline.js";
import { analyzeGrid } from "../menu-grid-cells/analyze.js";
import { analyzeGrid as analyzeGridEski } from "../menu-grid-cells/__baseline.js";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
} from "@tezgah/shared";

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function client(cats: number, per: number, opts: { uzun?: boolean; not?: boolean; varyant?: boolean } = {}): ClientDTO {
  return {
    id: "cli_d",
    name: "Diff",
    slug: "diff",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({}),
    catalog: CatalogSchema.parse({
      categories: Array.from({ length: cats }, (_, c) => ({
        id: `c${c}`,
        name_fr: `Catégorie ${c + 1}`,
        note_fr: opts.not ? "Servi avec accompagnement au choix" : undefined,
        order: c,
        items: Array.from({ length: per }, (_, i) => ({
          id: `c${c}i${i}`,
          name_fr: opts.uzun
            ? `Produit très long avec description étendue ${c + 1}-${i + 1} supplémentaire encore`
            : `Produit ${c + 1}-${i + 1}`,
          desc_fr: "tomate · mozzarella · basilic · origan",
          prices:
            opts.varyant && i % 3 === 0
              ? [
                  { label: "petite", value: 8 + i },
                  { label: "grande", value: 12 + i },
                ]
              : [{ label: "seul", value: 9.5 + i }],
          order: i,
        })),
      })),
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

/** Tam yapısal parmak izi: yerleşim + METİN İÇERİĞİ + uyarılar */
function fpList(fn: typeof analyzeList, c: ClientDTO, params: Record<string, unknown>) {
  const a = fn(c, DocumentStateSchema.parse({ template_id: "menu-liste-premium", params }));
  return JSON.stringify({
    format: a.format,
    columns: a.columns,
    colW: r3(a.colW),
    nameFont: r3(a.nameFont),
    pageCount: a.pages.length,
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
    pages: a.pages.map((p) =>
      p.columns.map((col) =>
        col.map((pl) => ({
          k: pl.row.kind,
          id: pl.row.kind === "item" ? pl.row.item.id : pl.row.id,
          y: r3(pl.y),
          h: r3(pl.row.h),
          /* metin içeriği de karşılaştırılır: sarma/kısaltma kayması yakalanır */
          t:
            pl.row.kind === "item"
              ? [pl.row.nameLines.join("|"), pl.row.descLines.join("|"), pl.row.priceTexts.join("|")].join("//")
              : pl.row.name,
        }))
      )
    ),
  });
}

function fpFlyer(fn: typeof analyzeFlyer, c: ClientDTO, params: Record<string, unknown>) {
  const a = fn(c, DocumentStateSchema.parse({ template_id: "flyer", params }));
  return JSON.stringify({
    cols: a.mini.cols,
    items: a.mini.items.map((i) => ({ id: i.id, x: r3(i.x), y: r3(i.y), w: r3(i.w), h: r3(i.h), n: i.name, p: i.price })),
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
  });
}

/* Katalog şekilleri: kenar durumlar + gerçekçi yoğunluklar */
const SEKILLER: Array<[string, number, number, Parameters<typeof client>[2]]> = [
  ["bos", 0, 0, {}],
  ["tek", 1, 1, {}],
  ["tek-kategori-cok-urun", 1, 60, {}],
  ["cok-kategori-tek-urun", 25, 1, {}],
  ["orta", 5, 8, {}],
  ["yogun", 10, 20, {}],
  ["cok-yogun", 12, 25, {}],
  ["uzun-adlar", 4, 8, { uzun: true }],
  ["kategori-notlu", 6, 6, { not: true }],
  ["karisik-varyant", 5, 9, { varyant: true }],
  ["notlu-varyantli-uzun", 4, 7, { uzun: true, not: true, varyant: true }],
];

describe("DİFERANSİYEL — menu-liste-premium: eski kod ≡ yeni kod", () => {
  const formatlar = ["a4-portrait", "a3-portrait"];
  const sutunlar = [undefined, 1, 2, 3];
  const desc = [undefined, true, false];
  const fiyat = [undefined, "inline", "columns"];

  for (const [ad, cats, per, opts] of SEKILLER) {
    it(`${ad}: tüm parametre kombinasyonlarında birebir aynı`, () => {
      const c = client(cats, per, opts);
      let n = 0;
      for (const format of formatlar) {
        for (const columns of sutunlar) {
          for (const showDesc of desc) {
            for (const priceLayout of fiyat) {
              const params: Record<string, unknown> = { format };
              if (columns !== undefined) params.columns = columns;
              if (showDesc !== undefined) params.showDesc = showDesc;
              if (priceLayout !== undefined) params.priceLayout = priceLayout;
              const etiket = `${ad} ${JSON.stringify(params)}`;
              expect(fpList(analyzeList, c, params), etiket).toBe(fpList(analyzeListEski, c, params));
              n++;
            }
          }
        }
      }
      expect(n).toBeGreaterThan(50); // kombinasyon gerçekten üretildi
    }, 60_000); /* yoğun kataloglar × 72 kombinasyon: varsayılan 5sn yetmez */
  }

  it("QR açık + dekor kombinasyonları da birebir aynı", () => {
    const c = client(6, 10);
    for (const showQr of [true, false]) {
      for (const qrSource of ["site", "tel", "instagram"]) {
        const params = { showQr, qrSource };
        expect(fpList(analyzeList, c, params), JSON.stringify(params)).toBe(fpList(analyzeListEski, c, params));
      }
    }
  });
});

describe("DİFERANSİYEL — flyer: eski kod ≡ yeni kod", () => {
  it("kapasite altı/üstü × iki format × ürün sayısı: birebir aynı", () => {
    for (const format of ["a5-portrait", "21x21"]) {
      for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 40]) {
        const c = client(1, n);
        const params = { format };
        expect(fpFlyer(analyzeFlyer, c, params), `${format} n=${n}`).toBe(fpFlyer(analyzeFlyerEski, c, params));
      }
    }
  });

  it("taşma uyarısı SAYISI eski davranışla aynı", () => {
    for (const format of ["a5-portrait", "21x21"]) {
      for (const n of [3, 4, 5, 6, 7, 8, 20]) {
        const c = client(1, n);
        const doc = DocumentStateSchema.parse({ template_id: "flyer", params: { format } });
        const yeni = analyzeFlyer(c, doc).warnings.filter((w) => w.type === "overflow-items");
        const eski = analyzeFlyerEski(c, doc).warnings.filter((w) => w.type === "overflow-items");
        expect(yeni, `${format} n=${n}`).toEqual(eski);
      }
    }
  });
});

/* ── CE-bağlama paketi: menu-trifold + menu-grid-cells ─────────────────────
   Tabanlar origin/main@d229849'dan (bağlama ÖNCESİ) çıkarıldı. */

function fpTrifold(fn: typeof analyzeTrifold, c: ClientDTO, params: Record<string, unknown>) {
  const a = fn(c, DocumentStateSchema.parse({ template_id: "menu-trifold", params }));
  return JSON.stringify({
    colH: r3(a.colH),
    showDesc: a.showDesc,
    overflowCount: a.overflowCount,
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
    flap: a.flapItems,
    columns: a.innerColumns.map((col) => ({
      x: r3(col.x),
      w: r3(col.w),
      rows: col.rows.map((pl) => ({
        k: pl.row.kind,
        y: r3(pl.y),
        h: r3(pl.row.h),
        /* metin içeriği de karşılaştırılır: sarma/font kayması yakalanır */
        t:
          pl.row.kind === "item"
            ? [
                pl.row.item!.id,
                pl.row.nameLines!.join("|"),
                r3(pl.row.nameFont!),
                (pl.row.descLines ?? []).join("|"),
                r3(pl.row.descFont ?? 0),
                pl.row.priceText,
              ].join("//")
            : [pl.row.name, pl.row.note ?? ""].join("//"),
      })),
    })),
  });
}

describe("DİFERANSİYEL — menu-trifold: eski kod ≡ yeni kod", () => {
  const eskiT = analyzeTrifoldEski as unknown as typeof analyzeTrifold;
  const desc = [undefined, true, false];
  for (const [ad, cats, per, opts] of SEKILLER) {
    it(`${ad}: showDesc kombinasyonlarında birebir aynı`, () => {
      const c = client(cats, per, opts);
      for (const showDesc of desc) {
        const params: Record<string, unknown> = {};
        if (showDesc !== undefined) params.showDesc = showDesc;
        const etiket = `${ad} ${JSON.stringify(params)}`;
        expect(fpTrifold(analyzeTrifold, c, params), etiket).toBe(fpTrifold(eskiT, c, params));
      }
    }, 60_000);
  }

  it("taşma uyarısı ve sayısı eski davranışla aynı (yoğunluk taraması)", () => {
    for (const per of [1, 5, 10, 20, 40, 80]) {
      const c = client(3, per);
      const doc = DocumentStateSchema.parse({ template_id: "menu-trifold", params: {} });
      const yeni = analyzeTrifold(c, doc);
      const eski = analyzeTrifoldEski(c, doc);
      expect(yeni.overflowCount, `per=${per}`).toBe(eski.overflowCount);
      expect(
        yeni.warnings.filter((w) => w.type === "overflow-items"),
        `per=${per}`
      ).toEqual(eski.warnings.filter((w) => w.type === "overflow-items"));
    }
  });
});

function fpGrid(fn: typeof analyzeGrid, c: ClientDTO, params: Record<string, unknown>, pageIndex = 0) {
  const a = fn(c, DocumentStateSchema.parse({ template_id: "menu-grid-cells", params }), pageIndex);
  return JSON.stringify({
    format: a.format,
    cols: a.cols,
    pages: a.pages,
    pageIndex: a.pageIndex,
    flowMode: a.flowMode,
    contBand: a.contBand,
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
    placed: a.layout.placed.map((p) =>
      p.kind === "cell"
        ? { k: "cell", id: p.item.id, x: r3(p.x), y: r3(p.y), w: r3(p.w), h: r3(p.h) }
        : { k: "cat", id: p.category.id, x: r3(p.x), y: r3(p.y), w: r3(p.w), h: r3(p.h) }
    ),
    overflow: a.layout.overflow.map((o) => o.item.id),
    cells: [...a.cells.entries()].map(([id, cell]) => ({
      id,
      n: [cell.name.lines.join("|"), r3(cell.name.font_mm), cell.name.truncated].join("//"),
      d: cell.desc ? [cell.desc.lines.join("|"), r3(cell.desc.font_mm)].join("//") : null,
      p: cell.prices.length,
      f: cell.photoBox ? [r3(cell.photoBox.x), r3(cell.photoBox.y), r3(cell.photoBox.w), r3(cell.photoBox.h)].join(",") : null,
    })),
  });
}

describe("DİFERANSİYEL — menu-grid-cells: eski kod ≡ yeni kod", () => {
  const eski = analyzeGridEski as unknown as typeof analyzeGrid;
  const formatlar = ["a4-portrait", "a4-landscape", "a3-portrait"];
  const kolonlar = [undefined, 2, 3, 4, 5];
  const akis = [undefined, "single", "multipage"];

  for (const [ad, cats, per, opts] of SEKILLER) {
    it(`${ad}: format × kolon × akış kombinasyonlarında birebir aynı`, () => {
      const c = client(cats, per, opts);
      let n = 0;
      for (const format of formatlar) {
        for (const cols of kolonlar) {
          for (const flow of akis) {
            const params: Record<string, unknown> = { format };
            if (cols !== undefined) params.cols = cols;
            if (flow !== undefined) params.flow = flow;
            const etiket = `${ad} ${JSON.stringify(params)}`;
            expect(fpGrid(analyzeGrid, c, params), etiket).toBe(fpGrid(eski, c, params));
            n++;
          }
        }
      }
      expect(n).toBeGreaterThan(30);
    }, 60_000);
  }

  it("multipage DEVAM sayfaları da birebir aynı (bant + yerleşim)", () => {
    const c = client(10, 20);
    const params = { flow: "multipage", cols: 3 };
    const doc = DocumentStateSchema.parse({ template_id: "menu-grid-cells", params });
    const pages = analyzeGrid(c, doc).pages;
    expect(pages).toBe((eski(c, doc) as ReturnType<typeof analyzeGrid>).pages);
    for (let pi = 0; pi < pages; pi++) {
      expect(fpGrid(analyzeGrid, c, params, pi), `sayfa ${pi}`).toBe(fpGrid(eski, c, params, pi));
    }
    expect(pages).toBeGreaterThan(1); // tarama gerçekten çok sayfa ölçtü
  });

  it("showDesc + priceStyle kombinasyonları da birebir aynı", () => {
    const c = client(4, 9);
    for (const showDesc of [true, false]) {
      for (const priceStyle of ["arrow", "plain"]) {
        const params = { showDesc, priceStyle };
        expect(fpGrid(analyzeGrid, c, params), JSON.stringify(params)).toBe(fpGrid(eski, c, params));
      }
    }
  });
});
