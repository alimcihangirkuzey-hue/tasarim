// @vitest-environment jsdom
/* SiparisPage — taslak sorusu mount-anı sözleşmesi
   (journal 2026-07-28-taslak-yarasi-f7-defter).

   NEDEN BU TEST: izole canlı turda (28 Tem) iki bağımsız koşumda deterministik
   üreyen yara — YENİ görüşmede işletme adının İLK HARFİ yazılınca form "Yarım
   bir görüşme var" ekranıyla değişiyordu (operatör yazarken kesiliyordu). Kök:
   draftAck useState(false) başlarken hasDraft() CILA1/3 ile newClient.name
   koşulunu içeriyor; ilk tuş taslağı "var" eder, soru mount SONRASI da
   tetikleniyordu. Sözleşme: taslak sorusu YALNIZ mount'ta önceden duran taslak
   için sorulur; ŞERH 2 (devam/at) aynen korunur.

   Sarma: ProjectsPanel reçetesi — QueryClientProvider(retry:false) +
   MemoryRouter + vi.mock("../api"). Zustand store gerçek (jsdom localStorage);
   her testte reset + localStorage temizliği. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api";
import { useIntake } from "../store/intakeStore";
import { SiparisPage } from "./SiparisPage";

vi.mock("../api", () => ({
  api: {
    /* SiparisPage + adım bileşenlerinin eriştiği uçlar; bu testler yalnız
       adım 1'i gezer ama mock kümesi tamlık için geniş */
    clients: vi.fn(),
    client: vi.fn(),
    sectors: vi.fn(),
    ingredients: vi.fn(),
    createIngredient: vi.fn(),
    documents: vi.fn(),
    createDocument: vi.fn(),
    intakeCommit: vi.fn(),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.sectors).mockResolvedValue([] as never);
  localStorage.clear();
  useIntake.getState().reset();
});

function sayfa() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SiparisPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const AD_PLACEHOLDER = "ör. Antalya Kebab — Lyon";
const TASLAK_BASLIK = "Yarım bir görüşme var";

describe("SiparisPage — taslak sorusu mount-anı sözleşmesi", () => {
  it("REGRESYON: temiz başlangıçta ad yazarken form taslak sorusuyla KESİLMEZ", () => {
    sayfa();
    const input = screen.getByPlaceholderText(AD_PLACEHOLDER);
    fireEvent.change(input, { target: { value: "A" } });
    fireEvent.change(input, { target: { value: "Antalya Kebab" } });
    /* Yaralı kodda ilk change'te form yerine taslak ekranı gelirdi */
    expect(screen.queryByText(TASLAK_BASLIK)).toBeNull();
    expect(screen.getByDisplayValue("Antalya Kebab")).toBeTruthy();
  });

  it("ŞERH 2 KORUNUR: mount'ta önceden taslak varsa soru sorulur, Devam et değeri korur", () => {
    useIntake.setState((st) => ({
      newClient: { ...st.newClient, name: "Eski Görüşme" },
      savedAt: Date.now() - 60_000,
    }));
    sayfa();
    expect(screen.getByText(TASLAK_BASLIK)).toBeTruthy();
    expect(screen.getByText("Eski Görüşme", { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByText("Devam et", { exact: true }));
    expect(screen.getByDisplayValue("Eski Görüşme")).toBeTruthy();
  });

  it("ŞERH 2 KORUNUR: 'Yeni görüşme (taslağı at)' taslağı sıfırlar, form boş açılır", () => {
    useIntake.setState((st) => ({
      newClient: { ...st.newClient, name: "Atılacak Taslak" },
      savedAt: Date.now() - 60_000,
    }));
    sayfa();
    fireEvent.click(screen.getByText("Yeni görüşme (taslağı at)"));
    const input = screen.getByPlaceholderText(AD_PLACEHOLDER) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(screen.queryByText(TASLAK_BASLIK)).toBeNull();
  });
});
