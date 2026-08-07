// @vitest-environment jsdom
/* TOPLU CMYK (K-1/B — çoklu proje hızı) testleri.

   ÖLÇÜLEN BOŞLUK: matbaanın ASIL üretim formatı CMYK'dir ama bugüne dek yalnız
   EDİTÖRDE, BELGE BAŞINA alınabiliyordu (EditorPage.doCmyk). 4 kalemlik bir
   işte operatör toplu üretimden sonra dört belgeyi tek tek açıp CMYK düğmesine
   basmak zorundaydı — B'nin tam da kapatmak istediği tür bir darboğaz.

   İKİ KISIT SUNUCUDAN OKUNDU, VARSAYILMADI:
   1. Ghostscript şart (cmyk.ts:44 → yoksa 503) → düğme yalnız available iken.
   2. Kaynak, belgenin SON `print` çıktısıdır (cmyk.ts:53-59 → yoksa 400
      no_print_export). Tekstil/kesim yoluna giden belgede print HİÇ doğmaz;
      o belge HATA değil ATLANAN'dır. Hata saymak, operatöre var olmayan bir
      sorun bildirmek olurdu. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentDTO,
  type OrderItemDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { TEMPLATES, exportRouteOf } from "@tezgah/templates";
import { api } from "../api";
import { ProjectsPanel } from "./ProjectsPanel";

vi.mock("../api", () => ({
  api: {
    clients: vi.fn(),
    clientProjects: vi.fn(),
    projectExports: vi.fn(),
    cmykStatus: vi.fn(),
    exportCmyk: vi.fn(),
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

function belge(id: string, template_id: string): DocumentDTO {
  return {
    ...DocumentStateSchema.parse({ template_id }),
    id,
    project_id: "proj_1",
    client_id: "cli_test",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
}

/* Düğme artık KAPSAM SAYISINI taşıyor ("🎨 {n} belgenin CMYK'sini üret"),
   yani düz metin eşleşmesi kırılgan olurdu. Düğme rolüyle aranır. */
const cmykDugmesi = () => screen.findByRole("button", { name: /CMYK/i });

/* YOKLUK İDDİASI SINIRLI BEKLEMEYLE KURULUR — ve bunun gerekçesi ÖLÇÜLDÜ.
   Önce `queryAllByRole` ile anlık bakılıyordu; bir negatif kontrol (kapsam
   yerine eski "belgeli kalem sayısı" koşuluna dönmek) testi KIRMIZIYA
   DÖNDÜRMEDİ. Sebep yarıştı: `cmykStatus` AYRI bir sorgudur ve proje adı
   göründüğü anda henüz çözülmemiş olabilir — yani düğme "hiç çizilmiyor"
   değil "HENÜZ çizilmemiş" oluyordu ve iddia bedava yeşil kalıyordu.
   `findByRole` reddi, testing-library'nin varsayılan penceresi boyunca
   (1 sn — sahte sorguların çözülmesinden kat kat uzun) BEKLER. */
const cmykDugmesiCizilmedi = async (): Promise<void> => {
  await expect(screen.findByRole("button", { name: /CMYK/i })).rejects.toThrow();
};

function kalem(id: string, document_id: string | null): OrderItemDTO {
  return {
    id,
    project_id: "proj_1",
    product_type: "flyer",
    qty: 1,
    width_cm: null,
    height_cm: null,
    details: { format: "a4" },
    notes: "",
    status: "tasarimda",
    document_id,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  } as OrderItemDTO;
}

function kur(items: OrderItemDTO[], gsVar: boolean) {
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.projectExports).mockResolvedValue([]);
  vi.mocked(api.cmykStatus).mockResolvedValue({ available: gsVar, version: gsVar ? "10.0" : null });
  vi.mocked(api.clientProjects).mockResolvedValue([
    {
      id: "proj_1",
      client_id: "cli_test",
      name: "Açılış Paketi",
      status: "open",
      due_date: null,
      source_text: null,
      items,
      created_at: "2026-01-02T00:00:00Z",
    } as ProjectDTO,
  ]);
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

describe("toplu CMYK", () => {
  it("FİKSTÜR ÖN-KOŞULU: flyer pdf yoluna, garment DEĞİL", () => {
    /* Aşağıdaki "atlanan" testi bu ayrıma dayanır; ilan değişirse burası
       kırılır ve test sessizce anlamsızlaşmaz. */
    const pdf = TEMPLATES["flyer"]!;
    const tekstil = TEMPLATES["garment"]!;
    expect(exportRouteOf(pdf.manifest.production_channels, undefined)).toBe("pdf");
    expect(exportRouteOf(tekstil.manifest.production_channels, undefined)).not.toBe("pdf");
  });

  it("GHOSTSCRIPT YOKSA düğme HİÇ ÇİZİLMEZ (her tık 503'e giderdi)", async () => {
    kur([kalem("a", "doc_1")], false);
    await screen.findByText("Açılış Paketi");
    await cmykDugmesiCizilmedi();
  });

  it("BELGESİZ projede düğme çizilmez", async () => {
    kur([kalem("a", null)], true);
    await screen.findByText("Açılış Paketi");
    await cmykDugmesiCizilmedi();
  });

  it("BASKI YOLUNDAKİ belgeler için CMYK üretilir", async () => {
    vi.mocked(api.document).mockResolvedValue(belge("doc_1", "flyer"));
    vi.mocked(api.exportCmyk).mockResolvedValue({ version: 1 } as never);

    kur([kalem("a", "doc_1")], true);
    fireEvent.click(await cmykDugmesi());

    await waitFor(() => expect(api.exportCmyk).toHaveBeenCalledWith("doc_1"));
    await screen.findByText(/1 CMYK üretildi/i);
  });

  it("TEKSTİL BELGESİ ATLANIR — hata SAYILMAZ (print çıktısı hiç doğmaz)", async () => {
    /* Asıl incelik bu: no_print_export 400'ü bir arıza değil, kanal ilanının
       doğal sonucudur. Hata saysaydık operatöre olmayan bir sorun bildirirdik. */
    vi.mocked(api.document).mockResolvedValue(belge("doc_tekstil", "garment"));

    kur([kalem("a", "doc_tekstil")], true);
    fireEvent.click(await cmykDugmesi());

    await screen.findByText(/0 CMYK üretildi · 1 atlandı/i);
    expect(api.exportCmyk).not.toHaveBeenCalled();
  });

  it("DÜŞEN BELGE turu DURDURMAZ ve düşen olarak SAYILIR", async () => {
    vi.mocked(api.document)
      .mockResolvedValueOnce(belge("doc_kotu", "flyer"))
      .mockResolvedValueOnce(belge("doc_iyi", "flyer"));
    vi.mocked(api.exportCmyk)
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce({ version: 1 } as never);

    kur([kalem("a", "doc_kotu"), kalem("b", "doc_iyi")], true);
    fireEvent.click(await cmykDugmesi());

    await waitFor(() => expect(api.exportCmyk).toHaveBeenCalledTimes(2));
    await screen.findByText(/1 CMYK üretildi · 0 atlandı .* · 1 düştü/i);
  });

  it("TEKSTİL KALEMLERİNDE düğme HİÇ ÇİZİLMEZ — yaranın kendisi", async () => {
    /* ÖLÇÜLEN YARA: eski koşul "belgeli kalem var mı"ydı; `tisort`/`onluk`
       kanal ilanı `garment` olduğu için tur hiçbir şey üretemezdi ama düğme
       çiziliyordu — operatör basıyor, N belge tek tek çekiliyor, sonuç
       "0 üretildi · N atlandı" ve panel listesi BOŞ (`yol-yok` listelenmez).
       Artık kapsam İLANDAN türüyor ve 0 ise düğme yok.

       ÜSTTEKİ "TEKSTİL BELGESİ ATLANIR" TESTİYLE KARIŞTIRILMAMALI: orada kalem
       `flyer` (kapsam İÇİ) ama BELGESİ garment — yani kapsam bir İLANDIR,
       turun çalışma-zamanı denetiminin yerine geçmez ve geçemez. */
    kur([{ ...kalem("a", "doc_1"), product_type: "tisort" } as OrderItemDTO], true);
    await screen.findByText("Açılış Paketi");
    await cmykDugmesiCizilmedi();
  });

  it("KAPSAM SAYISI düğmede GÖRÜNÜR — kaç tık kazanıldığı basılmadan bilinsin", async () => {
    kur([kalem("a", "doc_1"), kalem("b", "doc_2"), kalem("c", null)], true);
    const d = await cmykDugmesi();
    /* Belgesiz kalem sayılmaz: 3 kalem, kapsam 2. */
    expect(d.textContent).toContain("2");
  });
});
