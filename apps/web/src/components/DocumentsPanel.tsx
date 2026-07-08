/* Belge listesi + yeni belge (şablon seçici kayıt defterinden okur, §5.7) */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TEMPLATES, listTemplates } from "@tezgah/templates";
import type { ClientDTO } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* FAZ5 §8: "Bu iş ne?" rehberi — yalnız başlangıç şablonunu belirler, sonrası mevcut akış.
   Kayıt defterinde olmayan şablon (ör. henüz eklenmemiş) sessizce atlanır. */
const GUIDE_OPTIONS: Array<{ tid: string; titleKey: string; descKey: string }> = [
  { tid: "menu-liste-premium", titleKey: "guide.opt_liste_t", descKey: "guide.opt_liste_d" },
  { tid: "menu-grid-cells", titleKey: "guide.opt_grid_t", descKey: "guide.opt_grid_d" },
  { tid: "menu-trifold", titleKey: "guide.opt_trifold_t", descKey: "guide.opt_trifold_d" },
  { tid: "flyer", titleKey: "guide.opt_flyer_t", descKey: "guide.opt_flyer_d" },
  { tid: "carte-fidelite", titleKey: "guide.opt_fidelite_t", descKey: "guide.opt_fidelite_d" },
];

export function DocumentsPanel({ client }: { client: ClientDTO }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState(listTemplates()[0]?.manifest.id ?? "");
  const [mode, setMode] = useState<"guide" | "direct">("guide");

  const docs = useQuery({
    queryKey: ["documents", client.id],
    queryFn: () => api.documents(client.id),
  });

  const create = useMutation({
    mutationFn: (tid: string) => api.createDocument(client.id, tid),
    onSuccess: (doc) => {
      void qc.invalidateQueries({ queryKey: ["documents", client.id] });
      navigate(`/editor/${doc.id}`);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["documents", client.id] }),
  });

  const allClients = useQuery({ queryKey: ["clients"], queryFn: api.clients });
  const [cloneTarget, setCloneTarget] = useState(client.id);
  const clone = useMutation({
    mutationFn: (docId: string) =>
      api.cloneDocument(docId, cloneTarget === client.id ? {} : { target_client_id: cloneTarget }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["documents", client.id] });
      if (res.dropped_overrides.length > 0) {
        window.alert(res.dropped_overrides.join(", "));
      }
      if (cloneTarget !== client.id) navigate(`/clients/${cloneTarget}`);
    },
  });

  return (
    <div className="panel">
      <h2>{t("client.tab_documents")}</h2>
      {mode === "guide" ? (
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <strong>{t("guide.q")}</strong>
            <button className="ghost-link" onClick={() => setMode("direct")}>{t("guide.direct")}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, marginTop: 8 }}>
            {GUIDE_OPTIONS.filter((o) => TEMPLATES[o.tid]).map((o) => (
              <button
                key={o.tid}
                onClick={() => create.mutate(o.tid)}
                disabled={create.isPending}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                  textAlign: "left", padding: "10px 12px", border: "1px solid var(--c-line, #e5e0d6)",
                  borderRadius: 10, background: "transparent", cursor: "pointer", height: "100%",
                }}
              >
                <span style={{ fontWeight: 700 }}>{t(o.titleKey)}</span>
                <span className="muted" style={{ fontSize: 12, lineHeight: 1.3 }}>{t(o.descKey)}</span>
              </button>
            ))}
          </div>
          {create.isError && <span className="error">{(create.error as Error).message}</span>}
        </div>
      ) : (
        <div className="row">
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {listTemplates().map((e) => (
              <option key={e.manifest.id} value={e.manifest.id}>
                {e.manifest.name_tr}
              </option>
            ))}
          </select>
          <button onClick={() => create.mutate(templateId)} disabled={create.isPending || !templateId}>
            + {t("documents.new")}
          </button>
          <button className="ghost-link" onClick={() => setMode("guide")}>{t("guide.back")}</button>
          {create.isError && <span className="error">{(create.error as Error).message}</span>}
        </div>
      )}

      {docs.data?.length === 0 && <p className="muted">{t("documents.empty")}</p>}
      {docs.data?.map((d) => (
        <div className="row" key={d.id} style={{ borderTop: "1px dashed var(--c-line)", paddingTop: 8 }}>
          <strong>{TEMPLATES[d.template_id]?.manifest.name_tr ?? d.template_id}</strong>
          {d.format && <span className="pill">{d.format}</span>}
          <span className="pill">{d.theme_id}</span>
          <span className="pill">{t(`documents.status_${d.status}`)}</span>
          <span className="muted">{fmtDate(d.updated_at)}</span>
          <span style={{ flex: 1 }} />
          <button className="small" onClick={() => navigate(`/editor/${d.id}`)}>
            {t("documents.open")}
          </button>
          <select value={cloneTarget} onChange={(e) => setCloneTarget(e.target.value)} title={t("clone.target")} style={{ padding: "4px 6px", fontSize: 12, maxWidth: 130 }}>
            {allClients.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="ghost small" onClick={() => clone.mutate(d.id)} disabled={clone.isPending}>
            {t("clone.doc_btn")}
          </button>
          <button
            className="icon"
            onClick={() => {
              if (window.confirm(t("documents.delete_confirm"))) del.mutate(d.id);
            }}
          >✕</button>
        </div>
      ))}
    </div>
  );
}
