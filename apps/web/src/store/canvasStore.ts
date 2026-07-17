/* P2 CAP-CANVAS-01 — dev-only canvas store (PA-6, CV1-2 + CV1-3).
   KALICILIK BİLİNÇLİ YOK (D-35(c)): canvas state CD'ye YAZILMAZ, localStorage'a
   da yazılmaz — sayfa yenilenince sıfırlanır (iskelet oyun alanı). K3'te canvas
   modeli CD'ye TEK additive opsiyonel alanla bağlanacak (CD v1 additive-only
   kuralı — docs/creative-document-v1.md).
   KORKULUK TEK KAPIDA (CV1-3): içerik mutasyonlarının TAMAMI shared canvasReduce
   üzerinden akar (izin-listeli araç · sahne kilidi · ızgara · min-boyut) —
   AtolyePage reducer'ı atlayan hiçbir yazma yapmaz. */

import { create } from "zustand";
import {
  EMPTY_CANVAS,
  canvasReduce,
  type CanvasAction,
  type CanvasState,
  type CanvasTool,
  type CanvasView,
} from "@tezgah/shared";

interface CanvasStore {
  view: CanvasView;
  setView: (v: CanvasView) => void;
  tool: CanvasTool;
  setTool: (t: CanvasTool) => void;
  canvas: CanvasState;
  dispatch: (a: CanvasAction) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  view: { scale: 1, x: 40, y: 40 },
  setView: (view) => set({ view }),
  tool: "select",
  setTool: (tool) => set({ tool }),
  canvas: EMPTY_CANVAS,
  dispatch: (a) => set((s) => ({ canvas: canvasReduce(s.canvas, a) })),
}));
