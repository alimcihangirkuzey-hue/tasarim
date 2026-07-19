/* DYNAMIC COMPOSITION ENGINE — çekirdek sözleşme testleri.
   Şablonlardan bağımsız: motorun kendi davranışını sabitler. */

import { describe, expect, it } from "vitest";
import {
  OVERFLOW_STRATEGIES,
  composeColumns,
  composeGrid,
  isOverflowStrategy,
  resolveOverflowStrategy,
  strategyDropsContent,
  strategyShrinks,
  type OverflowStrategy,
} from "./composition.js";

/* Basit blok üreteci: n adet, her biri h yüksekliğinde; font ölçeğine
   orantılı küçülür (gerçek şablonların davranışını taklit eder). */
const blocks = (n: number, h = 10, maxFont = 4) => (font: number) =>
  Array.from({ length: n }, (_, i) => ({
    entry: { id: `b${i}` },
    h_mm: (h * font) / maxFont,
  }));

const req = (over: Partial<Parameters<typeof composeColumns>[0]> = {}) => ({
  build: blocks(10),
  typography: { min: 2, max: 4 },
  columns: { kind: "fixed" as const, count: 2 },
  columnHeight_mm: 100,
  strategy: "shrink-then-flow" as OverflowStrategy,
  targetPages: 1,
  ...over,
});

describe("strateji sözlüğü", () => {
  it("dört strateji tanımlı ve tip bekçisi doğru", () => {
    expect(OVERFLOW_STRATEGIES).toHaveLength(4);
    expect(isOverflowStrategy("flow")).toBe(true);
    expect(isOverflowStrategy("shrink")).toBe(false);
    expect(isOverflowStrategy(null)).toBe(false);
  });

  it("bilinmeyen ilan SESSİZCE düşmez — çağıranın yedeği kullanılır", () => {
    expect(resolveOverflowStrategy("uydurma", "flow")).toBe("flow");
    expect(resolveOverflowStrategy(undefined, "shrink-then-warn")).toBe("shrink-then-warn");
    expect(resolveOverflowStrategy("truncate-with-warning", "flow")).toBe("truncate-with-warning");
  });

  it("düşürme/küçültme sınıflandırması", () => {
    expect(strategyDropsContent("flow")).toBe(false);
    expect(strategyDropsContent("shrink-then-flow")).toBe(false);
    expect(strategyDropsContent("shrink-then-warn")).toBe(true);
    expect(strategyDropsContent("truncate-with-warning")).toBe(true);
    expect(strategyShrinks("shrink-then-flow")).toBe(true);
    expect(strategyShrinks("truncate-with-warning")).toBe(false);
  });
});

describe("composeColumns — sınır durumları", () => {
  it("0 blok: BOŞ AMA BASILABİLİR tek sayfa — çökme yok, taşma yok", () => {
    /* Boş katalog "sayfa yok" demek DEĞİLDİR: başlık/künye/QR taşıyan bir yüz
       yine basılır. Refactor öncesi davranış da buydu (altın kayıt: bos = 1
       sayfa); motor bunu koruyor. */
    const r = composeColumns(req({ build: blocks(0) }));
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0].columns.flat()).toEqual([]);
    expect(r.overflow).toEqual([]);
    expect(r.metrics.placed).toBe(0);
    expect(r.fitsTarget).toBe(true);
  });

  it("1 blok: tek sayfa, ilk sütun, y=0", () => {
    const r = composeColumns(req({ build: blocks(1) }));
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0].columns[0][0].y_mm).toBe(0);
    expect(r.metrics.placed).toBe(1);
  });

  it("blok sütundan uzun olsa bile DÜŞMEZ (tek başına yerleştirilir)", () => {
    const r = composeColumns(req({ build: blocks(1, 500), strategy: "flow", typography: { min: 4, max: 4 } }));
    expect(r.metrics.placed).toBe(1);
    expect(r.overflow).toEqual([]);
  });
});

describe("composeColumns — taşma stratejileri", () => {
  const tas = { build: blocks(60, 20), columnHeight_mm: 100, typography: { min: 4, max: 4 } };

  it("flow: ürün DÜŞMEZ, sayfa eklenir", () => {
    const r = composeColumns(req({ ...tas, strategy: "flow" }));
    expect(r.overflow).toEqual([]);
    expect(r.metrics.placed).toBe(60);
    expect(r.pages.length).toBeGreaterThan(1);
  });

  it("shrink-then-flow: ürün DÜŞMEZ", () => {
    const r = composeColumns(req({ ...tas, typography: { min: 2, max: 4 }, strategy: "shrink-then-flow" }));
    expect(r.overflow).toEqual([]);
    expect(r.metrics.placed).toBe(60);
  });

  it("shrink-then-warn: hedef sayfayı aşan GÖRÜNÜR taşmaya döner, sessizce kaybolmaz", () => {
    const r = composeColumns(req({ ...tas, typography: { min: 2, max: 4 }, strategy: "shrink-then-warn" }));
    expect(r.pages).toHaveLength(1);
    expect(r.overflow.length).toBeGreaterThan(0);
    expect(r.metrics.placed + r.overflow.length).toBe(r.metrics.blocks);
  });

  it("truncate-with-warning: font küçülmez, taşan rapor edilir", () => {
    const r = composeColumns(req({ ...tas, typography: { min: 2, max: 4 }, strategy: "truncate-with-warning" }));
    expect(r.font_mm).toBe(4);
    expect(r.overflow.length).toBeGreaterThan(0);
    expect(r.metrics.placed + r.overflow.length).toBe(r.metrics.blocks);
  });

  it("HİÇBİR stratejide blok buharlaşmaz: yerleşen + taşan = toplam", () => {
    for (const s of OVERFLOW_STRATEGIES) {
      const r = composeColumns(req({ ...tas, typography: { min: 2, max: 4 }, strategy: s }));
      expect(r.metrics.placed + r.overflow.length, `strateji ${s}`).toBe(60);
    }
  });
});

describe("composeColumns — sütun türetme (dinamik grid)", () => {
  it("az içerik: en küçük sütun sayısı seçilir", () => {
    const r = composeColumns(req({ build: blocks(3), columns: { kind: "derive", min: 1, max: 4 } }));
    expect(r.columns).toBe(1);
  });

  it("çok içerik: hedef sayfaya sığdıran ilk sütun sayısına çıkılır", () => {
    const az = composeColumns(req({ build: blocks(4, 20), columnHeight_mm: 100, columns: { kind: "derive", min: 1, max: 4 } }));
    const cok = composeColumns(req({ build: blocks(40, 20), columnHeight_mm: 100, columns: { kind: "derive", min: 1, max: 4 } }));
    expect(cok.columns).toBeGreaterThan(az.columns);
  });

  it("sabit sütun ilanı türetmeyi ezer", () => {
    const r = composeColumns(req({ build: blocks(200, 20), columns: { kind: "fixed", count: 2 } }));
    expect(r.columns).toBe(2);
  });
});

describe("composeColumns — keep-with-next (kategori başlığı yalnız kalmaz)", () => {
  it("sütun sonunda kalan başlık, takip eden ürünle birlikte taşınır", () => {
    /* 10mm başlık + 10mm ürün çiftleri; sütun 100mm → tam 10 blok sığar.
       9. blok başlıksa tek başına bırakılmamalı. */
    const build = () =>
      Array.from({ length: 12 }, (_, i) => ({
        entry: { id: `b${i}`, baslik: i % 2 === 0 },
        h_mm: 10,
      }));
    const r = composeColumns(
      { ...req({ build, columnHeight_mm: 100, typography: { min: 4, max: 4 }, strategy: "flow" }), build },
      (e) => (e as { baslik: boolean }).baslik
    );
    for (const p of r.pages) {
      for (const col of p.columns) {
        const son = col[col.length - 1];
        if (son) expect((son.entry as { baslik: boolean }).baslik, "sütun başlıkla bitmemeli").toBe(false);
      }
    }
  });
});

describe("composeColumns — son sütun dengeleme (opt-in)", () => {
  it("varsayılan KAPALI: istemsiz görsel değişiklik yok", () => {
    const kapali = composeColumns(req({ build: blocks(21, 10), columnHeight_mm: 100, typography: { min: 4, max: 4 } }));
    const acik = composeColumns(
      req({ build: blocks(21, 10), columnHeight_mm: 100, typography: { min: 4, max: 4 }, balanceLastColumn: true })
    );
    expect(kapali.metrics.imbalance_mm).toBeGreaterThanOrEqual(acik.metrics.imbalance_mm);
  });

  it("açıkken de tek bir blok kaybolmaz", () => {
    const r = composeColumns(
      req({ build: blocks(21, 10), columnHeight_mm: 100, typography: { min: 4, max: 4 }, balanceLastColumn: true })
    );
    expect(r.metrics.placed + r.overflow.length).toBe(21);
  });
});

describe("composeGrid — kapasite geometriden türer", () => {
  const g = (over: Partial<Parameters<typeof composeGrid>[0]> = {}) =>
    composeGrid({
      entries: Array.from({ length: 8 }, (_, i) => ({ id: `i${i}` })),
      cols: 2,
      availableH_mm: 100,
      minCellH_mm: 34,
      gap_mm: 4,
      cellW_mm: 60,
      originX_mm: 10,
      originY_mm: 96,
      strategy: "shrink-then-warn",
      ...over,
    });

  it("100mm / 34mm min → 2 satır, 4 hücre", () => {
    const r = g();
    expect(r.rows).toBe(2);
    expect(r.capacity).toBe(4);
    expect(r.cells).toHaveLength(4);
  });

  it("alan büyürse satır KENDİLİĞİNDEN artar (sabit '2' yok)", () => {
    expect(g({ availableH_mm: 200 }).rows).toBe(5);
    expect(g({ availableH_mm: 40 }).rows).toBe(1);
  });

  it("alan tek hücreye bile yetmese en az 1 satır — bölme sıfır olmaz", () => {
    expect(g({ availableH_mm: 5 }).rows).toBe(1);
  });

  it("maxRows profil tavanı uygulanır", () => {
    expect(g({ availableH_mm: 200, maxRows: 3 }).rows).toBe(3);
  });

  it("taşan kayıtlar GERİ VERİLİR — sessiz slice yok", () => {
    const r = g();
    expect(r.overflow).toHaveLength(4);
    expect(r.cells.length + r.overflow.length).toBe(8);
  });

  it("hücre konumları satır/sütun sırasına göre deterministik", () => {
    const r = g();
    expect(r.cells[0]).toMatchObject({ x_mm: 10, y_mm: 96 });
    expect(r.cells[1].x_mm).toBe(74);
    expect(r.cells[2].y_mm).toBe(96 + r.cellH_mm + 4);
  });

  it("0 kayıt: hücre yok, çökme yok", () => {
    const r = g({ entries: [] });
    expect(r.cells).toEqual([]);
    expect(r.overflow).toEqual([]);
  });
});

describe("DETERMİNİZM — aynı girdi + aynı ayar = aynı yerleşim", () => {
  it("composeColumns 50 kez üst üste aynı sonucu verir", () => {
    const ilk = JSON.stringify(composeColumns(req({ build: blocks(45, 12) })));
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(composeColumns(req({ build: blocks(45, 12) })))).toBe(ilk);
    }
  });

  it("aynı seed aynı sonucu verir; seed yerleşimi bozmaz", () => {
    const a = composeColumns(req({ build: blocks(30), seed: "abc" }));
    const b = composeColumns(req({ build: blocks(30), seed: "abc" }));
    const seedsiz = composeColumns(req({ build: blocks(30) }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).toBe(JSON.stringify(seedsiz));
  });

  it("composeGrid tekrar koşumda birebir aynı", () => {
    const mk = () =>
      composeGrid({
        entries: Array.from({ length: 7 }, (_, i) => ({ id: `i${i}` })),
        cols: 3,
        availableH_mm: 120,
        minCellH_mm: 30,
        gap_mm: 4,
        cellW_mm: 50,
        originX_mm: 0,
        originY_mm: 0,
        strategy: "truncate-with-warning",
      });
    expect(JSON.stringify(mk())).toBe(JSON.stringify(mk()));
  });
});
