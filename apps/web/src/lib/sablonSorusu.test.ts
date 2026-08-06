/* ŞABLON SEÇİM SORUSU (K-1/A — tek tık akışı).

   ÖLÇÜLEN YARA (üç parça, hepsi bu turda komutla ölçüldü):

   1. METİN ZATEN KAYMIŞTI. i18n'deki soru "Tamam = Resimli Izgara, İptal =
      Premium Liste" diyordu; manifestlerin gerçek adları "Resimli Izgara Menü"
      ve "Premium Yazılı Menü". "Premium Liste" sistemde YOK.
   2. SIRA SÖZLEŞMESİ ("Tamam = ilk seçenek") yalnız çağrı yerindeki
      `secenekler[0]`'da yaşıyordu — ilan ters sıralanırsa diyalog yanlış adı
      söylerdi, sessizce.
   3. SORU MENÜYE ÖZGÜYDÜ ama koşul `secenekler.length >= 2` — türden bağımsız.
      Bugün yalnız `menu` iki seçenekli olduğu için latent; `tabela` ikinci bir
      şablon aldığı gün tabelacıya "Menü şablonu seç" sorulacaktı. */

import { describe, expect, it } from "vitest";
import { SIPARIS_SABLONLARI, siparisSablonlari } from "@tezgah/templates/identity";
import { TEMPLATES } from "@tezgah/templates";
import { ProductTypeSchema } from "@tezgah/shared";
import { IKILI_SECENEK, sablonAdi, sablonSec, sablonSecimSorusu } from "./sablonSorusu";

const MENU_SECENEKLERI = siparisSablonlari("menu");

describe("ön-koşul — ikili seçicinin dayandığı ilan", () => {
  it("MENÜ gerçekten İKİ seçenekli (soru sorulan tek tür)", () => {
    /* Bu satır olmadan aşağıdaki metin iddiaları, tek seçenekli bir ilanda
       hiç çağrılmadan yeşil kalırdı. */
    expect(MENU_SECENEKLERI).toHaveLength(IKILI_SECENEK);
  });

  it("HİÇBİR TÜR ikiden fazla şablon İLAN ETMİYOR — ikili diyalog yeterli", () => {
    /* NÖBETÇİ: üçüncü bir şablon eklendiği gün burası KIRMIZI olur. Bu istenen
       davranıştır — ikili `window.confirm` fazlasını SESSİZCE gizlerdi ve
       operatör o şablona toplu akıştan hiç ulaşamazdı. Kırmızı test, gerçek
       bir N-seçenekli seçici yazılana kadar sürümü durdurur. */
    const fazla = ProductTypeSchema.options
      .map((t) => [t, SIPARIS_SABLONLARI[t]] as const)
      .filter(([, s]) => s.length > IKILI_SECENEK)
      .map(([t, s]) => `${t}: ${s.length}`);
    expect(
      fazla,
      "Bu tür(ler) ikiden fazla şablon ilan ediyor: ikili diyalog fazlasını " +
        "sessizce gizler. N-seçenekli bir seçici gerekiyor (K-1/A).",
    ).toEqual([]);
  });

  it("SORULAN her seçenek KAYITLI — ad uydurulmuyor", () => {
    for (const tid of MENU_SECENEKLERI) {
      expect(TEMPLATES[tid], `${tid}: kayıtlı değil`).toBeTruthy();
    }
  });
});

describe("şablon adı", () => {
  it("KAYIT DEFTERİNDEN okunur — elle yazılmaz", () => {
    for (const tid of MENU_SECENEKLERI) {
      expect(sablonAdi(tid)).toBe(TEMPLATES[tid]!.manifest.name_tr);
    }
  });

  it("KAYITSIZ kimlikte kimliğin KENDİSİ döner — sahte ad üretilmez", () => {
    expect(sablonAdi("kayitsiz-sablon-xyz")).toBe("kayitsiz-sablon-xyz");
  });
});

describe("soru metni", () => {
  it("HER İKİ ŞABLONUN GERÇEK ADINI taşır", () => {
    /* Yaranın kendisi: eski metin "Premium Liste" diyordu, gerçek ad
       "Premium Yazılı Menü". */
    const soru = sablonSecimSorusu("Menü", MENU_SECENEKLERI);
    for (const tid of MENU_SECENEKLERI) {
      expect(soru, `${tid} adı soruda yok`).toContain(TEMPLATES[tid]!.manifest.name_tr);
    }
  });

  it("TÜR ADI ÇAĞIRANDAN gelir — soru menüye özgü DEĞİL", () => {
    /* `tabela` ikinci bir şablon aldığı gün tabelacıya "Menü şablonu seç"
       sorulmayacak. */
    expect(sablonSecimSorusu("Tabela", MENU_SECENEKLERI)).toMatch(/^Tabela şablonu seç/);
  });

  it("SIRA SÖZLEŞMESİ metinde YAZILI — Tamam ilk seçenek", () => {
    const soru = sablonSecimSorusu("Menü", MENU_SECENEKLERI);
    const ilk = soru.indexOf(TEMPLATES[MENU_SECENEKLERI[0]!]!.manifest.name_tr);
    const ikinci = soru.indexOf(TEMPLATES[MENU_SECENEKLERI[1]!]!.manifest.name_tr);
    expect(soru).toContain("Tamam");
    expect(ilk, "ilk seçenek metinde önce geçmeli (Tamam tarafı)").toBeLessThan(ikinci);
  });

  it("İKİDEN FARKLI seçenek sayısında FIRLATIR — sessizce gizlemez", () => {
    expect(() => sablonSecimSorusu("Menü", ["a", "b", "c"])).toThrow(/2 seçenek bekler, 3/);
    expect(() => sablonSecimSorusu("Menü", ["a"])).toThrow(/2 seçenek bekler, 1/);
  });
});

describe("seçim", () => {
  it("ONAY ilk seçeneği, RET ikincisini verir", () => {
    expect(sablonSec(MENU_SECENEKLERI, true)).toBe(MENU_SECENEKLERI[0]);
    expect(sablonSec(MENU_SECENEKLERI, false)).toBe(MENU_SECENEKLERI[1]);
  });

  it("SEÇİM ile SORU aynı sırayı kullanır — metin/davranış ayrışamaz", () => {
    /* Asıl güvence: diyalogda "Tamam = X" yazıyorsa Tamam gerçekten X'i açar. */
    const soru = sablonSecimSorusu("Menü", MENU_SECENEKLERI);
    const secilen = sablonSec(MENU_SECENEKLERI, true);
    expect(soru).toContain(`Tamam = ${sablonAdi(secilen)}`);
  });

  it("İKİDEN FARKLI seçenek sayısında FIRLATIR", () => {
    expect(() => sablonSec(["a", "b", "c"], true)).toThrow(/2 seçenek bekler/);
  });
});
