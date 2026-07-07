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
import { ParseDictPage } from "./pages/ParseDictPage";
import { api } from "./api";
import { t } from "./i18n";
import "./styles.css";
import "@tezgah/templates/fonts/fonts.css";

/* FAZ4 §7: özel temalar İLK boyamadan önce kayıt defterine girer — print
   rotaları dahil (M3: web ve PDF aynı çözümleme yolunu kullanır) */
function ThemesGate({ children }: { children: React.ReactNode }) {
  const q = useQuery({ queryKey: ["themes"], queryFn: api.themes, staleTime: Infinity, retry: 1 });
  useMemo(() => {
    if (q.data) registerCustomThemes(q.data);
  }, [q.data]);
  if (q.isPending) return null;
  return <>{children}</>;
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
                    <Route path="/clients/:id" element={<ClientDetailPage />} />
                    <Route path="/editor/:id" element={<EditorPage />} />
                    <Route path="/settings/themes" element={<ThemesPage />} />
                    <Route path="/settings/parse" element={<ParseDictPage />} />
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
