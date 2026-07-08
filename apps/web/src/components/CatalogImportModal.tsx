/* Katalog yapıştır-içe aktarma modalı — FAZ5-GOREV §4.
   Canlı önizleme sunucuyla AYNI saf motordan (parseCatalogText) gelir;
   "Uygula" sunucuda otomatik geçmiş kaydı + katalog güncellemesi yapar. */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseCatalogText, type ClientDTO, type ImportMode } from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";

export function CatalogImportModal({ client, onClose }: { client: ClientDTO; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ImportMode>("append");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const preview = useMemo(() => parseCatalogText(text), [text]);

  const apply = useMutation({
    mutationFn: () => api.catalogImport(client.id, text, mode),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client", client.id] });
      void qc.invalidateQueries({ queryKey: ["catalog-history", client.id] });
      onClose();
    },
  });

  const canApply = preview.itemCount > 0 && (mode === "append" || confirmReplace);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ width: "min(720px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>{t("import.title")}</h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>{t("import.hint")}</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"KATEGORİ: Pizzas\nPizza Margherita | 8,00 | Sauce tomate, mozzarella\nPizza Döner | 11"}
          style={{ width: "100%", minHeight: 160, fontFamily: "monospace", fontSize: 13 }}
        />

        {/* önizleme sayıları */}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill">{tf("import.preview_cats", { n: preview.catCount })}</span>
          <span className="pill">{tf("import.preview_items", { n: preview.itemCount })}</span>
          {preview.skipped.length > 0 && (
            <span className="pill warn">{tf("import.preview_skipped", { n: preview.skipped.length })}</span>
          )}
        </div>

        {/* atlanan satırlar */}
        {preview.skipped.length > 0 && (
          <div style={{ maxHeight: 120, overflow: "auto", fontSize: 12, border: "1px solid var(--c-line, #e5e0d6)", borderRadius: 8, padding: 6 }}>
            {preview.skipped.map((s) => (
              <div key={s.line} className="muted">
                {tf("import.skip_line", { n: s.line })}: <code>{s.text || "(boş)"}</code> — {t(`import.skip_${s.reason}`)}
              </div>
            ))}
          </div>
        )}

        {/* mod seçimi */}
        <div className="row" style={{ gap: 12 }}>
          <label>
            <input type="radio" name="imode" checked={mode === "append"} onChange={() => { setMode("append"); setConfirmReplace(false); }} />
            {" "}{t("import.mode_append")}
          </label>
          <label>
            <input type="radio" name="imode" checked={mode === "replace"} onChange={() => setMode("replace")} />
            {" "}{t("import.mode_replace")}
          </label>
        </div>
        {mode === "replace" && (
          <label className="row" style={{ gap: 6, color: "#b91c1c", fontSize: 13 }}>
            <input type="checkbox" checked={confirmReplace} onChange={(e) => setConfirmReplace(e.target.checked)} />
            {tf("import.replace_confirm", { n: client.catalog.categories.reduce((a, c) => a + c.items.length, 0) })}
          </label>
        )}

        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="ghost" onClick={onClose}>{t("editor.cancel")}</button>
          <button disabled={!canApply || apply.isPending} onClick={() => apply.mutate()}>
            {t("import.apply")}
          </button>
        </div>
        {apply.isError && <span className="error">{(apply.error as Error).message}</span>}
      </div>
    </div>
  );
}
