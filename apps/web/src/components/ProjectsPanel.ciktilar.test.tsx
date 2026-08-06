// @vitest-environment jsdom
/* ÜRETİLMİŞ DOSYALAR LİSTESİ (K-1/B) testleri.

   ÖLÇÜLEN BOŞLUK: `GET /api/projects/:id/exports` sunucuda VARDI ve
   `api.projectExports` istemcide VARDI — ama hiçbir ekran çağırmıyordu
   (TÜKETİCİ SIFIR, bu turda grep'le sayıldı). Toplu üretim eklendikten sonra
   boşluk somutlaştı: operatör tek tıkla N dosya üretiyor, sonra onları
   görecek proje düzeyinde bir yer yok.

   Bu dosya ARAYÜZ sözleşmesini ölçer; ucun kendi bağ türetmesi sunucu
   testindedir (apps/server proje-ciktilari.test.ts) — iki katman ayrı. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type ExportRecordDTO,
  type OrderItemDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { ProjectsPanel } from "./ProjectsPanel";

vi.mock("../api", () => ({
  api: {
    clients: vi.fn(),
    clientProjects: vi.fn(),
    projectExports: vi.fn(),
    document: vi.fn(),
    exportDocument: vi.fn(),
    exportSvg: vi.fn(),
    exportGarment: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateOrderItem: vi.fn(),
    parseSynonyms: vi.fn(),
    createClient: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addOrderItem: vi.fn(),
    deleteOrderItem: vi.fn(),
    presentProject: vi.fn(),
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

function proje(items: OrderItemDTO[] = []): ProjectDTO {
  return {
    id: "proj_1",
    client_id: "cli_test",
    name: "Açılış Paketi",
    status: "open",
    due_date: null,
    source_text: null,
    items,
    created_at: "2026-01-02T00:00:00Z",
  };
}

function cikti(p: Partial<ExportRecordDTO> & { id: string; kind: ExportRecordDTO["kind"] }): ExportRecordDTO {
  return {
    document_id: "doc_1",
    project_id: null,
    client_id: null,
    filepath: `data/exports/${p.id}.pdf`,
    version: 1,
    created_at: "2026-01-03T00:00:00Z",
    ...p,
  } as ExportRecordDTO;
}

function kur(ciktilar: ExportRecordDTO[]) {
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.clientProjects).mockResolvedValue([proje()]);
  vi.mocked(api.projectExports).mockResolvedValue(ciktilar);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsPanel client={musteri()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("üretilmiş dosyalar listesi", () => {
  it("ÇIKTI YOKSA bölüm HİÇ ÇİZİLMEZ", async () => {
    kur([]);
    await screen.findByText("Açılış Paketi");
    /* Boş bir "Üretilen dosyalar (0)" başlığı, üretim olmuş da dosyalar
       kaybolmuş izlenimi verirdi. */
    expect(screen.queryByText(/Üretilen dosyalar/i)).toBeNull();
  });

  it("UÇ GERÇEKTEN ÇAĞRILIR — proje kimliğiyle (ölü fonksiyona tüketici doğdu)", async () => {
    kur([cikti({ id: "exp_1", kind: "print" })]);
    await screen.findByText(/Üretilen dosyalar/i);
    expect(api.projectExports).toHaveBeenCalledWith("proj_1");
  });

  it("HER ÇIKTI AÇILABİLİR BAĞ olur ve data/ ön eki DÜŞER", async () => {
    kur([cikti({ id: "exp_1", kind: "print", version: 3, filepath: "data/exports/2026/menu.pdf" })]);
    const bag = await screen.findByRole("link", { name: /Baskı v3/i });
    /* Sunucu dosyaları /exports altından servis eder; kayıt yolu "data/" ile
       başlar (present mutation'ının aynı dönüşümü yaptığı yer). */
    expect(bag.getAttribute("href")).toBe("/exports/2026/menu.pdf");
    expect(bag.getAttribute("target")).toBe("_blank");
  });

  it("SUNUM ve BELGE çıktısı AYNI listede — ikisi de 'bu projeden çıkan dosya'", async () => {
    kur([
      cikti({ id: "exp_1", kind: "print", version: 1 }),
      cikti({ id: "exp_2", kind: "presentation", version: 2, document_id: null, project_id: "proj_1" }),
      cikti({ id: "exp_3", kind: "print_cmyk", version: 1 }),
    ]);
    await screen.findByText(/Üretilen dosyalar \(3\)/i);
    /* Etiketler kapalı `kind` kümesinden okunur; ham enum adı sızmamalı
       (operatör "print_cmyk" değil "CMYK" görür). */
    expect(await screen.findByRole("link", { name: /Baskı v1/i })).toBeTruthy();
    expect(await screen.findByRole("link", { name: /Sunum v2/i })).toBeTruthy();
    expect(await screen.findByRole("link", { name: /CMYK v1/i })).toBeTruthy();
    expect(screen.queryByText(/print_cmyk/)).toBeNull();
  });
});
