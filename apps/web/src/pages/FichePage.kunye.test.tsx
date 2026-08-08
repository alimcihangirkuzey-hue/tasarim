// @vitest-environment jsdom
/* BASILI KÜNYE ↔ BASKI HAZIRLIK EL SIKIŞMASI (K-1/C).

   İKİ AYRI ŞEY ÖLÇÜLÜR ve ikisi de şarttır:
   1. Altbilgi künyesi KURULUMDAN gelir (elle gömülü dize değil) — modül bir
      ozalitçiye kiralandığında fişte kiracının adı çıksın diye.
   2. Künye `__PRINT_READY__` KAPISININ İÇİNDEDİR. Bu ikincisi paketin asıl
      inceliğidir: bu sayfalar başsız tarayıcıyla `window.__PRINT_READY__`
      beklenerek PDF'e çevrilir. Künye o bayrağın dışında kalsaydı yakalama
      künye gelmeden tetiklenir ve PDF'te altbilgi BOŞ çıkardı — sessiz, ancak
      basılmış kâğıtta görülen bir kayıp.

   FichePage seçildi çünkü tek belge + tek müşteri ile ayağa kalkar; PresentPage
   aynı kapıyı aynı desenle kurar (proje + N belge + export kuyruğu ister,
   ölçüsü bu iddiaya bir şey katmaz). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { FichePage } from "./FichePage";

vi.mock("../api", () => ({
  api: {
    document: vi.fn(),
    client: vi.fn(),
    kurulumKunyesi: vi.fn(),
  },
}));

function musteri(): ClientDTO {
  return {
    id: "cli_test",
    name: "Test Müşteri",
    slug: "test-musteri",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({ categories: [] }),
    assets: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function belge(): DocumentDTO {
  return {
    ...DocumentStateSchema.parse({ template_id: "garment" }),
    id: "doc_1",
    project_id: "proj_1",
    client_id: "cli_test",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
}

function kur() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/fiche/doc_1?date=2026-08-06"]}>
        <Routes>
          <Route path="/fiche/:id" element={<FichePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.document).mockResolvedValue(belge());
  vi.mocked(api.client).mockResolvedValue(musteri());
  window.__PRINT_READY__ = false;
  /* jsdom'da `document.fonts` YOKTUR; sayfa baskı el sıkışmasını
     `document.fonts.ready` üzerinden kurar. Stub olmadan effect fırlatır ve
     React ağacı sökülür — test o zaman künyeyi değil eksik stub'ı ölçerdi. */
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("nakışçı fişi künyesi", () => {
  it("KİRACI KÜNYESİ basılır — dize elle gömülü DEĞİL", async () => {
    vi.mocked(api.kurulumKunyesi).mockResolvedValue({
      kunye: "Kuzey Ozalit — Reklam",
      kaynak: "yapilandirma",
    });
    kur();
    await screen.findByText(/Kuzey Ozalit — Reklam/);
    /* Sabit ek (nakışçı şerhi) künyeden BAĞIMSIZ durur — künye kiracıya ait,
       şerh ürünün kendi bilgisidir; ikisi karışırsa kiracı şerhi de silebilir. */
    expect(screen.getByText(/fichier DST\/PES/)).toBeTruthy();
  });

  it("KÜNYE GELMEDEN sayfa ÇİZİLMEZ ve __PRINT_READY__ KURULMAZ", async () => {
    /* Asıl kapı: künye asılı kalırsa yakalama tetiklenmemelidir. */
    let kunyeyiVer: (v: { kunye: string; kaynak: "varsayilan" | "yapilandirma" }) => void = () => {};
    vi.mocked(api.kurulumKunyesi).mockReturnValue(
      new Promise((res) => {
        kunyeyiVer = res;
      }),
    );
    kur();

    /* Belge ve müşteri GELDİ (ön-koşul: bekleyen tek şey künye). */
    await waitFor(() => expect(api.client).toHaveBeenCalled());
    expect(screen.queryByText(/fichier DST\/PES/)).toBeNull();
    expect(window.__PRINT_READY__).toBeFalsy();

    kunyeyiVer({ kunye: "Kuzey Ozalit — Reklam", kaynak: "yapilandirma" });
    await screen.findByText(/Kuzey Ozalit — Reklam/);
    await waitFor(() => expect(window.__PRINT_READY__).toBe(true));
  });
});
