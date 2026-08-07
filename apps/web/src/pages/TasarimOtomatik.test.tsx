// @vitest-environment jsdom
/* OTOMATİK YERLEŞİM arayüz testleri — paket 4
   (journal 2026-08-07-otomatik-yerlesim).

   Saf motor templates'te 26 testle çivili; buradaki soru KABLOLAMA:
   düğme motoru çağırıyor mu, rapor ekrana ulaşıyor mu, geri al gerçekten
   eski hâle döndürüyor mu, ve EN ÖNEMLİSİ — otomatik yerleşim kendiliğinden
   KOŞMUYOR mu (kullanıcının elle kurduğu düzen habersiz bozulmamalı). */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

/** Panelde kaç blok var */
const blokSayisi = (id: string): number =>
  panel(id).querySelectorAll('[data-testid^="blok-"]').length;

function urunDoldur(n: number, on = "U"): void {
  for (let i = 0; i < n; i++) {
    fireEvent.click(within(denetci()).getByText("+ Ürün Ekle"));
    const adlar = within(denetci()).getAllByLabelText("Ürün adı");
    fireEvent.change(adlar[adlar.length - 1], { target: { value: `${on}${i}` } });
  }
}

describe("Otomatik Yerleştir — açık kullanıcı eylemi", () => {
  it("KENDİLİĞİNDEN KOŞMAZ: blok eklemek yerleşimi yeniden dizmez", () => {
    /* Ürün sahibinin açık kuralı. Bu test olmadan bir gün eklenen bir
       useEffect kullanıcının düzenini sessizce ezerdi. */
    render(<TasarimPage />);
    blokEkle("Logo"); // tıkla-ekle → dis-0'a düşer
    expect(blokSayisi("dis-0")).toBe(1);
    blokEkle("İletişim"); // ikinci blok da dis-0'a
    /* Otomatik yerleşim koşsaydı logo ÖN kapağa (dis-2), iletişim ARKAYA
       (dis-1) taşınırdı. Taşınmadı → arka planda koşan yol yok. */
    expect(blokSayisi("dis-0")).toBe(2);
    expect(blokSayisi("dis-2")).toBe(0);
  });

  it("düğmeye basılınca bloklar EĞİLİMLERİNE göre dağılır", () => {
    render(<TasarimPage />);
    blokEkle("Logo");
    blokEkle("İletişim");
    expect(blokSayisi("dis-0")).toBe(2);

    otomatik();

    /* logo → ön kapak (dis-2) · iletişim → arka (dis-1) */
    expect(within(panel("dis-2")).getByTitle("Logo")).toBeDefined();
    expect(within(panel("dis-1")).getByTitle("İletişim")).toBeDefined();
    expect(blokSayisi("dis-0")).toBe(0);
  });

  it("sonuç kullanıcıya bildirilir (sessiz çalışmaz)", () => {
    render(<TasarimPage />);
    blokEkle("Logo");
    otomatik();
    expect(screen.getByText(/Yerleştirildi — dış yüz \d+, iç yüz \d+ blok/)).toBeDefined();
  });
});

describe("Geri Al", () => {
  it("başlangıçta KİLİTLİ (geri alınacak bir şey yok)", () => {
    render(<TasarimPage />);
    expect(screen.getByText("Geri Al")).toHaveProperty("disabled", true);
  });

  it("otomatik yerleşim SONRASI açılır ve eski düzeni GERÇEKTEN geri getirir", () => {
    render(<TasarimPage />);
    blokEkle("Logo");
    blokEkle("İletişim");
    expect(blokSayisi("dis-0")).toBe(2);

    otomatik();
    expect(blokSayisi("dis-0")).toBe(0);

    const geri = screen.getByText("Geri Al");
    expect(geri).toHaveProperty("disabled", false);
    fireEvent.click(geri);

    /* İki blok da elle bırakıldıkları panele döndü */
    expect(blokSayisi("dis-0")).toBe(2);
    expect(blokSayisi("dis-2")).toBe(0);
    expect(screen.getByText("Geri alındı")).toBeDefined();
  });

  it("geri aldıktan sonra tekrar KİLİTLENİR", () => {
    render(<TasarimPage />);
    blokEkle("Logo");
    otomatik();
    fireEvent.click(screen.getByText("Geri Al"));
    expect(screen.getByText("Geri Al")).toHaveProperty("disabled", true);
  });
});

describe("Otomatik yerleşim sonrası — manuel düzenleme YAŞAR", () => {
  it("yerleşen blok hâlâ SEÇİLEBİLİR ve içeriği düzenlenebilir", () => {
    render(<TasarimPage />);
    blokEkle("Kategori Başlığı");
    fireEvent.change(within(denetci()).getByLabelText("Kategori adı"), {
      target: { value: "Pizzalar" },
    });
    otomatik();

    /* Otomatik yerleşim seçimi temizler; blok yine tıklanabilir olmalı */
    const yerlesmis = screen.getByTitle("Kategori Başlığı");
    fireEvent.click(yerlesmis);
    expect(within(denetci()).getByLabelText("Kategori adı")).toHaveProperty("value", "Pizzalar");
  });

  it("İÇERİK KORUNUR — yerleşim ürünlere dokunmaz", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(6, "P");
    otomatik();
    fireEvent.click(screen.getAllByTitle("Fiyat Listesi")[0]);
    /* Altı ürün de düzenleyicide duruyor */
    expect(within(denetci()).getAllByLabelText("Ürün adı").length).toBeGreaterThanOrEqual(6);
  });
});

describe("Bölme ve açık taşma raporu", () => {
  it("uzun liste DEVAM bloğuna bölünür ve bu SÖYLENİR", () => {
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(45, "P"); // 45×5.5 = 247mm > 200mm içerik boyu
    otomatik();
    expect(screen.getByText(/\d+ blok devam bloğuna bölündü — ürün kaybı yok/)).toBeDefined();
  });

  it("BÖLME SONRASI hiçbir blokta '+N gizli' KALMAZ", () => {
    /* Ürün sahibi kuralı: "+N gizli" nihai otomatik yerleşim sonucu olmasın */
    render(<TasarimPage />);
    blokEkle("Fiyat Listesi");
    urunDoldur(45, "P");
    otomatik();
    expect(screen.queryByLabelText(/ürün sığmadı/)).toBeNull();
  });

  /* NOT — "yaprağa sığmayan raporlanır" testi BURADAN KALDIRILDI ve saf
     katmana taşındı (blok-yerlesim.test.ts). İki sebeple: (a) arayüzden 160
     ürün girmek 8sn sürüyordu ve zaman aşımına düşüyordu; (b) daha kötüsü,
     iddia `if (uyari)` sarmalındaydı — altı panelin toplam 1200mm sütun boyu
     o içeriği YUTUYORDU, taşma hiç oluşmuyordu ve test hiçbir şey ölçmeden
     yeşil geçiyordu. Saf testte taşma gerçekten zorlanır ve ölçülür. */
});
