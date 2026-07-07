import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { t } from "../i18n";

export function ClientDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const client = useQuery({
    queryKey: ["client", id],
    queryFn: () => api.client(id),
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (client.data) {
      setName(client.data.name);
      setNotes(client.data.notes);
    }
  }, [client.data?.id, client.data?.updated_at]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["client", id] });
    void qc.invalidateQueries({ queryKey: ["clients"] });
  };

  const save = useMutation({
    mutationFn: () => api.updateClient(id, { name, notes }),
    onSuccess: invalidate,
  });

  const upload = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: "logo" | "photo" }) =>
      api.uploadAsset(id, file, kind),
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: () => api.deleteClient(id),
    onSuccess: () => navigate("/"),
  });

  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const onPick =
    (kind: "logo" | "photo") => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload.mutate({ file, kind });
      e.target.value = "";
    };

  if (client.isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (client.isError || !client.data)
    return <p className="error">{t("common.error")}</p>;

  const data = client.data;
  const logo = data.brandkit.logo_primary
    ? data.assets.find((a) => a.id === data.brandkit.logo_primary)
    : undefined;

  return (
    <>
      <div className="pagehead">
        <Link to="/" className="muted">
          {t("client.back")}
        </Link>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm(t("client.delete_confirm"))) del.mutate();
          }}
        >
          {t("client.delete")}
        </button>
      </div>
      <h1>{data.name}</h1>

      <div className="panel">
        <h2>{t("client.name")}</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        <h2>{t("client.notes")}</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("client.notes_placeholder")}
        />
        <div className="row">
          <button onClick={() => save.mutate()} disabled={save.isPending}>
            {t("client.save")}
          </button>
          {save.isSuccess && <span className="muted">{t("client.saved")}</span>}
          {save.isError && <span className="error">{save.error.message}</span>}
        </div>
      </div>

      <div className="panel">
        <h2>{t("client.logo")}</h2>
        <div className="row">
          <div className="logo-box">
            {logo ? (
              <img src={logo.urls.thumb} alt="logo" />
            ) : (
              <span className="muted">{t("client.no_logo")}</span>
            )}
          </div>
          <div>
            <button
              className="ghost"
              onClick={() => logoInput.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? t("common.uploading") : t("client.upload_logo")}
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hidden
              onChange={onPick("logo")}
            />
          </div>
        </div>
        {upload.isError && <p className="error">{upload.error.message}</p>}
      </div>

      <div className="panel">
        <h2>{t("client.assets")}</h2>
        <div className="row">
          <button
            className="ghost"
            onClick={() => photoInput.current?.click()}
            disabled={upload.isPending}
          >
            {t("client.upload_photo")}
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={onPick("photo")}
          />
        </div>
        {data.assets.length === 0 ? (
          <p className="muted">{t("client.no_assets")}</p>
        ) : (
          <div className="thumbs">
            {data.assets.map((a) => (
              <img key={a.id} src={a.urls.thumb} alt={a.kind} title={`${a.width_px}×${a.height_px}px · ${a.kind}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
