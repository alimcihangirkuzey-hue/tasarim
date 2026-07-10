/* Sipariş Modu — mobil-öncelikli tek-kolon intake akışı (F7-C). AYRI sayfa
   (sabit-genişlik editör YENİDEN KULLANILMAZ — keşif Q5). Adımlar: müşteri →
   paketler → ürünler → sorular/çipler → çeklist → özet/commit. Taslak
   localStorage'da (D); akış başında eski taslak → devam/at (ŞERH 2). */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { t } from "../i18n";
import { useIntake } from "../store/intakeStore";
import { FetchError, NavBar } from "../components/IntakeNav";
import { IntakeProductsStep } from "../components/IntakeProductsStep";
import { IntakeChecklistStep } from "../components/IntakeChecklistStep";
import { IntakeSummaryStep } from "../components/IntakeSummaryStep";

const STEP_KEYS = ["client", "packs", "products", "questions", "checklist", "summary"] as const;

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
  const [draftAck, setDraftAck] = useState(false);
  const showDraftPrompt = s.hasDraft() && !draftAck;

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
      {s.step === 4 && <IntakeProductsStep />}
      {s.step === 5 && <IntakeChecklistStep />}
      {s.step === 6 && <IntakeSummaryStep />}
    </div>
  );
}

/* ---- Adım 1: Müşteri (yeni kur / mevcut seç) — müşteri commit'te yaratılır (D) ---- */
function ClientStep() {
  const s = useIntake();
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: api.clients });

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
              onChange={(e) => s.setNewClient({ currency: e.target.value as "EUR" | "CHF" })}
            >
              <option value="EUR">EUR (€)</option>
              <option value="CHF">CHF</option>
            </select>
          </label>
          <label>
            {t("intake.menu_lang")}
            <select
              value={s.newClient.menu_language}
              onChange={(e) => s.setNewClient({ menu_language: e.target.value as "fr" | "de" })}
            >
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
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
