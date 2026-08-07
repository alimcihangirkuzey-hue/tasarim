/* OTOMATİK YERLEŞİM testleri — paket 4
   (journal 2026-08-07-otomatik-yerlesim).

   Ürün sahibinin ölçüt listesi burada BİREBİR çivilenir: çakışma 0 · içerik
   taşması 0 ya da RAPORLU · veri kaybı 0 · fold ihlali 0 · safe ihlali 0 ·
   tüm ürünler hesapta · aynı girdi → aynı yerleşim.

   EN ÖNEMLİ PİN: VERİ KAYBI 0. Otomatik yerleşim sonrası girişteki her ürün
   ya yaprakta ya raporda olmalıdır — ikisinde de olmayan bir ürün, kullanıcı
   yazdı diye var sandığı ama basılmayan bir satırdır. */

import { describe, expect, it } from "vitest";
import {
  GridIcerikSchema,
  LayoutDocSchema,
  MenuItemSchema,
  UrunListesiIcerikSchema,
  collisionsIn,
  contentArea,
  foldLines,
  icerikKapasitesi,
  overflowingBlocks,
  panelsOf,
  varsayilanIcerik,
  type Block,
  type BlockKind,
  type LayoutDoc,
} from "@tezgah/shared";
import { HERO_MIN_H_MM, autoYerlestir, dogalYukseklik, parcala } from "./blok-yerlesim.js";

/* ── Yardımcılar ──────────────────────────────────────────────────────── */

let sayac = 0;
const blok = (kind: BlockKind, props: Record<string, unknown> = {}): Block => ({
  id: `b${++sayac}`,
  kind,
  panel_id: "dis-0",
  box: { x_mm: 0, y_mm: 0, w_mm: 50, h_mm: 20 },
  props: { ...varsayilanIcerik(kind), ...props },
});

const urunler = (n: number, on = "U", desc = ""): ReturnType<typeof MenuItemSchema.parse>[] =>
  Array.from({ length: n }, (_, i) =>
    MenuItemSchema.parse({ id: `${on}${i}`, name: `${on}${i}`, price: "10", desc })
  );

const belge = (blocks: Block[], over: Partial<LayoutDoc> = {}): LayoutDoc =>
  LayoutDocSchema.parse({
    format: "a4",
    orientation: "yatay",
    fold: 2,
    fold_style: "roll",
    blocks,
    ...over,
  });

/** Zengin karışım — ürün sahibinin prova listesiyle aynı içerik */
function karisikBelge(): LayoutDoc {
  sayac = 0;
  return belge([
    blok("logo"),
    blok("hero_urun"),
    blok("kampanya", { title: "AÇILIŞA ÖZEL", line: "Döner 6 CHF" }),
    blok("iletisim", { phone: "0216 555 04 04" }),
    blok("kategori_basligi", { title: "Pizzalar", subtitle: "Taş fırından" }),
    /* 40 kalem: A4 yatay panelin 200mm içerik boyunu (40×5.5=220) AŞAR —
       bölme gerçekten tetiklensin diye. 14 kalem sığıyordu ve "flow sınandı"
       demek yanlış olurdu. */
    blok("fiyat_listesi", { items: urunler(40, "P") }),
    blok("kategori_basligi", { title: "Salatalar" }),
    blok("urun_gridi", { items: urunler(6, "S"), columns: 2 }),
    blok("kategori_basligi", { title: "Tatlılar" }),
    blok("fiyat_listesi", { items: urunler(8, "T") }),
    blok("kategori_basligi", { title: "İçecekler" }),
    blok("fiyat_listesi", { items: urunler(10, "I") }),
  ]);
}

const tumUrunAdlari = (d: LayoutDoc): string[] => {
  const out: string[] = [];
  for (const b of d.blocks) {
    if (b.kind === "fiyat_listesi") out.push(...UrunListesiIcerikSchema.parse(b.props).items.map((i) => i.name));
    if (b.kind === "urun_gridi") out.push(...GridIcerikSchema.parse(b.props).items.map((i) => i.name));
  }
  return out;
};

/* ── Doğal yükseklik ──────────────────────────────────────────────────── */

describe("dogalYukseklik — yoğunluğa göre alan", () => {
  it("12 ürünlü liste 3 ürünlüden UZUN (sabit varsayılan ikisine de yanlış davranırdı)", () => {
    const az = dogalYukseklik(blok("fiyat_listesi", { items: urunler(3) }), 87, 5);
    const cok = dogalYukseklik(blok("fiyat_listesi", { items: urunler(12) }), 87, 5);
    expect(cok).toBeGreaterThan(az);
  });

  it("HERO anlamını kaybedecek kadar küçülmez", () => {
    expect(dogalYukseklik(blok("hero_urun"), 87, 5)).toBeGreaterThanOrEqual(HERO_MIN_H_MM);
  });

  it("alt başlıksız kategori başlığı DAHA KISA (boşluğu boşuna yemez)", () => {
    const sade = dogalYukseklik(blok("kategori_basligi", { title: "X" }), 87, 5);
    const altli = dogalYukseklik(blok("kategori_basligi", { title: "X", subtitle: "Y" }), 87, 5);
    expect(sade).toBeLessThan(altli);
  });

  it("yükseklik ızgaraya yuvarlanır (istif hizalı kalsın)", () => {
    const h = dogalYukseklik(blok("fiyat_listesi", { items: urunler(7) }), 87, 5);
    expect(h % 5).toBe(0);
  });
});

/* ── Bölme ────────────────────────────────────────────────────────────── */

describe("parcala — devam blokları (GİZLEME DEĞİL BÖLME)", () => {
  it("sığan blok BÖLÜNMEZ — gereksiz parça üretilmez", () => {
    const b = blok("fiyat_listesi", { items: urunler(4) });
    expect(parcala(b, 200, 87, 5)).toHaveLength(1);
  });

  it("uzun liste bölünür ve KALEM TOPLAMI KORUNUR", () => {
    const b = blok("fiyat_listesi", { items: urunler(30) });
    const p = parcala(b, 60, 87, 5);
    expect(p.length).toBeGreaterThan(1);
    const toplam = p.reduce((s, x) => s + UrunListesiIcerikSchema.parse(x.props).items.length, 0);
    expect(toplam).toBe(30); // TEK KALEM BİLE DÜŞMEDİ
  });

  it("parça SIRASI korunur — ürünler karışmaz", () => {
    const b = blok("fiyat_listesi", { items: urunler(20, "X") });
    const adlar = parcala(b, 60, 87, 5).flatMap((x) =>
      UrunListesiIcerikSchema.parse(x.props).items.map((i) => i.name)
    );
    expect(adlar).toEqual(urunler(20, "X").map((i) => i.name));
  });

  it("devam bloğunun id'i KAYNAKTAN TÜRETİLİR (determinizm)", () => {
    const b = blok("fiyat_listesi", { items: urunler(30) });
    const p = parcala(b, 60, 87, 5);
    expect(p[0].id).toBe(b.id);
    expect(p[1].id).toBe(`${b.id}~2`);
  });

  it("grid de bölünür ve kalem toplamı korunur", () => {
    const b = blok("urun_gridi", { items: urunler(20), columns: 2 });
    const p = parcala(b, 60, 87, 5);
    const toplam = p.reduce((s, x) => s + GridIcerikSchema.parse(x.props).items.length, 0);
    expect(toplam).toBe(20);
  });

  it("SONSUZ DÖNGÜ KORKULUĞU: tek kalem bile sığmasa akış İLERLER", () => {
    const b = blok("fiyat_listesi", { items: urunler(3) });
    const p = parcala(b, 1, 87, 5); // hiçbir şey sığmaz
    expect(p).toHaveLength(3); // kalem başına bir parça — kilitlenmedi
    expect(p.reduce((s, x) => s + UrunListesiIcerikSchema.parse(x.props).items.length, 0)).toBe(3);
  });
});

/* ── Ana işlev: ürün sahibinin ölçüt listesi ──────────────────────────── */

describe("autoYerlestir — ürün sahibinin ölçütleri", () => {
  it("SAF: girdi doc'u DEĞİŞTİRMEZ", () => {
    const d = karisikBelge();
    const once = JSON.stringify(d);
    autoYerlestir(d);
    expect(JSON.stringify(d)).toBe(once);
  });

  it("DETERMİNİSTİK: aynı girdi → BİREBİR aynı yerleşim", () => {
    const a = autoYerlestir(karisikBelge());
    const b = autoYerlestir(karisikBelge());
    expect(JSON.stringify(a.doc.blocks)).toBe(JSON.stringify(b.doc.blocks));
    expect(a.rapor).toEqual(b.rapor);
  });

  it("ÇAKIŞMA = 0 — hiçbir panelde blok üst üste binmez", () => {
    const { doc } = autoYerlestir(karisikBelge());
    for (const p of panelsOf(doc)) {
      expect(collisionsIn(doc, p.id), p.id).toEqual([]);
    }
  });

  it("SAFE-AREA İHLALİ = 0 — her blok içerik alanının İÇİNDE", () => {
    const { doc } = autoYerlestir(karisikBelge());
    for (const p of panelsOf(doc)) {
      const a = contentArea(p, doc);
      for (const b of doc.blocks.filter((x) => x.panel_id === p.id)) {
        expect(b.box.x_mm, b.id).toBeGreaterThanOrEqual(a.x_mm);
        expect(b.box.y_mm, b.id).toBeGreaterThanOrEqual(a.y_mm);
        expect(b.box.x_mm + b.box.w_mm, b.id).toBeLessThanOrEqual(a.x_mm + a.w_mm + 1e-6);
        expect(b.box.y_mm + b.box.h_mm, b.id).toBeLessThanOrEqual(a.y_mm + a.h_mm + 1e-6);
      }
    }
  });

  it("PANEL TAŞMASI = 0 — mevcut invaryant denetçisi temiz", () => {
    const { doc } = autoYerlestir(karisikBelge());
    for (const p of panelsOf(doc)) {
      expect(overflowingBlocks(doc, p.id), p.id).toEqual([]);
    }
  });

  it("FOLD İHLALİ = 0 — hiçbir blok kat çizgisini KESMEZ", () => {
    const { doc } = autoYerlestir(karisikBelge());
    const paneller = new Map(panelsOf(doc).map((p) => [p.id, p]));
    for (const side of ["dis", "ic"] as const) {
      const katlar = foldLines({ ...doc, side });
      for (const b of doc.blocks) {
        const p = paneller.get(b.panel_id)!;
        if (p.side !== side) continue;
        /* Blok kutusu yaprak koordinatına çevrilir; kat çizgisi ARADA kalmamalı */
        const sol = p.x_mm + b.box.x_mm;
        const sag = sol + b.box.w_mm;
        for (const k of katlar) {
          expect(k > sol + 1e-6 && k < sag - 1e-6, `${b.id} kat ${k} üstünde`).toBe(false);
        }
      }
    }
  });

  it("VERİ KAYBI = 0 — her ürün ya yaprakta ya RAPORDA", () => {
    const giris = karisikBelge();
    const { doc, rapor } = autoYerlestir(giris);
    const oncekiAdlar = tumUrunAdlari(giris).sort();
    const sonrakiAdlar = tumUrunAdlari(doc).sort();
    const raporUrun = rapor.yerlesmeyen.reduce((s, y) => s + y.urun, 0);

    expect(rapor.urunToplam).toBe(oncekiAdlar.length);
    expect(rapor.urunYerlesen).toBe(sonrakiAdlar.length);
    expect(rapor.urunYerlesen + raporUrun).toBe(rapor.urunToplam);
    /* Yaprağa girenler girişin ALT KÜMESİ — uydurulmuş ürün yok */
    for (const ad of sonrakiAdlar) expect(oncekiAdlar).toContain(ad);
  });

  it("İÇERİK TAŞMASI = 0 — yerleşen hiçbir blokta '+N gizli' KALMAZ", () => {
    /* Ürün sahibi kuralı: '+N gizli' nihai otomatik yerleşim sonucu OLMASIN.
       Sığmayan bölünür; bölünemeyen rapora gider. */
    const { doc } = autoYerlestir(karisikBelge());
    for (const b of doc.blocks) {
      const { hidden } = icerikKapasitesi(b.kind, b.box, b.props);
      expect(hidden, `${b.kind} ${b.id}`).toBe(0);
    }
  });

  it("PANEL EĞİLİMİ: logo/hero ÖN kapakta, iletişim/kampanya ARKA panelde", () => {
    const { doc } = autoYerlestir(karisikBelge());
    const paneller = new Map(panelsOf(doc).map((p) => [p.id, p]));
    const rol = (kind: BlockKind) =>
      paneller.get(doc.blocks.find((b) => b.kind === kind)!.panel_id)!.role;
    expect(rol("logo")).toBe("on");
    expect(rol("hero_urun")).toBe("on");
    expect(rol("iletisim")).toBe("arka");
    expect(rol("kampanya")).toBe("arka");
  });

  it("KEEP-WITH-NEXT: kategori başlığı sütun sonunda TEK BAŞINA kalmaz", () => {
    const { doc } = autoYerlestir(karisikBelge());
    const paneller = panelsOf(doc);
    for (const p of paneller) {
      const sirali = doc.blocks
        .filter((b) => b.panel_id === p.id)
        .sort((a, b) => a.box.y_mm - b.box.y_mm);
      const son = sirali[sirali.length - 1];
      /* Panelin SON bloğu kategori başlığıysa, başlık ürünlerinden
         koparılmış demektir — okuyucu "Tatlılar" görür, tatlıları görmez. */
      if (son) expect(son.kind, `${p.id}: başlık yalnız kaldı`).not.toBe("kategori_basligi");
    }
  });

  it("BÖLME GERÇEKTEN OLDU — 40'lık liste tek sütuna sığmıyordu", () => {
    const { rapor } = autoYerlestir(karisikBelge());
    expect(rapor.bolunen).toBeGreaterThan(0);
  });

  it("YAPRAK DOLDUĞUNDA: artan SESSİZCE ATILMAZ, adıyla ve sayısıyla RAPORLANIR", () => {
    /* Altı panelin toplam sütun boyu ~1200mm; 300 kalem ~1650mm ister —
       bölme bile yetmez, gerçekten yer kalmaz. Kritik iddia: yer kalmayınca
       kalemler kaybolmaz, rapora geçer. */
    sayac = 0;
    const d = belge([blok("fiyat_listesi", { items: urunler(300, "Z") })]);
    const { doc, rapor } = autoYerlestir(d);

    expect(rapor.yerlesmeyen.length).toBeGreaterThan(0);
    /* Rapor SAYI taşır — "bir şeyler sığmadı" demekle yetinmez */
    expect(rapor.yerlesmeyen.some((y) => y.urun > 0)).toBe(true);
    expect(rapor.yerlesmeyen[0].baslik).not.toBe("");

    /* VERİ KAYBI YOK: yerleşen + raporlanan = giriş */
    const raporUrun = rapor.yerlesmeyen.reduce((s, y) => s + y.urun, 0);
    expect(rapor.urunYerlesen + raporUrun).toBe(300);
    /* Ve yaprakta duranların hiçbirinde gizli kalem yok */
    for (const b of doc.blocks) {
      expect(icerikKapasitesi(b.kind, b.box, b.props).hidden).toBe(0);
    }
  });

  it("boş belge → boş sonuç, uyarı gürültüsü yok", () => {
    const { doc, rapor } = autoYerlestir(belge([]));
    expect(doc.blocks).toEqual([]);
    expect(rapor.yerlesmeyen).toEqual([]);
    expect(rapor.urunToplam).toBe(0);
  });
});

/* ── Geometri genelliği ───────────────────────────────────────────────── */

describe("autoYerlestir — motor GEOMETRİYE genel, tek ürüne değil", () => {
  const senaryolar: Array<[string, Partial<LayoutDoc>]> = [
    ["A4 yatay 2 kırım", { format: "a4", orientation: "yatay", fold: 2 }],
    ["A4 dikey katlamasız", { format: "a4", orientation: "dikey", fold: 0 }],
    ["A5 dikey tek kırım", { format: "a5", orientation: "dikey", fold: 1 }],
    ["A3 yatay 2 kırım akordeon", { format: "a3", orientation: "yatay", fold: 2, fold_style: "akordeon" }],
  ];

  for (const [ad, over] of senaryolar) {
    it(`${ad}: çakışma 0 · safe ihlali 0 · veri kaybı 0`, () => {
      sayac = 0;
      const d = belge(
        [
          blok("logo"),
          blok("kategori_basligi", { title: "K" }),
          blok("fiyat_listesi", { items: urunler(18) }),
          blok("iletisim", { phone: "x" }),
        ],
        over
      );
      const { doc, rapor } = autoYerlestir(d);
      for (const p of panelsOf(doc)) {
        expect(collisionsIn(doc, p.id), `${ad}/${p.id}`).toEqual([]);
        expect(overflowingBlocks(doc, p.id), `${ad}/${p.id}`).toEqual([]);
      }
      const raporUrun = rapor.yerlesmeyen.reduce((s, y) => s + y.urun, 0);
      expect(rapor.urunYerlesen + raporUrun, ad).toBe(18);
    });
  }
});
