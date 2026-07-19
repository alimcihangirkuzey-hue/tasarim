/* Kısıtlı editör — CONSTITUTION §6. Kullanıcı yalnız tanımlı slotları düzenler (M2);
   canvas aynı şablon bileşenini mode:"edit" ile çizer (M3). */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PRESET_THEMES,
  customThemeList,
  TEMPLATES,
  currentFormat,
  missingPhotoItems,
  paramOptions,
  paramValue,
  resolveSelection,
  type LayoutWarning,
} from "@tezgah/templates";
import {
  GARMENT_AREAS,
  areasForKind,
  suggestPhotos,
  type DocumentState,
  type ExportRecordDTO,
  type GarmentKind,
} from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";
import { analyzeDoc } from "../lib/analyzeDoc";
import { SlotPanel } from "../components/SlotPanel";
import { SelectionPanel } from "../components/SelectionPanel";
import { useEditor } from "../store/editorStore";

function warnText(w: LayoutWarning): string {
  switch (w.type) {
    case "overflow-items":
      return tf("editor.warn_overflow", { n: w.count });
    case "text-truncated":
      return `${t("editor.warn_truncated")} (${w.itemId ?? w.slotId})`;
    case "low-dpi":
      return `${tf("editor.warn_low_dpi", { dpi: w.effectiveDpi })} (${w.itemId ?? w.slotId})`;
    case "empty-required":
      return t("editor.warn_empty_logo");
    case "mixed-variants":
      return `${t("editor.warn_mixed")}: ${w.categoryId}`;
    case "qr-contrast":
      return t("editor.warn_qr_contrast");
    case "contrast":
      return tf("editor.warn_contrast", { ratio: w.ratio });
    case "mono-suggest":
      return t("editor.warn_mono_suggest");
    case "fine-detail":
      return t("editor.warn_fine_detail");
    case "broderie-info":
      return t("editor.warn_broderie_info");
    case "min-font":
      return t("editor.warn_min_font");
    case "empty-price":
      return `${t("editor.warn_empty_price")} (${w.itemId})`;
    case "overflow-strategy-violation":
      /* Şablon "ürün düşmez" ilan etmiş ama yüzey sabit kapasiteli olduğu için
         ürün düştü. Operatör görsün ki manifest ilanı düzeltilebilsin. */
      return `${t("editor.warn_strategy_violation")} (${w.declared}, ${w.dropped})`;
  }
}

export function EditorPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { doc, docId, load, patch, undo, redo, past, future, selectedSlot, select, saveState, setSaveState } =
    useEditor();

  const docQ = useQuery({ queryKey: ["document", id], queryFn: () => api.document(id), enabled: !!id });
  const clientId = docQ.data?.client_id;
  const clientQ = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api.client(clientId!),
    enabled: !!clientId,
  });

  useEffect(() => {
    if (docQ.data) load(docQ.data.id, docQ.data);
  }, [docQ.data, load]);

  const client = clientQ.data;
  const entry = doc ? TEMPLATES[doc.template_id] : undefined;

  /* ---- otomatik kayıt: 2 sn debounce (§6.2) ---- */
  useEffect(() => {
    if (!doc || !docId || saveState !== "dirty") return;
    const h = window.setTimeout(() => {
      setSaveState("saving");
      api
        .updateDocument(docId, {
          template_id: doc.template_id,
          params: doc.params,
          theme_id: doc.theme_id,
          selection: doc.selection,
          overrides: doc.overrides,
        })
        .then(() => {
          setSaveState("saved");
          if (clientId) void qc.invalidateQueries({ queryKey: ["documents", clientId] });
        })
        .catch(() => setSaveState("error"));
    }, 2000);
    return () => window.clearTimeout(h);
  }, [doc, docId, saveState, setSaveState, clientId, qc]);

  /* ---- kısayollar: Ctrl+Z/Y/S, +/- (§6.2) ---- */
  const [zoom, setZoom] = useState(0.9);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); /* autosave zaten var */ }
      else if (e.key === "+") setZoom((z) => Math.min(2, z + 0.1));
      else if (e.key === "-") setZoom((z) => Math.max(0.3, z - 0.1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const [guides, setGuides] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 5000);
  };

  /* ---- eksik foto: yer tutucuya tıkla → dosya seçici (§8.1/§8.4-1) ---- */
  const photoFileRef = useRef<HTMLInputElement>(null);
  const pendingPhotoItem = useRef<string | null>(null);
  const uploadForItem = useMutation({
    mutationFn: async (p: { itemId: string; file: File }) => {
      const asset = await api.uploadAsset(client!.id, p.file, "photo");
      const catalog = {
        ...client!.catalog,
        categories: client!.catalog.categories.map((c) => ({
          ...c,
          items: c.items.map((it) => (it.id === p.itemId ? { ...it, photo: asset.id } : it)),
        })),
      };
      return api.updateClient(client!.id, { catalog });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["client", clientId] }),
  });
  const onPhotoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && pendingPhotoItem.current) uploadForItem.mutate({ itemId: pendingPhotoItem.current, file: f });
    e.target.value = "";
  };

  /* FAZ4 §9: öneri çipine tek tık → katalogdaki ürüne foto bağlanır (M1: veri katalogda) */
  const bindSuggestion = useMutation({
    mutationFn: async (p: { itemId: string; assetId: string }) => {
      const catalog = {
        ...client!.catalog,
        categories: client!.catalog.categories.map((c) => ({
          ...c,
          items: c.items.map((it) => (it.id === p.itemId ? { ...it, photo: p.assetId } : it)),
        })),
      };
      return api.updateClient(client!.id, { catalog });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["client", clientId] }),
  });

  const onSlotClick = (slotId: string) => {
    if (slotId.endsWith(":photo")) {
      const itemId = slotId.split(":")[1];
      pendingPhotoItem.current = itemId;
      select(`item:${itemId}`);
      photoFileRef.current?.click();
      return;
    }
    select(slotId);
  };

  /* ---- çift tık → yerinde metin düzenleme (§6.2) ---- */
  const [inline, setInline] = useState<{ slot: string; value: string; x: number; y: number; w: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const onCanvasDblClick = (e: MouseEvent) => {
    if (!doc || !entry || !client) return;
    const g = (e.target as Element).closest("[data-slot]");
    if (!g || !canvasRef.current) return;
    const slotId = g.getAttribute("data-slot")!;
    const rect = (g as SVGGElement).getBoundingClientRect();
    const host = canvasRef.current.getBoundingClientRect();

    let value = "";
    if (slotId.startsWith("item:") && !slotId.endsWith(":photo")) {
      const itemId = slotId.split(":")[1];
      for (const c of client.catalog.categories) {
        const it = c.items.find((i) => i.id === itemId);
        if (it) value = it.name_fr;
      }
    } else {
      const slotDef = entry.manifest.slots.find((s) => s.id === slotId);
      if (!slotDef || slotDef.kind !== "text") return;
      const ov = doc.overrides[slotId];
      value =
        ov && typeof ov.value === "string"
          ? ov.value
          : String(
              (slotDef.bind
                ? slotDef.bind.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], {
                    brand: client.brandkit,
                    catalog: client.catalog,
                  } as unknown)
                : null) ?? slotDef.default_fr ?? ""
            );
    }
    setInline({
      slot: slotId,
      value,
      x: rect.left - host.left + canvasRef.current.scrollLeft,
      y: rect.top - host.top + canvasRef.current.scrollTop,
      w: Math.max(140, rect.width),
    });
  };

  const commitInline = () => {
    if (!inline || !doc || !client) return;
    if (inline.slot.startsWith("item:")) {
      const itemId = inline.slot.split(":")[1];
      const catalog = {
        ...client.catalog,
        categories: client.catalog.categories.map((c) => ({
          ...c,
          items: c.items.map((it) => (it.id === itemId ? { ...it, name_fr: inline.value } : it)),
        })),
      };
      api.updateClient(client.id, { catalog }).then(() => void qc.invalidateQueries({ queryKey: ["client", clientId] }));
    } else {
      patch({ overrides: { ...doc.overrides, [inline.slot]: { value: inline.value, detached: true } } });
    }
    setInline(null);
  };

  /* ---- şablon değişimi: veri+seçim korunur; uyumsuz override düşer (kabul §7/3) ---- */
  const switchTemplate = (targetId: string) => {
    if (!doc || targetId === doc.template_id) return;
    const target = TEMPLATES[targetId];
    const valid = new Set(target.manifest.slots.map((s) => s.id));
    const kept: DocumentState["overrides"] = {};
    const dropped: string[] = [];
    for (const [k, v] of Object.entries(doc.overrides)) {
      if (k.startsWith("item:") || valid.has(k)) kept[k] = v;
      else dropped.push(k);
    }
    const fmt =
      typeof doc.params["format"] === "string" && target.manifest.formats[doc.params["format"] as string]
        ? (doc.params["format"] as string)
        : target.manifest.defaultFormat;
    const params: Record<string, unknown> = { format: fmt };
    for (const p of target.manifest.params) {
      if (p.id !== "format" && doc.params[p.id] !== undefined) params[p.id] = doc.params[p.id];
    }
    patch({ template_id: targetId, params, overrides: kept });
    setPageIndex(0);
    if (dropped.length > 0) showToast(tf("editor.dropped_overrides", { list: dropped.join(", ") }));
  };

  /* ---- mockup (Faz 3) ---- */
  const [showMockupModal, setShowMockupModal] = useState(false);
  const scenesQ = useQuery({
    queryKey: ["scenes", clientId],
    queryFn: () => api.clientScenes(clientId!),
    enabled: !!clientId,
  });
  const doMockup = useMutation({
    mutationFn: (sceneId: string) => api.mockupDocument(id, sceneId),
    onSuccess: (rec) => {
      setShowMockupModal(false);
      showToast(tf("editor.mockup_done", { n: rec.version }));
      window.open("/" + rec.filepath.replace(/^data\//, ""), "_blank");
      void qc.invalidateQueries({ queryKey: ["exports", id] });
    },
    onError: (e) => showToast((e as Error).message),
  });

  /* ---- export ---- */
  const [showExportModal, setShowExportModal] = useState(false);
  const exportsQ = useQuery({
    queryKey: ["exports", id],
    queryFn: () => api.documentExports(id),
    enabled: !!id,
  });

  /* FAZ4 §13: CMYK — gs tespiti + son print PDF'ten dönüşüm */
  const cmykQ = useQuery({ queryKey: ["cmyk-status"], queryFn: api.cmykStatus, staleTime: Infinity });
  const doCmyk = useMutation({
    mutationFn: () => api.exportCmyk(id),
    onSuccess: (r) => {
      showToast(`CMYK hazır: v${r.version}`);
      void qc.invalidateQueries({ queryKey: ["exports", id] });
    },
    onError: (e) => showToast((e as Error).message),
  });

  /* FAZ4 §5: snapshot'a dön — sunucu önce güvenlik kaydı yazar */
  const restoreDoc = useMutation({
    mutationFn: (exportId: string) => api.restoreDocument(id, exportId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["document", id] });
      void qc.invalidateQueries({ queryKey: ["exports", id] });
    },
  });
  const doExport = useMutation({
    /* tip bazlı yönlendirme: garment → PNG/broderie paketi; vitro decoupe → SVG;
       diğerleri → print+preview PDF */
    mutationFn: async (warnings: LayoutWarning[]) => {
      if (doc?.template_id === "garment") {
        const res = await api.exportGarment(id);
        return [res.record];
      }
      if (doc?.template_id.startsWith("vitro-") && doc.params["mode"] === "decoupe") {
        return [await api.exportSvg(id)];
      }
      return api.exportDocument(id, warnings);
    },
    onSuccess: (records) => {
      showToast(tf("editor.export_done", { n: records[0]?.version ?? "?" }));
      void qc.invalidateQueries({ queryKey: ["exports", id] });
    },
    onError: (e) => showToast(`${t("editor.export_error")}: ${(e as Error).message}`),
  });

  /* ---- analiz (uyarılar + sayfalar) ---- */
  const analysis = useMemo(() => {
    if (!client || !doc || !entry) return null;
    try {
      return analyzeDoc(client, doc);
    } catch {
      return null;
    }
  }, [client, doc, entry]);

  if (docQ.isLoading || clientQ.isLoading || !doc || !client || !entry) {
    return <p className="muted" style={{ padding: 24 }}>{t("common.loading")}</p>;
  }
  if (docQ.isError || clientQ.isError) {
    return <p className="error" style={{ padding: 24 }}>{t("common.error")}</p>;
  }

  const format = currentFormat(entry.manifest, doc);
  const missing = missingPhotoItems(resolveSelection(client.catalog, doc.selection));
  /* FAZ4 §9: fotoğrafsız ürünler için etiket eşleşmeli öneriler (müşteri + ortak havuz) */
  const photoSuggestions = suggestPhotos(
    missing.map((m) => m.item),
    client.assets
  );
  const warnings = analysis?.warnings ?? [];
  const pages = analysis?.pages ?? 1;
  const Component = entry.Component;

  /* seçim ağacı (kategori/ürün dahil-hariç + sürükle-sıra) SelectionPanel'de (§6) */

  const scrollToItem = (itemId: string) => {
    select(`item:${itemId}`);
    const el = canvasRef.current?.querySelector(`[data-slot="item:${itemId}"], [data-slot="item:${itemId}:photo"]`);
    el?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  };

  const copyRequest = () => {
    const lines = [t("missing.request_intro"), ...missing.map((m) => `- ${m.item.name_fr}`), t("missing.request_outro")];
    void navigator.clipboard.writeText(lines.join("\n")).then(() => showToast(t("missing.copied")));
  };

  const exportUrl = (r: ExportRecordDTO) => "/" + r.filepath.replace(/^data\//, "");

  return (
    <div className="editor-root">
      <input ref={photoFileRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={onPhotoFile} />

      {/* ÜST BAR */}
      <div className="editor-top">
        <Link to={`/clients/${client.id}`} className="muted">
          {t("editor.back")}
        </Link>
        <strong>{client.name}</strong>
        <span className="pill">{client.currency}</span>

        <label className="kbd-hint">{t("editor.template")}</label>
        <select value={doc.template_id} onChange={(e) => switchTemplate(e.target.value)}>
          {Object.values(TEMPLATES).map((e) => (
            <option key={e.manifest.id} value={e.manifest.id}>
              {e.manifest.name_tr}
            </option>
          ))}
        </select>

        <label className="kbd-hint">{t("editor.theme")}</label>
        <select value={doc.theme_id} onChange={(e) => patch({ theme_id: e.target.value })}>
          <option value="brand">{t("editor.theme_brand")}</option>
          {entry.manifest.themes.map((th) => (
            <option key={th} value={th}>
              {PRESET_THEMES[th]?.name_tr ?? th}
            </option>
          ))}
          {/* FAZ4 §7: özel temalar tüm şablonlarda seçilebilir */}
          {customThemeList().map((th) => (
            <option key={th.id} value={th.id}>
              {th.name_tr} ★
            </option>
          ))}
        </select>

        {entry.manifest.params.map((p) => {
          const val = paramValue(entry.manifest, doc, p.id);
          if (p.type === "number") {
            return (
              <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label className="kbd-hint">{p.label_tr}</label>
                <input
                  type="number"
                  value={Number(doc.params[p.id] ?? p.default)}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  style={{ width: 78, padding: "5px 6px" }}
                  onChange={(e) =>
                    patch({ params: { ...doc.params, [p.id]: Number(e.target.value) } })
                  }
                />
              </span>
            );
          }
          if (p.type === "color") {
            return (
              <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label className="kbd-hint">{p.label_tr}</label>
                <input
                  type="color"
                  value={String(doc.params[p.id] ?? p.default)}
                  onChange={(e) => patch({ params: { ...doc.params, [p.id]: e.target.value } })}
                />
              </span>
            );
          }
          if (p.type === "toggle") {
            return (
              <label key={p.id} className="kbd-hint" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={val === true}
                  onChange={(e) => patch({ params: { ...doc.params, [p.id]: e.target.checked } })}
                />
                {p.label_tr}
              </label>
            );
          }
          const opts = paramOptions(p, format);
          return (
            <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <label className="kbd-hint">{p.label_tr}</label>
              <select
                value={String(val)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const typed = opts.find((o) => String(o) === raw) ?? raw;
                  const next: Record<string, unknown> = { ...doc.params, [p.id]: typed };
                  if (p.id === "format") setPageIndex(0);
                  patch({ params: next });
                }}
              >
                {opts.map((o) => (
                  <option key={String(o)} value={String(o)}>
                    {p.id === "format" ? entry.manifest.formats[String(o)]?.label_tr ?? String(o) : String(o)}
                  </option>
                ))}
              </select>
            </span>
          );
        })}

        <label className="kbd-hint" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
          {t("editor.guides")}
        </label>

        <span className="spacer" />

        <button className="icon" onClick={undo} disabled={past.length === 0} title={t("editor.undo")}>↶</button>
        <button className="icon" onClick={redo} disabled={future.length === 0} title={t("editor.redo")}>↷</button>
        <button className="icon" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>−</button>
        <span className="kbd-hint">{Math.round(zoom * 100)}%</span>
        <button className="icon" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>

        <span className="kbd-hint">
          {saveState === "saving" && t("editor.saving")}
          {saveState === "saved" && t("editor.saved")}
          {saveState === "dirty" && "…"}
          {saveState === "error" && <span className="error">{t("editor.save_error")}</span>}
        </span>

        <button className="ghost" onClick={() => setShowMockupModal(true)} disabled={doMockup.isPending}>
          {doMockup.isPending ? t("editor.mockup_generating") : t("editor.mockup")}
        </button>
        {/* FAZ4 §13: gs varsa aktif; yoksa pasif + kurulum yönlendirmesi (ADR-4) */}
        <button
          className="ghost"
          disabled={!cmykQ.data?.available || doCmyk.isPending}
          title={cmykQ.data?.available ? `Ghostscript ${cmykQ.data.version}` : t("editor.cmyk_missing")}
          onClick={() => doCmyk.mutate()}
        >
          {t("editor.cmyk")}
        </button>
        <button
          onClick={() => (warnings.length > 0 ? setShowExportModal(true) : doExport.mutate([]))}
          disabled={doExport.isPending}
        >
          {doExport.isPending ? t("editor.exporting") : t("editor.export")}
        </button>
      </div>

      <div className="editor-body">
        {/* SOL PANEL — içerik seçimi + sayfalar (§6.1); garment'ta ALAN yönetimi */}
        <div className="editor-left">
          {doc.template_id === "garment" && (
            <div className="epanel">
              <h3>{t("editor.garment_areas")}</h3>
              {(() => {
                const kind = String(doc.params["garment_kind"] ?? "tshirt") as GarmentKind;
                const current = Array.isArray(doc.params["areas"])
                  ? (doc.params["areas"] as string[])
                  : [];
                return areasForKind(kind).map((aid) => (
                  <label key={aid} className="sel-item" style={{ paddingLeft: 0 }}>
                    <input
                      type="checkbox"
                      checked={current.includes(aid)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current, aid]
                          : current.filter((x) => x !== aid);
                        patch({ params: { ...doc.params, areas: next } });
                        setPageIndex(0);
                      }}
                    />
                    {GARMENT_AREAS[aid].label_tr} ({GARMENT_AREAS[aid].w_cm}×{GARMENT_AREAS[aid].h_cm})
                  </label>
                ));
              })()}
            </div>
          )}
          <SelectionPanel client={client} doc={doc} patch={patch} />

          {pages > 1 && (
            <div className="epanel">
              <h3>{t("editor.pages")}</h3>
              <div className="row">
                {Array.from({ length: pages }, (_, p) => (
                  <button
                    key={p}
                    className={p === pageIndex ? "small" : "ghost small"}
                    onClick={() => setPageIndex(p)}
                  >
                    {tf("editor.page_n", { n: p + 1 })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CANVAS */}
        <div className="editor-canvas" ref={canvasRef} onClick={() => select(null)} onDoubleClick={onCanvasDblClick}>
          <div className="canvas-scale" style={{ transform: `scale(${zoom})` }} onClick={(e) => e.stopPropagation()}>
            <Component
              client={client}
              doc={doc}
              mode="edit"
              pageIndex={Math.min(pageIndex, pages - 1)}
              showGuides={guides}
              selectedSlot={selectedSlot}
              onSlotClick={onSlotClick}
              editLabels={{ photoWaiting: t("missing.photo_waiting") }}
            />
          </div>
          {inline && (
            <input
              autoFocus
              type="text"
              value={inline.value}
              onChange={(e) => setInline({ ...inline, value: e.target.value })}
              onBlur={commitInline}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitInline();
                if (e.key === "Escape") setInline(null);
              }}
              style={{
                position: "absolute",
                left: inline.x,
                top: inline.y,
                width: inline.w,
                zIndex: 30,
                font: "inherit",
                padding: "6px 8px",
              }}
            />
          )}
        </div>

        {/* SAĞ PANEL — slot kontrolleri + uyarılar + eksik fotoğraflar (§6.1, §8.2) */}
        <div className="editor-right">
          <SlotPanel
            client={client}
            doc={doc}
            entry={entry}
            patch={patch}
            select={select}
            selectedSlot={selectedSlot}
            showToast={showToast}
          />

          <div className="epanel">
            <h3>{t("editor.warnings")}</h3>
            <div className="warn-list">
              {warnings.length === 0 && <div className="warn ok">{t("editor.no_warnings")}</div>}
              {warnings.map((w, i) => (
                <div key={i} className={`warn ${w.type === "broderie-info" ? "info" : w.type === "overflow-items" || ("level" in w && w.level === "red") ? "red" : ""}`}>
                  {warnText(w)}
                </div>
              ))}
            </div>
          </div>

          {missing.length > 0 && (
            <div className="epanel">
              <h3>{tf("missing.title", { n: missing.length })}</h3>
              {missing.map((m) => {
                /* FAZ4 §9: etiket eşleşmesi varsa Öneri çipi — tek tık bağlar, otomatik değil */
                const sugId = photoSuggestions.get(m.item.id)?.[0];
                const sug = sugId ? client?.assets.find((a) => a.id === sugId) : undefined;
                return (
                  <div className="missing-item" key={m.item.id} onClick={() => scrollToItem(m.item.id)}>
                    <span>{m.item.name_fr}</span>
                    {sug ? (
                      <button
                        className="ghost small"
                        title={tf("suggest.bind_title", { tags: sug.tags })}
                        disabled={bindSuggestion.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          bindSuggestion.mutate({ itemId: m.item.id, assetId: sug.id });
                        }}
                      >
                        <img src={sug.urls.thumb} alt="" style={{ width: 18, height: 18, objectFit: "cover", borderRadius: 3, verticalAlign: "-4px", marginRight: 4 }} />
                        {t("suggest.chip")}
                      </button>
                    ) : (
                      <span className="muted">{m.category.name_fr}</span>
                    )}
                  </div>
                );
              })}
              <button className="ghost small" onClick={copyRequest}>
                {t("missing.copy")}
              </button>
            </div>
          )}

          {(exportsQ.data?.length ?? 0) > 0 && (
            <div className="epanel">
              <h3>{t("history.title")}</h3>
              {exportsQ.data!.map((r) => (
                <div className="row" key={r.id} style={{ fontSize: 13 }}>
                  <span className="pill">v{r.version}</span>
                  {r.kind === "snapshot" ? (
                    <span className="muted">{t("history.snapshot_label")}</span>
                  ) : (
                    <>
                      <a href={exportUrl(r)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                        {r.kind === "print" ? t("editor.open_print") : t("editor.open_preview")}
                      </a>
                      <button
                        className="icon"
                        title={t("history.reveal")}
                        onClick={() => void api.reveal(r.filepath)}
                      >📂</button>
                    </>
                  )}
                  {/* FAZ4 §5: yalnız state taşıyan kayıtlarda görünür; onay şart */}
                  {["print", "preview", "decoupe", "broderie", "png", "snapshot"].includes(r.kind) && (
                    <button
                      className="icon"
                      title={t("history.restore")}
                      disabled={restoreDoc.isPending}
                      onClick={() => {
                        if (window.confirm(t("history.restore_confirm"))) restoreDoc.mutate(r.id);
                      }}
                    >⤺</button>
                  )}
                  <span className="muted">{new Date(r.created_at).toLocaleTimeString("tr-TR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EXPORT ONAY MODALI — uyarılara rağmen export kayda geçer (M4) */}
      {showExportModal && (
        <div className="modal-back" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>{t("editor.export_warn_title")}</h3>
            <div className="warn-list">
              {warnings.map((w, i) => (
                <div key={i} className="warn">{warnText(w)}</div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="ghost" onClick={() => setShowExportModal(false)}>
                {t("editor.cancel")}
              </button>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  doExport.mutate(warnings);
                }}
              >
                {t("editor.export_anyway")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOCKUP SAHNE SEÇİMİ (Faz 3, mimar #5/#6) */}
      {showMockupModal && (
        <div className="modal-back" onClick={() => setShowMockupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const all = scenesQ.data ?? [];
              const isGarment = doc.template_id === "garment";
              const fabric = String(doc.params["fabric_color"] ?? "");
              const sorted = [...all].sort((a, b) => {
                const score = (s: (typeof all)[number]) => {
                  if (isGarment) {
                    return (
                      (s.kind === "garment" ? 2 : 0) +
                      (s.settings.fabric_color && s.settings.fabric_color === fabric ? 1 : 0)
                    );
                  }
                  return s.kind === "vitrine" || s.kind === "facade" ? 1 : 0;
                };
                return score(b) - score(a);
              });
              if (sorted.length === 0) {
                return (
                  <>
                    <h3 style={{ margin: 0 }}>{t("editor.mockup_none_title")}</h3>
                    <p className="muted">{t("editor.mockup_none_body")}</p>
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button className="ghost" onClick={() => setShowMockupModal(false)}>
                        {t("editor.cancel")}
                      </button>
                      <button onClick={() => (window.location.href = `/clients/${client.id}?tab=scenes`)}>
                        {t("editor.mockup_go_scenes")}
                      </button>
                    </div>
                  </>
                );
              }
              return (
                <>
                  <h3 style={{ margin: 0 }}>{t("editor.mockup_pick")}</h3>
                  <div className="asset-pick" style={{ maxHeight: 280 }}>
                    {sorted.map((s) => (
                      <div key={s.id} style={{ textAlign: "center", width: 96 }}>
                        <img
                          src={s.photo_urls?.thumb ?? ""}
                          style={{ width: 92, height: 68, objectFit: "cover" }}
                          className=""
                          onClick={() => doMockup.mutate(s.id)}
                          alt={s.name}
                          title={`${s.name} · ${s.kind}`}
                        />
                        <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.name}
                        </div>
                        {/* HF-TRIO-01/FIX-3 (m.10): canlı önizlemeye GÖRÜNÜR yol —
                            hires eylemi bu sayfada yaşıyor, kapısı yoktu (URL-only) */}
                        <a
                          href={`/mockup/${id}?scene=${s.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 10, display: "inline-block", marginTop: 2 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("editor.mockup_live")}
                        </a>
                      </div>
                    ))}
                  </div>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="ghost" onClick={() => setShowMockupModal(false)}>
                      {t("editor.cancel")}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
