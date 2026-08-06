// @vitest-environment jsdom
/* AÇILIŞ TAKIMI → BELGELER, TEK İŞLEMDE (K-1/A) testleri.

   ÖLÇÜLEN BOŞLUK: preset ucu ({project_id, items:sayı}) yalnız proje + KALEM
   üretiyordu; belgeler için operatör Projeler sekmesine geçip toplu düğmeye
   AYRICA basıyordu. K-1/A'nın sözü "N belge TEK İŞLEMDE"ydi.

   BU DOSYA ZİNCİRİ ÖLÇER: preset → kalemleri oku → her kalem için belge aç.
   Gövdenin kendi sözleşmeleri (soru tür başına bir kez, sıra, düşen kalem)
   lib/topluTasarim.test.ts'te; burada ZİNCİRİN KURULDUĞU ölçülür. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type OrderItemDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { ClientDetailPage } from "./ClientDetailPage";

vi.mock("../api", () => ({
  api: {
    client: vi.fn(),
    clients: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    createOpeningKit: vi.fn(),
    clientProjects: vi.fn(),
    projectExports: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateOrderItem: vi.fn(),
    documents: vi.fn(),
    isKollari: vi.fn(),
    scenes: vi.fn(),
    surfaces: vi.fn(),
    assets: vi.fn(),
    parseSynonyms: vi.fn(),
    createClient: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addOrderItem: vi.fn(),
    deleteOrderItem: vi.fn(),
    presentProject: vi.fn(),
    digitalMenu: vi.fn(),
    cloneDocument: vi.fn(),
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

function kalem(id: string, product_type: OrderItemDTO["product_type"]): OrderItemDTO {
  return {
    id,
    project_id: "prj_kit",
    product_type,
    qty: 1,
    width_cm: null,
    height_cm: null,
    details: { format: "a4" },
    notes: "",
    status: "olcu_bekliyor",
    document_id: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  } as OrderItemDTO;
}

/** Açılış Takımı'nın ürettiği proje — kalemler flyer+fidelite (ikisi de TEK
    şablon seçenekli, yani soru sorulmaz; soru davranışı lib testinde). */
function kitProjesi(items: OrderItemDTO[]): ProjectDTO {
  return {
    id: "prj_kit",
    client_id: "cli_test",
    name: "Açılış Takımı",
    status: "open",
    due_date: null,
    source_text: null,
    items,
    created_at: "2026-01-02T00:00:00Z",
  };
}

function kur() {
  vi.mocked(api.client).mockResolvedValue(musteri());
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.documents).mockResolvedValue([]);
  vi.mocked(api.projectExports).mockResolvedValue([]);
  vi.mocked(api.isKollari).mockResolvedValue({
    aktif: [],
    tumu: [],
    kaynak: "varsayilan",
  } as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/clients/cli_test"]}>
        <Routes>
          <Route path="/clients/:id" element={<ClientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Açılış Takımı — preset + belgeler tek işlemde", () => {
  it("TEK TIKLA preset koşar VE her kalem için belge açılır", async () => {
    vi.mocked(api.createOpeningKit).mockResolvedValue({ project_id: "prj_kit", items: 2 } as never);
    vi.mocked(api.clientProjects).mockResolvedValue([
      kitProjesi([kalem("it_1", "flyer"), kalem("it_2", "fidelite")]),
    ]);
    vi.mocked(api.createDocument).mockResolvedValue({ id: "doc_x" } as never);
    vi.mocked(api.updateDocument).mockResolvedValue({ id: "doc_x" } as never);
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    kur();
    fireEvent.click(await screen.findByText(/Açılış Takımı/i));

    /* ASIL İDDİA: preset'ten SONRA belgeler de açıldı. Eskiden bu çağrılar
       hiç gitmiyordu — operatör ikinci bir ekrana geçip ayrıca tıklıyordu. */
    await waitFor(() => expect(api.createDocument).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.updateOrderItem).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.updateOrderItem).mock.calls.map((c) => c[0])).toEqual(["it_1", "it_2"]);
    await screen.findByText(/2 belge açıldı/i);
  });

  it("PROJE OKUNAMAZSA kalemler DURUR — preset geri alınmaz, durum söylenir", async () => {
    /* Preset başarılı olduysa proje ve kalemler operatörün GERÇEK işidir;
       belge açılamadı diye silmek onları yok ederdi. */
    vi.mocked(api.createOpeningKit).mockResolvedValue({ project_id: "prj_kit", items: 2 } as never);
    vi.mocked(api.clientProjects).mockResolvedValue([]); // proje listede yok

    kur();
    fireEvent.click(await screen.findByText(/Açılış Takımı/i));

    await screen.findByText(/Kalemler oluşturuldu/i);
    expect(api.createDocument).not.toHaveBeenCalled();
    expect(api.deleteProject).not.toHaveBeenCalled();
  });

  it("PRESET DÜŞERSE belge açma HİÇ denenmez ve gerekçe görünür", async () => {
    vi.mocked(api.createOpeningKit).mockRejectedValue(new Error("500 sunucu"));

    kur();
    fireEvent.click(await screen.findByText(/Açılış Takımı/i));

    await screen.findByText(/500 sunucu/i);
    expect(api.createDocument).not.toHaveBeenCalled();
  });
});
