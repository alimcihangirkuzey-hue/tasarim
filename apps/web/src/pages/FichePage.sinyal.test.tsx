// @vitest-environment jsdom
/* SAYFA DÜŞÜNCE YAKALAYANA KONUŞUR (K-1/B).

   ÖLÇÜLEN YARA: dört baskı yüzeyi de `window.__PRINT_READY__` beklenerek
   yakalanır. Sayfa hazır olamazsa (belge 404 · müşteri 500 · künye ucu düştü)
   bayrak HİÇ atanmıyor ve yakalama 30-45 SANİYE bekleyip zaman aşımına
   düşüyordu; çağırana `{error:"internal"}` gidiyordu — ne gerekçe ne hız.
   Toplu üretimde bu, düşen kalem başına 45 saniye ölü beklemedir.

   FichePage seçildi çünkü üç sorgusu da tek belge/müşteri ile ayağa kalkar;
   diğer üç sayfa aynı sinyali aynı desenle kurar ve sunucu tarafı zaten
   ortak bekleyiciyle nöbetçiye bağlandı (baski-bekle.test.ts). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
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
  api: { document: vi.fn(), client: vi.fn(), kurulumKunyesi: vi.fn() },
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
  window.__PRINT_READY__ = false;
  window.__PRINT_ERROR__ = undefined;
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("baskı sayfası hata sinyali", () => {
  it("SAĞLIKLI yolda hata sinyali YAZILMAZ (ön-koşul)", async () => {
    /* Bu satır olmadan aşağıdaki testler, her koşulda sinyal yazan bozuk bir
       kodla da yeşil kalırdı. */
    vi.mocked(api.document).mockResolvedValue(belge());
    vi.mocked(api.client).mockResolvedValue(musteri());
    vi.mocked(api.kurulumKunyesi).mockResolvedValue({ kunye: "X", kaynak: "varsayilan" });
    kur();
    await waitFor(() => expect(window.__PRINT_READY__).toBe(true));
    expect(window.__PRINT_ERROR__).toBeUndefined();
  });

  it("BELGE DÜŞERSE gerekçe sinyale yazılır ve HAZIR kurulmaz", async () => {
    vi.mocked(api.document).mockRejectedValue(new Error("Sunucu hatası (404)"));
    vi.mocked(api.client).mockResolvedValue(musteri());
    vi.mocked(api.kurulumKunyesi).mockResolvedValue({ kunye: "X", kaynak: "varsayilan" });
    kur();
    await waitFor(() => expect(window.__PRINT_ERROR__).toBe("Sunucu hatası (404)"));
    expect(window.__PRINT_READY__).toBe(false);
  });

  it("KÜNYE UCU DÜŞERSE de sinyal yazılır (yeni sorgu sessiz bırakılmadı)", async () => {
    /* Künye sorgusu bu sayfaya bu hafta eklendi; `ready`'ye dahil edilmişti
       ama düşerse sayfayı SESSİZCE asıyordu. */
    vi.mocked(api.document).mockResolvedValue(belge());
    vi.mocked(api.client).mockResolvedValue(musteri());
    vi.mocked(api.kurulumKunyesi).mockRejectedValue(new Error("Sunucu hatası (500)"));
    kur();
    await waitFor(() => expect(window.__PRINT_ERROR__).toBe("Sunucu hatası (500)"));
    expect(window.__PRINT_READY__).toBe(false);
  });

  it("MESAJSIZ hatada bile sinyal yazılır (sayfa asla SESSİZ kalmaz)", async () => {
    vi.mocked(api.document).mockRejectedValue(new Error(""));
    vi.mocked(api.client).mockResolvedValue(musteri());
    vi.mocked(api.kurulumKunyesi).mockResolvedValue({ kunye: "X", kaynak: "varsayilan" });
    kur();
    await waitFor(() => expect(window.__PRINT_ERROR__).toBe("sayfa verisi yüklenemedi"));
  });
});
