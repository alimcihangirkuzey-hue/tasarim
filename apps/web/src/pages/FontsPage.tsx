/* Ayarlar / Fontlar — FAZ5-GOREV §7, mimar kararı #18.
   woff2/ttf yükle → server fontkit ile parse → #18 glif kapsam bekçisi.
   Eksikse RED + eksik glif listesi; tamsa listeye girer, marka kiti & tema
   seçicilerine katılır, print @font-face aynı /fonts/ kaynağını kullanır (M3).
   Silme: kit/tema referanslıysa 409 + nerede kullanıldığı. */

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GLYPH_COVERAGE } from "@tezgah/shared";
import { api, kullanimlariOku, type ApiHata } from "../api";
import { t } from "../i18n";
import { SettingsTabs } from "./ParseDictPage";

type FontRow = { id: string; family: string; filename: string; created_at: string };

/** Yapılandırılmış server hatası: eksik glif listesi.

    ŞERH GÜNCELLENDİ (2026-08-06): eski not "http yardımcısıyla kaybolduğu için
    ham fetch ile okunur" diyordu — o gerekçe ARTIK YOK. http() hata gövdesini
    (ve durum kodunu) fırlattığı hataya iliştiriyor, bu yüzden yapısal alanlar
    api istemcisinden de okunabiliyor. Ham fetch'in bedeli ölçülmüştü: istemciyi
    atlayan kod apiErrorMessage'ın ürettiği okunur gerekçeyi de kaybediyordu. */
type UploadError =
  | { code: "missing_glyphs"; missing: string[] }
  | { code: "other"; message: string };

async function uploadFontRaw(file: File, family: string): Promise<FontRow> {
  try {
    return await api.uploadFont(file, family);
  } catch (e) {
    return yuklemeHatasi(e);
  }
}

function yuklemeHatasi(e: unknown): never {
  const body = (((e as ApiHata).govde ?? {}) as {
    error?: string;
    missing?: string[];
    detail?: string;
  });
  if (body.error === "missing_glyphs") {
    throw Object.assign(new Error("missing_glyphs"), {
      info: { code: "missing_glyphs", missing: body.missing ?? [] } as UploadError,
    });
  }
  const message =
    body.error === "family_exists"
      ? t("fonts.err_exists")
      : body.error === "family_invalid"
      ? body.detail ?? t("fonts.err_family")
      : body.error === "unsupported_type"
      ? t("fonts.err_type")
      : body.error === "parse_failed"
      ? t("fonts.err_parse")
      /* Tanınmayan kod: http()'nin apiErrorMessage ile ürettiği okunur
         gerekçe kullanılır (eski hâlde çıplak durum koduydu). */
      : (e as Error).message;
  throw Object.assign(new Error(message), { info: { code: "other", message } as UploadError });
}

/* Font silme api istemcisinden geçer (ham fetch DEĞİL): http() 409'un
   yapısal gövdesini hataya iliştirdiği için atlamaya gerek kalmadı ve
   beklenmedik durum kodları artık okunur gerekçeyle yükselir — eski ham
   sürümde `in_use` dışındaki her gövde yalnız `error` ya da durum koduydu.
   Kullanımda mesajı FONT'a özgü kaldığı için burada biçimlenir. */
async function deleteFontRaw(id: string): Promise<void> {
  try {
    await api.deleteFont(id);
  } catch (e) {
    const kullanimlar = kullanimlariOku(e);
    if (kullanimlar) {
      const list = kullanimlar.map((u) => `${u.where}: ${u.label}`).join(", ");
      throw new Error(t("fonts.err_in_use").replace("{list}", list));
    }
    throw e;
  }
}

export function FontsPage() {
  const qc = useQueryClient();
  /* Liste api istemcisinden — aynı sorgu dört ekranda zaten api.fonts ile
     kuruluyordu (BrandKitPanel · main · ThemesPage · FactoryPage); burası
     tek istisnaydı ve hata yolunu kaybediyordu. */
  const listQ = useQuery({ queryKey: ["fonts"], queryFn: api.fonts });
  const [family, setFamily] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [uploadErr, setUploadErr] = useState<UploadError | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["fonts"] });

  const upload = useMutation({
    mutationFn: () => {
      const f = fileRef.current?.files?.[0];
      if (!f) throw Object.assign(new Error(t("fonts.err_no_file")), { info: { code: "other", message: t("fonts.err_no_file") } });
      return uploadFontRaw(f, family.trim());
    },
    onMutate: () => setUploadErr(null),
    onError: (e: Error & { info?: UploadError }) => setUploadErr(e.info ?? { code: "other", message: e.message }),
    onSuccess: () => {
      setFamily("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFontRaw(id),
    onSuccess: refresh,
  });

  return (
    <div>
      <SettingsTabs active="fonts" />
      <h2>{t("fonts.title")}</h2>
      <p className="muted" style={{ maxWidth: 620 }}>{t("fonts.hint")}</p>

      {/* #18 kapsam kümesi — kullanıcı neyin gerektiğini görür */}
      <div className="panel" style={{ maxWidth: 620 }}>
        <strong style={{ fontSize: 13 }}>{t("fonts.coverage_title")}</strong>
        <p style={{ fontFamily: "monospace", fontSize: 15, letterSpacing: 1, wordBreak: "break-all", margin: "6px 0 0" }}>
          {[...GLYPH_COVERAGE].join(" ")}
        </p>
      </div>

      {/* yükleme */}
      <div className="panel" style={{ maxWidth: 620 }}>
        <div className="fgrid">
          <label className="field">
            {t("fonts.family")}
            <input
              type="text"
              value={family}
              placeholder={t("fonts.family_placeholder")}
              onChange={(e) => setFamily(e.target.value)}
            />
          </label>
          <label className="field">
            {t("fonts.file")}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
                {t("fonts.pick_file")}
              </button>
              <span className="muted" style={{ fontSize: 13 }}>{fileName || t("fonts.no_file")}</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".woff2,.ttf,.otf,font/woff2,font/ttf"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          <button
            disabled={family.trim().length < 1 || !fileName || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? t("fonts.uploading") : t("fonts.upload")}
          </button>
          {upload.isSuccess && <span className="muted">{t("fonts.uploaded")}</span>}
        </div>

        {/* RED: eksik glif listesi (bekçi) */}
        {uploadErr?.code === "missing_glyphs" && (
          <div className="error" style={{ marginTop: 10 }}>
            <strong>{t("fonts.rejected")}</strong>
            <p style={{ margin: "4px 0 0" }}>
              {t("fonts.missing_glyphs")}{" "}
              <span style={{ fontFamily: "monospace", fontSize: 15 }}>{uploadErr.missing.join(" ")}</span>
            </p>
          </div>
        )}
        {uploadErr?.code === "other" && <p className="error" style={{ marginTop: 10 }}>{uploadErr.message}</p>}
      </div>

      {/* liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 620 }}>
        {(listQ.data ?? []).length === 0 && <p className="muted">{t("fonts.empty")}</p>}
        {(listQ.data ?? []).map((f) => (
          <div key={f.id} className="row" style={{ gap: 10, border: "1px solid #e5e0d6", borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ flex: 1, fontFamily: `"${f.family}", "Inter", sans-serif`, fontSize: 17 }}>{f.family}</span>
            <span className="muted" style={{ fontSize: 12, fontFamily: "monospace" }}>{f.filename}</span>
            <button className="icon" title={t("common.delete")} onClick={() => del.mutate(f.id)}>✕</button>
          </div>
        ))}
        {del.isError && <p className="error">{(del.error as Error).message}</p>}
      </div>
    </div>
  );
}
