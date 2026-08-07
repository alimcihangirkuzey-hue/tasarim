// @vitest-environment jsdom
/* SEÇİM SORUSU — KENDİ sözleşmesi, SENTETİK istemle (K-1/A).

   BU DOSYANIN NEDEN VAR OLDUĞU ÖLÇÜLDÜ, VARSAYILMADI. Makine iki tüketici
   tarafından kullanılıyor (şablon seçici · müşteri klonlama) ve ikisinin de
   testleri yeşildi. Sonra bir NEGATİF KONTROL koşuldu: modal'ın `vazgecEtiketi`
   parametresi YOK SAYILDI ve yerine düz "Vazgeç" yazıldı → 17/17 YEŞİL.
   ISIRMADI.

   SEBEP: iki tüketicinin vazgeç etiketi BUGÜN AYNI dizedir
   (`orders.template_pick_cancel` = "Vazgeç", `clone.cancel` = "Vazgeç").
   Yani "etiket istemden gelir" güvencesi YAZILIYDI ama ÖLÇÜLMÜYORDU: bugünkü
   veriyle, parametreyi okuyan bir uygulama ile onu yok sayan bir uygulama
   ayırt edilemez. Aynı sınıf `tekSektorAtfi`de de çıkmıştı (kural bugünkü
   kayıt defteriyle ayırt edilemiyordu) ve çözüm aynıdır: sözleşmeyi
   TÜKETİCİLERDEN AYIRIP sentetik istemle doğrudan sınamak.

   AYNI KÖR NOKTA ÜÇ YERDE DAHA VARDI ve üçü de buraya çivilendi:
   · `deger` mi `ad` mı dönüyor — şablon tarafında kayıtsız kimlikte ikisi
     AYNI dizedir, yani ayrım ölçülmüyordu;
   · `ipucu` yokken çizilmemesi — iki tüketici de ipucu VERİYOR;
   · `aciklama` yokken çizilmemesi — iki tüketici de açıklama VERİYOR. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ASGARI_SECENEK, useSecimSorusu, type SecimIstemi } from "./SecimSorusu";

afterEach(cleanup);

/* SENTETİK İSTEM: hiçbir tüketicinin metinleriyle çakışmayan değerler. Gerçek
   i18n metinleriyle ölçmek, tam da yukarıdaki kör noktayı geri getirirdi. */
const VAZGEC = "SENTETIK-VAZGEC-9137";
const ISTEM: SecimIstemi = {
  baslik: "SENTETIK-BASLIK-9137",
  ipucu: "SENTETIK-IPUCU-9137",
  secenekler: [
    { deger: "deg-a", ad: "AD-A", aciklama: "ACIKLAMA-A" },
    { deger: "deg-b", ad: "AD-B" },
  ],
  vazgecEtiketi: VAZGEC,
};

/* Sürücü: cevabı DOM'a yazar — iddia "söz çözüldü" değil "çağıran GERÇEKTEN
   şunu aldı" olsun diye. Vazgeçmede boş metin değil damga yazılır, yoksa
   "hiç cevap gelmedi" ile "null geldi" ayırt edilemezdi. */
function Surucu({ istem = ISTEM }: { istem?: SecimIstemi }) {
  const soru = useSecimSorusu();
  return (
    <div>
      {soru.eleman}
      <button
        onClick={() => {
          void soru.sor(istem).then((s) => {
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
const modalDugmeleri = () => [...document.querySelectorAll<HTMLButtonElement>(".modal button")];
const dugme = (metin: string) => modalDugmeleri().find((b) => b.textContent?.includes(metin));

describe("ön-koşul — modal GERÇEKTEN açılıyor", () => {
  it("SORULMADAN modal YOKTUR, sorulunca VARDIR", async () => {
    /* Bu satır olmadan aşağıdaki "şu metin yok" iddiaları, hiç modal
       açmayan bozuk bir uygulamayla da yeşil kalırdı. */
    render(<Surucu />);
    expect(document.querySelector(".modal")).toBeNull();
    sorOnu();
    await screen.findByText(ISTEM.baslik);
    expect(modalDugmeleri()).toHaveLength(ISTEM.secenekler.length + 1); // seçenekler + vazgeç
  });
});

describe("İSTEM okunur — düz yazılmaz (ısırmayan NK'nin kapattığı boşluk)", () => {
  it("VAZGEÇ ETİKETİ İSTEMDEN gelir — tüketicinin metni gömülü DEĞİL", async () => {
    /* NEGATİF KONTROLÜN ISIRMADIĞI YER: iki tüketicinin de etiketi "Vazgeç"
       olduğu için, parametreyi yok sayan bir uygulama ikisinin testinde de
       yeşil kalıyordu. */
    render(<Surucu />);
    sorOnu();
    await screen.findByText(VAZGEC);
    expect(screen.queryByText("Vazgeç"), "gömülü etiket sızdı").toBeNull();
  });

  it("BAŞLIK ve İPUCU istemden gelir", async () => {
    render(<Surucu />);
    sorOnu();
    await screen.findByText(ISTEM.baslik);
    expect(screen.getByText(ISTEM.ipucu!)).toBeTruthy();
  });

  it("İPUCU YOKSA çizilmez — boş bir satır bırakılmaz", async () => {
    render(<Surucu istem={{ ...ISTEM, ipucu: undefined, secenekler: yalinSecenekler() }} />);
    sorOnu();
    await screen.findByText(ISTEM.baslik);
    expect(document.querySelectorAll(".modal .muted")).toHaveLength(0);
  });

  it("AÇIKLAMA VARSA çizilir, YOKSA çizilmez", async () => {
    render(<Surucu />);
    sorOnu();
    await screen.findByText(ISTEM.baslik);
    expect(dugme("AD-A")!.textContent).toContain("ACIKLAMA-A");
    /* İkinci seçeneğin açıklaması yok: düğmesinde ikinci satır OLMAMALI. */
    expect(dugme("AD-B")!.querySelectorAll(".muted")).toHaveLength(0);
  });
});

describe("DÖNEN DEĞER — `deger`, `ad` DEĞİL", () => {
  it("seçilen düğme kendi DEĞERİNİ döndürür", async () => {
    /* Şablon tüketicisinde bu ayrım ölçülemiyordu: kayıtsız bir şablonda
       `deger` (kimlik) ile `ad` AYNI dizedir. Burada bilerek farklılar. */
    render(<Surucu />);
    sorOnu();
    await screen.findByText(VAZGEC);
    fireEvent.click(dugme("AD-B")!);
    await waitFor(() => expect(cevap()).toBe("deg-b"));
    expect(cevap()).not.toBe("AD-B");
  });
});

describe("üç vazgeçme yolu da null döndürür", () => {
  it.each([
    ["düğme", () => fireEvent.click(screen.getByText(VAZGEC))],
    ["Escape", () => fireEvent.keyDown(window, { key: "Escape" })],
    ["zemin", () => fireEvent.click(document.querySelector(".modal-back")!)],
  ])("%s vazgeçer — İLK SEÇENEĞİ SEÇMEZ", async (_ad, eylem) => {
    render(<Surucu />);
    sorOnu();
    await screen.findByText(VAZGEC);
    eylem();
    await waitFor(() => expect(cevap()).toBe("VAZGECILDI"));
    expect(cevap()).not.toBe("deg-a");
  });
});

describe("az seçenekte SENKRON fırlatır", () => {
  it("TEK seçenekli istem HATA verir — sessizce seçmez", async () => {
    /* Senkron olması sözleşmenin parçası: `async` yapmak hatayı reddedilen
       bir söze çevirir ve çağıranın `try/catch`i onu göremezdi. */
    let hata: unknown = null;
    function Tek() {
      const soru = useSecimSorusu();
      return (
        <button
          onClick={() => {
            try {
              void soru.sor({ ...ISTEM, secenekler: [{ deger: "tek", ad: "Tek" }] });
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
    expect((hata as Error | null)?.message).toContain("tek"); // hangi seçenek geldiği görünür
  });
});

/** Açıklamasız seçenekler — "muted yok" iddiasının açıklamadan gelmediğini
    garanti eder (yoksa test ipucu yerine açıklamayı ölçerdi). */
function yalinSecenekler() {
  return ISTEM.secenekler.map((s) => ({ deger: s.deger, ad: s.ad }));
}
