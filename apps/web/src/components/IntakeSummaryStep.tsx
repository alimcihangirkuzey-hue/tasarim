/* Sipariş Modu Adım 6 (F7-C): özet — pending (fiyat-bekliyor) + translationGaps
   GÖRÜNÜR (M8, sessiz hiçbir şey yok) + katalog-dolu uyarısı (ŞERH 1) → atomik
   commit (api.intakeCommit).

   HF2-B: name/category_name/category_note store'da HAM LocalizedName — TEK
   NOKTA burada (answers oluşturulurken) pickML(x, menu_language) ile çözülür.
   Pending listesi operatöre HER ZAMAN TR gösterilir (pendingTr, s.products'tan
   ayrıca hesaplanır) — preview.pending (server/projection çıktısı, DEĞİŞMEDİ)
   HANGİ ürünlerin fiyatsız olduğunu belirlemek için hâlâ kullanılır (commit-
   öncesi doğrulama + translationGaps), yalnız GÖSTERİLEN metin ayrıştırılmıştır.

   CILA2/B1: SONUÇ görünümü artık BU BİLEŞENDE DEĞİL — onSuccess'teki s.reset()
   step'i 1'e çektiğinden SiparisPage'deki `s.step === 6` koşulu düşüyor ve bu
   bileşen (içindeki result state'iyle) unmount oluyordu → sonuç ekranı hiç
   görünmüyordu. Sonuç verisi onCommitted ile SiparisPage'e (adım-bağımsız yerel
   duruma) yukarı taşınır; taslak reset'i commit anında KALIR (taslak-sızıntısı /
   çift-commit önlemi — kapanan sekme dolu taslak bırakmaz). */

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IntakeAnswersSchema, projectIntake, type ProjectionResult } from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";
import { pickDisplay, pickML } from "./IntakeNav";
import { useIntake } from "../store/intakeStore";

/** Commit sonucu — taslak/store reset'inden BAĞIMSIZ yaşar (SiparisPage tutar).
    pending TR'dir (HF2-B: operatör görünümü; res.pending çıktı dilinde olurdu). */
export interface IntakeResultData {
  client_id: string;
  client_name: string;
  applied: number;
  pending: Array<{ name: string; category: string }>;
  gaps: ProjectionResult["translationGaps"];
}

export function IntakeSummaryStep({ onCommitted }: { onCommitted: (r: IntakeResultData) => void }) {
  const s = useIntake();
  const lang = s.menuLang();
  const qc = useQueryClient();

  const existingQ = useQuery({
    queryKey: ["client", s.existingClientId],
    queryFn: () => api.client(s.existingClientId!),
    enabled: s.clientMode === "existing" && !!s.existingClientId,
  });

  const answers = useMemo(
    () =>
      IntakeAnswersSchema.parse({
        items: s.products.map((p) => ({
          category_name: pickML(p.category_name, lang), // TEK NOKTA — ham→çıktı dili
          name: pickML(p.name, lang),
          category_note: p.category_note ? pickML(p.category_note, lang) : undefined,
          variants: p.variants,
          chips: p.chips,
          extras: p.extras,
          hide_content: p.hide_content,
        })),
      }),
    [s.products, lang]
  );

  const preview = useMemo(() => projectIntake(answers, "PREVIEW", lang), [answers, lang]);
  const catalogFull = s.clientMode === "existing" && (existingQ.data?.catalog.categories.length ?? 0) > 0;

  /* CILA1/2 — "bu gecenin kazası": mevcut+dolu müşteride kırmızı kutu (ŞERH 1
     uyarısı) YETMEDİ, kullanıcı görmeden/anlamadan basabildi. Artık bu YOLDA
     (yalnız catalogFull true iken — window.confirm proje deseni, 5+ yerde
     kullanılıyor, bkz ClientDetailPage/EditorPage/ThemesPage) net bir onay
     sorusu araya girer; yeni-müşteri yolunda HİÇ TETİKLENMEZ. */
  const handleCommitClick = () => {
    if (catalogFull) {
      const name = existingQ.data?.name ?? s.existingClientName ?? "";
      const ok = window.confirm(
        tf("intake.commit_confirm", { name, n: preview.categories.length })
      );
      if (!ok) return;
    }
    commit.mutate();
  };

  /* Operatöre HER ZAMAN TR (HF2-B) — hangi ürünler fiyatsız kaldığını
     preview.pending ile AYNI kuralla (tüm varyant value'ları null) belirler,
     ama isimleri store'daki ham LocalizedName'den (pickDisplay→TR) gösterir. */
  const pendingTr = useMemo(
    () =>
      s.products
        .filter((p) => p.variants.every((v) => v.value === null))
        .map((p) => ({ name: pickDisplay(p.name), category: pickDisplay(p.category_name) })),
    [s.products]
  );

  const commit = useMutation({
    mutationFn: () =>
      api.intakeCommit({
        ...(s.clientMode === "new"
          ? {
              new_client: {
                name: s.newClient.name.trim(),
                currency: s.newClient.currency,
                menu_language: s.newClient.menu_language,
              },
            }
          : { client_id: s.existingClientId! }),
        answers,
        checklist: s.checklist as unknown as Record<string, unknown>,
      }),
    onSuccess: (res) => {
      /* Sonuç verisi ÖNCE yukarı (SiparisPage) — reset'ten etkilenmez (B1).
         client_name reset'ten önce yakalanır; pending TR listesidir (HF2-B). */
      onCommitted({
        client_id: res.client_id,
        client_name:
          s.clientMode === "new"
            ? s.newClient.name.trim()
            : existingQ.data?.name ?? s.existingClientName ?? "",
        applied: res.applied_categories,
        pending: pendingTr,
        gaps: res.translationGaps,
      });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["ingredients"] });
      s.reset(); // taslak commit anında temizlenir (çift-commit önlemi) — sonuç görünümü bundan bağımsız
    },
  });

  const clean = pendingTr.length === 0 && preview.translationGaps.length === 0;

  return (
    <section className="intake-step">
      <h2>{t("intake.step_summary")}</h2>

      {catalogFull && <div className="intake-warn full">{t("intake.catalog_has")}</div>}

      {pendingTr.length > 0 && (
        <div className="intake-warn pending">
          {t("intake.summary_pending")}:
          <ul>
            {pendingTr.map((p, i) => (
              <li key={i}>
                {p.category} — {p.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview.translationGaps.length > 0 && (
        <div className="intake-warn gaps">
          {t("intake.summary_gaps")}:
          <ul>
            {preview.translationGaps.map((g, i) => (
              <li key={i}>
                {g.item}: {g.label} ({g.usedLang})
              </li>
            ))}
          </ul>
        </div>
      )}
      {clean && <p className="intake-hint">{t("intake.summary_none")}</p>}

      <div className="intake-navbar">
        <button className="intake-btn ghost" onClick={s.back}>
          {t("intake.back")}
        </button>
        <button
          className="intake-btn primary"
          disabled={commit.isPending || s.products.length === 0}
          onClick={handleCommitClick}
        >
          {commit.isPending ? t("intake.committing") : t("intake.commit")}
        </button>
      </div>
      {commit.isError && (
        <p className="intake-warn full">
          {t("intake.commit_error")}: {(commit.error as Error).message}
        </p>
      )}
    </section>
  );
}
