/* P2 CAP-CANVAS-01 (CV1-3) — canvas korkuluk çekirdeği, SAF (Konva'sız test edilir).
   ADR-002 (federasyon şerhli): korkuluklu Konva — serbest kanvas DEĞİL. Web katmanı
   (canvasStore/AtolyePage) TÜM içerik mutasyonlarını canvasReduce'tan geçirir →
   korkuluk TEK kapıda: izin-listeli araç seti · sahne-sınırı kilidi (clampToBounds) ·
   ızgara (snapToGrid) · min-boyut (kısıtlı Transformer) · işaretçi-odaklı zoom
   tavan/tabanı. Kalıcılık/CD bağı YOK (D-35(c)); K3'te CD'ye additive alanla bağlanır. */

export const CANVAS_TOOLS = ["select", "rect", "ellipse", "text"] as const;
export type CanvasTool = (typeof CANVAS_TOOLS)[number];
export type CanvasShapeKind = Exclude<CanvasTool, "select">;

export const CANVAS_SCENE = { w: 900, h: 600 } as const;
export const CANVAS_MIN_SIZE = 12;
export const CANVAS_GRID = 10;
export const CANVAS_ZOOM_MIN = 0.25;
export const CANVAS_ZOOM_MAX = 4;
export const CANVAS_TEXT_MAX = 200;

export interface CanvasBounds {
  w: number;
  h: number;
}

export interface CanvasShape {
  id: string;
  kind: CanvasShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
}

export interface CanvasView {
  scale: number;
  x: number;
  y: number;
}

export interface CanvasState {
  shapes: CanvasShape[];
  selectedId: string | null;
}

export const EMPTY_CANVAS: CanvasState = { shapes: [], selectedId: null };

/** Izgara yapıştırması — en yakın ızgara çizgisine yuvarlar. */
export function snapToGrid(v: number, grid: number = CANVAS_GRID): number {
  return Math.round(v / grid) * grid;
}

/* Sahne-sınırı kilidi: şekil sahnenin İÇİNDE kalır (dışarı taşma yok — ADR-002
   kısıtlı yerleşim). Sahneden büyük şekil önce sahne boyutuna kırpılır. */
export function clampToBounds(
  shape: { x: number; y: number; w: number; h: number },
  bounds: CanvasBounds
): { x: number; y: number; w: number; h: number } {
  const w = Math.min(shape.w, bounds.w);
  const h = Math.min(shape.h, bounds.h);
  const x = Math.min(Math.max(0, shape.x), bounds.w - w);
  const y = Math.min(Math.max(0, shape.y), bounds.h - h);
  return { x, y, w, h };
}

/* İşaretçi-odaklı zoom hesabı: işaretçinin ALTINDAKİ dünya-noktası sabit kalır;
   ölçek [min, max] aralığına kilitlenir (korkuluk: sonsuz zoom yok). */
export function zoomAt(
  view: CanvasView,
  pointer: { x: number; y: number },
  direction: 1 | -1,
  factor = 1.1,
  min: number = CANVAS_ZOOM_MIN,
  max: number = CANVAS_ZOOM_MAX
): CanvasView {
  const next = Math.min(max, Math.max(min, direction > 0 ? view.scale * factor : view.scale / factor));
  const world = { x: (pointer.x - view.x) / view.scale, y: (pointer.y - view.y) / view.scale };
  return { scale: next, x: pointer.x - world.x * next, y: pointer.y - world.y * next };
}

/** Araç → yeni şeklin varsayılan boyutu (iskelet sabitleri). */
const DEFAULT_SIZE: Record<CanvasShapeKind, { w: number; h: number }> = {
  rect: { w: 120, h: 80 },
  ellipse: { w: 120, h: 80 },
  text: { w: 160, h: 24 },
};

/* CV1-FIX-01/FIX-A — nokta hit-testi (üstteki kazanır = dizinin SONU; iskelet
   semantiği: ellipse dahil BBOX kutusu — basit ve öngörülebilir). GT m.13a kökü:
   add-mode'da mevcut şeklin üstüne tıklama YENİ şekil doğuruyordu (üst üste
   piksel-özdeş çoğalma); artık reducer düzeyinde SEÇİME çevrilir. */
export function shapeAtPoint(
  shapes: CanvasShape[],
  p: { x: number; y: number }
): CanvasShape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return s;
  }
  return null;
}

export type CanvasAction =
  | { type: "add"; id: string; kind: CanvasTool; at: { x: number; y: number }; snap?: boolean }
  | { type: "select"; id: string | null }
  | { type: "move"; id: string; x: number; y: number; snap?: boolean }
  | { type: "resize"; id: string; x: number; y: number; w: number; h: number; snap?: boolean }
  | { type: "set_text"; id: string; text: string }
  | { type: "remove"; id: string };

/* Seçim/içerik reducer'ı — SAF; girdi state MUTATE EDİLMEZ. Korkuluklar:
   add yalnız izin-listeli şekil türleriyle ("select"/bilinmeyen → no-op) ·
   move/resize/add clampToBounds'tan geçer · resize CANVAS_MIN_SIZE altına inemez ·
   text CANVAS_TEXT_MAX'ta kesilir · olmayan id → no-op (fail-quiet: UI durumu). */
export function canvasReduce(
  state: CanvasState,
  action: CanvasAction,
  bounds: CanvasBounds = CANVAS_SCENE
): CanvasState {
  switch (action.type) {
    case "add": {
      if (action.kind === "select" || !CANVAS_TOOLS.includes(action.kind)) return state;
      /* FIX-A (GT m.13a): tıklanan nokta MEVCUT bir şeklin üstündeyse ekleme
         DEĞİL seçim — çoğalma reducer'da ölür (ham `at` ile, snap'ten önce). */
      const hit = shapeAtPoint(state.shapes, action.at);
      if (hit) return { ...state, selectedId: hit.id };
      const kind = action.kind as CanvasShapeKind;
      const size = DEFAULT_SIZE[kind];
      const snap = action.snap !== false;
      const raw = {
        x: snap ? snapToGrid(action.at.x) : action.at.x,
        y: snap ? snapToGrid(action.at.y) : action.at.y,
        w: size.w,
        h: size.h,
      };
      const c = clampToBounds(raw, bounds);
      const shape: CanvasShape = {
        id: action.id,
        kind,
        ...c,
        ...(kind === "text" ? { text: "Metin" } : {}),
      };
      return { shapes: [...state.shapes, shape], selectedId: shape.id };
    }
    case "select": {
      if (action.id !== null && !state.shapes.some((s) => s.id === action.id)) return state;
      return { ...state, selectedId: action.id };
    }
    case "move": {
      const cur = state.shapes.find((s) => s.id === action.id);
      if (!cur) return state;
      const snap = action.snap !== false;
      const c = clampToBounds(
        {
          x: snap ? snapToGrid(action.x) : action.x,
          y: snap ? snapToGrid(action.y) : action.y,
          w: cur.w,
          h: cur.h,
        },
        bounds
      );
      return {
        ...state,
        shapes: state.shapes.map((s) => (s.id === action.id ? { ...s, x: c.x, y: c.y } : s)),
      };
    }
    case "resize": {
      const cur = state.shapes.find((s) => s.id === action.id);
      if (!cur) return state;
      const snap = action.snap !== false;
      const w = Math.max(CANVAS_MIN_SIZE, snap ? snapToGrid(action.w) : action.w);
      const h = Math.max(CANVAS_MIN_SIZE, snap ? snapToGrid(action.h) : action.h);
      const c = clampToBounds(
        { x: snap ? snapToGrid(action.x) : action.x, y: snap ? snapToGrid(action.y) : action.y, w, h },
        bounds
      );
      return {
        ...state,
        shapes: state.shapes.map((s) => (s.id === action.id ? { ...s, ...c } : s)),
      };
    }
    case "set_text": {
      const cur = state.shapes.find((s) => s.id === action.id);
      if (!cur || cur.kind !== "text") return state;
      const text = action.text.slice(0, CANVAS_TEXT_MAX);
      return {
        ...state,
        shapes: state.shapes.map((s) => (s.id === action.id ? { ...s, text } : s)),
      };
    }
    case "remove": {
      if (!state.shapes.some((s) => s.id === action.id)) return state;
      return {
        shapes: state.shapes.filter((s) => s.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }
  }
}
