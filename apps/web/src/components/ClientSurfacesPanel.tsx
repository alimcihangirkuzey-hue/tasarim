/* F8-A hafif tüketici — müşteri yüzey profili (kayıtlı ölçüler). Salt okuma +
   tek silme (hijyen, D5). Yazım YALNIZ Sipariş Al akışında (intake commit). */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { t } from "../i18n";

export function ClientSurfacesPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const surfacesQ = useQuery({
    queryKey: ["surfaces", clientId],
    queryFn: () => api.clientSurfaces(clientId),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteSurface(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["surfaces", clientId] }),
  });

  const rows = surfacesQ.data ?? [];

  return (
    <div className="panel">
      <h2>{t("client.surfaces")}</h2>
      {rows.length === 0 ? (
        <p className="muted">{t("client.surfaces_empty")}</p>
      ) : (
        <div className="surface-list">
          {rows.map((sf) => (
            <div key={sf.id} className="surface-item">
              <span className="pill">{t(`intake.sk_${sf.kind}`)}</span>
              <strong>{sf.label}</strong>
              <span className="dims">
                {sf.w_cm !== null && sf.h_cm !== null
                  ? `${sf.w_cm}×${sf.h_cm} cm`
                  : sf.w_cm !== null
                    ? `${sf.w_cm} cm`
                    : sf.h_cm !== null
                      ? `${sf.h_cm} cm`
                      : ""}
              </span>
              {sf.note && <span className="muted">{sf.note}</span>}
              <span style={{ flex: 1 }} />
              <button
                className="icon"
                title={t("intake.remove")}
                disabled={del.isPending}
                onClick={() => {
                  if (window.confirm(t("client.surface_delete_confirm"))) del.mutate(sf.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {del.isError && <span className="error">{(del.error as Error).message}</span>}
    </div>
  );
}
