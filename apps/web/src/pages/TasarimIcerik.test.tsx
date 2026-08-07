// @vitest-environment jsdom
/* İÇERİK BLOKLARI + ÜRÜN EKLE testleri — paket 3
   (journal 2026-08-07-icerik-bloklari-urun-ekle).

   NE ÖLÇER: acemi kullanıcının yolunu — bloğa TIKLA → içeriği YAZ → tuvalde
   GÖR. Ve bu paketin en önemli sözleşmesini: bloğa sığmayan ürün SİLİNMEZ,
   sayılarak bildirilir. Sessiz kırpma burada bir görüntü hatası değil, ancak
   matbaadan dönünce fark edilen bir VERİ KAYBIDIR.

   Kapasite matematiği shared'da 22 testle çivili; buradaki soru o hesabın
   ARAYÜZE ulaşıp ulaşmadığı. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { TasarimPage } from "./TasarimPage";

afterEach(cleanup);

const panel = (id: string): HTMLElement => screen.getByTestId(`panel-${id}`);
const denetci = (): HTMLElement => screen.getByLabelText("Blok ayarları");

/** Paletten tıklayarak blok ekler ve onu SEÇER (tıkla-ekle zaten seçili yapar) */
function blokEkle(ad: string): void {
  fireEvent.click(within(screen.getByLabelText("Bloklar")).getByText(ad));
}

const yaz = (etiket: string, deger: string): void => {
  fireEvent.change(within(denetci()).getByLabelText(etiket), { target: { value: deger } });
};

describe("Denetçi — seçim ve boş durum", () => {
  it("hiçbir blok seçili değilken yönlendirir, form göstermez", () => {
    render(<TasarimPage />);
    expect(within(denetci()).getByText(/bir bloğa tıkla/i)).toBeDefined();
  });

  it("blok eklenince denetçi O bloğun başlığını gösterir", () => {
    render(<TasarimPage />);
    blokEkle("Kategori Başlığı");
    expect(within(denetci()).getByText("Kategori Başlığı")).toBeDefined();
  });

  it("BOŞ grid tuvalde ne yapılacağını söyler (bomboş dikdörtgen bırakmaz)", () => {
    render(<TasarimPage />);
    blokEkle("Ürün Grid'i");
    expect(within(panel("dis-0")).getByText(/sağdan ürün ekle/i)).toBeDefined();
  });
});

describe("Kategori başlığı — yaz, tuvalde gör", () => {
  it("kategori adı yazılınca TUVALDE görünür", () => {
    render(<TasarimPage />);
    blokEkle("Kategori Başlığı");
    yaz("Kategori adı", "Pizzalar");
    expect(within(panel("dis-0")).getByText("Pizzalar")).toBeDefined();
  });

  it("alt başlık isteğe bağlı — boşken tuvale hiç basılmaz", () => {
    render(<TasarimPage />);
    blokEkle("Kategori Başlığı");
    yaz("Kategori adı", "Salatalar");
    expect(within(panel("dis-0")).queryByText("Taş fırından")).toBeNull();
    yaz("Alt başlık (isteğe bağlı)", "Günlük taze");
    expect(within(panel("dis-0")).getByText("Günlük taze")).toBeDefined();
  });
});

describe("+ Ürün Ekle — acemi kullanıcının ana akışı", () => {
  it("fiyat listesine ürün eklenir; ad ve fiyat TUVALDE görünür", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));

    fireEvent.change(within(denetci()).getByLabelText("Ürün adı"), { target: { value: "Margherita" } });
    fireEvent.change(within(denetci()).getByLabelText("Fiyat"), { target: { value: "145 ₺" } });

    const p = panel("dis-0");
    expect(within(p).getByText("Margherita")).toBeDefined();
    expect(within(p).getByText("145 ₺")).toBeDefined();
  });

  it("açıklama isteğe bağlı — girilince tuvalde alt satır olarak çıkar", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
    fireEvent.change(within(denetci()).getByLabelText("Ürün adı"), { target: { value: "Tonno" } });
    fireEvent.change(within(denetci()).getByLabelText("Açıklama"), { target: { value: "ton balığı, soğan" } });
    expect(within(panel("dis-0")).getByText("ton balığı, soğan")).toBeDefined();
  });

  it("ürün silinir — tuvalden de kalkar", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
    fireEvent.change(within(denetci()).getByLabelText("Ürün adı"), { target: { value: "Hawaii" } });
    expect(within(panel("dis-0")).getByText("Hawaii")).toBeDefined();

    fireEvent.click(within(denetci()).getByLabelText("Hawaii sil"));
    expect(within(panel("dis-0")).queryByText("Hawaii")).toBeNull();
  });

  it("hero ürün tek kalem taşır — ad, fiyat, açıklama tuvalde", () => {
    render(<TasarimPage />);
    blokEkle("Hero Ürün");
    yaz("Ürün adı", "Karışık Pizza");
    yaz("Fiyat", "185 ₺");
    yaz("Açıklama", "Sucuk, mantar, biber");
    const p = panel("dis-0");
    expect(within(p).getByText("Karışık Pizza")).toBeDefined();
    expect(within(p).getByText("185 ₺")).toBeDefined();
    expect(within(p).getByText("Sucuk, mantar, biber")).toBeDefined();
  });

  it("iletişim bloğu üç alanı da basar", () => {
    render(<TasarimPage />);
    blokEkle("İletişim");
    yaz("Telefon", "0212 000 00 00");
    yaz("Adres", "Bağdat Cad. 12");
    yaz("Saatler", "11:00–23:00");
    const p = panel("dis-0");
    expect(within(p).getByText("0212 000 00 00")).toBeDefined();
    expect(within(p).getByText("Bağdat Cad. 12")).toBeDefined();
    expect(within(p).getByText("11:00–23:00")).toBeDefined();
  });
});

describe("Grid — kolon seçimi", () => {
  it("varsayılan 2 kolon; 3'e basılınca grid 3 kolona geçer", () => {
    render(<TasarimPage />);
    blokEkle("Ürün Grid'i");
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
    fireEvent.change(within(denetci()).getByLabelText("Ürün adı"), { target: { value: "Pide" } });

    const izgara = () =>
      (within(panel("dis-0")).getByTitle("Ürün Grid'i").firstElementChild as HTMLElement).style
        .gridTemplateColumns;
    expect(izgara()).toBe("repeat(2, 1fr)");

    fireEvent.click(within(denetci()).getByLabelText("3 kolon"));
    expect(izgara()).toBe("repeat(3, 1fr)");
  });
});

describe("SIĞMAYAN ÜRÜN — bu paketin en önemli sözleşmesi", () => {
  /** n ürün ekler (hepsi adlı, ki tuvalde sayılabilsinler) */
  function urunDoldur(n: number): void {
    for (let i = 0; i < n; i++) {
      fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
      const adlar = within(denetci()).getAllByLabelText("Ürün adı");
      fireEvent.change(adlar[adlar.length - 1], { target: { value: `Urun${i}` } });
    }
  }

  it("kapasite aşılınca denetçi UYARIR ve kaç tane sığmadığını söyler", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi"); // 85×60mm → 10 sade satır sığar
    urunDoldur(14);
    expect(within(denetci()).getByRole("alert").textContent).toMatch(/4 ürün bu bloğa sığmadı/);
  });

  it("SİLİNMEZ: sığmayan ürünler denetçi listesinde DURUR", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(14);
    /* 14 satırın hepsi düzenlenebilir halde duruyor — veri kaybı YOK */
    expect(within(denetci()).getAllByLabelText("Ürün adı")).toHaveLength(14);
    expect(within(denetci()).getAllByText("sığmadı")).toHaveLength(4);
  });

  it("tuvalde de görünür: blok üstünde +N rozeti", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(14);
    expect(within(panel("dis-0")).getByLabelText(/Fiyat Listesi: 4 ürün sığmadı/)).toBeDefined();
  });

  it("kapasite İÇİNDEyken hiç uyarı yok (sıfır gürültü)", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(5);
    expect(within(denetci()).queryByRole("alert")).toBeNull();
    expect(within(panel("dis-0")).queryByLabelText(/sığmadı/)).toBeNull();
  });

  it("TUVAL yalnız sığanı çizer — 14 üründen 10'u basılır, taşma yok", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(14);
    const p = panel("dis-0");
    expect(within(p).getByText("Urun9")).toBeDefined(); // 10. kalem (0-tabanlı)
    expect(within(p).queryByText("Urun10")).toBeNull(); // 11. çizilmez
    expect(within(p).queryByText("Urun13")).toBeNull();
  });
});

describe("İçerik + taşıma birlikte", () => {
  it("içerik dolu blok BAŞKA panele taşınınca içeriğini KORUR", () => {
    render(<TasarimPage />);
    blokEkle("Kategori Başlığı");
    yaz("Kategori adı", "Tatlılar");
    const id = within(panel("dis-0")).getByTitle("Kategori Başlığı").getAttribute("data-testid")!;

    /* Sürükle-bırak yolu paket 2'de testli; burada içeriğin taşıma SONRASI
       yaşadığını ölçüyoruz. Olay RTL üzerinden kurulur — elle dispatchEvent
       React'in sentetik sistemine düşmüyor ve state güncellemesi akmıyor. */
    const ev = createEvent.drop(panel("dis-2"));
    Object.defineProperty(ev, "dataTransfer", {
      value: { getData: () => `tasi:${id.replace("blok-", "")}` },
    });
    Object.defineProperty(ev, "clientX", { value: 30 });
    Object.defineProperty(ev, "clientY", { value: 30 });
    fireEvent(panel("dis-2"), ev);

    expect(within(panel("dis-2")).getByText("Tatlılar")).toBeDefined();
    expect(within(panel("dis-0")).queryByText("Tatlılar")).toBeNull();
  });
});
