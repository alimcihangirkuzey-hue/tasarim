/* Sipariş Modu Adım 5 (F7-C): doneler & şartlar çeklisti — ZORUNLU adım (görüşme
   bunsuz bitmez). logo · foto politikası (eksikse hatırlatma) · tel+adres teyidi ·
   ölçü/yüzey notu (serbest metin, KALIR) · YAPISAL yüzeyler (F8-A — commit'te
   müşteri profiline) · kapora · teslim tarihi. */

import type { SurfaceKind } from "@tezgah/shared";
import { t } from "../i18n";
import { useIntake } from "../store/intakeStore";
import { NavBar } from "./IntakeNav";

const SURFACE_KINDS: SurfaceKind[] = ["vitrine", "tabela", "garment", "diger"];

export function IntakeChecklistStep() {
  const s = useIntake();
  const c = s.checklist;
  const ready = c.logo !== "" && c.photo_policy !== "" && c.contact_confirmed;

  return (
    <section className="intake-step">
      <h2>{t("intake.step_checklist")}</h2>
      <p className="intake-hint">{t("intake.checklist_intro")}</p>

      <div className="intake-checklist">
        <div className="row">
          <span>{t("intake.cl_logo")}</span>
          <div className="intake-seg">
            <button className={`intake-btn ${c.logo === "var" ? "primary" : "ghost"}`} onClick={() => s.setChecklist({ logo: "var" })}>
              {t("intake.cl_logo_var")}
            </button>
            <button className={`intake-btn ${c.logo === "yok" ? "primary" : "ghost"}`} onClick={() => s.setChecklist({ logo: "yok" })}>
              {t("intake.cl_logo_yok")}
            </button>
          </div>
        </div>

        <div className="row">
          <span>{t("intake.cl_photo")}</span>
          <div className="intake-list">
            {(["musteri", "atolye", "eksik"] as const).map((pol) => (
              <button
                key={pol}
                className={`intake-choice ${c.photo_policy === pol ? "selected" : ""}`}
                onClick={() => s.setChecklist({ photo_policy: pol })}
              >
                {t(`intake.cl_photo_${pol}`)}
              </button>
            ))}
          </div>
          {c.photo_policy === "eksik" && <p className="intake-reminder">{t("intake.cl_photo_reminder")}</p>}
        </div>

        <label className="intake-toggle">
          <input
            type="checkbox"
            checked={c.contact_confirmed}
            onChange={(e) => s.setChecklist({ contact_confirmed: e.target.checked })}
          />
          {t("intake.cl_contact")}
        </label>

        <div className="row">
          <span>{t("intake.cl_size")}</span>
          <textarea value={c.size_note} onChange={(e) => s.setChecklist({ size_note: e.target.value })} />
        </div>
        <div className="row">
          <span>{t("intake.cl_surface")}</span>
          <input value={c.surface_note} onChange={(e) => s.setChecklist({ surface_note: e.target.value })} />
        </div>

        {/* F8-A: yapısal yüzeyler — serbest-metin notlar (yukarıda) KALIR (M8);
            bu yapısal kayıt commit'te müşteri yüzey profiline UPSERT edilir */}
        <div className="row">
          <span>{t("intake.cl_surfaces")}</span>
          <div className="intake-surfaces">
            {c.surfaces.map((sf, i) => (
              <div key={i} className="surface-row">
                <select value={sf.kind} onChange={(e) => s.updateSurface(i, { kind: e.target.value as SurfaceKind })}>
                  {SURFACE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`intake.sk_${k}`)}
                    </option>
                  ))}
                </select>
                <input
                  className="lbl"
                  value={sf.label}
                  placeholder={t("intake.surface_label_ph")}
                  maxLength={80}
                  onChange={(e) => s.updateSurface(i, { label: e.target.value })}
                />
                <input
                  className="dim"
                  inputMode="decimal"
                  value={sf.w_cm}
                  placeholder={t("intake.surface_w")}
                  onChange={(e) => s.updateSurface(i, { w_cm: e.target.value })}
                />
                <input
                  className="dim"
                  inputMode="decimal"
                  value={sf.h_cm}
                  placeholder={t("intake.surface_h")}
                  onChange={(e) => s.updateSurface(i, { h_cm: e.target.value })}
                />
                <input
                  className="note"
                  value={sf.note}
                  placeholder={t("intake.surface_note_ph")}
                  maxLength={300}
                  onChange={(e) => s.updateSurface(i, { note: e.target.value })}
                />
                <button className="intake-btn ghost surface-x" title={t("intake.remove")} onClick={() => s.removeSurface(i)}>
                  ×
                </button>
              </div>
            ))}
            <button className="intake-btn ghost" onClick={s.addSurface}>
              {t("intake.surface_add")}
            </button>
          </div>
        </div>

        <div className="row">
          <span>{t("intake.cl_deposit")}</span>
          <input value={c.deposit_note} onChange={(e) => s.setChecklist({ deposit_note: e.target.value })} />
        </div>
        <div className="row">
          <span>{t("intake.cl_delivery")}</span>
          <input type="date" value={c.delivery_date} onChange={(e) => s.setChecklist({ delivery_date: e.target.value })} />
        </div>
      </div>

      <NavBar canNext={ready} />
    </section>
  );
}
