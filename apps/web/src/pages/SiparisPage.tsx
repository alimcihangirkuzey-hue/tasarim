/* Sipariş Modu — mobil-öncelikli tek-kolon intake akışı (F7-C). AYRI sayfa
   (sabit-genişlik editör YENİDEN KULLANILMAZ — keşif Q5). Adımlar: müşteri →
   paketler → ürünler → sorular/çipler → çeklist → özet/commit. Taslak
   localStorage'da (D); akış başında eski taslak → devam/at (ŞERH 2).

   CILA2/B1: commit SONUÇ görünümü BU SAYFANIN yerel durumunda (result) yaşar —
   özet adımındaki s.reset() (step→1) adım bileşenlerini unmount etse de sonuç
   ekranı ondan etkilenmez. Render önceliği: result > taslak-sorusu > adımlar. */

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ciktiDiliEtiketi } from "../lib/alanEtiketi";
import { t, tf } from "../i18n";
import { CIKTI_DILI_SECENEKLERI, PARA_BIRIMI_SECENEKLERI, type Currency } from "@tezgah/shared";
import { consumeDraftDiscardedNotice, useIntake, type MenuLang } from "../store/intakeStore";

/* HF3: menü dili etiketi (bant + operatör görünürlüğü) */
const LANG_LABEL: Record<MenuLang, string> = { fr: "Français", de: "Deutsch", tr: "Türkçe" };
import { FetchError, NavBar } from "../components/IntakeNav";
import { IntakeProductsStep } from "../components/IntakeProductsStep";
import { IntakeChecklistStep } from "../components/IntakeChecklistStep";
import { IntakeSummaryStep, type IntakeResultData } from "../components/IntakeSummaryStep";

/* CILA3: "Sorular" adımı kalktı — ürün ayarları Ürünler adımında YERİNDE
   (tek çalışma yüzeyi). Akış 5 adım. */
const STEP_KEYS = ["client", "packs", "products", "checklist", "summary"] as const;

function ageLabel(ts: number | null): string {
  if (!ts) return "";
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 2) return t("intake.age_now");
  if (mins < 60) return `${mins} ${t("intake.age_min")}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${t("intake.age_hour")}`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? t("intake.age_yesterday") : `${days} ${t("intake.age_day")}`;
}

export function SiparisPage() {
  const s = useIntake();
  /* Taslak sorusu MOUNT ANI sorusudur: sayfa açılırken taslak yoksa soru bir
     daha SORULMAZ (draftAck true başlar). Aksi hâlde (eski davranış: sabit
     false) yeni görüşmede işletme adının İLK HARFİ hasDraft()'ı true yapar ve
     form "Yarım bir görüşme var" ekranıyla değişirdi — operatör yazarken
     kesilirdi (CILA1/3'ün hasDraft'a eklediği name koşulunun yan etkisi; izole
     canlı turda iki kez deterministik üredi, journal
     2026-07-28-taslak-yarasi-f7-defter). Mount'ta GERÇEK eski taslak varsa
     soru aynen sorulur — ŞERH 2 korunur. */
  const [draftAck, setDraftAck] = useState(() => !s.hasDraft());
  /* CILA2/B1: commit sonucu — adım/taslak durumundan BAĞIMSIZ (reset silmez) */
  const [result, setResult] = useState<IntakeResultData | null>(null);
  /* HF2-B taslak sürüm bekçisi: migrate() bu bayrağı SENKRON olarak (modül
     yüklenirken, mount'tan önce) set eder — bir kez oku+sıfırla (yeniden
     render'da tekrar gösterilmesin). */
  const [incompatibleDraft] = useState(consumeDraftDiscardedNotice);
  const showDraftPrompt = s.hasDraft() && !draftAck;

  if (result) {
    return (
      <IntakeResult
        data={result}
        onNew={() => {
          s.reset(); // commit'te zaten sıfırlandı — yine de idempotent güvence
          setResult(null);
        }}
      />
    );
  }

  if (showDraftPrompt) {
    return (
      <div className="intake-page">
        <div className="intake-draft-prompt">
          <h2>{t("intake.draft_found")}</h2>
          <p>
            <strong>{s.draftLabel()}</strong> · {ageLabel(s.savedAt)}
          </p>
          <div className="intake-actions">
            <button className="intake-btn primary" onClick={() => setDraftAck(true)}>
              {t("intake.draft_continue")}
            </button>
            <button
              className="intake-btn ghost"
              onClick={() => {
                s.reset();
                setDraftAck(true);
              }}
            >
              {t("intake.draft_new")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-page">
      {incompatibleDraft && (
        <div className="intake-warn full" style={{ marginBottom: 8 }}>
          {t("intake.draft_incompatible")}
        </div>
      )}
      {/* F1 P4: menü brief yolu — ayrı yaşam döngüsü (bu akışa dokunulmadı) */}
      {s.step === 1 && (
        <p style={{ margin: "0 0 10px", fontSize: 14 }}>
          <Link to="/brief">Menü briefi (F1) →</Link>
        </p>
      )}
      <ol className="intake-stepper">
        {STEP_KEYS.map((k, i) => (
          <li
            key={k}
            className={i + 1 === s.step ? "active" : i + 1 < s.step ? "done" : ""}
            onClick={() => i + 1 < s.step && s.setStep(i + 1)}
          >
            <span className="dot">{i + 1}</span>
            <span className="label">{t(`intake.step_${k}`)}</span>
          </li>
        ))}
      </ol>

      {s.step === 1 && <ClientStep />}
      {s.step === 2 && <PacksStep />}
      {s.step === 3 && <IntakeProductsStep />}
      {s.step === 4 && <IntakeChecklistStep />}
      {s.step === 5 && <IntakeSummaryStep onCommitted={setResult} />}
    </div>
  );
}

/* ---- Commit sonucu (CILA2/B1) — başarı + pending/gaps + A4 önizleme + yeni görüşme ----
   M8 (journal 2026-07-28-m8-sessizlik-cip-ceviri): named export — doğrudan test
   edilebilsin diye (additive; SiparisPage içindeki kullanım değişmedi). */
export function IntakeResult({ data, onNew }: { data: IntakeResultData; onNew: () => void }) {
  const navigate = useNavigate();

  /* "MENÜYÜ ÖNİZLE": müşterinin menu-liste-premium belgesi VARSA yeniden kullanılır
     (liste updated_at DESC gelir → ilk eşleşme en güncel), yoksa oluşturulur;
     ardından /print/:id?variant=preview (net A4, işaretsiz — insan-görünür). */
  const openPreview = useMutation({
    mutationFn: async () => {
      const docs = await api.documents(data.client_id);
      const existing = docs.find((d) => d.template_id === "menu-liste-premium");
      if (existing) return existing.id;
      return (await api.createDocument(data.client_id, "menu-liste-premium")).id;
    },
    onSuccess: (docId) => navigate(`/print/${docId}?variant=preview`),
  });

  return (
    <div className="intake-page">
      <div className="intake-result">
        <div className="big">✓</div>
        <h2>{t("intake.committed")}</h2>
        <p className="intake-hint">
          {tf("intake.result_ok", { name: data.client_name, n: data.applied })}
          {data.mergedItems > 0 ? ` · ${tf("intake.result_merged", { m: data.mergedItems })}` : ""}
          {data.surfaces > 0 ? ` · ${data.surfaces} ${t("intake.surfaces_saved")}` : ""}
        </p>
        {/* M8: ŞERH 1 ölçümü BİLGİ satırı (muted) — birleşme zaten result_merged'te
            görünür, katalog-doluluğu abartılı uyarı DEĞİL kısa nottur. false → DOM yok. */}
        {data.catalogHad && <p className="intake-hint">{t("intake.result_catalog_had")}</p>}

        {data.pending.length > 0 && (
          <div className="intake-warn pending" style={{ textAlign: "left" }}>
            {t("intake.summary_pending")}:
            <ul>
              {data.pending.map((p, i) => (
                <li key={i}>
                  {p.category} — {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.gaps.length > 0 && (
          <div className="intake-warn gaps" style={{ textAlign: "left" }}>
            {t("intake.summary_gaps")}:
            <ul>
              {data.gaps.map((g, i) => (
                <li key={i}>
                  {g.item}: {g.label} ({g.usedLang})
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* M8 sessizlik-tüketimi (ŞERH 4): usage bump'ta atlanan bilinmeyen chip_id'ler.
            Biçim pending bloğuyla AYNI (intake-warn + ul). Boşken DOM üretilmez. */}
        {data.skippedBumps.length > 0 && (
          <div className="intake-warn pending" style={{ textAlign: "left" }}>
            {t("intake.result_skipped_bumps")}:
            <ul>
              {data.skippedBumps.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}
        {/* M8: birleşmede hedefe yazılmayan kategori notları — kategori adı + notun
            kendisi (bilgi kaybetme). gaps sınıfı: özetteki merge bloğuyla aynı ton. */}
        {data.noteDrops.length > 0 && (
          <div className="intake-warn gaps" style={{ textAlign: "left" }}>
            {t("intake.result_note_dropped")}:
            <ul>
              {data.noteDrops.map((d, i) => (
                <li key={i}>
                  {d.label} — {d.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="intake-btn primary"
          disabled={openPreview.isPending}
          onClick={() => openPreview.mutate()}
        >
          {openPreview.isPending ? "…" : t("intake.result_preview")}
        </button>
        <button className="intake-btn ghost" onClick={onNew}>
          {t("intake.result_new")}
        </button>
        {openPreview.isError && (
          <p className="intake-warn full">
            {t("intake.commit_error")}: {(openPreview.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---- Adım 1: Müşteri (yeni kur / mevcut seç) — müşteri commit'te yaratılır (D) ---- */
function ClientStep() {
  const s = useIntake();
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: api.clients });
  /* KURULUMUN İŞ KOLLARI — aynı anahtar ProjectsPanel/DocumentsPanel ile
     PAYLAŞILIR (tek istek, tek önbellek). Yanıt gelmeden `undefined` kalır ve
     etiket bugünkü metinde durur (bkz. `menuUretiyorMu` yorumu). */
  const isKollari = useQuery({ queryKey: ["isKollari"], queryFn: api.isKollari });
  const aktifSektorler =
    isKollari.data?.kaynak === "yapilandirma" ? isKollari.data.aktif : undefined;

  /* HF3: seçilen mevcut müşterinin TAM DTO'su (menu_language listede yok, yalnız
     ClientDTO'da). Aynı ["client", id] anahtarı IntakeSummaryStep'in existingQ'suyla
     paylaşılır → tek fetch. Dil gelince taslağa yazılır (menuLang() doğru döner). */
  const selClientQ = useQuery({
    queryKey: ["client", s.existingClientId],
    queryFn: () => api.client(s.existingClientId!),
    enabled: s.clientMode === "existing" && !!s.existingClientId,
  });
  const selLang = selClientQ.data?.menu_language;
  useEffect(() => {
    if (selLang && selLang !== s.existingClientLang) s.setExistingClientLang(selLang);
  }, [selLang, s.existingClientLang, s.setExistingClientLang]);

  const canNext =
    (s.clientMode === "new" && s.newClient.name.trim() !== "") ||
    (s.clientMode === "existing" && !!s.existingClientId);

  return (
    <section className="intake-step">
      <h2>{t("intake.step_client")}</h2>
      <div className="intake-seg">
        <button
          className={`intake-btn ${s.clientMode === "new" ? "primary" : "ghost"}`}
          onClick={() => s.setClientMode("new")}
        >
          {t("intake.client_new")}
        </button>
        <button
          className={`intake-btn ${s.clientMode === "existing" ? "primary" : "ghost"}`}
          onClick={() => s.setClientMode("existing")}
        >
          {t("intake.client_existing")}
        </button>
      </div>

      {/* CILA1/3: mevcut müşteri seçiliyken HER ZAMAN görünür bant — kazanın
          kök önleyicisi (yanlışlıkla "existing" modda kalıp fark edilmemesin). */}
      {s.clientMode === "existing" && s.existingClientId && (
        <div className="intake-warn full">
          {tf("intake.existing_selected", { name: s.existingClientName ?? "" })}
          {selLang ? ` · ${LANG_LABEL[selLang]}` : ""}
        </div>
      )}

      {s.clientMode === "new" && (
        <div className="intake-fields">
          <label>
            {t("intake.client_name")}
            <input
              value={s.newClient.name}
              onChange={(e) => s.setNewClient({ name: e.target.value })}
              placeholder={t("intake.client_name_ph")}
            />
          </label>
          <label>
            {t("client.currency")}
            <select
              value={s.newClient.currency}
              onChange={(e) => s.setNewClient({ currency: e.target.value as Currency })}
            >
              {PARA_BIRIMI_SECENEKLERI.map((p) => (
                <option key={p.kod} value={p.kod}>
                  {p.etiket}
                </option>
              ))}
            </select>
          </label>
          <label>
            {/* ETİKET KURULUMUN İŞ KOLUNDAN (K-1/D): alan menüye değil,
                kurulumun ÇIKTI diline aittir — tabelacının başlık chrome'unu
                da o belirler. Menü üreten kurulumda metin bugünküyle birebir. */}
            {ciktiDiliEtiketi(aktifSektorler)}
            <select
              value={s.newClient.menu_language}
              onChange={(e) => s.setNewClient({ menu_language: e.target.value as MenuLang })}
            >
              {/* SEÇENEKLER İLANDAN — para birimi seçicisiyle (hemen yukarıda)
                  aynı desen. Elle yazılı liste şemanın ikinci kopyasıydı ve
                  dördüncü bir dil eklendiği gün sessizce eksik kalırdı. */}
              {CIKTI_DILI_SECENEKLERI.map((d) => (
                <option key={d.kod} value={d.kod}>
                  {d.etiket}
                </option>
              ))}
            </select>
          </label>
          <p className="intake-hint">{t("intake.client_deferred")}</p>
        </div>
      )}

      {s.clientMode === "existing" && (
        <div className="intake-list">
          {clientsQ.data?.map((c) => (
            <button
              key={c.id}
              className={`intake-choice ${s.existingClientId === c.id ? "selected" : ""}`}
              onClick={() => s.setExistingClient(c.id, c.name)}
            >
              {c.name}
            </button>
          ))}
          {clientsQ.data && clientsQ.data.length === 0 && <p className="intake-hint">{t("intake.no_clients")}</p>}
        </div>
      )}

      <NavBar canNext={canNext} />
    </section>
  );
}

/* ---- Adım 2: Sektör paketi ÇOKLU seçim (karma işletme) ---- */
function PacksStep() {
  const s = useIntake();
  const sectorsQ = useQuery({ queryKey: ["sectors"], queryFn: api.sectors });

  if (sectorsQ.isError) {
    return (
      <section className="intake-step">
        <h2>{t("intake.step_packs")}</h2>
        <FetchError onRetry={() => sectorsQ.refetch()} />
      </section>
    );
  }

  return (
    <section className="intake-step">
      <h2>{t("intake.step_packs")}</h2>
      <p className="intake-hint">{t("intake.packs_multi")}</p>
      <div className="intake-list">
        {sectorsQ.data?.map((p) => {
          const sel = s.selectedPackIds.includes(p.id);
          const itemCount = p.categories.reduce((n, c) => n + c.items.length, 0);
          return (
            <button
              key={p.id}
              className={`intake-choice ${sel ? "selected" : ""}`}
              onClick={() => s.togglePack(p.id)}
            >
              <span className="check">{sel ? "✓" : ""}</span>
              <span>
                <strong>{p.label_tr}</strong>
                <span className="sub">
                  {p.categories.length} {t("intake.cat")} · {itemCount} {t("intake.item")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <NavBar canNext={s.selectedPackIds.length > 0} />
    </section>
  );
}
