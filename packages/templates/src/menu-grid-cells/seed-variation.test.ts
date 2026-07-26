/* designSeed@grid — hücre çerçeve dili testleri (Canonical 4.4 / 4.1 / 4.3;
   journal 2026-07-26-designseed-grid). Flyer paketinin aynası + grid'e özgü
   ek kanıt: invaryant SAYFALAMAYI da kapsar (multipage'de tohum sayfa
   sayısına/yerleşime dokunamaz) ve tuzlar aileleri AYRIŞTIRIR. */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { GRID_CERCEVE_TABAN, analyzeGrid, type GridFrame } from "./analyze.js";
import { analyzeFlyer } from "../flyer/analyze.js";

function makeClient(items: number): ClientDTO {
  return {
    id: "cli_gs", name: "Grid Seed", slug: "grid-seed", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [{
        id: "c1", name_fr: "Plats", order: 1,
        items: Array.from({ length: items }, (_, i) => ({
          id: `g${i}`, name_fr: `Plat ${i}`, order: i,
          prices: [{ label: "seul", value: 6 + (i % 8) }],
        })),
      }],
    }),
    assets: [], created_at: "t", updated_at: "t",
  };
}

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "menu-grid-cells", params });

const c = makeClient(12);
const frameOf = (params: Record<string, unknown>): GridFrame => analyzeGrid(c, doc(params)).frame;

describe("designSeed@grid — kontrollü benzersizlik (4.4)", () => {
  it("TABAN birebir: seed yok / 0 / geçersiz → bugünkü sabitler (nesne AYNEN)", () => {
    expect(frameOf({})).toBe(GRID_CERCEVE_TABAN);
    expect(frameOf({ designSeed: 0 })).toBe(GRID_CERCEVE_TABAN);
    expect(frameOf({ designSeed: -1 })).toBe(GRID_CERCEVE_TABAN);
    expect(frameOf({ designSeed: 2.5 })).toBe(GRID_CERCEVE_TABAN);
    expect(frameOf({ designSeed: "x" })).toBe(GRID_CERCEVE_TABAN);
    expect(GRID_CERCEVE_TABAN).toEqual({ cellRx: 2, cellDash: "1.8 1.3" });
  });

  it("determinizm (4.1) + KAPALI küme: 40 tohum, 5 üyelik dışına çıkamaz", () => {
    const kume = [
      { cellRx: 0.9, cellDash: "1.2 0.9" },
      { cellRx: 2, cellDash: "1.8 1.3" },
      { cellRx: 3, cellDash: "1.8 1.3" },
      { cellRx: 2, cellDash: null },
      { cellRx: 3, cellDash: null },
    ];
    for (let s = 1; s <= 40; s++) {
      const f = frameOf({ designSeed: s });
      expect(kume, `seed=${s}`).toContainEqual(f);
      expect(frameOf({ designSeed: s }), `seed=${s} determinizm`).toEqual(f);
    }
    const gorulen = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(frameOf({ designSeed: i + 1 }))));
    expect(gorulen.size).toBeGreaterThan(1);
  });

  it("YALNIZ-frame-değişir invaryantı: multipage dahil, frame dışında DERİN EŞİT", () => {
    const yogun = makeClient(40);
    for (const flow of ["single", "multipage"] as const) {
      const taban = analyzeGrid(yogun, doc({ flow, cols: 3 }));
      for (const s of [4, 21, 512]) {
        const tohumlu = analyzeGrid(yogun, doc({ flow, cols: 3, designSeed: s }));
        expect({ ...tohumlu, frame: taban.frame }, `${flow} seed=${s}`).toEqual(taban);
        expect(tohumlu.pages, `${flow} seed=${s} sayfa`).toBe(taban.pages);
      }
    }
  });

  it("tuzlar aileleri AYRIŞTIRIR: aynı tohum flyer ve grid'de bağımsız karar alabilir", () => {
    /* Yapısal kanıt: seededVariant girdisi tuz içerir ('flyer-cerceve' vs
       'grid-cerceve') — aynı tohumda iki ailenin seçim İNDEKSLERİ özdeş
       olmak zorunda değildir. En az bir tohumda ayrışma gözlenmeli (10'da). */
    const fc = makeClient(9);
    let ayristi = false;
    for (let s = 1; s <= 10 && !ayristi; s++) {
      const g = frameOf({ designSeed: s });
      const f = analyzeFlyer(fc, DocumentStateSchema.parse({ template_id: "flyer", params: { designSeed: s } })).frame;
      /* karşılaştırılabilir tek ortak boyut: kesikli mi düz mü */
      if ((g.cellDash === null) !== (f.cellDash === null)) ayristi = true;
    }
    expect(ayristi).toBe(true);
  });
});
