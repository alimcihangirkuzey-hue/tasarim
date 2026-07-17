/* /present/:projectId?docs=a,b&note=...&date=... — Sunum PDF sayfası (FAZ2-GOREV §7).
   Mimar kararı #1: her belge koyu zemin üzerinde gölgeli "sunum kartı" olarak sahnelenir.
   Yapı: kapak → belge başına kart → BAT sayfası. A4 dikey.

   F8-E/H4: &mode=per_scene_kind&mplan=[...] → belge×sahne-türü çok-yüzey sunum:
   tür başına EN SON mockup ayrı tam sayfa + tür etiketi + varsa client_surfaces
   ölçüsü; kapakta "N tasarım · M yüzey"; BAT'ta Surfaces satırı. Param yoksa
   mode=last — ESKİ ÇIKTI BİREBİR (sunucu "last"ta bu paramları hiç yazmaz). */

import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { TEMPLATES, currentFormat } from "@tezgah/templates";
import { surfaceToSceneKind } from "@tezgah/shared";
import type { ClientDTO, DocumentDTO, SceneKind } from "@tezgah/shared";
import { api } from "../api";

const PAGE_W = 210;
const PAGE_H = 297;

/* F8-E: sunucunun seçtiği çok-yüzey plan girdisi (URL mplan): d=doc · f=filepath · k=tür */
type PlanEntry = { d: string; f: string; k: SceneKind };

/* Tür etiketleri — i18n kind_* değerleriyle aynı (bu sayfa i18n hook'suz print yüzeyi) */
const KIND_TR: Record<SceneKind, string> = {
  vitrine: "Vitrin",
  facade: "Cephe",
  garment: "Giyim",
  generic: "Genel",
};

function DocCard({ doc, client, boxW, boxH }: {
  doc: DocumentDTO;
  client: ClientDTO;
  boxW: number;
  boxH: number;
}) {
  const entry = TEMPLATES[doc.template_id];
  if (!entry) return null;
  const size = entry.pageSizeMM
    ? entry.pageSizeMM(client, doc)
    : (() => {
        const fmtId = currentFormat(entry.manifest, doc);
        const f = (entry.manifest.formats as Record<string, { w_mm: number; h_mm: number }>)[fmtId];
        return { w_mm: f.w_mm, h_mm: f.h_mm, bleed_mm: entry.manifest.bleed_mm };
      })();
  const fmt = size;
  const B = size.bleed_mm;
  const scale = Math.min(boxW / fmt.w_mm, boxH / fmt.h_mm);
  return (
    <div
      style={{
        width: `${fmt.w_mm * scale}mm`,
        height: `${fmt.h_mm * scale}mm`,
        overflow: "hidden",
        boxShadow: "0 6mm 12mm rgba(0,0,0,0.55), 0 1mm 3mm rgba(0,0,0,0.4)",
        borderRadius: "1mm",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          marginLeft: `${-B * scale}mm`,
          marginTop: `${-B * scale}mm`,
          lineHeight: 0,
        }}
      >
        <entry.Component client={client} doc={doc} mode="print" pageIndex={0} cropMarks={false} />
      </div>
    </div>
  );
}

export function PresentPage() {
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const docIds = (sp.get("docs") ?? "").split(",").filter(Boolean);
  const note = sp.get("note") ?? "";
  const date = sp.get("date") ?? new Date().toISOString().slice(0, 10);
  const includeMockups = sp.get("mockups") !== "0";
  /* F8-E: mode paramı yoksa "last" — eski davranış birebir */
  const mode: "last" | "per_scene_kind" =
    sp.get("mode") === "per_scene_kind" ? "per_scene_kind" : "last";
  const mplan = useMemo<PlanEntry[]>(() => {
    if (mode !== "per_scene_kind") return [];
    try {
      const parsed = JSON.parse(sp.get("mplan") ?? "[]") as PlanEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [sp, mode]);

  const projectQ = useQuery({ queryKey: ["project", id], queryFn: () => api.project(id), enabled: !!id });
  const docQs = useQueries({
    queries: docIds.map((d) => ({ queryKey: ["document", d], queryFn: () => api.document(d) })),
  });
  const clientId = projectQ.data?.client_id;
  const clientQ = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api.client(clientId!),
    enabled: !!clientId,
  });

  const docs = docQs.map((q) => q.data).filter((d): d is DocumentDTO => !!d);

  /* FAZ3-GOREV §3.4: belge başına SON mockup (varsa) tam sayfa eklenir (mode=last) */
  const exportQs = useQueries({
    queries: docIds.map((d) => ({
      queryKey: ["exports", d],
      queryFn: () => api.documentExports(d),
      enabled: includeMockups && mode === "last",
    })),
  });
  const mockupOf = (docId: string): string | null => {
    if (!includeMockups) return null;
    const idx = docIds.indexOf(docId);
    const recs = exportQs[idx]?.data ?? [];
    const m = recs.find((r) => r.kind === "mockup");
    return m ? "/" + m.filepath.replace(/^data\//, "") : null;
  };
  /* F8-E: yüzey etiket/ölçü satırı için müşteri yüzey profili (yalnız çok-yüzey modu) */
  const surfacesQ = useQuery({
    queryKey: ["surfaces", clientId],
    queryFn: () => api.clientSurfaces(clientId!),
    enabled: !!clientId && mode === "per_scene_kind",
  });
  const planOf = (docId: string): PlanEntry[] => mplan.filter((e) => e.d === docId);
  const surfacesFor = (k: SceneKind) =>
    (surfacesQ.data ?? []).filter((s) => surfaceToSceneKind(s.kind) === k);
  const surfaceKindCount = new Set(mplan.map((e) => e.k)).size;
  const exportsReady =
    !includeMockups ||
    (mode === "last"
      ? exportQs.every((q) => q.data !== undefined)
      : surfacesQ.data !== undefined);
  const mockupCount = mode === "last" ? docs.filter((d) => mockupOf(d.id)).length : mplan.length;

  const ready =
    !!projectQ.data && !!clientQ.data && docs.length === docIds.length && docIds.length > 0 && exportsReady;

  useEffect(() => {
    if (!ready) return;
    void document.fonts.ready.then(() => {
      window.__PAGE_SIZE__ = { w: PAGE_W, h: PAGE_H, pages: 2 + docs.length + mockupCount };
      window.__PRINT_READY__ = true;
    });
  }, [ready, docs.length, mockupCount]);

  if (!ready) return null;
  const client = clientQ.data!;
  const project = projectQ.data!;

  const sheet: React.CSSProperties = {
    width: `${PAGE_W}mm`,
    height: `${PAGE_H}mm`,
    overflow: "hidden",
    position: "relative",
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div>
      <style>{`
        html, body { margin: 0; padding: 0; }
        .psheet { page-break-after: always; }
      `}</style>

      {/* KAPAK */}
      <div className="psheet" style={{ ...sheet, background: "#141416", color: "#F5F1E8", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "6mm" }}>
        <div style={{ fontSize: "7mm", letterSpacing: "2mm", fontWeight: 800 }}>
          TEZG<span style={{ color: "#C8102E" }}>Â</span>H
        </div>
        <div style={{ width: "40mm", height: "0.6mm", background: "#C8102E" }} />
        <div style={{ fontSize: "11mm", fontWeight: 700, textAlign: "center", maxWidth: "160mm" }}>
          {client.name}
        </div>
        <div style={{ fontSize: "5mm", opacity: 0.75 }}>{project.name}</div>
        <div style={{ fontSize: "3.6mm", opacity: 0.55 }}>
          {date} · {docs.length} tasarım
          {mode === "per_scene_kind" ? ` · ${surfaceKindCount} yüzey` : ""} · Proposition de design
        </div>
      </div>

      {/* SUNUM KARTLARI (mimar kararı #1) + mockup sayfaları (FAZ3 §3.4) */}
      {docs.map((d) => {
        const entry = TEMPLATES[d.template_id];
        const mockupUrl = mockupOf(d.id);
        /* F8-E: last → tek (en son) mockup sayfası (eski çıktı birebir);
           per_scene_kind → plandaki tür-başına sayfalar (deterministik sıra) */
        const mpages: Array<{ url: string; k: SceneKind | null }> =
          mode === "last"
            ? mockupUrl
              ? [{ url: mockupUrl, k: null }]
              : []
            : planOf(d.id).map((e) => ({ url: "/" + e.f.replace(/^data\//, ""), k: e.k }));
        return (
          <div key={d.id} style={{ display: "contents" }}>
            <div className="psheet" style={{ ...sheet, background: "#232327", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "7mm" }}>
              <DocCard doc={d} client={client} boxW={168} boxH={225} />
              <div style={{ color: "#D8D3C8", fontSize: "4mm", display: "flex", gap: "4mm", alignItems: "baseline" }}>
                <strong>{entry?.manifest.name_tr ?? d.template_id}</strong>
                <span style={{ opacity: 0.6, fontSize: "3.2mm" }}>
                  {String(d.params["format"] ?? entry?.manifest.defaultFormat ?? "")}
                  {entry?.pageCount && entry.pageCount(client, d) > 1 ? " · 2 yüz" : ""}
                </span>
              </div>
            </div>
            {mpages.map((mp) => {
              const surfaces = mp.k ? surfacesFor(mp.k) : [];
              return (
                <div key={mp.url} className="psheet" style={{ ...sheet, background: "#1B1B1E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5mm" }}>
                  <img src={mp.url} style={{ maxWidth: "180mm", maxHeight: "240mm", borderRadius: "1.5mm", boxShadow: "0 6mm 14mm rgba(0,0,0,0.6)" }} alt="mockup" />
                  <div style={{ color: "#D8D3C8", fontSize: "3.6mm" }}>
                    Mise en situation — {entry?.manifest.name_tr ?? d.template_id}
                    {mp.k ? ` · ${KIND_TR[mp.k]}` : ""}
                  </div>
                  {/* F8-E: yüzey etiketi + cm — client_surfaces → surfaceToSceneKind eşleşmesi */}
                  {surfaces.length > 0 && (
                    <div style={{ color: "#A8A296", fontSize: "3mm" }}>
                      {surfaces
                        .map((s) => (s.w_cm && s.h_cm ? `${s.label} (${s.w_cm}×${s.h_cm} cm)` : s.label))
                        .join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* BAT SAYFASI */}
      <div className="psheet" style={{ ...sheet, background: "#ffffff", color: "#1A1A1A", padding: "18mm", boxSizing: "border-box" }}>
        <div style={{ fontSize: "8mm", fontWeight: 800, letterSpacing: "1mm" }}>BON À TIRER</div>
        <div style={{ width: "28mm", height: "0.8mm", background: "#C8102E", margin: "3mm 0 8mm" }} />

        <div style={{ display: "flex", gap: "4mm", flexWrap: "wrap", marginBottom: "8mm" }}>
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} client={client} boxW={40} boxH={54} />
          ))}
        </div>

        <table style={{ fontSize: "3.6mm", borderCollapse: "collapse", marginBottom: "8mm" }}>
          <tbody>
            {[
              ["Client", client.name],
              ["Projet", project.name],
              ["Date", date],
              ["Documents", String(docs.length)],
              /* F8-E: yüzey satırı yalnız çok-yüzey modunda (last çıktısı birebir eski) */
              ...(mode === "per_scene_kind"
                ? ([["Surfaces", String(surfaceKindCount)]] as Array<[string, string]>)
                : []),
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "1.2mm 6mm 1.2mm 0", color: "#8a8378" }}>{k}</td>
                <td style={{ fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: "3.2mm", color: "#555", maxWidth: "150mm", marginBottom: "12mm", whiteSpace: "pre-wrap" }}>
          {note}
        </div>

        <div style={{ display: "flex", gap: "10mm", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "3.4mm", marginBottom: "2mm", fontWeight: 600 }}>
              Bon pour accord — Signature :
            </div>
            <div style={{ width: "80mm", height: "28mm", border: "0.4mm solid #1A1A1A", borderRadius: "1.5mm" }} />
          </div>
          <div>
            <div style={{ fontSize: "3.4mm", marginBottom: "2mm", fontWeight: 600 }}>Date :</div>
            <div style={{ width: "40mm", height: "28mm", border: "0.4mm solid #1A1A1A", borderRadius: "1.5mm" }} />
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "10mm", left: "18mm", right: "18mm", fontSize: "2.8mm", color: "#8a8378", display: "flex", justifyContent: "space-between" }}>
          <span>TEZGÂH — Atelier graphique</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}
