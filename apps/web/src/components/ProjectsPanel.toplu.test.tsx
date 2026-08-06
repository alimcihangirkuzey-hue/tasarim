// @vitest-environment jsdom
/* TOPLU TASARIMA BAŞLATMA (K-1/A) testleri.

   NEDEN BU PAKET: ürün sahibi kararı K-1 (docs/URUN_SAHIBI_KARARLARI.md,
   2026-08-06) birincil işi "tıklayarak bitir" diye tanımladı. Ölçüldü: Açılış
   Takımı preseti (`POST /api/clients/:id/presets/opening`) projeyi 4 kalemle
   kuruyor ama BELGE üretmiyor — operatör dört kaleme TEK TEK "Tasarıma başla"
   diyordu. Bu paket o dört tıkı bire indirir.

   NEDEN AYRI DOSYA: ProjectsPanel.test.tsx kapsamını "startDesign — YETİM BELGE
   TELAFİSİ zinciri", ProjectsPanel.yapistir.test.tsx ise "yapıştır önizlemesi"
   olarak ilan eder. Toplu başlatma ikisinin de parçası değildir.

   İKİ KATMAN AYRI ÖLÇÜLÜR:
   1. `topluPlan` — saf sınıflandırma, DOM'suz. Dört kovanın ayrık ve tüketici
      olduğu burada çivilenir (her kalem tam bir kovaya düşer).
   2. Düğme — gerçek bileşen render'ıyla: kaç çağrı gitti, hangi sırayla, tür
      başına kaç kez soruldu, düşen kalem turu durdurdu mu.

   SARMA GEREKÇESİ öteki iki dosyayla aynı: ProjectBlock export EDİLMİYOR,
   exported ProjectsPanel render edilir ve proje `api.clientProjects` mock'unun
   döndürdüğü fikstürden akar (üretimdeki gerçek veri yolu). */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentDTO,
  type OrderItemDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { siparisSablonlari } from "@tezgah/templates/identity";
import { api } from "../api";
import { ProjectsPanel, topluPlan } from "./ProjectsPanel";

vi.mock("../api", () => ({
  api: {
    clients: vi.fn(),
    clientProjects: vi.fn(),
    projectExports: vi.fn(),
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

/* ---------------- fikstürler ---------------- */

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

function kalem(p: Partial<OrderItemDTO> & { id: string }): OrderItemDTO {
  return {
    project_id: "proj_1",
    product_type: "flyer",
    qty: 1,
    width_cm: null,
    height_cm: null,
    details: { format: "a4" },
    notes: "",
    status: "olcu_bekliyor",
    document_id: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...p,
  };
}

function proje(items: OrderItemDTO[]): ProjectDTO {
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

const belge = (id: string): DocumentDTO => ({ id } as unknown as DocumentDTO);

function kur(items: OrderItemDTO[]) {
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.clientProjects).mockResolvedValue([proje(items)]);
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
  vi.restoreAllMocks();
});

/* ---------------- 1. katman: saf plan ---------------- */

describe("topluPlan — dört kova AYRIK ve TÜKETİCİ", () => {
  it("kalem tam bir kovaya düşer; toplam korunur", () => {
    /* Tür seçimleri İLANDAN doğrulanır, teste sabit yazılmaz. */
    expect(siparisSablonlari("flyer")).toHaveLength(1); // hazır kovası
    expect(siparisSablonlari("menu").length).toBeGreaterThanOrEqual(2); // seçimli
    expect(siparisSablonlari("diger")).toHaveLength(0); // tasarlanamaz

    const items = [
      kalem({ id: "a", product_type: "flyer" }),
      kalem({ id: "b", product_type: "menu" }),
      kalem({ id: "c", product_type: "diger" }),
      kalem({ id: "d", product_type: "flyer", document_id: "doc_var" }),
    ];
    const p = topluPlan(items);

    expect(p.hazir.map((i) => i.id)).toEqual(["a"]);
    expect(p.secimli.map((i) => i.id)).toEqual(["b"]);
    expect(p.tasarlanamaz.map((i) => i.id)).toEqual(["c"]);
    expect(p.zaten.map((i) => i.id)).toEqual(["d"]);

    const toplam = p.hazir.length + p.secimli.length + p.tasarlanamaz.length + p.zaten.length;
    expect(toplam).toBe(items.length); // tüketici: kalem kaybolmaz/çoğalmaz
  });

  it("BELGESİ OLAN kalem şablon sayısına BAKILMADAN 'zaten' kovasına gider", () => {
    /* Sıralama önemli: document_id kontrolü şablon sayımından ÖNCE gelmeli,
       yoksa tasarımdaki bir menü "seçimli"ye düşer ve mükerrer belge açılırdı. */
    const p = topluPlan([kalem({ id: "m", product_type: "menu", document_id: "doc_1" })]);
    expect(p.zaten.map((i) => i.id)).toEqual(["m"]);
    expect(p.secimli).toEqual([]);
  });
});

/* ---------------- 2. katman: düğme davranışı ---------------- */

describe("toplu başlatma düğmesi", () => {
  it("AÇILACAK KALEM YOKSA düğme HİÇ ÇİZİLMEZ (devre dışı düğme değil)", async () => {
    kur([kalem({ id: "d", document_id: "doc_var" }), kalem({ id: "e", product_type: "diger" })]);
    await screen.findByText("Açılış Paketi");
    /* "0 kalem" yazan bir düğme yapılacak iş varmış gibi görünürdü. */
    expect(screen.queryByText(/tasarıma başlat/i)).toBeNull();
  });

  it("N kalem TEK TIKLA açılır — belgeAc zinciri her kalem için tam koşar", async () => {
    vi.mocked(api.createDocument)
      .mockResolvedValueOnce(belge("doc_1"))
      .mockResolvedValueOnce(belge("doc_2"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    kur([
      kalem({ id: "a", product_type: "flyer" }),
      kalem({ id: "b", product_type: "vitrophanie", width_cm: 120, height_cm: 80, details: { side: "exterieur", mode: "impression" } }),
    ]);

    const btn = await screen.findByText(/2 kalemi tasarıma başlat/i);
    fireEvent.click(btn);

    await waitFor(() => expect(api.createDocument).toHaveBeenCalledTimes(2));
    /* Kalem bağı HER İKİSİ için kurulur — belge açıp bağlamamak yetim üretirdi. */
    await waitFor(() => expect(api.updateOrderItem).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.updateOrderItem).mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
    expect(api.deleteDocument).not.toHaveBeenCalled();
  });

  it("ŞABLON SORUSU TÜR BAŞINA BİR KEZ — iki menü tek cevabı paylaşır", async () => {
    const onay = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    kur([kalem({ id: "m1", product_type: "menu" }), kalem({ id: "m2", product_type: "menu" })]);
    fireEvent.click(await screen.findByText(/2 kalemi tasarıma başlat/i));

    await waitFor(() => expect(api.createDocument).toHaveBeenCalledTimes(2));
    /* Kalem başına sorsaydı 2 olurdu; asıl kazanç budur. */
    expect(onay).toHaveBeenCalledTimes(1);

    /* Tek cevap iki kaleme de uygulanır: aynı şablon id'si iki kez. */
    const secilen = siparisSablonlari("menu")[0];
    expect(vi.mocked(api.createDocument).mock.calls.map((c) => c[1])).toEqual([secilen, secilen]);
  });

  it("DÜŞEN KALEM TURU DURDURMAZ — kalanlar denenir, özet düşeni SAYAR", async () => {
    /* İlk kalem params 400'ünde yetim telafisiyle geri sarılır (belgeAc);
       ikinci kalem yine de açılmalı — aksi hâlde bir bozuk sipariş bütün
       toplu turu rehin alırdı. */
    vi.mocked(api.createDocument)
      .mockResolvedValueOnce(belge("doc_kotu"))
      .mockResolvedValueOnce(belge("doc_iyi"));
    vi.mocked(api.updateDocument)
      .mockRejectedValueOnce(new Error("400"))
      .mockResolvedValueOnce(belge("x"));
    vi.mocked(api.deleteDocument).mockResolvedValue({} as never);
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    kur([
      kalem({ id: "kotu", product_type: "vitrophanie", width_cm: 5000, height_cm: 80, details: { side: "exterieur", mode: "impression" } }),
      kalem({ id: "iyi", product_type: "flyer" }),
    ]);
    fireEvent.click(await screen.findByText(/2 kalemi tasarıma başlat/i));

    await waitFor(() => expect(api.createDocument).toHaveBeenCalledTimes(2));
    /* Yetim telafisi koştu: düşen belge silindi */
    await waitFor(() => expect(api.deleteDocument).toHaveBeenCalledWith("doc_kotu"));
    /* Düşen kalem BAĞLANMADI, sağlam kalem bağlandı */
    expect(vi.mocked(api.updateOrderItem).mock.calls.map((c) => c[0])).toEqual(["iyi"]);
    /* Özet sessiz kalmaz: 1 açıldı · 1 düştü */
    await screen.findByText(/1 belge açıldı · 1 düştü/i);
  });
});
