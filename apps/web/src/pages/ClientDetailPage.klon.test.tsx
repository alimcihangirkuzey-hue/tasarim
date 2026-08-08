// @vitest-environment jsdom
/* MÜŞTERİ KLONLAMA — GERÇEK VAZGEÇME + YUTULMAYAN HATA (K-1/A).

   ÖLÇÜLEN İKİ YARA, İKİSİ DE BU SAYFADA CANLIYDI:

   1. VAZGEÇİLEMİYORDU. Belge sorusu `window.confirm(t("clone.with_docs_confirm"))`
      idi ve "İptal" klonu iptal etmiyor, "BELGESİZ KLONLA" demek oluyordu —
      operatörün çıkışı yoktu. `2026-08-06-sablon-secici` paketinin kapattığı
      yaranın KARDEŞİ; aynı sınıf, aynı sayfa, hâlâ canlı.
   2. HATA YUTULUYORDU. Akış `useMutation` değildi ve `try/catch` de yoktu:
      `await api.cloneClient(...)` reddedilince söz sahipsiz kalıyor, ekranda
      hiçbir şey olmuyordu. Bu yol gerçekten reddedilebilir — sunucu klonu tek
      işlemde yazar ve bozuk paramlı belgede `paramlariDogrula` fırlatır
      (routes/clone.ts), işlem geri sarar.

   NAVİGASYON NASIL ÖLÇÜLÜYOR: rota ağacı `/clients/:id`dir, yani yeni
   müşteriye gidilirse sayfa YENİ kimlikle yeniden kurulur ve `api.client` o
   kimlikle çağrılır. "Gidildi mi" iddiası böylece bir casus değişkene değil,
   gerçek yönlendirmenin GÖZLENEBİLİR sonucuna bağlanır. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentSummaryDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { ClientDetailPage } from "./ClientDetailPage";

vi.mock("../api", async (asil) => ({
  ...(await asil<typeof import("../api")>()),
  api: {
    client: vi.fn(),
    clients: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    cloneClient: vi.fn(),
    documents: vi.fn(),
    createOpeningKit: vi.fn(),
    clientProjects: vi.fn(),
    projectExports: vi.fn(),
    isKollari: vi.fn(),
    scenes: vi.fn(),
    surfaces: vi.fn(),
    assets: vi.fn(),
  },
}));

function musteri(id = "cli_test"): ClientDTO {
  return {
    id,
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

const belge = (id: string): DocumentSummaryDTO => ({
  id,
  template_id: "flyer",
  status: "draft",
  theme_id: "",
  format: null,
  updated_at: "2026-01-01T00:00:00Z",
});

function kur(belgeler: DocumentSummaryDTO[]) {
  vi.mocked(api.client).mockImplementation(async (cid: string) => musteri(cid));
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.documents).mockResolvedValue(belgeler);
  vi.mocked(api.projectExports).mockResolvedValue([]);
  vi.mocked(api.clientProjects).mockResolvedValue([]);
  vi.mocked(api.isKollari).mockResolvedValue({ aktif: [], tumu: [], kaynak: "varsayilan" } as never);
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

/** Klon düğmesine basar (ad sorusu `window.prompt` ile sahtelenmiştir). */
async function klonaBas() {
  fireEvent.click(await screen.findByText("Müşteriyi klonla"));
}

/** Modal içindeki seçenek düğmesi — metniyle bulunur. */
const modalDugmesi = (metin: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll<HTMLButtonElement>(".modal button")].find((b) =>
    b.textContent?.includes(metin),
  );

beforeEach(() => {
  vi.spyOn(window, "prompt").mockReturnValue("Kuzey Ozalit 2");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("ön-koşul — soru GERÇEKTEN soruluyor", () => {
  it("BELGESİ OLAN müşteride modal açılır ve İKİ seçenek + vazgeç taşır", async () => {
    /* Bu satır olmadan aşağıdaki "vazgeçince klonlanmaz" iddiası, hiç modal
       açmayan bozuk bir akışla da yeşil kalırdı: soru sorulmaz, kimse bir
       şeye basmaz, `cloneClient` de çağrılmaz — ve test "vazgeçme çalışıyor"
       derdi. Bu deponun defalarca ödediği kör nokta. */
    kur([belge("doc_1"), belge("doc_2")]);
    await klonaBas();
    await screen.findByText("Belgeler de klonlansın mı?");
    expect(modalDugmesi("Belgelerle klonla")).toBeTruthy();
    expect(modalDugmesi("Belgesiz klonla")).toBeTruthy();
    expect(document.querySelectorAll(".modal button")).toHaveLength(3); // 2 seçenek + vazgeç
    /* Sayı UYDURULMAZ, okunan belge sayısıdır. */
    expect(modalDugmesi("Belgelerle klonla")!.textContent).toContain("2 belge");
  });
});

describe("GERÇEK VAZGEÇME — yaranın kendisi", () => {
  it("VAZGEÇ hiçbir şey klonlamaz — 'belgesiz klonla' DEMEZ", async () => {
    /* Eski `window.confirm` yolunda bu tıklama `document_ids: []` ile bir
       müşteri kopyası yaratıyordu ve geri dönüşü yoktu. */
    kur([belge("doc_1")]);
    await klonaBas();
    fireEvent.click(await screen.findByText("Vazgeç"));
    await waitFor(() => expect(screen.queryByText("Vazgeç")).toBeNull());
    expect(api.cloneClient).not.toHaveBeenCalled();
  });

  it("ESCAPE de vazgeçer", async () => {
    kur([belge("doc_1")]);
    await klonaBas();
    await screen.findByText("Vazgeç");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Vazgeç")).toBeNull());
    expect(api.cloneClient).not.toHaveBeenCalled();
  });

  it("AD SORUSUNDA vazgeçmek belge bile OKUTMAZ", async () => {
    /* `window.prompt`un "İptal"i zaten iptal ediyordu; korunduğu ölçülür —
       ve vazgeçen bir akışın ağa hiç çıkmaması da bir sözleşmedir. */
    vi.mocked(window.prompt).mockReturnValue(null);
    kur([belge("doc_1")]);
    await klonaBas();
    await waitFor(() => expect(api.cloneClient).not.toHaveBeenCalled());
    expect(api.documents).not.toHaveBeenCalled();
  });
});

describe("seçilen cevap GERÇEKTEN uygulanır", () => {
  it("BELGELERLE → bütün belge kimlikleri gider, yeni müşteriye gidilir", async () => {
    vi.mocked(api.cloneClient).mockResolvedValue({ id: "cli_yeni", cloned_documents: 2 } as never);
    kur([belge("doc_1"), belge("doc_2")]);
    await klonaBas();
    fireEvent.click((await screen.findByText("Belgelerle klonla")).closest("button")!);

    await waitFor(() => expect(api.cloneClient).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.cloneClient).mock.calls[0]![1]).toEqual({
      name: "Kuzey Ozalit 2",
      document_ids: ["doc_1", "doc_2"],
    });
    /* Yönlendirme GÖZLENİR: sayfa yeni kimlikle yeniden kurulur. */
    await waitFor(() => expect(api.client).toHaveBeenCalledWith("cli_yeni"));
  });

  it("BELGESİZ → boş liste gider", async () => {
    vi.mocked(api.cloneClient).mockResolvedValue({ id: "cli_yeni", cloned_documents: 0 } as never);
    kur([belge("doc_1"), belge("doc_2")]);
    await klonaBas();
    fireEvent.click((await screen.findByText("Belgesiz klonla")).closest("button")!);

    await waitFor(() => expect(api.cloneClient).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.cloneClient).mock.calls[0]![1]).toEqual({
      name: "Kuzey Ozalit 2",
      document_ids: [],
    });
  });

  it("BELGE YOKSA soru HİÇ sorulmaz — olmayan seçim yaptırılmaz", async () => {
    /* Seçici tek seçenekli soruda FIRLATIR; belgesi olmayan müşteride soru
       sormak hem anlamsız hem de o fırlatmaya giden yoldur. */
    vi.mocked(api.cloneClient).mockResolvedValue({ id: "cli_yeni", cloned_documents: 0 } as never);
    kur([]);
    await klonaBas();
    await waitFor(() => expect(api.cloneClient).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.cloneClient).mock.calls[0]![1]).toEqual({
      name: "Kuzey Ozalit 2",
      document_ids: [],
    });
    expect(screen.queryByText("Belgeler de klonlansın mı?")).toBeNull();
  });
});

describe("HATA ARTIK YUTULMUYOR", () => {
  it("SUNUCU REDDEDERSE gerekçe ekranda kalır ve yeni müşteriye GİDİLMEZ", async () => {
    /* Eski yolda söz sahipsiz reddediliyordu: operatör düğmeye basıyor,
       ekranda hiçbir şey olmuyor, sebebini öğrenemiyordu. */
    vi.mocked(api.cloneClient).mockRejectedValue(
      new Error("400 param dogrulama: width_cm 5000"),
    );
    kur([belge("doc_1")]);
    await klonaBas();
    fireEvent.click((await screen.findByText("Belgelerle klonla")).closest("button")!);

    const kutu = await screen.findByText(/Müşteri klonlanamadı/i);
    expect(kutu.textContent).toContain("width_cm 5000");
    expect(api.client).not.toHaveBeenCalledWith("cli_yeni");
  });
});
