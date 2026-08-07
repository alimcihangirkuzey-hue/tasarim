// @vitest-environment jsdom
/* PREFLIGHT arayüz testleri — paket 5 (journal 2026-08-07-preflight).

   Saf motor templates'te 28 testle çivili; buradaki soru KABLOLAMA:
   sonuç ekrana ulaşıyor mu, bulguya tıklayınca ilgili blok seçiliyor mu,
   ve EN ÖNEMLİSİ — preflight belgeyi DEĞİŞTİRMİYOR mu (paket kuralı:
   habersiz küçültme/taşıma/silme YASAK). */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TasarimPage } from "./TasarimPage";

afterEach(cleanup);

const denetci = (): HTMLElement => screen.getByLabelText("Blok ayarları");
const onUcus = (): HTMLElement => screen.getByLabelText("Baskı güvenliği");
function blokEkle(ad: string): void {
  fireEvent.click(within(screen.getByLabelText("Bloklar")).getByText(ad));
}
function urunDoldur(n: number): void {
  for (let i = 0; i < n; i++) {
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
    const adlar = within(denetci()).getAllByLabelText("Ürün adı");
    fireEvent.change(adlar[adlar.length - 1], { target: { value: `U${i}` } });
  }
}

describe("Preflight paneli — acemi kullanıcıya tek cümle", () => {
  it("boş belgede panel HİÇ ÇIKMAZ (gürültü yok)", () => {
    render(<TasarimPage />);
    expect(screen.queryByLabelText("Baskı güvenliği")).toBeNull();
  });

  it("temiz tasarımda 'Baskıya hazır' der", () => {
    render(<TasarimPage />);
    blokEkle("Kategori Başlığı");
    fireEvent.change(within(denetci()).getByLabelText("Kategori adı"), {
      target: { value: "Pizzalar" },
    });
    expect(within(onUcus()).getByText("Baskıya hazır")).toBeDefined();
  });

  it("engelleyici sorun varsa 'Baskıya gönderilemez' der", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(20); // 85×60mm bloğa 10 sığar → 10 kalem gizli kalır
    expect(within(onUcus()).getByText("Baskıya gönderilemez")).toBeDefined();
  });

  it("bulgu SADE TÜRKÇE — teknik terim dökülmez", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(20);
    const metin = onUcus().textContent ?? "";
    expect(metin).toMatch(/sığmadığı için basılmayacak/);
    /* Kod adları kullanıcıya gösterilmez */
    expect(metin).not.toMatch(/gizli_urun|blocking|severity/);
  });

  it("ölçülen ve eşik GÖSTERİLİR — 'bir şeyler yanlış' demekle yetinilmez", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(20);
    expect(within(onUcus()).getByText(/^\d+ \/ \d+$/)).toBeDefined();
  });
});

describe("Bulguya tıklama — ilgili bloğu seçer", () => {
  it("tıklanınca o blok seçilir ve denetçide açılır", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(20);
    /* Seçimi temizlemek için başka bir bloğa geç */
    blokEkle("Kategori Başlığı");
    expect(within(denetci()).getByText("Kategori Başlığı")).toBeDefined();

    const bulgu = within(onUcus()).getByText(/sığmadığı için basılmayacak/);
    fireEvent.click(bulgu);
    /* Denetçi başlığı fiyat listesine döndü → doğru blok seçildi */
    expect(within(denetci()).getByText("Fiyat Listesi")).toBeDefined();
  });
});

describe("OTOMATİK DÜZELTME YOK — paket kuralı", () => {
  it("preflight belgeyi DEĞİŞTİRMEZ: uyarıya rağmen ürünler yerinde durur", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(20);
    /* Uyarı var ama hiçbir ürün silinmedi/küçültülmedi */
    expect(within(onUcus()).getByText("Baskıya gönderilemez")).toBeDefined();
    expect(within(denetci()).getAllByLabelText("Ürün adı")).toHaveLength(20);
  });

  it("uyarı KULLANICI DÜZELTİNCE kalkar (canlı ama sessiz değil)", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(20);
    expect(within(onUcus()).getByText("Baskıya gönderilemez")).toBeDefined();

    /* Kullanıcı fazla ürünleri kendi eliyle siler */
    for (let i = 0; i < 12; i++) {
      const sil = within(denetci()).getAllByLabelText(/sil$/);
      fireEvent.click(sil[sil.length - 1]);
    }
    expect(within(onUcus()).getByText("Baskıya hazır")).toBeDefined();
  });
});
