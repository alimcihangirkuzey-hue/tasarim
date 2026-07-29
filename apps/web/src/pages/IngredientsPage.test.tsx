// @vitest-environment jsdom
/* IngredientsPage — çip çeviri tamamlama yüzeyi testleri
   (journal 2026-07-28-m8-sessizlik-cip-ceviri).

   NEDEN: PATCH /api/ingredients F7-B1'den beri tüketicisizdi; bu testler İLK
   tüketicinin sözleşmesini çiviler — yalnız fr/de'si eksik çipler listelenir,
   kayıt gövdesi yalnız DOLU alanları taşır (ŞERH 3: boş patch gönderilmez,
   düğme kilitli).

   Sarma: SettingsTabs Link kullanır → MemoryRouter; sorgular → QueryClientProvider
   (retry:false); api mock (repo reçetesi). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ResolvedChip } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { IngredientsPage } from "./IngredientsPage";

vi.mock("../api", () => ({
  api: {
    ingredients: vi.fn(),
    patchIngredient: vi.fn(),
  },
}));

const CIPLER: ResolvedChip[] = [
  /* öğrenilen, iki dili de boş — listelenmeli */
  { id: "lrn_truf", tr: "trüf mantarı", fr: "", de: "", tags: [], source: "learned", usage_count: 1 },
  /* tohum, tam — listelenMEmeli */
  { id: "ing_salata", tr: "salata", fr: "salade", de: "Salat", tags: ["sebze"], source: "seed", usage_count: 9 },
];

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.ingredients).mockResolvedValue(CIPLER);
  vi.mocked(api.patchIngredient).mockResolvedValue({ chip: CIPLER[0] } as never);
});

function sayfa() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <IngredientsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("IngredientsPage — çeviri tamamlama", () => {
  it("yalnız fr/de'si eksik çipler listelenir; tam tohum çipi listede yok", async () => {
    sayfa();
    expect(await screen.findByText("trüf mantarı")).toBeTruthy();
    expect(screen.queryByText("salata")).toBeNull();
  });

  it("yalnız DOLU alanlar gövdeye girer (fr yazıldı, de boş → gövdede sadece fr)", async () => {
    sayfa();
    await screen.findByText("trüf mantarı");
    fireEvent.change(screen.getByPlaceholderText(t_fr()), { target: { value: "truffe" } });
    fireEvent.click(screen.getByText(kaydetEtiketi()));
    await waitFor(() => expect(api.patchIngredient).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.patchIngredient).mock.calls[0]).toEqual(["lrn_truf", { fr: "truffe" }]);
  });

  it("ŞERH 3 simetrisi: iki alan da boşken Kaydet kilitli (boş patch gönderilemez)", async () => {
    sayfa();
    await screen.findByText("trüf mantarı");
    const dugme = screen.getByText(kaydetEtiketi()) as HTMLButtonElement;
    expect(dugme.disabled).toBe(true);
  });
});

/* i18n gerçek tr.json'dan okunur — etiketlere tek noktadan erişim ki anahtar
   metni değişirse testin kırılma yeri belli olsun */
function t_fr() {
  return t("malzeme.fr_ph");
}
function kaydetEtiketi() {
  return t("malzeme.save");
}
