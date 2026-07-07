/* Asset seçici — Müşteri | Ortak havuz sekmeleri (FAZ2-GOREV §4).
   client.assets sunucudan ortakları da içerir; sekme client_id ile ayrıştırır. */

import { useState } from "react";
import type { ClientDTO } from "@tezgah/shared";
import { t } from "../i18n";

export function AssetPicker(props: {
  client: ClientDTO;
  value: string | null;
  onPick: (id: string | null) => void;
  excludeLogos?: boolean;
}) {
  const { client, value, onPick, excludeLogos } = props;
  const [tab, setTab] = useState<"client" | "common">("client");

  const list = client.assets
    .filter((a) => (tab === "client" ? a.client_id !== null : a.client_id === null))
    .filter((a) => !excludeLogos || a.kind !== "logo");

  return (
    <div>
      <div className="row" style={{ gap: 4, marginBottom: 6 }}>
        <button className={tab === "client" ? "small" : "ghost small"} onClick={() => setTab("client")}>
          {t("assets.tab_client")}
        </button>
        <button className={tab === "common" ? "small" : "ghost small"} onClick={() => setTab("common")}>
          {t("assets.tab_common")}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="muted">{t("client.no_assets")}</p>
      ) : (
        <div className="asset-pick">
          {list.map((a) => (
            <img
              key={a.id}
              src={a.urls.thumb}
              className={value === a.id ? "on" : ""}
              onClick={() => onPick(value === a.id ? null : a.id)}
              alt={a.kind}
              title={`${a.width_px}×${a.height_px}px${a.client_id === null ? " · ortak" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
