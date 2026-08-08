// @vitest-environment jsdom
/* PARSE SÖZLÜĞÜ TÜR SEÇİCİSİ × KURULUM İŞ KOLLARI (K-1/C, örtü borcu).

   NEREDEN GELDİ: `2026-08-07-kurulum-daraltmasi-tek-kapi` paketinin açık
   bulgusu `K1C-DARALT-1`. O turda pozitif kontrol (hook hiç daraltmasın)
   koşuldu ve ALTI yüzeyin yalnız ÜÇÜNDE test kırmızıya döndü — bu sayfa
   kırılmayan üçten biriydi. Yani daraltma buradan sessizce kaybolsa hiçbir
   kapı bir şey söylemezdi.

   BU SAYFANIN YARASI ÖZEL VE SEÇİCİDEN DERİN: `etkinTur` seçili değeri
   listeye karşı DÜZELTİR (`gorunurTurler.includes(type) ? type :
   gorunurTurler[0]`) ve **ekleme mutasyonu o düzeltilmiş değeri yollar**.
   Varsayılan `type` durumu `"tabela"`dır; menücü/matbaa kurulumunda tabela
   listeden düşer ve ekleme YANLIŞ türe yazardı — sözlük kaydı kalıcıdır,
   yanlışı ancak sonraki bir çözümlemede fark ederdiniz. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SEKTORLER } from "@tezgah/templates/identity";
import { api } from "../api";
import { ParseDictPage } from "./ParseDictPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../api", () => ({
  api: {
    parseSynonyms: vi.fn(),
    addParseSynonym: vi.fn(),
    deleteParseSynonym: vi.fn(),
    isKollari: vi.fn(),
  },
}));

function turSecici(): HTMLSelectElement {
  const s = screen.getAllByRole("combobox")[0] as HTMLSelectElement | undefined;
  if (!s) throw new Error("tür seçicisi bulunamadı");
  return s;
}

function kur(kollar: { aktif: readonly string[]; kaynak: "varsayilan" | "yapilandirma" }) {
  vi.mocked(api.parseSynonyms).mockResolvedValue([]);
  vi.mocked(api.addParseSynonym).mockResolvedValue({} as never);
  vi.mocked(api.isKollari).mockResolvedValue({
    aktif: kollar.aktif,
    tumu: SEKTORLER,
    kaynak: kollar.kaynak,
  } as never);
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ParseDictPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("parse sözlüğü tür seçicisi × iş kolları", () => {
  it("ÖN KOŞUL — yapılandırma yokken tüm türler görünür (bugünkü davranış birebir)", async () => {
    /* Bu satır olmadan aşağıdaki daraltma iddiaları, hiçbir türü hiç
       göstermeyen bozuk bir render'la da yeşil kalırdı. */
    kur({ aktif: SEKTORLER, kaynak: "varsayilan" });
    await waitFor(() => expect(api.isKollari).toHaveBeenCalled());
    await waitFor(() => expect([...turSecici().options].length).toBeGreaterThan(5));
    const degerler = [...turSecici().options].map((o) => o.value);
    expect(degerler).toContain("menu");
    expect(degerler).toContain("tabela");
    expect(degerler).toContain("tisort");
  });

  it("MENÜCÜ kurulumunda tabela/tişört SEÇENEKTEN DÜŞER, kaçış kapısı kalır", async () => {
    kur({ aktif: ["menu-uretici"], kaynak: "yapilandirma" });
    await waitFor(() =>
      expect([...turSecici().options].map((o) => o.value)).not.toContain("tabela"),
    );
    const degerler = [...turSecici().options].map((o) => o.value);
    expect(degerler).toContain("menu");
    expect(degerler).not.toContain("tisort");
    expect(degerler, "iş kolundan bağımsız tür her kurulumda kalır").toContain("diger");
  });

  it("ASIL KAPI: ekleme GÖRÜNEN türü yazar, düşmüş varsayılanı DEĞİL", async () => {
    /* Varsayılan `type` durumu "tabela"dır. Menücü kurulumunda o tür listeden
       düşer; `etkinTur` düzeltmesi olmasa seçici ilk seçeneği gösterirken
       düğme hâlâ "tabela" gönderirdi ve sözlüğe kalıcı yanlış satır yazılırdı. */
    kur({ aktif: ["menu-uretici"], kaynak: "yapilandirma" });
    await waitFor(() =>
      expect([...turSecici().options].map((o) => o.value)).not.toContain("tabela"),
    );
    expect(turSecici().value, "seçici düşmüş değeri gösteriyor").not.toBe("tabela");

    fireEvent.change(screen.getByPlaceholderText(/tabela|kelime|sözcük/i), {
      target: { value: "kebap" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ekle/i }));
    await waitFor(() => expect(api.addParseSynonym).toHaveBeenCalled());
    const [, yazilanTur] = vi.mocked(api.addParseSynonym).mock.calls[0]!;
    expect(yazilanTur, "sözlüğe iş kolu dışı tür yazıldı").not.toBe("tabela");
    expect([...turSecici().options].map((o) => o.value)).toContain(yazilanTur);
  });

  it("OPERATÖRÜN SEÇİMİ korunur — türetme seçimi ezmez", async () => {
    kur({ aktif: ["menu-uretici"], kaynak: "yapilandirma" });
    await waitFor(() =>
      expect([...turSecici().options].map((o) => o.value)).not.toContain("tabela"),
    );
    fireEvent.change(turSecici(), { target: { value: "diger" } });
    fireEvent.change(screen.getByPlaceholderText(/tabela|kelime|sözcük/i), {
      target: { value: "kebap" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ekle/i }));
    await waitFor(() => expect(api.addParseSynonym).toHaveBeenCalledWith("kebap", "diger"));
  });
});
