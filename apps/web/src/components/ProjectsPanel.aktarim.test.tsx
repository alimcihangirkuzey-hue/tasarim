// @vitest-environment jsdom
/* TOPLU DIŞA AKTARIM (K-1/B) testleri.

   ÖLÇÜLEN TEHLİKE — bu dosyanın asıl varlık sebebi: sunucunun blocker
   backstop'u İSTEMCİNİN bildirdiği uyarılara bakar (exports.ts:73-90 —
   "asıl kapı web modalındadır… sunucu tam analiz KOŞAMAZ: tam registry
   react taşır"). Yani toplu yol `warnings: []` ile çağırsaydı bekçi sessizce
   devre dışı kalır ve eksik zorunlu slotlu belge baskıya giderdi. Toplu yol,
   tekil yoldan daha GEVŞEK olamaz — buradaki testler o eşitliği çiviler.

   NEDEN GERÇEK ANALİZ: fikstürler analyzeDoc'u mock'LAMAZ; belge/müşteri
   fikstürü gerçek analizden geçer ve uyarılar üretimdeki yoldan doğar.
   analyzeDoc mock'lansaydı test, bekçinin çağrıldığını değil yalnız bir
   mock'un döndüğünü ölçerdi.

   SARMA GEREKÇESİ öteki ProjectsPanel dosyalarıyla aynı: ProjectBlock export
   EDİLMİYOR; exported ProjectsPanel render edilir. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type AssetDTO,
  type ClientDTO,
  type DocumentDTO,
  type OrderItemDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { TEMPLATES, blockersOf } from "@tezgah/templates";
import { api } from "../api";
import { analyzeDoc } from "../lib/analyzeDoc";
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

/* ---------------- fikstürler ---------------- */

/* LOGOSUZ müşteri: flyer şablonu zorunlu logo slotu ilan eder → analyzeDoc
   "empty-required" üretir ve o BLOCKER sınıfıdır. Fikstür bu yüzden sade
   bırakıldı; blocker'ı elle uydurmuyoruz, üretimdeki yoldan doğuyor. */
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

/* Belge fikstürü ŞEMADAN kurulur (ClientDTO fikstürüyle aynı gerekçe,
   ProjectsPanel.test.tsx:96): elle kurulan nesne şema default'larını kaçırır
   ve üretimde hiç oluşmayan bir şekille yeşil olurdu — ilk denemede tam bu
   oldu, `selection: null` analyzeDoc'u çökertti (gerçek belgede selection
   SelectionSchema default'udur, null değil). */
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

/* TEMİZ (blocker'sız) fikstür — ÖLÇÜLEREK kuruldu, tahminle değil: flyer'ın iki
   zorunlu slotu `logo` ve `qr`. logo bir GERÇEK varlığa çözülmeli (assets +
   slot override), qr ise brandkit'te bir iletişim alanı ister (qrSourceUrl).
   İkisi de karşılanınca analyzeDoc sıfır uyarı döndürür — bu ön-koşul aşağıda
   ayrıca iddia edilir ki fikstür bir gün bozulursa test sessizce anlamsızlaşmasın. */
const LOGO_VARLIK: AssetDTO = {
  id: "ast_logo",
  client_id: "cli_test",
  kind: "logo",
  filename: "ast_logo.png",
  width_px: 600,
  height_px: 600,
  tags: "",
  created_at: "2026-01-01T00:00:00Z",
  urls: { orig: "/o.png", master: "/m.png", thumb: "/t.png" },
};

function temizMusteri(): ClientDTO {
  const bk = defaultBrandKit();
  return {
    ...musteri(),
    brandkit: {
      ...bk,
      logo_primary: LOGO_VARLIK.id,
      /* Metin rengi zemine YAKIN seçildi (ölçüldü): analyzeDoc bir
         `qr-contrast` uyarısı üretir ve o BLOCKER DEĞİLDİR. Bu bilinçli —
         uyarısız bir fikstürle "ölçülen uyarılar gönderiliyor" iddiası
         [] === [] olur ve HİÇBİR ŞEY ölçmez (ilk yazımda tam bu tuzağa
         düştüm; negatif kontrol yakaladı). Belge hem üretilebilir kalır
         hem de taşıdığı uyarı kümesi boş olmaz. */
      colors: { ...bk.colors, text: "#F0EAE0", background: "#FFF8EF" },
      contact: { ...bk.contact, phone: "0600000000" },
    },
    assets: [LOGO_VARLIK],
  };
}

function temizBelge(id: string): DocumentDTO {
  return {
    ...DocumentStateSchema.parse({
      template_id: "flyer",
      overrides: { logo: { value: LOGO_VARLIK.id, detached: true } },
    }),
    id,
    project_id: "proj_1",
    client_id: "cli_test",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
}

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
});

/* ---------------- fikstür ön-koşulu ---------------- */

describe("fikstür ön-koşulu — blocker UYDURULMADI, gerçek analizden doğuyor", () => {
  it("logosuz flyer belgesi analyzeDoc'ta BLOCKER üretir", () => {
    const doc = belge("doc_bloklu", "flyer");
    const analiz = analyzeDoc(musteri(), doc);
    const entry = TEMPLATES["flyer"]!;
    /* Bu iddia kırılırsa aşağıdaki "engelli belge üretime GİTMEZ" testi
       sessizce anlamsızlaşırdı (bloklu sandığımız belge bloklu olmazdı) —
       ön-koşul ayrıca ölçülür. */
    expect(blockersOf(analiz.warnings, entry.manifest.severity_overrides).length).toBeGreaterThan(0);
  });
});

/* ---------------- düğme davranışı ---------------- */

describe("toplu dışa aktarım düğmesi", () => {
  it("BELGELİ KALEM YOKSA düğme çizilmez", async () => {
    kur([kalem("a", null)]);
    await screen.findByText("Açılış Paketi");
    expect(screen.queryByText(/belgeyi üret/i)).toBeNull();
  });

  it("ENGELLİ BELGE ÜRETİME GİTMEZ — bekçi atlatılmaz, sayılır", async () => {
    vi.mocked(api.document).mockResolvedValue(belge("doc_bloklu", "flyer"));

    kur([kalem("a", "doc_bloklu")]);
    fireEvent.click(await screen.findByText(/1 belgeyi üret/i));

    /* ASIL İDDİA: hiç export çağrısı GİTMEDİ. Toplu yol boş uyarı dizisiyle
       çağırsaydı sunucu bekçisi geçer, belge basılırdı. */
    await screen.findByText(/0 üretildi · 1 engelli/i);
    expect(api.exportDocument).not.toHaveBeenCalled();
    expect(api.exportSvg).not.toHaveBeenCalled();
    expect(api.exportGarment).not.toHaveBeenCalled();
  });

  it("TEMİZ BELGE ÜRETİLİR ve uyarılar BOŞ DİZİ DEĞİL, ÖLÇÜLEN küme gönderilir", async () => {
    const logolu = temizMusteri();
    const doc = temizBelge("doc_temiz");
    const beklenen = analyzeDoc(logolu, doc);
    const entry = TEMPLATES["flyer"]!;
    /* İKİ ÖN-KOŞUL: (a) blocker yok → belge üretilebilir; (b) uyarı kümesi BOŞ
       DEĞİL → aşağıdaki eşitlik gerçekten ısırır ([] === [] boş yere doğru
       olmaz). (b) olmadan bu test hiçbir şey ölçmezdi. */
    expect(blockersOf(beklenen.warnings, entry.manifest.severity_overrides)).toHaveLength(0);
    expect(beklenen.warnings.length).toBeGreaterThan(0);

    vi.mocked(api.document).mockResolvedValue(doc);
    vi.mocked(api.exportDocument).mockResolvedValue([{ version: 1 } as never]);
    vi.mocked(api.clients).mockResolvedValue([]);
    vi.mocked(api.clientProjects).mockResolvedValue([proje([kalem("a", "doc_temiz")])]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProjectsPanel client={logolu} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText(/1 belgeyi üret/i));

    await waitFor(() => expect(api.exportDocument).toHaveBeenCalledTimes(1));
    const [gonderilenId, gonderilenUyarilar] = vi.mocked(api.exportDocument).mock.calls[0]!;
    expect(gonderilenId).toBe("doc_temiz");
    /* Gönderilen küme ÖLÇÜLEN kümenin ta kendisi olmalı — "her zaman []"
       göndermek sunucu bekçisini devre dışı bırakırdı. */
    expect(gonderilenUyarilar).toEqual(beklenen.warnings);
    await screen.findByText(/1 üretildi/i);
  });

  it("DÜŞEN BELGE TURU DURDURMAZ — kalanlar denenir, özet düşeni sayar", async () => {
    const logolu = temizMusteri();
    vi.mocked(api.document)
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(temizBelge("doc_iyi"));
    vi.mocked(api.exportDocument).mockResolvedValue([{ version: 1 } as never]);
    vi.mocked(api.clients).mockResolvedValue([]);
    vi.mocked(api.clientProjects).mockResolvedValue([
      proje([kalem("a", "doc_kotu"), kalem("b", "doc_iyi")]),
    ]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProjectsPanel client={logolu} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText(/2 belgeyi üret/i));

    /* Bir belgenin 500'ü diğerini rehin almaz. */
    await waitFor(() => expect(api.exportDocument).toHaveBeenCalledTimes(1));
    await screen.findByText(/1 üretildi · 0 engelli \(atlandı\) · 1 düştü/i);
  });
});
