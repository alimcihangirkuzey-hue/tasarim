/* designSeed@carte — damga çerçeve dili testleri (Canonical 4.4 / 4.1 / 4.3;
   journal 2026-07-26-designseed-carte). Flyer/grid aynası: taban nesne
   aynılığı · determinizm · kapalı küme · YALNIZ-frame derin-eşitlik
   (damga yerleşimi/sayısı tohumdan bağımsız) · tuz ayrışması. */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { CARTE_CERCEVE_TABAN, analyzeFidelite, type CarteFrame } from "./analyze.js";
import { analyzeGrid } from "../menu-grid-cells/analyze.js";

const c: ClientDTO = {
  id: "cli_cs", name: "Carte Seed", slug: "carte-seed", notes: "", currency: "EUR", menu_language: "fr",
  brandkit: defaultBrandKit(),
  catalog: CatalogSchema.parse({ categories: [] }),
  assets: [], created_at: "t", updated_at: "t",
};

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "carte-fidelite", params });

const frameOf = (params: Record<string, unknown>): CarteFrame => analyzeFidelite(c, doc(params)).frame;

describe("designSeed@carte — kontrollü benzersizlik (4.4)", () => {
  it("TABAN birebir: seed yok / 0 / geçersiz → bugünkü sabitler (nesne AYNEN)", () => {
    expect(frameOf({})).toBe(CARTE_CERCEVE_TABAN);
    expect(frameOf({ designSeed: 0 })).toBe(CARTE_CERCEVE_TABAN);
    expect(frameOf({ designSeed: -7 })).toBe(CARTE_CERCEVE_TABAN);
    expect(frameOf({ designSeed: 3.3 })).toBe(CARTE_CERCEVE_TABAN);
    expect(frameOf({ designSeed: "x" })).toBe(CARTE_CERCEVE_TABAN);
    expect(CARTE_CERCEVE_TABAN).toEqual({ stampRx: 1.2, stampDash: "1.2 1" });
  });

  it("determinizm (4.1) + KAPALI küme: 40 tohum, 5 üyelik dışına çıkamaz", () => {
    const kume = [
      { stampRx: 0.5, stampDash: "0.9 0.7" },
      { stampRx: 1.2, stampDash: "1.2 1" },
      { stampRx: 2.2, stampDash: "1.2 1" },
      { stampRx: 1.2, stampDash: null },
      { stampRx: 2.2, stampDash: null },
    ];
    for (let s = 1; s <= 40; s++) {
      const f = frameOf({ designSeed: s });
      expect(kume, `seed=${s}`).toContainEqual(f);
      expect(frameOf({ designSeed: s }), `seed=${s} determinizm`).toEqual(f);
    }
    const gorulen = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(frameOf({ designSeed: i + 1 }))));
    expect(gorulen.size).toBeGreaterThan(1);
  });

  it("YALNIZ-frame invaryantı: damga sayısı/yerleşimi dahil frame dışında DERİN EŞİT", () => {
    for (const stampCount of [8, 12]) {
      const taban = analyzeFidelite(c, doc({ stampCount }));
      for (const s of [6, 33, 777]) {
        const tohumlu = analyzeFidelite(c, doc({ stampCount, designSeed: s }));
        expect({ ...tohumlu, frame: taban.frame }, `stamps=${stampCount} seed=${s}`).toEqual(taban);
        expect(tohumlu.stamps, `stamps=${stampCount} seed=${s}`).toEqual(taban.stamps);
      }
    }
  });

  it("tuzlar aileleri AYRIŞTIRIR: aynı tohum carte ve grid'de bağımsız karar alabilir", () => {
    const gc: ClientDTO = {
      ...c,
      catalog: CatalogSchema.parse({
        categories: [{
          id: "c1", name_fr: "P", order: 1,
          items: Array.from({ length: 6 }, (_, i) => ({
            id: `g${i}`, name_fr: `Plat ${i}`, order: i, prices: [{ label: "seul", value: 7 }],
          })),
        }],
      }),
    };
    let ayristi = false;
    for (let s = 1; s <= 10 && !ayristi; s++) {
      const carte = frameOf({ designSeed: s });
      const grid = analyzeGrid(gc, DocumentStateSchema.parse({ template_id: "menu-grid-cells", params: { cols: 3, designSeed: s } })).frame;
      if ((carte.stampDash === null) !== (grid.cellDash === null)) ayristi = true;
    }
    expect(ayristi).toBe(true);
  });
});
