// @vitest-environment jsdom
/* YAPIŞTIR ÖNİZLEMESİ ↔ KALEM ÖZETİ TEK KAYNAK testleri
   (şerh: "PasteBox parse önizlemesi kalem özetini İKİNCİ KEZ elle yazar
   (`itemSummary` kullanmaz — technique/print_qty/substrat göstermez)" —
   önizleme paketi borç listesi, 2026-07-26).

   NEDEN AYRI DOSYA: ProjectsPanel.test.tsx kendi başlığında kapsamını
   "startDesign — YETİM BELGE TELAFİSİ zinciri" olarak ilan eder; yapıştır
   önizlemesi o zincirin parçası değildir. Aynı dosyaya eklemek o ilanı
   sessizce genişletirdi.

   ÖLÇÜLEN YARA — CANLI (latent değil): `Detay: nakis` satırı ayrıştırıcıda
   `details.technique = "broderie"` üretir (parse.ts:104, bu turda komutla
   ölçüldü). Önizleme elle yazıldığı için technique'i HİÇ basmıyordu; yani
   operatörün ONAYLADIĞI yüzey, YARATILAN kaydın taşıdığı bilgiden eksikti.
   Substrat (ilandan türetilen ticari bilgi) de yalnız işlenmiş kalem
   satırındaydı. Bu dosya ikisini de önizlemede çivi ler.

   print_qty KAPSAM DIŞI ve bu BİLİNÇLİ: ayrıştırıcı print_qty ÜRETMİYOR
   (`extractDetails` yalnız side/mode/technique yazar) — yani bu yoldan bugün
   erişilemez. "Erişilebilir kod yolu" ile "bugün erişilen kod yolu" ayrı
   şeylerdir (analyzeDoc dersi, TODO 2026-07-27); tek kaynağa bağlanmanın
   kazancı, ayrıştırıcı print_qty ürettiği gün önizlemenin kendiliğinden
   göstermesidir — bugün ölçülecek bir vaka DEĞİLDİR ve öyleymiş gibi
   iddia edilmez.

   SARMA GEREKÇESİ ProjectsPanel.test.tsx ile aynı: PasteBox export
   EDİLMİYOR, exported ProjectsPanel render edilir ve önizleme gerçek veri
   yolundan (textarea → parseOrderText → setParsed) kurulur. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogSchema, defaultBrandKit, type ClientDTO } from "@tezgah/shared";
import { siparisSubstratlari } from "@tezgah/templates/identity";
import { api } from "../api";
import { ProjectsPanel } from "./ProjectsPanel";

/* MOCK KÜMESİ — ProjectsPanel.test.tsx'teki kümenin aynısı (bileşen ağacının
   dokunduğu HER uç; eksik mock sessiz gerçek fetch'e düşer). Bu dosyada
   render'da koşanlar clientProjects + clients, olayla koşan parseSynonyms. */
vi.mock("../api", () => ({
  api: {
    clients: vi.fn(),
    clientProjects: vi.fn(),
    parseSynonyms: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateOrderItem: vi.fn(),
    createClient: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addOrderItem: vi.fn(),
    deleteOrderItem: vi.fn(),
    presentProject: vi.fn(),
  },
}));

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

/* Sipariş metni marketer şablonunun BİREBİR biçiminde (tr.json
   orders.marketer_template). `Detay: nakis` technique üreten TEK ifadedir. */
const SIPARIS_METNI = [
  "=== SIPARIS ===",
  "Isletme: ",
  "--- Kalem ---",
  "Urun: tisort",
  "Olcu: 30 x 40 cm",
  "Adet: 25",
  "Detay: nakis",
].join("\n");

function kur() {
  /* clients BOŞ ve bu ölçüm açısından DOĞRU: sipariş metninin "Isletme:"
     satırı boştur → parsed.isletme null → matchClient hiç koşmaz (eşleşme
     rozeti "mevcut müşteri" dalına düşer). Liste doldurmak, bu dosyanın
     ölçtüğü kalem özetine hiçbir şey katmaz, yalnız ikinci bir fikstür
     doğururdu. (Tip de ayrı: uç ClientSummaryDTO döndürür, ClientDTO değil.) */
  vi.mocked(api.clients).mockResolvedValue([]);
  vi.mocked(api.clientProjects).mockResolvedValue([]);
  /* Çözümleme DB eş-anlamlılarını çeker (ProjectsPanel.tsx PasteBox):
     boş liste = yalnız çekirdek sözlük, ölçüm çekirdeğe bakar. */
  vi.mocked(api.parseSynonyms).mockResolvedValue([]);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsPanel client={musteri()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Metni yapıştırır, "Çözümle"ye basar ve önizleme satırını döndürür. */
async function onizlemeSatiri(): Promise<HTMLElement> {
  /* orders.paste_placeholder ("...buraya yapıştır...") — proje adı
     input'undan ayıran tek kelime; tam metin yazılmaz ki çeviri
     cilası testi kırmasın. */
  const kutu = await screen.findByPlaceholderText(/yapıştır/i);
  fireEvent.change(kutu, { target: { value: SIPARIS_METNI } });
  fireEvent.click(screen.getByRole("button", { name: "Çözümle" }));

  /* Kalem satırı ürün adıyla bulunur; özet aynı satırın içindedir. */
  const baslik = await screen.findByText("Tişört");
  const satir = baslik.closest("div.row");
  if (!satir) throw new Error("önizleme kalem satırı bulunamadı");
  return satir as HTMLElement;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("yapıştır önizlemesi — kalem özeti tek kaynaktan", () => {
  it("TECHNIQUE ÖNİZLEMEDE GÖRÜNÜR (canlı yaranın çivisi): 'nakis' → broderie", async () => {
    kur();
    const satir = await onizlemeSatiri();
    /* Regresyon anlamı: bu iddia, önizleme özeti elle yeniden yazılırsa
       (itemSummary'den koparsa) kırmızıya döner. */
    await waitFor(() => expect(satir.textContent).toContain("broderie"));
  });

  it("SUBSTRAT ÖNİZLEMEDE GÖRÜNÜR — ilandan türetilir, elle yazılmaz", async () => {
    kur();
    const satir = await onizlemeSatiri();

    /* Beklenen değer İLANDAN okunur, teste sabit yazılmaz: ilan değişirse
       test ilanla birlikte hareket eder (ikinci kaynak doğurmaz). */
    const substratlar = siparisSubstratlari("tisort");
    expect(substratlar).toHaveLength(1); // homojenlik: çok elemanlı olursa özet kararı yeniden açılır
    expect(satir.textContent).toContain("kumaş"); // orders.substrat_kumas
  });

  it("ESKİ ALANLAR KAYBOLMADI — ölçü · adet önizlemede duruyor", async () => {
    kur();
    const satir = await onizlemeSatiri();
    /* Tek kaynağa geçiş bir DARALTMA olmamalı: elle yazılan sürümün
       gösterdiği her alan hâlâ görünür (aksi hâlde düzeltme yeni yara açardı). */
    expect(satir.textContent).toContain("30×40 cm");
    expect(satir.textContent).toContain("25 adet");
  });

  it("NOT ayrı kalır — özet notu yutmaz", async () => {
    kur();
    const satir = await onizlemeSatiri();
    /* itemSummary notes OKUMAZ; not kendi işaretiyle basılır. İkisi
       birleşseydi operatör serbest metni yapısal alan sanabilirdi. */
    expect(satir.textContent).toContain("📝");
    expect(satir.textContent).toContain("nakis");
  });
});
