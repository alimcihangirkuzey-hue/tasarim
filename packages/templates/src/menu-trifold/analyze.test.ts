import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { INNER_PANELS, FOLDS_INNER, FOLDS_OUTER, OUTER_PANELS } from "./manifest.js";
import { analyzeTrifold } from "./analyze.js";

function makeClient(itemCount = 12): ClientDTO {
  const kit = defaultBrandKit();
  kit.contact.phone = "04 78 12 34 56";
  kit.contact.google_review_url = "https://g.page/r/abc";
  kit.slogan_fr = "Le vrai goût du grill";
  return {
    id: "cli_t", name: "Trifold Test", slug: "trifold-test", notes: "", currency: "EUR",
    brandkit: kit,
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "c1", name_fr: "Sandwichs", order: 1,
          items: Array.from({ length: itemCount }, (_, i) => ({
            id: `s${i}`, name_fr: `Sandwich ${i}`, order: i,
            tags: i === 3 ? ["populaire"] : [],
            prices: [{ label: "seul", value: 7 + i * 0.5 }],
          })),
        },
      ],
    }),
    assets: [], created_at: "t", updated_at: "t",
  };
}

const doc = () => DocumentStateSchema.parse({ template_id: "menu-trifold" });

describe("menu-trifold (FAZ2-GOREV §6.1)", () => {
  it("panel haritası sabit: 97/100/100 dış, 100/100/97 iç (CONSTITUTION §3)", () => {
    expect(OUTER_PANELS.map((p) => p.w)).toEqual([97, 100, 100]);
    expect(INNER_PANELS.map((p) => p.w)).toEqual([100, 100, 97]);
    expect(FOLDS_OUTER).toEqual([97, 197]);
    expect(FOLDS_INNER).toEqual([100, 200]);
  });

  it("2 sayfa; QR standart (review→yoksa tel fallback)", () => {
    const a = analyzeTrifold(makeClient(), doc());
    expect(a.pages).toBe(2);
    expect(a.qr).not.toBeNull();
    expect(a.qr!.d.length).toBeGreaterThan(100);
  });

  it("iç kanat: populaire önce, en fazla 4 ürün", () => {
    const a = analyzeTrifold(makeClient(12), doc());
    expect(a.flapItems).toHaveLength(4);
    expect(a.flapItems[0].name).toBe("Sandwich 3"); // populaire etiketli öne geçer
    expect(a.flapItems[0].price).toBe("8,50 €");
  });

  it("iç yüz 3 sütuna akar; makul yükte taşma yok", () => {
    const a = analyzeTrifold(makeClient(18), doc());
    expect(a.innerColumns).toHaveLength(3);
    const placed = a.innerColumns.reduce((n, c) => n + c.rows.length, 0);
    expect(placed).toBe(19); // 18 ürün + 1 kategori
    expect(a.overflowCount).toBe(0);
  });

  it("aşırı yükte görünür taşma uyarısı (M8, sessiz kırpma yok)", () => {
    const a = analyzeTrifold(makeClient(120), doc());
    expect(a.overflowCount).toBeGreaterThan(0);
    expect(a.warnings.some((w) => w.type === "overflow-items")).toBe(true);
  });

  it("logo yoksa empty-required uyarısı", () => {
    const a = analyzeTrifold(makeClient(), doc());
    expect(a.warnings.some((w) => w.type === "empty-required" && w.slotId === "logo")).toBe(true);
  });
});
