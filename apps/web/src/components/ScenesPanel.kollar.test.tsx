// @vitest-environment jsdom
/* SAHNE TÜRÜ SEÇİCİSİ × KURULUM İŞ KOLLARI (K-1/C, örtü borcu).

   NEREDEN GELDİ: `2026-08-07-kurulum-daraltmasi-tek-kapi` paketinin açık
   bulgusu `K1C-DARALT-1`. Pozitif kontrol (hook hiç daraltmasın) altı
   yüzeyden yalnız üçünü kırmızıya döndürdü; bu panel kırılmayan üçten biriydi.
   `gorunurSahneTurleri` SAF olarak test ediliyordu (`gorunurSahneTuru.test.ts`,
   15 test) ama panelin o saf kuralı GERÇEKTEN çağırdığı hiç ölçülmemişti —
   kablo kopsa saf test yeşil kalırdı. Bu dosya kabloyu ölçer.

   ÖLÇÜLEN KAPSAM SINIRI AYNEN KORUNUYOR (`gorunurSahneTuru.ts` başlığındaki
   ölçüm): `mockup_tercihi` ilanı seyrektir — kayıt defterinde onu ilan eden
   tek şablon `garment`tır, dolayısıyla bu süzgeç bugün EN FAZLA BİR türü
   gizleyebilir. Aşağıdaki testler o bir türü ölçer ve daha fazlasını iddia
   ETMEZ; ilan büyüdüğü gün saf testler zaten kapsamı büyütür. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type MockupSceneDTO,
  type SceneKind,
} from "@tezgah/shared";
import { SEKTORLER } from "@tezgah/templates/identity";
import { api } from "../api";
import { ScenesPanel } from "./ScenesPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../api", () => ({
  api: {
    clientScenes: vi.fn(),
    deleteScene: vi.fn(),
    createScene: vi.fn(),
    updateScene: vi.fn(),
    isKollari: vi.fn(),
  },
}));

const FOTO_ID = "ast_sahne_foto";

function musteri(): ClientDTO {
  return {
    id: "cli_sahne",
    name: "Sahne Test",
    slug: "sahne-test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({ categories: [] }),
    assets: [
      {
        id: FOTO_ID,
        client_id: "cli_sahne",
        kind: "photo",
        filename: "vitrin.jpg",
        width_px: 1200,
        height_px: 900,
        urls: { original: "/a.jpg", thumb: "/a-t.jpg" },
      },
    ],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as unknown as ClientDTO;
}

function sahne(kind: SceneKind): MockupSceneDTO {
  return {
    id: "scn_1",
    client_id: "cli_sahne",
    name: "Vitrin sahnesi",
    kind,
    photo_asset_id: FOTO_ID,
    quad: [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ],
    settings: { blend: "normal", opacity: 0.9, fabric_color: "" },
    photo_urls: { original: "/a.jpg", thumb: "/a-t.jpg" },
    created_at: "2026-01-02T00:00:00Z",
  } as unknown as MockupSceneDTO;
}

/** Tür seçicisi = QuadEditor'ın "Sahne türü" select'i (kind_ değerleri taşır). */
function turSecici(): HTMLSelectElement {
  const secililer = screen.getAllByRole("combobox") as HTMLSelectElement[];
  const s = secililer.find((el) => [...el.options].some((o) => o.value === "vitrine"));
  if (!s) throw new Error("sahne türü seçicisi bulunamadı");
  return s;
}

async function kurVeDuzenle(
  kollar: { aktif: readonly string[]; kaynak: "varsayilan" | "yapilandirma" },
  kayitliTur: SceneKind = "vitrine",
) {
  vi.mocked(api.clientScenes).mockResolvedValue([sahne(kayitliTur)] as never);
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
      <MemoryRouter>
        <ScenesPanel client={musteri()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  /* Seçici YALNIZ düzenleyicide çizilir — listeden düzenlemeye girilir. */
  fireEvent.click(await screen.findByText("Düzenle"));

  /* DARALTMA SORGUSU ÇÖZÜLENE KADAR BEKLENİR — VE BU BİR YARIŞTAN ÖĞRENİLDİ:
     ilk yazımda seçenekler `options.length > 0` görülür görülmez okunuyordu.
     O koşul, sorgu daha yanıtlamadan da doğrudur (liste süzülmemiş hâliyle
     zaten çizilidir), yani test "daraltma OLMADI" değil "HENÜZ olmadı"
     ölçüyordu ve kırmızı düştü. Burada sözün GERÇEKTEN çözüldüğü beklenir. */
  await waitFor(() => expect(api.isKollari).toHaveBeenCalled());
  await vi.mocked(api.isKollari).mock.results[0]!.value;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("sahne türü seçicisi × iş kolları", () => {
  it("ÖN KOŞUL — yapılandırma yokken TÜM sahne türleri görünür", async () => {
    /* Bu satır olmadan aşağıdaki daraltma iddiası, hiç seçenek çizmeyen
       bozuk bir render'la da yeşil kalırdı. */
    await kurVeDuzenle({ aktif: SEKTORLER, kaynak: "varsayilan" });
    const degerler = [...turSecici().options].map((o) => o.value);
    expect(degerler).toContain("vitrine");
    expect(degerler, "ön koşul: gizlenebilir tür bugünkü listede VAR").toContain("garment");
  });

  it("TABELACI kurulumunda GİYİM sahnesi seçenekten DÜŞER", async () => {
    /* Panelin saf kuralı GERÇEKTEN çağırdığının kanıtı: kablo koparsa bu
       satır kırmızıya döner, `gorunurSahneTuru.test.ts` ise yeşil kalırdı. */
    await kurVeDuzenle({ aktif: ["tabelaci"], kaynak: "yapilandirma" });
    await waitFor(() =>
      expect([...turSecici().options].map((o) => o.value)).not.toContain("garment"),
    );
    expect([...turSecici().options].map((o) => o.value), "ilansız türler her kurulumda kalır")
      .toContain("vitrine");
  });

  it("SEÇİLİ TÜR KORUNUR: kayıtlı giyim sahnesi tabelacı kurulumunda da doğru görünür", async () => {
    /* Görünürlük daraltması, VERİYİ yanlış göstermeye dönüşemez. Korunan tür
       listeden düşseydi kontrollü select'in değeri listede bulunmaz, tarayıcı
       ilk seçeneği gösterir, operatör sahnesinin türünü YANLIŞ okur ve
       kaydettiğinde türü sessizce DEĞİŞTİRİRDİ.

       ÖLÇÜMÜN SINIRI AÇIKÇA: bu iddia TEK BAŞINA "korundu"yu "daraltma hiç
       uygulanmadı"dan ayıramaz — ikisinde de `garment` listede kalır.
       Ayrımı yapan şey bir üstteki testtir: AYNI kurgu, AYNI bekleme ve
       `aktif:["tabelaci"]` ile `garment` gerçekten DÜŞÜYOR. Yani kablonun bu
       harness altında canlı olduğu ölçülmüştür; burada ölçülen, korumanın o
       canlı kabloya rağmen türü tuttuğudur. */
    await kurVeDuzenle({ aktif: ["tabelaci"], kaynak: "yapilandirma" }, "garment");
    expect([...turSecici().options].map((o) => o.value)).toContain("garment");
    expect(turSecici().value, "kontrollü select düşmüş değere düştü").toBe("garment");
  });
});
