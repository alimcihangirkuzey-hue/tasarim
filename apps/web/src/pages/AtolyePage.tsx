/* /atolye — P2 CAP-CANVAS-01 (PA-6): Konva iskeleti. TAMAMEN İZOLE:
   - main.tsx'te React.lazy ile yüklenir → konva chunk'ı YALNIZ bu rotada iner
     (ana bundle Δ=0 şartının mekanizması).
   - Hiçbir API çağrısı yok (tam istemci-yerel) → HMR/eski-server karışımından
     etkilenmez; sunucu ucu yok.
   - ADR-002 (federasyon şerhli): korkuluklu desen — serbest kanvas DEĞİL.
     CV1-2: boş sahne + pan/zoom. CV1-3: izin-listeli araçlar + clamp/snap/
     kısıtlı Transformer (saf fonksiyonlar shared/canvas.ts'te).
   - Kalıcılık YOK (D-35(c)) — bkz. store/canvasStore.ts. */

import { useEffect, useState } from "react";
import { Layer, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "../store/canvasStore";

/* Çalışma alanı (sahne sınırı) — CV1-3 clampToBounds bu dikdörtgeni kullanır */
export const SCENE_W = 900;
export const SCENE_H = 600;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const BAR_H = 44;

export default function AtolyePage() {
  const view = useCanvasStore((s) => s.view);
  const setView = useCanvasStore((s) => s.setView);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - BAR_H });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - BAR_H });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Tekerlek: işaretçi-odaklı zoom (CV1-2 inline; CV1-3'te shared zoomAt'e alınır) */
  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const old = view.scale;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, old * (e.evt.deltaY < 0 ? 1.1 : 1 / 1.1)));
    const world = { x: (pointer.x - view.x) / old, y: (pointer.y - view.y) / old };
    setView({ scale: next, x: pointer.x - world.x * next, y: pointer.y - world.y * next });
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#232327" }}>
      <div
        style={{
          height: BAR_H,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          background: "#141416",
          color: "#EDEBE6",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <strong style={{ letterSpacing: "0.08em" }}>
          TEZG<span style={{ color: "#C8102E" }}>Â</span>H · ATÖLYE
        </strong>
        <span style={{ opacity: 0.6 }}>Konva iskeleti (P2 · dev) — kalıcılık yok</span>
        <span style={{ flex: 1 }} />
        <span style={{ opacity: 0.6 }}>sürükle: pan · tekerlek: zoom ({Math.round(view.scale * 100)}%)</span>
      </div>

      <Stage
        width={size.w}
        height={size.h}
        draggable
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        onWheel={onWheel}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setView({ ...view, x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Çalışma alanı — CV1-3'te şekiller bu sınıra kilitlenir (clampToBounds) */}
          <Rect
            x={0}
            y={0}
            width={SCENE_W}
            height={SCENE_H}
            fill="#FFF8EF"
            stroke="#8a8378"
            strokeWidth={1}
            shadowColor="#000"
            shadowBlur={18}
            shadowOpacity={0.35}
          />
          <Text
            x={12}
            y={SCENE_H + 10}
            text={`çalışma alanı ${SCENE_W}×${SCENE_H}px`}
            fontSize={12}
            fontFamily="system-ui, sans-serif"
            fill="#8a8378"
          />
        </Layer>
      </Stage>
    </div>
  );
}
