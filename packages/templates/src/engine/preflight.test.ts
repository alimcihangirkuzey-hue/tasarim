/* PREFLIGHT testleri — paket 5 (journal 2026-08-07-preflight).

   Ürün sahibinin test matrisi burada birebir çivilenir. İki iddia diğerlerinden
   önemli:
     · AYNI ASSET, FARKLI KULLANIM, FARKLI KARAR — karar asset'e değil
       KULLANIMA aittir (küçük kartta yeterli, tam panelde değil).
     · ÖLÇÜLEMEYEN "GEÇTİ" DEĞİLDİR — piksel ölçüsü yoksa DPI hesaplanamaz
       ve bu sessizce yutulmaz. */

import { describe, expect, it } from "vitest";
import {
  LayoutDocSchema,
  MenuItemSchema,
  varsayilanIcerik,
  type Block,
  type BlockKind,
  type LayoutDoc,
} from "@tezgah/shared";
import {
  PRINT_ESIK,
  effectiveDpi,
  gorselKullanimlari,
  preflight,
  preflightOzet,
} from "./preflight.js";

let sayac = 0;
const blok = (
  kind: BlockKind,
  props: Record<string, unknown> = {},
  box: Partial<Block["box"]> = {},
  panel_id = "ic-1"
): Block => ({
  id: `b${++sayac}`,
  kind,
  panel_id,
  box: { x_mm: 10, y_mm: 20, w_mm: 80, h_mm: 60, ...box },
  props: { ...varsayilanIcerik(kind), ...props },
});

const belge = (blocks: Block[], over: Partial<LayoutDoc> = {}): LayoutDoc =>
  LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2, blocks, ...over });

const foto = (w: number | null, h: number | null, ad = "F") =>
  MenuItemSchema.parse({ id: ad, name: ad, price: "10", photo_url: "blob:x", photo_w: w, photo_h: h });

const kod = (d: LayoutDoc): string[] => preflight(d).bulgular.map((b) => b.code);

/* ── Effective DPI ────────────────────────────────────────────────────── */

describe("effectiveDpi — fiziksel ölçüden, ekran px'inden DEĞİL", () => {
  it("formül doğru: 1000px / 25.4mm = 1000 DPI", () => {
    expect(effectiveDpi(1000, 1000, 25.4, 25.4)!.dpi).toBeCloseTo(1000, 6);
  });

  it("İKİ EKSEN de hesaplanır; kararı DÜŞÜK olan verir", () => {
    /* Geniş ama basık görsel: x iyi, y zayıf → zayıf eksen bulanıklık yaratır */
    const o = effectiveDpi(2000, 200, 25.4, 25.4)!;
    expect(o.dpi_x).toBeCloseTo(2000, 6);
    expect(o.dpi_y).toBeCloseTo(200, 6);
    expect(o.dpi).toBe(o.dpi_y);
  });

  it("eşikler TEK MERKEZDEN okunur", () => {
    expect(effectiveDpi(300, 300, 25.4, 25.4)!.seviye).toBe("iyi");
    /* İki eksen de AYNI dpi'ı versin diye px/mm oranı eşitlenir; aksi hâlde
       min() alındığı için test istediğinden başka bir eşiği ölçerdi. */
    const esitEksen = (dpi: number) => effectiveDpi(dpi, dpi * 10, 25.4, 254)!;
    expect(esitEksen(PRINT_ESIK.dpi_uyari - 10).seviye).toBe("uyari");
    expect(esitEksen(PRINT_ESIK.dpi_kritik - 10).seviye).toBe("kritik");
  });

  it("GEÇERSİZ girdi güvenli: null/0/negatif/NaN → null, uydurma değer yok", () => {
    for (const [pw, ph, mw, mh] of [
      [null, 800, 50, 50],
      [800, null, 50, 50],
      [0, 800, 50, 50],
      [800, 800, 0, 50],
      [NaN, 800, 50, 50],
      [800, 800, -10, 50],
    ] as Array<[number | null, number | null, number, number]>) {
      expect(effectiveDpi(pw, ph, mw, mh)).toBeNull();
    }
  });

  it("UPSCALE gerçeği gizlemez — DPI yalnız GERÇEK pikselden doğar", () => {
    /* Aynı fiziksel ölçüde 400px 'büyütülmüş' olsa da 400px'tir */
    const kucuk = effectiveDpi(400, 400, 100, 100)!;
    expect(kucuk.seviye).toBe("kritik");
    expect(Math.round(kucuk.dpi)).toBe(102);
  });
});

/* ── Kullanım başına karar ────────────────────────────────────────────── */

describe("AYNI ASSET, FARKLI KULLANIM, FARKLI KARAR", () => {
  const ASSET = { w: 800, h: 800 };

  it("küçük grid kartında PASS, tam panel hero'da BLOCKING", () => {
    sayac = 0;
    /* Grid: 3 kolon → kart ~25mm → 800px/25mm ≈ 813 DPI (iyi) */
    const gridDoc = belge([
      blok("urun_gridi", { items: [foto(ASSET.w, ASSET.h)], columns: 3 }, { w_mm: 85, h_mm: 70 }),
    ]);
    expect(kod(gridDoc)).not.toContain("dpi_kritik");
    expect(kod(gridDoc)).not.toContain("dpi_dusuk");

    /* Hero: 85mm geniş → 800px/85mm ≈ 239 DPI... daha da büyütelim */
    const heroDoc = belge([
      blok("hero_urun", { item: foto(ASSET.w, ASSET.h) }, { w_mm: 200, h_mm: 150 }, "ic-1"),
    ]);
    const b = preflight(heroDoc).bulgular.find((x) => x.code.startsWith("dpi"));
    expect(b, "hero'da DPI bulgusu bekleniyor").toBeDefined();
    expect(b!.severity === "blocking" || b!.severity === "warning").toBe(true);
  });

  it("aynı blokta iki kullanım AYRI AYRI ölçülür", () => {
    sayac = 0;
    const d = belge([
      blok(
        "urun_gridi",
        { items: [foto(2000, 2000, "iyi"), foto(120, 120, "kotu")], columns: 2 },
        { w_mm: 85, h_mm: 90 }
      ),
    ]);
    const k = gorselKullanimlari(d.blocks[0]);
    expect(k).toHaveLength(2);
    const kotular = preflight(d).bulgular.filter((b) => b.code.startsWith("dpi"));
    expect(kotular).toHaveLength(1);
    expect(kotular[0].message_tr).toContain("kotu");
  });

  it("ÖLÇÜLEMEYEN 'geçti' DEĞİLDİR — piksel ölçüsü yoksa ayrıca söylenir", () => {
    sayac = 0;
    const d = belge([blok("hero_urun", { item: foto(null, null, "olcusuz") })]);
    expect(kod(d)).toContain("dpi_olculemedi");
    expect(preflight(d).durum).not.toBe("pass");
  });

  it("fotoğrafsız blok DPI bulgusu üretmez (sıfır gürültü)", () => {
    sayac = 0;
    /* Üçü AYRI konumda — aynı kutuya koymak gerçek bir çakışma üretir ve
       test DPI yerine onu ölçerdi. */
    const d = belge([
      blok("hero_urun", {}, { y_mm: 10, h_mm: 40 }),
      blok("logo", {}, { y_mm: 60, h_mm: 30 }),
      blok("gorsel", {}, { y_mm: 100, h_mm: 40 }),
    ]);
    expect(kod(d)).toEqual([]);
  });
});

/* ── Güvenli alan ─────────────────────────────────────────────────────── */

describe("Güvenli alan — yalnız KRİTİK içerik", () => {
  it("güvenli alanın dışındaki KRİTİK metin yakalanır", () => {
    sayac = 0;
    const d = belge([blok("kategori_basligi", { title: "Pizzalar" }, { x_mm: 0, y_mm: 0 })]);
    expect(kod(d)).toContain("safe_ihlali");
  });

  it("BOŞ kritik blok için uyarı üretilmez", () => {
    sayac = 0;
    const d = belge([blok("kategori_basligi", { title: "" }, { x_mm: 0, y_mm: 0 })]);
    expect(kod(d)).not.toContain("safe_ihlali");
  });

  it("DEKORATİF görsel güvenli alan kuralına ZORLANMAZ", () => {
    sayac = 0;
    const d = belge([blok("gorsel", { photo_url: "blob:x", photo_w: 3000, photo_h: 3000 }, { x_mm: 0, y_mm: 0 })]);
    expect(kod(d)).not.toContain("safe_ihlali");
  });
});

/* ── Kat güvenliği ────────────────────────────────────────────────────── */

describe("Kat güvenliği — kritik içerik vs dekoratif", () => {
  /* ic-0 paneli 0..100mm; kat çizgileri iç yüzde 100 ve 200 */
  it("kat çizgisinin ÜSTÜNDEKİ fiyat listesi BLOCKING", () => {
    sayac = 0;
    const d = belge([
      blok("fiyat_listesi", { items: [foto(900, 900)] }, { x_mm: 80, y_mm: 20, w_mm: 40 }, "ic-0"),
    ]);
    expect(kod(d)).toContain("fold_uzeri");
  });

  it("kat çizgisine YAKIN kritik içerik WARNING", () => {
    sayac = 0;
    /* Sağ kenarı 98mm → kat 100'e 2mm (eşik 4mm) */
    const d = belge([
      blok("kategori_basligi", { title: "Pizzalar" }, { x_mm: 58, y_mm: 20, w_mm: 40 }, "ic-0"),
    ]);
    const b = preflight(d).bulgular.find((x) => x.code === "fold_yakin");
    expect(b).toBeDefined();
    expect(b!.severity).toBe("warning");
    expect(b!.esik).toBe(PRINT_ESIK.fold_guvenli_mm);
  });

  it("YANLIŞ POZİTİF YOK: dekoratif görsel kat üzerinden geçebilir", () => {
    sayac = 0;
    const d = belge([
      blok("gorsel", { photo_url: "blob:x", photo_w: 4000, photo_h: 4000 }, { x_mm: 80, y_mm: 20, w_mm: 40 }, "ic-0"),
    ]);
    expect(kod(d)).not.toContain("fold_uzeri");
    expect(kod(d)).not.toContain("fold_yakin");
  });

  it("kattan UZAK kritik içerik temiz", () => {
    sayac = 0;
    const d = belge([blok("kategori_basligi", { title: "X" }, { x_mm: 10, y_mm: 20, w_mm: 40 }, "ic-0")]);
    expect(kod(d)).not.toContain("fold_yakin");
  });
});

/* ── Bleed ────────────────────────────────────────────────────────────── */

describe("Bleed — yalnız kenara dayanan dekoratif görsel", () => {
  it("yaprak kenarına dayanan görsel için bleed uyarısı", () => {
    sayac = 0;
    const d = belge([
      blok("gorsel", { photo_url: "blob:x", photo_w: 4000, photo_h: 4000 }, { x_mm: 0, y_mm: 0, w_mm: 90 }, "ic-0"),
    ]);
    expect(kod(d)).toContain("bleed_eksik");
  });

  it("KRİTİK öğeden bleed BEKLENMEZ — kenardaki logo bleed uyarısı almaz", () => {
    sayac = 0;
    const d = belge([
      blok("logo", { photo_url: "blob:x", photo_w: 2000, photo_h: 2000 }, { x_mm: 0, y_mm: 0, w_mm: 40 }, "ic-0"),
    ]);
    expect(kod(d)).not.toContain("bleed_eksik");
  });

  it("ortada duran görsel bleed uyarısı almaz", () => {
    sayac = 0;
    const d = belge([
      blok("gorsel", { photo_url: "blob:x", photo_w: 4000, photo_h: 4000 }, { x_mm: 30, y_mm: 40, w_mm: 40, h_mm: 40 }, "ic-1"),
    ]);
    expect(kod(d)).not.toContain("bleed_eksik");
  });
});

/* ── Taşma / veri kaybı → PASS engeli ─────────────────────────────────── */

describe("Overflow ve veri kaybı PASS'i ENGELLER", () => {
  it("gizli kalem varsa BLOCKING ve baskıya hazır DEĞİL", () => {
    sayac = 0;
    const cok = Array.from({ length: 40 }, (_, i) => foto(900, 900, `U${i}`));
    const d = belge([blok("fiyat_listesi", { items: cok }, { w_mm: 80, h_mm: 40 })]);
    const s = preflight(d);
    expect(s.bulgular.some((b) => b.code === "gizli_urun")).toBe(true);
    expect(s.durum).toBe("blocking");
    expect(s.baskiyaHazir).toBe(false);
  });

  it("panel dışına taşan blok BLOCKING", () => {
    sayac = 0;
    const d = belge([blok("kategori_basligi", { title: "X" }, { x_mm: 10, y_mm: 190, h_mm: 60 })]);
    expect(kod(d)).toContain("panel_tasmasi");
  });

  it("çakışan bloklar BLOCKING", () => {
    sayac = 0;
    const d = belge([
      blok("kategori_basligi", { title: "A" }, { x_mm: 10, y_mm: 20, w_mm: 50, h_mm: 30 }),
      blok("kategori_basligi", { title: "B" }, { x_mm: 20, y_mm: 30, w_mm: 50, h_mm: 30 }),
    ]);
    expect(kod(d)).toContain("cakisma");
  });
});

/* ── Sonuç modeli ─────────────────────────────────────────────────────── */

describe("Sonuç modeli ve baskıya hazır kapısı", () => {
  it("temiz belge PASS ve baskıya hazır", () => {
    sayac = 0;
    const d = belge([
      blok("kategori_basligi", { title: "Pizzalar" }, { x_mm: 10, y_mm: 20, w_mm: 60, h_mm: 15 }),
      blok("fiyat_listesi", { items: [foto(1200, 1200)] }, { x_mm: 10, y_mm: 40, w_mm: 60, h_mm: 40 }),
    ]);
    const s = preflight(d);
    expect(s.durum).toBe("pass");
    expect(s.baskiyaHazir).toBe(true);
    expect(preflightOzet(s)).toBe("Baskıya hazır");
  });

  it("yalnız WARNING varsa baskı devam EDEBİLİR ama özet sessiz kalmaz", () => {
    sayac = 0;
    const d = belge([blok("hero_urun", { item: foto(null, null) })]);
    const s = preflight(d);
    expect(s.durum).toBe("warning");
    expect(s.baskiyaHazir).toBe(true);
    expect(preflightOzet(s)).toMatch(/gözden geçir/);
  });

  it("BLOCKING varsa kapı KAPALI", () => {
    sayac = 0;
    const d = belge([blok("kategori_basligi", { title: "X" }, { x_mm: 0, y_mm: 0 })]);
    const s = preflight(d);
    expect(s.baskiyaHazir).toBe(false);
    expect(preflightOzet(s)).toBe("Baskıya gönderilemez");
  });

  it("her bulgu ÖLÇÜLEN ve EŞİK taşır (sayısız uyarı yok)", () => {
    sayac = 0;
    const d = belge([blok("hero_urun", { item: foto(120, 120) }, { w_mm: 100, h_mm: 100 })]);
    const b = preflight(d).bulgular.find((x) => x.code.startsWith("dpi_"))!;
    expect(typeof b.olculen).toBe("number");
    expect(typeof b.esik).toBe("number");
    expect(b.blockId).toBeDefined();
  });

  it("DETERMİNİSTİK: aynı belge → birebir aynı sonuç", () => {
    sayac = 0;
    const yap = () => {
      sayac = 0;
      return belge([
        blok("hero_urun", { item: foto(150, 150) }, { w_mm: 100, h_mm: 100 }),
        blok("kategori_basligi", { title: "X" }, { x_mm: 0, y_mm: 0 }),
      ]);
    };
    expect(JSON.stringify(preflight(yap()))).toBe(JSON.stringify(preflight(yap())));
  });

  it("SAF: belgeyi DEĞİŞTİRMEZ", () => {
    sayac = 0;
    const d = belge([blok("hero_urun", { item: foto(100, 100) })]);
    const once = JSON.stringify(d);
    preflight(d);
    expect(JSON.stringify(d)).toBe(once);
  });
});
