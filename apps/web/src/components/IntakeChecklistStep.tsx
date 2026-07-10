/* Sipariş Modu Adım 5: doneler & şartlar çeklisti — F7C-7'de doldurulur. */
import { t } from "../i18n";
import { NavBar } from "./IntakeNav";

export function IntakeChecklistStep() {
  return (
    <section className="intake-step">
      <h2>{t("intake.step_checklist")}</h2>
      <p className="intake-hint">{t("intake.wip")}</p>
      <NavBar canNext={true} />
    </section>
  );
}
