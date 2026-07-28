// @vitest-environment jsdom
/* ProjectsPanel.startDesign — YETİM BELGE TELAFİSİ zinciri testleri
   (journal 2026-07-28-web-bilesen-testleri; şerhli üçüncü zincir).

   NEDEN BU DOSYA VAR: klon-kapisi-yetim-telafi paketi (journal 2026-07-27)
   ProjectsPanel.tsx:96-121'e geri sarma zincirini yazdı ama KOŞAMADI —
   apps/web'de o gün bileşen test altyapısı yoktu. Bu dosya o borcu kapatır:
   createDocument → updateDocument(params) → başarısızlıkta deleteDocument
   (best-effort) → hata yeniden fırlar → onError toast'ı gerekçeyi gösterir
   zincirinin HER halkası burada gerçek bileşen render'ıyla ölçülür.

   SARMA GEREKÇESİ (keşif reçetesi + bu dosyada doğrulandı):
   - ItemRow/PasteBox EXPORT EDİLMİYOR (ProjectsPanel.tsx'te modül-içi) —
     exported ProjectsPanel render edilir, kalem `api.clientProjects` mock'unun
     döndürdüğü ProjectDTO fikstüründen akar. Bu aynı zamanda daha dürüst bir
     ölçümdür: kalem satırı, üretimdeki gerçek veri yolundan (query → map →
     ItemRow) kurulur, elle monte edilmez.
   - QueryClientProvider retry:false — react-query'nin varsayılan 3 deneme
     geri-çekilmesi testte mutation hatasını dakikalarca geciktirirdi; üretim
     davranışını değil test hızını etkiler (mutation'larda varsayılan retry
     zaten 0'dır, query'ler için kapatıldı).
   - MemoryRouter: useNavigate gerçek router bağlamında çalışsın diye.

   NAVİGASYON NASIL ÖLÇÜLÜYOR (karar + gerekçe): useNavigate MOCK'LANMADI.
   Gerekçe: react-router-dom'u kısmi mock'lamak, bileşenin gerçek router
   sözleşmesini (Router bağlamı, relative path çözümü) ölçüm dışına iter ve
   modül-mock'u dosyadaki DİĞER gerçek router kullanımını (MemoryRouter,
   useLocation) da taklide çevirirdi. Bunun yerine MemoryRouter içine bir
   KONUM SONDASI (useLocation okuyan minik bileşen) konur: navigate gerçekten
   koşarsa router konumu değişir ve sonda DOM'da yeni pathname'i gösterir —
   iddia "navigate çağrıldı" değil "router GERÇEKTEN /editor/<id>'ye gitti"
   olur (davranış ölçümü, uygulama detayı değil).

   window.confirm KARARI: confirm YALNIZ ≥2 şablon seçeneğinde devreye girer
   (ProjectsPanel.tsx:90-95); ölçüm — SIPARIS_SABLONLARI (identity/index.ts):
   yalnız menu 2 seçenekli, vitrophanie=["vitro-centre"] ve flyer=["flyer"]
   TEK seçenekli. Fikstürler vitrophanie/flyer olduğundan confirm hiç
   koşmamalı; yine de jsdom'un "not implemented" gürültüsüne karşı spy takılır
   ve HİÇ çağrılmadığı AYRICA iddia edilir — tek-seçenek yolunun confirm'süz
   olduğu sözleşmesi böylece testle çivilenir (sessiz güvence değil, ölçüm).

   KAPSAM DIŞI ŞERHİ: toast'ın 4500ms'de kendini silmesi (ProjectsPanel.tsx:472)
   test EDİLMEZ — fake-timer kurulumu react-query'nin kendi zamanlayıcılarıyla
   çakışır (retry/gc zamanlayıcıları), kazanılan güvence tek satırlık bir
   setTimeout'a değmez. Testler toast'ı belirme anında okur. */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CatalogSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentDTO,
  type OrderItemDTO,
  type ProjectDTO,
} from "@tezgah/shared";
import { siparisParamlari } from "@tezgah/templates/identity";
import { api } from "../api";
import { ProjectsPanel } from "./ProjectsPanel";

/* MOCK KÜMESİ — ProjectsPanel.tsx okunarak TAM çıkarıldı (eksik mock sessiz
   gerçek fetch'e düşer; jsdom'da bu "fetch is not defined" yerine sessiz
   unhandled rejection üretebilir — o yüzden bileşen ağacının DOKUNDUĞU her uç
   burada). Render sırasında koşanlar: clientProjects (panel query, :477) +
   clients (PasteBox query, :258). Kalanlar yalnız olay tetikli mutation'lar —
   bu testlerde çoğu ÇAĞRILMAMALI, vi.fn() olarak var olmaları yeter (çağrı
   olursa undefined döner ve iddialar zaten kırmızıya düşer). */
vi.mock("../api", () => ({
  api: {
    /* render'da koşan query'ler */
    clients: vi.fn(),
    clientProjects: vi.fn(),
    /* startDesign zincirinin ölçülen uçları */
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateOrderItem: vi.fn(),
    /* olay tetikli diğer uçlar (bu testlerde tetiklenmez; küme tamlığı için) */
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

/* ClientDTO — analyzeDoc.test.ts:34-63 deseninden: brandkit/catalog şema
   yardımcılarıyla kurulur (elle kurulan nesne şema default'larını kaçırır,
   üretimde hiç oluşmayan şekille yeşil olurdu). Katalog boş: bu testler
   sipariş kalemi akışını ölçer, katalog içeriği ilgisizdir. */
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

/* OrderItemDTO — alan kümesi schemas.ts:461-474'ten birebir. document_id NULL
   ŞART: buton dallanması (ProjectsPanel.tsx:165-173) ancak o zaman "Tasarıma
   başla"yı gösterir. Vitrophanie varsayılanı BİLİNÇLİ: geri sarma zinciri
   ancak params ÜRETEN bir türde koşar (params null ise updateDocument hiç
   çağrılmaz — o dal 4. testin konusu). width/height/side/mode dolu → hem
   siparisParamlari param üretir hem missingFields boş kalır (kırmızı rozet
   gürültüsü olmadan temiz DOM). side="exterieur" → miroir uyarısı da yok. */
function vitroKalem(): OrderItemDTO {
  return {
    id: "item_vitro",
    project_id: "proj_1",
    product_type: "vitrophanie",
    qty: 1,
    width_cm: 120,
    height_cm: 80,
    details: { side: "exterieur", mode: "impression" },
    notes: "",
    status: "olcu_bekliyor",
    document_id: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
}

/* Flyer kalemi — 4. testin (params'sız tür) fikstürü. ÖLÇÜM: identity
   PARAM_AKISI'nda flyer:null (menu/trifold/fidelite/diger de null) ve
   SIPARIS_SABLONLARI.flyer=["flyer"] TEK seçenek. menu DEĞİL çünkü menu 2
   seçenekli → window.confirm devreye girerdi; diger DEĞİL çünkü 0 seçenek →
   hiç belge yaratılmaz, ölçmek istediğimiz "belge var ama params yok" yolu
   koşmazdı. format dolu → missingFields boş (rozet gürültüsüz DOM). */
function flyerKalem(): OrderItemDTO {
  return {
    ...vitroKalem(),
    id: "item_flyer",
    product_type: "flyer",
    width_cm: null,
    height_cm: null,
    details: { format: "a4" },
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

/* DocumentDTO — startDesign yalnız doc.id okur (ProjectsPanel.tsx:96-125:
   updateDocument(doc.id,...) · deleteDocument(doc.id) · navigate(/editor/id)).
   Tam DocumentState fikstürü buraya HİÇBİR ölçüm katmazdı; kalan alanların
   yokluğu cast ile açıkça beyan edilir (sessizce any'e düşmek yerine). */
const belge = (id: string): DocumentDTO => ({ id } as unknown as DocumentDTO);

/* KONUM SONDASI — navigate ölçümü (dosya başındaki gerekçe): MemoryRouter'ın
   GERÇEK konumunu DOM'a yazar; iddialar mock çağrı listesi değil router
   davranışı okur. */
function KonumSondasi() {
  const loc = useLocation();
  return <div data-testid="konum">{loc.pathname}</div>;
}

const BASLANGIC_YOLU = "/clients/cli_test";

function panelRender(client: ClientDTO) {
  /* Her test kendi QueryClient'ını alır: paylaşılan cache, önceki testin
     query sonucunu sızdırıp "render'da hangi mock koştu" ölçümünü bozardı. */
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[BASLANGIC_YOLU]}>
        <ProjectsPanel client={client} />
        <KonumSondasi />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/* Sunucunun ölçülmüş 400 gerekçesi (ProjectsPanel.tsx:103-105 şerhi: sipariş
   width_cm=5000 → belge şeması Zod max 2000 reddi; api.ts apiErrorMessage bunu
   Türkçe-okunur metne çevirir). Testte aynı biçimde üretilir. */
const ASIL_HATA = "Geçersiz veri — Number must be less than or equal to 2000";

async function tasarimaBasla(container: HTMLElement) {
  const buton = await waitFor(() => {
    /* Panel query'si (clientProjects) resolve olana dek kalem satırı yok —
       buton görünene kadar beklenir. Metin tr.json:293'ten ölçüldü. */
    const b = Array.from(container.querySelectorAll("button")).find(
      (x) => x.textContent === "Tasarıma başla"
    );
    expect(b).toBeTruthy();
    return b as HTMLButtonElement;
  });
  fireEvent.click(buton);
}

describe("ProjectsPanel · startDesign geri sarma zinciri", () => {
  let confirmSpy: MockInstance<(message?: string) => boolean>;

  beforeEach(() => {
    vi.clearAllMocks();
    /* render'da koşan iki query'nin varsayılanları — her test üstüne yazar */
    vi.mocked(api.clients).mockResolvedValue([]);
    vi.mocked(api.clientProjects).mockResolvedValue([proje([vitroKalem()])]);
    /* confirm nöbetçisi (dosya başındaki karar): tek-seçenek fikstürlerinde
       HİÇ çağrılmamalı; çağrılırsa jsdom "not implemented" gürültüsü yerine
       kontrollü true döner ve iddia kırmızıya düşer. */
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("fikstür ön-ölçümü: vitrophanie param üretir, flyer null döner (identity, mock'suz)", () => {
    /* Bu test fikstür SEÇİMİNİ çiviler: identity GERÇEK modül olarak koşar
       (yalnız ../api mock'lu). Vitrophanie'nin ürettiği nesne PARAM_AKISI'ndan
       (identity/index.ts:304-309) LİTERAL beklenir — siparisParamlari'yı kendi
       çıktısıyla doğrulamak totoloji olurdu, o yüzden beklenen elle yazılır.
       flyer null dönmeyi bırakırsa (birine param akışı eklenirse) 4. test
       sessizce yanlış dalı ölçmeye başlamadan BURASI patlar. */
    expect(siparisParamlari(vitroKalem())).toEqual({
      w_cm: 120,
      h_cm: 80,
      mode: "impression",
      miroir: false, // side="exterieur" → içten-uygulama önerisi kapalı
    });
    expect(siparisParamlari(flyerKalem())).toBeNull();
  });

  it("updateDocument reddi → deleteDocument DOĞRU id ile koşar, kalem bağlanmaz, toast gerekçeyi gösterir", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_401"));
    vi.mocked(api.updateDocument).mockRejectedValue(new Error(ASIL_HATA));
    vi.mocked(api.deleteDocument).mockResolvedValue({ ok: true });

    const { container, getByTestId } = panelRender(musteri());
    await tasarimaBasla(container);

    /* Zincirin ilk iki halkası ölçülür: belge doğru şablon+projeyle yaratıldı
       (vitro-centre = SIPARIS_SABLONLARI.vitrophanie tek seçeneği) ve params
       ön-ölçüm testindeki LİTERAL nesneyle gönderildi. */
    await waitFor(() => {
      expect(api.createDocument).toHaveBeenCalledWith("cli_test", "vitro-centre", "proj_1");
      expect(api.updateDocument).toHaveBeenCalledWith("doc_401", {
        params: { w_cm: 120, h_cm: 80, mode: "impression", miroir: false },
      });
      /* GERİ SARMA: silme, YARATILAN belgenin id'siyle — başka değil */
      expect(api.deleteDocument).toHaveBeenCalledTimes(1);
      expect(api.deleteDocument).toHaveBeenCalledWith("doc_401");
    });

    /* Kalem BAĞLANMAMALI: updateOrderItem koşsaydı sipariş, params'ı reddedilen
       (yanlış ölçülü) belgeye bağlanır ve operatör yanlış ölçüyle tasarlardı —
       telafinin varlık sebebi tam olarak bu çağrının OLMAMASI. */
    expect(api.updateOrderItem).not.toHaveBeenCalled();

    /* Toast: onError (ProjectsPanel.tsx:139) "Tasarıma başlanamadı: <gerekçe>"
       biçer (tr.json:294 + Error.message). DOM'dan okunur — state değil. */
    await waitFor(() => {
      const toast = container.querySelector(".toast");
      expect(toast?.textContent).toContain("Tasarıma başlanamadı");
      expect(toast?.textContent).toContain(ASIL_HATA);
    });

    /* Navigasyon OLMAMALI: onSuccess koşmadı, sonda başlangıç yolunda kalır */
    expect(getByTestId("konum").textContent).toBe(BASLANGIC_YOLU);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("best-effort: deleteDocument DA reddederse toast yine ASIL hatayı gösterir (telafi hatası örtmez)", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_402"));
    vi.mocked(api.updateDocument).mockRejectedValue(new Error(ASIL_HATA));
    /* Silme de düşer (belge yetim kalır) — ProjectsPanel.tsx:112-116'daki boş
       catch'in sözleşmesi: telafinin KENDİ hatası asıl hatayı gölgelememeli. */
    vi.mocked(api.deleteDocument).mockRejectedValue(new Error("Sunucu hatası (500)"));

    const { container } = panelRender(musteri());
    await tasarimaBasla(container);

    await waitFor(() => {
      /* Silme DENENDİ (best-effort'un "effort" yarısı ölçülür)... */
      expect(api.deleteDocument).toHaveBeenCalledWith("doc_402");
      /* ...ama toast'ta görünen ASIL gerekçedir, silme hatası DEĞİL */
      const toast = container.querySelector(".toast");
      expect(toast?.textContent).toContain("Tasarıma başlanamadı");
      expect(toast?.textContent).toContain(ASIL_HATA);
      expect(toast?.textContent).not.toContain("Sunucu hatası (500)");
    });
    expect(api.updateOrderItem).not.toHaveBeenCalled();
  });

  it("başarılı yol regresyonu: kalem {document_id, tasarimda} ile bağlanır ve router /editor/<id>'ye gider", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_ok"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("doc_ok"));
    /* updateOrderItem sözleşmesi (api.ts:177-192): {item}|{missing} döner,
       startDesign sonucu okumaz — boş nesne yeter. */
    vi.mocked(api.updateOrderItem).mockResolvedValue({});

    const { container, getByTestId } = panelRender(musteri());
    await tasarimaBasla(container);

    await waitFor(() => {
      expect(api.updateOrderItem).toHaveBeenCalledWith("item_vitro", {
        document_id: "doc_ok",
        status: "tasarimda",
      });
      /* Navigasyon ölçümü (dosya başındaki karar): mock değil, MemoryRouter'ın
         gerçek konumu — navigate(/editor/doc_ok) koştuysa sonda onu gösterir. */
      expect(getByTestId("konum").textContent).toBe("/editor/doc_ok");
    });
    expect(api.deleteDocument).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled(); // tek seçenek → sorusuz
  });

  it("params'sız tür (flyer): updateDocument HİÇ koşmadan kalem bağlanır", async () => {
    /* Ölçülen dal (ProjectsPanel.tsx:97-119): siparisParamlari null → if(params)
       bloğu (update + telafi) tümden atlanır, doğrudan bağlama adımına geçilir.
       flyer seçiminin gerekçesi flyerKalem() şerhinde + ön-ölçüm testinde. */
    vi.mocked(api.clientProjects).mockResolvedValue([proje([flyerKalem()])]);
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_flyer"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({});

    const { container, getByTestId } = panelRender(musteri());
    await tasarimaBasla(container);

    await waitFor(() => {
      expect(api.createDocument).toHaveBeenCalledWith("cli_test", "flyer", "proj_1");
      expect(api.updateOrderItem).toHaveBeenCalledWith("item_flyer", {
        document_id: "doc_flyer",
        status: "tasarimda",
      });
      expect(getByTestId("konum").textContent).toBe("/editor/doc_flyer");
    });
    /* Çekirdek iddia: params yok → belge güncelleme (ve dolayısıyla telafi
       makinesi) HİÇ devreye girmedi */
    expect(api.updateDocument).not.toHaveBeenCalled();
    expect(api.deleteDocument).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled(); // flyer tek seçenek → sorusuz
  });
});
