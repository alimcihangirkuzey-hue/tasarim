/* P2 CAP-CANVAS-01 + P3 CAP-LAYER-01 — canvas store (PA-9, LY2/LY4).
   KORKULUK TEK KAPIDA: içerik mutasyonlarının TAMAMI shared canvasReduce
   üzerinden akar (katman kilidi/görünürlüğü dahil — LY1).

   KALICILIK (LY2): /atolye?doc=<id> ile belgeye BAĞLI mod — açılışta CD
   `canvas` alanından yüklenir (canvasStateFromDoc), Kaydet düğmesi MEVCUT
   PUT /api/documents/:id ile yazar (api çağrısı SAYFADA — store aptal kalır,
   kod tabanı deseni). Bağsız mod (/atolye) eski dev-only oyun alanı: kalıcılık
   YOK, yenilemede sıfırlanır.

   GEÇMİŞ (LY4): past/future yığını (derinlik CANVAS_HISTORY_MAX=50); seçim/
   aktivasyon geçmişe GİRMEZ (CANVAS_HISTORY_SKIP). Katman-silme tostu (D-46 —
   FIX-1 deseni): layerRemovedNotice 5sn; Geri-al = undo. */

import { create } from "zustand";
import {
  CANVAS_HISTORY_SKIP,
  canvasReduce,
  canvasStateFromDoc,
  EMPTY_CANVAS,
  pushPast,
  type CanvasAction,
  type CanvasDoc,
  type CanvasState,
  type CanvasTool,
  type CanvasView,
} from "@tezgah/shared";

export type CanvasSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface CanvasStore {
  view: CanvasView;
  setView: (v: CanvasView) => void;
  tool: CanvasTool;
  setTool: (t: CanvasTool) => void;

  canvas: CanvasState;
  past: CanvasState[];
  future: CanvasState[];
  dispatch: (a: CanvasAction) => void;
  undo: () => void;
  redo: () => void;

  /* LY3/D-46: katman-silme Geri-al tostu (FIX-1 deseni; Geri-al = undo) */
  layerRemovedNotice: { name: string; at: number } | null;
  clearLayerNotice: () => void;

  /* LY2: belge bağlama + kayıt durumu (api çağrıları sayfada) */
  docId: string | null;
  saveState: CanvasSaveState;
  bindDocument: (docId: string | null, doc: CanvasDoc | null) => void;
  setSaveState: (s: CanvasSaveState) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  view: { scale: 1, x: 40, y: 40 },
  setView: (view) => set({ view }),
  tool: "select",
  setTool: (tool) => set({ tool }),

  canvas: EMPTY_CANVAS,
  past: [],
  future: [],

  dispatch: (a) => {
    const cur = get().canvas;
    const next = canvasReduce(cur, a);
    if (next === cur) return; /* no-op (korkuluk reddi vb.) — geçmişe girmez */
    const historized = !CANVAS_HISTORY_SKIP.has(a.type);
    const removedLayer =
      a.type === "layer_remove" ? cur.layers.find((l) => l.id === a.id)?.name ?? null : null;
    set({
      canvas: next,
      ...(historized ? { past: pushPast(get().past, cur), future: [] } : {}),
      ...(historized && get().docId ? { saveState: "dirty" as const } : {}),
      ...(removedLayer ? { layerRemovedNotice: { name: removedLayer, at: Date.now() } } : {}),
    });
  },

  undo: () => {
    const { past, canvas, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      canvas: prev,
      past: past.slice(0, -1),
      future: [canvas, ...future],
      layerRemovedNotice: null,
      ...(get().docId ? { saveState: "dirty" as const } : {}),
    });
  },

  redo: () => {
    const { past, canvas, future } = get();
    if (future.length === 0) return;
    const [next, ...rest] = future;
    set({
      canvas: next,
      past: pushPast(past, canvas),
      future: rest,
      ...(get().docId ? { saveState: "dirty" as const } : {}),
    });
  },

  layerRemovedNotice: null,
  clearLayerNotice: () => set({ layerRemovedNotice: null }),

  docId: null,
  saveState: "idle",
  bindDocument: (docId, doc) =>
    set({
      docId,
      canvas: canvasStateFromDoc(doc),
      past: [],
      future: [],
      layerRemovedNotice: null,
      saveState: "idle",
    }),
  setSaveState: (saveState) => set({ saveState }),
}));
