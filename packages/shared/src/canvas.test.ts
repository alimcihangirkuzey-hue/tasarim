/* P2 CV1-3 korkuluk testleri (katmanlı modele TAŞINDI — iddialar aynen) +
   P3 LY1 katman testleri: şema · aksiyonlar · kilit/görünürlük korkulukları ·
   son-katman-silinemez · CD round-trip · geçmiş yardımcıları. */

import { describe, expect, it } from "vitest";
import {
  CANVAS_GRID,
  CANVAS_HISTORY_MAX,
  CANVAS_HISTORY_SKIP,
  CANVAS_MIN_SIZE,
  CANVAS_SCENE,
  CANVAS_TEXT_MAX,
  CANVAS_TOOLS,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
  CanvasDocSchema,
  EMPTY_CANVAS,
  activeLayer,
  canEditActive,
  canvasDocFromState,
  canvasReduce,
  canvasStateFromDoc,
  clampToBounds,
  makeLayer,
  pushPast,
  shapeAtPoint,
  snapToGrid,
  zoomAt,
  type CanvasState,
} from "./canvas.js";

const B = { w: 900, h: 600 };
const add = (id: string, kind: string, at = { x: 100, y: 100 }) =>
  ({ type: "add", id, kind, at }) as Parameters<typeof canvasReduce>[1];
/** Aktif katmanın şekilleri (eski testlerin `state.shapes` erişimi) */
const sh = (s: CanvasState) => activeLayer(s)!.shapes;

describe("izin-listeli araç seti (ADR-002 — serbest çizim yok)", () => {
  it("araç kümesi sabit: select · rect · ellipse · text", () => {
    expect([...CANVAS_TOOLS]).toEqual(["select", "rect", "ellipse", "text"]);
  });

  it("add: 'select' ve bilinmeyen tür ŞEKİL EKLEYEMEZ (no-op)", () => {
    expect(canvasReduce(EMPTY_CANVAS, add("s1", "select"), B)).toBe(EMPTY_CANVAS);
    expect(canvasReduce(EMPTY_CANVAS, add("s1", "pen"), B)).toBe(EMPTY_CANVAS);
  });
});

describe("snapToGrid (ızgara)", () => {
  it("en yakın çizgiye yuvarlar (varsayılan ızgara 10)", () => {
    expect(CANVAS_GRID).toBe(10);
    expect(snapToGrid(13)).toBe(10);
    expect(snapToGrid(15)).toBe(20);
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(-13)).toBe(-10);
  });
});

describe("clampToBounds (sahne kilidi — dışarı taşma yok)", () => {
  it("içerideki şekil aynen kalır", () => {
    expect(clampToBounds({ x: 50, y: 60, w: 100, h: 80 }, B)).toEqual({ x: 50, y: 60, w: 100, h: 80 });
  });

  it("negatif/taşan konum kenara kilitlenir", () => {
    expect(clampToBounds({ x: -30, y: -5, w: 100, h: 80 }, B)).toEqual({ x: 0, y: 0, w: 100, h: 80 });
    expect(clampToBounds({ x: 880, y: 590, w: 100, h: 80 }, B)).toEqual({ x: 800, y: 520, w: 100, h: 80 });
  });

  it("sahneden büyük şekil önce sahneye kırpılır", () => {
    expect(clampToBounds({ x: 10, y: 10, w: 2000, h: 900 }, B)).toEqual({ x: 0, y: 0, w: 900, h: 600 });
  });
});

describe("zoomAt (işaretçi-odaklı; tavan/taban kilidi)", () => {
  const view = { scale: 1, x: 40, y: 40 };

  it("işaretçinin altındaki dünya-noktası sabit kalır", () => {
    const pointer = { x: 300, y: 200 };
    const before = { x: (pointer.x - view.x) / view.scale, y: (pointer.y - view.y) / view.scale };
    const next = zoomAt(view, pointer, 1);
    const after = { x: (pointer.x - next.x) / next.scale, y: (pointer.y - next.y) / next.scale };
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(next.scale).toBeCloseTo(1.1, 6);
  });

  it("küçültme yönü çalışır; ölçek [0.25, 4] dışına ÇIKAMAZ", () => {
    expect(zoomAt(view, { x: 0, y: 0 }, -1).scale).toBeCloseTo(1 / 1.1, 6);
    expect(zoomAt({ ...view, scale: CANVAS_ZOOM_MAX }, { x: 0, y: 0 }, 1).scale).toBe(CANVAS_ZOOM_MAX);
    expect(zoomAt({ ...view, scale: CANVAS_ZOOM_MIN }, { x: 0, y: 0 }, -1).scale).toBe(CANVAS_ZOOM_MIN);
  });
});

describe("canvasReduce — add/select (aktif katmanda)", () => {
  it("rect ekler, snap'ler, seçer; text 'Metin' ile doğar", () => {
    const s1 = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 13, y: 17 }), B);
    expect(sh(s1)).toHaveLength(1);
    expect(sh(s1)[0]).toMatchObject({ id: "r1", kind: "rect", x: 10, y: 20, w: 120, h: 80 });
    expect(s1.selectedId).toBe("r1");
    const s2 = canvasReduce(s1, add("t1", "text", { x: 400, y: 300 }), B);
    expect(sh(s2)[1]).toMatchObject({ kind: "text", text: "Metin" });
  });

  it("sahne dışına ekleme kenara kilitlenir (clamp)", () => {
    const s = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 890, y: 590 }), B);
    expect(sh(s)[0].x).toBe(B.w - 120);
    expect(sh(s)[0].y).toBe(B.h - 80);
  });

  it("select: olmayan id no-op; null seçim temizler", () => {
    const s1 = canvasReduce(EMPTY_CANVAS, add("r1", "rect"), B);
    expect(canvasReduce(s1, { type: "select", id: "yok" }, B)).toBe(s1);
    expect(canvasReduce(s1, { type: "select", id: null }, B).selectedId).toBeNull();
  });
});

describe("canvasReduce — move/resize korkulukları", () => {
  const base = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);

  it("move: sahne dışına sürükleme kilitlenir + snap", () => {
    const s = canvasReduce(base, { type: "move", id: "r1", x: -55, y: 233 }, B);
    expect(sh(s)[0].x).toBe(0);
    expect(sh(s)[0].y).toBe(230);
  });

  it("resize: CANVAS_MIN_SIZE altına İNEMEZ", () => {
    const s = canvasReduce(base, { type: "resize", id: "r1", x: 100, y: 100, w: 3, h: 5, snap: false }, B);
    expect(sh(s)[0].w).toBe(CANVAS_MIN_SIZE);
    expect(sh(s)[0].h).toBe(CANVAS_MIN_SIZE);
  });

  it("resize: sahneyi taşan kutu içeri kırpılır", () => {
    const s = canvasReduce(base, { type: "resize", id: "r1", x: 800, y: 550, w: 400, h: 300 }, B);
    const r = sh(s)[0];
    expect(r.x + r.w).toBeLessThanOrEqual(B.w);
    expect(r.y + r.h).toBeLessThanOrEqual(B.h);
  });

  it("olmayan id: move/resize no-op", () => {
    expect(canvasReduce(base, { type: "move", id: "yok", x: 0, y: 0 }, B)).toBe(base);
    expect(canvasReduce(base, { type: "resize", id: "yok", x: 0, y: 0, w: 50, h: 50 }, B)).toBe(base);
  });
});

describe("canvasReduce — set_text/remove", () => {
  const withText = canvasReduce(
    canvasReduce(EMPTY_CANVAS, add("t1", "text"), B),
    add("r1", "rect", { x: 400, y: 300 }),
    B
  );

  it("set_text yalnız text türünde çalışır; CANVAS_TEXT_MAX'ta kesilir", () => {
    const s = canvasReduce(withText, { type: "set_text", id: "t1", text: "x".repeat(500) }, B);
    expect(sh(s)[0].text).toHaveLength(CANVAS_TEXT_MAX);
    expect(canvasReduce(withText, { type: "set_text", id: "r1", text: "olmaz" }, B)).toBe(withText);
  });

  it("remove: şekli siler, seçiliyse seçimi temizler; başka seçim korunur", () => {
    const sel = canvasReduce(withText, { type: "select", id: "t1" }, B);
    const s = canvasReduce(sel, { type: "remove", id: "t1" }, B);
    expect(sh(s).map((x) => x.id)).toEqual(["r1"]);
    expect(s.selectedId).toBeNull();
    const sel2 = canvasReduce(withText, { type: "select", id: "r1" }, B);
    expect(canvasReduce(sel2, { type: "remove", id: "t1" }, B).selectedId).toBe("r1");
  });
});

describe("CV1-FIX-01/FIX-A — shapeAtPoint + add-üstüne-tıklama = SEÇİM (GT m.13a)", () => {
  const two = canvasReduce(
    canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B),
    add("r2", "rect", { x: 400, y: 100 }),
    B
  );

  it("shapeAtPoint: içerideki nokta şekli bulur, boştaki null; ellipse dahil BBOX semantiği", () => {
    expect(shapeAtPoint(sh(two), { x: 150, y: 130 })?.id).toBe("r1");
    expect(shapeAtPoint(sh(two), { x: 700, y: 500 })).toBeNull();
  });

  it("üstteki kazanır: çakışan iki şekilde SONRA eklenen seçilir", () => {
    const stacked = canvasReduce(two, { type: "move", id: "r2", x: 100, y: 100 }, B);
    const s = canvasReduce(stacked, add("r3", "rect", { x: 150, y: 130 }), B);
    expect(sh(s)).toHaveLength(2);
    expect(s.selectedId).toBe("r2");
  });

  it("add-mode'da mevcut şeklin ÜSTÜNE tıklama: şekil SAYISI SABİT + o şekil seçilir", () => {
    const s = canvasReduce(two, add("r9", "rect", { x: 150, y: 130 }), B);
    expect(sh(s)).toHaveLength(2);
    expect(s.selectedId).toBe("r1");
    expect(sh(s).some((x) => x.id === "r9")).toBe(false);
  });

  it("hit-test HAM noktayla yapılır (snap'ten önce)", () => {
    const one = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);
    const s = canvasReduce(one, add("rX", "rect", { x: 104, y: 104 }), B);
    expect(sh(s)).toHaveLength(1);
    expect(s.selectedId).toBe("r1");
  });
});

describe("saflık (girdi state mutate edilmez)", () => {
  it("reducer önceki state'i değiştirmez", () => {
    const s1 = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);
    const snapshot = JSON.stringify(s1);
    canvasReduce(s1, { type: "move", id: "r1", x: 500, y: 400 }, B);
    canvasReduce(s1, { type: "remove", id: "r1" }, B);
    canvasReduce(s1, { type: "layer_add", id: "ly_2" }, B);
    expect(JSON.stringify(s1)).toBe(snapshot);
    expect(EMPTY_CANVAS.layers).toHaveLength(1);
  });

  it("varsayılan sınır CANVAS_SCENE'dir (900×600)", () => {
    expect(CANVAS_SCENE).toEqual({ w: 900, h: 600 });
    const s = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 5000, y: 5000 }));
    expect(sh(s)[0].x).toBe(CANVAS_SCENE.w - 120);
  });
});

/* ================= P3 LY1 — KATMAN TESTLERİ ================= */

describe("LY1 — katman aksiyonları (tek-kapı genişledi)", () => {
  const two = canvasReduce(EMPTY_CANVAS, { type: "layer_add", id: "ly_2" }, B);

  it("layer_add: ÜSTE ekler, aktif yapar, seçim temizlenir; ad otomatik", () => {
    expect(two.layers.map((l) => l.id)).toEqual(["ly_1", "ly_2"]);
    expect(two.activeLayerId).toBe("ly_2");
    expect(two.layers[1].name).toBe("Katman 2");
    expect(two.selectedId).toBeNull();
  });

  it("layer_activate: geçerli id aktifleşir + seçim temizlenir; olmayan id no-op", () => {
    const withSel = canvasReduce(two, add("r1", "rect"), B);
    const s = canvasReduce(withSel, { type: "layer_activate", id: "ly_1" }, B);
    expect(s.activeLayerId).toBe("ly_1");
    expect(s.selectedId).toBeNull();
    expect(canvasReduce(two, { type: "layer_activate", id: "yok" }, B)).toBe(two);
  });

  it("add şekli AKTİF katmana gider (alt katman etkilenmez)", () => {
    const s = canvasReduce(two, add("r1", "rect"), B);
    expect(s.layers[1].shapes).toHaveLength(1);
    expect(s.layers[0].shapes).toHaveLength(0);
  });

  it("layer_reorder: komşuyla yer değiştirir; sınırda no-op", () => {
    const up = canvasReduce(two, { type: "layer_reorder", id: "ly_1", dir: 1 }, B);
    expect(up.layers.map((l) => l.id)).toEqual(["ly_2", "ly_1"]);
    expect(canvasReduce(two, { type: "layer_reorder", id: "ly_2", dir: 1 }, B)).toBe(two);
    expect(canvasReduce(two, { type: "layer_reorder", id: "ly_1", dir: -1 }, B)).toBe(two);
  });

  it("layer_remove: siler; aktifse komşusu aktifleşir; SON katman SİLİNEMEZ", () => {
    const s = canvasReduce(two, { type: "layer_remove", id: "ly_2" }, B);
    expect(s.layers.map((l) => l.id)).toEqual(["ly_1"]);
    expect(s.activeLayerId).toBe("ly_1");
    expect(canvasReduce(s, { type: "layer_remove", id: "ly_1" }, B)).toBe(s);
  });

  it("layer_lock / layer_visible bayrakları immutably değişir", () => {
    const locked = canvasReduce(two, { type: "layer_lock", id: "ly_2", locked: true }, B);
    expect(locked.layers[1].locked).toBe(true);
    const hidden = canvasReduce(two, { type: "layer_visible", id: "ly_2", visible: false }, B);
    expect(hidden.layers[1].visible).toBe(false);
    expect(two.layers[1].locked).toBe(false);
  });
});

/* ============ P3 LY2c — BULGU-1 speci: katman silme (ürün sahibi) ============ */

describe("LY2c — katman silme: transaction + kenar durumları", () => {
  /* ly_2 aktif ve 2 şekilli; ly_1'de 1 şekil */
  const base = (() => {
    let s = canvasReduce(EMPTY_CANVAS, add("a1", "rect"), B);
    s = canvasReduce(s, { type: "layer_add", id: "ly_2" }, B);
    s = canvasReduce(s, add("b1", "rect"), B);
    s = canvasReduce(s, add("b2", "ellipse", { x: 300, y: 200 }), B);
    return s;
  })();

  it("TRANSACTION: katman TÜM şekilleriyle TEK reduce'ta gider; diğer katman aynen", () => {
    const s = canvasReduce(base, { type: "layer_remove", id: "ly_2" }, B);
    expect(s.layers.map((l) => l.id)).toEqual(["ly_1"]);
    expect(s.layers.flatMap((l) => l.shapes.map((x) => x.id))).toEqual(["a1"]);
    expect(s.activeLayerId).toBe("ly_1");
  });

  it("undo/redo TEK-girdilik zincir: girdi state bozulmaz (undo snapshot'ı sağlam) + reduce deterministik (redo eşdeğeri)", () => {
    /* Store geçmişi snapshot-temellidir (1 dispatch = 1 past girdisi): silme tek
       aksiyon olduğundan undo = base'i TEK adımda geri getirir, redo = TEK adımda
       yeniden siler. Saf katmandaki karşılığı: girdi değişmezliği + determinizm. */
    const snap = JSON.stringify(base);
    const s1 = canvasReduce(base, { type: "layer_remove", id: "ly_2" }, B);
    expect(JSON.stringify(base)).toBe(snap);
    const s2 = canvasReduce(base, { type: "layer_remove", id: "ly_2" }, B);
    expect(JSON.stringify(s2)).toBe(JSON.stringify(s1));
  });

  it("KENAR: kilitli katman silinemez — no-op (geçmişe girmez, tost çıkmaz)", () => {
    const locked = canvasReduce(base, { type: "layer_lock", id: "ly_2", locked: true }, B);
    expect(canvasReduce(locked, { type: "layer_remove", id: "ly_2" }, B)).toBe(locked);
  });

  it("KENAR: kilit açılınca silinebilir; son-katman guard'ı yaşıyor", () => {
    const locked = canvasReduce(base, { type: "layer_lock", id: "ly_2", locked: true }, B);
    const unlocked = canvasReduce(locked, { type: "layer_lock", id: "ly_2", locked: false }, B);
    const s = canvasReduce(unlocked, { type: "layer_remove", id: "ly_2" }, B);
    expect(s.layers).toHaveLength(1);
    expect(canvasReduce(s, { type: "layer_remove", id: "ly_1" }, B)).toBe(s);
  });
});

describe("LY1 — kilit/görünürlük korkulukları (m.13a dersi: no-op + görünür durum)", () => {
  const withShape = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);
  const locked = canvasReduce(withShape, { type: "layer_lock", id: "ly_1", locked: true }, B);
  const hidden = canvasReduce(withShape, { type: "layer_visible", id: "ly_1", visible: false }, B);

  it("canEditActive: kilitli ya da gizli aktif katmanda FALSE", () => {
    expect(canEditActive(withShape)).toBe(true);
    expect(canEditActive(locked)).toBe(false);
    expect(canEditActive(hidden)).toBe(false);
  });

  it("kilitli katman: add/move/resize/remove/set_text NO-OP", () => {
    expect(canvasReduce(locked, add("r9", "rect", { x: 400, y: 300 }), B)).toBe(locked);
    expect(canvasReduce(locked, { type: "move", id: "r1", x: 500, y: 400 }, B)).toBe(locked);
    expect(canvasReduce(locked, { type: "resize", id: "r1", x: 0, y: 0, w: 50, h: 50 }, B)).toBe(locked);
    expect(canvasReduce(locked, { type: "remove", id: "r1" }, B)).toBe(locked);
  });

  it("gizli katman: sahne mutasyonları NO-OP (görünmeze çizilmez — m.13a)", () => {
    expect(canvasReduce(hidden, add("r9", "rect", { x: 400, y: 300 }), B)).toBe(hidden);
    expect(canvasReduce(hidden, { type: "remove", id: "r1" }, B)).toBe(hidden);
  });

  it("kilitli katmanda SEÇİM serbest (bilgi amaçlı) — mutasyon değil", () => {
    expect(canvasReduce(locked, { type: "select", id: "r1" }, B).selectedId).toBe("r1");
  });
});

describe("LY1 — CanvasDocSchema + CD round-trip (kalıcılık çekirdeği)", () => {
  it("boş obje default'larla dolar (v:1, layers:[])", () => {
    expect(CanvasDocSchema.parse({})).toEqual({ v: 1, layers: [] });
  });

  it("katman default'ları: locked=false, visible=true, shapes=[]", () => {
    const d = CanvasDocSchema.parse({ layers: [{ id: "ly_1", name: "A" }] });
    expect(d.layers[0]).toEqual({ id: "ly_1", name: "A", locked: false, visible: true, shapes: [] });
  });

  it("state→doc→state round-trip katmanları AYNEN korur", () => {
    const s1 = canvasReduce(
      canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B),
      { type: "layer_add", id: "ly_2" },
      B
    );
    const doc = canvasDocFromState(s1);
    expect(doc.v).toBe(1);
    const s2 = canvasStateFromDoc(doc);
    expect(s2.layers).toEqual(s1.layers);
    expect(s2.activeLayerId).toBe("ly_2"); // en üst katman aktif açılır
  });

  it("canvasStateFromDoc: null/boş → tek boş katman (eski belge davranışı)", () => {
    const s = canvasStateFromDoc(null);
    expect(s.layers).toHaveLength(1);
    expect(s.layers[0].shapes).toHaveLength(0);
    expect(canvasStateFromDoc({ v: 1, layers: [] }).layers).toHaveLength(1);
  });

  it("bilinmeyen v reddedilir (additive-only; v2 yalnız kırıcıda)", () => {
    expect(() => CanvasDocSchema.parse({ v: 2, layers: [] })).toThrow();
  });
});

describe("LY4 — geçmiş yardımcıları (saf)", () => {
  it("pushPast: derinlik CANVAS_HISTORY_MAX'ta kelepçelenir", () => {
    let past: number[] = [];
    for (let i = 0; i < 60; i++) past = pushPast(past, i, CANVAS_HISTORY_MAX);
    expect(past).toHaveLength(CANVAS_HISTORY_MAX);
    expect(past[0]).toBe(10);
    expect(past[past.length - 1]).toBe(59);
  });

  it("CANVAS_HISTORY_SKIP: seçim/aktivasyon geçmişe girmez; mutasyonlar girer", () => {
    expect(CANVAS_HISTORY_SKIP.has("select")).toBe(true);
    expect(CANVAS_HISTORY_SKIP.has("layer_activate")).toBe(true);
    expect(CANVAS_HISTORY_SKIP.has("add")).toBe(false);
    expect(CANVAS_HISTORY_SKIP.has("layer_remove")).toBe(false);
  });
});

describe("LY1 — makeLayer/EMPTY sabitleri", () => {
  it("EMPTY_CANVAS: tek katman 'Katman 1', aktif ve düzenlenebilir", () => {
    expect(EMPTY_CANVAS.layers[0].name).toBe("Katman 1");
    expect(EMPTY_CANVAS.activeLayerId).toBe("ly_1");
    expect(canEditActive(EMPTY_CANVAS)).toBe(true);
  });

  it("makeLayer: kilitsiz+görünür+boş doğar", () => {
    expect(makeLayer("x", "Ad")).toEqual({ id: "x", name: "Ad", locked: false, visible: true, shapes: [] });
  });
});
