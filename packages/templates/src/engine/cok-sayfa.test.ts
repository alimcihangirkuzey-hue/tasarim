/* ÇOK SAYFALI BELGE + GLOBAL REFLOW testleri — paket 6.5
   (journal 2026-08-07-cok-sayfa).

   ÜRÜN SAHİBİNİN ÖLÇÜT LİSTESİ: collision 0 · hidden 0 · data loss 0 ·
   orphan heading 0 · ARADA BOŞ SAYFA 0 · tüm ürünler hesapta ·
   aynı girdi → aynı sayfalama. */

import { describe, expect, it } from "vitest";
import {
  LayoutDocSchema,
  MenuItemSchema,
  collisionsIn,
  icerikKapasitesi,
  panelsOf,
  varsayilanIcerik,
  type Block,
  type BlockKind,
  type LayoutDoc,
} from "@tezgah/shared";
import { belgeyeCevir, globalReflow, type CokSayfaliBelge } from "./cok-sayfa.js";
import { kokId } from "./blok-yerlesim.js";

let sayac = 0;
const blok = (kind: BlockKind, props: Record<string, unknown> = {}): Block => ({
  id: `b${++sayac}`,
  kind,
  panel_id: "ic-0",
  box: { x_mm: 5, y_mm: 5, w_mm: 80, h_mm: 40 },
  props: { ...varsayilanIcerik(kind), ...props },
});

const urunler = (n: number, on = "U") =>
  Array.from({ length: n }, (_, i) => MenuItemSchema.parse({ id: `${on}${i}`, name: `${on}${i}`, price: "10" }));

const yaprak = (blocks: Block[]): LayoutDoc =>
  LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2, blocks });

/** Tüm belgedeki ürün adları (sırayla) — veri kaybı ve sıra denetimi */
const tumAdlar = (b: CokSayfaliBelge): string[] =>
  b.flatMap((y) =>
    y.blocks.flatMap((x) => {
      const it = (x.props as { items?: Array<{ name: string }> }).items;
      return Array.isArray(it) ? it.map((i) => i.name) : [];
    })
  );

/** Menü kurar: bir kategori başlığı + n ürünlük fiyat listesi */
function menu(n: number, on = "U"): CokSayfaliBelge {
  sayac = 0;
  return [yaprak([blok("kategori_basligi", { title: "Pizzalar" }), blok("fiyat_listesi", { items: urunler(n, on) })])];
}

/* ── Belge modeli ─────────────────────────────────────────────────────── */

describe("Belge modeli — geriye uyumlu", () => {
  it("tek yapraklı eski belge geçerli bir BELGEDİR", () => {
    const b = belgeyeCevir(yaprak([]));
    expect(b).toHaveLength(1);
    expect(() => globalReflow(b)).not.toThrow();
  });

  it("boş belge de bir belgedir — en az bir yaprak KALIR", () => {
    expect(globalReflow([yaprak([])]).belge).toHaveLength(1);
  });

  it("yaprak geometrisi KOPYALANIR (A3 belge A3 kalır)", () => {
    const a3 = LayoutDocSchema.parse({ format: "a3", orientation: "yatay", fold: 2, blocks: menu(200)[0].blocks });
    const { belge } = globalReflow([a3]);
    for (const y of belge) expect(y.format).toBe("a3");
  });
});

/* ── Sayfalama ────────────────────────────────────────────────────────── */

describe("Sayfalama — sayfa sayısı bir SONUÇ", () => {
  it("az içerik TEK yaprağa sığar", () => {
    expect(globalReflow(menu(20)).rapor.yaprakSayisi).toBe(1);
  });

  it("çok içerik BİRDEN FAZLA yaprağa akar", () => {
    expect(globalReflow(menu(400)).rapor.yaprakSayisi).toBeGreaterThan(1);
  });

  it("içerik arttıkça yaprak sayısı AZALMAZ (monoton)", () => {
    const az = globalReflow(menu(100)).rapor.yaprakSayisi;
    const cok = globalReflow(menu(600)).rapor.yaprakSayisi;
    expect(cok).toBeGreaterThanOrEqual(az);
  });

  it("ARADA BOŞ YAPRAK YOK — her yaprak en az bir blok taşır", () => {
    const { belge } = globalReflow(menu(500));
    for (const [i, y] of belge.entries()) {
      expect(y.blocks.length, `yaprak ${i} boş`).toBeGreaterThan(0);
    }
  });
});

/* ── GLOBAL REFLOW — P0 ───────────────────────────────────────────────── */

describe("GLOBAL REFLOW — ürün silinince boşluk ORTADA kalmaz", () => {
  it("3 ürün silinince belge baştan akar; yaprak sayısı ARTMAZ", () => {
    const once = globalReflow(menu(400));
    const oncekiYaprak = once.rapor.yaprakSayisi;
    expect(oncekiYaprak).toBeGreaterThan(1);

    /* İLK yapraktan üç ürün sil — global akış olmasaydı delik orada kalırdı */
    const ilk = once.belge[0];
    const hedef = ilk.blocks.find((b) => b.kind === "fiyat_listesi")!;
    const kalanlar = (hedef.props as { items: unknown[] }).items.slice(3);
    const yeniIlk = {
      ...ilk,
      blocks: ilk.blocks.map((b) => (b.id === hedef.id ? { ...b, props: { ...b.props, items: kalanlar } } : b)),
    };
    const sonra = globalReflow([yeniIlk, ...once.belge.slice(1)]);

    expect(sonra.rapor.yaprakSayisi).toBeLessThanOrEqual(oncekiYaprak);
    for (const y of sonra.belge) expect(y.blocks.length).toBeGreaterThan(0);
  });

  it("KAPASİTE UYGUNSA yaprak sayısı DÜŞER", () => {
    const dolu = globalReflow(menu(400));
    const bosaltilmis = globalReflow(menu(60));
    expect(bosaltilmis.rapor.yaprakSayisi).toBeLessThan(dolu.rapor.yaprakSayisi);
  });

  it("ürün EKLENİNCE gerekirse yeni yaprak doğar", () => {
    const az = globalReflow(menu(150)).rapor.yaprakSayisi;
    const cok = globalReflow(menu(900)).rapor.yaprakSayisi;
    expect(cok).toBeGreaterThan(az);
  });
});

/* ── Ölçüt listesi ────────────────────────────────────────────────────── */

describe("Ürün sahibinin ölçütleri — çok sayfada", () => {
  const senaryolar = [30, 70, 100, 400];

  for (const n of senaryolar) {
    it(`${n} ürün: çakışma 0 · gizli 0 · veri kaybı 0`, () => {
      const { belge, rapor } = globalReflow(menu(n));
      for (const y of belge) {
        for (const p of panelsOf(y)) expect(collisionsIn(y, p.id)).toEqual([]);
        for (const b of y.blocks) expect(icerikKapasitesi(b.kind, b.box, b.props).hidden).toBe(0);
      }
      const raporUrun = rapor.yerlesmeyen.reduce((s, x) => s + x.urun, 0);
      expect(rapor.urunYerlesen + raporUrun).toBe(n);
      expect(rapor.urunToplam).toBe(n);
    });
  }

  it("TÜM ÜRÜNLER HESAPTA ve SIRA korunur", () => {
    const n = 300;
    const { belge } = globalReflow(menu(n, "P"));
    const adlar = tumAdlar(belge);
    expect(adlar).toHaveLength(n);
    /* Sıra bozulmamalı: P0, P1, ... Pn-1 */
    expect(adlar).toEqual(urunler(n, "P").map((i) => i.name));
  });

  it("ORPHAN BAŞLIK YOK — kategori başlığı yaprak sonunda tek kalmaz", () => {
    sayac = 0;
    const b: CokSayfaliBelge = [
      yaprak([
        blok("kategori_basligi", { title: "Pizzalar" }),
        blok("fiyat_listesi", { items: urunler(400, "P") }),
        blok("kategori_basligi", { title: "Tatlılar" }),
        blok("fiyat_listesi", { items: urunler(50, "T") }),
      ]),
    ];
    const { belge } = globalReflow(b);
    for (const [i, y] of belge.entries()) {
      /* Her panelin en altındaki blok başlık olmamalı */
      for (const p of panelsOf(y)) {
        const sirali = y.blocks.filter((x) => x.panel_id === p.id).sort((x, z) => x.box.y_mm - z.box.y_mm);
        const son = sirali[sirali.length - 1];
        if (son) expect(son.kind, `yaprak ${i} panel ${p.id}`).not.toBe("kategori_basligi");
      }
    }
  });

  /* KİMLİK TEKİLLİĞİ — P0, GERÇEK TARAYICIDA BULUNDU.
     globalReflow her yaprak için autoYerlestir'i AYRI çağırıyor. Birleştirme
     yaprak ölçeğinde kalınca 2. yaprağın köksüz artan parçası kök adına
     çevriliyor ve 1. yaprakta duran blokla ÇAKIŞIYORDU. Ölçülen sonuçlar:
     iki yaprakta 6 tekil kimlik 8 blok olarak görünüyor, React 42 kez
     "aynı anahtar" uyarısı veriyor ve 146 ürün eklemek belgeyi 174'ten
     383'e çıkarıyordu — yani ÜRÜN ÇOĞALIYORDU. Kimlik tekilliği bu yüzden
     bir konfor değil VERİ BÜTÜNLÜĞÜ koşuludur. */
  it("KİMLİKLER BELGE BOYUNCA TEKİL — yapraklar arasında çakışma yok", () => {
    const { belge } = globalReflow(menu(400));
    expect(belge.length).toBeGreaterThan(1); // çakışma ancak çok yaprakta doğar
    const idler = belge.flatMap((y) => y.blocks.map((b) => b.id));
    expect(new Set(idler).size, `çakışan kimlik: ${idler.length} blok, ${new Set(idler).size} tekil`).toBe(
      idler.length
    );
  });

  /* KAPSAM ŞERHİ — BU TEST O KUSURU YAKALAMIYOR, ÖLÇTÜM. Kusuru (kök adı
     zorlaması + yaprak ölçekli birleştirme) bilerek geri koydum: yalnız
     yukarıdaki KİMLİK TEKİLLİĞİ testi kızardı, bu test GEÇTİ. Nedeni şu:
     çoğalma saf motorun tek başına ürettiği bir şey değil, ÇAKIŞAN KİMLİK ile
     arayüzün birlikte ürettiği bir şeydi — denetçi 'secili' kimliğiyle
     eşleşen bloğu aktif yaprakta arıyor, kimlik iki yaprakta birden
     bulunduğu için başka bloğun kalemlerini yanlış bloğa yazıyor, sonraki
     birleştirme de ikisini topluyordu. Yani kök nedeni çiviliyen test
     kimlik tekilliğidir; etkileşimin kanıtı gerçek tarayıcı provasıdır
     (320 → 170 → 320 ölçüldü). Bu test yine de duruyor çünkü kendi başına
     geçerli bir değişmez ölçüyor: silme turlarında sayı ve tekillik korunur.
     Yanlış olan, bunun O kusuru kapattığını SÖYLEMEK olurdu. */
  it("sil → reflow döngüsünde ürün sayısı ve tekillik KORUNUR", () => {
    let belge = globalReflow(menu(400, "P")).belge;
    for (let tur = 0; tur < 3; tur++) {
      /* İlk listeden 5 ürün sil */
      const ilk = belge[0];
      const hedef = ilk.blocks.find((b) => b.kind === "fiyat_listesi")!;
      const kalan = (hedef.props as { items: unknown[] }).items.slice(5);
      belge = globalReflow([
        { ...ilk, blocks: ilk.blocks.map((b) => (b.id === hedef.id ? { ...b, props: { ...b.props, items: kalan } } : b)) },
        ...belge.slice(1),
      ]).belge;
      const adlar = tumAdlar(belge);
      expect(adlar.length, `tur ${tur}: ürün sayısı`).toBe(400 - 5 * (tur + 1));
      expect(new Set(adlar).size, `tur ${tur}: TEKRARLANAN ürün var`).toBe(adlar.length);
    }
  });

  it("iç içe zincir de KÖKE bağlanır (blk~5~2 → blk)", () => {
    expect(kokId("blk_1")).toBe("blk_1");
    expect(kokId("blk_1~2")).toBe("blk_1");
    expect(kokId("blk_1~5~2")).toBe("blk_1");
    /* Yalnız SON eki soyan bir kök hesabı burada "blk_1~5" derdi ve zincir
       tek turda birleşmezdi — ortada boşluk kalırdı. */
  });

  it("DETERMİNİSTİK: aynı girdi → BİREBİR aynı sayfalama", () => {
    const a = globalReflow(menu(350));
    const c = globalReflow(menu(350));
    expect(JSON.stringify(a.belge)).toBe(JSON.stringify(c.belge));
    expect(a.rapor.yaprakSayisi).toBe(c.rapor.yaprakSayisi);
  });

  it("SAF: giriş belgesi DEĞİŞTİRİLMEZ", () => {
    const b = menu(200);
    const once = JSON.stringify(b);
    globalReflow(b);
    expect(JSON.stringify(b)).toBe(once);
  });

  it("BÖLÜNME raporlanır ve TÜM yaprakların toplamıdır", () => {
    /* Arayüz "N blok devam bloğuna bölündü — ürün kaybı yok" rozetini bu
       sayıdan çiziyor. Tek yaprağın raporundan okunsaydı çok sayfalı belgede
       yalnız son yaprağın bölünmesini gösterir, kullanıcıya EKSİK sayı
       söylerdi. Bölünme bir kayıp değil akıştır, ama sessiz kalmamalı. */
    const az = globalReflow(menu(20)).rapor;
    const cok = globalReflow(menu(400)).rapor;
    expect(az.bolunen).toBe(0); // 20 ürün bölünmeden sığar
    expect(cok.bolunen).toBeGreaterThan(0);
    expect(cok.yaprakSayisi).toBeGreaterThan(1);
  });

  it("her yaprak KENDİ yoğunluk kararını taşır", () => {
    const { rapor } = globalReflow(menu(400));
    expect(rapor.sayfaKararlari).toHaveLength(rapor.yaprakSayisi);
    for (const k of rapor.sayfaKararlari) expect(k.olcek).toBeGreaterThanOrEqual(0.75);
  });

  /* MALİYET ŞERHİ — ÖLÇÜLDÜ, GİZLENMEDİ: globalReflow her yaprakta KALAN
     içeriğin tamamını yeniden bölüyor, yani maliyet yaprak × kalem. Gerçek
     kullanımda (100-600 kalem, ≤6 yaprak) milisaniyeler; 20 000 kalemde
     321 saniye ölçüldü ve test zaman aşımına düştü. Bu bir kusur değil
     bilinen bir sınır: menü belgesi o ölçeğe çıkmaz. Korkuluk gerçekçi bir
     uçta (3000 kalem) sınanır ve tavanın çalıştığı ölçülür. */
  it("SONSUZ DÖNGÜ KORKULUĞU: aşırı içerikte akış durur ve RAPORLAR", () => {
    const { belge, rapor } = globalReflow(menu(3000));
    expect(belge.length).toBeLessThanOrEqual(40);
    const raporUrun = rapor.yerlesmeyen.reduce((s, x) => s + x.urun, 0);
    expect(rapor.urunYerlesen + raporUrun).toBe(3000); // veri kaybı YOK
  }, 60_000);
});
