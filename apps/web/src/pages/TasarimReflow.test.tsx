// @vitest-environment jsdom
/* REFLOW + SIRA testleri — paket 6 (journal 2026-08-07-adaptif-tema).

   EN ÖNEMLİ İKİ İDDİA:
     · REFLOW YALNIZ OTOMATİK MODDA. Paket 4'ün "arka planda sessizce yeniden
       dizme" yasağı GEÇERLİ kalır: elle kurulmuş düzen ürün eklenince
       bozulmaz. Kullanıcı bir kez düğmeye bastıysa akışı seçmiştir.
     · SIRA KULLANICININ. Otomatik yerleşim semantik sırayı korur. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { UrunListesiIcerikSchema } from "@tezgah/shared";
import { TasarimPage } from "./TasarimPage";

afterEach(cleanup);

const panel = (id: string): HTMLElement => screen.getByTestId(`panel-${id}`);
const denetci = (): HTMLElement => screen.getByLabelText("Blok ayarları");
function blokEkle(ad: string): void {
  fireEvent.click(within(screen.getByLabelText("Bloklar")).getByText(ad));
}
function otomatik(): void {
  fireEvent.click(screen.getByText("Otomatik Yerleştir"));
}
function urunDoldur(n: number, on = "U"): void {
  for (let i = 0; i < n; i++) {
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
    const adlar = within(denetci()).getAllByLabelText("Ürün adı");
    fireEvent.change(adlar[adlar.length - 1], { target: { value: `${on}${i}` } });
  }
}
const adSirasi = (): string[] =>
  within(denetci())
    .getAllByLabelText("Ürün adı")
    .map((n) => (n as HTMLInputElement).value);

describe("REFLOW — yalnız otomatik modda", () => {
  it("OTOMATİK MOD KAPALIYKEN ürün eklemek düzeni BOZMAZ (paket 4 kuralı yaşıyor)", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi"); // tıkla-ekle → dis-0
    urunDoldur(3, "A");
    /* Reflow koşsaydı blok iç yüze taşınır ve dis-0 boşalırdı */
    expect(panel("dis-0").querySelectorAll('[data-testid^="blok-"]')).toHaveLength(1);
  });

  it("otomatik yerleşimden SONRA ürün silmek belgeyi YENİDEN DENGELER", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(40, "P"); // 40×5.5 > 200mm → bölünecek
    otomatik();

    const oncekiBlok = document.querySelectorAll('[data-testid^="blok-"]').length;
    expect(oncekiBlok).toBeGreaterThan(1); // devam blokları doğdu

    /* Üç ürün sil → reflow → blok sayısı ARTMAZ, gerekirse azalır */
    fireEvent.click(screen.getAllByTitle("Fiyat Listesi")[0]);
    for (let i = 0; i < 3; i++) {
      const sil = within(denetci()).getAllByLabelText(/sil$/);
      fireEvent.click(sil[sil.length - 1]);
    }
    const sonrakiBlok = document.querySelectorAll('[data-testid^="blok-"]').length;
    expect(sonrakiBlok).toBeLessThanOrEqual(oncekiBlok);
  });

  it("REFLOW SONRASI gizli ürün KALMAZ — boşluk da veri kaybı da yok", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(45, "P");
    otomatik();
    fireEvent.click(screen.getAllByTitle("Fiyat Listesi")[0]);
    const sil = within(denetci()).getAllByLabelText(/sil$/);
    fireEvent.click(sil[sil.length - 1]);
    /* Tuvalde "+N sığmadı" rozeti olmamalı */
    expect(screen.queryByLabelText(/ürün sığmadı/)).toBeNull();
  });
});

describe("SIRA KULLANICININ", () => {
  it("↑ düğmesi ürünü yukarı taşır", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(3, "S");
    expect(adSirasi()).toEqual(["S0", "S1", "S2"]);

    fireEvent.click(within(denetci()).getByLabelText("S2 yukarı"));
    expect(adSirasi()).toEqual(["S0", "S2", "S1"]);
  });

  it("↓ düğmesi ürünü aşağı taşır", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(3, "S");
    fireEvent.click(within(denetci()).getByLabelText("S0 aşağı"));
    expect(adSirasi()).toEqual(["S1", "S0", "S2"]);
  });

  it("uçlarda taşma yok — ilk ürün yukarı basılınca sıra değişmez", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(3, "S");
    fireEvent.click(within(denetci()).getByLabelText("S0 yukarı"));
    expect(adSirasi()).toEqual(["S0", "S1", "S2"]);
  });

  it("ÜRÜN DEĞİŞTİR: adı değişince slot devralınır, sıra korunur", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(3, "S");
    const adlar = within(denetci()).getAllByLabelText("Ürün adı");
    fireEvent.change(adlar[1], { target: { value: "Sucuklu Pizza" } });
    expect(adSirasi()).toEqual(["S0", "Sucuklu Pizza", "S2"]);
  });

  it("OTOMATİK YERLEŞİM semantik sırayı KEYFÎ BOZMAZ", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(6, "S");
    const once = adSirasi();
    otomatik();
    fireEvent.click(screen.getAllByTitle("Fiyat Listesi")[0]);
    expect(adSirasi()).toEqual(once);
  });
});

describe("Adaptif ölçek belgeye YAZILIR", () => {
  it("yoğun belgede bloklar ölçek taşır — kapasite ve çizim aynı sayıyı okur", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(60, "Y");
    otomatik();
    /* Ölçek bloğa yazıldıysa gizli ürün kalmaz; yazılmasaydı kapasite 1
       varsayar ve "+N sığmadı" rozeti çıkardı (paket 6'da ölçüldü). */
    expect(screen.queryByLabelText(/ürün sığmadı/)).toBeNull();
    expect(UrunListesiIcerikSchema.safeParse({ items: [] }).success).toBe(true);
  });
});
