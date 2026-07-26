/* designSeed@flyer — çerçeve dili varyasyonu testleri (Canonical 4.4 / 4.1 / 4.3;
   journal 2026-07-26-designseed-flyer).

   Liste-premium v1 desenine ek GÜÇLÜ KAPSAM İNVARYANTI: tohum YALNIZ `frame`
   alanını değiştirir — analiz geri kalanı (kapasite, yerleşim, uyarılar,
   kampanya, QR) tohumdan tamamen bağımsızdır. Tohum içerik miktarına
   DOKUNAMAZ (grid gap/ölçü varyasyonunun bilinçli reddi burada çivilenir). */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { CERCEVE_TABAN, analyzeFlyer, type FlyerFrame } from "./analyze.js";

function makeClient(items = 8): ClientDTO {
  const kit = defaultBrandKit();
  kit.contact = { ...kit.contact, phone: "04 78 00 00 00" };
  return {
    id: "cli_fs", name: "Seed Test", slug: "seed-test", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: kit,
    catalog: CatalogSchema.parse({
      categories: [{
        id: "c1", name_fr: "Menüler", order: 1,
        items: Array.from({ length: items }, (_, i) => ({
          id: `f${i}`, name_fr: `Ürün ${i}`, order: i,
          prices: [{ label: "seul", value: 5 + i }],
        })),
      }],
    }),
    assets: [], created_at: "t", updated_at: "t",
  };
}

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "flyer", params });

const c = makeClient(9);
const frameOf = (params: Record<string, unknown>): FlyerFrame => analyzeFlyer(c, doc(params)).frame;

describe("designSeed@flyer — kontrollü benzersizlik (4.4)", () => {
  it("TABAN birebir: seed yok / 0 / geçersiz → bugünkü sabitler (nesne AYNEN)", () => {
    expect(frameOf({})).toBe(CERCEVE_TABAN);
    expect(frameOf({ designSeed: 0 })).toBe(CERCEVE_TABAN);
    expect(frameOf({ designSeed: -3 })).toBe(CERCEVE_TABAN);
    expect(frameOf({ designSeed: 1.5 })).toBe(CERCEVE_TABAN);
    expect(frameOf({ designSeed: "x" })).toBe(CERCEVE_TABAN);
    expect(CERCEVE_TABAN).toEqual({ campaignRx: 2.5, cellRx: 1.8, cellDash: "1.7 1.2" });
  });

  it("determinizm (4.1): aynı tohum aynı çerçeve; farklı tohumlar kümede gezinir", () => {
    for (const s of [1, 7, 42, 999, 4242]) {
      expect(frameOf({ designSeed: s })).toEqual(frameOf({ designSeed: s }));
    }
    const gorulen = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => JSON.stringify(frameOf({ designSeed: s }))));
    expect(gorulen.size).toBeGreaterThan(1); /* varyasyon gerçekten var */
  });

  it("KAPALI küme: her tohum tanımlı 5 varyanttan birini seçer (serbest değer yok)", () => {
    const kume = [
      { campaignRx: 1.2, cellRx: 0.8, cellDash: "1.1 0.9" },
      { campaignRx: 2.5, cellRx: 1.8, cellDash: "1.7 1.2" },
      { campaignRx: 4.0, cellRx: 2.6, cellDash: "1.7 1.2" },
      { campaignRx: 2.5, cellRx: 1.8, cellDash: null },
      { campaignRx: 4.0, cellRx: 2.6, cellDash: null },
    ];
    for (let s = 1; s <= 40; s++) {
      const f = frameOf({ designSeed: s });
      expect(kume, `seed=${s}`).toContainEqual(f);
    }
  });

  it("YALNIZ-frame-değişir invaryantı: tohumlu analiz, frame dışında tohumsuzla DERİN EŞİT", () => {
    const taban = analyzeFlyer(c, doc({}));
    for (const s of [3, 17, 256]) {
      const tohumlu = analyzeFlyer(c, doc({ designSeed: s }));
      expect({ ...tohumlu, frame: taban.frame }).toEqual(taban);
    }
  });

  it("tohum kapasiteye/uyarılara DOKUNAMAZ: yoğun katalogda yerleşen id'ler sabit", () => {
    const yogun = makeClient(20);
    const tabanIds = analyzeFlyer(yogun, doc({})).mini.items.map((i) => i.id);
    for (const s of [5, 88, 1234]) {
      const a = analyzeFlyer(yogun, doc({ designSeed: s }));
      expect(a.mini.items.map((i) => i.id)).toEqual(tabanIds);
      expect(a.warnings).toEqual(analyzeFlyer(yogun, doc({})).warnings);
    }
  });
});
