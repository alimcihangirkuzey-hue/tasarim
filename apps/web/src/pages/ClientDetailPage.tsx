import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PARA_BIRIMI_SECENEKLERI, type Currency } from "@tezgah/shared";
import { api, isKollariGerekcesiOku, kullanimlariOku } from "../api";
import { baslatmaSonucVerisi, topluBaslat } from "../lib/topluTasarim";
import { t, tf } from "../i18n";
import { BrandKitPanel } from "../components/BrandKitPanel";
import { CatalogPanel } from "../components/CatalogPanel";
import { DocumentsPanel } from "../components/DocumentsPanel";
import { ProjectsPanel } from "../components/ProjectsPanel";
import { ScenesPanel } from "../components/ScenesPanel";
import { ClientSurfacesPanel } from "../components/ClientSurfacesPanel";
import { useSablonSecici } from "../components/SablonSecici";
import { TurSonucu, type TurSonucuVerisi } from "../components/TurSonucu";
import { BASLATMA_METINLERI } from "../components/ProjectsPanel";

type Tab = "general" | "projects" | "brandkit" | "catalog" | "documents" | "scenes" | "assets";

export function ClientDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const secici = useSablonSecici();
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

  /* AÇILIŞ TAKIMI — preset + BELGELER, TEK İŞLEMDE (K-1/A: "bir müşteri +
     preset → N belge tek işlemde, aynı marka kitinden").

     ÖLÇÜLEN BOŞLUK: preset ucu yalnız proje + KALEM üretir ({project_id,
     items:sayı}); belgeler için operatör Projeler sekmesine geçip toplu düğmeye
     ayrıca basıyordu. Başlığın sözü "tek işlem"di.

     KALEMLER NEDEN YENİDEN ÇEKİLİYOR: uç kalem SAYISINI döndürür, kalemlerin
     KENDİLERİNİ değil — belge açmak için id/tür/ölçü gerekir. Sunucu yanıtını
     genişletmek yerine mevcut okuma yolu kullanıldı (uç sözleşmesi değişmedi;
     liste zaten tazelenecekti).

     BELGE AÇMA BAŞARISIZSA PRESET GERİ ALINMAZ: proje ve kalemler operatörün
     gerçek işidir — silmek onları yok ederdi. Kalemler durur, sayılar raporda
     görünür, operatör Projeler sekmesinden tekrar deneyebilir. */
  const [kitSonuc, setKitSonuc] = useState<TurSonucuVerisi | null>(null);
  const openingKit = useMutation({
    mutationFn: async () => {
      const kit = await api.createOpeningKit(id);
      const projeler = await api.clientProjects(id);
      const proje = projeler.find((p) => p.id === kit.project_id);
      if (!proje) return null; // proje okunamadı: kalemler durur, aşağıda raporlanır
      /* Soru TÜR BAŞINA BİR KEZ (lib sözleşmesi); seçici Sipariş Defteri'ndeki
         düğmeyle AYNI bileşendir. Vazgeçme turu durdurmaz: o tür atlanır,
         kalan kalemler açılır ve vazgeçilen sayısı raporda AYRI görünür. */
      return topluBaslat(
        id,
        proje.items,
        (tur, secenekler) => secici.sor(t(`orders.type_${tur}`), secenekler),
        BASLATMA_METINLERI,
      );
    },
    onSuccess: (r) => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ["projects", id] });
      setTab("projects");
      /* SONUÇ ARTIK SATIR SATIR: düz metin yalnız "kalemler oluştu ama belge
         açılamadı" dalında kalır (o dalda tur hiç koşmadı, satır da yok). */
      setKitSonuc(
        r === null
          ? { baslik: t("preset.opening_items_only"), satirlar: [] }
          : baslatmaSonucVerisi(
              r,
              (o) => tf("preset.opening_done", o),
              (o) => tf("preset.opening_cancelled", o),
              (it) => `${t(`orders.type_${it.product_type}`)}`,
            ),
      );
    },
    /* İŞ KOLU DIŞI 409'U GEREKÇESİYLE SÖYLENİR: sunucu, kurulumun iş kollarına
       düşen kalem kalmadığında proje AÇMAZ (preset-kapsami). Düz mesaj
       gösterseydik operatör "409" görür ve düğmenin bozuk olduğunu sanardı —
       oysa sistem doğru davranıyor, yalnız sebebi söylenmemiş oluyordu. */
    onError: (e) => {
      const kollar = isKollariGerekcesiOku(e);
      setKitSonuc(
        kollar
          ? { baslik: tf("preset.opening_out_of_scope", { kollar: kollar.map((k) => t(`sektor_${k}`)).join(", ") }), satirlar: [] }
          : { baslik: `${t("orders.start_design_error")}: ${(e as Error).message}`, satirlar: [] },
      );
    },
  });

  /* FAZ4 §11: kullanım korumalı asset silme — 409'da nerede kullanıldığını göster.

     ÖLÇÜLEN YARA (bu turda): burası ham `fetch` kullanıyordu ve `res.ok` DE
     409 DA olmayan her durum SESSİZCE YUTULUYORDU — 500'de operatör silme
     düğmesine basıyor, ekranda HİÇBİR ŞEY olmuyordu. Reponun başka yerde
     kapattığı sınıfın aynısı (journal 2026-07-27-sunucu-params-dogrulamasi:
     "onError yokken bu 400 sessizce yutuluyordu").

     Ham fetch'in GEREKÇESİ 409'un yapısal `usages` gövdesiydi; http() artık
     gövdeyi hataya iliştirdiği için atlamaya gerek kalmadı. */
  const deleteAsset = async (assetId: string) => {
    if (!window.confirm(t("assets.delete_confirm"))) return;
    try {
      await api.deleteAsset(assetId);
      invalidate();
    } catch (e) {
      const kullanimlar = kullanimlariOku(e);
      if (kullanimlar) {
        window.alert(
          t("assets.in_use") + "\n" + kullanimlar.map((u) => `• ${u.where}: ${u.label}`).join("\n")
        );
      } else {
        /* Artık sessiz değil: gerekçe apiErrorMessage'ın ürettiği okunur metin. */
        window.alert((e as Error).message);
      }
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
      {secici.eleman}
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

      {/* Açılış Takımı sonucu SAYFA DÜZEYİNDE durur, "genel" sekmesinde DEĞİL:
          akış başarıda "projeler" sekmesine geçer ve mesaj genel sekmede
          kalsaydı operatör onu HİÇ GÖRMEZDİ (bu kusuru testin kendisi
          yakaladı — sonuç metni aranınca bulunamadı). */}
      {kitSonuc && (
        <div style={{ margin: "8px 0" }}>
          <TurSonucu veri={kitSonuc} onKapat={() => setKitSonuc(null)} />
        </div>
      )}

      {tab === "general" && (
        <>
        <div className="panel">
          <h2>{t("client.name")}</h2>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <h2>{t("client.currency")}</h2>
          <div className="row">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ width: 120 }}>
              {PARA_BIRIMI_SECENEKLERI.map((p) => (
                <option key={p.kod} value={p.kod}>
                  {p.etiket}
                </option>
              ))}
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
              📦 {openingKit.isPending ? t("orders.bulk_running") : t("preset.opening")}
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
