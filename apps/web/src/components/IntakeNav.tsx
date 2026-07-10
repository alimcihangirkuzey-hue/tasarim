/* Sipariş Modu ortak alt navigasyon + yardımcılar — F7-C. Ayrı dosya (SiparisPage
   ile adım bileşenleri arasında döngüsel import olmasın). */

import { t } from "../i18n";
import { useIntake, type MenuLang } from "../store/intakeStore";

export function NavBar({
  canNext,
  nextLabel,
  onNext,
}: {
  canNext: boolean;
  nextLabel?: string;
  onNext?: () => void;
}) {
  const s = useIntake();
  return (
    <div className="intake-navbar">
      {s.step > 1 ? (
        <button className="intake-btn ghost" onClick={s.back}>
          {t("intake.back")}
        </button>
      ) : (
        <span />
      )}
      <button
        className="intake-btn primary"
        disabled={!canNext}
        onClick={onNext ?? s.next}
      >
        {nextLabel ?? t("intake.next")}
      </button>
    </div>
  );
}

/** Çok-dilli addan menü diline göre etiket (fr→tr→de / de→fr→tr fallback) —
    projeksiyon resolveChip mantığıyla aynı; operatör UI'da menü çıktısını gösterir. */
export function pickML(name: { tr: string; fr: string; de: string }, lang: MenuLang): string {
  const order = lang === "de" ? [name.de, name.fr, name.tr] : [name.fr, name.tr, name.de];
  return (order.find((v) => v && v.trim() !== "") ?? "").trim();
}

/** Sunucuya ulaşılamadığında GÖRÜNÜR hata + tekrar-dene (HF1/B — M8: sessiz boş
    liste yok). Yalnız intake fetch'lerinde (sectors/ingredients) kullanılır. */
export function FetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="intake-warn full">
      <p>{t("intake.fetch_error")}</p>
      <button className="intake-btn ghost" style={{ marginTop: 8 }} onClick={onRetry}>
        {t("intake.retry")}
      </button>
    </div>
  );
}
