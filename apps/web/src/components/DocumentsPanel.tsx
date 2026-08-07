/* Belge listesi + yeni belge (şablon seçici kayıt defterinden okur, §5.7) */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TEMPLATES, listTemplates, type TemplateEntry } from "@tezgah/templates";
import { SEKTORLER, hedefSektorOf, type Sektor } from "@tezgah/templates/identity";
import type { ClientDTO } from "@tezgah/shared";
import { api } from "../api";
import { gorunurRehberSecenekleri } from "../lib/gorunurRehber";
import { t, tf } from "../i18n";
import { useKurulumDaraltmasi } from "../lib/kurulumDaraltmasi";

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

/* Hedef sektör ilanına göre gruplanmış şablon seçenekleri (7.2/495 sektör
   yarısı; 7.1/481 "kullanıcı yalnızca yaptığı işi görür" yönünde ilk görünür
   adım: seçici sektör başlıklı). Grup üyeliği İLANDAN okunur (hedefSektorOf)
   — sert kodlu grup listesi YOK; boş grup çizilmez. Kimlik-yalnız kayıtta
   OLMAYAN şablonlar (fabrika/generated — identity kapsam sınırı, C-P2) null'a
   düşer ve grupsuz listelenir: hiçbir şablon seçilemez hâle gelmez, seçim
   davranışı değişmez. EditorPage'in üst-bar değiştiricisi de BUNU kullanır —
   desen iki yerde ayrı yazılıp sürüklenmez. */
/* KURULUM İŞ KOLU SÜZGECİ (K-1/C modül sınırı) — saf, ayrı test edilir.

   `aktif` VERİLMEZSE hiçbir şey süzülmez: bugünkü davranış birebir korunur
   (yapılandırma yoksa sunucu da "varsayilan" der ve tüm kolları döndürür).

   KORUNAN ŞABLON: editörün üst-bar değiştiricisinde SEÇİLİ olan şablon, iş
   kolu kapalı olsa bile listede KALIR. Kalmasaydı select'in value'su listede
   olmayan bir id'ye işaret eder, tarayıcı ilk seçeneği gösterir ve operatör
   belgesinin şablonunu YANLIŞ görürdü — görünürlük daraltması bir veri yanlış
   göstermesine dönüşemez.

   Sektörsüz şablonlar (fabrika/generated — identity kapsam sınırı) HER ZAMAN
   kalır: iş kolu bilgileri yoktur, süzgecin onlar hakkında söyleyeceği bir şey
   de yoktur (sessizce kaybolmaları yanlış olurdu). */
export function gorunurSablonlar(
  entries: readonly TemplateEntry[],
  aktif: readonly Sektor[] | undefined,
  korunanId?: string,
): TemplateEntry[] {
  if (!aktif) return [...entries];
  return entries.filter((e) => {
    if (e.manifest.id === korunanId) return true;
    const s = hedefSektorOf(e.manifest.id);
    return s === null || aktif.includes(s);
  });
}

export function SektorluSablonSecenekleri({
  entries,
  aktifSektorler,
  korunanId,
}: {
  entries: TemplateEntry[];
  /** undefined → süzme yok (bugünkü davranış); dizi → yalnız bu iş kolları */
  aktifSektorler?: readonly Sektor[];
  /** iş kolu kapalı olsa bile görünür kalması gereken şablon (seçili olan) */
  korunanId?: string;
}) {
  const gorunur = gorunurSablonlar(entries, aktifSektorler, korunanId);
  return (
    <>
      {SEKTORLER.map((s) => {
        const uyeler = gorunur.filter((e) => hedefSektorOf(e.manifest.id) === s);
        if (uyeler.length === 0) return null;
        return (
          <optgroup key={s} label={t(`sektor_${s}`)}>
            {uyeler.map((e) => (
              <option key={e.manifest.id} value={e.manifest.id}>
                {e.manifest.name_tr}
              </option>
            ))}
          </optgroup>
        );
      })}
      {gorunur
        .filter((e) => hedefSektorOf(e.manifest.id) === null)
        .map((e) => (
          <option key={e.manifest.id} value={e.manifest.id}>
            {e.manifest.name_tr}
          </option>
        ))}
    </>
  );
}

export function DocumentsPanel({ client }: { client: ClientDTO }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState(listTemplates()[0]?.manifest.id ?? "");
  const [mode, setMode] = useState<"guide" | "direct">("guide");

  const docs = useQuery({
    queryKey: ["documents", client.id],
    queryFn: () => api.documents(client.id),
  });

  /* Kurulumun iş kolu ilanı — yapılandırma yoksa sunucu "varsayilan" der ve
     tüm kolları döndürür; o hâlde süzgeç geçilmez (davranış değişmez). */
  const aktifSektorler = useKurulumDaraltmasi();

  /* REHBER DE DARALTILIR (K-1/C): bu bileşen `aktifSektorler`i zaten hesaplıyor
     ve "doğrudan seç" listesine veriyordu; rehber ona BAKMIYORDU — oysa rehber
     AÇILIŞ ekranıdır. Ölçüldü: beş seçeneğin hedefi menu-uretici×3 + matbaa×2;
     tabelacıya daraltılmış kurulumda operatörün gördüğü ilk ekran, kurulumun
     hiç yapmadığı beş işi öneriyordu. */
  const gorunurRehber = gorunurRehberSecenekleri(GUIDE_OPTIONS, aktifSektorler);
  /* BOŞ IZGARA YERİNE DOĞRUDAN SEÇ: etkin mod TÜRETİLİR (effect değil) —
     effect yarışı, uç yanıtı gelene dek boş rehber çizerdi. Doğrudan listesi
     daraltılmıştır ve boşalmaz, o yüzden güvenli düşüş noktasıdır. */
  const etkinMod = gorunurRehber.length === 0 ? "direct" : mode;

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

  /* FAZ5 §9: katalog+kitten tek dosyalık statik HTML menü.

     ÖLÇÜLEN YARA (borç: "api.digitalMenuHistory ölü istemci fonksiyonu",
     önizleme paketi şerh listesi 2026-07-26): uç `/menu-digital/history`
     sunucuda VARDI, istemci fonksiyonu VARDI, TÜKETİCİ SIFIRDI. Ekran yalnız
     O OTURUMDA üretilen menünün linkini React state'inde tutuyordu — operatör
     sayfayı yenilediğinde ya da başka sekmeye geçip döndüğünde ürettiği dosyaya
     ULAŞAMIYORDU. Dosya diskte duruyordu, yolu bilinmiyordu.

     TEK KAYNAK: geçici `digitalUrl` state'i KALDIRILDI. Üretilen menü de dahil
     her sürüm aynı listeden okunur; üretim sonrası liste tazelenir. İki kaynak
     bırakmak (state + geçmiş) aynı dosyayı iki yerde göstermek olurdu. */
  const digitalHistory = useQuery({
    queryKey: ["digitalMenuHistory", client.id],
    queryFn: () => api.digitalMenuHistory(client.id),
  });
  const digital = useMutation({
    mutationFn: () => api.digitalMenu(client.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["digitalMenuHistory", client.id] }),
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
      {etkinMod === "guide" ? (
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <strong>{t("guide.q")}</strong>
            <button className="ghost-link" onClick={() => setMode("direct")}>{t("guide.direct")}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, marginTop: 8 }}>
            {/* ÖLÇÜLEN YARA (2026-08-06, canlı tarayıcı turu): kartlar
                `background: transparent` ilan ediyor ama RENK ilan etmiyordu;
                global kural `button { color: #fff }` olduğu için BAŞLIK BEYAZ
                ZEMİNDE BEYAZ kalıyordu (ölçüm: başlık span'i getComputedStyle
                → rgb(255,255,255)). Açıklama satırı kendi `.muted` rengiyle
                göründüğü için ekran YARI görünürdü ve kimse fark etmemişti;
                operatör "hangisi flyer?" sorusunu ekrandan cevaplayamıyordu.
                Reponun kendi `.ghost` sınıfı tam bunu yapar — satır içinde
                yeniden yazılırken rengi düşmüştü. Sınıfa dönüldü. */}
            {gorunurRehber.filter((o) => TEMPLATES[o.tid]).map((o) => (
              <button
                key={o.tid}
                className="ghost"
                onClick={() => create.mutate(o.tid)}
                disabled={create.isPending}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                  textAlign: "left", padding: "10px 12px", borderRadius: 10,
                  cursor: "pointer", height: "100%",
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
            <SektorluSablonSecenekleri entries={listTemplates()} aktifSektorler={aktifSektorler} />
          </select>
          <button onClick={() => create.mutate(templateId)} disabled={create.isPending || !templateId}>
            + {t("documents.new")}
          </button>
          {gorunurRehber.length > 0 && (
            <button className="ghost-link" onClick={() => setMode("guide")}>{t("guide.back")}</button>
          )}
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

      {/* FAZ5 §9: dijital menü (tek dosya statik HTML) */}
      <div className="row" style={{ borderTop: "1px solid var(--c-line)", marginTop: 12, paddingTop: 12, gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong>{t("digital.title")}</strong>
          <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>{t("digital.hint")}</p>
        </div>
        <button onClick={() => digital.mutate()} disabled={digital.isPending}>
          {digital.isPending ? t("digital.generating") : t("digital.btn")}
        </button>
        {digital.isError && <span className="error">{(digital.error as Error).message}</span>}
        {/* Sürüm YOKSA bölüm hiç çizilmez — boş bir "geçmiş" başlığı, üretim
            olmuş da dosya kaybolmuş izlenimi verirdi (proje çıktıları emsali). */}
        {(digitalHistory.data?.length ?? 0) > 0 && (
          <div className="row" style={{ flexWrap: "wrap", gap: 6, width: "100%" }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {tf("digital.history", { n: digitalHistory.data!.length })}
            </span>
            {digitalHistory.data!.map((r) => (
              <a
                key={r.id}
                className="pill"
                href={`/${r.filepath.replace(/^data\//, "")}`}
                target="_blank"
                rel="noreferrer"
                title={r.filepath}
              >
                {t("digital.open")} v{r.version}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
