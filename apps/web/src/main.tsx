import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClientListPage } from "./pages/ClientListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { EditorPage } from "./pages/EditorPage";
import { PresentPage } from "./pages/PresentPage";
import { PrintPage } from "./pages/PrintPage";
import { t } from "./i18n";
import "./styles.css";
import "@tezgah/templates/fonts/fonts.css";

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
      </header>
      <main className="container">{children}</main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Print/present rotaları Layout DIŞINDA: üst bar PDF'e basılmaz (M3/§9.1) */}
          <Route path="/print/:id" element={<PrintPage />} />
          <Route path="/present/:id" element={<PresentPage />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<ClientListPage />} />
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                  <Route path="/editor/:id" element={<EditorPage />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
