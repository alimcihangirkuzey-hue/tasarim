/* Sipariş Modu Adım 3-4: ürün seç + sorular + çipler — F7C-6'da doldurulur. */
import { t } from "../i18n";
import { useIntake } from "../store/intakeStore";
import { NavBar } from "./IntakeNav";

export function IntakeProductsStep() {
  const s = useIntake();
  return (
    <section className="intake-step">
      <h2>{t("intake.step_products")}</h2>
      <p className="intake-hint">{t("intake.wip")}</p>
      <NavBar canNext={s.products.length > 0} />
    </section>
  );
}
