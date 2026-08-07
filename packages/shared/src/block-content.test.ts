/* Blok içerik + kapasite testleri (journal 2026-08-07-icerik-bloklari-urun-ekle).

   EN ÖNEMLİ PİN: sığmayan ürünün SİLİNMEDİĞİ, sayılarak bildirildiği.
   Sessiz kırpma burada bir görüntü hatası değil, matbaadan dönünce fark
   edilen bir VERİ KAYBIDIR. */

import { describe, expect, it } from "vitest";
import {
  GridIcerikSchema,
  MenuItemSchema,
  TYPO_MM,
  bosUrun,
  gridKapasitesi,
  gridKartOlcusu,
  icerikKapasitesi,
  listeKapasitesi,
  varsayilanIcerik,
  type MenuItem,
} from "./block-content.js";

const urunler = (n: number, desc = ""): MenuItem[] =>
  Array.from({ length: n }, (_, i) => MenuItemSchema.parse({ id: `it${i}`, name: `Ürün ${i}`, price: "10", desc }));

/* ── Ürün şeması ──────────────────────────────────────────────────────── */

describe("MenuItem — katalog bağı bugün BOŞ ama alan HAZIR", () => {
  it("boş ürün: alanlar boş dize, iki bağ null", () => {
    const u = bosUrun("it1");
    expect(u).toEqual({
      id: "it1",
      name: "",
      price: "",
      desc: "",
      photo_url: null,
      catalog_item_id: null,
    });
  });

  it("fiyat METİN taşır — '12,50' · '6 CHF' · '12.50 €' hepsi geçerli", () => {
    for (const p of ["12,50", "6 CHF", "12.50 €", "—"]) {
      expect(MenuItemSchema.parse({ id: "x", price: p }).price).toBe(p);
    }
  });
});

describe("varsayilanIcerik — blok TİPLİ içerikle doğar", () => {
  it("grid varsayılanı 2 kolon ve boş liste", () => {
    expect(varsayilanIcerik("urun_gridi")).toEqual({ items: [], columns: 2 });
  });

  it("kategori başlığı iki metin alanı taşır", () => {
    expect(varsayilanIcerik("kategori_basligi")).toEqual({ title: "", subtitle: "" });
  });

  it("bilinmeyen tip → boş kayıt (yarının bloğu bugünü kırmaz)", () => {
    expect(varsayilanIcerik("henuz_olmayan_blok")).toEqual({});
  });
});

/* ── Fiyat listesi kapasitesi ─────────────────────────────────────────── */

describe("listeKapasitesi — fotoğrafsız liste", () => {
  it("60mm yüksekliğe 5.5mm satırdan 10 tane sığar (pad 2×2.5 düşülür)", () => {
    /* (60 - 5) / 5.5 = 10 */
    expect(listeKapasitesi(60, urunler(10))).toEqual({ fits: 10, hidden: 0 });
  });

  it("SIĞMAYAN SİLİNMEZ — sayılarak bildirilir", () => {
    const k = listeKapasitesi(60, urunler(14));
    expect(k.fits).toBe(10);
    expect(k.hidden).toBe(4); // 14 - 10; kalemler belgede DURUR
  });

  it("AÇIKLAMALI kalem daha çok yer kaplar → kapasite DÜŞER", () => {
    const sade = listeKapasitesi(60, urunler(12));
    const aciklamali = listeKapasitesi(60, urunler(12, "ince hamur, mozzarella"));
    expect(aciklamali.fits).toBeLessThan(sade.fits);
    /* (60-5) / (5.5+3.4) = 6 */
    expect(aciklamali.fits).toBe(6);
  });

  it("KARIŞIK liste kalem kalem toplanır (sabit satır kestirmesi taşardı)", () => {
    /* 3 açıklamalı (8.9) + gerisi sade (5.5); alan 55 →
       3×8.9=26.7, kalan 28.3 → 5 sade sığar → toplam 8 */
    const karisik = [...urunler(3, "açıklama"), ...urunler(9)];
    expect(listeKapasitesi(60, karisik).fits).toBe(8);
  });

  it("sıfır/negatif yükseklik → hiçbir şey sığmaz, hepsi gizli", () => {
    expect(listeKapasitesi(0, urunler(3))).toEqual({ fits: 0, hidden: 3 });
  });

  it("boş liste → sıfır sıfır (uyarı gürültüsü yok)", () => {
    expect(listeKapasitesi(60, [])).toEqual({ fits: 0, hidden: 0 });
  });
});

/* ── Grid kapasitesi ──────────────────────────────────────────────────── */

describe("gridKartOlcusu — kart genişliği kolona göre bölünür", () => {
  it("85mm blokta 3 kolon: (85-5-2×2.5)/3 = 25mm kart", () => {
    const { card_w_mm } = gridKartOlcusu(85, 3, false);
    expect(card_w_mm).toBeCloseTo(25, 6);
  });

  it("fotoğraf yüksekliği kart genişliğinin oranıdır (kare değil — oran korunur)", () => {
    const { card_w_mm, photo_h_mm } = gridKartOlcusu(85, 2, false);
    expect(photo_h_mm).toBeCloseTo(card_w_mm * TYPO_MM.card_photo_ratio, 6);
  });

  it("açıklama varsa kart YÜKSELİR", () => {
    const sade = gridKartOlcusu(85, 2, false).card_h_mm;
    const aciklamali = gridKartOlcusu(85, 2, true).card_h_mm;
    expect(aciklamali - sade).toBeCloseTo(TYPO_MM.card_desc, 6);
  });
});

describe("gridKapasitesi", () => {
  it("kolon sayısı arttıkça DAHA ÇOK ürün sığar (kart küçülür)", () => {
    const iki = gridKapasitesi(85, 70, 2, urunler(30)).fits;
    const uc = gridKapasitesi(85, 70, 3, urunler(30)).fits;
    expect(uc).toBeGreaterThan(iki);
  });

  it("kapasite kolonun TAM KATIDIR — yarım satır çizilmez", () => {
    const k = gridKapasitesi(85, 70, 3, urunler(30));
    expect(k.fits % 3).toBe(0);
  });

  it("SIĞMAYAN SİLİNMEZ — grid'de de sayılır", () => {
    const k = gridKapasitesi(85, 70, 2, urunler(30));
    expect(k.hidden).toBe(30 - k.fits);
    expect(k.hidden).toBeGreaterThan(0);
  });

  it("TEK açıklamalı kalem BÜTÜN kartları yükseltir (hiza korunur) → kapasite düşer", () => {
    /* Bilinçli tercih: kart başına değişken yükseklik hizayı bozar */
    const hepsiSade = gridKapasitesi(85, 70, 2, urunler(30)).fits;
    const biriAciklamali = [...urunler(29), MenuItemSchema.parse({ id: "z", name: "Z", desc: "not" })];
    expect(gridKapasitesi(85, 70, 2, biriAciklamali).fits).toBeLessThanOrEqual(hepsiSade);
  });

  it("çok kısa blok → sıfır satır, hepsi gizli (negatif satır ÜRETİLMEZ)", () => {
    const k = gridKapasitesi(85, 6, 2, urunler(4));
    expect(k.fits).toBe(0);
    expect(k.hidden).toBe(4);
  });
});

/* ── Yönlendirici ─────────────────────────────────────────────────────── */

describe("icerikKapasitesi — tipe göre doğru hesabı seçer", () => {
  it("fiyat_listesi → liste hesabı", () => {
    const props = { items: urunler(20) };
    expect(icerikKapasitesi("fiyat_listesi", { w_mm: 85, h_mm: 60 }, props).fits).toBe(10);
  });

  it("urun_gridi → grid hesabı (kolonu props'tan okur)", () => {
    const props = GridIcerikSchema.parse({ items: urunler(20), columns: 3 });
    const k = icerikKapasitesi("urun_gridi", { w_mm: 85, h_mm: 70 }, props);
    expect(k.fits % 3).toBe(0);
    expect(k.fits).toBeGreaterThan(0);
  });

  it("kalem taşımayan bloklar sıfır döner — sahte uyarı üretilmez", () => {
    for (const k of ["logo", "kampanya", "iletisim", "gorsel", "hero_urun", "kategori_basligi"]) {
      expect(icerikKapasitesi(k, { w_mm: 85, h_mm: 30 }, {}), k).toEqual({ fits: 0, hidden: 0 });
    }
  });
});
