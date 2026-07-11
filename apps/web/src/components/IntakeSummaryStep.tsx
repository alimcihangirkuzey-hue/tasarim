/* Sipariş Modu Adım 6 (F7-C): özet — pending (fiyat-bekliyor) + translationGaps
   GÖRÜNÜR (M8, sessiz hiçbir şey yok) + katalog-dolu uyarısı (ŞERH 1) → atomik
   commit (api.intakeCommit) → sonuç: menü A4 önizleme köprüsü (tıklamadan menüye).

   HF2-B: name/category_name/category_note store'da HAM LocalizedName — TEK
   NOKTA burada (answers oluşturulurken) pickML(x, menu_language) ile çözülür.
   Pending listesi operatöre HER ZAMAN TR gösterilir (pendingTr, s.products'tan
   ayrıca hesaplanır) — preview.pending (server/projection çıktısı, DEĞİŞMEDİ)
   HANGİ ürünlerin fiyatsız olduğunu belirlemek için hâlâ kullanılır (commit-
   öncesi doğrulama + translationGaps), yalnız GÖSTERİLEN metin ayrıştırılmıştır. */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { IntakeAnswersSchema, projectIntake } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { pickDisplay, pickML } from "./IntakeNav";
import { useIntake } from "../store/intakeStore";

export function IntakeSummaryStep() {
  const s = useIntake();
  const lang = s.menuLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [result, setResult] = useState<{ client_id: string; applied: number; pending: number } | null>(null);

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
      setResult({ client_id: res.client_id, applied: res.applied_categories, pending: res.pending.length });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["ingredients"] });
      s.reset(); // taslak temizlenir
    },
  });

  const openMenu = useMutation({
    mutationFn: (clientId: string) => api.createDocument(clientId, "menu-liste-premium"),
    onSuccess: (doc) => navigate(`/editor/${doc.id}`),
  });

  if (result) {
    return (
      <div className="intake-page">
        <div className="intake-result">
          <div className="big">✓</div>
          <h2>{t("intake.committed")}</h2>
          <p className="intake-hint">
            {result.applied} {t("intake.cat")}
            {result.pending > 0 ? ` · ${result.pending} ${t("intake.summary_pending").toLowerCase()}` : ""}
          </p>
          <button
            className="intake-btn primary"
            disabled={openMenu.isPending}
            onClick={() => openMenu.mutate(result.client_id)}
          >
            {openMenu.isPending ? "…" : t("intake.result_preview")}
          </button>
          <button className="intake-btn ghost" onClick={() => navigate(`/clients/${result.client_id}`)}>
            {t("intake.result_client")}
          </button>
        </div>
      </div>
    );
  }

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
          onClick={() => commit.mutate()}
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
