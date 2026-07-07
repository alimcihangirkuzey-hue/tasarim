/* Marka kiti ekranı — M1/M5: kit tek doğruluk kaynağı; kaydedilince tüm belgeler
   bir sonraki açılışta yeni kiti giyer. */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BrandKit, ClientDTO } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";

const COLOR_KEYS = ["primary", "secondary", "accent", "background", "text"] as const;

function AssetPicker(props: {
  client: ClientDTO;
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  const { client, value, onPick } = props;
  if (client.assets.length === 0) return <p className="muted">{t("client.no_assets")}</p>;
  return (
    <div className="asset-pick">
      {client.assets.map((a) => (
        <img
          key={a.id}
          src={a.urls.thumb}
          className={value === a.id ? "on" : ""}
          onClick={() => onPick(value === a.id ? null : a.id)}
          alt={a.kind}
          title={`${a.width_px}×${a.height_px}px`}
        />
      ))}
    </div>
  );
}

export function BrandKitPanel({ client }: { client: ClientDTO }) {
  const qc = useQueryClient();
  const [kit, setKit] = useState<BrandKit>(client.brandkit);
  useEffect(() => setKit(client.brandkit), [client.id, client.updated_at]);

  const save = useMutation({
    mutationFn: () => api.updateClient(client.id, { brandkit: kit }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client", client.id] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadAsset(client.id, file, "logo"),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["client", client.id] }),
  });
  const logoInput = useRef<HTMLInputElement>(null);
  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload.mutate(f);
    e.target.value = "";
  };

  const patch = (p: Partial<BrandKit>) => setKit((k) => ({ ...k, ...p }));

  return (
    <>
      <div className="panel">
        <h2>{t("brandkit.logo_primary")}</h2>
        <div className="row">
          <div className="logo-box">
            {(() => {
              const a = client.assets.find((x) => x.id === kit.logo_primary);
              return a ? <img src={a.urls.thumb} alt="logo" /> : <span className="muted">{t("client.no_logo")}</span>;
            })()}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <button className="ghost" onClick={() => logoInput.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? t("common.uploading") : t("client.upload_logo")}
            </button>
            <input ref={logoInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onPickFile} />
            <p className="muted" style={{ marginTop: 8 }}>{t("brandkit.pick")}:</p>
            <AssetPicker client={client} value={kit.logo_primary} onPick={(id) => patch({ logo_primary: id })} />
          </div>
        </div>
        {upload.isError && <p className="error">{(upload.error as Error).message}</p>}
      </div>

      <div className="panel">
        <h2>{t("brandkit.logo_mono")}</h2>
        <AssetPicker client={client} value={kit.logo_mono} onPick={(id) => patch({ logo_mono: id })} />
      </div>

      <div className="panel">
        <h2>{t("brandkit.colors")}</h2>
        <div className="row">
          {COLOR_KEYS.map((key) => (
            <label key={key} className="color-row">
              <input
                type="color"
                value={kit.colors[key]}
                onChange={(e) => patch({ colors: { ...kit.colors, [key]: e.target.value } })}
              />
              {t(`brandkit.color_${key}`)}
            </label>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>{t("brandkit.fonts")}</h2>
        <div className="fgrid">
          <label className="field">
            {t("brandkit.font_heading")}
            <select value={kit.fonts.heading} onChange={(e) => patch({ fonts: { ...kit.fonts, heading: e.target.value } })}>
              {["Anton", "Oswald", "Archivo Black", "Bitter", "Inter", "Pacifico"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("brandkit.font_body")}
            <select value={kit.fonts.body} onChange={(e) => patch({ fonts: { ...kit.fonts, body: e.target.value } })}>
              {["Inter", "Bitter", "Oswald"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <h2>{t("brandkit.contact")}</h2>
        <div className="fgrid">
          {(
            [
              ["phone", "brandkit.phone"],
              ["address", "brandkit.address"],
              ["hours", "brandkit.hours"],
              ["instagram", "brandkit.instagram"],
              ["google_review_url", "brandkit.review_url"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="field">
              {t(label)}
              <input
                type="text"
                value={kit.contact[key]}
                onChange={(e) => patch({ contact: { ...kit.contact, [key]: e.target.value } })}
              />
            </label>
          ))}
          <label className="field">
            {t("brandkit.slogan")}
            <input type="text" value={kit.slogan_fr} onChange={(e) => patch({ slogan_fr: e.target.value })} />
          </label>
        </div>
        <label className="row" style={{ fontSize: 14 }}>
          <input
            type="checkbox"
            checked={kit.badges.halal}
            onChange={(e) => patch({ badges: { halal: e.target.checked } })}
          />
          {t("brandkit.halal")}
        </label>
      </div>

      <div className="row">
        <button onClick={() => save.mutate()} disabled={save.isPending}>
          {t("brandkit.save")}
        </button>
        {save.isSuccess && <span className="muted">{t("brandkit.saved")}</span>}
        {save.isError && <span className="error">{(save.error as Error).message}</span>}
      </div>
    </>
  );
}
