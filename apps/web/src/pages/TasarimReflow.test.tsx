// @vitest-environment jsdom
/* REFLOW + SIRA testleri — paket 6 (journal 2026-08-07-adaptif-tema).

   EN ÖNEMLİ İKİ İDDİA:
     · REFLOW YALNIZ OTOMATİK MODDA. Paket 4'ün "arka planda sessizce yeniden
       dizme" yasağı GEÇERLİ kalır: elle kurulmuş düzen ürün eklenince
       bozulmaz. Kullanıcı bir kez düğmeye bastıysa akışı seçmiştir.
     · SIRA KULLANICININ. Otomatik yerleşim semantik sırayı korur. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TYPO_MM } from "@tezgah/shared";
import { PX_PER_MM_TEST, TasarimPage } from "./TasarimPage";

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
/* SADECE SAYI GEREKTİĞİNDE: ad yazmadan ürün ekler.
   NEDEN AYRI HELPER (ölçüldü, kestirme değil): urunDoldur her kalem için bir
   `getAllByLabelText` taraması + bir change olayı üretiyor; denetçi de her
   tuş vuruşunda TÜM satırları yeniden çiziyor. Bileşim O(n²): 60 kalemde
   4542 ms ölçüldü, vitest'in 5000 ms tabanına o kadar yakın ki dosyalar
   paralel koşarken 5206 ms'ye çıkıp KIZARDI — aynı test tek başına
   yeşildi. Bu, kodun değil testin kusuruydu: sıra/ad denetlemeyen bir
   iddiaya 60 ad yazdırmak gereksiz maliyettir. Ad üretmeyen yol aynı
   kullanıcı eylemini (düğmeye basmak) kullanır, iddiayı zayıflatmaz.
   NOT — GİZLENMEYEN BULGU: denetçinin O(n²) yeniden çizimi gerçek bir UX
   bulgusudur (100+ ürün hedefi için) ve testi hızlandırmak onu ortadan
   kaldırmaz; ayrıca kayda geçti. */
function urunEkle(n: number): void {
  const dugme = within(denetci()).getByText("+ Ürün Ekle");
  for (let i = 0; i < n; i++) fireEvent.click(dugme);
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
  /* PAKET 6.6'DA BEKLENTİ YÖN DEĞİŞTİRDİ — kod testi değil, ÜRÜN KARARI
     değişti. Paket 6.5'te bu iddia "100 ürün → font KÜÇÜLÜR" diyordu ve
     ölçeğin belgeye yazıldığını böyle kanıtlıyordu. Paket 6.6'nın amacı tam
     olarak bunu düzeltmek: ölçek artık ürün SAYISINDAN değil DOLULUKTAN
     doğuyor ve 100 ürün A4 iki kırım yaprağa (kapasite ~270) rahat sığdığı
     için küçültme YOK, tersine FERAH ölçek seçiliyor.

     İDDİANIN ÖZÜ AYNI KALDI: ölçek belgeye yazılıyor mu ve çizim onu
     okuyor mu. Yön değişti, kanıt gücü değişmedi — hâlâ ölçeksiz değerden
     FARKLI olmak zorunda, üstelik tavanı da çivili.

     "Yoğun belgede küçülme" yönü SAF testlerde ölçülüyor
     (adaptifKarar(5000, 100) → MIN_OLCEK); onu burada 320 ürün girerek
     tekrar ölçmek jsdom'da dakikalar sürer ve aynı şeyi iki kez ölçmüş
     olurduk. Bileşen testinin işi KABLOLAMA. */
  it("ferah belgede bloklar ölçek taşır — kapasite ve çizim aynı sayıyı okur", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    /* 100 ÜRÜN — 60 DEĞİL. Bu test önce 60 ürünle koşuyordu ve "yoğun belge"
       diyordu; ölçtüm: adaptifKarar(60) → varyant `normal`, ölçek TAM 1.0.
       Yani belge hiç sıkışmıyordu, test kendi öncülünü yanlış kuruyordu ve
       yalnız süs iddia sayesinde yeşil kalıyordu. Yoğun bant `normal`ın
       tavanı olan 80'in ÜSTÜNDE başlıyor (ölçüldü: 81 → `yogun`, ölçek 0.9). */
    urunEkle(100); // ad gerekmez: iddia SAYIYA bağlı, sıraya değil
    otomatik();

    /* 1) KAPASİTE tarafı: ölçek bloğa yazıldıysa gizli ürün kalmaz;
          yazılmasaydı kapasite 1 varsayar ve "+N sığmadı" rozeti çıkardı
          (paket 6'da ölçüldü). */
    expect(screen.queryByLabelText(/ürün sığmadı/)).toBeNull();

    /* 2) ÇİZİM tarafı — buranın eski hâli `safeParse({items: []})` idi:
          şemanın boş listeyi kabul ettiğini ölçüyordu, yani bu testin
          konusuyla ilgisi yoktu ve HİÇBİR koşulda kızamazdı. Süs iddia,
          iddia değildir. Gerçek ölçüm satır punto'sudur: belgeye yazılan
          ölçek çizime geçmemişse "ferahlattım" iddiası ekranda karşılıksız
          kalır. */
    const olceksiz_px = TYPO_MM.list_font * PX_PER_MM_TEST;
    const satir = document.querySelector('[data-testid^="blok-"] span[style*="font-size"]');
    expect(satir, "tuvalde çizilmiş satır bulunamadı").not.toBeNull();
    const cizilen_px = Number.parseFloat((satir as HTMLElement).style.fontSize);
    expect(cizilen_px).toBeGreaterThan(0);
    /* FERAH: ölçeksiz değerin ÜSTÜNDE — 100 ürün bu yaprağa rahat sığıyor */
    expect(cizilen_px).toBeGreaterThan(olceksiz_px);
    /* TAVAN ÇİVİLİ: ölçek merdiveninin en üstü 1.25; sınırsız büyüme yok */
    expect(cizilen_px).toBeLessThanOrEqual(olceksiz_px * 1.25 + 0.001);
  });
});
