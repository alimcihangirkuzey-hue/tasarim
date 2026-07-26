/* designSeed v1 — kontrollü benzersizlik testleri (Canonical 4.4 / 4.1).
   TODO borcu #3'ün şart koştuğu test buradadır: "farklı tohum → FARKLI
   yerleşim". Karşı yönleri de çiviler: aynı tohum → AYNI yerleşim; tohum
   0/yok → BUGÜNKÜ yerleşim birebir; ürün kaybı SIFIR (taşma sözleşmesi). */

import { describe, expect, it } from "vitest";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
} from "@tezgah/shared";
import { seededVariant } from "../engine/seed.js";
import { analyzeList } from "./analyze.js";

function client(cats: number, per: number): ClientDTO {
  return {
    id: "cli_s",
    name: "Seed",
    slug: "seed",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({}),
    catalog: CatalogSchema.parse({
      categories: Array.from({ length: cats }, (_, c) => ({
        id: `c${c}`,
        name_fr: `Catégorie ${c + 1}`,
        order: c,
        items: Array.from({ length: per }, (_, i) => ({
          id: `c${c}i${i}`,
          name_fr: `Produit ${c + 1}-${i + 1}`,
          desc_fr: "tomate · mozzarella · basilic",
          prices: [{ label: "seul", value: 9 + i }],
          order: i,
        })),
      })),
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "menu-liste-premium", params });

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Yapısal parmak izi: yerleşim + yükseklikler (ritim h'lerde ölçülür) */
function fp(c: ClientDTO, params: Record<string, unknown>): string {
  const a = analyzeList(c, doc(params));
  return JSON.stringify({
    nameFont: r3(a.nameFont),
    pageCount: a.pages.length,
    metrics: { rowPad: r3(a.metrics.rowPad), catH: r3(a.metrics.catH) },
    pages: a.pages.map((p) =>
      p.columns.map((col) =>
        col.map((pl) => ({
          id: pl.row.kind === "item" ? pl.row.item.id : pl.row.id,
          y: r3(pl.y),
          h: r3(pl.row.h),
        }))
      )
    ),
  });
}

/** Yerleşen TÜM kayıt id'leri (sayfa/sütun sırasıyla) — ürün kaybı ölçümü */
function yerlesenIdler(c: ClientDTO, params: Record<string, unknown>): string[] {
  const a = analyzeList(c, doc(params));
  return a.pages.flatMap((p) =>
    p.columns.flatMap((col) => col.map((pl) => (pl.row.kind === "item" ? pl.row.item.id : `KAT:${pl.row.id}`)))
  );
}

const RITIM = [0.88, 0.94, 1, 1.06, 1.12] as const;

/* Testin aradığı iki tohumu KÖR seçmeyiz — kapalı kümeden farklı ritimlere
   düşen ilk iki tohum ölçülerek bulunur (küme dağılım testi seed.test.ts'te) */
function farkliRitimliTohumlar(): [number, number] {
  const gorulen = new Map<number, number>();
  for (let s = 1; s <= 200; s++) {
    const v = seededVariant(s, RITIM, "liste-ritim");
    if (v === 1) continue; // taban ritme düşen tohum ayırt edilemez, atla
    for (const [oncekiSeed, oncekiV] of gorulen) {
      if (oncekiV !== v) return [oncekiSeed, s];
    }
    gorulen.set(s, v);
  }
  throw new Error("200 tohumda iki farklı taban-dışı ritim bulunamadı — küme bozuk");
}

describe("designSeed — kontrollü benzersizlik (Canonical 4.4)", () => {
  const c = client(5, 8);

  it("FARKLI tohum → FARKLI yerleşim (borç #3'ün şart koştuğu test)", () => {
    const [s1, s2] = farkliRitimliTohumlar();
    expect(fp(c, { designSeed: s1 })).not.toBe(fp(c, { designSeed: s2 }));
    /* taban-dışı tohum tabandan da farklıdır */
    expect(fp(c, { designSeed: s1 })).not.toBe(fp(c, {}));
  });

  it("AYNI tohum → AYNI yerleşim (4.1 determinizm + 4.4 tekrar üretilebilirlik)", () => {
    const [s1] = farkliRitimliTohumlar();
    expect(fp(c, { designSeed: s1 })).toBe(fp(c, { designSeed: s1 }));
  });

  it("tohum 0 / eksik / geçersiz → BUGÜNKÜ yerleşim BİREBİR (istemeden değişmez)", () => {
    const taban = fp(c, {});
    expect(fp(c, { designSeed: 0 })).toBe(taban);
    expect(fp(c, { designSeed: -3 })).toBe(taban); // geçersiz → taban
    expect(fp(c, { designSeed: 1.5 })).toBe(taban); // tamsayı değil → taban
    expect(fp(c, { designSeed: "x" })).toBe(taban); // tip dışı → taban
  });

  it("ritim çarpanı KAPALI kümeden çıkmaz ve metriklere yansır (rastgelelik değil)", () => {
    for (let s = 1; s <= 60; s++) {
      const a = analyzeList(c, doc({ designSeed: s }));
      const beklenen = seededVariant(s, RITIM, "liste-ritim");
      expect(r3(a.metrics.rowPad), `seed=${s}`).toBe(r3(2.4 * beklenen)); // 1 sütun: rowPad 2.4
      expect(r3(a.metrics.catH), `seed=${s}`).toBe(r3(13 * beklenen));
    }
  });

  it("ÜRÜN KAYBI SIFIR: taşma sözleşmesi (shrink-then-flow) tohumla değişmez", () => {
    const yogun = client(10, 20);
    const tabanIds = yerlesenIdler(yogun, {});
    for (let s = 1; s <= 20; s++) {
      const ids = yerlesenIdler(yogun, { designSeed: s });
      /* aynı kayıt KÜMESİ (sıra sayfa kırılımıyla oynayabilir, kayıt kaybolamaz) */
      expect([...ids].sort(), `seed=${s}`).toEqual([...tabanIds].sort());
    }
  });

  it("okunabilirlik korunur: tohum min-font tabanının altına İNDİREMEZ", () => {
    const yogun = client(12, 25);
    for (const s of [0, 3, 7, 11]) {
      const a = analyzeList(yogun, doc({ designSeed: s, columns: 3 }));
      expect(a.nameFont, `seed=${s}`).toBeGreaterThanOrEqual(3.2); // nameSlot.font_mm.min
    }
  });
});
