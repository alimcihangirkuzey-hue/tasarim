/* P2 CAP-CANVAS-01 (CV1-3) — korkuluk saf-fonksiyon testleri (Konva'sız).
   ADR-002: izin-listeli araç · sahne kilidi · ızgara · min-boyut · zoom tavanı. */

import { describe, expect, it } from "vitest";
import {
  CANVAS_GRID,
  CANVAS_MIN_SIZE,
  CANVAS_SCENE,
  CANVAS_TEXT_MAX,
  CANVAS_TOOLS,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
  EMPTY_CANVAS,
  canvasReduce,
  clampToBounds,
  shapeAtPoint,
  snapToGrid,
  zoomAt,
  type CanvasState,
} from "./canvas.js";

const B = { w: 900, h: 600 };
const add = (id: string, kind: string, at = { x: 100, y: 100 }) =>
  ({ type: "add", id, kind, at }) as Parameters<typeof canvasReduce>[1];

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
    const worldBefore = { x: (pointer.x - view.x) / view.scale, y: (pointer.y - view.y) / view.scale };
    const next = zoomAt(view, pointer, 1);
    const worldAfter = { x: (pointer.x - next.x) / next.scale, y: (pointer.y - next.y) / next.scale };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
    expect(next.scale).toBeCloseTo(1.1, 6);
  });

  it("küçültme yönü çalışır; ölçek [0.25, 4] dışına ÇIKAMAZ", () => {
    expect(zoomAt(view, { x: 0, y: 0 }, -1).scale).toBeCloseTo(1 / 1.1, 6);
    expect(zoomAt({ ...view, scale: CANVAS_ZOOM_MAX }, { x: 0, y: 0 }, 1).scale).toBe(CANVAS_ZOOM_MAX);
    expect(zoomAt({ ...view, scale: CANVAS_ZOOM_MIN }, { x: 0, y: 0 }, -1).scale).toBe(CANVAS_ZOOM_MIN);
  });
});

describe("canvasReduce — add/select", () => {
  it("rect ekler, snap'ler, seçer; text 'Metin' ile doğar", () => {
    const s1 = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 13, y: 17 }), B);
    expect(s1.shapes).toHaveLength(1);
    expect(s1.shapes[0]).toMatchObject({ id: "r1", kind: "rect", x: 10, y: 20, w: 120, h: 80 });
    expect(s1.selectedId).toBe("r1");
    /* FIX-A sonrası fixture: ikinci şekil BOŞ noktaya (ilkiyle çakışmasın) */
    const s2 = canvasReduce(s1, add("t1", "text", { x: 400, y: 300 }), B);
    expect(s2.shapes[1]).toMatchObject({ kind: "text", text: "Metin" });
  });

  it("sahne dışına ekleme kenara kilitlenir (clamp)", () => {
    const s = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 890, y: 590 }), B);
    expect(s.shapes[0].x).toBe(B.w - 120);
    expect(s.shapes[0].y).toBe(B.h - 80);
  });

  it("select: olmayan id no-op; null seçim temizler", () => {
    const s1 = canvasReduce(EMPTY_CANVAS, add("r1", "rect"), B);
    expect(canvasReduce(s1, { type: "select", id: "yok" }, B)).toBe(s1);
    expect(canvasReduce(s1, { type: "select", id: null }, B).selectedId).toBeNull();
  });
});

describe("canvasReduce — move/resize korkulukları", () => {
  const base: CanvasState = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);

  it("move: sahne dışına sürükleme kilitlenir + snap", () => {
    const s = canvasReduce(base, { type: "move", id: "r1", x: -55, y: 233 }, B);
    expect(s.shapes[0].x).toBe(0);
    expect(s.shapes[0].y).toBe(230);
  });

  it("resize: CANVAS_MIN_SIZE altına İNEMEZ", () => {
    const s = canvasReduce(base, { type: "resize", id: "r1", x: 100, y: 100, w: 3, h: 5, snap: false }, B);
    expect(s.shapes[0].w).toBe(CANVAS_MIN_SIZE);
    expect(s.shapes[0].h).toBe(CANVAS_MIN_SIZE);
  });

  it("resize: sahneyi taşan kutu içeri kırpılır", () => {
    const s = canvasReduce(base, { type: "resize", id: "r1", x: 800, y: 550, w: 400, h: 300 }, B);
    const r = s.shapes[0];
    expect(r.x + r.w).toBeLessThanOrEqual(B.w);
    expect(r.y + r.h).toBeLessThanOrEqual(B.h);
  });

  it("olmayan id: move/resize no-op", () => {
    expect(canvasReduce(base, { type: "move", id: "yok", x: 0, y: 0 }, B)).toBe(base);
    expect(canvasReduce(base, { type: "resize", id: "yok", x: 0, y: 0, w: 50, h: 50 }, B)).toBe(base);
  });
});

describe("canvasReduce — set_text/remove", () => {
  /* FIX-A sonrası fixture: iki şekil AYRIK noktalara (çakışma seçime dönüşürdü) */
  const withText = canvasReduce(
    canvasReduce(EMPTY_CANVAS, add("t1", "text"), B),
    add("r1", "rect", { x: 400, y: 300 }),
    B
  );

  it("set_text yalnız text türünde çalışır; CANVAS_TEXT_MAX'ta kesilir", () => {
    const s = canvasReduce(withText, { type: "set_text", id: "t1", text: "x".repeat(500) }, B);
    expect(s.shapes[0].text).toHaveLength(CANVAS_TEXT_MAX);
    expect(canvasReduce(withText, { type: "set_text", id: "r1", text: "olmaz" }, B)).toBe(withText);
  });

  it("remove: şekli siler, seçiliyse seçimi temizler; başka seçim korunur", () => {
    const sel = canvasReduce(withText, { type: "select", id: "t1" }, B);
    const s = canvasReduce(sel, { type: "remove", id: "t1" }, B);
    expect(s.shapes.map((x) => x.id)).toEqual(["r1"]);
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
    expect(shapeAtPoint(two.shapes, { x: 150, y: 130 })?.id).toBe("r1");
    expect(shapeAtPoint(two.shapes, { x: 700, y: 500 })).toBeNull();
  });

  it("üstteki kazanır: çakışan iki şekilde SONRA eklenen seçilir", () => {
    const stacked = canvasReduce(two, { type: "move", id: "r2", x: 100, y: 100 }, B);
    const s = canvasReduce(stacked, add("r3", "rect", { x: 150, y: 130 }), B);
    expect(s.shapes).toHaveLength(2);
    expect(s.selectedId).toBe("r2");
  });

  it("add-mode'da mevcut şeklin ÜSTÜNE tıklama: şekil SAYISI SABİT + o şekil seçilir (çoğalma biter)", () => {
    const s = canvasReduce(two, add("r9", "rect", { x: 150, y: 130 }), B);
    expect(s.shapes).toHaveLength(2);
    expect(s.selectedId).toBe("r1");
    expect(s.shapes.some((x) => x.id === "r9")).toBe(false);
  });

  it("hit-test HAM noktayla yapılır (snap'ten önce — kenar tıklaması komşu boşluğa kaçmaz)", () => {
    const one = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);
    const s = canvasReduce(one, add("rX", "rect", { x: 104, y: 104 }), B);
    expect(s.shapes).toHaveLength(1);
    expect(s.selectedId).toBe("r1");
  });
});

describe("saflık (girdi state mutate edilmez)", () => {
  it("reducer önceki state'i değiştirmez", () => {
    const s1 = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 100, y: 100 }), B);
    const snapshot = JSON.stringify(s1);
    canvasReduce(s1, { type: "move", id: "r1", x: 500, y: 400 }, B);
    canvasReduce(s1, { type: "remove", id: "r1" }, B);
    expect(JSON.stringify(s1)).toBe(snapshot);
    expect(EMPTY_CANVAS).toEqual({ shapes: [], selectedId: null });
  });

  it("varsayılan sınır CANVAS_SCENE'dir (900×600)", () => {
    expect(CANVAS_SCENE).toEqual({ w: 900, h: 600 });
    const s = canvasReduce(EMPTY_CANVAS, add("r1", "rect", { x: 5000, y: 5000 }));
    expect(s.shapes[0].x).toBe(CANVAS_SCENE.w - 120);
  });
});
