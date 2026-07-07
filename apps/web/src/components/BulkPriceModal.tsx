/* Toplu fiyat güncelleme modalı — FAZ4-GOREV §4.
   Önizleme, sunucuyla AYNI saf motordan (bulkPricePreview) gelir; "Uygula"
   sunucuda otomatik geçmiş kaydı + katalog güncellemesi yapar. */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkPricePreview,
  formatPrice,
  type BulkPriceOp,
  type BulkOpKind,
  type BulkRounding,
  type ClientDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";

export function BulkPriceModal({ client, onClose }: { client: ClientDTO; onClose: () => void }) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<string>("all");
  const [opKind, setOpKind] = useState<BulkOpKind>("percent");
  const [value, setValue] = useState<string>("5");
  const [rounding, setRounding] = useState<BulkRounding>("x90");
  const [tab, setTab] = useState<"update" | "history">("update");

  const op: BulkPriceOp | null = useMemo(() => {
    const v = Number(value.replace(",", "."));
    if (!Number.isFinite(v)) return null;
    return {
      scope: scope === "all" ? "all" : { categoryId: scope },
      op: { kind: opKind, value: v },
      rounding,
    };
  }, [scope, opKind, value, rounding]);

  const changes = useMemo(
    () => (op ? bulkPricePreview(client.catalog, op) : []),
    [client.catalog, op]
  );

  const apply = useMutation({
    mutationFn: () => api.bulkPrice(client.id, op!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client", client.id] });
      void qc.invalidateQueries({ queryKey: ["catalog-history", client.id] });
      onClose();
    },
  });

  const historyQ = useQuery({
    queryKey: ["catalog-history", client.id],
    queryFn: () => api.catalogHistory(client.id),
    enabled: tab === "history",
  });
  const restore = useMutation({
    mutationFn: (historyId: string) => api.catalogRestore(client.id, historyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client", client.id] });
      void qc.invalidateQueries({ queryKey: ["catalog-history", client.id] });
      onClose();
    },
  });

  const fmt = (v: number) => formatPrice(v, client.currency);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ width: "min(640px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 8 }}>
          <h3 style={{ margin: 0, flex: 1 }}>{t("bulk.title")}</h3>
          <button className={tab === "update" ? "" : "ghost"} onClick={() => setTab("update")}>
            {t("bulk.tab_update")}
          </button>
          <button className={tab === "history" ? "" : "ghost"} onClick={() => setTab("history")}>
            {t("bulk.tab_history")}
          </button>
        </div>

        {tab === "update" && (
          <>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label>
                {t("bulk.scope")}{" "}
                <select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="all">{t("bulk.scope_all")}</option>
                  {client.catalog.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_fr}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("bulk.op")}{" "}
                <select value={opKind} onChange={(e) => setOpKind(e.target.value as BulkOpKind)}>
                  <option value="percent">{t("bulk.op_percent")}</option>
                  <option value="add">{t("bulk.op_add")}</option>
                  <option value="set">{t("bulk.op_set")}</option>
                </select>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{ width: 70 }}
              />
              <label>
                {t("bulk.rounding")}{" "}
                <select value={rounding} onChange={(e) => setRounding(e.target.value as BulkRounding)}>
                  <option value="none">{t("bulk.round_none")}</option>
                  <option value="r010">0,10</option>
                  <option value="r050">0,50</option>
                  <option value="x90">X,90</option>
                </select>
              </label>
            </div>

            <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid var(--c-line, #e5e0d6)", borderRadius: 8 }}>
              {changes.length === 0 ? (
                <p className="muted" style={{ padding: 10, margin: 0 }}>{t("bulk.no_changes")}</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", position: "sticky", top: 0, background: "#fff" }}>
                      <th style={{ padding: "6px 8px" }}>{t("bulk.col_item")}</th>
                      <th style={{ padding: "6px 8px" }}>{t("bulk.col_variant")}</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("bulk.col_before")}</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("bulk.col_after")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "4px 8px" }}>{c.name_fr}</td>
                        <td style={{ padding: "4px 8px" }}>{c.label}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", color: "#8a8378" }}>{fmt(c.before)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600 }}>{fmt(c.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <span className="muted" style={{ flex: 1 }}>
                {tf("bulk.count", { n: changes.length })}
              </span>
              <button className="ghost" onClick={onClose}>{t("editor.cancel")}</button>
              <button disabled={changes.length === 0 || apply.isPending} onClick={() => apply.mutate()}>
                {t("bulk.apply")}
              </button>
            </div>
            {apply.isError && <span className="error">{(apply.error as Error).message}</span>}
          </>
        )}

        {tab === "history" && (
          <div style={{ maxHeight: 340, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {(historyQ.data ?? []).length === 0 && <p className="muted">{t("bulk.history_empty")}</p>}
            {(historyQ.data ?? []).map((h) => (
              <div key={h.id} className="row" style={{ gap: 8, border: "1px solid #eee", borderRadius: 8, padding: "6px 10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{h.reason || t("bulk.history_manual")}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{h.created_at.slice(0, 16).replace("T", " ")}</div>
                </div>
                <button
                  className="ghost small"
                  disabled={restore.isPending}
                  onClick={() => {
                    if (window.confirm(t("bulk.restore_confirm"))) restore.mutate(h.id);
                  }}
                >
                  {t("bulk.restore")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
