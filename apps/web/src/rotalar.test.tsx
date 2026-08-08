// @vitest-environment jsdom
/* ROTA TABLOSU — react-router 6→7 yükseltmesinin ÖN KOŞULU.

   SIRA TERSİNE ÇEVRİLDİ (sharp turunun dersi): bu dosya YÜKSELTMEDEN ÖNCE
   yazıldı ve aşağıdaki davranış `react-router-dom` 6.x üzerinde GERÇEKTEN
   ölçüldü. Majör atlamadan sonra kırmızıya dönen her satır, değişen şeyi
   ADIYLA söyler — "her şey yolunda görünüyor" demek zorunda kalmayız.
   Önce yükseltip sonra test yazmak, yeni davranışı kendi çıktısıyla "doğru"
   ilan etmek olurdu.

   NEDEN SAYFALAR TAKLİT EDİLİYOR: ölçülen şey ROTA TABLOSUDUR, sayfaların
   içi değil. Gerçek sayfalar konva/canvas ve onlarca uç taşır; onları
   render etmek testi sayfa hatalarına duyarlı yapar ve rota iddiasını
   bulanıklaştırırdı. Her sayfa kendi adını yazan bir damgaya indirgenir,
   böylece "hangi yol hangi sayfaya çıkıyor" doğrudan okunur.

   KROMLU/KROMSUZ AYRIMI BU DOSYANIN ASIL KONUSU: print · present · mockup ·
   fiche · atolye üst bar OLMADAN çizilir (M3/§9.1 — üst bar PDF'e basılmaz).
   Yanlışlıkla kromlu tarafa taşınan bir print rotası, PDF'in tepesine
   gezinme çubuğu basardı ve bunu kimse fark etmezdi. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KROMLU_ROTALAR, KROMSUZ_ROTALAR, RotaAgaci } from "./rotalar";

/* Her sayfa kendi adını yazan bir damgaya iner. `vi.mock` fabrikaları dosya
   başına HOISTED edilir; dışarıdaki bir değişkeni okumak "cannot access
   before initialization" verir (ölçüldü). Bu yüzden damga fabrikanın
   İÇİNDE kurulur — tekrar, hoisting kuralının bedelidir. */

vi.mock("./pages/ClientListPage", () => ({ ClientListPage: () => <div data-sayfa="ClientListPage">ClientListPage</div> }));
vi.mock("./pages/ClientDetailPage", () => ({ ClientDetailPage: () => <div data-sayfa="ClientDetailPage">ClientDetailPage</div> }));
vi.mock("./pages/EditorPage", () => ({ EditorPage: () => <div data-sayfa="EditorPage">EditorPage</div> }));
vi.mock("./pages/FichePage", () => ({ FichePage: () => <div data-sayfa="FichePage">FichePage</div> }));
vi.mock("./pages/MockupPage", () => ({ MockupPage: () => <div data-sayfa="MockupPage">MockupPage</div> }));
vi.mock("./pages/PresentPage", () => ({ PresentPage: () => <div data-sayfa="PresentPage">PresentPage</div> }));
vi.mock("./pages/PrintPage", () => ({ PrintPage: () => <div data-sayfa="PrintPage">PrintPage</div> }));
vi.mock("./pages/ThemesPage", () => ({ ThemesPage: () => <div data-sayfa="ThemesPage">ThemesPage</div> }));
vi.mock("./pages/FontsPage", () => ({ FontsPage: () => <div data-sayfa="FontsPage">FontsPage</div> }));
vi.mock("./pages/ParseDictPage", () => ({ ParseDictPage: () => <div data-sayfa="ParseDictPage">ParseDictPage</div> }));
vi.mock("./pages/IngredientsPage", () => ({ IngredientsPage: () => <div data-sayfa="IngredientsPage">IngredientsPage</div> }));
vi.mock("./pages/FactoryPage", () => ({ FactoryPage: () => <div data-sayfa="FactoryPage">FactoryPage</div> }));
vi.mock("./pages/FactoryGuidePage", () => ({ FactoryGuidePage: () => <div data-sayfa="FactoryGuidePage">FactoryGuidePage</div> }));
vi.mock("./pages/SiparisPage", () => ({ SiparisPage: () => <div data-sayfa="SiparisPage">SiparisPage</div> }));
vi.mock("./pages/TasarimPage", () => ({ TasarimPage: () => <div data-sayfa="TasarimPage">TasarimPage</div> }));
vi.mock("./pages/BriefPage", () => ({ BriefPage: () => <div data-sayfa="BriefPage">BriefPage</div> }));
vi.mock("./pages/AtolyePage", () => ({ default: () => <div data-sayfa="AtolyePage">AtolyePage</div> }));

afterEach(cleanup);

const KROM = "ÜST-BAR";

/** Kromlu tarafın damgası — Layout'un yerine geçer (üst bar burada değil). */
function ciz(yol: string) {
  return render(
    <MemoryRouter initialEntries={[yol]}>
      <RotaAgaci layout={(c) => <div data-krom={KROM}>{c}</div>} />
    </MemoryRouter>,
  );
}

const kromVar = () => document.querySelector(`[data-krom="${KROM}"]`) !== null;
/** Örnek yol: `:id` yer tutucularını gerçek bir değerle doldurur. */
const ornekYol = (yol: string) => yol.replace(/:[^/]+/g, "42");

describe("ön-koşul — tablo GERÇEKTEN dolu ve ayrık", () => {
  it("İKİ KÜME de boş DEĞİL", () => {
    /* Bu satır olmadan aşağıdaki "hepsi" iddiaları, boş bir tabloda da
       anlamsızca yeşil kalırdı. */
    expect(KROMSUZ_ROTALAR.length).toBeGreaterThan(0);
    expect(KROMLU_ROTALAR.length).toBeGreaterThan(0);
  });

  it("HİÇBİR YOL İKİ KÜMEDE birden yok — chrome kararı tek", () => {
    const kromsuz = new Set(KROMSUZ_ROTALAR.map((r) => r.yol));
    const cakisan = KROMLU_ROTALAR.filter((r) => kromsuz.has(r.yol)).map((r) => r.yol);
    expect(cakisan, "bu yol(lar) hem kromlu hem kromsuz ilan edilmiş").toEqual([]);
  });

  it("YOLLAR TEKRARSIZ — aynı yol iki kez ilan edilmez", () => {
    const hepsi = [...KROMSUZ_ROTALAR, ...KROMLU_ROTALAR].map((r) => r.yol);
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });
});

/* ÇIKTI YÜZEYLERİ — SÖZLEŞME, ilandan TÜRETİLMEZ.
   Bu liste bilerek ELLE yazılıdır ve `KROMSUZ_ROTALAR`'ın kopyası DEĞİL,
   KARŞITIDIR. Gerekçesi ölçüldü: bir negatif kontrolde `/print/:id`
   kromlu tarafa taşındı ve 34/34 test YEŞİL kaldı — çünkü `it.each`
   ilanın KENDİSİNİ dolaşıyordu, yani rota taşınınca test de onunla
   taşınıyordu (TOTOLOJİ). Krom kararı bir ilan değil, M3/§9.1'in
   sözleşmesidir: üst bar PDF'e basılmaz. Sözleşme tarafı ADIYLA yazılır
   ki ilan kaydığında test onu YAKALASIN.
   (Aynı gerekçe `TEST_WORKSPACES` kaydında da yazılı: kapsam bir ilandır,
   ilanı diske sormak kapıyı kırılganlaştırır.) */
const CIKTI_YUZEYLERI = ["/print/:id", "/present/:id", "/mockup/:id", "/fiche/:id"] as const;

describe("krom SÖZLEŞMESİ — ilandan bağımsız", () => {
  it("ÇIKTI YÜZEYLERİNİN HEPSİ kromsuz ilan edilmiş", () => {
    /* Biri kromlu tarafa taşınırsa PDF'in tepesine gezinme çubuğu basılır. */
    const kromsuz = new Set(KROMSUZ_ROTALAR.map((r) => r.yol));
    const kacan = CIKTI_YUZEYLERI.filter((y) => !kromsuz.has(y));
    expect(kacan, "bu çıktı yüzey(ler)i artık kromsuz DEĞİL").toEqual([]);
  });

  it("ÇIKTI YÜZEYLERİ kromlu listede HİÇ geçmiyor", () => {
    const kromlu = new Set(KROMLU_ROTALAR.map((r) => r.yol));
    expect(CIKTI_YUZEYLERI.filter((y) => kromlu.has(y))).toEqual([]);
  });

  it("ATÖLYE de kromsuz — ama AYRI gerekçeyle (izole tuval iskeleti)", () => {
    /* Çıktı yüzeyi DEĞİL; kromsuzluğu P2 CAP-CANVAS-01 kararındandır.
       Ayrı yazılır ki iki gerekçe tek listede karışmasın. */
    expect(KROMSUZ_ROTALAR.map((r) => r.yol)).toContain("/atolye");
  });
});

describe("KROMSUZ rotalar — üst bar ÇİZİLMEZ", () => {
  it.each(KROMSUZ_ROTALAR.map((r) => r.yol))("%s → chrome YOK", (yol) => {
    /* Bu iddia doğrudan M3/§9.1'dir: üst bar PDF'e basılmaz. */
    ciz(ornekYol(yol));
    expect(kromVar(), `${yol}: üst bar çizildi`).toBe(false);
  });

  it("PRINT rotası gerçekten PrintPage'e çıkar", () => {
    ciz("/print/42");
    expect(screen.getByText("PrintPage")).toBeTruthy();
  });

  it("ATÖLYE LAZY yüklenir — Suspense sarmalı KOPMAZ", async () => {
    /* Lazy'lik bir BAŞARIM sözleşmesidir (konva chunk'ı yalnız bu rotada
       iner). Suspense sarmalı kopsaydı React fırlatırdı; burada gerçekten
       çözülüp çizildiği ölçülür. */
    ciz("/atolye");
    expect(await screen.findByText("AtolyePage")).toBeTruthy();
    expect(kromVar()).toBe(false);
  });
});

describe("KROMLU rotalar — üst bar ÇİZİLİR ve doğru sayfa gelir", () => {
  it.each(KROMLU_ROTALAR.map((r) => r.yol))("%s → chrome VAR", (yol) => {
    ciz(ornekYol(yol));
    expect(kromVar(), `${yol}: üst bar çizilmedi`).toBe(true);
  });

  it("HER KROMLU YOL KENDİ sayfasına çıkar — beklenen İLANDAN türetilir", () => {
    /* Yol → sayfa bağı tek tek ölçülür: iç içe `Routes` sıralaması ya da
       eşleşme önceliği değişirse (`/settings/themes` vs `/settings/:x`)
       sessizce YANLIŞ sayfa çizilirdi.

       BEKLENEN AD ELLE YAZILMAZ: ilandaki elemanın KENDİSİ ayrıca çizilir
       ve damgası okunur. İkinci bir yol→sayfa tablosu tutmak, bu deponun
       tekrar tekrar ödediği "elle tutulan ikinci kopya" olurdu — ve ilan
       değiştiğinde sessizce ayrışırdı. */
    for (const r of KROMLU_ROTALAR) {
      cleanup();
      const tek = render(<MemoryRouter>{r.eleman}</MemoryRouter>);
      const beklenen = tek.container.querySelector("[data-sayfa]")?.getAttribute("data-sayfa");
      expect(beklenen, `${r.yol}: ilandaki eleman damga üretmedi`).toBeTruthy();
      cleanup();

      ciz(ornekYol(r.yol));
      const cizilen = document.querySelector("[data-sayfa]")?.getAttribute("data-sayfa");
      expect(cizilen, `${r.yol}: yanlış sayfa çizildi`).toBe(beklenen);
    }
  });

  it("KÖK yol ClientListPage'e çıkar", () => {
    ciz("/");
    expect(screen.getByText("ClientListPage")).toBeTruthy();
  });

  it("AYARLAR yolu kendi sayfasına çıkar — önek çakışması yok", () => {
    ciz("/settings/fonts");
    expect(screen.getByText("FontsPage")).toBeTruthy();
    expect(screen.queryByText("ThemesPage")).toBeNull();
  });
});

describe("bilinmeyen yol", () => {
  it("KROMLU kabuğa düşer — operatör kaybolduğunda gezinebilsin", () => {
    /* Kromsuz tarafa düşseydi boş bir sayfada kalırdı: ne üst bar, ne sayfa. */
    ciz("/boyle-bir-yol-yok");
    expect(kromVar()).toBe(true);
    expect(document.querySelector("[data-sayfa]")).toBeNull();
  });
});
