// @vitest-environment jsdom
/* ŞABLON SEÇİCİ — N seçenek ve GERÇEK iptal (K-1/A).

   NE ÖLÇÜLÜYOR: bu bileşen, `window.confirm`'ün iki ölçülmüş sınırını
   kapatmak için yazıldı ve ikisi de burada KOŞARAK ölçülür:

   1. VAZGEÇEMEME. Eski yolda "İptal" turu iptal etmiyor, İKİNCİ ŞABLONU
      seçiyordu — operatörün çıkışı yoktu. Burada üç ayrı vazgeçme yolu
      (düğme · Escape · zemin) `null` döndürüyor mu diye ölçülür.
   2. ÜÇÜNCÜ ŞABLON. `confirm` iki cevap taşır. Burada ÜÇ seçenekle çizim
      yapılır: üçünün de düğmesi var mı, seçilen doğru kimliği mi döndürüyor.

   NEDEN SENTETİK SEÇENEK KİMLİKLERİ: gerçek ilan bugün en fazla 2 seçenek
   taşıyor. Bileşenin N kapasitesini gerçek ilanla ölçmek mümkün değil — o
   ilan büyüyene kadar bekleseydik, kapasite iddiası ÖLÇÜLMEDEN yeşil
   kalırdı. Kayıtsız kimlikte `sablonAdi` kimliğin kendisini döndürür, yani
   sentetik seçenekler de gerçek üretim davranışını gösterir (uydurma ad yok).

   ASILI KALMA: söz tabanlı bir modal, bileşen çözülürse asla çözülmeyen bir
   söz bırakır ve `topluBaslat` sonsuza dek beklerdi — düğme "Başlatılıyor…"
   hâlinde kilitli kalırdı. Çözülmede vazgeç sözleşmesi burada ölçülür. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ASGARI_SECENEK, useSablonSecici } from "./SablonSecici";
import { sablonAdi } from "../lib/sablonSorusu";

afterEach(cleanup);

const UC = ["menu-grid-cells", "menu-liste-premium", "ucuncu-sablon-xyz"] as const;

/* Sürücü: hook'u gerçek bir bileşende koşturur, cevabı DOM'a yazar.
   Cevap DOM'a yazılır ki iddia "söz çözüldü" değil "çağıran GERÇEKTEN şunu
   aldı" olsun — vazgeçmede boş metin değil "VAZGECILDI" damgası yazılır,
   yoksa "hiç cevap gelmedi" ile "null geldi" ayırt edilemezdi. */
function Surucu({ secenekler = UC as readonly string[] }: { secenekler?: readonly string[] }) {
  const secici = useSablonSecici();
  return (
    <div>
      {secici.eleman}
      <button
        onClick={() => {
          void secici.sor("Menü", secenekler).then((s) => {
            const kutu = document.getElementById("cevap");
            if (kutu) kutu.textContent = s === null ? "VAZGECILDI" : s;
          });
        }}
      >
        sor
      </button>
      <div id="cevap" />
    </div>
  );
}

const cevap = () => document.getElementById("cevap")?.textContent ?? "";
const sorOnu = () => fireEvent.click(screen.getByText("sor"));

/* Seçenek düğmesi KİMLİKLE bulunur, adla değil: kayıtsız bir şablonda ad =
   kimliktir ve metin DOM'da iki kez geçer (başlık + kimlik satırı) — adla
   arama "birden fazla eşleşme" diye patlardı. Kimlik her düğmede tam olarak
   bir kez, kendi düğmesinin içinde bulunur. */
const secenekDugmesi = (tid: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll<HTMLButtonElement>(".modal button")].find((b) =>
    b.textContent?.includes(tid),
  );

describe("N seçenek — ikili diyalogun taşıyamadığı", () => {
  it("ÜÇ seçeneğin ÜÇÜ DE düğme olarak çizilir", async () => {
    render(<Surucu />);
    sorOnu();
    await screen.findByText("Vazgeç");
    for (const tid of UC) {
      const d = secenekDugmesi(tid);
      expect(d, `${tid} düğmesi yok`).toBeTruthy();
      /* Düğme ADI da taşır: kayıtlı şablonda operatör kimliği değil adı okur. */
      expect(d!.textContent).toContain(sablonAdi(tid));
    }
    /* Vazgeç düğmesi seçenek sayılmaz: üç seçenek + vazgeç = dört düğme. */
    expect(document.querySelectorAll(".modal button")).toHaveLength(UC.length + 1);
  });

  it("SEÇİLEN düğme kendi KİMLİĞİNİ döndürür — sıraya bağlı değil", async () => {
    /* Eski yolda cevap "Tamam mı İptal mi"ydi ve kimlik SIRADAN türetiliyordu;
       ilan ters sıralanırsa sessizce yanlış şablon açılırdı. Burada seçilen
       düğme kendi kimliğini taşır. */
    render(<Surucu />);
    sorOnu();
    await screen.findByText("Vazgeç");
    fireEvent.click(secenekDugmesi(UC[2])!);
    await waitFor(() => expect(cevap()).toBe(UC[2]));
  });

  it("KİMLİK de görünür — kayıtsız şablon gizlenmez", async () => {
    render(<Surucu />);
    sorOnu();
    /* Kayıtsız kimlikte ad = kimlik; operatör "bu ne" diye sorabilsin diye
       kimlik her seçenekte ayrıca yazılır. */
    expect((await screen.findAllByText(UC[0])).length).toBeGreaterThan(0);
  });
});

describe("gerçek iptal — üç yol da VAZGEÇER", () => {
  it("VAZGEÇ DÜĞMESİ null döndürür — ikinci şablonu SEÇMEZ", async () => {
    /* Yaranın kendisi: `window.confirm`'de bu tıklama UC[1]'i seçiyordu. */
    render(<Surucu />);
    sorOnu();
    fireEvent.click(await screen.findByText("Vazgeç"));
    await waitFor(() => expect(cevap()).toBe("VAZGECILDI"));
    expect(cevap()).not.toBe(UC[1]);
  });

  it("ESCAPE vazgeçer", async () => {
    render(<Surucu />);
    sorOnu();
    await screen.findByText("Vazgeç");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(cevap()).toBe("VAZGECILDI"));
  });

  it("ZEMİNE tıklamak vazgeçer, KUTUNUN İÇİ kapatmaz", async () => {
    const { container } = render(<Surucu />);
    sorOnu();
    const kutu = await screen.findByText("Vazgeç");
    /* Önce kutunun içine tıkla: kapanmamalı (seçeneğe uzanan el kutuyu
       kapatsaydı, operatör seçemeden vazgeçmiş olurdu). */
    fireEvent.click(container.querySelector(".modal")!);
    expect(cevap()).toBe("");
    expect(kutu).toBeTruthy();
    fireEvent.click(container.querySelector(".modal-back")!);
    await waitFor(() => expect(cevap()).toBe("VAZGECILDI"));
  });

  it("CEVAPTAN SONRA modal KAPANIR — açık kalan kutu ikinci cevabı sordurur", async () => {
    render(<Surucu />);
    sorOnu();
    await screen.findByText("Vazgeç");
    fireEvent.click(secenekDugmesi(UC[0])!);
    await waitFor(() => expect(cevap()).toBe(UC[0]));
    expect(screen.queryByText("Vazgeç")).toBeNull();
  });
});

describe("asılı kalma kapatıldı", () => {
  it("ÇÖZÜLME (unmount) bekleyen soruyu VAZGEÇ olarak çözer", async () => {
    /* Çözülmeseydi `topluBaslat` sonsuza dek beklerdi: düğme
       "Başlatılıyor…" hâlinde kilitli kalır, operatör sayfayı yenilemek
       zorunda kalırdı. Cevap kutusu DOM'da kalsın diye sürücünün DIŞINDA
       tutulur — sürücü çözülünce onunla birlikte gitmesin. */
    const kutu = document.createElement("div");
    kutu.id = "cevap";
    document.body.appendChild(kutu);
    const { unmount } = render(<SurucuDisKutu />);
    sorOnu();
    await screen.findByText("Vazgeç");
    unmount();
    await waitFor(() => expect(kutu.textContent).toBe("VAZGECILDI"));
    kutu.remove();
  });
});

/* Cevabı DIŞARIDAKİ kutuya yazan sürücü (unmount testi için). */
function SurucuDisKutu() {
  const secici = useSablonSecici();
  return (
    <div>
      {secici.eleman}
      <button
        onClick={() => {
          void secici.sor("Menü", UC).then((s) => {
            const k = document.getElementById("cevap");
            if (k) k.textContent = s === null ? "VAZGECILDI" : s;
          });
        }}
      >
        sor
      </button>
    </div>
  );
}

describe("az seçenekte FIRLATIR — sessizce seçmez", () => {
  it("TEK seçenekli soru çağrısı HATA verir", () => {
    /* Tek seçenekli tür `topluPlan`ın `hazir` kovasındadır ve sorusuz koşar.
       Burada sessizce ilkini döndürmek, kova kaymasını görünmez kılardı. */
    let hata: unknown = null;
    function Tek() {
      const secici = useSablonSecici();
      return (
        <button
          onClick={() => {
            try {
              void secici.sor("Menü", ["tek-sablon"]);
            } catch (e) {
              hata = e;
            }
          }}
        >
          sor
        </button>
      );
    }
    render(<Tek />);
    sorOnu();
    expect((hata as Error | null)?.message).toMatch(
      new RegExp(`en az ${ASGARI_SECENEK} seçenek bekler, 1 geldi`),
    );
  });
});
