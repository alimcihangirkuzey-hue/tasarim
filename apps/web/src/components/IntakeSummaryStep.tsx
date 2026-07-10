/* Sipariş Modu Adım 6: özet (pending + translationGaps) + commit — F7C-7'de doldurulur. */
import { t } from "../i18n";
import { NavBar } from "./IntakeNav";

export function IntakeSummaryStep() {
  return (
    <section className="intake-step">
      <h2>{t("intake.step_summary")}</h2>
      <p className="intake-hint">{t("intake.wip")}</p>
      <NavBar canNext={false} />
    </section>
  );
}
