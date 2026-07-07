import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClientListPage } from "./pages/ClientListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { t } from "./i18n";
import "./styles.css";

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
        <Layout>
          <Routes>
            <Route path="/" element={<ClientListPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
