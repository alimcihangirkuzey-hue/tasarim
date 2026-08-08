/* PRESET KAPSAMI testleri (K-1/A × K-1/C).

   ÖLÇÜLEN YARA burada ÖNCE KANITLANIR: bugünkü açılış takımının dört kaleminin
   hedef iş kolları ilandan okunur ve `tabelaci` ile `tekstil-baski`ye HİÇBİRİ
   düşmez. Bu, aşağıdaki tüm iddiaların dayandığı olgudur; ilan bir gün
   değişirse bu test kırılır ve paket sessizce anlamsızlaşmaz. */

import { describe, expect, it } from "vitest";
import { OPENING_KIT, type PresetItem } from "@tezgah/shared";
import { SEKTORLER, siparisSektoru } from "@tezgah/templates/identity";
import { acilisTakimiKalemleri } from "./preset-kapsami.js";
import type { IsKollariIlani } from "./is-kollari.js";

const ilan = (aktif: IsKollariIlani["aktif"]): IsKollariIlani => ({
  aktif,
  tumu: SEKTORLER,
  kaynak: "yapilandirma",
});
const varsayilan: IsKollariIlani = { aktif: SEKTORLER, tumu: SEKTORLER, kaynak: "varsayilan" };
const turleri = (k: PresetItem[]): string[] => k.map((x) => x.product_type);

describe("açılış takımının iş kolu dağılımı — yaranın kanıtı", () => {
  it("ÖN-KOŞUL: takım bugün dört kalemli ve hepsi tasarlanabilir bir iş koluna düşer", () => {
    expect(OPENING_KIT.items).toHaveLength(4);
    for (const k of OPENING_KIT.items) {
      expect(siparisSektoru(k.product_type), `${k.product_type}: sektörsüz`).not.toBeNull();
    }
  });

  it("TABELACI ve TEKSTIL-BASKI iş kollarına DÜŞEN KALEM YOK", () => {
    /* Yaranın kendisi: bu iki kurulumda takım tamamen boşalır. */
    const sektorler = OPENING_KIT.items.map((k) => siparisSektoru(k.product_type));
    expect(sektorler).not.toContain("tabelaci");
    expect(sektorler).not.toContain("tekstil-baski");
  });
});

describe("kurulum iş kollarına göre daraltma", () => {
  it("YAPILANDIRMA YOKSA süzme YOK — bugünkü dört kalem birebir", () => {
    expect(acilisTakimiKalemleri(varsayilan)).toEqual([...OPENING_KIT.items]);
  });

  it("TÜM İŞ KOLLARI etkinken hiçbir kalem düşmez", () => {
    expect(acilisTakimiKalemleri(ilan(SEKTORLER))).toEqual([...OPENING_KIT.items]);
  });

  it("MENÜ ÜRETİCİ kurulumunda yalnız menü kalır", () => {
    expect(turleri(acilisTakimiKalemleri(ilan(["menu-uretici"])))).toEqual(["menu"]);
  });

  it("MATBAA kurulumunda flyer + sadakat kartı kalır (ikisi de kart/flyer materyali)", () => {
    expect(turleri(acilisTakimiKalemleri(ilan(["matbaa"])))).toEqual(["flyer", "fidelite"]);
  });

  it("TABELACI kurulumunda takım BOŞALIR — rota bunu 409 ile karşılar", () => {
    expect(acilisTakimiKalemleri(ilan(["tabelaci"]))).toEqual([]);
  });

  it("SIRA KORUNUR — kalanlar takımın ilan sırasındadır", () => {
    const kalan = acilisTakimiKalemleri(ilan(["menu-uretici", "cam-giydirme"]));
    expect(turleri(kalan)).toEqual(["menu", "vitrophanie"]);
  });

  it("DETAYLAR TAŞINIR — süzgeç kalemi kırpmaz", () => {
    const [menu] = acilisTakimiKalemleri(ilan(["menu-uretici"]));
    expect(menu!.details).toEqual({ format: "a3" });
  });

  it("KAÇIŞ KAPISI: iş kolundan bağımsız kalem HER kurulumda kalır", () => {
    /* Bugünkü takımda böyle bir kalem YOK; kural yine de takımın içeriğinden
       BAĞIMSIZ sınanır — takıma yarın `diger` eklenirse davranış hazırdır ve
       o gün bu testi yazmayı kimse hatırlamak zorunda kalmaz. */
    expect(siparisSektoru("diger")).toBeNull();
    const sahteTakim: PresetItem[] = [{ product_type: "menu" }, { product_type: "diger" }];
    expect(turleri(acilisTakimiKalemleri(ilan(["tabelaci"]), sahteTakim))).toEqual(["diger"]);
  });
});
