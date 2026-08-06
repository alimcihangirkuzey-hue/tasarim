// @vitest-environment jsdom
/* KALEM KARTI SEÇENEKLERİ İLANDAN OKUNUR (K-1/D) testleri.

   BORÇ (önizleme paketi şerh listesi, 2026-07-26): "ProjectsPanel select
   seçenekleri (side/mode/technique) JSX'te sert kodlu — ilan yalnız
   görünürlüğü kapsıyor, seçenekler manifest/param ilanından okunmuyor."

   ÖLÇÜLDÜ (2026-08-06): türetilen küme bugünkü sert listeyle BİREBİR aynı —
   tişört/önlük → [impression, broderie]; vitrophanie → [impression, decoupe].
   Yani bu geçiş DAVRANIŞ DEĞİŞTİRMEZ. Kazanç ileriye dönüktür: ilan değiştiği
   gün UI kendiliğinden uyar. Sert liste kalsaydı yeni kanal ilan edildiği gün
   UI sessizce eksik kalırdı (PRODUCTION_TECHNIQUES bugün ÜÇ teknik ilan
   ederken UI'nın yalnız ikisini sunması tam bu sınıfın örneğiydi).

   YÖN (side) KAPSAM DIŞI ve bu ölçülmüş bir sınır: uygulama yönü bir ÜRETİM
   KANALI değildir, KANAL_GEREKTIRIR zincirinde karşılığı yoktur — türetecek
   ilan yok, sert kodlu kalır (etiketleri yine de i18n'e alındı).

   BEKLENEN DEĞERLER İLANDAN OKUNUR, teste sabit yazılmaz: kümenin İÇERİĞİ
   packages/templates siparis-koprusu.test.ts'te elle çivilidir (nöbetçi orada).
   Buradaki iş, EKRANIN o kümeyi gösterdiğini ölçmektir. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type OrderItemDTO,
  type ProductType,
  type ProjectDTO,
} from "@tezgah/shared";
import { siparisTeknikleri } from "@tezgah/templates/identity";
import { api } from "../api";
import { ProjectsPanel } from "./ProjectsPanel";

/* identity KISMİ mock: yalnız siparisTeknikleri sarmalanır, gerisi GERÇEK
   (importActual). Amaç aşağıdaki BAĞLILIK testidir — sert kodlu bir liste ile
   ilandan okunan liste bugün aynı değerleri verdiği için, "eşleşiyor mu"
   sormak ikisini AYIRT EDEMEZ (ilk yazımda tam bu tuzağa düştüm: sert listeyi
   geri koyduğumda 4 test de yeşil kaldı). İlanı DEĞİŞTİRİP ekranın onu
   izlediğini görmek, bağlılığı doğrudan ölçen tek yoldur. */
const teknikSahte = vi.hoisted(() => ({ deger: null as readonly string[] | null }));
vi.mock("@tezgah/templates/identity", async (importActual) => {
  const gercek = await importActual<typeof import("@tezgah/templates/identity")>();
  return {
    ...gercek,
    siparisTeknikleri: (t: string) =>
      teknikSahte.deger ?? gercek.siparisTeknikleri(t as never),
  };
});

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

/** Teknik kodu → ekranda görünen etiket (i18n orders.teknik_*) */
const ETIKET: Record<string, string> = {
  impression: "baskı",
  broderie: "nakış",
  decoupe: "kesim",
};

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

function kalem(product_type: ProductType, details: Record<string, unknown> = {}): OrderItemDTO {
  return {
    id: "item_1",
    project_id: "proj_1",
    product_type,
    qty: 1,
    width_cm: 120,
    height_cm: 80,
    details,
    notes: "",
    status: "olcu_bekliyor",
    document_id: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  } as OrderItemDTO;
}

function kur(item: OrderItemDTO) {
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.projectExports).mockResolvedValue([]);
  vi.mocked(api.clientProjects).mockResolvedValue([
    {
      id: "proj_1",
      client_id: "cli_test",
      name: "Açılış Paketi",
      status: "open",
      due_date: null,
      source_text: null,
      items: [item],
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

/** Verilen select'in (placeholder metnine göre bulunur) seçenek değerleri */
function seceneklerOf(placeholder: string): string[] {
  const opt = screen.getByText(placeholder);
  const sel = opt.closest("select");
  if (!sel) throw new Error(`select bulunamadı: ${placeholder}`);
  return [...sel.querySelectorAll("option")]
    .map((o) => o.getAttribute("value") ?? "")
    .filter((v) => v !== "");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  teknikSahte.deger = null;
});

describe("kalem kartı teknik/mod seçenekleri — ilandan", () => {
  it("VİTRİN: mod seçenekleri İLANIN kümesidir", async () => {
    kur(kalem("vitrophanie", { side: "exterieur", mode: "impression" }));
    await screen.findByText("mod?");
    /* Beklenen ilandan okunur — teste sabit yazılsaydı ikinci bir kaynak
       doğardı ve ilan değişince test onu gizlerdi. */
    expect(seceneklerOf("mod?")).toEqual([...siparisTeknikleri("vitrophanie")]);
  });

  it("TİŞÖRT: teknik seçenekleri İLANIN kümesidir", async () => {
    kur(kalem("tisort", { technique: "impression" }));
    await screen.findByText("teknik?");
    expect(seceneklerOf("teknik?")).toEqual([...siparisTeknikleri("tisort")]);
  });

  it("ETİKETLER OKUNUR — ham kod operatöre sızmaz", async () => {
    kur(kalem("tisort", { technique: "impression" }));
    const sel = (await screen.findByText("teknik?")).closest("select")!;
    const metinler = [...sel.querySelectorAll("option")].map((o) => o.textContent);
    for (const tk of siparisTeknikleri("tisort")) {
      expect(metinler, tk).toContain(ETIKET[tk]);
    }
    /* "broderie"/"impression" gibi ham enum adı seçenek METNİ olmamalı. */
    expect(metinler).not.toContain("broderie");
    expect(metinler).not.toContain("impression");
  });

  it("BAĞLILIK: İLAN DEĞİŞİRSE EKRAN İZLER (sert liste bunu geçemez)", async () => {
    /* İlan sahteleniyor: tişörtün teknik kümesi yalnız [decoupe] olsun.
       Kod ilandan okuyorsa select tek seçenek ("kesim") gösterir; sert kodlu
       olsaydı hâlâ baskı+nakış gösterir ve bu test kırmızıya döner.
       NEGATİF KONTROL BURADA ISIRIR — ölçüldü. */
    teknikSahte.deger = ["decoupe"];
    kur(kalem("tisort", { technique: "impression" }));
    await screen.findByText("teknik?");
    expect(seceneklerOf("teknik?")).toEqual(["decoupe"]);
    const sel = screen.getByText("teknik?").closest("select")!;
    const metinler = [...sel.querySelectorAll("option")].map((o) => o.textContent);
    expect(metinler).toContain("kesim");
    expect(metinler).not.toContain("nakış");
  });

  it("YÖN sert kodlu KALIR — türetecek ilan yok (kayıtlı sınır)", async () => {
    kur(kalem("vitrophanie", { side: "exterieur", mode: "impression" }));
    await screen.findByText("yön?");
    /* Bu iddia bir SÖZLEŞMEDİR: yön bir üretim kanalı olmadığı için
       KANAL_GEREKTIRIR'den türetilemez. Bir gün ilan doğarsa bu test
       kırılır ve karar yeniden açılır — sessizce eskimez. */
    expect(seceneklerOf("yön?")).toEqual(["exterieur", "interieur"]);
  });
});
