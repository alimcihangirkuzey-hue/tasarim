// @vitest-environment jsdom
/* TÜR SEÇİCİSİ × KURULUM İŞ KOLLARI (K-1/C modül sınırı).

   ÖLÇÜLEN YARA: `is-kollari` katmanı 7.1/481'in "kullanıcı yalnızca yaptığı işi
   görür" hükmünü uyguluyordu ama YALNIZ şablon seçicisinde (DocumentsPanel,
   EditorPage). Sipariş kalemi TÜR seçicisi el yazımı bir listeydi ve hiçbir
   yapılandırmayı okumuyordu: tabelacıya daraltılmış bir kurulumda operatör hâlâ
   "Tişört · Önlük · Menü" görüyor ve ekleyebiliyordu.

   ASIL İNCELİK — SEÇİLİ DEĞERİN YARIŞI: varsayılan tür "menu"dür ve iş kolu
   yanıtı GELDİĞİNDE liste daralır. Seçili değeri düzeltmezseniz seçici boş
   görünür ama "Kalem ekle" hâlâ MENÜ kalemi ekler — sessiz ve yanlış. Bu dosya
   o davranışı ayrı ölçer; kaybı ancak yanlış kalem eklendikten sonra görürdünüz. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { SEKTORLER } from "@tezgah/templates/identity";
import { api } from "../api";
import { ProjectsPanel } from "./ProjectsPanel";

vi.mock("../api", () => ({
  api: {
    clients: vi.fn(),
    clientProjects: vi.fn(),
    projectExports: vi.fn(),
    cmykStatus: vi.fn(),
    isKollari: vi.fn(),
    addOrderItem: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    deleteOrderItem: vi.fn(),
    updateOrderItem: vi.fn(),
    parseSynonyms: vi.fn(),
    createClient: vi.fn(),
    createProject: vi.fn(),
    presentProject: vi.fn(),
    document: vi.fn(),
    exportCmyk: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    exportDocument: vi.fn(),
    exportSvg: vi.fn(),
    exportGarment: vi.fn(),
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

/** Tür seçicisi = "Kalem ekle" düğmesinin yanındaki select (tek kalemsiz proje). */
function turSecici(): HTMLSelectElement {
  const secililer = screen.getAllByRole("combobox") as HTMLSelectElement[];
  const s = secililer.find((el) => [...el.options].some((o) => o.value === "diger"));
  if (!s) throw new Error("tür seçicisi bulunamadı");
  return s;
}

function kur(kollar: { aktif: readonly string[]; kaynak: "varsayilan" | "yapilandirma" }) {
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.projectExports).mockResolvedValue([]);
  vi.mocked(api.cmykStatus).mockResolvedValue({ available: false, version: null });
  vi.mocked(api.isKollari).mockResolvedValue({
    aktif: kollar.aktif,
    tumu: SEKTORLER,
    kaynak: kollar.kaynak,
  } as never);
  vi.mocked(api.clientProjects).mockResolvedValue([
    {
      id: "proj_1",
      client_id: "cli_test",
      name: "Açılış Paketi",
      status: "open",
      due_date: null,
      source_text: null,
      items: [],
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

describe("tür seçicisi × iş kolları", () => {
  it("YAPILANDIRMA YOKKEN tüm türler görünür (bugünkü davranış birebir)", async () => {
    kur({ aktif: SEKTORLER, kaynak: "varsayilan" });
    await screen.findByText("Açılış Paketi");
    await waitFor(() => expect(api.isKollari).toHaveBeenCalled());
    const degerler = [...turSecici().options].map((o) => o.value);
    expect(degerler).toContain("menu");
    expect(degerler).toContain("tisort");
    expect(degerler).toContain("tabela");
  });

  it("TABELACI kurulumunda menü/tişört SEÇENEKTEN DÜŞER", async () => {
    kur({ aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await screen.findByText("Açılış Paketi");
    await waitFor(() => expect([...turSecici().options].map((o) => o.value)).not.toContain("menu"));
    const degerler = [...turSecici().options].map((o) => o.value);
    expect(degerler).toContain("tabela");
    expect(degerler).not.toContain("tisort");
    expect(degerler).toContain("diger"); // kaçış kapısı
  });

  it("DARALTMA SONRASI 'Kalem ekle' GÖRÜNEN türü ekler, eski varsayılanı DEĞİL", async () => {
    /* Paketin asıl kapısı. Seçili değer düzeltilmezse seçici boş görünürken
       düğme hâlâ 'menu' gönderir; tabelacı kurulumunda bu, hiç yapılmayan bir
       işin kalemidir ve yanlışı ancak eklendikten sonra fark edersiniz. */
    vi.mocked(api.addOrderItem).mockResolvedValue({} as never);
    kur({ aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await screen.findByText("Açılış Paketi");
    await waitFor(() => expect([...turSecici().options].map((o) => o.value)).not.toContain("menu"));

    expect(turSecici().value).toBe("tabela"); // görünen değer boş değil
    fireEvent.click(screen.getByText("+ Kalem"));
    await waitFor(() =>
      expect(api.addOrderItem).toHaveBeenCalledWith("proj_1", { product_type: "tabela" }),
    );
  });

  it("OPERATÖRÜN SEÇİMİ korunur (türetme seçimi ezmez)", async () => {
    vi.mocked(api.addOrderItem).mockResolvedValue({} as never);
    kur({ aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await screen.findByText("Açılış Paketi");
    await waitFor(() => expect([...turSecici().options].map((o) => o.value)).not.toContain("menu"));

    fireEvent.change(turSecici(), { target: { value: "diger" } });
    fireEvent.click(screen.getByText("+ Kalem"));
    await waitFor(() =>
      expect(api.addOrderItem).toHaveBeenCalledWith("proj_1", { product_type: "diger" }),
    );
  });
});
