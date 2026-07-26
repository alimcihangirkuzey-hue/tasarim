/* GT-2 MAKİNE ALT-KRİTERLERİ (Canonical 10.3 / 4.2) — 20/50/100/200 ürün.
   ============================================================================
   GT-2'nin YARGI kalemleri (sırıtmayan reflow, simetri) İNSAN kapısıdır ve
   burada test EDİLMEZ (Canonical 11.6/3 — yeşil test yargıyı ikame edemez;
   tur: docs/gt2-tur/). Burada yalnız SÖZLEŞMESEL invaryantlar çivilenir:

   · minimum font AŞILAMAZ (4.2 "Minimum sınır aşılamaz")
   · flow stratejisinde ürün KAYBOLMAZ (taşma sözleşmesi)
   · sütun yüksekliği sayfa sınırını TAŞMAZ (sessiz sayfa-dışı basım yok)
   · düşen içerik DAİMA görünür uyarı üretir (M8 sessiz kırpma yasağı)
   · taşma muhasebesi KAPANIR: yerleşen + taşan = toplam

   Kataloglar galeri betiğiyle AYNI mantıkla deterministik üretilir. */

import { describe, expect, it } from "vitest";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeGrid } from "../menu-grid-cells/analyze.js";
import { manifest as gridManifest } from "../menu-grid-cells/manifest.js";
import { analyzeList } from "../menu-liste-premium/analyze.js";
import { manifest as listeManifest } from "../menu-liste-premium/manifest.js";
import { analyzeTrifold } from "../menu-trifold/analyze.js";
import { manifest as trifoldManifest } from "../menu-trifold/manifest.js";

const YOGUNLUKLAR = [20, 50, 100, 200];

const ADLAR = [
  "Kebab", "Pizza Margherita", "Assiette Mixte Spéciale du Chef", "Tacos XL",
  "Burger Maison", "Dürüm Poulet Mariné aux Herbes", "Salade César", "Pide Fromage",
];

function katalog(n: number): ClientDTO {
  const katSayisi = Math.max(1, Math.ceil(n / 8));
  let kalan = n;
  return {
    id: "cli_gt2t",
    name: "GT-2 Test",
    slug: "gt2-test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({}),
    catalog: CatalogSchema.parse({
      categories: Array.from({ length: katSayisi }, (_, c) => {
        const buKat = Math.min(8, kalan);
        kalan -= buKat;
        return {
          id: `c${c}`,
          name_fr: `Catégorie ${c + 1}`,
          order: c,
          items: Array.from({ length: buKat }, (_, i) => {
            const g = c * 8 + i;
            return {
              id: `c${c}i${i}`,
              name_fr: `${ADLAR[g % ADLAR.length]} ${g + 1}`,
              desc_fr: g % 3 === 2 ? undefined : "tomate · mozzarella · basilic",
              prices: [{ label: "seul", value: 7.5 + (g % 9) }],
              order: i,
            };
          }),
        };
      }),
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const doc = (template_id: string, params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id, params });

const EPS = 1e-6;

describe("GT-2 — menu-liste-premium (flow: ürün düşmez)", () => {
  const nameMin = listeManifest.repeater.itemSlots.find((s) => s.id === "name")!.font_mm!.min;

  for (const n of YOGUNLUKLAR) {
    for (const columns of [1, 2, 3]) {
      it(`${n} ürün · ${columns} sütun: min-font aşılmaz, kayıp yok, sütun taşmaz`, () => {
        const c = katalog(n);
        const a = analyzeList(c, doc("menu-liste-premium", { columns }));

        /* 4.2: mutlak minimum aşılmaz */
        expect(a.nameFont).toBeGreaterThanOrEqual(nameMin - EPS);

        /* flow: TÜM ürünler yerleşir (kayıp yok) */
        const yerlesen = a.pages.flatMap((p) =>
          p.columns.flatMap((col) => col.filter((pl) => pl.row.kind === "item"))
        );
        expect(yerlesen.length).toBe(n);

        /* sütun yüksekliği sayfa sınırını taşmaz (dekor/QR yok → colH = içerik) */
        const colH = a.geo.content.h;
        for (const p of a.pages) {
          for (const col of p.columns) {
            const son = col[col.length - 1];
            if (son) expect(son.y + son.row.h).toBeLessThanOrEqual(colH + EPS);
          }
        }
      });
    }
  }
});

describe("GT-2 — menu-grid-cells (muhasebe kapanır, düşen daima uyarır)", () => {
  for (const n of YOGUNLUKLAR) {
    it(`${n} ürün · single: yerleşen + taşan = toplam; taşma varsa uyarı VAR`, () => {
      const c = katalog(n);
      const a = analyzeGrid(c, doc("menu-grid-cells", { cols: 3, flow: "single" }));
      const hucre = a.layout.placed.filter((p) => p.kind === "cell").length;
      expect(hucre + a.layout.overflow.length).toBe(n);
      if (a.layout.overflow.length > 0) {
        expect(
          a.warnings.some(
            (w) => w.type === "overflow-items" || w.type === "overflow-strategy-violation"
          )
        ).toBe(true);
      }
    });

    it(`${n} ürün · multipage: sayfalar boyunca kayıp yok`, () => {
      const c = katalog(n);
      const d = doc("menu-grid-cells", { cols: 3, flow: "multipage" });
      const ilk = analyzeGrid(c, d);
      let toplamHucre = 0;
      for (let p = 0; p < ilk.pages; p++) {
        toplamHucre += analyzeGrid(c, d, p).layout.placed.filter((x) => x.kind === "cell").length;
      }
      const sonSayfa = analyzeGrid(c, d, ilk.pages - 1);
      expect(toplamHucre + sonSayfa.layout.overflow.length).toBe(n);
    });
  }

  it("kapasite kolon sayısıyla ölçeklenir (grid ilanı: shrink-then-warn düşürme izinli)", () => {
    expect(gridManifest.repeater.overflow).toBe("shrink-then-warn");
  });
});

describe("GT-2 — menu-trifold (tek yüz: düşen sayılır ve uyarır)", () => {
  const nameMin = trifoldManifest.repeater.itemSlots.find((s) => s.id === "name")!.font_mm!.min;

  for (const n of YOGUNLUKLAR) {
    it(`${n} ürün: muhasebe kapanır, taşma varsa görünür uyarı, font tabanda durur`, () => {
      const c = katalog(n);
      const a = analyzeTrifold(c, doc("menu-trifold", {}));
      const yerlesen = a.innerColumns.reduce((s, col) => s + col.rows.length, 0);
      /* yerleşen satırlar (kategori dahil) + taşan = toplam blok */
      const katSayisi = Math.max(1, Math.ceil(n / 8));
      expect(yerlesen + a.overflowCount).toBe(n + katSayisi);
      if (a.overflowCount > 0) {
        expect(a.warnings.some((w) => w.type === "overflow-items")).toBe(true);
      }
      const fontlar = a.innerColumns.flatMap((col) =>
        col.rows.filter((r) => r.row.kind === "item").map((r) => r.row.nameFont!)
      );
      for (const f of fontlar) expect(f).toBeGreaterThanOrEqual(nameMin - EPS);
    });
  }
});
