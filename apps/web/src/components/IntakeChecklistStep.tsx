/* Sipariş Modu Adım 5 (F7-C): doneler & şartlar çeklisti — ZORUNLU adım (görüşme
   bunsuz bitmez). logo · foto politikası (eksikse hatırlatma) · tel+adres teyidi ·
   ölçü/yüzey notu (VERİ; mockup Faz 8) · kapora · teslim tarihi. */

import { t } from "../i18n";
import { useIntake } from "../store/intakeStore";
import { NavBar } from "./IntakeNav";

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
