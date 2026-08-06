// @vitest-environment jsdom
/* TUR SONUCU PANELİ (K-1/B).

   NE ÖLÇÜLÜYOR: toast'ın yapamadığı üç şey. Her biri ÖLÇÜLMÜŞ bir yaradır,
   varsayım değil:

   1. SATIRLARIN AYRI GÖRÜNMESİ. Eski sunum `"\n"` ile birleştirilmiş TEK bir
      dizeydi; `.toast` kuralında `white-space` YOKTUR (styles.css) ve tarayıcı
      varsayılanı satır sonlarını BOŞLUĞA çevirir. Burada her satırın KENDİ
      elemanı olduğu ölçülür — CSS'e bağlı bir söz verilmiyor.
   2. KALICILIK. Toast 4,5 saniyede siliniyordu. Panelin kapanması yalnız
      operatörün tıklamasıyla olur; burada kapatmanın çağrıldığı ölçülür
      (zamanlayıcı testi YAZILMADI: fake-timer kurulumu react-query'nin kendi
      zamanlayıcılarıyla çakışır — bu dosyanın kardeşlerindeki kayıtlı karar).
   3. DOKTRİN: başarılılar SAYIYLA, sorunlular ADIYLA. Kalıcı panelde yer var
      diye 20 başarılı satırı dizmek, 2 sorunlu satırı gömerdi.

   KAYDIRMA (max-height + overflow) BİR CSS KURALIDIR ve jsdom stylesheet
   uygulamaz — burada ÖLÇÜLMEZ. Sessizce ölçülmüş gibi davranmamak için
   söyleniyor: uzun listenin duvara dönmemesi `.tur-sonucu-liste` kuralına
   bağlıdır ve bu dosyanın kapsamı dışındadır. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TurSonucu, sorunluSatirlar, type TurSatiri } from "./TurSonucu";

afterEach(cleanup);

const SATIRLAR: TurSatiri[] = [
  { ad: "Tabela · 100×50 cm", durum: "tamam", gerekce: null },
  { ad: "Menü · A4", durum: "engelli", gerekce: "Logo eksik" },
  { ad: "Flyer · A5", durum: "dusen", gerekce: "500" },
];

const ciz = (satirlar: readonly TurSatiri[], onKapat = vi.fn()) => {
  const r = render(<TurSonucu veri={{ baslik: "1 üretildi · 1 engelli · 1 düştü", satirlar }} onKapat={onKapat} />);
  return { ...r, onKapat };
};

describe("satırlar AYRI elemanlarda — dize birleştirme değil", () => {
  it("HER SORUNLU SATIR kendi elemanında", () => {
    /* Yaranın kökü: eski sunumda iki gerekçe tek metin düğümündeydi ve satır
       sonu tarayıcıda boşluğa dönüyordu. */
    const { container } = ciz(SATIRLAR);
    expect(container.querySelectorAll(".tur-sonucu-satir")).toHaveLength(2);
  });

  it("GEREKÇE de KENDİ elemanında — ad ile aynı metin düğümünde değil", () => {
    const { container } = ciz(SATIRLAR);
    const ilk = container.querySelectorAll(".tur-sonucu-satir")[0]!;
    const parcalar = [...ilk.children].map((c) => c.textContent);
    /* Rozet · ad · gerekçe: üç ayrı eleman. Ad ile gerekçe tek düğümde olsaydı
       uzun bir gerekçe adı okunmaz hâle getirirdi. */
    expect(parcalar).toEqual(["engelli", "Menü · A4", "Logo eksik"]);
  });

  it("SATIRDA HİÇ satır sonu KARAKTERİ yok — ayrım yapısal", () => {
    const { container } = ciz(SATIRLAR);
    expect(container.querySelector(".tur-sonucu")!.textContent).not.toContain("\n");
  });
});

describe("doktrin — başarılılar SAYIYLA, sorunlular ADIYLA", () => {
  it("BAŞARILI satır listelenmez", () => {
    ciz(SATIRLAR);
    expect(screen.queryByText("Tabela · 100×50 cm")).toBeNull();
    expect(screen.getByText("Menü · A4")).toBeTruthy();
  });

  it("BAŞLIK sayıları taşır — bilgi kaybolmuyor, yer değiştiriyor", () => {
    ciz(SATIRLAR);
    expect(screen.getByText("1 üretildi · 1 engelli · 1 düştü")).toBeTruthy();
  });

  it("saf ayıklayıcı: sorunlu = tamam OLMAYAN", () => {
    expect(sorunluSatirlar(SATIRLAR).map((s) => s.durum)).toEqual(["engelli", "dusen"]);
  });
});

describe("sessiz boşluk yok", () => {
  it("HEPSİ TAMAMSA panel yine de KONUŞUR", () => {
    /* Boş bir kutu, "sonuç gelmedi" ile "her şey yolunda"yı aynı gösterirdi —
       bu deponun tekrar tekrar ödediği sınıf. */
    const { container } = ciz([{ ad: "Tabela", durum: "tamam", gerekce: null }]);
    expect(container.querySelectorAll(".tur-sonucu-satir")).toHaveLength(0);
    expect(container.querySelector(".tur-sonucu")!.textContent).toContain("sorunsuz");
  });
});

describe("kalıcılık — kapanış operatörün elinde", () => {
  it("✕ KAPATMA çağırır", () => {
    const { onKapat } = ciz(SATIRLAR);
    fireEvent.click(screen.getByTitle("Sonucu kapat"));
    expect(onKapat).toHaveBeenCalledTimes(1);
  });

  it("KENDİ KENDİNE kapanmaz — kapatma çağrılmadan panel DURUR", () => {
    const { container, onKapat } = ciz(SATIRLAR);
    expect(onKapat).not.toHaveBeenCalled();
    expect(container.querySelector(".tur-sonucu")).toBeTruthy();
  });
});

describe("durum rozeti", () => {
  it("ENGELLİ ile DÜŞEN farklı rozet taşır — biri kapı, diğeri arıza", () => {
    /* Aynı rozeti taşısalardı operatör "sistem engelledi" ile "bir şey
       bozuldu"yu ayırt edemezdi; ikisinin yapılacak işi farklıdır. */
    const { container } = ciz(SATIRLAR);
    const rozetler = [...container.querySelectorAll(".tur-sonucu-satir .pill")].map((p) => p.className);
    expect(new Set(rozetler).size).toBe(2);
    expect(rozetler[0]).toContain("warn");
    expect(rozetler[1]).toContain("red");
  });
});
