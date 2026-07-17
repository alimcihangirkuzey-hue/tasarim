/* P2 CAP-CANVAS-01 — dev-only canvas store (PA-6, CV1-2).
   KALICILIK BİLİNÇLİ YOK (D-35(c)): canvas state CD'ye YAZILMAZ, localStorage'a
   da yazılmaz — sayfa yenilenince sıfırlanır (iskelet oyun alanı). K3'te canvas
   modeli CD'ye TEK additive opsiyonel alanla bağlanacak (CD v1 additive-only
   kuralı bunu sözleşme açmadan karşılar — docs/creative-document-v1.md).
   CV1-3: şekil listesi + seçim, TÜM mutasyonlar shared canvasReduce'tan geçerek
   eklenir (korkuluk tek kapıda). */

import { create } from "zustand";

interface CanvasView {
  scale: number;
  x: number;
  y: number;
}

interface CanvasStore {
  view: CanvasView;
  setView: (v: CanvasView) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  view: { scale: 1, x: 40, y: 40 },
  setView: (view) => set({ view }),
}));
