/* /present/:projectId?docs=a,b&note=...&date=... — Sunum PDF sayfası (FAZ2-GOREV §7).
   Mimar kararı #1: her belge koyu zemin üzerinde gölgeli "sunum kartı" olarak sahnelenir.
   Yapı: kapak → belge başına kart → BAT sayfası. A4 dikey. */

import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { TEMPLATES, currentFormat } from "@tezgah/templates";
import type { ClientDTO, DocumentDTO } from "@tezgah/shared";
import { api } from "../api";

const PAGE_W = 210;
const PAGE_H = 297;

function DocCard({ doc, client, boxW, boxH }: {
  doc: DocumentDTO;
  client: ClientDTO;
  boxW: number;
  boxH: number;
}) {
  const entry = TEMPLATES[doc.template_id];
  if (!entry) return null;
  const fmtId = currentFormat(entry.manifest, doc);
  const fmt = (entry.manifest.formats as Record<string, { w_mm: number; h_mm: number }>)[fmtId];
  const B = entry.manifest.bleed_mm;
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
  const ready = !!projectQ.data && !!clientQ.data && docs.length === docIds.length && docIds.length > 0;

  useEffect(() => {
    if (!ready) return;
    void document.fonts.ready.then(() => {
      window.__PAGE_SIZE__ = { w: PAGE_W, h: PAGE_H, pages: 2 + docs.length };
      window.__PRINT_READY__ = true;
    });
  }, [ready, docs.length]);

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
          {date} · {docs.length} tasarım · Proposition de design
        </div>
      </div>

      {/* SUNUM KARTLARI (mimar kararı #1) */}
      {docs.map((d) => {
        const entry = TEMPLATES[d.template_id];
        return (
          <div key={d.id} className="psheet" style={{ ...sheet, background: "#232327", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "7mm" }}>
            <DocCard doc={d} client={client} boxW={168} boxH={225} />
            <div style={{ color: "#D8D3C8", fontSize: "4mm", display: "flex", gap: "4mm", alignItems: "baseline" }}>
              <strong>{entry?.manifest.name_tr ?? d.template_id}</strong>
              <span style={{ opacity: 0.6, fontSize: "3.2mm" }}>
                {String(d.params["format"] ?? entry?.manifest.defaultFormat ?? "")}
                {entry?.pageCount && entry.pageCount(client, d) > 1 ? " · 2 yüz" : ""}
              </span>
            </div>
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
