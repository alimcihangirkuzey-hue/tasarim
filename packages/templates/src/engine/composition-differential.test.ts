/* DİFERANSİYEL REGRESYON — refactor ÖNCESİ kod ile ŞİMDİKİ kod yan yana.
   ============================================================================
   Altın kayıt (composition-golden.json) 13 sabit vakayı çiviler. Bu dosya
   ondan bağımsız ve daha güçlüdür: `main`'den çıkarılmış refactor-öncesi
   `__baseline.ts` ile bugünkü `analyze.ts`'i AYNI girdilerle koşturup
   çıktılarını karşılaştırır. Yüzlerce kombinasyon üretir.

   NEDEN GEREKLİ: bir doğrulama turu, altın kayıt vaka ADLARININ yanıltıcı
   olduğunu gösterdi — "30-urun-2sutun" aslında `columns: 1` ile koşuyordu
   (A4 varsayılanı 1'dir), yani A4'te 2 sütunlu yerleşim HİÇBİR altın vakada
   kapsanmıyordu. Sabit vaka listesi böyle kör noktalar üretir; kombinasyon
   taraması üretmez.

   __baseline.ts dosyaları `git show main:...` ile üretilir ve bu paketle
   birlikte commit edilir; sonraki geliştirici köken iddiasını yeniden
   doğrulayabilsin diye. */

import { describe, expect, it } from "vitest";
import { analyzeList } from "../menu-liste-premium/analyze.js";
import { analyzeList as analyzeListEski } from "../menu-liste-premium/__baseline.js";
import { analyzeFlyer } from "../flyer/analyze.js";
import { analyzeFlyer as analyzeFlyerEski } from "../flyer/__baseline.js";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
} from "@tezgah/shared";

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function client(cats: number, per: number, opts: { uzun?: boolean; not?: boolean; varyant?: boolean } = {}): ClientDTO {
  return {
    id: "cli_d",
    name: "Diff",
    slug: "diff",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({}),
    catalog: CatalogSchema.parse({
      categories: Array.from({ length: cats }, (_, c) => ({
        id: `c${c}`,
        name_fr: `Catégorie ${c + 1}`,
        note_fr: opts.not ? "Servi avec accompagnement au choix" : undefined,
        order: c,
        items: Array.from({ length: per }, (_, i) => ({
          id: `c${c}i${i}`,
          name_fr: opts.uzun
            ? `Produit très long avec description étendue ${c + 1}-${i + 1} supplémentaire encore`
            : `Produit ${c + 1}-${i + 1}`,
          desc_fr: "tomate · mozzarella · basilic · origan",
          prices:
            opts.varyant && i % 3 === 0
              ? [
                  { label: "petite", value: 8 + i },
                  { label: "grande", value: 12 + i },
                ]
              : [{ label: "seul", value: 9.5 + i }],
          order: i,
        })),
      })),
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

/** Tam yapısal parmak izi: yerleşim + METİN İÇERİĞİ + uyarılar */
function fpList(fn: typeof analyzeList, c: ClientDTO, params: Record<string, unknown>) {
  const a = fn(c, DocumentStateSchema.parse({ template_id: "menu-liste-premium", params }));
  return JSON.stringify({
    format: a.format,
    columns: a.columns,
    colW: r3(a.colW),
    nameFont: r3(a.nameFont),
    pageCount: a.pages.length,
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
    pages: a.pages.map((p) =>
      p.columns.map((col) =>
        col.map((pl) => ({
          k: pl.row.kind,
          id: pl.row.kind === "item" ? pl.row.item.id : pl.row.id,
          y: r3(pl.y),
          h: r3(pl.row.h),
          /* metin içeriği de karşılaştırılır: sarma/kısaltma kayması yakalanır */
          t:
            pl.row.kind === "item"
              ? [pl.row.nameLines.join("|"), pl.row.descLines.join("|"), pl.row.priceTexts.join("|")].join("//")
              : pl.row.name,
        }))
      )
    ),
  });
}

function fpFlyer(fn: typeof analyzeFlyer, c: ClientDTO, params: Record<string, unknown>) {
  const a = fn(c, DocumentStateSchema.parse({ template_id: "flyer", params }));
  return JSON.stringify({
    cols: a.mini.cols,
    items: a.mini.items.map((i) => ({ id: i.id, x: r3(i.x), y: r3(i.y), w: r3(i.w), h: r3(i.h), n: i.name, p: i.price })),
    warnings: a.warnings.map((w) => JSON.stringify(w)).sort(),
  });
}

/* Katalog şekilleri: kenar durumlar + gerçekçi yoğunluklar */
const SEKILLER: Array<[string, number, number, Parameters<typeof client>[2]]> = [
  ["bos", 0, 0, {}],
  ["tek", 1, 1, {}],
  ["tek-kategori-cok-urun", 1, 60, {}],
  ["cok-kategori-tek-urun", 25, 1, {}],
  ["orta", 5, 8, {}],
  ["yogun", 10, 20, {}],
  ["cok-yogun", 12, 25, {}],
  ["uzun-adlar", 4, 8, { uzun: true }],
  ["kategori-notlu", 6, 6, { not: true }],
  ["karisik-varyant", 5, 9, { varyant: true }],
  ["notlu-varyantli-uzun", 4, 7, { uzun: true, not: true, varyant: true }],
];

describe("DİFERANSİYEL — menu-liste-premium: eski kod ≡ yeni kod", () => {
  const formatlar = ["a4-portrait", "a3-portrait"];
  const sutunlar = [undefined, 1, 2, 3];
  const desc = [undefined, true, false];
  const fiyat = [undefined, "inline", "columns"];

  for (const [ad, cats, per, opts] of SEKILLER) {
    it(`${ad}: tüm parametre kombinasyonlarında birebir aynı`, () => {
      const c = client(cats, per, opts);
      let n = 0;
      for (const format of formatlar) {
        for (const columns of sutunlar) {
          for (const showDesc of desc) {
            for (const priceLayout of fiyat) {
              const params: Record<string, unknown> = { format };
              if (columns !== undefined) params.columns = columns;
              if (showDesc !== undefined) params.showDesc = showDesc;
              if (priceLayout !== undefined) params.priceLayout = priceLayout;
              const etiket = `${ad} ${JSON.stringify(params)}`;
              expect(fpList(analyzeList, c, params), etiket).toBe(fpList(analyzeListEski, c, params));
              n++;
            }
          }
        }
      }
      expect(n).toBeGreaterThan(50); // kombinasyon gerçekten üretildi
    }, 60_000); /* yoğun kataloglar × 72 kombinasyon: varsayılan 5sn yetmez */
  }

  it("QR açık + dekor kombinasyonları da birebir aynı", () => {
    const c = client(6, 10);
    for (const showQr of [true, false]) {
      for (const qrSource of ["site", "tel", "instagram"]) {
        const params = { showQr, qrSource };
        expect(fpList(analyzeList, c, params), JSON.stringify(params)).toBe(fpList(analyzeListEski, c, params));
      }
    }
  });
});

describe("DİFERANSİYEL — flyer: eski kod ≡ yeni kod", () => {
  it("kapasite altı/üstü × iki format × ürün sayısı: birebir aynı", () => {
    for (const format of ["a5-portrait", "21x21"]) {
      for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 40]) {
        const c = client(1, n);
        const params = { format };
        expect(fpFlyer(analyzeFlyer, c, params), `${format} n=${n}`).toBe(fpFlyer(analyzeFlyerEski, c, params));
      }
    }
  });

  it("taşma uyarısı SAYISI eski davranışla aynı", () => {
    for (const format of ["a5-portrait", "21x21"]) {
      for (const n of [3, 4, 5, 6, 7, 8, 20]) {
        const c = client(1, n);
        const doc = DocumentStateSchema.parse({ template_id: "flyer", params: { format } });
        const yeni = analyzeFlyer(c, doc).warnings.filter((w) => w.type === "overflow-items");
        const eski = analyzeFlyerEski(c, doc).warnings.filter((w) => w.type === "overflow-items");
        expect(yeni, `${format} n=${n}`).toEqual(eski);
      }
    }
  });
});
