/* /atolye — P2 CAP-CANVAS-01 (PA-6): Konva iskeleti. TAMAMEN İZOLE:
   - main.tsx'te React.lazy ile yüklenir → konva chunk'ı YALNIZ bu rotada iner
     (ana bundle Δ=0 şartının mekanizması).
   - Hiçbir API çağrısı yok (tam istemci-yerel) → HMR/eski-server karışımından
     etkilenmez; sunucu ucu yok.
   - ADR-002 (federasyon şerhli): KORKULUKLU desen — serbest kanvas DEĞİL:
     izin-listeli araçlar (Seç/Kare/Elips/Metin) · sahne-sınırı kilidi (canlı
     dragBound + reducer clamp) · ızgara yapışması · kısıtlı Transformer
     (min-boyut, döndürme KAPALI) · zoom 0.25–4. Tüm içerik mutasyonları
     shared canvasReduce'tan geçer (korkuluk tek kapıda — canvasStore).
   - Kalıcılık YOK (D-35(c)) — bkz. store/canvasStore.ts. Export/print bağı
     ASLA bu fazda (ADR-005). */

import { useEffect, useRef, useState } from "react";
import { Ellipse, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import {
  CANVAS_MIN_SIZE,
  CANVAS_SCENE,
  CANVAS_TOOLS,
  clampToBounds,
  newId,
  zoomAt,
  type CanvasShape,
  type CanvasTool,
} from "@tezgah/shared";
import { useCanvasStore } from "../store/canvasStore";

const BAR_H = 44;
const TOOL_TR: Record<CanvasTool, string> = {
  select: "Seç",
  rect: "Kare",
  ellipse: "Elips",
  text: "Metin",
};

export default function AtolyePage() {
  const view = useCanvasStore((s) => s.view);
  const setView = useCanvasStore((s) => s.setView);
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const canvas = useCanvasStore((s) => s.canvas);
  const dispatch = useCanvasStore((s) => s.dispatch);

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - BAR_H });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - BAR_H });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Del: seçili şekli sil (korkuluk: reducer üzerinden) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" && canvas.selectedId) {
        dispatch({ type: "remove", id: canvas.selectedId });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canvas.selectedId, dispatch]);

  /* Transformer seçili node'a bağlanır (döndürme kapalı — kısıt) */
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const node = canvas.selectedId ? stage.findOne(`#${canvas.selectedId}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [canvas.selectedId, canvas.shapes]);

  const worldPos = (): { x: number; y: number } | null => {
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!p) return null;
    return { x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale };
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    setView(zoomAt(view, pointer, e.evt.deltaY < 0 ? 1 : -1));
  };

  /* CV1-FIX-01/FIX-A: seçim TEK kaynaktan (stage mousedown) — şekle tıklama HER
     araçta SEÇİMDİR; yeni şekil YALNIZ boş alana tıklayınca doğar. Reducer'daki
     shapeAtPoint kemeri UI'yi kaçırsa bile çoğalmayı ölümcül biçimde keser. */
  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const t = e.target;
    const isEmpty = t === t.getStage() || t.name() === "scene-bg";
    if (!isEmpty) {
      if (t.name() === "shape" && canvas.selectedId !== t.id()) {
        dispatch({ type: "select", id: t.id() });
      }
      return; /* Transformer tutamaçları vb. → dokunma */
    }
    if (tool === "select") {
      if (canvas.selectedId) dispatch({ type: "select", id: null });
      return;
    }
    const at = worldPos();
    if (at) dispatch({ type: "add", id: newId("shp"), kind: tool, at });
  };

  /* Canlı sürükleme kilidi: node sahne dışına ÇIKAMAZ (ekran-koordinatında clamp) */
  const dragBound = (shape: CanvasShape) => (pos: Konva.Vector2d): Konva.Vector2d => {
    const world = { x: (pos.x - view.x) / view.scale, y: (pos.y - view.y) / view.scale };
    const c = clampToBounds({ ...world, w: shape.w, h: shape.h }, CANVAS_SCENE);
    return { x: view.x + c.x * view.scale, y: view.y + c.y * view.scale };
  };

  const shapeProps = (s: CanvasShape) => ({
    id: s.id,
    name: "shape",
    draggable: true,
    dragBoundFunc: dragBound(s),
    /* seçim stage-mousedown'da (FIX-A tek kaynak) — burada handler yok */
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const n = e.target;
      /* Ellipse merkez-koordinatlıdır → sol-üst köşeye çevir */
      const x = s.kind === "ellipse" ? n.x() - s.w / 2 : n.x();
      const y = s.kind === "ellipse" ? n.y() - s.h / 2 : n.y();
      dispatch({ type: "move", id: s.id, x, y });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const n = e.target;
      const w = Math.max(CANVAS_MIN_SIZE, s.w * n.scaleX());
      const h = Math.max(CANVAS_MIN_SIZE, s.h * n.scaleY());
      n.scaleX(1);
      n.scaleY(1);
      const x = s.kind === "ellipse" ? n.x() - w / 2 : n.x();
      const y = s.kind === "ellipse" ? n.y() - h / 2 : n.y();
      dispatch({ type: "resize", id: s.id, x, y, w, h });
    },
  });

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#232327" }}>
      <div
        style={{
          height: BAR_H,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          background: "#141416",
          color: "#EDEBE6",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <strong style={{ letterSpacing: "0.08em", marginRight: 6 }}>
          TEZG<span style={{ color: "#C8102E" }}>Â</span>H · ATÖLYE
        </strong>
        {CANVAS_TOOLS.map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            style={{
              padding: "5px 10px",
              background: tool === t ? "#C8102E" : "#2b2b2f",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {TOOL_TR[t]}
          </button>
        ))}
        {/* CV1-FIX-01/FIX-B (GT m.13b): görünür Sil — klavyeye mahkûmiyet biter */}
        <button
          onClick={() => {
            if (canvas.selectedId) dispatch({ type: "remove", id: canvas.selectedId });
          }}
          disabled={!canvas.selectedId}
          style={{
            padding: "5px 10px",
            marginLeft: 6,
            background: canvas.selectedId ? "#7a1220" : "#2b2b2f",
            color: canvas.selectedId ? "#fff" : "#777",
            border: "1px solid #444",
            borderRadius: 4,
            cursor: canvas.selectedId ? "pointer" : "default",
          }}
        >
          Sil
        </button>
        <span style={{ opacity: 0.6, marginLeft: 8 }}>
          {tool === "select"
            ? "şekle tık: seç · sürükle: taşı · Sil/Del: sil · metne çift tık: düzenle"
            : "boş alana tık: ekle · şekle tık: seç"}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ opacity: 0.6 }}>
          {canvas.shapes.length} şekil · zoom {Math.round(view.scale * 100)}% · kalıcılık yok (P2 · dev)
        </span>
      </div>

      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        draggable={tool === "select"}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        onWheel={onWheel}
        onMouseDown={onStageMouseDown}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setView({ ...view, x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Çalışma alanı (sahne sınırı — korkuluk bu dikdörtgene kilitler) */}
          <Rect
            name="scene-bg"
            x={0}
            y={0}
            width={CANVAS_SCENE.w}
            height={CANVAS_SCENE.h}
            fill="#FFF8EF"
            stroke="#8a8378"
            strokeWidth={1}
            shadowColor="#000"
            shadowBlur={18}
            shadowOpacity={0.35}
          />
          <Text
            x={12}
            y={CANVAS_SCENE.h + 10}
            text={`çalışma alanı ${CANVAS_SCENE.w}×${CANVAS_SCENE.h}px — şekiller dışarı çıkamaz (ADR-002)`}
            fontSize={12}
            fontFamily="system-ui, sans-serif"
            fill="#8a8378"
            listening={false}
          />

          {canvas.shapes.map((s) =>
            s.kind === "rect" ? (
              <Rect
                key={s.id}
                {...shapeProps(s)}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                fill="#C8102E22"
                stroke="#C8102E"
                strokeWidth={1.5}
              />
            ) : s.kind === "ellipse" ? (
              <Ellipse
                key={s.id}
                {...shapeProps(s)}
                x={s.x + s.w / 2}
                y={s.y + s.h / 2}
                radiusX={s.w / 2}
                radiusY={s.h / 2}
                fill="#1A1A1A18"
                stroke="#1A1A1A"
                strokeWidth={1.5}
              />
            ) : (
              <Text
                key={s.id}
                {...shapeProps(s)}
                x={s.x}
                y={s.y}
                width={s.w}
                text={s.text ?? "Metin"}
                fontSize={18}
                fontFamily="Inter, system-ui, sans-serif"
                fill="#1A1A1A"
                onDblClick={() => {
                  const next = window.prompt("Metin:", s.text ?? "Metin");
                  if (next !== null) dispatch({ type: "set_text", id: s.id, text: next });
                }}
              />
            )
          )}

          {/* Kısıtlı Transformer: min-boyut ekran-uzayında, döndürme KAPALI */}
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              const min = CANVAS_MIN_SIZE * view.scale;
              if (newBox.width < min || newBox.height < min) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
