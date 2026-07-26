/* designSeed@trifold — panel çerçeve dili testleri (Canonical 4.4 / 4.1 / 4.3;
   journal 2026-07-26-designseed-trifold). Flyer/grid/carte aynası + trifold'a
   özgü kanıt: invaryant taşma muhasebesini (overflowCount) ve iç yüz sütun
   yerleşimini de kapsar — tohum panel geometrisine/içeriğe dokunamaz. */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { TRIFOLD_CERCEVE_TABAN, analyzeTrifold, type TrifoldFrame } from "./analyze.js";
import { analyzeFlyer } from "../flyer/analyze.js";

function makeClient(items: number): ClientDTO {
  return {
    id: "cli_ts", name: "Trifold Seed", slug: "trifold-seed", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [{
        id: "c1", name_fr: "Plats", order: 1,
        items: Array.from({ length: items }, (_, i) => ({
          id: `t${i}`, name_fr: `Plat ${i}`, order: i,
          prices: [{ label: "seul", value: 6 + (i % 8) }],
        })),
      }],
    }),
    assets: [], created_at: "t", updated_at: "t",
  };
}

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "menu-trifold", params });

const c = makeClient(15);
const frameOf = (params: Record<string, unknown>): TrifoldFrame => analyzeTrifold(c, doc(params)).frame;

describe("designSeed@trifold — kontrollü benzersizlik (4.4)", () => {
  it("TABAN birebir: seed yok / 0 / geçersiz → bugünkü sabitler (nesne AYNEN)", () => {
    expect(frameOf({})).toBe(TRIFOLD_CERCEVE_TABAN);
    expect(frameOf({ designSeed: 0 })).toBe(TRIFOLD_CERCEVE_TABAN);
    expect(frameOf({ designSeed: -2 })).toBe(TRIFOLD_CERCEVE_TABAN);
    expect(frameOf({ designSeed: 4.4 })).toBe(TRIFOLD_CERCEVE_TABAN);
    expect(frameOf({ designSeed: "x" })).toBe(TRIFOLD_CERCEVE_TABAN);
    /* keşif düzeltmesi: baskıda görünen tek tasarım çerçevesi KAPAK çerçevesi
       (ön paneldeki edit-modu yer tutucusu kapsam dışı — journal) */
    expect(TRIFOLD_CERCEVE_TABAN).toEqual({ flapRx: 2, flapDash: "1.8 1.3" });
  });

  it("determinizm (4.1) + KAPALI küme: 40 tohum, 5 üyelik dışına çıkamaz", () => {
    const kume = [
      { flapRx: 0.8, flapDash: "1.1 0.9" },
      { flapRx: 2, flapDash: "1.8 1.3" },
      { flapRx: 3.2, flapDash: "1.8 1.3" },
      { flapRx: 2, flapDash: null },
      { flapRx: 3.2, flapDash: null },
    ];
    for (let s = 1; s <= 40; s++) {
      const f = frameOf({ designSeed: s });
      expect(kume, `seed=${s}`).toContainEqual(f);
      expect(frameOf({ designSeed: s }), `seed=${s} determinizm`).toEqual(f);
    }
    const gorulen = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(frameOf({ designSeed: i + 1 }))));
    expect(gorulen.size).toBeGreaterThan(1);
  });

  it("YALNIZ-frame invaryantı: taşma muhasebesi + iç yüz yerleşimi dahil DERİN EŞİT", () => {
    /* 60 ürün: taşma garantili — tohum overflowCount'u değiştiremez */
    for (const n of [15, 60]) {
      const yogun = makeClient(n);
      const taban = analyzeTrifold(yogun, doc({}));
      for (const s of [9, 44, 1024]) {
        const tohumlu = analyzeTrifold(yogun, doc({ designSeed: s }));
        expect({ ...tohumlu, frame: taban.frame }, `n=${n} seed=${s}`).toEqual(taban);
        expect(tohumlu.overflowCount, `n=${n} seed=${s} taşma`).toBe(taban.overflowCount);
        expect(tohumlu.innerColumns, `n=${n} seed=${s} sütunlar`).toEqual(taban.innerColumns);
      }
    }
  });

  it("tuzlar aileleri AYRIŞTIRIR: aynı tohum trifold ve flyer'da bağımsız karar alabilir", () => {
    const fc = makeClient(9);
    let ayristi = false;
    for (let s = 1; s <= 10 && !ayristi; s++) {
      const tri = frameOf({ designSeed: s });
      const fly = analyzeFlyer(fc, DocumentStateSchema.parse({ template_id: "flyer", params: { designSeed: s } })).frame;
      if ((tri.flapDash === null) !== (fly.cellDash === null)) ayristi = true;
    }
    expect(ayristi).toBe(true);
  });
});
