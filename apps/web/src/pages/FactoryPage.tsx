/* ŞABLON FABRİKASI — FAZ4-GOREV §12, mimar kararı #12.
   Akış: (a) SVG yükle & temizle + gerçek boyut → (b) elemana tıkla, slot ata →
   (c) bir grubu prototip hücre yap, içindekileri item-slot eşle →
   (d) Üret: src/generated/<id>/ dosyaları yazılır, şablon anında kayıtlı.
   Karmaşık akışlar kapsam dışı — üretilen kod elle rafine edilir. */

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sanitizeSvg } from "@tezgah/templates";
import { t } from "../i18n";
import { SettingsTabs } from "./ParseDictPage";

type SlotKind = "text" | "image" | "color" | "price" | "qr" | "badge";
type ItemSlotKind = "name" | "desc" | "photo" | "price";

interface Mark {
  tfId: string;
  slotId: string;
  kind: SlotKind;
  bind: string | null;
  default_fr?: string;
  maxLines?: number;
  fontMin?: number;
  fontMax?: number;
}
interface ItemMark {
  tfId: string;
  slot: ItemSlotKind;
}

/* bind açılır listesi — bilinen yollar; serbest metin de yazılabilir */
const KNOWN_BINDS = [
  "brand.logo_primary", "brand.logo_mono", "brand.slogan_fr",
  "brand.contact.phone", "brand.contact.address", "brand.contact.hours",
  "brand.contact.instagram", "brand.contact.google_review_url",
  "brand.badges.halal", "catalog.footnote_fr",
];

let TF_SEQ = 0;

export function FactoryPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [wCm, setWCm] = useState("21");
  const [hCm, setHCm] = useState("29.7");
  const [tplId, setTplId] = useState("");
  const [tplName, setTplName] = useState("");

  const [selected, setSelected] = useState<Element | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [protoTf, setProtoTf] = useState<string | null>(null);
  const [itemMarks, setItemMarks] = useState<ItemMark[]>([]);
  const [cols, setCols] = useState("2");
  const [gap, setGap] = useState("10");
  const [yon, setYon] = useState<"row" | "column">("row");
  const [startedAt] = useState(() => Date.now()); /* kabul 12: insan akışı süre ölçümü */

  /* slot formu */
  const [fKind, setFKind] = useState<SlotKind>("text");
  const [fSlotId, setFSlotId] = useState("");
  const [fBind, setFBind] = useState("");
  const [fItemSlot, setFItemSlot] = useState<ItemSlotKind>("name");

  const onFile = async (f: File) => {
    const raw = await f.text();
    const r = sanitizeSvg(raw);
    setRemoved(r.removed);
    setViewBox(r.viewBox);
    if (r.viewBox) {
      /* boyut önerisi: en boy oranını koru (A4 genişlik varsayımı) */
      const ratio = r.viewBox.h / r.viewBox.w;
      setHCm((21 * ratio).toFixed(1));
    }
    setSvgText(r.svg);
    setMarks([]);
    setItemMarks([]);
    setProtoTf(null);
    setSelected(null);
    /* render sonrası her elemana tf-id ver */
    window.setTimeout(() => {
      const root = hostRef.current?.querySelector("svg");
      if (!root) return;
      root.querySelectorAll("*").forEach((el) => {
        if (!el.getAttribute("data-tf-id")) el.setAttribute("data-tf-id", `tf${TF_SEQ++}`);
      });
    }, 50);
  };

  const tfOf = (el: Element | null) => el?.getAttribute("data-tf-id") ?? null;
  const markOf = (el: Element | null) => marks.find((m) => m.tfId === tfOf(el));
  const insideProto = (el: Element | null) =>
    !!protoTf && !!el?.closest(`[data-tf-id="${protoTf}"]`) && tfOf(el) !== protoTf;

  const onCanvasClick = (e: React.MouseEvent) => {
    const el = (e.target as Element).closest("[data-tf-id]");
    if (!el || el.tagName === "svg") return;
    setSelected(el);
    const m = markOf(el);
    if (m) {
      setFKind(m.kind);
      setFSlotId(m.slotId);
      setFBind(m.bind ?? "");
    } else {
      setFSlotId("");
      setFBind("");
    }
  };

  const outline = (el: Element, color: string) =>
    (el as SVGElement).style.setProperty("outline", `2px solid ${color}`);
  const clearOutline = (el: Element) => (el as SVGElement).style.removeProperty("outline");

  const addMark = () => {
    if (!selected) return;
    const tfId = tfOf(selected)!;
    if (insideProto(selected)) {
      setItemMarks((prev) => [...prev.filter((x) => x.tfId !== tfId), { tfId, slot: fItemSlot }]);
      outline(selected, "#7C3AED");
      return;
    }
    const slotId = fSlotId.trim() || `${fKind}${marks.length + 1}`;
    const mark: Mark = {
      tfId, slotId, kind: fKind,
      bind: fBind.trim() || null,
      default_fr: fKind === "text" && !fBind.trim() ? selected.textContent?.trim() || "" : undefined,
      maxLines: fKind === "text" ? 1 : undefined,
      fontMin: fKind === "text" ? 3 : undefined,
      fontMax: fKind === "text" ? 14 : undefined,
    };
    setMarks((prev) => [...prev.filter((x) => x.tfId !== tfId), mark]);
    outline(selected, "#16A34A");
  };

  const makeProto = () => {
    if (!selected) return;
    const tfId = tfOf(selected)!;
    setProtoTf(tfId);
    outline(selected, "#2563EB");
  };

  const removeMark = (tfId: string) => {
    setMarks((prev) => prev.filter((m) => m.tfId !== tfId));
    setItemMarks((prev) => prev.filter((m) => m.tfId !== tfId));
    const el = hostRef.current?.querySelector(`[data-tf-id="${tfId}"]`);
    if (el) clearOutline(el);
  };

  /* --- (d) Üret: DOM'dan geometri topla, statikleri ayıkla, POST et --- */
  const generate = useMutation({
    mutationFn: async () => {
      const root = hostRef.current?.querySelector("svg");
      if (!root || !viewBox) throw new Error("SVG yok");
      const wMm = parseFloat(wCm.replace(",", ".")) * 10;
      const hMm = parseFloat(hCm.replace(",", ".")) * 10;

      const geo = (el: Element) => {
        const b = (el as SVGGraphicsElement).getBBox();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      };
      const textAttrs = (el: Element) => {
        const te = el.tagName === "text" ? el : el.querySelector("text");
        if (!te) return undefined;
        const cs = getComputedStyle(te);
        return {
          x: parseFloat(te.getAttribute("x") ?? "0"),
          y: parseFloat(te.getAttribute("y") ?? "0"),
          fontSize: parseFloat(cs.fontSize) || 12,
          anchor: te.getAttribute("text-anchor") ?? "start",
          fill: te.getAttribute("fill") ?? "var(--c-item)",
        };
      };

      const findEl = (tfId: string) => root.querySelector(`[data-tf-id="${tfId}"]`)!;

      const marksPayload = marks.map((m) => {
        const el = findEl(m.tfId);
        return {
          slotId: m.slotId, kind: m.kind, bind: m.bind,
          default_fr: m.default_fr, maxLines: m.maxLines,
          font_mm: m.fontMin != null ? { min: m.fontMin, max: m.fontMax ?? 14 } : undefined,
          bbox: geo(el),
          text: m.kind === "text" || m.kind === "price" ? textAttrs(el) : undefined,
          chunk: m.kind === "badge" ? el.outerHTML : undefined,
        };
      });

      let protoPayload = null;
      if (protoTf) {
        const protoEl = findEl(protoTf);
        const pb = geo(protoEl);
        const clone = protoEl.cloneNode(true) as Element;
        for (const im of itemMarks) {
          clone.querySelector(`[data-tf-id="${im.tfId}"]`)?.remove();
        }
        (clone as SVGElement).style.removeProperty("outline");
        protoPayload = {
          bbox: pb,
          cols: Math.max(1, parseInt(cols) || 1),
          gap: Math.max(0, parseFloat(gap) || 0),
          yon,
          staticChunk: clone.outerHTML,
          itemSlots: itemMarks.map((im) => {
            const el = findEl(im.tfId);
            const b = geo(el);
            const ta = textAttrs(el);
            return {
              slot: im.slot,
              bbox: { x: b.x - pb.x, y: b.y - pb.y, w: b.w, h: b.h },
              text: ta ? { ...ta, x: ta.x - pb.x, y: ta.y - pb.y } : undefined,
            };
          }),
        };
      }

      /* statik taban: işaretliler + proto çıkarılır; tf-id ve outline izleri temizlenir */
      const cloneRoot = root.cloneNode(true) as SVGSVGElement;
      for (const m of marks) cloneRoot.querySelector(`[data-tf-id="${m.tfId}"]`)?.remove();
      if (protoTf) cloneRoot.querySelector(`[data-tf-id="${protoTf}"]`)?.remove();
      cloneRoot.querySelectorAll("[data-tf-id]").forEach((el) => {
        el.removeAttribute("data-tf-id");
        (el as SVGElement).style.removeProperty("outline");
      });

      const res = await fetch("/api/factory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tplId.trim(),
          name_tr: tplName.trim() || tplId.trim(),
          w_mm: wMm, h_mm: hMm,
          viewBox, staticInner: cloneRoot.innerHTML,
          marks: marksPayload, proto: protoPayload,
        }),
      });
      const j = (await res.json()) as { files?: string[]; detail?: string; error?: string };
      if (!res.ok) throw new Error(j.detail ?? j.error ?? String(res.status));
      return { files: j.files!, seconds: Math.round((Date.now() - startedAt) / 1000) };
    },
  });

  const scale = useMemo(() => (viewBox ? Math.min(720 / viewBox.w, 900 / viewBox.h) : 1), [viewBox]);

  return (
    <div>
      <SettingsTabs active="factory" />
      <h2>{t("factory.title")}</h2>

      {!svgText && (
        <div className="panel">
          <p className="muted">{t("factory.intro")}</p>
          <input
            type="file"
            accept=".svg,image/svg+xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </div>
      )}

      {svgText && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
          {/* CANVAS */}
          <div>
            {removed.length > 0 && (
              <div className="warn" style={{ marginBottom: 8 }}>
                {t("factory.removed")}: {removed.join(", ")}
              </div>
            )}
            <div
              ref={hostRef}
              onClick={onCanvasClick}
              style={{
                border: "1px solid #d6d0c4", borderRadius: 8, overflow: "auto",
                maxHeight: 900, cursor: "crosshair", background: "#fff",
                transformOrigin: "top left",
              }}
              dangerouslySetInnerHTML={{ __html: svgText.replace("<svg", `<svg style="width:${(viewBox?.w ?? 600) * scale}px;height:auto"`) }}
            />
          </div>

          {/* PANEL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="epanel">
              <h3>{t("factory.size")}</h3>
              <div className="row" style={{ gap: 6 }}>
                <input type="text" value={wCm} onChange={(e) => setWCm(e.target.value)} style={{ width: 60 }} /> ×
                <input type="text" value={hCm} onChange={(e) => setHCm(e.target.value)} style={{ width: 60 }} /> cm
              </div>
              <input type="text" placeholder={t("factory.tpl_id")} value={tplId} onChange={(e) => setTplId(e.target.value)} />
              <input type="text" placeholder={t("factory.tpl_name")} value={tplName} onChange={(e) => setTplName(e.target.value)} />
            </div>

            <div className="epanel">
              <h3>{t("factory.mark")}</h3>
              {!selected && <p className="muted" style={{ fontSize: 13 }}>{t("factory.pick_hint")}</p>}
              {selected && (
                <>
                  <p className="muted" style={{ fontSize: 12 }}>
                    &lt;{selected.tagName}&gt; {insideProto(selected) ? "· prototip İÇİ" : ""}
                  </p>
                  {insideProto(selected) ? (
                    <select value={fItemSlot} onChange={(e) => setFItemSlot(e.target.value as ItemSlotKind)}>
                      <option value="name">name (ürün adı)</option>
                      <option value="desc">desc (açıklama)</option>
                      <option value="photo">photo (foto)</option>
                      <option value="price">price (fiyat)</option>
                    </select>
                  ) : (
                    <>
                      <select value={fKind} onChange={(e) => setFKind(e.target.value as SlotKind)}>
                        {(["text", "image", "color", "price", "qr", "badge"] as const).map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                      <input type="text" placeholder="slot id (örn. title)" value={fSlotId} onChange={(e) => setFSlotId(e.target.value)} />
                      <input type="text" list="tf-binds" placeholder="bind (boş = serbest metin)" value={fBind} onChange={(e) => setFBind(e.target.value)} />
                      <datalist id="tf-binds">
                        {KNOWN_BINDS.map((b) => <option key={b} value={b} />)}
                      </datalist>
                    </>
                  )}
                  <div className="row" style={{ gap: 6 }}>
                    <button onClick={addMark}>{t("factory.add_slot")}</button>
                    {!insideProto(selected) && (
                      <button className="ghost" onClick={makeProto}>{t("factory.make_proto")}</button>
                    )}
                  </div>
                </>
              )}
            </div>

            {protoTf && (
              <div className="epanel">
                <h3>{t("factory.proto")}</h3>
                <div className="row" style={{ gap: 6, fontSize: 13 }}>
                  <label>cols <input type="text" value={cols} onChange={(e) => setCols(e.target.value)} style={{ width: 36 }} /></label>
                  <label>gap <input type="text" value={gap} onChange={(e) => setGap(e.target.value)} style={{ width: 44 }} /></label>
                  <select value={yon} onChange={(e) => setYon(e.target.value as "row" | "column")}>
                    <option value="row">satır satır</option>
                    <option value="column">sütun sütun</option>
                  </select>
                </div>
                <p className="muted" style={{ fontSize: 12 }}>{t("factory.proto_hint")}</p>
                <div style={{ fontSize: 12 }}>
                  {itemMarks.map((im) => (
                    <div key={im.tfId} className="row">
                      <span className="pill">{im.slot}</span>
                      <button className="icon" onClick={() => removeMark(im.tfId)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="epanel">
              <h3>{t("factory.slots")} ({marks.length})</h3>
              {marks.map((m) => (
                <div key={m.tfId} className="row" style={{ fontSize: 13 }}>
                  <span className="pill">{m.kind}</span>
                  <span style={{ flex: 1 }}>{m.slotId}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{m.bind ?? "serbest"}</span>
                  <button className="icon" onClick={() => removeMark(m.tfId)}>✕</button>
                </div>
              ))}
              <button
                disabled={!tplId.trim() || (marks.length === 0 && !protoTf) || generate.isPending}
                onClick={() => generate.mutate()}
              >
                ⚙ {t("factory.generate")}
              </button>
              {generate.isError && <span className="error">{(generate.error as Error).message}</span>}
              {generate.data && (
                <div className="warn ok" style={{ fontSize: 12 }}>
                  {t("factory.done")} ({generate.data.seconds} sn)
                  <ul style={{ margin: "4px 0 0 16px" }}>
                    {generate.data.files.map((f) => <li key={f}><code>{f}</code></li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
