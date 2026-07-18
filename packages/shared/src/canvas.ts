/* P2 CAP-CANVAS-01 (CV1-3) + P3 CAP-LAYER-01 (LY1) — canvas korkuluk çekirdeği,
   SAF (Konva'sız test edilir). ADR-002 (federasyon şerhli): korkuluklu Konva —
   serbest kanvas DEĞİL. Web katmanı TÜM içerik mutasyonlarını canvasReduce'tan
   geçirir → korkuluk TEK kapıda: izin-listeli araç · sahne kilidi · ızgara ·
   min-boyut · zoom tavanı · KATMAN kilidi/görünürlüğü (LY1) · son-katman-
   silinemez. Kalıcılık: CD v1'e ADDITIVE-OPSİYONEL `canvas` alanı (CanvasDocSchema
   — cd_version 1 KALIR; alan yokluğu = eski davranış; docs/creative-document-v1.md).

   KATMAN SEMANTİĞİ (LY1): layers[0] = EN ALT, layers[son] = EN ÜST (render sırası).
   Sahne etkileşimi YALNIZ AKTİF katmandadır; aktif katman kilitli ya da gizliyse
   sahne mutasyonları NO-OP (m.13a dersi: durum UI'da görünür kılınır). Pasif
   katman şekilleri görünür ama hit-test'e girmez — üstüne çizmek katman
   mantığının kendisidir. */

import { z } from "zod";

export const CANVAS_TOOLS = ["select", "rect", "ellipse", "text"] as const;
export type CanvasTool = (typeof CANVAS_TOOLS)[number];
export type CanvasShapeKind = Exclude<CanvasTool, "select">;

export const CANVAS_SCENE = { w: 900, h: 600 } as const;
export const CANVAS_MIN_SIZE = 12;
export const CANVAS_GRID = 10;
export const CANVAS_ZOOM_MIN = 0.25;
export const CANVAS_ZOOM_MAX = 4;
export const CANVAS_TEXT_MAX = 200;
/** LY4: undo/redo geçmiş derinliği (bellek korkuluğu) */
export const CANVAS_HISTORY_MAX = 50;

export interface CanvasBounds {
  w: number;
  h: number;
}

/* ---- Şekil + katman + belge şemaları (LY1 — CD `canvas` alanının içeriği) ---- */

export const CanvasShapeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["rect", "ellipse", "text"]),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  text: z.string().max(CANVAS_TEXT_MAX).optional(),
});
export type CanvasShape = z.infer<typeof CanvasShapeSchema>;

export const CanvasLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  shapes: z.array(CanvasShapeSchema).default([]),
});
export type CanvasLayer = z.infer<typeof CanvasLayerSchema>;

/* CD v1 additive alanının gövdesi — v: additive-only kuralıyla yaşar (CD ile aynı
   felsefe); eski belgede alan HİÇ yoktur (optional — default YOK: yokluk anlamlıdır). */
export const CanvasDocSchema = z.object({
  v: z.literal(1).default(1),
  layers: z.array(CanvasLayerSchema).default([]),
});
export type CanvasDoc = z.infer<typeof CanvasDocSchema>;

export interface CanvasView {
  scale: number;
  x: number;
  y: number;
}

/* ---- Çalışma-zamanı state (LY1: katmanlı) ---- */

export interface CanvasState {
  layers: CanvasLayer[];
  activeLayerId: string;
  selectedId: string | null;
}

export function makeLayer(id: string, name: string): CanvasLayer {
  return { id: id, name, locked: false, visible: true, shapes: [] };
}

export const EMPTY_CANVAS: CanvasState = {
  layers: [makeLayer("ly_1", "Katman 1")],
  activeLayerId: "ly_1",
  selectedId: null,
};

/** CanvasDoc (CD alanı) → çalışma-zamanı state; boş/katmansız belge EMPTY'ye düşer. */
export function canvasStateFromDoc(doc: CanvasDoc | null | undefined): CanvasState {
  if (!doc || doc.layers.length === 0) {
    return { layers: [makeLayer("ly_1", "Katman 1")], activeLayerId: "ly_1", selectedId: null };
  }
  return { layers: doc.layers, activeLayerId: doc.layers[doc.layers.length - 1].id, selectedId: null };
}

/** Çalışma-zamanı state → CD alanı (kaydetme köprüsü — LY2). */
export function canvasDocFromState(state: CanvasState): CanvasDoc {
  return { v: 1, layers: state.layers };
}

export function activeLayer(state: CanvasState): CanvasLayer | null {
  return state.layers.find((l) => l.id === state.activeLayerId) ?? null;
}

/** Sahne mutasyonu serbest mi? (aktif katman VAR + görünür + kilitsiz) */
export function canEditActive(state: CanvasState): boolean {
  const l = activeLayer(state);
  return !!l && l.visible && !l.locked;
}

/* ---- Saf yardımcılar (CV1-3'ten aynen) ---- */

export function snapToGrid(v: number, grid: number = CANVAS_GRID): number {
  return Math.round(v / grid) * grid;
}

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

const DEFAULT_SIZE: Record<CanvasShapeKind, { w: number; h: number }> = {
  rect: { w: 120, h: 80 },
  ellipse: { w: 120, h: 80 },
  text: { w: 160, h: 24 },
};

/* ---- Aksiyonlar (LY1: katman aksiyonları eklendi — TEK KAPI korunur) ---- */

export type CanvasAction =
  | { type: "add"; id: string; kind: CanvasTool; at: { x: number; y: number }; snap?: boolean }
  | { type: "select"; id: string | null }
  | { type: "move"; id: string; x: number; y: number; snap?: boolean }
  | { type: "resize"; id: string; x: number; y: number; w: number; h: number; snap?: boolean }
  | { type: "set_text"; id: string; text: string }
  | { type: "remove"; id: string }
  | { type: "layer_add"; id: string; name?: string }
  | { type: "layer_activate"; id: string }
  | { type: "layer_remove"; id: string }
  | { type: "layer_reorder"; id: string; dir: 1 | -1 }
  | { type: "layer_lock"; id: string; locked: boolean }
  | { type: "layer_visible"; id: string; visible: boolean };

/* LY4: geçmişe GİRMEYEN aksiyonlar (seçim/aktivasyon gürültüsü) */
export const CANVAS_HISTORY_SKIP: ReadonlySet<CanvasAction["type"]> = new Set([
  "select",
  "layer_activate",
]);

/** LY4 saf geçmiş yardımcısı: present'i past'a iter, derinliği kelepçeler. */
export function pushPast<T>(past: T[], present: T, cap: number = CANVAS_HISTORY_MAX): T[] {
  return [...past.slice(-(cap - 1)), present];
}

/* Aktif katmanın şekillerini değiştiren yardımcı (immutable) */
function withActiveShapes(
  state: CanvasState,
  fn: (shapes: CanvasShape[]) => CanvasShape[]
): CanvasState {
  return {
    ...state,
    layers: state.layers.map((l) => (l.id === state.activeLayerId ? { ...l, shapes: fn(l.shapes) } : l)),
  };
}

/* Reducer — SAF; girdi MUTATE EDİLMEZ. Sahne aksiyonları YALNIZ aktif katmanda
   ve canEditActive korkuluğuyla; katman aksiyonları TEK-KAPI'nın yeni kapıları. */
export function canvasReduce(
  state: CanvasState,
  action: CanvasAction,
  bounds: CanvasBounds = CANVAS_SCENE
): CanvasState {
  switch (action.type) {
    case "add": {
      if (action.kind === "select" || !CANVAS_TOOLS.includes(action.kind)) return state;
      if (!canEditActive(state)) return state; /* kilitli/gizli aktif katman — no-op */
      const layer = activeLayer(state)!;
      const hit = shapeAtPoint(layer.shapes, action.at);
      if (hit) return { ...state, selectedId: hit.id }; /* FIX-A: kaplı nokta = seçim */
      const kind = action.kind as CanvasShapeKind;
      const size = DEFAULT_SIZE[kind];
      const snap = action.snap !== false;
      const c = clampToBounds(
        {
          x: snap ? snapToGrid(action.at.x) : action.at.x,
          y: snap ? snapToGrid(action.at.y) : action.at.y,
          w: size.w,
          h: size.h,
        },
        bounds
      );
      const shape: CanvasShape = { id: action.id, kind, ...c, ...(kind === "text" ? { text: "Metin" } : {}) };
      return { ...withActiveShapes(state, (sh) => [...sh, shape]), selectedId: shape.id };
    }
    case "select": {
      const layer = activeLayer(state);
      if (action.id !== null && !layer?.shapes.some((s) => s.id === action.id)) return state;
      return { ...state, selectedId: action.id };
    }
    case "move": {
      if (!canEditActive(state)) return state;
      const layer = activeLayer(state)!;
      const cur = layer.shapes.find((s) => s.id === action.id);
      if (!cur) return state;
      const snap = action.snap !== false;
      const c = clampToBounds(
        { x: snap ? snapToGrid(action.x) : action.x, y: snap ? snapToGrid(action.y) : action.y, w: cur.w, h: cur.h },
        bounds
      );
      return withActiveShapes(state, (sh) => sh.map((s) => (s.id === action.id ? { ...s, x: c.x, y: c.y } : s)));
    }
    case "resize": {
      if (!canEditActive(state)) return state;
      const layer = activeLayer(state)!;
      const cur = layer.shapes.find((s) => s.id === action.id);
      if (!cur) return state;
      const snap = action.snap !== false;
      const w = Math.max(CANVAS_MIN_SIZE, snap ? snapToGrid(action.w) : action.w);
      const h = Math.max(CANVAS_MIN_SIZE, snap ? snapToGrid(action.h) : action.h);
      const c = clampToBounds(
        { x: snap ? snapToGrid(action.x) : action.x, y: snap ? snapToGrid(action.y) : action.y, w, h },
        bounds
      );
      return withActiveShapes(state, (sh) => sh.map((s) => (s.id === action.id ? { ...s, ...c } : s)));
    }
    case "set_text": {
      if (!canEditActive(state)) return state;
      const layer = activeLayer(state)!;
      const cur = layer.shapes.find((s) => s.id === action.id);
      if (!cur || cur.kind !== "text") return state;
      const text = action.text.slice(0, CANVAS_TEXT_MAX);
      return withActiveShapes(state, (sh) => sh.map((s) => (s.id === action.id ? { ...s, text } : s)));
    }
    case "remove": {
      if (!canEditActive(state)) return state;
      const layer = activeLayer(state)!;
      if (!layer.shapes.some((s) => s.id === action.id)) return state;
      return {
        ...withActiveShapes(state, (sh) => sh.filter((s) => s.id !== action.id)),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }
    case "layer_add": {
      const name = action.name?.trim() || `Katman ${state.layers.length + 1}`;
      const layer = makeLayer(action.id, name.slice(0, 40));
      return { layers: [...state.layers, layer], activeLayerId: layer.id, selectedId: null };
    }
    case "layer_activate": {
      if (!state.layers.some((l) => l.id === action.id)) return state;
      if (state.activeLayerId === action.id) return state;
      return { ...state, activeLayerId: action.id, selectedId: null };
    }
    case "layer_remove": {
      if (state.layers.length <= 1) return state; /* SON katman silinemez (korkuluk) */
      const idx = state.layers.findIndex((l) => l.id === action.id);
      if (idx === -1) return state;
      /* LY2c (BULGU-1 speci, ürün sahibi): KİLİTLİ katman silinemez — önce kilit açılır.
         No-op → geçmişe girmez, tost çıkmaz (dispatch next===cur filtresi). */
      if (state.layers[idx].locked) return state;
      const layers = state.layers.filter((l) => l.id !== action.id);
      const activeLayerId =
        state.activeLayerId === action.id ? layers[Math.max(0, idx - 1)].id : state.activeLayerId;
      return { layers, activeLayerId, selectedId: null };
    }
    case "layer_reorder": {
      const idx = state.layers.findIndex((l) => l.id === action.id);
      if (idx === -1) return state;
      const to = idx + action.dir;
      if (to < 0 || to >= state.layers.length) return state;
      const layers = [...state.layers];
      [layers[idx], layers[to]] = [layers[to], layers[idx]];
      return { ...state, layers };
    }
    case "layer_lock": {
      if (!state.layers.some((l) => l.id === action.id)) return state;
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, locked: action.locked } : l)),
      };
    }
    case "layer_visible": {
      if (!state.layers.some((l) => l.id === action.id)) return state;
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, visible: action.visible } : l)),
      };
    }
  }
}
