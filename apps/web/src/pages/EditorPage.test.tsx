// @vitest-environment jsdom
/* EditorPage — İLK BİLEŞEN TESTİ (journal 2026-07-28-web-bilesen-testleri).

   NEDEN BU DOSYA VAR: `sunucu-params` paketi (journal 2026-07-27-sunucu-params-
   dogrulamasi) EditorPage'e iki düzeltme yazdı ve İKİSİNİ DE "satır satır okundu
   ama KOŞULARAK doğrulanamadı" diye şerhledi — o gün web tarafında bileşen testi
   koşacak altyapı yoktu. Bu dosya o iki şerhi ölçüme çevirir:

   1) SAYI-INPUT BOŞ GİRDİ TUZAĞI (EditorPage.tsx onChange, ~:442-478):
      Eski kod alan boşaltılınca Number("")===0'ı yerel state'e YAZIYORDU.
      Zincirleme sonuç: 2 sn debounce → PUT {w_cm: 0} → sunucu Zod'u
      (VitroParamsSchema.w_cm: positive) 400 döner → saveState "error" →
      otomatik-kayıt effect'i saveState "dirty" olmadan YENİDEN DENEMEZ →
      kayıt KALICI kilitlenir; üstelik input "0" gösterdiği için operatör
      neyin bozulduğunu göremezdi. Yeni davranış: boş/sonlu-olmayan girdi hiç
      PATCH'lenmez; kontrollü input React'in restoreControlledState mekanizması
      ile bir önceki geçerli değere GERİ DÖNER (snap-back).

   2) SAVE 400 → HATA SEBEBİYLE GÖRÜNÜR (EditorPage.tsx effect ~:108-131 +
      üst bar gösterimi ~:544-552): eskiden catch yalnız saveState'i "error"
      yapardı, ekranda salt "Kayıt hatası!" kalırdı — operatör NEYİ
      düzelteceğini göremezdi. Yeni davranış: Error.message (api.ts
      apiErrorMessage'ın Türkçe-okunur gerekçesi) saveError'da tutulur ve
      başlığın YANINDA sergilenir; başarılı kayıt bayat gerekçeyi temizler.

   SARMA REÇETESİ (keşif raporundan; bu koşumda doğrulandı):
   - EditorPage react-konva import ETMİYOR (ölçüldü: grep konva → 0 eşleşme
     EditorPage + SlotPanel + SelectionPanel + DocumentsPanel + vitrophanie
     ailesinde) — jsdom'da render edilebilir; canvas SVG'dir.
   - Router: useParams (:73) → MemoryRouter + /editor/:id rotası.
   - QueryClientProvider retry:false — reject'ler yeniden denenip testi
     yavaşlatmasın/zamanlamayı bozmasın.
   - vi.mock("../api"): render yolunda GERÇEKTEN erişilen altı üye mock'lanır
     (document, client, clientScenes, documentExports, cmykStatus,
     updateDocument). Ötesi (updateClient, mockupDocument, ...) yalnız
     mutationFn KAPANIŞLARINDA yaşar, testte çağrılmaz — mock'a eklemek ölü
     yüzey şişirmek olurdu.
   - Fikstür DESENİ packages/templates/src/vitrophanie/analyze.test.ts:11-37'den
     ödünç: DocumentState ELLE kurulmaz, DocumentStateSchema.parse'tan geçer
     (şema default'ları — cd_version/theme_id/selection/overrides — elle kurulan
     nesnede eksik kalır ve test üretimde hiç oluşmayan belge şekliyle yeşil
     olur; apps/web/src/lib/analyzeDoc.test.ts aynı gerekçeyi taşır). Şablon
     GERÇEK kayıt defteri id'si `vitro-bandeau` — w_cm sayı paramı ve sunucu
     Zod'unun positive() sınırı tam da 1. zincirin konusu.
   - zustand useEditor GLOBAL bir store'dur ve load() aynı docId'yi yeniden
     yüklemez (editorStore.ts:35) — testler arası setState ile sıfırlanır VE
     her test farklı doc id kullanır (çifte emniyet).
   - Element.prototype.scrollIntoView jsdom'da yok — eksik-foto listesine
     tıklanırsa patlamasın diye stub'lanır (bu testlerde tıklanmıyor; stub
     savunma amaçlı, reçeteden).

   ZAMANLAYICI DİSİPLİNİ: ilk yükleme (react-query fetch → useEffect → load)
   GERÇEK zamanlayıcılarla beklenir (findByText, RTL'in kendi waitFor'u), fake
   timer ANCAK belge yüklendikten sonra açılır. Gerekçe ölçülüdür: RTL'in
   waitFor'u fake-timer tespitini jest globaline bakarak yapar; vitest'te jest
   globali olmadığından fake timer altında findBy* gerçek setTimeout bekler —
   ki o da fake'tir → sonsuz bekleme. Debounce penceresi bu yüzden
   `await act(async () => vi.advanceTimersByTimeAsync(...))` ile İLERLETİLİR:
   async varyant, timer callback'inin tetiklediği promise zincirini
   (updateDocument.then/catch → setState) mikrotask'larıyla birlikte akıtır;
   act sarmalı React'in state flush'ını garanti eder. */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
  type DocumentDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { useEditor } from "../store/editorStore";
import { EditorPage } from "./EditorPage";

/* React 18, IS_REACT_ACT_ENVIRONMENT bayrağı olmadan act() kullanımında uyarı
   basar. RTL bu bayrağı normalde kendi beforeAll kancasıyla kurar ama o kanca
   YALNIZ vitest `globals: true` iken kayıt olur (RTL index.js `typeof
   beforeAll === "function"` bakar) — bu depoda globals kapalı (vite.config.ts
   test bloğu yok; analyzeDoc.test.ts da her şeyi açıkça import eder). Aynı
   sebepten RTL'in otomatik cleanup'ı da kayıt olmaz → afterEach(cleanup)
   aşağıda ELLE. */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ../api mock'u — EditorPage'in render yolunda eriştiği altı üye. vi.mock
   hoist edildiği için fikstürler factory İÇİNDE kurulamaz; fonksiyonlar boş
   vi.fn() doğar, davranışları beforeEach'te vi.mocked(...) ile verilir. */
vi.mock("../api", () => ({
  api: {
    document: vi.fn(),
    client: vi.fn(),
    clientScenes: vi.fn(),
    documentExports: vi.fn(),
    cmykStatus: vi.fn(),
    updateDocument: vi.fn(),
  },
}));

/* Fikstür: brandkit'li + kataloglu müşteri (vitrophanie/analyze.test.ts deseni).
   defaultBrandKit() + CatalogSchema.parse — elle kurulmuş yarım nesne değil,
   şemanın default'larıyla dolmuş GERÇEK üretim şekli. */
function makeClient(): ClientDTO {
  return {
    id: "cli_editor",
    name: "Editor Test",
    slug: "editor-test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "c1",
          name_fr: "Menüler",
          order: 1,
          items: Array.from({ length: 4 }, (_, i) => ({
            id: `it${i}`,
            name_fr: `Ürün ${i}`,
            order: i,
            prices: [{ label: "seul", value: 8 + i }],
          })),
        },
      ],
    }),
    assets: [],
    created_at: "2026-07-28T00:00:00Z",
    updated_at: "2026-07-28T00:00:00Z",
  };
}

/* w_cm 180 BİLEREK default'tan (100) farklı seçildi: snap-back asserti
   "input default'a düştü" ile "input SAKLANAN değere döndü"yü ayırt edebilsin.
   h_cm 60 da w_cm'den farklı — displayValue karışması imkânsızlaşır. */
function makeDoc(id: string): DocumentDTO {
  return {
    ...DocumentStateSchema.parse({
      template_id: "vitro-bandeau",
      params: { w_cm: 180, h_cm: 60 },
    }),
    id,
    project_id: "prj_editor",
    client_id: "cli_editor",
    created_at: "2026-07-28T00:00:00Z",
    updated_at: "2026-07-28T00:00:00Z",
  };
}

function renderEditor(docId: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/editor/${docId}`]}>
        <Routes>
          <Route path="/editor/:id" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/* SEÇİCİ GEREKÇESİ: EditorPage sayı paramını <label class="kbd-hint"> +
   <input type="number"> KARDEŞ elemanları olarak aynı span içinde çizer;
   htmlFor/id bağı YOK → getByLabelText çalışmaz (ölçüldü: EditorPage.tsx
   :446-475'te htmlFor geçmiyor). Bu yüzden manifest'in label_tr'ı ("Genişlik
   (cm)" — packages/templates/src/vitrophanie/manifest.ts:55, tek kaynak) ile
   etiket bulunur, input AYNI span kapsamında aranır — w_cm/h_cm karışması
   yapısal olarak imkânsız. Çıplak `input[type=number]` + sıra indeksi
   REDDEDİLDİ: manifest param sırası değişse test sessizce yanlış inputu
   ölçerdi; etiket-kapsamı değişirse burası GÜRÜLTÜYLE kırılır. */
async function wcmInput(): Promise<HTMLInputElement> {
  const label = await screen.findByText("Genişlik (cm)");
  const input = label.parentElement?.querySelector<HTMLInputElement>('input[type="number"]');
  if (!input) throw new Error("w_cm sayı inputu etiket kapsamında bulunamadı — üst bar yapısı değişmiş");
  return input;
}

beforeEach(() => {
  /* zustand GLOBAL — testler arası tam sıfırlama (load() aynı docId'yi
     yeniden yüklemez; bayat doc/saveState bir sonraki testi kirletirdi) */
  useEditor.setState({ docId: null, doc: null, past: [], future: [], selectedSlot: null, saveState: "idle" });
  vi.clearAllMocks();
  vi.mocked(api.document).mockImplementation((id) => Promise.resolve(makeDoc(id)));
  vi.mocked(api.client).mockResolvedValue(makeClient());
  vi.mocked(api.clientScenes).mockResolvedValue([]);
  vi.mocked(api.documentExports).mockResolvedValue([]);
  vi.mocked(api.cmykStatus).mockResolvedValue({ available: false, version: null });
  vi.mocked(api.updateDocument).mockImplementation((id) => Promise.resolve(makeDoc(id)));
  /* jsdom scrollIntoView taşımaz — eksik-foto tıklaması olursa patlamasın */
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup(); /* unmount → autosave effect cleanup'ı bekleyen debounce'u temizler */
  vi.useRealTimers();
});

describe("EditorPage — zincir 1: sayı-input boş girdi tuzağı (onChange guard)", () => {
  it("boş girdi PATCH'lenmez (param + saveState değişmez, input snap-back); geçerli girdi 250 işler", async () => {
    renderEditor("doc-zincir-1");
    const input = await wcmInput();

    /* Ön koşul: belge yüklendi, görünen ile saklanan mutabık */
    expect(input.value).toBe("180");
    expect(useEditor.getState().doc?.params["w_cm"]).toBe(180);
    expect(useEditor.getState().saveState).toBe("idle");

    /* ---- boş girdi: alan temizlendi (kullanıcı yeni değer yazmak için sildi) ---- */
    fireEvent.change(input, { target: { value: "" } });

    /* ESKİ DAVRANIŞ BURADA ŞÖYLE BOZULURDU: Number("")===0 params'a yazılır,
       saveState "dirty" olur, 2 sn sonra PUT {w_cm:0} gider, sunucu Zod'u
       (positive) 400 döner, saveState "error"a düşer ve effect "dirty"
       olmadan yeniden denemediği için kayıt KALICI kilitlenirdi. Üç ölçüm
       birden o zincirin İLK halkasını yokluyor:
       1) saklanan param değişmedi, */
    expect(useEditor.getState().doc?.params["w_cm"]).toBe(180);
    /* 2) saveState "idle" KALDI — patch hiç olmadı, yani debounce PUT'u
          tetikleyecek "dirty" geçişi hiç doğmadı (bozuk PUT'un kökü kurudu), */
    expect(useEditor.getState().saveState).toBe("idle");
    /* 3) görünen değer saklanana GERİ DÖNDÜ (snap-back): onChange state'i
          değiştirmeyince React kontrollü inputu prop değerine restore eder.
          Görünen ile saklanan ayrışmıyor — eski kodda input "0" gösterirdi. */
    expect(input.value).toBe("180");

    /* ---- geçerli girdi: 250 hem saklanır hem görünür ---- */
    fireEvent.change(input, { target: { value: "250" } });
    expect(useEditor.getState().doc?.params["w_cm"]).toBe(250);
    expect(input.value).toBe("250");
    /* patch gerçekleşti → autosave zinciri meşru şekilde kuruldu */
    expect(useEditor.getState().saveState).toBe("dirty");

    /* ŞERH — guard'ın ikinci kolu (!Number.isFinite) burada AYRICA test
       edilmiyor: jsdom (spec'e uygun) number inputta "abc" gibi değeri ""'a
       sanitize eder, yani o kol bu bileşen sınırından ayrı bir girdiyle
       tetiklenemez; "" kolu üzerinden aynı return yolu zaten ölçülüyor. */
  });
});

describe("EditorPage — zincir 2: save 400 → saveError SEBEBİYLE görünür, başarı temizler", () => {
  it("2 sn debounce → PUT; reject → 'Kayıt hatası!' + gerekçe; sonraki başarılı kayıt hatayı siler", async () => {
    renderEditor("doc-zincir-2");
    const input = await wcmInput(); /* ilk yükleme GERÇEK timer'larla bitti */

    /* Fake timer ANCAK yükleme sonrası — gerekçe dosya başındaki zamanlayıcı
       disiplini şerhinde. Sunucunun 400 gövdesinden api.ts apiErrorMessage'ın
       üreteceği türden Türkçe-okunur bir gerekçe reject'lenir: bu testin
       ölçtüğü şey mesajın İÇERİĞİ değil (o api-error.ts'in malı, kendi
       testleri orada), mesajın DOM'A KADAR TAŞINDIĞIDIR. */
    vi.useFakeTimers();
    const GEREKCE = "Geçersiz veri — params.w_cm: pozitif olmalı";
    vi.mocked(api.updateDocument).mockRejectedValueOnce(new Error(GEREKCE));

    fireEvent.change(input, { target: { value: "250" } });
    expect(vi.mocked(api.updateDocument)).not.toHaveBeenCalled();

    /* Debounce SINIRI da ölçülür: 1999 ms'te PUT hâlâ yok (erken-ateşleme
       regresyonu — ör. debounce'un yanlışlıkla kaldırılması — burada yakalanır),
       2000. ms'te tam bir kez var. */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(vi.mocked(api.updateDocument)).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(vi.mocked(api.updateDocument)).toHaveBeenCalledTimes(1);
    /* PUT gövdesi doğru belgeye doğru param'ı taşıyor */
    expect(vi.mocked(api.updateDocument)).toHaveBeenCalledWith(
      "doc-zincir-2",
      expect.objectContaining({
        template_id: "vitro-bandeau",
        params: expect.objectContaining({ w_cm: 250 }),
      })
    );

    /* KIRMIZI-KANIT BU KOLDA İÇKİNDİR (üretim kodu bozulmadan): reject'i mock
       üretir; catch → setSaveError → gösterim zincirinin HERHANGİ bir halkası
       kopsa (ör. saveError hiç set edilmese ya da span salt başlığı bassa)
       aşağıdaki tam-metin eşleşmesi kırmızıya döner. Başlık ve gerekçe AYNI
       span'ın ardışık metin düğümleridir (EditorPage.tsx :548-551); RTL'in
       getByText'i düğümleri birleştirip normalize ettiği için tek sorguda
       İKİSİ BİRDEN doğrulanır — "Kayıt hatası!" var ama sebep yok durumu
       geçemez. */
    expect(useEditor.getState().saveState).toBe("error");
    expect(screen.getByText(`Kayıt hatası! ${GEREKCE}`)).toBeTruthy();

    /* ---- düzelme: kullanıcı yeni değer girer, sunucu artık kabul eder ---- */
    /* beforeEach'teki default resolve implementasyonu hâlâ yerinde (yukarıdaki
       reject `mockRejectedValueOnce` idi) — ayrıca resolve kurmak gerekmez. */
    fireEvent.change(input, { target: { value: "260" } });
    /* patch → "dirty": saveState-"error" kilidi tam da böyle çözülür (effect
       yalnız "dirty"de yeniden PUT dener — EditorPage.tsx :102-107 şerhi) */
    expect(useEditor.getState().saveState).toBe("dirty");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(vi.mocked(api.updateDocument)).toHaveBeenCalledTimes(2);

    /* Başarı: durum "saved", hata VE gerekçesi ekrandan silindi — bayat
       "Kayıt hatası!" asılı kalmıyor (düzeltmenin ikinci yarısı: başarılı
       kayıt setSaveError(null) çağırır) */
    expect(useEditor.getState().saveState).toBe("saved");
    expect(screen.getByText("Kaydedildi")).toBeTruthy();
    expect(screen.queryByText(/Kayıt hatası!/)).toBeNull();
  });
});
