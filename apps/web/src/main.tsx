import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { registerCustomThemes } from "@tezgah/templates";
import { ClientListPage } from "./pages/ClientListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { EditorPage } from "./pages/EditorPage";
import { FichePage } from "./pages/FichePage";
import { MockupPage } from "./pages/MockupPage";
import { PresentPage } from "./pages/PresentPage";
import { PrintPage } from "./pages/PrintPage";
import { ThemesPage } from "./pages/ThemesPage";
import { FontsPage } from "./pages/FontsPage";
import { ParseDictPage } from "./pages/ParseDictPage";
import { FactoryPage } from "./pages/FactoryPage";
import { FactoryGuidePage } from "./pages/FactoryGuidePage";
import { SiparisPage } from "./pages/SiparisPage";
import { api } from "./api";
import { t } from "./i18n";
import "./styles.css";
import "@tezgah/templates/fonts/fonts.css";

/* FAZ5 §7: yüklenen fontların @font-face'i — web VE print aynı /fonts/ kaynağını
   kullanır (M3). font-display:block → PDF'te fallback kareleri basılmaz (ADR-3). */
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
    </>
  );
}

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

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
          <Routes>
            {/* Print/present rotaları Layout DIŞINDA: üst bar PDF'e basılmaz (M3/§9.1) */}
            <Route path="/print/:id" element={<PrintPage />} />
            <Route path="/present/:id" element={<PresentPage />} />
            <Route path="/mockup/:id" element={<MockupPage />} />
            <Route path="/fiche/:id" element={<FichePage />} />
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<ClientListPage />} />
                    <Route path="/siparis" element={<SiparisPage />} />
                    <Route path="/clients/:id" element={<ClientDetailPage />} />
                    <Route path="/editor/:id" element={<EditorPage />} />
                    <Route path="/settings/themes" element={<ThemesPage />} />
                    <Route path="/settings/fonts" element={<FontsPage />} />
                    <Route path="/settings/parse" element={<ParseDictPage />} />
                    <Route path="/settings/factory" element={<FactoryPage />} />
                    <Route path="/settings/factory-guide" element={<FactoryGuidePage />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </ThemesGate>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
