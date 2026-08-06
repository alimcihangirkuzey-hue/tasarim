/* YENİ MÜŞTERİNİN DOĞUŞ KATALOĞU (K-1/D — sektörsüz dil).

   ÖLÇÜLEN YARA: `CatalogSchema.footnote_fr` bir Zod `.default()` taşır —
   "Prix nets en euros — Liste des allergènes disponible sur demande." Cümleyi
   kimse yazmaz; her yeni müşteriye kendiliğinden gelir ve üç varsayımı birden
   ilan eder (Fransızca · euro · restoran). Dipnot slotu dört yerde bağlıdır ve
   biri FLYER'dır — yani yara menü ailesinin dışına, matbaaya taşar.

   BU DOSYA İKİ ŞEYİ AYRI AYRI ÖLÇER:
   1. Kural: menü üretmeyen kurulumda dipnot boş doğar, diğer her şey aynı.
   2. Yaranın kanıtı: şema varsayılanının GERÇEKTEN bu üç varsayımı taşıdığı
      şemadan okunarak çakılır — metin bir gün değişirse bu paket sessizce
      anlamsızlaşmasın. */

import { describe, expect, it } from "vitest";
import { defaultCatalog } from "@tezgah/shared";
import { isKollariIlani } from "./is-kollari.js";
import { DIPNOT_IS_KOLU, dogusKatalogu } from "./dogus-katalogu.js";

describe("yaranın kanıtı — şema varsayılanı", () => {
  it("ÖN-KOŞUL: dipnot varsayılanı GERÇEKTEN Fransızca/euro/alerjen taşıyor", () => {
    /* Bu satır olmadan aşağıdaki "boşaltılıyor" iddiaları, zaten boş bir
       varsayılanla da hiçbir şey ayırt etmeden yeşil kalırdı. */
    const d = defaultCatalog().footnote_fr;
    expect(d).not.toBe("");
    expect(d, "euro varsayımı").toMatch(/euros/);
    expect(d, "alerjen/restoran varsayımı").toMatch(/allergènes/);
  });
});

describe("doğuş kataloğu × kurulum iş kolları", () => {
  it("YAPILANDIRMA YOKSA katalog BİREBİR bugünkü varsayılan", () => {
    /* Tek operatörlü yerel kurulum hiçbir şey yapmadan aynı şeyi görür. */
    const ilan = isKollariIlani(undefined);
    expect(ilan.kaynak).toBe("varsayilan");
    expect(dogusKatalogu(ilan)).toEqual(defaultCatalog());
  });

  it("MENÜ ÜRETİCİSİ etkinse dipnot DEĞİŞMEZ", () => {
    const k = dogusKatalogu(isKollariIlani(DIPNOT_IS_KOLU));
    expect(k.footnote_fr).toBe(defaultCatalog().footnote_fr);
  });

  it("MENÜ ÜRETİCİSİ karma listede de dipnotu KORUR", () => {
    const k = dogusKatalogu(isKollariIlani(`tabelaci,${DIPNOT_IS_KOLU}`));
    expect(k.footnote_fr).toBe(defaultCatalog().footnote_fr);
  });

  it("TABELACI · MATBAA · TEKSTİL kurulumunda dipnot BOŞ doğar", () => {
    /* Yaranın kendisi: bu kurulumlarda basılan sayfanın altında Fransızca
       alerjen satırı duruyordu. matbaa özellikle önemli — flyer dipnotu
       taşır ve flyer bir matbaa ürünüdür. */
    for (const kol of ["tabelaci", "matbaa", "tekstil-baski"]) {
      expect(dogusKatalogu(isKollariIlani(kol)).footnote_fr, kol).toBe("");
    }
  });

  it("YALNIZ DİPNOT değişir — kataloğun geri kalanı aynı", () => {
    /* Daraltma bir içerik silme yetkisi değildir. */
    const temel = defaultCatalog();
    const k = dogusKatalogu(isKollariIlani("tabelaci"), temel);
    expect({ ...k, footnote_fr: temel.footnote_fr }).toEqual(temel);
  });

  it("YENİ CÜMLE UYDURMAZ — boş, 'başka bir varsayılan' değil", () => {
    /* Bir tabelacının dipnotunda ne yazacağı İÇERİK KARARIDIR (ürün sahibi,
       K-1'de açıkça açık bırakıldı). Yokluk karar değildir; yanlış cümle
       kararın ta kendisidir. */
    expect(dogusKatalogu(isKollariIlani("tabelaci")).footnote_fr).toBe("");
  });

  it("TABAN ENJEKTE EDİLEBİLİR — kural, şema varsayılanından bağımsız ölçülür", () => {
    const sahte = { ...defaultCatalog(), footnote_fr: "XYZ" };
    expect(dogusKatalogu(isKollariIlani(DIPNOT_IS_KOLU), sahte).footnote_fr).toBe("XYZ");
    expect(dogusKatalogu(isKollariIlani("tabelaci"), sahte).footnote_fr).toBe("");
  });
});
