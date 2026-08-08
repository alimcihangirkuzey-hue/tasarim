/* Ayarlar / Parse sözlüğü — FAZ4-GOREV §10.
   parser = kod içi çekirdek ∪ bu liste; ekleme aynı oturumda parse'a yansır
   (Çözümle düğmesi listeyi her seferinde tazeler). */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductType } from "@tezgah/shared";
import { api } from "../api";
import { gorunurSiparisTurleri } from "../lib/gorunurTurler";
import { t } from "../i18n";
import { useKurulumDaraltmasi } from "../lib/kurulumDaraltmasi";


export function SettingsTabs({ active }: { active: "themes" | "parse" | "factory" | "fonts" | "ingredients" }) {
  return (
    <div className="tabs" style={{ marginBottom: 14 }}>
      <Link to="/settings/themes">
        <button className={active === "themes" ? "active" : ""}>{t("themes.title")}</button>
      </Link>
      <Link to="/settings/fonts">
        <button className={active === "fonts" ? "active" : ""}>{t("fonts.title")}</button>
      </Link>
      {/* Malzemeler: çip çeviri tamamlama (journal 2026-07-28-m8-sessizlik-cip-ceviri) */}
      <Link to="/settings/ingredients">
        <button className={active === "ingredients" ? "active" : ""}>{t("malzeme.title")}</button>
      </Link>
      <Link to="/settings/parse">
        <button className={active === "parse" ? "active" : ""}>{t("parsedict.title")}</button>
      </Link>
      <Link to="/settings/factory">
        <button className={active === "factory" ? "active" : ""}>{t("factory.title")}</button>
      </Link>
    </div>
  );
}

export function ParseDictPage() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["parse-synonyms"], queryFn: api.parseSynonyms });
  const [word, setWord] = useState("");
  const [type, setType] = useState<ProductType>("tabela");
  /* KURULUMUN İŞ KOLLARI (K-1/C): bu da bir SEÇENEK SUNAN yüzeydir, ProjectsPanel
     tür seçicisiyle aynı hükme (7.1/481) bağlanır — iki chooser'ın farklı
     davranması operatöre tutarsız bir sistem gösterirdi. Sözlüğün ÜRETTİĞİ
     eşleşmeler süzülmez (yapıştır-parse kapsam dışı, gerekçe defterde). */
  const gorunurTurler = gorunurSiparisTurleri(useKurulumDaraltmasi());
  const etkinTur = gorunurTurler.includes(type) ? type : gorunurTurler[0]!;

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["parse-synonyms"] });
  const add = useMutation({
    mutationFn: () => api.addParseSynonym(word.trim(), etkinTur),
    onSuccess: () => {
      setWord("");
      invalidate();
    },
  });
  const del = useMutation({
    mutationFn: (w: string) => api.deleteParseSynonym(w),
    onSuccess: invalidate,
  });

  return (
    <div>
      <SettingsTabs active="parse" />
      <h2>{t("parsedict.title")}</h2>
      <p className="muted" style={{ maxWidth: 560 }}>{t("parsedict.hint")}</p>

      <div className="row" style={{ gap: 8, margin: "10px 0" }}>
        <input
          type="text"
          value={word}
          placeholder={t("parsedict.word_placeholder")}
          onChange={(e) => setWord(e.target.value)}
          style={{ width: 200 }}
        />
        <span className="muted">→</span>
        <select value={etkinTur} onChange={(e) => setType(e.target.value as ProductType)}>
          {gorunurTurler.map((tp) => (
            <option key={tp} value={tp}>{t(`orders.type_${tp}`)}</option>
          ))}
        </select>
        <button disabled={word.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>
          {t("parsedict.add")}
        </button>
        {add.isError && <span className="error">{(add.error as Error).message}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 480 }}>
        {(listQ.data ?? []).length === 0 && <p className="muted">{t("parsedict.empty")}</p>}
        {(listQ.data ?? []).map((s) => (
          <div key={s.word} className="row" style={{ gap: 8, border: "1px solid #e5e0d6", borderRadius: 8, padding: "6px 10px" }}>
            <code style={{ flex: 1 }}>{s.word}</code>
            <span className="pill">{t(`orders.type_${s.product_type}`)}</span>
            <button className="icon" title={t("common.delete")} onClick={() => del.mutate(s.word)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
