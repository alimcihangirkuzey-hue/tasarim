/* Blok yerleşim çekirdeği testleri (journal 2026-08-07-blok-yerlesim-modeli).

   EN ÖNEMLİ PİN: buildPanels genelleştirmesinin menu-trifold'un ELLE YAZILMIŞ
   sabit haritasını BİREBİR ürettiği. Genelleştirme bunu üretemiyorsa
   genelleştirme değil, ikinci bir gerçektir — ve depo o gün iki farklı panel
   haritası taşımaya başlar. */

import { describe, expect, it } from "vitest";
import {
  BLOCK_KINDS,
  DEFAULT_GRID_MM,
  LayoutDocSchema,
  SNAP_TOLERANCE_MM,
  buildPanels,
  collisionsIn,
  contentArea,
  foldLines,
  overflowingBlocks,
  overlaps,
  panelsOf,
  placeBlock,
  sheetSize,
  type Block,
  type BlockBox,
  type LayoutDoc,
} from "./block-layout.js";

/* ── Yardımcılar ──────────────────────────────────────────────────────── */

const doc = (over: Partial<LayoutDoc> = {}): LayoutDoc =>
  LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2, ...over });

const blok = (id: string, panel_id: string, box: BlockBox): Block => ({
  id,
  kind: "urun_karti",
  panel_id,
  box,
  props: {},
});

const kutu = (x: number, y: number, w: number, h: number): BlockBox => ({
  x_mm: x,
  y_mm: y,
  w_mm: w,
  h_mm: h,
});

/* ── Yaprak ölçüsü ────────────────────────────────────────────────────── */

describe("sheetSize — ISO 216, yön duyarlı", () => {
  it("A4 dikey 210×297, yatay 297×210", () => {
    expect(sheetSize("a4", "dikey")).toEqual({ w_mm: 210, h_mm: 297 });
    expect(sheetSize("a4", "yatay")).toEqual({ w_mm: 297, h_mm: 210 });
  });

  it("A3 ve A5 de aynı kuralı izler", () => {
    expect(sheetSize("a3", "yatay")).toEqual({ w_mm: 420, h_mm: 297 });
    expect(sheetSize("a5", "dikey")).toEqual({ w_mm: 148, h_mm: 210 });
  });
});

/* ── Panel haritası ───────────────────────────────────────────────────── */

describe("buildPanels — katlamadan TÜREVDİR", () => {
  it("KRİTİK PİN: a4-yatay-2-roll, menu-trifold'un elle yazılmış haritasıyla BİREBİR", () => {
    /* menu-trifold/manifest.ts:
         OUTER_PANELS = [{x:0,w:97,role:"flap"},{x:97,w:100,role:"back"},{x:197,w:100,role:"front"}]
         INNER_PANELS = [{x:0,w:100},{x:100,w:100},{x:200,w:97}]
       Aşağıdaki beklenti o iki diziden KOPYALANMIŞTIR. */
    const p = buildPanels({ format: "a4", orientation: "yatay", fold: 2, fold_style: "roll" });
    const dis = p.filter((x) => x.side === "dis");
    const ic = p.filter((x) => x.side === "ic");

    expect(dis.map((x) => [x.x_mm, x.w_mm])).toEqual([
      [0, 97],
      [97, 100],
      [197, 100],
    ]);
    expect(ic.map((x) => [x.x_mm, x.w_mm])).toEqual([
      [0, 100],
      [100, 100],
      [200, 97],
    ]);
    /* Rol sırası da aynı: kanat · arka · ön */
    expect(dis.map((x) => x.role)).toEqual(["kanat", "arka", "on"]);
  });

  it("TOPLAM KORUNUR — panel genişlikleri toplamı yaprak genişliğine eşit", () => {
    for (const fold of [0, 1, 2] as const) {
      for (const style of ["roll", "akordeon"] as const) {
        const p = buildPanels({ format: "a4", orientation: "yatay", fold, fold_style: style });
        for (const side of ["dis", "ic"] as const) {
          const toplam = p
            .filter((x) => x.side === side)
            .reduce((s, x) => s + x.w_mm, 0);
          expect(toplam, `${fold}/${style}/${side}`).toBeCloseTo(297, 6);
        }
      }
    }
  });

  it("akordeon EŞİT böler — sarmalın payı yoktur (iç içe girme yok)", () => {
    const p = buildPanels({ format: "a4", orientation: "yatay", fold: 2, fold_style: "akordeon" });
    const w = p.filter((x) => x.side === "dis").map((x) => x.w_mm);
    expect(w[0]).toBeCloseTo(99, 6);
    expect(w[0]).toBeCloseTo(w[1], 6);
    expect(w[1]).toBeCloseTo(w[2], 6);
  });

  it("katlamasız → yüz başına TEK panel (ön yüz / arka yüz)", () => {
    const p = buildPanels({ format: "a5", orientation: "dikey", fold: 0 });
    expect(p).toHaveLength(2);
    expect(p.map((x) => x.label_tr)).toEqual(["Ön yüz", "Arka yüz"]);
    expect(p[0].w_mm).toBe(148);
  });

  it("tek kırım → yüz başına iki EŞİT panel; dış yüz [arka, ön kapak]", () => {
    const p = buildPanels({ format: "a4", orientation: "yatay", fold: 1 });
    const dis = p.filter((x) => x.side === "dis");
    expect(dis.map((x) => x.w_mm)).toEqual([148.5, 148.5]);
    expect(dis.map((x) => x.role)).toEqual(["arka", "on"]);
  });

  it("panel id'leri tekil — blok panel_id ile bağlanır, çakışma olamaz", () => {
    const ids = buildPanels({ format: "a3", orientation: "yatay", fold: 2 }).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("foldLines — kat çizgileri", () => {
  it("iki kırımda İKİ çizgi; yaprak kenarı çizgi DEĞİLDİR", () => {
    const l = foldLines({ format: "a4", orientation: "yatay", fold: 2, fold_style: "roll" });
    expect(l).toEqual([97, 197]); // menu-trifold FOLDS_OUTER ile birebir
    expect(l).not.toContain(297);
  });

  it("iç yüzün kat çizgileri dış yüzden FARKLIDIR (sarmal asimetrisi)", () => {
    const dis = foldLines({ format: "a4", orientation: "yatay", fold: 2, side: "dis" });
    const ic = foldLines({ format: "a4", orientation: "yatay", fold: 2, side: "ic" });
    expect(dis).toEqual([97, 197]);
    expect(ic).toEqual([100, 200]); // menu-trifold FOLDS_INNER
  });

  it("katlamasızda kat çizgisi YOK", () => {
    expect(foldLines({ format: "a4", orientation: "dikey", fold: 0 })).toEqual([]);
  });
});

/* ── İçerik alanı ─────────────────────────────────────────────────────── */

describe("contentArea — safe payı", () => {
  it("safe payı DÖRT kenardan düşülür", () => {
    const d = doc({ safe_mm: 5 });
    const panel = panelsOf(d)[0]; // 97×210
    expect(contentArea(panel, d)).toEqual({ x_mm: 5, y_mm: 5, w_mm: 87, h_mm: 200 });
  });

  it("aşırı safe payında alan NEGATİFE düşmez, sıfırlanır", () => {
    const d = doc({ safe_mm: 30 });
    const panel = panelsOf(d)[0]; // 97 geniş; 2×30=60 → 37 kalır, ama h için 210-60=150
    const a = contentArea(panel, d);
    expect(a.w_mm).toBeGreaterThanOrEqual(0);
    expect(a.h_mm).toBeGreaterThanOrEqual(0);
  });
});

/* ── Çakışma temeli ───────────────────────────────────────────────────── */

describe("overlaps — kenar teması çakışma DEĞİLDİR", () => {
  it("üst üste binen kutular çakışır", () => {
    expect(overlaps(kutu(0, 0, 10, 10), kutu(5, 5, 10, 10))).toBe(true);
  });

  it("kenarı kenarına duran kutular çakışMAZ (blok dizmenin normali)", () => {
    expect(overlaps(kutu(0, 0, 10, 10), kutu(10, 0, 10, 10))).toBe(false);
    expect(overlaps(kutu(0, 0, 10, 10), kutu(0, 10, 10, 10))).toBe(false);
  });
});

/* ── Yerleştirme: snap · itme · taşma ─────────────────────────────────── */

describe("placeBlock — ızgara snap", () => {
  it("ızgaraya yuvarlar (5mm): 12.4 → 10, 13 → 15", () => {
    const d = doc({ grid_mm: DEFAULT_GRID_MM });
    const panel = panelsOf(d)[1];
    expect(placeBlock(d, panel, kutu(12.4, 13, 40, 20)).box.x_mm).toBe(10);
    expect(placeBlock(d, panel, kutu(12.4, 13, 40, 20)).box.y_mm).toBe(15);
  });

  it("tam ızgarada snapped=false — gereksiz kılavuz gösterilmez", () => {
    const d = doc();
    const panel = panelsOf(d)[1];
    expect(placeBlock(d, panel, kutu(10, 15, 40, 20)).snapped).toBe(false);
  });

  it("safe payının DIŞINA çıkamaz — negatif istek içeri sıkışır", () => {
    const d = doc({ safe_mm: 5 });
    const panel = panelsOf(d)[1];
    const r = placeBlock(d, panel, kutu(0, 0, 40, 20));
    expect(r.box.x_mm).toBe(5);
    expect(r.box.y_mm).toBe(5);
  });
});

describe("placeBlock — komşu kenarına hizalama (akıllı kılavuz)", () => {
  it("ızgara adımından KÜÇÜK kayıklığı komşu kenarına yapıştırır", () => {
    /* Komşu x=32'de bitiyor; ızgara 5mm olduğu için 32 ızgarada YOK.
       Kılavuz olmasaydı 30'a yuvarlanır ve 2mm'lik görünür boşluk kalırdı. */
    const d = doc({ grid_mm: 5 });
    d.blocks = [blok("a", "dis-1", kutu(12, 20, 20, 30))]; // sağ kenar 32
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const r = placeBlock(d, panel, kutu(31, 20, 30, 30));
    expect(r.box.x_mm).toBe(32);
    expect(r.snapped).toBe(true);
  });

  it("tolerans DIŞINDAki kayıklık yapışmaz — ızgara kararı geçerli kalır", () => {
    const d = doc({ grid_mm: 5 });
    d.blocks = [blok("a", "dis-1", kutu(12, 20, 20, 30))]; // sağ kenar 32
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const uzak = 32 + SNAP_TOLERANCE_MM + 3;
    const r = placeBlock(d, panel, kutu(uzak, 60, 30, 30));
    expect(r.box.x_mm).not.toBe(32);
  });
});

describe("placeBlock — çarpışma AŞAĞI iter", () => {
  it("dolu yere bırakılan blok komşunun altına iner (reddedilmez)", () => {
    const d = doc();
    d.blocks = [blok("a", "dis-1", kutu(10, 10, 60, 40))]; // 10..50 dikey
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const r = placeBlock(d, panel, kutu(10, 20, 60, 30));
    expect(r.pushed).toBe(true);
    expect(r.box.y_mm).toBe(50); // komşunun alt kenarı
    expect(overlaps(r.box, d.blocks[0].box)).toBe(false);
  });

  it("ZİNCİRLEME itme: iki komşunun altına iner, sabit noktaya oturur", () => {
    const d = doc();
    d.blocks = [
      blok("a", "dis-1", kutu(10, 10, 60, 40)), // 10..50
      blok("b", "dis-1", kutu(10, 50, 60, 40)), // 50..90
    ];
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const r = placeBlock(d, panel, kutu(10, 15, 60, 20));
    expect(r.box.y_mm).toBe(90);
    expect(collisionsIn({ ...d, blocks: [...d.blocks, blok("c", "dis-1", r.box)] }, "dis-1")).toEqual([]);
  });

  it("BAŞKA PANELDEKİ blok çarpışma saymaz — paneller bağımsız uzaylardır", () => {
    const d = doc();
    d.blocks = [blok("a", "dis-0", kutu(10, 10, 60, 40))];
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const r = placeBlock(d, panel, kutu(10, 10, 60, 40));
    expect(r.pushed).toBe(false);
    expect(r.box.y_mm).toBe(10);
  });

  it("KENDİSİYLE çarpışmaz — taşınan blok ignoreBlockId ile dışlanır", () => {
    const d = doc();
    d.blocks = [blok("a", "dis-1", kutu(10, 10, 60, 40))];
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const r = placeBlock(d, panel, kutu(10, 15, 60, 40), { ignoreBlockId: "a" });
    expect(r.pushed).toBe(false);
    expect(r.box.y_mm).toBe(15);
  });
});

describe("placeBlock — taşma dürüstçe bildirilir", () => {
  it("panel dolduğunda overflow=true (sessiz kırpma YOK)", () => {
    const d = doc({ safe_mm: 5 }); // dis-1 içerik yüksekliği 200
    d.blocks = [blok("a", "dis-1", kutu(5, 5, 60, 190))]; // 5..195
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    const r = placeBlock(d, panel, kutu(5, 5, 60, 40));
    expect(r.pushed).toBe(true);
    expect(r.box.y_mm).toBe(195);
    expect(r.overflow).toBe(true); // 195+40=235 > 205
  });

  it("sığan blokta overflow=false", () => {
    const d = doc({ safe_mm: 5 });
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    expect(placeBlock(d, panel, kutu(5, 5, 60, 40)).overflow).toBe(false);
  });

  it("SAF: placeBlock doc'u DEĞİŞTİRMEZ", () => {
    const d = doc();
    d.blocks = [blok("a", "dis-1", kutu(10, 10, 60, 40))];
    const anlik = JSON.stringify(d);
    const panel = panelsOf(d).find((p) => p.id === "dis-1")!;
    placeBlock(d, panel, kutu(10, 20, 60, 30));
    expect(JSON.stringify(d)).toBe(anlik);
  });
});

/* ── Teşhis ───────────────────────────────────────────────────────────── */

describe("collisionsIn / overflowingBlocks", () => {
  it("çakışan çift bulunur, çakışmayan bulunmaz", () => {
    const d = doc();
    d.blocks = [
      blok("a", "dis-1", kutu(10, 10, 60, 40)),
      blok("b", "dis-1", kutu(10, 30, 60, 40)), // çakışır
      blok("c", "dis-1", kutu(10, 90, 60, 20)), // temiz
    ];
    expect(collisionsIn(d, "dis-1")).toEqual([["a", "b"]]);
  });

  it("içerik alanını aşan blok ADIYLA bildirilir", () => {
    const d = doc({ safe_mm: 5 });
    d.blocks = [
      blok("tasan", "dis-1", kutu(5, 180, 60, 40)), // 220 > 205
      blok("temiz", "dis-1", kutu(5, 5, 60, 40)),
    ];
    expect(overflowingBlocks(d, "dis-1")).toEqual(["tasan"]);
  });

  it("bilinmeyen panel → boş liste (patlamaz)", () => {
    expect(overflowingBlocks(doc(), "boyle-bir-panel-yok")).toEqual([]);
  });
});

/* ── Şema korkulukları ────────────────────────────────────────────────── */

describe("LayoutDocSchema — korkuluklar", () => {
  it("varsayılanlar dolar: roll · 3mm pay · 5mm ızgara · v1", () => {
    const d = LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2 });
    expect(d.v).toBe(1);
    expect(d.fold_style).toBe("roll");
    expect(d.tuck_mm).toBe(3);
    expect(d.grid_mm).toBe(DEFAULT_GRID_MM);
    expect(d.blocks).toEqual([]);
  });

  it("grid_mm=0 REDDEDİLİR — ızgarasız yerleşim serbest koordinat kaosudur", () => {
    expect(() =>
      LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2, grid_mm: 0 })
    ).toThrow();
  });

  it("kırım sayısı 0/1/2 dışına çıkamaz", () => {
    expect(() => LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 3 })).toThrow();
  });

  it("bilinmeyen blok tipi REDDEDİLİR (kapalı sözlük)", () => {
    expect(() =>
      LayoutDocSchema.parse({
        format: "a4",
        orientation: "yatay",
        fold: 2,
        blocks: [{ id: "x", kind: "corel_bezier", panel_id: "dis-0", box: kutu(0, 0, 1, 1) }],
      })
    ).toThrow();
  });

  it("blok props BİLİNMEYEN anahtarı korur — yarının bloğu bugünü kırmaz", () => {
    const d = LayoutDocSchema.parse({
      format: "a4",
      orientation: "yatay",
      fold: 2,
      blocks: [
        { id: "x", kind: "hero_urun", panel_id: "dis-2", box: kutu(0, 0, 10, 10), props: { yarin: 1 } },
      ],
    });
    expect(d.blocks[0].props).toEqual({ yarin: 1 });
  });

  it("sıfır/negatif ölçülü blok REDDEDİLİR", () => {
    expect(() =>
      LayoutDocSchema.parse({
        format: "a4",
        orientation: "yatay",
        fold: 2,
        blocks: [{ id: "x", kind: "logo", panel_id: "dis-0", box: kutu(0, 0, 0, 10) }],
      })
    ).toThrow();
  });
});

describe("BLOCK_KINDS — palet sözleşmesi", () => {
  it("ürün sahibinin kütüphanesindeki yerleşim tipleri karşılanır", () => {
    for (const k of [
      "kategori_basligi",
      "urun_karti",
      "urun_gridi",
      "fiyat_listesi",
      "hero_urun",
      "gorsel",
      "logo",
      "iletisim",
      "kampanya",
      "qr",
      "bilgi",
      "ayrac",
    ]) {
      expect(BLOCK_KINDS).toContain(k);
    }
  });

  it("PALET ≠ MOTOR: içecek listesi ayrı TİP değildir (fiyat_listesi ön ayarı)", () => {
    expect(BLOCK_KINDS).not.toContain("icecek_listesi");
    expect(BLOCK_KINDS).toContain("fiyat_listesi");
  });
});
