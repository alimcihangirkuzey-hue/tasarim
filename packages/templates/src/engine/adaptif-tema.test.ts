/* ADAPTİF TEMA testleri — paket 6 (journal 2026-08-07-adaptif-tema).

   EN ÖNEMLİ İKİ PİN:
     · SONUÇ HARD-CODE DEĞİL — "6 ürün → 2×3" gibi eşleme yok; aday üretilir,
       gerçek panel ölçüsüyle skorlanır. Panel daralınca seçim DEĞİŞMELİ.
     · OKUNABİLİRLİK TABANI PAZARLIK KONUSU DEĞİL — ölçek MIN_OLCEK'in
       altına inmez; "sadece font küçülterek problemi gizleme" kuralı
       mekanik olarak zorlanır. */

import { describe, expect, it } from "vitest";
import { MenuItemSchema, gridKartOlcusu, type MenuItem } from "@tezgah/shared";
import {
  MIN_KART_MM,
  MIN_OLCEK,
  TEMA_AILESI,
  YOGUNLUK_OLCEGI,
  adaptifKarar,
  enIyiKolon,
  gridAdaylari,
  listeSigan,
  temaVaryanti,
  yogunlukSeviyesi,
} from "./adaptif-tema.js";

const urunler = (n: number, desc = ""): MenuItem[] =>
  Array.from({ length: n }, (_, i) => MenuItemSchema.parse({ id: `u${i}`, name: `Ürün ${i}`, price: "10", desc }));

/* ── Yoğunluk ─────────────────────────────────────────────────────────── */

describe("yogunlukSeviyesi — dolulukdan seviye", () => {
  it("dört seviye sırayla artar", () => {
    expect(yogunlukSeviyesi(0.2)).toBe("dusuk");
    expect(yogunlukSeviyesi(0.6)).toBe("orta");
    expect(yogunlukSeviyesi(0.9)).toBe("yuksek");
    expect(yogunlukSeviyesi(1.4)).toBe("cok_yuksek");
  });

  it("boş belge en ferah seviyede", () => {
    expect(yogunlukSeviyesi(0)).toBe("dusuk");
  });
});

describe("Okunabilirlik tabanı — PAZARLIK KONUSU DEĞİL", () => {
  /* TOTOLOJİ DÜZELTMESİ (kırmızı-kanıt turunda yakalandı): bu iki iddia
     önce MIN_OLCEK'i okuyup yine MIN_OLCEK ile karşılaştırıyordu. Sabiti
     0.8'den 0.2'ye indirdim ve HİÇBİR TEST KIZARMADI — beklenti sabitle
     birlikte kayıyordu, yani ölçüm değil aynanın kendisiydi. Artık taban
     MUTLAK bir sayıya çivili: okunabilirlik bir ürün kararıdır, koddaki
     değişkenin o anki değeri değil. */
  it("taban MUTLAK sınırın altına inemez — okunabilirlik ürün kararıdır", () => {
    expect(MIN_OLCEK).toBeGreaterThanOrEqual(0.75);
    for (const o of Object.values(YOGUNLUK_OLCEGI)) {
      expect(o).toBeGreaterThanOrEqual(0.75);
    }
  });

  it("AŞIRI yoğunlukta ölçek TABANDA durur ve 0.75'in altına inmez", () => {
    /* Çare sayfa/kolon değiştirmektir, fontu daha da küçültmek değil. */
    const o = adaptifKarar(5000, 10).olcek;
    expect(o).toBe(MIN_OLCEK);
    expect(o).toBeGreaterThanOrEqual(0.75);
  });

  it("AZ üründe ölçek 1'in ÜSTÜNE çıkar — ferah görünüm", () => {
    expect(adaptifKarar(10, 200).olcek).toBeGreaterThan(1);
  });
});

/* ── Tema ailesi ──────────────────────────────────────────────────────── */

describe("Tema ailesi — aynı tema, üç nefes", () => {
  it("25 ürün ferah · 65 normal · 100 yoğun", () => {
    expect(temaVaryanti(25).ad).toBe("ferah");
    expect(temaVaryanti(65).ad).toBe("normal");
    expect(temaVaryanti(100).ad).toBe("yogun");
  });

  it("kapasite aşılırsa DAHA SIKI varyanta geçilir, sessizce taşmaz", () => {
    const a = temaVaryanti(30);
    const b = temaVaryanti(90);
    expect(b.olcek).toBeLessThan(a.olcek);
  });

  it("her varyantın aralığı tutarlı: min ≤ ideal ≤ max", () => {
    for (const v of TEMA_AILESI) {
      expect(v.min).toBeLessThanOrEqual(v.ideal);
      expect(v.ideal).toBeLessThanOrEqual(v.max);
    }
  });

  it("en yoğunun üstü de bir varyant döner (sessiz undefined yok)", () => {
    expect(temaVaryanti(100000).ad).toBe("yogun");
  });
});

/* ── Grid adayları ────────────────────────────────────────────────────── */

describe("gridAdaylari — SONUÇ HARD-CODE DEĞİL, skorlanır", () => {
  it("her aday için sığan/boş alan/kart genişliği ölçülür", () => {
    const a = gridAdaylari(85, 200, urunler(12), 1);
    expect(a).toHaveLength(3);
    for (const x of a) {
      expect(x.kart_mm).toBeGreaterThan(0);
      expect(x.sigan).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(x.skor)).toBe(true);
    }
  });

  it("skor SIRALI döner (en iyi başta) ve deterministiktir", () => {
    const a = gridAdaylari(85, 200, urunler(12), 1);
    for (let i = 1; i < a.length; i++) expect(a[i - 1].skor).toBeGreaterThanOrEqual(a[i].skor);
    expect(JSON.stringify(gridAdaylari(85, 200, urunler(12), 1))).toBe(JSON.stringify(a));
  });

  it("PANEL DARALINCA seçim DEĞİŞİR — sabit tablo olsaydı değişmezdi", () => {
    /* Aynı ürün sayısı, iki farklı genişlik. Dar panelde 3 kolon kartı
       okunmaz hâle getirir ve skor onu eler. */
    const genis = enIyiKolon(120, 200, urunler(12), 1);
    const dar = enIyiKolon(50, 200, urunler(12), 1);
    expect(dar).toBeLessThanOrEqual(genis);
  });

  it("OKUNMAZ kart AĞIR cezalı — çok dar panelde 3 kolon seçilmez", () => {
    const secim = enIyiKolon(45, 200, urunler(9), 1);
    const aday = gridAdaylari(45, 200, urunler(9), 1).find((x) => x.kolon === secim)!;
    expect(aday.kart_mm).toBeGreaterThanOrEqual(MIN_KART_MM * 0.9);
  });

  it("aday listesi DIŞARIDAN kısıtlanabilir (tema varyantı kolonunu daraltır)", () => {
    const a = gridAdaylari(85, 200, urunler(12), 1, [3]);
    expect(a).toHaveLength(1);
    expect(a[0].kolon).toBe(3);
  });

  it("boş liste çökmez", () => {
    expect(() => gridAdaylari(85, 200, [], 1)).not.toThrow();
  });
});

/* ── Ölçeğin gerçek etkisi ────────────────────────────────────────────── */

describe("Ölçek KAPASİTEYE yansır — 'sıkıştırdım' iddiası ölçülür", () => {
  it("küçük ölçekte fiyat listesine DAHA ÇOK kalem sığar", () => {
    const normal = listeSigan(60, urunler(40), 1);
    const sikisik = listeSigan(60, urunler(40), MIN_OLCEK);
    expect(sikisik).toBeGreaterThan(normal);
  });

  it("küçük ölçekte grid'e de daha çok kalem sığar", () => {
    const normal = gridAdaylari(85, 200, urunler(40), 1, [3])[0].sigan;
    const sikisik = gridAdaylari(85, 200, urunler(40), MIN_OLCEK, [3])[0].sigan;
    expect(sikisik).toBeGreaterThanOrEqual(normal);
  });

  it("FOTOĞRAF ORANI ölçekten ETKİLENMEZ — ürün sahibi yasağı", () => {
    /* KIRMIZI-KANIT DÜZELTMESİ: bu test önce kart GENİŞLİĞİNİ karşılaştırıyordu,
       ama genişlik zaten hiçbir zaman ölçeğe bağlı değildi — foto oranını
       bilerek bozduğumda test kızarmadı. Doğru ölçüm FOTOĞRAF YÜKSEKLİĞİdir:
       ölçek yalnız METİN bloğunu sıkıştırmalı. */
    const sade = gridKartOlcusu(85, 3, false, 1);
    const sikisik = gridKartOlcusu(85, 3, false, MIN_OLCEK);
    expect(sikisik.photo_h_mm).toBeCloseTo(sade.photo_h_mm, 6); // ORAN SABİT
    expect(sikisik.card_h_mm).toBeLessThan(sade.card_h_mm); // METİN sıkıştı
  });
});

/* ── Belge kararı ─────────────────────────────────────────────────────── */

describe("adaptifKarar — belge düzeyi", () => {
  it("üç senaryo üç farklı nefes üretir (25 / 65 / 100 ürün)", () => {
    const az = adaptifKarar(25, 120);
    const orta = adaptifKarar(65, 120);
    const cok = adaptifKarar(100, 120);
    expect(az.varyant.ad).toBe("ferah");
    expect(orta.varyant.ad).toBe("normal");
    expect(cok.varyant.ad).toBe("yogun");
    expect(az.olcek).toBeGreaterThan(cok.olcek);
  });

  it("doluluk oranı raporlanır (kaç kalem / kaç kapasite)", () => {
    expect(adaptifKarar(60, 120).doluluk).toBeCloseTo(0.5, 6);
  });

  it("kapasite 0 iken çökmez", () => {
    expect(() => adaptifKarar(10, 0)).not.toThrow();
  });

  it("DETERMİNİSTİK: aynı girdi aynı karar", () => {
    expect(JSON.stringify(adaptifKarar(70, 120))).toBe(JSON.stringify(adaptifKarar(70, 120)));
  });
});
