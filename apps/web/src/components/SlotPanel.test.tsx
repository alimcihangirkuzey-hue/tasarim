// @vitest-environment jsdom
/* SlotPanel.ItemQuickEdit — varyant ekle/sil testleri
   (journal 2026-07-28-coklu-fiyat-girisi).

   NEDEN BU TEST: aynı işlem iki panelde farklı yetenekteydi — CatalogPanel
   Faz 1'den beri varyant ekleyip silebiliyor, editörün hızlı düzenlemesi
   yalnız mevcutları değiştirebiliyordu. Bu dosya yeni ekle/sil davranışını
   KOŞARAK çivileler: tık → yerel satır + 700ms debounce sonrası
   api.updateClient gövdesinde doğru prices dizisi.

   Sarma: SlotPanel props-güdümlü ve router'sız (ölçüldü) — QueryClientProvider
   + api mock yeter. Debounce window.setTimeout(700) → fake timers
   (EditorPage.test.tsx reçetesi: ilk render gerçek timer istemiyor çünkü
   burada yükleme sorgusu yok; timer'lar yalnız debounce için). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogSchema, DocumentStateSchema, defaultBrandKit, type ClientDTO } from "@tezgah/shared";
import { TEMPLATES } from "@tezgah/templates";
import { api } from "../api";
import { SlotPanel } from "./SlotPanel";

vi.mock("../api", () => ({
  api: {
    /* render + kayıt yolunda erişilenler; SwapPicker ve foto yükleme bu
       testlerde tetiklenmez ama küme tamlığı için mock'lu */
    updateClient: vi.fn(),
    uploadAsset: vi.fn(),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.updateClient).mockResolvedValue({} as never);
});

function makeClient(prices: { label: string; value: number }[]): ClientDTO {
  return {
    id: "cli_sp",
    name: "Test",
    slug: "test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "c0",
          name_fr: "Pizzas",
          order: 0,
          items: [{ id: "it1", name_fr: "Margherita", desc_fr: "", order: 0, prices }],
        },
      ],
    }),
    assets: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function renderPanel(client: ClientDTO) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const doc = DocumentStateSchema.parse({ template_id: "menu-grid-cells" });
  return render(
    <QueryClientProvider client={qc}>
      <SlotPanel
        client={client}
        doc={doc}
        entry={TEMPLATES["menu-grid-cells"]}
        patch={() => {}}
        select={() => {}}
        selectedSlot="item:it1"
      />
    </QueryClientProvider>
  );
}

/** 700ms debounce'u ilerlet ve mutation'ın çözülmesine izin ver. */
async function debounceGecsin() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
}

/** api.updateClient'a giden son katalogtan it1'in prices dizisini çıkar. */
function gidenPrices(): unknown {
  const calls = vi.mocked(api.updateClient).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const govde = calls[calls.length - 1][1] as {
    catalog: { categories: { items: { id: string; prices: unknown }[] }[] };
  };
  return govde.catalog.categories[0].items.find((i) => i.id === "it1")!.prices;
}

describe("ItemQuickEdit — varyant ekle/sil", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("+ varyant tıkı: yeni satır DOM'da + debounce sonrası gövdede 'menu' önerili varyant", async () => {
    renderPanel(makeClient([{ label: "seul", value: 7.5 }]));
    expect(screen.getAllByDisplayValue(/seul/)).toHaveLength(1);

    fireEvent.click(screen.getByText("+ varyant"));
    /* Yerel state anında büyür (kontrollü inputlar) — kayıt beklemez */
    expect(screen.getByDisplayValue("menu")).toBeTruthy();

    await debounceGecsin();
    expect(gidenPrices()).toEqual([
      { label: "seul", value: 7.5 },
      { label: "menu", value: 0 },
    ]);
  });

  it("boş listede ilk öneri 'seul' (CatalogPanel sezgiseliyle birebir)", async () => {
    renderPanel(makeClient([]));
    fireEvent.click(screen.getByText("+ varyant"));
    await debounceGecsin();
    expect(gidenPrices()).toEqual([{ label: "seul", value: 0 }]);
  });

  it("✕ tıkı: varyant düşer, kalan gövdede doğru", async () => {
    renderPanel(
      makeClient([
        { label: "seul", value: 7.5 },
        { label: "menu", value: 10 },
      ])
    );
    const silButonlari = screen.getAllByTitle("Varyantı sil");
    expect(silButonlari).toHaveLength(2);
    fireEvent.click(silButonlari[0]);

    await debounceGecsin();
    expect(gidenPrices()).toEqual([{ label: "menu", value: 10 }]);
  });

  it("REGRESYON: mevcut etiket/değer düzenleme davranışı değişmedi", async () => {
    renderPanel(makeClient([{ label: "seul", value: 7.5 }]));
    fireEvent.change(screen.getByDisplayValue("7.5"), { target: { value: "9" } });
    await debounceGecsin();
    expect(gidenPrices()).toEqual([{ label: "seul", value: 9 }]);
  });
});
