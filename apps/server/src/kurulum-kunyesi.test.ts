/* KURULUM KÜNYESİ testleri (K-1/C modül sınırı).

   ÖLÇÜLEN YARA: sistemin kendi adı, MÜŞTERİYE GİDEN iki basılı yüzeye elle
   gömülüydü (PresentPage "Bon pour accord" onay sayfası + FichePage nakışçı
   fişi). Modül bir ozalitçiye kiralandığında, o ozalitçinin kendi müşterisine
   bastığı onay sayfasında SATICININ adı çıkardı.

   ÜRÜN KARARINA DOKUNULMADI: varsayılan künye, reponun BUGÜNKÜ dizesidir —
   yeni bir ad UYDURULMADI. Modülün ticari adı K-1'de açıkça açık bırakıldı. */

import { afterEach, describe, expect, it } from "vitest";
import {
  KUNYE_AZAMI,
  KUNYE_ENV,
  VARSAYILAN_KUNYE,
  kurulumKunyesi,
} from "./kurulum-kunyesi.js";

afterEach(() => {
  delete process.env[KUNYE_ENV];
});

describe("kurulum künyesi", () => {
  it("ÖN-KOŞUL: varsayılan künye BUGÜNKÜ basılı dizedir", () => {
    /* Bu satır, "davranış birebir korundu" iddiasının çivisidir. Varsayılan
       bir gün sessizce değişirse burası kırılır ve kiracı olmayan kurulumun
       çıktısı sessizce başkalaşmaz. */
    expect(VARSAYILAN_KUNYE).toBe("TEZGÂH — Atelier graphique");
    expect([...VARSAYILAN_KUNYE].length).toBeLessThanOrEqual(KUNYE_AZAMI);
  });

  it("TANIMSIZ → bugünkü davranış BİREBİR", () => {
    expect(kurulumKunyesi(undefined)).toEqual({
      kunye: VARSAYILAN_KUNYE,
      kaynak: "varsayilan",
    });
  });

  it("BOŞ / boşluk-yalnızca → varsayılan (fırlatmaz)", () => {
    /* `is-kollari` boş listede FIRLATIR çünkü orada boş küme kurulumu
       kullanılamaz kılar. Burada boş künye yalnız "künye istemiyorum" demek
       olurdu ve o bir ürün kararıdır — uydurmak yerine varsayılan sürer. */
    expect(kurulumKunyesi("").kaynak).toBe("varsayilan");
    expect(kurulumKunyesi("   ").kunye).toBe(VARSAYILAN_KUNYE);
  });

  it("KİRACI KÜNYESİ okunur ve kaynak 'yapilandirma' olur", () => {
    expect(kurulumKunyesi("Kuzey Ozalit — Reklam")).toEqual({
      kunye: "Kuzey Ozalit — Reklam",
      kaynak: "yapilandirma",
    });
  });

  it("BAŞTAKİ/SONDAKİ boşluk kırpılır (altbilgi hizasını bozmasın)", () => {
    expect(kurulumKunyesi("  Kuzey Ozalit  ").kunye).toBe("Kuzey Ozalit");
  });

  it("ORTAM DEĞİŞKENİ her çağrıda YENİDEN okunur (donmaz)", () => {
    process.env[KUNYE_ENV] = "Birinci";
    expect(kurulumKunyesi().kunye).toBe("Birinci");
    process.env[KUNYE_ENV] = "İkinci";
    expect(kurulumKunyesi().kunye).toBe("İkinci");
  });

  it("FAIL-LOUD: tavanı aşan künye — sessizce TAŞMAZ, fırlatır", () => {
    /* Sessiz kalsaydı taşmayı ancak basılmış kâğıtta görürdünüz. */
    const uzun = "x".repeat(KUNYE_AZAMI + 1);
    expect(() => kurulumKunyesi(uzun)).toThrow(/tavan/);
    expect(kurulumKunyesi("x".repeat(KUNYE_AZAMI)).kaynak).toBe("yapilandirma"); // sınır dahil
  });

  it("FAIL-LOUD: tavan KARAKTERLE sayılır, bayt'la değil", () => {
    /* Türkçe/Fransızca künyeler çok-baytlı harf taşır ("ş", "é", "—").
       `.length` yerine [...s].length seçimi bu yüzdendir; bayt sayılsaydı
       Türkçe bir künye, aynı uzunluktaki İngilizcesi geçerken reddedilirdi. */
    const turkce = "ş".repeat(KUNYE_AZAMI);
    expect(Buffer.byteLength(turkce)).toBeGreaterThan(KUNYE_AZAMI);
    expect(() => kurulumKunyesi(turkce)).not.toThrow();
  });

  it("FAIL-LOUD: satır sonu içeren künye reddedilir", () => {
    expect(() => kurulumKunyesi("Kuzey\nOzalit")).toThrow(/TEK SATIR/);
  });
});
