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

  /* Ad bilinçli: fonksiyon geçersiz ilanı SESSİZCE yedeğe düşürür. Zorladığı
     tek şey, yedeğin çağıran tarafından AÇIKÇA yazılmasıdır (gizli varsayılan
     yok). Test adı bir kez bunun TERSİNİ söylüyordu — kodla hizalandı. */
  it("bilinmeyen ilan sessizce yedeğe düşer — yedek gizli değil, çağıran yazar", () => {
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
  /* Bu blok da bir kez VAKUMDU: senaryodaki başlıklar hiçbir sütun sonuna
     denk gelmiyordu, yani keepWithNext geçilmese de sonuç birebir aynıydı.
     Aşağıdaki senaryo kuralı GERÇEKTEN tetikler ve bunu önce kanıtlar. */

  /* Sütun 100mm. Bloklar 12mm → 8 blok sığar (96mm), 9. taşar.
     8. blok (index 7) BAŞLIK: kuralsız orada kalır, kuralla taşınır. */
  const build = () =>
    Array.from({ length: 16 }, (_, i) => ({ entry: { id: `b${i}`, baslik: i === 7 }, h_mm: 12 }));
  const ayar = { build, columnHeight_mm: 100, typography: { min: 4, max: 4 }, strategy: "flow" as OverflowStrategy };
  const basliklar = (e: unknown) => (e as { baslik: boolean }).baslik;
  const ilkSutun = (r: ReturnType<typeof composeColumns>) =>
    r.pages[0].columns[0].map((b) => (b.entry as { id: string }).id);

  it("ÖNKOŞUL: kural GERÇEKTEN fark yaratıyor (kuralsız sonuç farklı)", () => {
    const kuralsiz = composeColumns({ ...req(ayar), build });
    const kurallı = composeColumns({ ...req(ayar), build }, basliklar);
    expect(ilkSutun(kuralsiz)).toContain("b7");
    expect(ilkSutun(kurallı), "başlık bir sonraki sütuna taşınmalı").not.toContain("b7");
  });

  it("hiçbir sütun yalnız başlıkla bitmez", () => {
    const r = composeColumns({ ...req(ayar), build }, basliklar);
    for (const p of r.pages) {
      for (const col of p.columns) {
        const son = col[col.length - 1];
        if (son) expect(basliklar(son.entry), "sütun başlıkla bitmemeli").toBe(false);
      }
    }
  });

  it("kural blok kaybettirmez", () => {
    const r = composeColumns({ ...req(ayar), build }, basliklar);
    expect(r.metrics.placed + r.overflow.length).toBe(16);
  });
});

describe("composeColumns — sütun kapatma SINIRI (±1 mutasyon avı)", () => {
  /* Motorun en kritik kırılım koşulu: `used + h > colH` mi, `>=` mi?
     Bir mutasyon turu `>` → `>=` yaptı ve TÜM süit yeşil kaldı — yani sınırın
     testi yoktu. Aşağıdaki üç vaka sınırı üç yönden çiviliyor. */
  const sinir = (h: number, n: number) =>
    composeColumns(
      req({
        build: () => Array.from({ length: n }, (_, i) => ({ entry: { id: `b${i}` }, h_mm: h })),
        columnHeight_mm: 100,
        typography: { min: 4, max: 4 },
        strategy: "flow",
        columns: { kind: "fixed", count: 1 },
      })
    );

  it("TAM sığan blok kümesi tek sütunda kalır (100mm = 100mm taşma DEĞİLDİR)", () => {
    const r = sinir(25, 4); // 4×25 = 100 = colH
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0].columns[0]).toHaveLength(4);
  });

  it("bir birim fazlası taşar", () => {
    const r = sinir(25, 5); // 5×25 = 125 > 100
    expect(r.pages.length).toBeGreaterThan(1);
    expect(r.pages[0].columns[0]).toHaveLength(4);
  });

  it("tek blok tam sütun boyundaysa yerleşir, taşmaz", () => {
    const r = sinir(100, 1);
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0].columns[0]).toHaveLength(1);
  });
});

describe("composeColumns — son sütun dengeleme (opt-in)", () => {
  /* DİKKAT — bu blok bir kez SAHTE YEŞİL'di: senaryo 21 blok × 10mm / 2×100mm
     kullanıyordu, bu 2 SAYFA eder ve dengeleme yalnız tek sayfada çalışır.
     Yani `balanceColumns` hiç çağrılmıyordu; 30 satırlık fonksiyonun test
     kapsaması SIFIRDI ve tamamen bozuk olsa bile testler geçerdi.
     Aşağıdaki senaryolar dengelemenin GERÇEKTEN koştuğunu önce kanıtlar. */

  /* 15 blok × 10mm = 150mm, 2 sütun × 100mm → tek sayfa (dengeleme koşar).
     Dengesiz akış: [100, 50] · dengeli hedef: 75mm */
  const denge = (over = {}) =>
    req({ build: blocks(15, 10), columnHeight_mm: 100, typography: { min: 4, max: 4 }, ...over });

  it("ÖNKOŞUL: senaryo tek sayfa üretir — yoksa dengeleme hiç çalışmaz", () => {
    expect(composeColumns(denge()).pages).toHaveLength(1);
  });

  it("dengeleme GERÇEKTEN koşuyor: dengesizlik kesin olarak azalır", () => {
    const kapali = composeColumns(denge());
    const acik = composeColumns(denge({ balanceLastColumn: true }));
    expect(kapali.metrics.imbalance_mm).toBeGreaterThan(0);
    expect(acik.metrics.imbalance_mm).toBeLessThan(kapali.metrics.imbalance_mm);
  });

  it("dengeleme açıkken blok kaybolmaz", () => {
    const r = composeColumns(denge({ balanceLastColumn: true }));
    expect(r.metrics.placed + r.overflow.length).toBe(15);
  });

  it("varsayılan KAPALI: istemsiz görsel değişiklik yok", () => {
    const kapali = composeColumns(denge());
    const acikAmaVarsayilan = composeColumns(denge({ balanceLastColumn: undefined }));
    expect(JSON.stringify(kapali)).toBe(JSON.stringify(acikAmaVarsayilan));
  });

  /* REGRESYON — dengeleme içeriği SAYFA DIŞINA taşırıyordu.
     Kök neden: son sütunda `colH_mm` hiç kontrol edilmiyordu, kalan her şey
     oraya yığılıyordu. Ürün kaybolmuyor ama basılmıyor ve `overflow` boş
     kaldığı için GÖRÜNÜR UYARI da üretilmiyordu — sessiz kayıptan beter. */
  it("REGRESYON: dengeleme hiçbir sütunu sayfa yüksekliğinden taşırmaz", () => {
    const build = () => [10, 90, 90].map((h, i) => ({ entry: { id: `b${i}` }, h_mm: h }));
    const r = composeColumns(
      req({ build, columnHeight_mm: 100, typography: { min: 4, max: 4 }, balanceLastColumn: true, strategy: "flow" })
    );
    for (const p of r.pages) {
      for (const col of p.columns) {
        const h = col.reduce((s, b) => s + b.h_mm, 0);
        expect(h, "sütun sayfa yüksekliğini aşamaz").toBeLessThanOrEqual(100);
      }
    }
  });

  it("REGRESYON (geniş tarama): dengeleme hiçbir senaryoda taşma ÜRETMEZ", () => {
    /* Dengeleme kozmetiktir: sığan bir yerleşimi kötüleştiremez. */
    for (let n = 2; n <= 40; n++) {
      for (const cols of [2, 3, 4]) {
        for (const h of [7, 13, 29]) {
          const build = () => Array.from({ length: n }, (_, i) => ({ entry: { id: `b${i}` }, h_mm: h }));
          const ayar = { build, columnHeight_mm: 100, typography: { min: 4, max: 4 }, columns: { kind: "fixed" as const, count: cols }, strategy: "flow" as OverflowStrategy };
          const kapali = composeColumns(req(ayar));
          if (kapali.pages.length !== 1) continue; // dengeleme yalnız tek sayfada
          const acik = composeColumns(req({ ...ayar, balanceLastColumn: true }));
          for (const p of acik.pages) {
            for (const col of p.columns) {
              const th = col.reduce((s, b) => s + b.h_mm, 0);
              expect(th, `n=${n} cols=${cols} h=${h}`).toBeLessThanOrEqual(100);
            }
          }
          expect(acik.metrics.placed + acik.overflow.length, `n=${n} cols=${cols} h=${h}`).toBe(n);
        }
      }
    }
  });

  it("sığdıramadığında dengelenmemiş akışa geri düşer (durumu kötüleştirmez)", () => {
    /* keep-with-next zinciri dengelemeyi imkânsız kılar → fallback */
    const build = () => [50, 60].map((h, i) => ({ entry: { id: `b${i}`, tut: i === 0 }, h_mm: h }));
    const acik = composeColumns(
      { ...req({ build, columnHeight_mm: 100, typography: { min: 4, max: 4 }, balanceLastColumn: true, strategy: "flow" }), build },
      (e) => (e as { tut: boolean }).tut
    );
    expect(acik.metrics.placed + acik.overflow.length).toBe(2);
    for (const p of acik.pages) {
      for (const col of p.columns) {
        expect(col.reduce((s, b) => s + b.h_mm, 0)).toBeLessThanOrEqual(100);
      }
    }
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

  it("minCellH 0/negatif: bölme patlamaz, NaN geometri üretilmez", () => {
    for (const m of [0, -5]) {
      const r = g({ minCellH_mm: m, gap_mm: 0 });
      expect(Number.isFinite(r.rows), `minCellH=${m}`).toBe(true);
      expect(Number.isFinite(r.cellH_mm), `minCellH=${m}`).toBe(true);
      for (const c of r.cells) expect(Number.isFinite(c.y_mm)).toBe(true);
    }
  });
});

describe("composeGrid — ilan/davranış ayrışması sessiz kalmaz", () => {
  const g = (strategy: OverflowStrategy) =>
    composeGrid({
      entries: Array.from({ length: 8 }, (_, i) => ({ id: `i${i}` })),
      cols: 2,
      availableH_mm: 100,
      minCellH_mm: 34,
      gap_mm: 4,
      cellW_mm: 60,
      originX_mm: 10,
      originY_mm: 96,
      strategy,
    });

  it("düşürmeyen strateji ilan edilip ürün düşerse İHLAL raporlanır", () => {
    /* Izgara sabit yüzeydir: "flow" (= ürün düşmez) sözünü tutamaz.
       Sessizce yutulmaz — çağıran görünür uyarıya çevirsin diye bildirilir. */
    for (const s of ["flow", "shrink-then-flow"] as OverflowStrategy[]) {
      const r = g(s);
      expect(r.overflow.length, s).toBeGreaterThan(0);
      expect(r.strategyViolation, s).toBe(s);
    }
  });

  it("düşüren strateji ilan edilmişse ihlal YOKTUR", () => {
    for (const s of ["shrink-then-warn", "truncate-with-warning"] as OverflowStrategy[]) {
      expect(g(s).strategyViolation, s).toBeNull();
    }
  });

  it("taşma yoksa hiçbir stratejide ihlal doğmaz", () => {
    for (const s of OVERFLOW_STRATEGIES) {
      const r = composeGrid({
        entries: [{ id: "a" }, { id: "b" }],
        cols: 2,
        availableH_mm: 100,
        minCellH_mm: 34,
        gap_mm: 4,
        cellW_mm: 60,
        originX_mm: 0,
        originY_mm: 0,
        strategy: s,
      });
      expect(r.overflow, s).toEqual([]);
      expect(r.strategyViolation, s).toBeNull();
    }
  });
});

describe("DETERMİNİZM — aynı girdi + aynı ayar = aynı yerleşim", () => {
  it("composeColumns 50 kez üst üste aynı sonucu verir", () => {
    const ilk = JSON.stringify(composeColumns(req({ build: blocks(45, 12) })));
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(composeColumns(req({ build: blocks(45, 12) })))).toBe(ilk);
    }
  });

  /* Buradaki eski test `seed` alanını "determinizm" diye doğruluyordu; alan
     gövdede hiç okunmadığı için test VAKUMDU (farklı seed → aynı çıktı, çünkü
     seed hiçbir şey yapmıyordu). Alan kaldırıldı, test de. Tohumlu varyasyon
     geldiğinde buraya GERÇEK bir test yazılır: farklı tohum FARKLI yerleşim. */

  it("sıra bağımlılığı yok: farklı çağrı sıraları aynı sonucu verir", () => {
    const a1 = composeColumns(req({ build: blocks(30) }));
    composeColumns(req({ build: blocks(7, 55), strategy: "truncate-with-warning" }));
    composeColumns(req({ build: blocks(120, 3), columns: { kind: "derive", min: 1, max: 5 } }));
    const a2 = composeColumns(req({ build: blocks(30) }));
    expect(JSON.stringify(a2), "önceki çağrılar sonrakini etkilememeli").toBe(JSON.stringify(a1));
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
