// @vitest-environment jsdom
/* DİJİTAL MENÜ GEÇMİŞİ testleri (borç: "api.digitalMenuHistory ölü istemci
   fonksiyonu" — önizleme paketi şerh listesi, 2026-07-26).

   ÖLÇÜLEN YARA — CANLI: uç `/api/clients/:id/menu-digital/history` sunucuda
   vardı, `api.digitalMenuHistory` istemcide vardı, TÜKETİCİ SIFIRDI (bu turda
   grep'le sayıldı). Ekran yalnız O OTURUMDA üretilen menünün linkini React
   state'inde tutuyordu; operatör sayfayı yenilediğinde ya da sekme değiştirip
   döndüğünde ürettiği dosyaya ULAŞAMIYORDU. Dosya diskte duruyor, yolu
   kayboluyordu.

   TEK KAYNAK KARARI: geçici `digitalUrl` state'i kaldırıldı — üretilen menü de
   dahil her sürüm aynı listeden okunur. İki kaynak bırakmak aynı dosyayı iki
   yerde göstermek olurdu. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type ExportRecordDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { DocumentsPanel } from "./DocumentsPanel";

vi.mock("../api", () => ({
  api: {
    documents: vi.fn(),
    clients: vi.fn(),
    isKollari: vi.fn(),
    digitalMenu: vi.fn(),
    digitalMenuHistory: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
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

function kayit(version: number, filepath: string): ExportRecordDTO {
  return {
    id: `exp_${version}`,
    document_id: null,
    project_id: null,
    client_id: "cli_test",
    kind: "digital_menu",
    filepath,
    version,
    created_at: "2026-01-03T00:00:00Z",
  } as ExportRecordDTO;
}

function kur(gecmis: ExportRecordDTO[]) {
  vi.mocked(api.documents).mockResolvedValue([]);
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.isKollari).mockResolvedValue({ aktif: [], tumu: [], kaynak: "varsayilan" } as never);
  vi.mocked(api.digitalMenuHistory).mockResolvedValue(gecmis);
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

describe("dijital menü geçmişi", () => {
  it("SÜRÜM YOKSA bölüm çizilmez", async () => {
    kur([]);
    /* Kesin i18n metni — rehber kartları da "menü" içerdiği için gevşek
       regex birden fazla eşleşiyordu (ilk yazımda öyleydi). */
    await screen.findByText("Dijital menü (HTML)");
    expect(screen.queryByText(/Üretilmiş menüler/i)).toBeNull();
  });

  it("UÇ GERÇEKTEN ÇAĞRILIR — müşteri kimliğiyle (ölü fonksiyona tüketici doğdu)", async () => {
    kur([kayit(1, "data/exports/menu-v1.html")]);
    await screen.findByText(/Üretilmiş menüler/i);
    expect(api.digitalMenuHistory).toHaveBeenCalledWith("cli_test");
  });

  it("ÖNCEKİ SÜRÜMLER SAYFA YENİLENSE DE ULAŞILABİLİR — data/ ön eki düşer", async () => {
    /* Asıl kazanç bu: eskiden yalnız oturum state'indeki tek link vardı,
       yenilemede kayboluyordu. Artık geçmişin tamamı diskteki yollarıyla
       listelenir. */
    kur([kayit(2, "data/exports/2026/menu-v2.html"), kayit(1, "data/exports/2026/menu-v1.html")]);
    const v2 = await screen.findByRole("link", { name: /v2/i });
    expect(v2.getAttribute("href")).toBe("/exports/2026/menu-v2.html");
    expect(v2.getAttribute("target")).toBe("_blank");
    expect(await screen.findByRole("link", { name: /v1/i })).toBeTruthy();
    await screen.findByText(/Üretilmiş menüler \(2\)/i);
  });

  it("YENİ ÜRETİM SONRASI LİSTE TAZELENİR (üretim olmuş gibi görünüp kaybolmaz)", async () => {
    vi.mocked(api.digitalMenu).mockResolvedValue(kayit(1, "data/exports/menu-v1.html"));

    kur([]); // ilk okuma boş
    const btn = await screen.findByRole("button", { name: "Dijital menü üret" });
    /* Sonraki okumalar bir sürüm döndürsün. SIRA ÖNEMLİ: kur() mock'u kendi
       değeriyle kurar, bu yüzden override ondan SONRA gelmeli (ilk yazımda
       önce yazmıştım ve kur() onu eziyordu — test kırmızıydı). */
    vi.mocked(api.digitalMenuHistory).mockResolvedValue([kayit(1, "data/exports/menu-v1.html")]);
    fireEvent.click(btn);

    await waitFor(() => expect(api.digitalMenu).toHaveBeenCalledTimes(1));
    /* invalidate olmasaydı operatör az önce ürettiği dosyayı göremezdi. */
    await screen.findByText(/Üretilmiş menüler \(1\)/i);
  });
});
