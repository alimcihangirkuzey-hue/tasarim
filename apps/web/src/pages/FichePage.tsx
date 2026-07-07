/* /fiche/:docId — Broderie Fişi (A4) — FAZ3-GOREV §6.
   Nakışçının hammaddesi: önizlemeler, alan+cm ölçüleri, kumaş, dolgu renkleri,
   iplik eşleştirme not satırları, müşteri/tarih. DST/PES üretimi kapsam dışı. */

import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TEMPLATES, analyzeGarment } from "@tezgah/templates";
import { api } from "../api";

const COLOR_NAMES: Array<[string, string]> = [
  ["#ffffff", "blanc"], ["#1a1a1a", "noir"], ["#c8102e", "rouge"],
  ["#1d4ed8", "bleu"], ["#e3a93f", "or"], ["#f0562b", "orange"],
];
function approxName(hex: string): string {
  const h = hex.toLowerCase();
  const hit = COLOR_NAMES.find(([c]) => c === h);
  return hit ? hit[1] : "—";
}

export function FichePage() {
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const date = sp.get("date") ?? new Date().toISOString().slice(0, 10);

  const docQ = useQuery({ queryKey: ["document", id], queryFn: () => api.document(id), enabled: !!id });
  const clientId = docQ.data?.client_id;
  const clientQ = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api.client(clientId!),
    enabled: !!clientId,
  });

  const doc = docQ.data;
  const client = clientQ.data;
  const entry = doc ? TEMPLATES[doc.template_id] : undefined;
  const ready = !!doc && !!client && doc.template_id === "garment";

  useEffect(() => {
    if (!ready) return;
    void document.fonts.ready.then(() => {
      window.__PAGE_SIZE__ = { w: 210, h: 297, pages: 1 };
      window.__PRINT_READY__ = true;
    });
  }, [ready]);

  if (!ready || !entry) return null;
  const a = analyzeGarment(client!, doc!);

  /* kullanılan dolgu renkleri: alan mürekkebi + tema vurgusu (mono logo tek renk varsayımı) */
  const colors = [...new Set(a.areas.map((ar) => ar.inkColor.toLowerCase()))];

  return (
    <div style={{ width: "210mm", height: "297mm", padding: "16mm", boxSizing: "border-box", background: "#fff", color: "#1A1A1A", fontFamily: "Inter, sans-serif" }}>
      <style>{`html, body { margin: 0; }`}</style>
      <div style={{ fontSize: "7mm", fontWeight: 800, letterSpacing: "0.8mm" }}>FICHE BRODERIE</div>
      <div style={{ width: "26mm", height: "0.8mm", background: "#C8102E", margin: "2.5mm 0 7mm" }} />

      <table style={{ fontSize: "3.4mm", borderCollapse: "collapse", marginBottom: "6mm" }}>
        <tbody>
          {[
            ["Client", client!.name],
            ["Produit", a.params.garment_kind],
            ["Tissu", a.fabricHex],
            ["Technique", "broderie"],
            ["Date", date],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "1mm 6mm 1mm 0", color: "#8a8378" }}>{k}</td>
              <td style={{ fontWeight: 600 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* alan önizlemeleri + ölçüler */}
      <div style={{ display: "flex", gap: "6mm", flexWrap: "wrap", marginBottom: "6mm" }}>
        {a.areas.map((ar, i) => {
          const scale = Math.min(70 / ar.w_mm, 70 / ar.h_mm);
          return (
            <div key={ar.id} style={{ textAlign: "center" }}>
              <div style={{ width: `${ar.w_mm * scale}mm`, height: `${ar.h_mm * scale}mm`, background: a.fabricHex, border: "0.3mm solid #ccc", overflow: "hidden" }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", lineHeight: 0 }}>
                  <entry.Component client={client!} doc={doc!} mode="print" pageIndex={i} cropMarks={false} />
                </div>
              </div>
              <div style={{ fontSize: "3mm", marginTop: "1.5mm", fontWeight: 600 }}>
                {ar.label_tr} — {ar.w_mm / 10} × {ar.h_mm / 10} cm
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "3.6mm", fontWeight: 700, marginBottom: "2mm" }}>Couleurs de remplissage</div>
      <table style={{ fontSize: "3.2mm", borderCollapse: "collapse", marginBottom: "6mm" }}>
        <tbody>
          {colors.map((c) => (
            <tr key={c}>
              <td style={{ padding: "1mm 3mm 1mm 0" }}>
                <span style={{ display: "inline-block", width: "6mm", height: "4mm", background: c, border: "0.2mm solid #999" }} />
              </td>
              <td style={{ padding: "1mm 6mm 1mm 0", fontFamily: "monospace" }}>{c}</td>
              <td style={{ padding: "1mm 12mm 1mm 0", color: "#555" }}>{approxName(c)}</td>
              <td style={{ color: "#8a8378" }}>Fil (réf.): ____________________</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: "3.6mm", fontWeight: 700, marginBottom: "2mm" }}>Notes brodeur</div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ borderBottom: "0.25mm solid #bbb", height: "8mm" }} />
      ))}

      <div style={{ position: "absolute", bottom: "10mm", left: "16mm", right: "16mm", fontSize: "2.8mm", color: "#8a8378", display: "flex", justifyContent: "space-between" }}>
        <span>TEZGÂH — Atelier graphique · fichier DST/PES: à produire par le brodeur</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
