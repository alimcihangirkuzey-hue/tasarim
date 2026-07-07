/* Sahne editörü — FAZ3-GOREV §3.2 (mimar kararı #4: saf SVG + pointer events).
   Köşe sırası SABİT: sol-üst, sağ-üst, sağ-alt, sol-alt.
   Canlı önizleme mimar #5 ile aynı mekaniği kullanır: quadTransform → matrix3d. */

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  quadTransform,
  type ClientDTO,
  type MockupSceneDTO,
  type Quad,
  type SceneKind,
} from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { AssetPicker } from "./AssetPicker";

const KINDS: SceneKind[] = ["vitrine", "facade", "garment", "generic"];
const SAMPLE_W = 400;
const SAMPLE_H = 300;

function defaultQuad(w: number, h: number): Quad {
  const ix = w * 0.15;
  const iy = h * 0.15;
  return [
    { x: ix, y: iy },
    { x: w - ix, y: iy },
    { x: w - ix, y: h - iy },
    { x: ix, y: h - iy },
  ];
}

function QuadEditor(props: {
  client: ClientDTO;
  scene: MockupSceneDTO | null; // null = yeni
  photoAssetId: string;
  onDone: () => void;
  showToast: (m: string) => void;
}) {
  const { client, scene, photoAssetId, onDone, showToast } = props;
  const qc = useQueryClient();
  const asset = client.assets.find((a) => a.id === photoAssetId)!;
  const pw = asset.width_px || 1000;
  const ph = asset.height_px || 750;

  const [quad, setQuad] = useState<Quad>(scene?.quad ?? defaultQuad(pw, ph));
  const [name, setName] = useState(scene?.name ?? "");
  const [kind, setKind] = useState<SceneKind>(scene?.kind ?? "vitrine");
  const [blend, setBlend] = useState<"normal" | "multiply">(scene?.settings.blend ?? "normal");
  const [opacity, setOpacity] = useState(scene?.settings.opacity ?? 0.9);
  const [fabric, setFabric] = useState(scene?.settings.fabric_color ?? "");
  const [common, setCommon] = useState(scene ? scene.client_id === null : false);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragIdx = useRef<number | null>(null);

  const toPhotoCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(pw, Math.max(0, ((e.clientX - rect.left) / rect.width) * pw)),
      y: Math.min(ph, Math.max(0, ((e.clientY - rect.top) / rect.height) * ph)),
    };
  };

  const preview = useMemo(() => {
    try {
      return { css: quadTransform(SAMPLE_W, SAMPLE_H, quad).css, error: false };
    } catch {
      return { css: "", error: true };
    }
  }, [quad]);

  const save = useMutation({
    mutationFn: () => {
      const settings = { blend, opacity, fabric_color: fabric || undefined };
      if (scene) {
        return api.updateScene(scene.id, { name, kind, quad, settings });
      }
      return api.createScene(client.id, {
        name: name || t("scenes.name_placeholder"),
        kind,
        photo_asset_id: photoAssetId,
        quad,
        settings,
        common,
      });
    },
    onSuccess: () => {
      showToast(t("scenes.saved"));
      void qc.invalidateQueries({ queryKey: ["scenes", client.id] });
      onDone();
    },
    onError: (e) => showToast((e as Error).message),
  });

  const handleR = Math.max(pw, ph) * 0.018;

  return (
    <div className="panel">
      <p className="muted">{t("scenes.corner_hint")}</p>
      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        {/* SVG quad editörü — foto piksel uzayında viewBox */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${pw} ${ph}`}
          style={{ width: "56%", minWidth: 380, touchAction: "none", borderRadius: 8, background: "#111" }}
          onPointerMove={(e) => {
            if (dragIdx.current === null) return;
            const pt = toPhotoCoords(e);
            setQuad((q) => q.map((p, i) => (i === dragIdx.current ? pt : p)) as Quad);
          }}
          onPointerUp={() => (dragIdx.current = null)}
          onPointerLeave={() => (dragIdx.current = null)}
        >
          <image href={asset.urls.master} width={pw} height={ph} />
          <polygon
            points={quad.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="rgba(59,130,246,0.18)"
            stroke="#3B82F6"
            strokeWidth={Math.max(pw, ph) * 0.003}
          />
          {quad.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={handleR}
                fill={["#3B82F6", "#16A34A", "#F59E0B", "#DC2626"][i]}
                stroke="#fff"
                strokeWidth={handleR * 0.22}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture(e.pointerId);
                  dragIdx.current = i;
                }}
              />
              <text
                x={p.x}
                y={p.y - handleR * 1.4}
                fontSize={handleR * 1.6}
                textAnchor="middle"
                fill="#fff"
                style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: handleR * 0.3 }}
              >
                {["SÜ", "SĞÜ", "SĞA", "SA"][i]}
              </text>
            </g>
          ))}
        </svg>

        {/* Canlı önizleme + form */}
        <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 13, color: "var(--c-muted)" }}>{t("scenes.preview")}</h2>
          {(() => {
            const previewW = 420;
            const scale = previewW / pw;
            return (
              <div style={{ position: "relative", width: previewW, overflow: "hidden", borderRadius: 8, background: "#111" }}>
                <img src={asset.urls.master} style={{ width: previewW, display: "block" }} alt="" />
                {!preview.error && (
                  <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${scale})` }}>
                    <div
                      style={{
                        width: SAMPLE_W,
                        height: SAMPLE_H,
                        transformOrigin: "0 0",
                        transform: preview.css,
                        mixBlendMode: blend,
                        opacity,
                        background: `linear-gradient(135deg, ${client.brandkit.colors.primary}, ${client.brandkit.colors.secondary})`,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 42,
                        letterSpacing: 2,
                      }}
                    >
                      {client.name.toUpperCase().slice(0, 14)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {preview.error && <p className="error">{t("scenes.invalid_quad")}</p>}

          <label className="field">
            {t("scenes.name")}
            <input type="text" value={name} placeholder={t("scenes.name_placeholder")} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="row">
            <label className="field" style={{ minWidth: 120 }}>
              {t("scenes.kind")}
              <select value={kind} onChange={(e) => setKind(e.target.value as SceneKind)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{t(`scenes.kind_${k}`)}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ minWidth: 140 }}>
              {t("scenes.blend")}
              <select value={blend} onChange={(e) => setBlend(e.target.value as "normal" | "multiply")}>
                <option value="normal">{t("scenes.blend_normal")}</option>
                <option value="multiply">{t("scenes.blend_multiply")}</option>
              </select>
            </label>
            <label className="field" style={{ minWidth: 130 }}>
              {t("scenes.opacity")}: {Math.round(opacity * 100)}%
              <input type="range" min={0.3} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
            </label>
            {kind === "garment" && (
              <label className="field" style={{ minWidth: 110 }}>
                {t("scenes.fabric")}
                <select value={fabric} onChange={(e) => setFabric(e.target.value)}>
                  <option value="">—</option>
                  {["white", "black", "red", "blue"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {!scene && (
            <label className="row" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={common} onChange={(e) => setCommon(e.target.checked)} />
              {t("scenes.common_save")}
            </label>
          )}
          <div className="row">
            <button onClick={() => save.mutate()} disabled={save.isPending || preview.error}>
              {t("scenes.save")}
            </button>
            <button className="ghost" onClick={onDone}>{t("scenes.cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScenesPanel({ client }: { client: ClientDTO }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"client" | "common">("client");
  const [picking, setPicking] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MockupSceneDTO | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 4000);
  };

  const scenes = useQuery({
    queryKey: ["scenes", client.id],
    queryFn: () => api.clientScenes(client.id),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteScene(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["scenes", client.id] }),
  });

  const list = (scenes.data ?? []).filter((s) =>
    tab === "client" ? s.client_id !== null : s.client_id === null
  );

  if (photoId || editing) {
    return (
      <>
        <QuadEditor
          client={client}
          scene={editing}
          photoAssetId={editing ? editing.photo_asset_id : photoId!}
          onDone={() => {
            setPhotoId(null);
            setEditing(null);
            setPicking(false);
          }}
          showToast={showToast}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  return (
    <>
      <div className="row" style={{ marginTop: 12 }}>
        <button className={tab === "client" ? "small" : "ghost small"} onClick={() => setTab("client")}>
          {t("assets.tab_client")}
        </button>
        <button className={tab === "common" ? "small" : "ghost small"} onClick={() => setTab("common")}>
          {t("assets.tab_common")}
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={() => setPicking((v) => !v)}>+ {t("scenes.new")}</button>
      </div>

      {picking && (
        <div className="panel">
          <h2>{t("scenes.pick_photo")}</h2>
          <AssetPicker client={client} value={null} onPick={(id) => id && setPhotoId(id)} excludeLogos />
        </div>
      )}

      {list.length === 0 && !picking && <p className="muted">{t("scenes.empty")}</p>}

      <div className="grid">
        {list.map((s) => (
          <div className="card" key={s.id}>
            <div className="avatar" style={{ aspectRatio: "4/3" }}>
              {s.photo_urls && <img src={s.photo_urls.thumb} alt={s.name} style={{ objectFit: "cover" }} />}
            </div>
            <div className="name">{s.name}</div>
            <div className="row" style={{ gap: 4 }}>
              <span className="pill">{t(`scenes.kind_${s.kind}`)}</span>
              {s.settings.blend === "multiply" && <span className="pill">multiply</span>}
              {s.settings.fabric_color && <span className="pill">{s.settings.fabric_color}</span>}
            </div>
            <div className="row">
              <button className="ghost small" onClick={() => setEditing(s)}>{t("scenes.edit")}</button>
              <button
                className="icon"
                onClick={() => {
                  if (window.confirm(t("scenes.delete_confirm"))) del.mutate(s.id);
                }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
