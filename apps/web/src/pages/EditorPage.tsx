/* Kısıtlı editör — CONSTITUTION §6. Kullanıcı yalnız tanımlı slotları düzenler (M2);
   canvas aynı şablon bileşenini mode:"edit" ile çizer (M3). */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PRESET_THEMES,
  TEMPLATES,
  currentFormat,
  missingPhotoItems,
  paramOptions,
  paramValue,
  resolveSelection,
  type LayoutWarning,
} from "@tezgah/templates";
import type { DocumentState, ExportRecordDTO } from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";
import { analyzeDoc } from "../lib/analyzeDoc";
import { SlotPanel } from "../components/SlotPanel";
import { useEditor } from "../store/editorStore";

const MM_PX = 96 / 25.4;

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

  /* ---- export ---- */
  const [showExportModal, setShowExportModal] = useState(false);
  const exportsQ = useQuery({
    queryKey: ["exports", id],
    queryFn: () => api.documentExports(id),
    enabled: !!id,
  });
  const doExport = useMutation({
    mutationFn: (warnings: LayoutWarning[]) => api.exportDocument(id, warnings),
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
  const warnings = analysis?.warnings ?? [];
  const pages = analysis?.pages ?? 1;
  const Component = entry.Component;

  /* seçim ağacı yardımcıları */
  const allCatIds = client.catalog.categories.map((c) => c.id);
  const included = doc.selection.category_order.length === 0 ? allCatIds : doc.selection.category_order;
  const setOrder = (order: string[]) => patch({ selection: { ...doc.selection, category_order: order } });
  const toggleCat = (cid: string, on: boolean) => {
    const base = included.filter((x) => allCatIds.includes(x));
    setOrder(on ? [...base, cid] : base.filter((x) => x !== cid));
  };
  const moveCat = (cid: string, dir: -1 | 1) => {
    const base = [...included];
    const i = base.indexOf(cid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= base.length) return;
    [base[i], base[j]] = [base[j], base[i]];
    setOrder(base);
  };
  const toggleItem = (itemId: string, on: boolean) => {
    const set = new Set(doc.selection.excluded_items);
    if (on) set.delete(itemId);
    else set.add(itemId);
    patch({ selection: { ...doc.selection, excluded_items: [...set] } });
  };

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
        </select>

        {entry.manifest.params.map((p) => {
          const val = paramValue(entry.manifest, doc, p.id);
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

        <button
          onClick={() => (warnings.length > 0 ? setShowExportModal(true) : doExport.mutate([]))}
          disabled={doExport.isPending}
        >
          {doExport.isPending ? t("editor.exporting") : t("editor.export")}
        </button>
      </div>

      <div className="editor-body">
        {/* SOL PANEL — içerik seçimi + sayfalar (§6.1) */}
        <div className="editor-left">
          <div className="epanel">
            <h3>{t("editor.selection")}</h3>
            {client.catalog.categories.map((c) => {
              const on = included.includes(c.id);
              return (
                <div className="sel-cat" key={c.id}>
                  <label>
                    <input type="checkbox" checked={on} onChange={(e) => toggleCat(c.id, e.target.checked)} />
                    <span style={{ flex: 1 }}>{c.name_fr}</span>
                    <span className="rowbtns">
                      <button className="icon" onClick={() => moveCat(c.id, -1)}>↑</button>
                      <button className="icon" onClick={() => moveCat(c.id, 1)}>↓</button>
                    </span>
                  </label>
                  {on &&
                    c.items
                      .filter((i) => i.visible)
                      .map((i) => (
                        <label className="sel-item" key={i.id}>
                          <input
                            type="checkbox"
                            checked={!doc.selection.excluded_items.includes(i.id)}
                            onChange={(e) => toggleItem(i.id, e.target.checked)}
                          />
                          {i.name_fr}
                          {!i.photo && <span title={t("missing.photo_waiting")}>📷</span>}
                        </label>
                      ))}
                </div>
              );
            })}
          </div>

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
          />

          <div className="epanel">
            <h3>{t("editor.warnings")}</h3>
            <div className="warn-list">
              {warnings.length === 0 && <div className="warn ok">{t("editor.no_warnings")}</div>}
              {warnings.map((w, i) => (
                <div key={i} className={`warn ${w.type === "overflow-items" || ("level" in w && w.level === "red") ? "red" : ""}`}>
                  {warnText(w)}
                </div>
              ))}
            </div>
          </div>

          {missing.length > 0 && (
            <div className="epanel">
              <h3>{tf("missing.title", { n: missing.length })}</h3>
              {missing.map((m) => (
                <div className="missing-item" key={m.item.id} onClick={() => scrollToItem(m.item.id)}>
                  <span>{m.item.name_fr}</span>
                  <span className="muted">{m.category.name_fr}</span>
                </div>
              ))}
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
                  <a href={exportUrl(r)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                    {r.kind === "print" ? t("editor.open_print") : t("editor.open_preview")}
                  </a>
                  <button
                    className="icon"
                    title={t("history.reveal")}
                    onClick={() => void api.reveal(r.filepath)}
                  >📂</button>
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
