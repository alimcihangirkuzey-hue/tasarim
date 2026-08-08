// @vitest-environment jsdom
/* EDİTÖR ŞABLON SEÇİCİSİ × KURULUM İŞ KOLLARI (K-1/C, örtü borcu).

   NEREDEN GELDİ: `2026-08-07-kurulum-daraltmasi-tek-kapi` paketinin açık
   bulgusu `K1C-DARALT-1`. Pozitif kontrol (hook hiç daraltmasın) altı
   yüzeyden yalnız üçünü kırmızıya döndürdü ve editör kırılmayan üçten biriydi:
   `gorunurSablonlar` saf olarak ölçülüyordu, `SektorluSablonSecenekleri`
   DocumentsPanel üzerinden ölçülüyordu — ama EditorPage'in o bileşene
   daraltmayı GERÇEKTEN geçirdiği hiç ölçülmemişti. Kablo kopsa editörde
   tabelacıya menü şablonları görünür, hiçbir kapı bir şey söylemezdi.

   AYRI DOSYA, VE BU BİR KARAR: `EditorPage.test.tsx` sahte zamanlayıcı
   (`vi.useFakeTimers`) kullanıyor ve deponun nöbetçisi (`yokluk-iddiasi.test.ts`)
   sahte zamanlayıcı ile sınırlı-bekleme yokluk iddiasını aynı dosyada
   YASAKLIYOR — ölçülmüş bir kilitlenme sınıfı. Bu dosya gerçek zamanla çalışır.

   SARMA REÇETESİ `EditorPage.test.tsx`'ten ödünç alındı (aynı mock kümesi +
   zustand sıfırlaması); tek fark: `api.isKollari` mock'a EKLENDİ — orada yok,
   çünkü orası daraltmayı hiç ölçmüyor. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentDTO,
} from "@tezgah/shared";
import { SEKTORLER } from "@tezgah/templates/identity";
import { api } from "../api";
import { useEditor } from "../store/editorStore";
import { EditorPage } from "./EditorPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../api", () => ({
  api: {
    document: vi.fn(),
    client: vi.fn(),
    clientScenes: vi.fn(),
    documentExports: vi.fn(),
    documentIntegrationEvents: vi.fn(),
    cmykStatus: vi.fn(),
    updateDocument: vi.fn(),
    isKollari: vi.fn(),
  },
}));

function makeClient(): ClientDTO {
  return {
    id: "cli_editor",
    name: "Editor Kollar",
    slug: "editor-kollar",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({ categories: [] }),
    assets: [],
    created_at: "2026-07-28T00:00:00Z",
    updated_at: "2026-07-28T00:00:00Z",
  };
}

/* Belgenin şablonu `vitro-bandeau` — iş kolu `cam-giydirme`. Tabelacı
   kurulumunda bu şablon KAPALI bir koldadır; korunan-id sözleşmesi tam da
   burada ölçülür. */
function makeDoc(id: string): DocumentDTO {
  return {
    ...DocumentStateSchema.parse({ template_id: "vitro-bandeau", params: { w_cm: 180, h_cm: 60 } }),
    id,
    project_id: "prj_editor",
    client_id: "cli_editor",
    created_at: "2026-07-28T00:00:00Z",
    updated_at: "2026-07-28T00:00:00Z",
  };
}

/** Şablon seçicisi = kayıtlı şablon id'lerini taşıyan select. */
function sablonSecici(): HTMLSelectElement {
  const secililer = screen.getAllByRole("combobox") as HTMLSelectElement[];
  const s = secililer.find((el) => [...el.options].some((o) => o.value === "vitro-bandeau"));
  if (!s) throw new Error("şablon seçicisi bulunamadı");
  return s;
}

function secenekler(): string[] {
  return [...sablonSecici().options].map((o) => o.value);
}

async function kur(
  docId: string,
  kollar: { aktif: readonly string[]; kaynak: "varsayilan" | "yapilandirma" },
) {
  vi.mocked(api.isKollari).mockResolvedValue({
    aktif: kollar.aktif,
    tumu: SEKTORLER,
    kaynak: kollar.kaynak,
  } as never);
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/editor/${docId}`]}>
        <Routes>
          <Route path="/editor/:id" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(sablonSecici().options.length).toBeGreaterThan(0));
  /* Daraltma sorgusu GERÇEKTEN çözülene kadar beklenir — liste süzülmemiş
     hâliyle zaten çizili olduğu için "seçenek var" koşulu yanıt gelmeden de
     doğrudur (ScenesPanel örtüsünde ölçülmüş yarış). */
  await waitFor(() => expect(api.isKollari).toHaveBeenCalled());
  await vi.mocked(api.isKollari).mock.results[0]!.value;
}

beforeEach(() => {
  useEditor.setState({ docId: null, doc: null, past: [], future: [], selectedSlot: null, saveState: "idle" });
  vi.clearAllMocks();
  vi.mocked(api.document).mockImplementation((id) => Promise.resolve(makeDoc(id)));
  vi.mocked(api.client).mockResolvedValue(makeClient());
  vi.mocked(api.clientScenes).mockResolvedValue([]);
  vi.mocked(api.documentExports).mockResolvedValue([]);
  vi.mocked(api.documentIntegrationEvents).mockResolvedValue([]);
  vi.mocked(api.cmykStatus).mockResolvedValue({ available: false, version: null });
  vi.mocked(api.updateDocument).mockImplementation((id) => Promise.resolve(makeDoc(id)));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("editör şablon seçicisi × iş kolları", () => {
  it("ÖN KOŞUL — yapılandırma yokken TÜM iş kollarının şablonları görünür", async () => {
    /* Bu satır olmadan aşağıdaki daraltma iddiaları, hiç şablon çizmeyen
       bozuk bir render'la da yeşil kalırdı. */
    await kur("doc-kollar-1", { aktif: SEKTORLER, kaynak: "varsayilan" });
    const ids = secenekler();
    expect(ids).toContain("vitro-bandeau");
    expect(ids, "ön koşul: gizlenebilir menü şablonu bugünkü listede VAR").toContain(
      "menu-grid-cells",
    );
    expect(ids).toContain("enseigne-panneau");
  });

  it("TABELACI kurulumunda MENÜ ve GİYİM şablonları DÜŞER, tabela kalır", async () => {
    /* EditorPage'in daraltmayı `SektorluSablonSecenekleri`'ne GERÇEKTEN
       geçirdiğinin kanıtı: kablo koparsa bu satır kırmızıya döner,
       `gorunurSablonlar`ın saf testleri ise yeşil kalırdı. */
    await kur("doc-kollar-2", { aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await waitFor(() => expect(secenekler()).not.toContain("menu-grid-cells"));
    const ids = secenekler();
    expect(ids).not.toContain("menu-liste-premium");
    expect(ids).not.toContain("garment");
    expect(ids).not.toContain("flyer");
    expect(ids).toContain("enseigne-panneau");
  });

  it("SEÇİLİ ŞABLON KORUNUR: kapalı iş kolundaki belge yanlış şablon göstermez", async () => {
    /* Görünürlük daraltması VERİYİ yanlış göstermeye dönüşemez. `vitro-bandeau`
       tabelacı kurulumunda KAPALI bir koldadır; korunan-id olmasaydı kontrollü
       select'in değeri listede bulunmaz, tarayıcı ilk seçeneği gösterir ve
       operatör belgesinin şablonunu YANLIŞ okurdu.

       ÖLÇÜMÜN SINIRI AÇIKÇA: bu iddia tek başına "korundu"yu "daraltma hiç
       uygulanmadı"dan ayıramaz. Ayrımı bir üstteki test yapar — AYNI kurgu,
       AYNI bekleme, ve orada menü şablonları gerçekten düşüyor. */
    await kur("doc-kollar-3", { aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await waitFor(() => expect(secenekler()).not.toContain("menu-grid-cells"));
    expect(secenekler()).toContain("vitro-bandeau");
    expect(sablonSecici().value, "kontrollü select düşmüş değere düştü").toBe("vitro-bandeau");
  });

  it("KAYITSIZ (sektörsüz) şablon her kurulumda kalır — kaçış kapısı", async () => {
    /* `kabul-fabrika` identity kapsamı dışıdır (`hedefSektorOf` null döner);
       süzgecin onun hakkında söyleyeceği bir şey yoktur ve sessizce kaybolması
       yanlış olurdu — `gorunurSablonlar`ın yazılı sözleşmesi. */
    await kur("doc-kollar-4", { aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await waitFor(() => expect(secenekler()).not.toContain("menu-grid-cells"));
    expect(secenekler()).toContain("kabul-fabrika");
  });
});
