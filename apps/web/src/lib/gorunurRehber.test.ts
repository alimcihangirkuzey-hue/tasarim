/* "BU İŞ NE?" REHBERİ × KURULUM İŞ KOLLARI (K-1/C modül sınırı).

   ÖLÇÜLEN YARA: Belgeler sekmesi rehberle AÇILIR (DocumentsPanel:103) ve
   rehberin beş seçeneği kurulumun iş kollarını hiç okumuyordu — oysa
   `aktifSektorler` AYNI bileşende hesaplanıp hemen altındaki "doğrudan seç"
   listesine veriliyordu. Beş seçeneğin hedefi ilandan okununca menu-uretici×3
   + matbaa×2 çıkıyor; tabelacıya daraltılmış kurulumda operatörün gördüğü İLK
   ekran, kurulumun HİÇ yapmadığı beş işi öneriyordu. */

import { describe, expect, it } from "vitest";
import { SEKTORLER, hedefSektorOf } from "@tezgah/templates/identity";
import { gorunurRehberSecenekleri } from "./gorunurRehber";

/** Bileşendeki küratörlü liste — bu testin ölçtüğü kümenin aynısı. */
const REHBER = [
  { tid: "menu-liste-premium" },
  { tid: "menu-grid-cells" },
  { tid: "menu-trifold" },
  { tid: "flyer" },
  { tid: "carte-fidelite" },
];

describe("rehber seçeneklerinin iş kolu dağılımı — yaranın kanıtı", () => {
  it("ÖN-KOŞUL: beş seçeneğin hepsi KAYITLI ve bir iş koluna düşüyor", () => {
    /* Biri kayıtsız olsaydı (hedefSektorOf null) daraltma onu hiç düşürmez ve
       aşağıdaki "boşalır" iddiası sessizce anlamsızlaşırdı. */
    for (const o of REHBER) {
      expect(hedefSektorOf(o.tid), `${o.tid}: sektörsüz`).not.toBeNull();
    }
  });

  it("REHBER yalnız İKİ iş koluna hitap ediyor (menu-uretici + matbaa)", () => {
    const kollar = new Set(REHBER.map((o) => hedefSektorOf(o.tid)));
    expect([...kollar].sort()).toEqual(["matbaa", "menu-uretici"]);
  });

  it("TABELACI · TEKSTİL · CAM kurulumlarında rehber TAMAMEN boşalır", () => {
    /* Yaranın kendisi: bu üç kurulumda açılış ekranı, yapılamayan işleri
       öneriyordu. Artık boşalıyor — ve boş ızgara çizmek yerine bileşen
       "doğrudan seç"e düşüyor (etkinMod türetmesi). */
    for (const kol of ["tabelaci", "tekstil-baski", "cam-giydirme"] as const) {
      expect(gorunurRehberSecenekleri(REHBER, [kol]), `${kol}`).toEqual([]);
    }
  });
});

describe("rehber daraltması", () => {
  it("YAPILANDIRMA YOKSA süzme YOK — bugünkü davranış birebir", () => {
    expect(gorunurRehberSecenekleri(REHBER, undefined)).toEqual(REHBER);
  });

  it("TÜM iş kolları etkinken hiçbir seçenek düşmez", () => {
    expect(gorunurRehberSecenekleri(REHBER, SEKTORLER)).toEqual(REHBER);
  });

  it("MENÜ ÜRETİCİ kurulumunda yalnız menü şablonları kalır", () => {
    const g = gorunurRehberSecenekleri(REHBER, ["menu-uretici"]).map((o) => o.tid);
    expect(g).toEqual(["menu-liste-premium", "menu-grid-cells", "menu-trifold"]);
  });

  it("MATBAA kurulumunda flyer + sadakat kartı kalır", () => {
    const g = gorunurRehberSecenekleri(REHBER, ["matbaa"]).map((o) => o.tid);
    expect(g).toEqual(["flyer", "carte-fidelite"]);
  });

  it("SIRA KORUNUR — kalanlar küratörlü listenin sırasındadır", () => {
    const g = gorunurRehberSecenekleri(REHBER, ["matbaa", "menu-uretici"]);
    expect(g).toEqual(REHBER);
  });

  it("KAYITSIZ/SEKTÖRSÜZ şablon DÜŞMEZ (gorunurSablonlar sözleşmesi)", () => {
    /* İş kolundan bağımsız olan şey daraltmanın konusu değildir; fabrika
       üretimi şablonlar kimlik kapsamı dışındadır ve null döner. */
    const sahte = [{ tid: "kayitsiz-sablon-xyz" }];
    expect(hedefSektorOf("kayitsiz-sablon-xyz")).toBeNull();
    expect(gorunurRehberSecenekleri(sahte, ["tabelaci"])).toEqual(sahte);
  });

  it("LİSTEYE ŞABLON EKLEMEZ — yalnız daraltır", () => {
    /* Hangi şablonun rehbere değer bir başlangıç noktası olduğu İÇERİK
       kararıdır (FAZ5 §8); bu katman onu üretmez. */
    for (const kol of SEKTORLER) {
      const g = gorunurRehberSecenekleri(REHBER, [kol]);
      expect(g.every((o) => REHBER.includes(o)), `${kol}: listede olmayan seçenek`).toBe(true);
    }
  });
});
