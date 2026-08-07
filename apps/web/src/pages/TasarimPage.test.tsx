// @vitest-environment jsdom
/* Blok tuvali testleri (journal 2026-08-07-blok-tuvali-ui, paket 2).

   NE ÖLÇER: yerleşim MATEMATİĞİNİ değil (o paket 1'de 40 testle çivili),
   KABLOLAMAYI — paletten gelen bloğun gerçekten panele düşmesi, saf
   çekirdeğin snap/itme/taşma sonucunun ekrana ULAŞMASI, kat çizgisi ve
   panel geometrisinin gerçek mm'den gelmesi.

   Bu ayrım önemli: burada "97mm doğru mu" diye sormak paket 1'in testini
   ikinci kez yazmak olurdu. Buradaki soru "97mm ekrana ulaşıyor mu".

   Sürükle-bırak jsdom'da: dataTransfer elle kurulur (jsdom DragEvent'i
   taşımaz). Tıkla-ekle yolu ayrıca test edilir — o yol sürüklemeyi
   keşfetmemiş kullanıcının tek çıkışıdır ve sessizce bozulursa acemi
   kullanıcı duvara toslar. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { PX_PER_MM_TEST, TasarimPage } from "./TasarimPage";

afterEach(cleanup);

const panel = (id: string): HTMLElement => screen.getByTestId(`panel-${id}`);

/**
 * Bırakma olayını ELLE kurar. İki jsdom gerçeği bunu zorunlu kılar:
 *   · jsdom'da `DragEvent` YOKTUR → RTL `Event`'e düşer ve `dataTransfer`
 *     taşınmaz; taşıyıcıyı kendimiz tanımlarız.
 *   · aynı düşüş yüzünden `clientX/clientY` de event'e GEÇMEZ (fireEvent'e
 *     init olarak vermek yetmez — undefined kalır ve üretim kodunda NaN'a
 *     dönüşür). Bu yüzden defineProperty ile event'e çakılır.
 * Konum px cinsindendir; jsdom'da getBoundingClientRect sıfır döndüğü için
 * clientX doğrudan panel-yerel ofsettir → mm × PX_PER_MM.
 */
function birak(hedef: HTMLElement, veri: string, x_mm = 20, y_mm = 20): void {
  const ev = createEvent.drop(hedef);
  const dataTransfer = {
    data: { "text/plain": veri } as Record<string, string>,
    getData(tur: string) {
      return this.data[tur] ?? "";
    },
    setData(tur: string, v: string) {
      this.data[tur] = v;
    },
    effectAllowed: "",
    dropEffect: "",
  };
  Object.defineProperty(ev, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(ev, "clientX", { value: x_mm * PX_PER_MM_TEST });
  Object.defineProperty(ev, "clientY", { value: y_mm * PX_PER_MM_TEST });
  fireEvent(hedef, ev);
}

describe("Blok tuvali — ilk açılış", () => {
  it("A4 yatay iki kırım: DIŞ yüzde ÜÇ panel, adlarıyla", () => {
    render(<TasarimPage />);
    expect(panel("dis-0")).toHaveProperty("ariaLabel", "İç kanat");
    expect(panel("dis-1")).toHaveProperty("ariaLabel", "Arka");
    expect(panel("dis-2")).toHaveProperty("ariaLabel", "Ön kapak");
  });

  it("panel GENİŞLİKLERİ gerçek mm geometrisinden gelir (97/100/100)", () => {
    render(<TasarimPage />);
    /* Paket 1'in sarmal payı ekrana ulaşıyor mu: 97 ≠ 100 görünmeli */
    expect(panel("dis-0").style.width).toBe(`${97 * PX_PER_MM_TEST}px`);
    expect(panel("dis-1").style.width).toBe(`${100 * PX_PER_MM_TEST}px`);
    expect(panel("dis-2").style.width).toBe(`${100 * PX_PER_MM_TEST}px`);
  });

  it("KAT ÇİZGİLERİ görünür ve doğru yerde (97 · 197)", () => {
    render(<TasarimPage />);
    expect(screen.getByTestId("kat-97")).toBeDefined();
    expect(screen.getByTestId("kat-197")).toBeDefined();
    /* Yaprak kenarı (297) kat çizgisi DEĞİLDİR */
    expect(screen.queryByTestId("kat-297")).toBeNull();
  });

  it("İÇ yüze geçilince kat çizgileri DEĞİŞİR (sarmal asimetrisi ekranda)", () => {
    render(<TasarimPage />);
    fireEvent.click(screen.getByText("İç yüz"));
    expect(screen.getByTestId("kat-100")).toBeDefined();
    expect(screen.getByTestId("kat-200")).toBeDefined();
    expect(screen.queryByTestId("kat-97")).toBeNull();
  });

  it("palet ürün sahibinin sekiz bloğunu gösterir", () => {
    render(<TasarimPage />);
    const palet = screen.getByLabelText("Bloklar");
    for (const ad of [
      "Kategori Başlığı",
      "Ürün Grid'i",
      "Fiyat Listesi",
      "Hero Ürün",
      "Görsel",
      "Logo",
      "Kampanya",
      "İletişim",
    ]) {
      expect(within(palet).getByText(ad), ad).toBeDefined();
    }
  });

  it("başlangıçta tuval BOŞ — hiç blok yok", () => {
    render(<TasarimPage />);
    expect(screen.getByText("0 blok")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull(); // uyarı gürültüsü yok
  });
});

describe("Blok tuvali — blok ekleme", () => {
  it("TIKLA-EKLE: palete tıklayınca blok ilk panele düşer", () => {
    render(<TasarimPage />);
    fireEvent.click(within(screen.getByLabelText("Bloklar")).getByText("Hero Ürün"));
    expect(within(panel("dis-0")).getByText("Hero Ürün")).toBeDefined();
  });

  it("SÜRÜKLE-BIRAK: paletten bırakılan blok HEDEF panele düşer (ilkine değil)", () => {
    render(<TasarimPage />);
    birak(panel("dis-2"), "yeni:logo");
    expect(within(panel("dis-2")).getByText("Logo")).toBeDefined();
    expect(within(panel("dis-0")).queryByText("Logo")).toBeNull();
  });

  it("her panel kendi bloklarını tutar — paneller bağımsız uzaylar", () => {
    render(<TasarimPage />);
    birak(panel("dis-0"), "yeni:fiyat_listesi");
    birak(panel("dis-1"), "yeni:urun_gridi");
    expect(within(panel("dis-0")).getByText("Fiyat Listesi")).toBeDefined();
    expect(within(panel("dis-1")).getByText("Ürün Grid'i")).toBeDefined();
    expect(within(panel("dis-1")).queryByText("Fiyat Listesi")).toBeNull();
  });

  it("KARIŞIK YERLEŞİM: aynı panelde grid + fiyat listesi + hero yan yana yaşar", () => {
    /* Ürün sahibinin en önemli isteği — bugünkü şablon dünyasında İMKÂNSIZ */
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:urun_gridi");
    birak(panel("dis-1"), "yeni:fiyat_listesi");
    birak(panel("dis-1"), "yeni:hero_urun");
    const p = panel("dis-1");
    expect(within(p).getByText("Ürün Grid'i")).toBeDefined();
    expect(within(p).getByText("Fiyat Listesi")).toBeDefined();
    expect(within(p).getByText("Hero Ürün")).toBeDefined();
  });
});

describe("Blok tuvali — saf çekirdeğin sonucu EKRANA ulaşıyor", () => {
  it("SNAP: ızgara dışına bırakılan blok ızgaraya oturur (12mm → 10mm)", () => {
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:logo", 12, 12);
    /* placeBlock 12 → 10'a yuvarlar; safe payı 5 olduğu için 10 geçerli */
    const blok = within(panel("dis-1")).getByTitle("Logo");
    expect(blok.style.left).toBe(`${10 * PX_PER_MM_TEST}px`);
  });

  it("SAFE ALAN: kenara bırakılan blok güvenli alanın içine sıkışır", () => {
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:logo", 0, 0);
    const blok = within(panel("dis-1")).getByTitle("Logo");
    expect(blok.style.left).toBe(`${5 * PX_PER_MM_TEST}px`); // safe_mm
    expect(blok.style.top).toBe(`${5 * PX_PER_MM_TEST}px`);
  });

  it("ÇARPIŞMA: dolu yere bırakılan ikinci blok AŞAĞI iner, üst üste binmez", () => {
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:kategori_basligi", 5, 5); // 5..17 (h=12)
    birak(panel("dis-1"), "yeni:logo", 5, 5); // aynı yere
    const logo = within(panel("dis-1")).getByTitle("Logo");
    expect(logo.style.top).toBe(`${17 * PX_PER_MM_TEST}px`); // başlığın altı
    expect(screen.getByText("Yer açıldı — blok aşağı kaydı")).toBeDefined();
  });

  it("TAŞMA: panele sığmayan blok uyarı üretir ve kırmızı işaretlenir", () => {
    render(<TasarimPage />);
    /* İçerik yüksekliği 200mm; hero 75mm → üç tane sığar, dördüncü taşar */
    for (let i = 0; i < 4; i++) birak(panel("dis-1"), "yeni:hero_urun", 5, 5);
    expect(screen.getByRole("alert").textContent).toContain("taşıyor");
  });

  it("çakışma UYARISI temiz yerleşimde ÇIKMAZ (sıfır-gürültü)", () => {
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:logo", 5, 5);
    expect(screen.queryByText("Bloklar üst üste bindi")).toBeNull();
  });
});

describe("Blok tuvali — blok taşıma ve silme", () => {
  it("blok BAŞKA panele taşınır", () => {
    render(<TasarimPage />);
    birak(panel("dis-0"), "yeni:kampanya");
    const blok = within(panel("dis-0")).getByTitle("Kampanya");
    const id = blok.getAttribute("data-testid")!.replace("blok-", "");

    birak(panel("dis-2"), `tasi:${id}`, 10, 10);
    expect(within(panel("dis-2")).getByTitle("Kampanya")).toBeDefined();
    expect(within(panel("dis-0")).queryByTitle("Kampanya")).toBeNull();
  });

  it("taşınan blok KENDİSİYLE çarpışmaz (aşağı itilmez)", () => {
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:logo", 20, 20);
    const id = within(panel("dis-1")).getByTitle("Logo").getAttribute("data-testid")!.replace("blok-", "");
    birak(panel("dis-1"), `tasi:${id}`, 30, 30);
    expect(within(panel("dis-1")).getByTitle("Logo").style.top).toBe(`${30 * PX_PER_MM_TEST}px`);
  });

  it("seçili blok silinebilir", () => {
    render(<TasarimPage />);
    birak(panel("dis-1"), "yeni:logo");
    fireEvent.click(within(panel("dis-1")).getByTitle("Logo"));
    fireEvent.click(screen.getByLabelText("Logo sil"));
    expect(within(panel("dis-1")).queryByTitle("Logo")).toBeNull();
  });
});
