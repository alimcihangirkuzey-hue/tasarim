import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link } from "react-router-dom";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { registerCustomThemes } from "@tezgah/templates";
import { istemciKur } from "./lib/sorguIstemcisi";
import { HataBandi } from "./components/HataBandi";
import { RotaAgaci } from "./rotalar";
import { api } from "./api";
import { t } from "./i18n";
import "./styles.css";
import "@tezgah/templates/fonts/fonts.css";

/* FAZ5 §7: yüklenen fontların @font-face'i — web VE print aynı /fonts/ kaynağını
   kullanır (M3). font-display:block → PDF'te fallback kareleri basılmaz
   (arşiv CONSTITUTION teknoloji ADR-3). */
function customFontFaceCss(fonts: Array<{ family: string; filename: string }>): string {
  return fonts
    .map((f) => {
      const fmt = f.filename.toLowerCase().endsWith(".woff2") ? "woff2" : "truetype";
      return `@font-face{font-family:"${f.family}";font-weight:400;font-style:normal;font-display:block;src:url("/fonts/${f.filename}") format("${fmt}");}`;
    })
    .join("\n");
}

/* FAZ4 §7 + FAZ5 §7: özel temalar VE fontlar İLK boyamadan önce hazırlanır — print
   rotaları dahil (M3: web ve PDF aynı çözümleme yolunu kullanır). Font listesi
   yüklenmeden hiçbir rota çizilmez; böylece PrintPage'in document.fonts.ready'si
   özel fontları da bekler (PDF'e gömülür). */
function ThemesGate({ children }: { children: React.ReactNode }) {
  const themesQ = useQuery({ queryKey: ["themes"], queryFn: api.themes, staleTime: Infinity, retry: 1 });
  const fontsQ = useQuery({ queryKey: ["fonts"], queryFn: api.fonts, staleTime: Infinity, retry: 1 });
  useMemo(() => {
    if (themesQ.data) registerCustomThemes(themesQ.data);
  }, [themesQ.data]);
  if (themesQ.isPending || fontsQ.isPending) return null;
  return (
    <>
      {fontsQ.data && fontsQ.data.length > 0 && (
        <style dangerouslySetInnerHTML={{ __html: customFontFaceCss(fontsQ.data) }} />
      )}
      {children}
      {/* Sessiz düşen yazma işlemlerinin görünen yüzü — uygulamada BİR KEZ */}
      <HataBandi />
    </>
  );
}

/* KURULUM lib/sorguIstemcisi.ts'te — TEK KAYNAK: kurulum artık davranış
   taşıyor (kendi onError'ı olmayan mutation düştüğünde gerekçeyi yayınlar) ve
   testin uygulamanın KOPYASINI değil KENDİSİNİ ölçmesi gerekiyor. */
const qc = istemciKur();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          TEZG<span>Â</span>H
        </Link>
        <span className="sub">{t("app.subtitle")}</span>
        <span style={{ flex: 1 }} />
        <Link className="ghost-link siparis-link" to="/siparis">{t("app.siparis")}</Link>
        <Link className="ghost-link" to="/tasarim">{t("app.tasarim")}</Link>
        <Link className="ghost-link" to="/settings/themes">{t("app.settings")}</Link>
        {/* FAZ4 §6: data/ zip yedeği tarayıcıdan iner (M7) */}
        <a className="ghost-link" href="/api/backup" title={t("app.backup_hint")}>
          {t("app.backup")}
        </a>
      </header>
      <main className="container">{children}</main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ThemesGate>
          <RotaAgaci layout={(c) => <Layout>{c}</Layout>} />
        </ThemesGate>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
