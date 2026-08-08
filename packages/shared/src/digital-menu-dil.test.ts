/* DİJİTAL MENÜNÜN KENDİ DİLİ (K-1/D — restoran/Fransa varsayımının sökülmesi).

   ÖLÇÜLEN YARA: renderDigitalMenu üç yerde SABİT Fransızca yazıyordu —
   `<html lang="fr">`, sekme başlığında "Menu", boş katalog metninde
   "Menu bientôt disponible.". Oysa `client.menu_language` DTO'da hazır ve
   BASKI yolu onu zaten okuyor (chrome-title). Rotanın kendi şerhi durumu
   yazıyordu: "dijital menü render'ı tüketmez; DTO tipi için taşınır".

   `lang` KOZMETİK DEĞİLDİR: ekran okuyucu Türkçe menüyü Fransızca fonetikle
   seslendirir; tarayıcı çeviri teklifini yanlış dilden yapar; tireleme ve
   `:lang()` kuralları yanlış çalışır. Katalog TEK DİLLİ saklanır (`name_fr`
   alan ADI tarihseldir, içeriği müşterinin dilidir) — doğru `lang`, ilan
   edilen menü dilidir. */

import { describe, expect, it } from "vitest";
import { renderDigitalMenu } from "./digital-menu.js";
import {
  MenuLanguageSchema,
  defaultBrandKit,
  defaultCatalog,
  type Category,
  type ClientDTO,
  type MenuLanguage,
} from "./schemas.js";

function musteri(dil: MenuLanguage, categories: Category[] = []): ClientDTO {
  return {
    id: "cli_t",
    name: "Kuzey Ozalit",
    slug: "kuzey-ozalit",
    notes: "",
    currency: "EUR",
    menu_language: dil,
    brandkit: defaultBrandKit(),
    catalog: { ...defaultCatalog(), categories },
    assets: [],
    created_at: "t",
    updated_at: "t",
  };
}

/** Şemadan okunan dil kümesi — elle yazılmaz (ZodDefault sarmalını açar). */
const DILLER: readonly MenuLanguage[] = MenuLanguageSchema.removeDefault().options;

const kategori = (ad: string): Category => ({
  id: "c1",
  name_fr: ad,
  order: 1,
  items: [
    {
      id: "i1",
      name_fr: "Tabela 200×80",
      desc_fr: "",
      photo: null,
      prices: [{ label: "seul", value: 1200, birim: "" }],
      ingredients: [],
      tags: [],
      visible: true,
      order: 1,
    },
  ],
});

describe("dijital menü — çıktının kendi dili", () => {
  it("ÖN-KOŞUL: şema dil ilanı OKUNABİLDİ ve fr aralarında", () => {
    /* Bu satır olmadan aşağıdaki döngüler boş kümede dönebilir ve HİÇBİR ŞEY
       ölçmeden yeşil kalırdı. `MenuLanguageSchema` bir ZodDefault'tur
       (.default("fr")) — `.options` doğrudan ÜZERİNDE YOKTUR; ilk yazımda
       tam bu yüzden `undefined` üzerinde dönülüyordu. */
    expect(DILLER).toContain("fr");
    expect(DILLER.length).toBeGreaterThanOrEqual(3);
  });

  it("HER dil için <html lang> İLAN EDİLEN dildir", () => {
    for (const dil of DILLER) {
      expect(renderDigitalMenu(musteri(dil)), `${dil}: lang yanlış`).toContain(`<html lang="${dil}">`);
    }
  });

  it("FRANSIZCA çıktı BİREBİR eskisi gibi (davranış korundu)", () => {
    const html = renderDigitalMenu(musteri("fr"));
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("— Menu</title>");
    expect(html).toContain("Menu bientôt disponible.");
  });

  it("TÜRKÇE müşteride sekme başlığı ve boş metin TÜRKÇE", () => {
    const html = renderDigitalMenu(musteri("tr"));
    expect(html).toContain("— Menü</title>");
    expect(html).toContain("Menü yakında yayında.");
    expect(html, "Fransızca boş metin sızdı").not.toContain("bientôt");
  });

  it("ALMANCA müşteride sekme başlığı ve boş metin ALMANCA", () => {
    const html = renderDigitalMenu(musteri("de"));
    expect(html).toContain("— Speisekarte</title>");
    expect(html).toContain("Speisekarte in Kürze verfügbar.");
  });

  it("İÇERİK ÇEVRİLMEZ — katalog metinleri AYNEN basılır", () => {
    /* Paketin sınırı: yalnız ÇIKTININ KENDİ dili düzeltilir. Katalog tek dilli
       saklanır; içeriğe dokunmak çok daha büyük ve ayrı bir iştir. */
    const html = renderDigitalMenu(musteri("tr", [kategori("Tabelalar")]));
    expect(html).toContain("Tabelalar");
    expect(html).toContain("Tabela 200×80");
    /* Dolu katalogda boş-durum metni HİÇ çıkmaz (yanlış yere sızmasın) */
    expect(html).not.toContain("yakında yayında");
  });

  it("HİÇBİR DİLDE sabit Fransızca kabuk KALMADI", () => {
    /* Bugünkü üç sızıntının hepsini birden tarar: fr dışındaki bir dilde
       Fransızca kabuk metni görülürse yeni bir sızıntı doğmuş demektir. */
    for (const dil of DILLER.filter((d) => d !== "fr")) {
      const html = renderDigitalMenu(musteri(dil, [kategori("Kategori")]));
      expect(html, `${dil}: lang="fr" kaldı`).not.toContain('lang="fr"');
      expect(html, `${dil}: "— Menu" sekme başlığı kaldı`).not.toContain("— Menu</title>");
      expect(html, `${dil}: Fransızca boş metin kaldı`).not.toContain("bientôt disponible");
    }
  });
});

describe("bilinmeyen dil değeri — çıktı yolu düşmez", () => {
  it("TANINMAYAN dilde bugünkü (fr) kabuk basılır, fırlatılmaz", () => {
    /* Kolon TEXT'tir; tarihsel bir satır tanınmayan bir değer taşıyabilir.
       Sunucu tarafı `.catch("fr")` ile düşürür (rota şerhi), ama motorun
       KENDİSİ de savunmalı olmalı: burada fırlatmak ya da ham değeri
       `<html lang>`'e basmak, dijital menüyü tamamen kaybettirirdi. */
    const bozuk = { ...musteri("fr"), menu_language: "xx" as MenuLanguage };
    const html = renderDigitalMenu(bozuk);
    expect(html).toContain("— Menu</title>");
    expect(html).toContain("Menu bientôt disponible.");
  });
});
