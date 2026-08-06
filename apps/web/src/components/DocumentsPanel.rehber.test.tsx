// @vitest-environment jsdom
/* BELGE AÇMA EKRANI × KURULUM İŞ KOLLARI (K-1/C).

   Süzme kuralı lib/gorunurRehber.test.ts'te ölçülür. Bu dosya EKRANIN
   davranışını ölçer ve asıl iddiası ikincisidir:

   1. Daraltılmış kurulumda rehber, yapılamayan işleri ÖNERMEZ.
   2. Hiç seçenek kalmayan kurulumda BOŞ IZGARA çizilmez — ekran "doğrudan
      seç"e düşer. Boş ızgara operatöre "burada yapacak bir şey yok" derdi;
      oysa yapılacak iş var, yalnız rehberin küratörlü listesinde yok. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogSchema, defaultBrandKit, type ClientDTO } from "@tezgah/shared";
import { SEKTORLER } from "@tezgah/templates/identity";
import { api } from "../api";
import { DocumentsPanel } from "./DocumentsPanel";

vi.mock("../api", () => ({
  api: {
    documents: vi.fn(),
    isKollari: vi.fn(),
    digitalMenuHistory: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    digitalMenu: vi.fn(),
    cloneDocument: vi.fn(),
  },
}));

function musteri(): ClientDTO {
  return {
    id: "cli_test",
    name: "Kuzey Ozalit",
    slug: "kuzey-ozalit",
    notes: "",
    currency: "EUR",
    menu_language: "tr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({ categories: [] }),
    assets: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function kur(kollar: { aktif: readonly string[]; kaynak: "varsayilan" | "yapilandirma" }) {
  vi.mocked(api.documents).mockResolvedValue([]);
  vi.mocked(api.digitalMenuHistory).mockResolvedValue([]);
  vi.mocked(api.isKollari).mockResolvedValue({
    aktif: kollar.aktif,
    tumu: SEKTORLER,
    kaynak: kollar.kaynak,
  } as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DocumentsPanel client={musteri()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("belge açma ekranı × iş kolları", () => {
  it("YAPILANDIRMA YOKKEN rehber açılır ve menü seçenekleri görünür", async () => {
    kur({ aktif: SEKTORLER, kaynak: "varsayilan" });
    await waitFor(() => expect(api.isKollari).toHaveBeenCalled());
    /* Bugünkü davranış birebir: rehber ilk ekran, beş seçenek orada. */
    expect(await screen.findByText("Fotoğraflı kart menü")).toBeTruthy();
    expect(screen.getByText("Sadakat kartı")).toBeTruthy();
  });

  it("MATBAA kurulumunda MENÜ seçenekleri düşer, matbaa işleri kalır", async () => {
    kur({ aktif: ["matbaa"], kaynak: "yapilandirma" });
    expect(await screen.findByText("Sadakat kartı")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Fotoğraflı kart menü")).toBeNull());
  });

  it("TABELACI kurulumunda BOŞ REHBER çizilmez — doğrudan seç açılır", async () => {
    /* Paketin asıl kapısı. Beş seçeneğin hepsi düşer; boş ızgara yerine
       (zaten daraltılmış) şablon listesi gösterilir. */
    kur({ aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await waitFor(() => expect(api.isKollari).toHaveBeenCalled());

    await waitFor(() => expect(screen.queryByText("Sadakat kartı")).toBeNull());
    /* Doğrudan seç modunun işareti: şablon seçici + "Yeni belge" düğmesi. */
    expect(screen.getByRole("combobox")).toBeTruthy();
    /* Ve boş rehbere geri dönmeyi öneren düğme GÖSTERİLMEZ. */
    expect(screen.queryByText("← Rehbere dön")).toBeNull();
  });
});
