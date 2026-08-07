// @vitest-environment jsdom
/* YAZMA ≠ BELGE AKITMA testleri — paket 6.6
   (journal 2026-08-07-performans-adaptif-yogunluk).

   İDDİA: kullanıcı yazarken belge her tuşta yeniden dizilmez; yeniden dizme
   bir COMMIT SINIRINA (blur · Enter · sayfa değişimi · açık düğme) kayar.
   ERTELENEN ŞEY VERİ DEĞİL AKIŞTIR — metin her tuşta belgeye yazılır, bu
   yüzden "debounce son karakteri yuttu" hatası yapısal olarak oluşamaz.

   NİÇİN SAYAÇLA ÖLÇÜLÜYOR: süre tek başına nedeni söylemez. "Yavaş" olan
   şey 19 reflow da olabilir, tek yavaş reflow da, satır çizimleri de.
   Sayaç hangi işin kaç kez koştuğunu söyler; iddia da tam olarak bu. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TasarimPage } from "./TasarimPage";
import { perf, perfSifirla } from "../perf";

beforeEach(() => {
  vi.useFakeTimers();
  perfSifirla();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const denetci = (): HTMLElement => screen.getByLabelText("Blok ayarları");
const blokEkle = (ad: string): void =>
  void fireEvent.click(within(screen.getByLabelText("Bloklar")).getByText(ad));
const otomatik = (): void => void fireEvent.click(screen.getByText("Otomatik Yerleştir"));
/** Otomatik yerleşim seçimi temizler (blok bölünür); denetçi için yeniden seç. */
const listeSec = (): void => void fireEvent.click(screen.getAllByTitle("Fiyat Listesi")[0]);
function urunEkle(n: number): void {
  const d = within(denetci()).getByText("+ Ürün Ekle");
  for (let i = 0; i < n; i++) fireEvent.click(d);
}
const adAlani = (i = 0): HTMLInputElement =>
  within(denetci()).getAllByLabelText("Ürün adı")[i] as HTMLInputElement;

/** Harf harf yazar — her tuş ayrı bir change olayı (gerçek yazma gibi) */
function yaz(alan: HTMLInputElement, metin: string): void {
  for (let i = 1; i <= metin.length; i++) {
    fireEvent.change(alan, { target: { value: metin.slice(0, i) } });
  }
}
/** Debounce penceresini kapatır */
const zamaniIlerlet = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe("Yazma sırasında belge AKITILMAZ", () => {
  it("otomatik modda 19 karakter → yazma sırasında SIFIR akıtma", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik(); // otomatik mod açılır
    listeSec();
    perfSifirla();

    yaz(adAlani(), "Karışık Pizza Büyük"); // 19 karakter
    expect(perf.yazma).toBe(19); // 19 tuş belgeye YAZILDI
    expect(perf.reflow).toBe(0); // ama belge HİÇ akıtılmadı
  });

  it("yazma bittikten sonra emniyet ağı TEK akıtma yapar", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();
    perfSifirla();

    yaz(adAlani(), "Ayran");
    expect(perf.reflow).toBe(0);
    zamaniIlerlet(1000); // gecikme 900 ms
    expect(perf.reflow).toBe(1); // 5 tuş → 1 akıtma
    expect(perf.commit).toBe(1);
  });

  it("art arda tuşlar zamanlayıcıyı SIFIRLAR — araya akıtma girmez", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();
    perfSifirla();

    /* Her tuştan sonra gecikmenin ALTINDA bir süre geçir: hiç akıtılmamalı */
    for (const h of "Sucuklu") {
      fireEvent.change(adAlani(), { target: { value: adAlani().value + h } });
      zamaniIlerlet(400);
    }
    expect(perf.reflow).toBe(0);
    zamaniIlerlet(1000);
    expect(perf.reflow).toBe(1);
  });

  it("OTOMATİK MOD KAPALIYKEN hiç akıtılmaz (paket 4 kuralı yaşıyor)", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(3);
    perfSifirla();
    yaz(adAlani(), "Elle");
    zamaniIlerlet(2000);
    expect(perf.reflow).toBe(0); // elle kurulmuş düzen habersiz dizilmez
  });
});

describe("COMMIT SINIRLARI", () => {
  it("BLUR gecikmeyi beklemeden akıtır", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();
    perfSifirla();

    yaz(adAlani(), "Lahmacun");
    expect(perf.reflow).toBe(0);
    fireEvent.blur(adAlani());
    expect(perf.reflow).toBe(1); // zaman İLERLEMEDİ, yine akıtıldı
  });

  it("ENTER gecikmeyi beklemeden akıtır", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();
    perfSifirla();

    yaz(adAlani(), "Pide");
    fireEvent.keyDown(adAlani(), { key: "Enter" });
    expect(perf.reflow).toBe(1);
  });

  it("commit'ten SONRA bekleyen zamanlayıcı İKİNCİ kez akıtmaz", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();
    perfSifirla();

    yaz(adAlani(), "Ayran");
    fireEvent.blur(adAlani());
    expect(perf.reflow).toBe(1);
    zamaniIlerlet(2000); // zamanlayıcı iptal edilmediyse burada 2'ye çıkar
    expect(perf.reflow).toBe(1);
  });
});

describe("VERİ KAYBI YOK — ertelenen şey akış, veri değil", () => {
  it("hızlı yaz → HEMEN blur: son karakter korunur", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();

    const metin = "Sucuklu Pizza Özel";
    yaz(adAlani(), metin);
    fireEvent.blur(adAlani()); // gecikme beklemeden
    expect(adAlani().value).toBe(metin);
  });

  it("yazıp HİÇ commit etmeden bırakınca da metin belgede DURUR", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();

    yaz(adAlani(), "Menemen");
    /* Ne blur ne Enter ne zaman ilerlemesi — metin yine yerinde olmalı,
       çünkü onProps her tuşta belgeye yazıyor. */
    expect(adAlani().value).toBe("Menemen");
  });

  it("GERİ AL bekleyen akışı İPTAL eder — geri alınan belge yeniden dizilmez", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(12);
    otomatik();
    listeSec();
    perfSifirla();

    yaz(adAlani(), "Ayran"); // bekleyen akış var
    fireEvent.click(screen.getByText("Geri Al"));
    const geriSonrasi = perf.reflow;
    zamaniIlerlet(2000);
    /* Bekleyen zamanlayıcı iptal edilmediyse geri alınan belgeyi hemen
       yeniden dizerdi ve kullanıcının geri aldığı şey geri gelirdi. */
    expect(perf.reflow).toBe(geriSonrasi);
  });
});
