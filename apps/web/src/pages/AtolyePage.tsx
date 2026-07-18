/* /atolye — P2 CAP-CANVAS-01 + P3 CAP-LAYER-01 (LY3/LY4). TAMAMEN İZOLE +
   korkuluklu (ADR-002): izin-listeli araçlar · sahne/katman kilitleri · kısıtlı
   Transformer (döndürme kapalı) · zoom 0.25–4. TÜM mutasyonlar shared
   canvasReduce tek-kapısından (canvasStore.dispatch).

   K3 dersleri gömülü: mod/durum HER AN görünür (aktif katman + kilit/gizli
   uyarı şeridi — m.13a) · KLAVYESİZ tam kullanım (panel düğmeleri, görünür
   Geri al/Yinele — m.13b) · yıkıcı eylem = katman silme → FIX-1 deseni:
   onaysız + 5sn Geri-al tostu (D-46; Geri-al = undo) · özellik = yolu kadar
   (m.10): belge bağlama ?doc= ile, kapıda Kaydet düğmesi.

   KALICILIK (LY2 köprüsü): /atolye?doc=<id> → CD `canvas` alanından yükle,
   Kaydet = MEVCUT PUT /api/documents/:id. Bağsız /atolye = dev oyun alanı. */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Ellipse, Group, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import {
  CANVAS_MIN_SIZE,
  CANVAS_SCENE,
  CANVAS_TOOLS,
  activeLayer,
  canEditActive,
  canvasDocFromState,
  clampToBounds,
  newId,
  zoomAt,
  type CanvasShape,
  type CanvasTool,
} from "@tezgah/shared";
import { api } from "../api";
import { useCanvasStore } from "../store/canvasStore";

const BAR_H = 44;
const TOOL_TR: Record<CanvasTool, string> = {
  select: "Seç",
  rect: "Kare",
  ellipse: "Elips",
  text: "Metin",
};

const btnStyle = (active: boolean, danger = false): React.CSSProperties => ({
  padding: "5px 10px",
  background: danger ? (active ? "#7a1220" : "#2b2b2f") : active ? "#C8102E" : "#2b2b2f",
  color: active || !danger ? "#fff" : "#777",
  border: "1px solid #444",
  borderRadius: 4,
  cursor: "pointer",
});

export default function AtolyePage() {
  const [sp] = useSearchParams();
  const docParam = sp.get("doc");

  const view = useCanvasStore((s) => s.view);
  const setView = useCanvasStore((s) => s.setView);
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const canvas = useCanvasStore((s) => s.canvas);
  const dispatch = useCanvasStore((s) => s.dispatch);
  const past = useCanvasStore((s) => s.past);
  const future = useCanvasStore((s) => s.future);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const layerNotice = useCanvasStore((s) => s.layerRemovedNotice);
  const clearLayerNotice = useCanvasStore((s) => s.clearLayerNotice);
  const docId = useCanvasStore((s) => s.docId);
  const saveState = useCanvasStore((s) => s.saveState);
  const bindDocument = useCanvasStore((s) => s.bindDocument);
  const setSaveState = useCanvasStore((s) => s.setSaveState);

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const boundFor = useRef<string | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - BAR_H });

  const layer = activeLayer(canvas);
  const editable = canEditActive(canvas);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - BAR_H });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* LY2: belge bağlama — ?doc= değişince yükle (bir kez; refetch canvas'ı ezmesin) */
  useEffect(() => {
    let cancelled = false;
    if (!docParam) {
      if (boundFor.current !== null) {
        boundFor.current = null;
        bindDocument(null, null);
      }
      return;
    }
    if (boundFor.current === docParam) return;
    void api.document(docParam).then(
      (doc) => {
        if (cancelled) return;
        boundFor.current = docParam;
        bindDocument(docParam, doc.canvas ?? null);
      },
      () => {
        if (!cancelled) setSaveState("error");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [docParam, bindDocument, setSaveState]);

  /* Kaydet (LY2): MEVCUT PUT — yeni uç yok */
  const onSave = async () => {
    if (!docId) return;
    setSaveState("saving");
    try {
      await api.updateDocument(docId, { canvas: canvasDocFromState(canvas) });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  /* Del + Ctrl+Z/Y (LY4 — kısayol EK yol; görünür düğmeler asıl) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" && canvas.selectedId) {
        dispatch({ type: "remove", id: canvas.selectedId });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canvas.selectedId, dispatch, undo, redo]);

  /* D-46: katman-silme tostu 5sn (Geri-al = undo) */
  useEffect(() => {
    if (!layerNotice) return;
    const t = setTimeout(() => clearLayerNotice(), 5000);
    return () => clearTimeout(t);
  }, [layerNotice, clearLayerNotice]);

  /* Transformer: seçili şekil (aktif+düzenlenebilir katmanda) */
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const node = canvas.selectedId && editable ? stage.findOne(`#${canvas.selectedId}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [canvas.selectedId, canvas.layers, editable]);

  const worldPos = (): { x: number; y: number } | null => {
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!p) return null;
    return { x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale };
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    setView(zoomAt(view, pointer, e.evt.deltaY < 0 ? 1 : -1));
  };

  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const t = e.target;
    const isEmpty = t === t.getStage() || t.name() === "scene-bg";
    if (!isEmpty) {
      if (t.name() === "shape" && canvas.selectedId !== t.id()) {
        dispatch({ type: "select", id: t.id() });
      }
      return;
    }
    if (tool === "select") {
      if (canvas.selectedId) dispatch({ type: "select", id: null });
      return;
    }
    const at = worldPos();
    if (at) dispatch({ type: "add", id: newId("shp"), kind: tool, at });
  };

  const dragBound = (shape: CanvasShape) => (pos: Konva.Vector2d): Konva.Vector2d => {
    const world = { x: (pos.x - view.x) / view.scale, y: (pos.y - view.y) / view.scale };
    const c = clampToBounds({ ...world, w: shape.w, h: shape.h }, CANVAS_SCENE);
    return { x: view.x + c.x * view.scale, y: view.y + c.y * view.scale };
  };

  const shapeProps = (s: CanvasShape, interactive: boolean) => ({
    id: s.id,
    name: interactive ? "shape" : "shape-passive",
    listening: interactive,
    draggable: interactive,
    dragBoundFunc: dragBound(s),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const n = e.target;
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

  const renderShape = (s: CanvasShape, interactive: boolean) =>
    s.kind === "rect" ? (
      <Rect
        key={s.id}
        {...shapeProps(s, interactive)}
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
        {...shapeProps(s, interactive)}
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
        {...shapeProps(s, interactive)}
        x={s.x}
        y={s.y}
        width={s.w}
        text={s.text ?? "Metin"}
        fontSize={18}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#1A1A1A"
        onDblClick={
          interactive
            ? () => {
                const next = window.prompt("Metin:", s.text ?? "Metin");
                if (next !== null) dispatch({ type: "set_text", id: s.id, text: next });
              }
            : undefined
        }
      />
    );

  const shapeTotal = canvas.layers.reduce((n, l) => n + l.shapes.length, 0);

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
          <button key={t} onClick={() => setTool(t)} style={btnStyle(tool === t)}>
            {TOOL_TR[t]}
          </button>
        ))}
        <button
          onClick={() => {
            if (canvas.selectedId) dispatch({ type: "remove", id: canvas.selectedId });
          }}
          disabled={!canvas.selectedId || !editable}
          style={{ ...btnStyle(!!canvas.selectedId && editable, true), marginLeft: 6 }}
        >
          Sil
        </button>
        {/* LY4: GÖRÜNÜR undo/redo — klavye (Ctrl+Z/Y) ek yol, tek yol değil */}
        <button onClick={undo} disabled={past.length === 0} style={{ ...btnStyle(past.length > 0), marginLeft: 6 }}>
          ↺ Geri al
        </button>
        <button onClick={redo} disabled={future.length === 0} style={btnStyle(future.length > 0)}>
          ↻ Yinele
        </button>
        {docId && (
          <>
            <button
              onClick={() => void onSave()}
              disabled={saveState === "saving" || saveState === "saved" || saveState === "idle"}
              style={{ ...btnStyle(saveState === "dirty"), marginLeft: 6, borderColor: "#6a6" }}
            >
              Kaydet
            </button>
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              {saveState === "dirty" && "kaydedilmemiş değişiklik"}
              {saveState === "saving" && "kaydediliyor…"}
              {saveState === "saved" && "kaydedildi ✓"}
              {saveState === "error" && "kayıt HATASI"}
              {saveState === "idle" && `belge: ${docId.slice(0, 12)}…`}
            </span>
          </>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ opacity: 0.6 }}>
          {layer ? `Aktif: ${layer.name}${layer.locked ? " 🔒" : ""}${layer.visible ? "" : " (gizli)"}` : "katman yok"}
          {" · "}
          {shapeTotal} şekil · zoom {Math.round(view.scale * 100)}%{docId ? "" : " · oyun alanı (kalıcılık yok)"}
        </span>
      </div>

      {/* m.13a dersi: düzenlenemez aktif katman GÖRÜNÜR uyarı — sessiz no-op yok */}
      {!editable && (
        <div
          style={{
            position: "absolute",
            top: BAR_H,
            left: 0,
            right: 0,
            zIndex: 40,
            background: "#F2B705",
            color: "#1A1A1A",
            padding: "6px 14px",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          Aktif katman {layer?.locked ? "KİLİTLİ" : "GİZLİ"} — sahne düzenlemesi kapalı (panelden açın).
        </div>
      )}

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

          {/* Katmanlar: alt→üst sırayla; etkileşim YALNIZ aktif+düzenlenebilir katmanda */}
          {canvas.layers.map(
            (l) =>
              l.visible && (
                <Group key={l.id}>
                  {l.shapes.map((s) => renderShape(s, l.id === canvas.activeLayerId && !l.locked))}
                </Group>
              )
          )}

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

      {/* LY3: KATMAN PANELİ — klavyesiz tam kullanım; üstteki katman listede üstte */}
      <div
        style={{
          position: "absolute",
          top: BAR_H + (editable ? 8 : 40),
          right: 8,
          width: 210,
          background: "#141416ee",
          color: "#EDEBE6",
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          borderRadius: 8,
          padding: 8,
          zIndex: 50,
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <strong>Katmanlar</strong>
          <span style={{ flex: 1 }} />
          <button
            onClick={() => dispatch({ type: "layer_add", id: newId("ly") })}
            style={{ ...btnStyle(true), padding: "3px 8px" }}
          >
            + Katman
          </button>
        </div>
        {[...canvas.layers].reverse().map((l) => (
          <div
            key={l.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 6px",
              borderRadius: 6,
              background: l.id === canvas.activeLayerId ? "#C8102E33" : "transparent",
              border: l.id === canvas.activeLayerId ? "1px solid #C8102E" : "1px solid transparent",
              marginBottom: 2,
            }}
          >
            <button
              onClick={() => dispatch({ type: "layer_activate", id: l.id })}
              style={{
                background: "transparent",
                border: "none",
                color: "#EDEBE6",
                cursor: "pointer",
                textAlign: "left",
                flex: 1,
                padding: "4px 2px",
              }}
              title="Aktif katman yap"
            >
              {l.name} <span style={{ opacity: 0.5 }}>({l.shapes.length})</span>
            </button>
            <button
              onClick={() => dispatch({ type: "layer_visible", id: l.id, visible: !l.visible })}
              style={{ background: "transparent", border: "none", cursor: "pointer", opacity: l.visible ? 1 : 0.4 }}
              title={l.visible ? "Gizle" : "Göster"}
            >
              👁
            </button>
            <button
              onClick={() => dispatch({ type: "layer_lock", id: l.id, locked: !l.locked })}
              style={{ background: "transparent", border: "none", cursor: "pointer", opacity: l.locked ? 1 : 0.4 }}
              title={l.locked ? "Kilidi aç" : "Kilitle"}
            >
              {l.locked ? "🔒" : "🔓"}
            </button>
            <button
              onClick={() => dispatch({ type: "layer_reorder", id: l.id, dir: 1 })}
              style={{ background: "transparent", border: "none", color: "#EDEBE6", cursor: "pointer" }}
              title="Üste taşı"
            >
              ↑
            </button>
            <button
              onClick={() => dispatch({ type: "layer_reorder", id: l.id, dir: -1 })}
              style={{ background: "transparent", border: "none", color: "#EDEBE6", cursor: "pointer" }}
              title="Alta taşı"
            >
              ↓
            </button>
            <button
              onClick={() => dispatch({ type: "layer_remove", id: l.id })}
              disabled={canvas.layers.length <= 1}
              style={{
                background: "transparent",
                border: "none",
                color: canvas.layers.length <= 1 ? "#555" : "#ff8a96",
                cursor: canvas.layers.length <= 1 ? "default" : "pointer",
              }}
              title={canvas.layers.length <= 1 ? "Son katman silinemez" : "Katmanı sil (Geri al 5sn)"}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* D-46: katman-silme Geri-al tostu (FIX-1 deseni; Geri-al = undo) */}
      {layerNotice && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            background: "#1A1A1A",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            display: "flex",
            gap: 12,
            alignItems: "center",
            zIndex: 60,
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            fontSize: 14,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span>&#39;{layerNotice.name}&#39; katmanı kaldırıldı</span>
          <button
            onClick={() => {
              undo();
              clearLayerNotice();
            }}
            style={{
              background: "transparent",
              border: "1px solid #C8102E",
              color: "#ff8a96",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Geri al
          </button>
        </div>
      )}
    </div>
  );
}
