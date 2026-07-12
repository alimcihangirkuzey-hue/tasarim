import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Currency } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { BrandKitPanel } from "../components/BrandKitPanel";
import { CatalogPanel } from "../components/CatalogPanel";
import { DocumentsPanel } from "../components/DocumentsPanel";
import { ProjectsPanel } from "../components/ProjectsPanel";
import { ScenesPanel } from "../components/ScenesPanel";
import { ClientSurfacesPanel } from "../components/ClientSurfacesPanel";

type Tab = "general" | "projects" | "brandkit" | "catalog" | "documents" | "scenes" | "assets";

export function ClientDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const initialTab = (sp.get("tab") as Tab) || "general";
  const [tab, setTab] = useState<Tab>(initialTab);

  const client = useQuery({
    queryKey: ["client", id],
    queryFn: () => api.client(id),
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  useEffect(() => {
    if (client.data) {
      setName(client.data.name);
      setNotes(client.data.notes);
      setCurrency(client.data.currency);
    }
  }, [client.data?.id, client.data?.updated_at]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["client", id] });
    void qc.invalidateQueries({ queryKey: ["clients"] });
  };

  const save = useMutation({
    mutationFn: () => api.updateClient(id, { name, notes, currency }),
    onSuccess: invalidate,
  });

  const [scope, setScope] = useState<"client" | "common">("client");
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadAsset(id, file, "photo", scope),
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: () => api.deleteClient(id),
    onSuccess: () => navigate("/"),
  });

  /* FAZ4 §11: Açılış Takımı preseti → Projeler sekmesine geç */
  const openingKit = useMutation({
    mutationFn: () => api.createOpeningKit(id),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ["projects", id] });
      setTab("projects");
    },
  });

  /* FAZ4 §11: kullanım korumalı asset silme — 409'da nerede kullanıldığını göster */
  const deleteAsset = async (assetId: string) => {
    if (!window.confirm(t("assets.delete_confirm"))) return;
    const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    if (res.status === 409) {
      const j = (await res.json()) as { usages: Array<{ where: string; label: string }> };
      window.alert(
        t("assets.in_use") + "\n" + j.usages.map((u) => `• ${u.where}: ${u.label}`).join("\n")
      );
    } else if (res.ok) {
      invalidate();
    }
  };

  const photoInput = useRef<HTMLInputElement>(null);
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = "";
  };

  if (client.isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (client.isError || !client.data) return <p className="error">{t("common.error")}</p>;
  const data = client.data;

  const TABS: Array<[Tab, string]> = [
    ["general", t("client.tab_general")],
    ["projects", t("orders.tab")],
    ["brandkit", t("client.tab_brandkit")],
    ["catalog", t("client.tab_catalog")],
    ["documents", t("client.tab_documents")],
    ["scenes", t("scenes.tab")],
    ["assets", t("client.tab_assets")],
  ];

  const cloneClient = async () => {
    const cname = window.prompt(t("clone.name_prompt"), `${data.name} 2`);
    if (!cname) return;
    const withDocs = window.confirm(t("clone.with_docs_confirm"));
    const docIds = withDocs ? (await api.documents(id)).map((d) => d.id) : [];
    const res = await api.cloneClient(id, { name: cname, document_ids: docIds });
    void qc.invalidateQueries({ queryKey: ["clients"] });
    navigate(`/clients/${res.id}`);
  };

  return (
    <>
      <div className="pagehead">
        <Link to="/" className="muted">
          {t("client.back")}
        </Link>
        <div className="row">
          <button className="ghost" onClick={() => void cloneClient()}>
            {t("clone.client_btn")}
          </button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(t("client.delete_confirm"))) del.mutate();
            }}
          >
            {t("client.delete")}
          </button>
        </div>
      </div>
      <h1>
        {data.name} <span className="pill">{data.currency}</span>
      </h1>

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <>
        <div className="panel">
          <h2>{t("client.name")}</h2>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <h2>{t("client.currency")}</h2>
          <div className="row">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ width: 120 }}>
              <option value="EUR">EUR (€)</option>
              <option value="CHF">CHF</option>
            </select>
            <span className="muted">{t("client.currency_hint")}</span>
          </div>
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
            {save.isError && <span className="error">{(save.error as Error).message}</span>}
            <span style={{ flex: 1 }} />
            {/* FAZ4 §11: tek tıkla proje + 4 kalem (vitrophanie ölçü bekler) */}
            <button
              className="ghost"
              disabled={openingKit.isPending}
              onClick={() => openingKit.mutate()}
            >
              📦 {t("preset.opening")}
            </button>
          </div>
        </div>
        <ClientSurfacesPanel clientId={data.id} />
        </>
      )}

      {tab === "projects" && <ProjectsPanel client={data} />}
      {tab === "brandkit" && <BrandKitPanel client={data} />}
      {tab === "catalog" && <CatalogPanel client={data} />}
      {tab === "documents" && <DocumentsPanel client={data} />}
      {tab === "scenes" && <ScenesPanel client={data} />}

      {tab === "assets" && (
        <div className="panel">
          <h2>{t("client.assets")}</h2>
          <div className="row">
            <select value={scope} onChange={(e) => setScope(e.target.value as "client" | "common")}>
              <option value="client">{t("assets.scope_client")}</option>
              <option value="common">{t("assets.scope_common")}</option>
            </select>
            <button className="ghost" onClick={() => photoInput.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? t("common.uploading") : t("client.upload_photo")}
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={onPick}
            />
            {upload.isError && <span className="error">{(upload.error as Error).message}</span>}
          </div>
          {(["client", "common"] as const).map((sc) => {
            const list = data.assets.filter((a) =>
              sc === "client" ? a.client_id !== null : a.client_id === null
            );
            return (
              <div key={sc}>
                <h2 style={{ marginTop: 10 }}>
                  {sc === "client" ? t("assets.tab_client") : t("assets.tab_common")}
                </h2>
                {list.length === 0 ? (
                  <p className="muted">{t("client.no_assets")}</p>
                ) : (
                  <div className="thumbs">
                    {list.map((a) => (
                      <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 3, width: 96, position: "relative" }}>
                        <img
                          src={a.urls.thumb}
                          alt={a.kind}
                          title={`${a.width_px}×${a.height_px}px · ${a.kind}${a.client_id === null ? " · ortak" : ""}`}
                        />
                        <button
                          className="icon"
                          title={t("common.delete")}
                          style={{ position: "absolute", top: 2, right: 2, background: "#fff9", borderRadius: 6 }}
                          onClick={() => void deleteAsset(a.id)}
                        >✕</button>
                        {/* FAZ4 §9: satır içi etiket düzenleme (virgüllü; blur'da kaydeder) */}
                        <input
                          type="text"
                          defaultValue={a.tags}
                          placeholder={t("assets.tags_placeholder")}
                          style={{ fontSize: 11, padding: "2px 4px" }}
                          onBlur={(e) => {
                            if (e.target.value !== a.tags) {
                              void api.updateAssetTags(a.id, e.target.value).then(invalidate);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
