// @vitest-environment jsdom
/* ÇOK SAYFALI BELGE arayüzü — paket 6.5 (journal 2026-08-07-cok-sayfa).
   Saf sayfalama templates'te 20 testle çivili; buradaki soru KABLOLAMA:
   sayfa sayısı görünüyor mu, gezinim çalışıyor mu, tek sayfada gürültü
   üretilmiyor mu. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TasarimPage } from "./TasarimPage";

afterEach(cleanup);
const denetci = (): HTMLElement => screen.getByLabelText("Blok ayarları");
const blokEkle = (ad: string): void =>
  void fireEvent.click(within(screen.getByLabelText("Bloklar")).getByText(ad));
const otomatik = (): void => void fireEvent.click(screen.getByText("Otomatik Yerleştir"));
/* Ürünü SAYIYLA ekler, ad yazmaz. Ad yazan yol her kalemde bir DOM taraması
   + bir change olayı üretiyor ve denetçi her tuşta tüm satırları yeniden
   çizdiği için maliyet kalem sayısının karesiyle büyüyor: ölçüldü, 200
   kalem ~3750 ms. Ad yazmayan yol aynı kullanıcı eylemini kullanır ve
   sayfalama iddiası ada değil SAYIYA bağlıdır. */
function urunEkle(n: number): void {
  const dugme = within(denetci()).getByText("+ Ürün Ekle");
  for (let i = 0; i < n; i++) fireEvent.click(dugme);
}
/** Sayfalamanın gerçekten doğduğu eşik — ÖLÇÜLDÜ: 200 → 1 yaprak, 300 → 2. */
const COK_SAYFA_ESIGI = 300;

describe("Sayfa gezinimi", () => {
  it("TEK sayfada gezinim GÖSTERİLMEZ (gürültü yok)", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(10);
    otomatik();
    expect(screen.queryByLabelText("Sayfa gezinimi")).toBeNull();
  });

  /* MALİYET ŞERHİ: bu test 300 ürünü GERÇEK düğmeye basarak giriyor (state
     enjeksiyonu yok) ve ~9 saniye sürüyor. Süre denetçinin O(n²) yeniden
     çiziminden geliyor; bu GERÇEK BİR UX BULGUSUDUR (hedef kullanım 100+
     ürün) ve rapora geçti — sanal liste/memoization ayrı iş.
     ÜÇ İDDİA TEK TESTTE: ayrı ayrı yazılsaydı 300 kalemlik kurulum üç kez
     ödenirdi; iddialar aynı belgeyi paylaşabildiği için tek kurulum yeter. */
  it("ÇOK sayfada gezinim doğar, ileri/geri çalışır, veri kaybı olmaz", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunEkle(COK_SAYFA_ESIGI);
    otomatik();

    /* 1) GEZİNİM DOĞAR ve sayfa sayısını SÖYLER */
    const gez = screen.getByLabelText("Sayfa gezinimi");
    expect(gez.textContent).toMatch(/1 \/ [2-9]\d* sayfa/);
    const sayfaSayisi = Number(/\/ (\d+) sayfa/.exec(gez.textContent ?? "")![1]);
    expect(sayfaSayisi).toBeGreaterThan(1);

    /* 2) İLERİ/GERİ ÇALIŞIR — ilk sayfada "önceki" kapalı olmalı */
    expect((within(gez).getByLabelText("Önceki sayfa") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(gez).getByLabelText("Sonraki sayfa"));
    expect(screen.getByLabelText("Sayfa gezinimi").textContent).toContain(`2 / ${sayfaSayisi} sayfa`);
    /* 2. sayfa BOŞ DEĞİL — arada boş sayfa yasağının arayüz tarafı */
    expect(document.querySelectorAll('[data-testid^="blok-"]').length).toBeGreaterThan(0);
    fireEvent.click(within(screen.getByLabelText("Sayfa gezinimi")).getByLabelText("Önceki sayfa"));
    expect(screen.getByLabelText("Sayfa gezinimi").textContent).toContain(`1 / ${sayfaSayisi} sayfa`);

    /* 3) VERİ KAYBI YOK: hiçbir sayfada "sığmadı" rozeti kalmaz */
    expect(screen.queryByLabelText(/ürün sığmadı/)).toBeNull();

    /* 4) GERİ AL BELGEYİ BÜTÜN GERİ VERİR — REGRESYON çivisi. Geçmiş yığını
          bir tur yalnız İLK YAPRAĞI saklıyordu; Geri Al çok sayfalı belgeyi
          tek sayfaya indiriyordu, yani açık kullanıcı eylemiyle veri kaybı.

          NİÇİN OTOMATİK YERLEŞİM İKİ KEZ: geçmişe ÇOK SAYFALI bir belgenin
          düşmesi için gerekiyor. İlk koşu tek yapraklı belgeyi N yaprağa
          böler ve geçmişe TEK yapraklı hâli yazar; kusuru görmek için
          geçmişe N yapraklı bir belge düşmeli, onu da ikinci koşu yazar.
          Bu ayrım ölçülerek bulundu: iddia önce tek koşuyla yazılmıştı ve
          kusuru bilerek geri koyduğumda KIZMADI — çünkü geçmişteki belge
          zaten tek yapraklıydı, `[b[0]]` ile `b` aynı şeydi. Yani iddia
          düzeltilen kusurun üstünden geçmiyordu. */
    otomatik(); // ikinci koşu: N yapraklı belge geçmişe yazılır
    fireEvent.click(screen.getByText("Geri Al"));
    expect(screen.getByLabelText("Sayfa gezinimi").textContent).toContain(`/ ${sayfaSayisi} sayfa`);
  }, 60_000);
});
