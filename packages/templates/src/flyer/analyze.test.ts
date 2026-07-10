import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeFlyer } from "./analyze.js";

function makeClient(items = 8, contact: Partial<ReturnType<typeof defaultBrandKit>["contact"]> = {}): ClientDTO {
  const kit = defaultBrandKit();
  kit.contact = { ...kit.contact, phone: "04 78 00 00 00", ...contact };
  return {
    id: "cli_f", name: "Flyer Test", slug: "flyer-test", notes: "", currency: "EUR", menu_language: "fr",
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

describe("flyer (FAZ2-GOREV §6.2)", () => {
  it("a5 kapasitesi 4, 21x21 kapasitesi 6; fazlası görünür uyarı (M8)", () => {
    const a5 = analyzeFlyer(makeClient(8), doc());
    expect(a5.mini.items).toHaveLength(4);
    expect(a5.warnings.find((w) => w.type === "overflow-items")).toMatchObject({ count: 4 });

    const kare = analyzeFlyer(makeClient(8), doc({ format: "21x21" }));
    expect(kare.formatDef).toMatchObject({ w_mm: 210, h_mm: 210 });
    expect(kare.mini.items).toHaveLength(6);
    expect(kare.warnings.find((w) => w.type === "overflow-items")).toMatchObject({ count: 2 });
  });

  it("çift saat: delivery_hours boşsa yalnız açılış; doluysa ikisi", () => {
    const yok = analyzeFlyer(makeClient(2, { hours: "11h-23h" }), doc());
    expect(yok.hours).toBe("11h-23h");
    expect(yok.deliveryHours).toBe("");

    const var_ = analyzeFlyer(
      makeClient(2, { hours: "11h-23h", delivery_hours: "18h-22h30" }),
      doc()
    );
    expect(var_.deliveryHours).toBe("18h-22h30");
  });

  it("teslimat bloğu: override yoksa boş (gizli), varsa metin", () => {
    const bos = analyzeFlyer(makeClient(2), doc());
    expect(bos.deliveryNote.text).toBe("");

    const d = DocumentStateSchema.parse({
      template_id: "flyer",
      overrides: { delivery_note: { value: "Zone: Lyon 2/3 — min 15€", detached: true } },
    });
    const dolu = analyzeFlyer(makeClient(2), d);
    expect(dolu.deliveryNote.text).toContain("min 15€");
  });

  it("kampanya slotları default + override edilebilir", () => {
    const a = analyzeFlyer(makeClient(2), doc());
    expect(a.campaign.title.text).toBe("OFFRE SPÉCIALE");
    expect(a.campaign.price.text).toBe("10€");

    const d = DocumentStateSchema.parse({
      template_id: "flyer",
      overrides: { campaign_price: { value: "12,50€", detached: true } },
    });
    expect(analyzeFlyer(makeClient(2), d).campaign.price).toEqual({ text: "12,50€", detached: true });
  });

  it("QR: review boşsa tel'e düşer", () => {
    const a = analyzeFlyer(makeClient(2), doc());
    expect(a.qr).not.toBeNull(); // tel fallback
  });
});
