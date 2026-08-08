// @vitest-environment jsdom
/* PROJE KAPATMA (K-1/B) testleri.

   ÖLÇÜLEN YARA: sunucu `PUT /api/projects/:id` gövdesinde `status` KABUL
   ediyordu (ProjectUpdateSchema) ve yaklaşan-işler sorgusu ona BAĞLIYDI
   (`status != PROJE_KAPALI`), ama 'done' değerini repoda hiçbir yer
   YAZMIYORDU (grep: sıfır). Yani yetenek vardı, kapısı yoktu: vadeli her
   proje işi bitse de operatörün şeridinde sonsuza dek duruyordu.

   İKİ AYRI ŞEY ÖLÇÜLÜR ve İKİSİ DE ŞART:
   1. Yazma — düğme gerçekten PROJE_KAPALI yazıyor mu (yoksa sunucu sorgusu
      hiç etkilenmez).
   2. Tazeleme — ["upcoming"] geçersiz kılınıyor mu. Bu ikincisi olmadan
      kapatma SUNUCUDA olur ama ekranda OLMAZ: operatör projeyi kapatır,
      şeritte durmaya devam ettiğini görür ve düğmenin bozuk olduğunu
      sanar. Sessiz yarı-çalışan hâl, hiç çalışmamaktan daha kötüdür. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  PROJE_ACIK,
  PROJE_KAPALI,
  defaultBrandKit,
  type ClientDTO,
  type ProjectDTO,
} from "@tezgah/shared";
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

function kur(durum: string) {
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.projectExports).mockResolvedValue([]);
  vi.mocked(api.cmykStatus).mockResolvedValue({ available: false, version: null });
  vi.mocked(api.clientProjects).mockResolvedValue([
    {
      id: "proj_1",
      client_id: "cli_test",
      name: "Açılış Paketi",
      status: durum,
      due_date: "2026-09-01",
      source_text: null,
      items: [],
      created_at: "2026-01-02T00:00:00Z",
    } as ProjectDTO,
  ]);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const gecersizKil = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsPanel client={musteri()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { gecersizKil };
}

type Cagri = { queryKey?: unknown } | undefined;

/** Bir anahtarın geçersiz kılınıp kılınmadığını çağrı listesinden okur. */
function tazelendiMi(cagrilar: readonly unknown[][], anahtar: string): boolean {
  return cagrilar.some((c) => {
    const k = (c[0] as Cagri)?.queryKey;
    return Array.isArray(k) && k[0] === anahtar;
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("proje kapatma", () => {
  it("SABİT ÖN-KOŞULU: kapalı ve açık durum BİRBİRİNDEN FARKLI", () => {
    /* İkisi eşit olsaydı aşağıdaki "kapat sonra aç" testleri aynı değeri
       iki kez ölçer ve hiçbir şey ayırt etmeden yeşil kalırdı. */
    expect(PROJE_KAPALI).not.toBe(PROJE_ACIK);
  });

  it("AÇIK projede kapatma düğmesi var, 'kapandı' rozeti YOK", async () => {
    kur(PROJE_ACIK);
    await screen.findByText("Açılış Paketi");
    expect(screen.getByText("✓ İşi kapat")).toBeTruthy();
    expect(screen.queryByText("kapandı")).toBeNull();
    expect(screen.queryByText("↺ Yeniden aç")).toBeNull();
  });

  it("KAPAT tıklanınca sunucuya PROJE_KAPALI yazılır", async () => {
    vi.mocked(api.updateProject).mockResolvedValue({} as never);
    kur(PROJE_ACIK);
    fireEvent.click(await screen.findByText("✓ İşi kapat"));
    await waitFor(() =>
      expect(api.updateProject).toHaveBeenCalledWith("proj_1", { status: PROJE_KAPALI }),
    );
  });

  it("KAPATMA SONRASI yaklaşan işler şeridi TAZELENİR", async () => {
    /* Şerit ["upcoming"] anahtarıyla çekilir (ClientListPage). Geçersiz
       kılınmazsa kapatılan proje ekranda asılı kalır. */
    vi.mocked(api.updateProject).mockResolvedValue({} as never);
    const { gecersizKil } = kur(PROJE_ACIK);
    fireEvent.click(await screen.findByText("✓ İşi kapat"));
    await waitFor(() => expect(tazelendiMi(gecersizKil.mock.calls, "upcoming")).toBe(true));
    /* Proje listesi de tazelenmeli — rozet/düğme yoksa hâli değişmez. */
    expect(tazelendiMi(gecersizKil.mock.calls, "projects")).toBe(true);
  });

  it("KAPALI projede rozet çıkar ve düğme YENİDEN AÇ'a döner", async () => {
    vi.mocked(api.updateProject).mockResolvedValue({} as never);
    kur(PROJE_KAPALI);
    await screen.findByText("Açılış Paketi");
    expect(screen.getByText("kapandı")).toBeTruthy();
    expect(screen.queryByText("✓ İşi kapat")).toBeNull();

    fireEvent.click(screen.getByText("↺ Yeniden aç"));
    await waitFor(() =>
      expect(api.updateProject).toHaveBeenCalledWith("proj_1", { status: PROJE_ACIK }),
    );
  });
});
