import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeVitro, vitroBandeau } from "./index.js";
import { analyzeEnseigne } from "../enseigne/index.js";

function makeClient(withMono = false): ClientDTO {
  const kit = defaultBrandKit();
  if (withMono) kit.logo_mono = "ast_mono";
  return {
    id: "cli_v", name: "Vitro Test", slug: "vitro-test", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: kit,
    catalog: CatalogSchema.parse({
      categories: [{
        id: "c1", name_fr: "Menüler", order: 1,
        items: Array.from({ length: 8 }, (_, i) => ({
          id: `v${i}`, name_fr: `Ürün ${i}`, order: i, prices: [{ label: "seul", value: 8 + i }],
        })),
      }],
    }),
    assets: withMono
      ? [{
          id: "ast_mono", client_id: "cli_v", kind: "logo", filename: "m.png",
          width_px: 2000, height_px: 2000, tags: "", created_at: "t",
          urls: { orig: "/o", master: "/m", thumb: "/t" },
        }]
      : [],
    created_at: "t", updated_at: "t",
  };
}

const doc = (params: Record<string, unknown>) =>
  DocumentStateSchema.parse({ template_id: "vitro-bandeau", params });

describe("analyzeVitro (FAZ3-GOREV §4)", () => {
  it("cm → mm; 180×120 belge 1800×1200 mm, 1:1", () => {
    const a = analyzeVitro(makeClient(), doc({ w_cm: 180, h_cm: 120 }));
    expect(a.w_mm).toBe(1800);
    expect(a.h_mm).toBe(1200);
    expect(a.scale).toBe(1);
    expect(a.stamp).toBeNull();
  });

  it("600 cm uzun kenar → 1:10 + ÉCHELLE damgası", () => {
    const a = analyzeVitro(makeClient(), doc({ w_cm: 600, h_cm: 80 }));
    expect(a.scale).toBe(10);
    expect(a.stamp).toBe("ÉCHELLE 1:10");
  });

  it("decoupe: logo_mono zorunlu (yoksa uyarı); varsa uyarı yok", () => {
    const yok = analyzeVitro(makeClient(false), doc({ mode: "decoupe" }));
    expect(yok.warnings.some((w) => w.type === "empty-required" && w.slotId === "logo_mono")).toBe(true);

    const var_ = analyzeVitro(makeClient(true), doc({ mode: "decoupe" }));
    expect(var_.warnings.some((w) => w.type === "empty-required" && w.slotId === "logo_mono")).toBe(false);
    expect(var_.monoUrl).toBe("/m");
  });

  it("colonne mini repeater: seçimden en fazla 6 ürün", () => {
    const a = analyzeVitro(makeClient(), doc({}));
    expect(a.items).toHaveLength(6);
    expect(a.items[0].price).toBe("8,00 €");
  });

  it("miroir parametresi analize taşınır", () => {
    expect(analyzeVitro(makeClient(), doc({ miroir: true })).params.miroir).toBe(true);
  });

  it("pageSizeMM fiziksel sayfaya 1:10 kuralını uygular (PDF sayfa boyutu)", () => {
    const c = makeClient();
    /* 1:1 — 200×80 cm, bleed 3: sayfa 2000×800 mm */
    expect(vitroBandeau.pageSizeMM!(c, doc({ w_cm: 200, h_cm: 80, bleed_mm: 3 }))).toEqual({
      w_mm: 2000, h_mm: 800, bleed_mm: 3,
    });
    /* 1:10 — 600×80 cm: sayfa 600×80 mm, bleed de /10 */
    expect(vitroBandeau.pageSizeMM!(c, doc({ w_cm: 600, h_cm: 80, bleed_mm: 5 }))).toEqual({
      w_mm: 600, h_mm: 80, bleed_mm: 0.5,
    });
  });
});

describe("analyzeEnseigne (FAZ3-GOREV §5)", () => {
  it("düşük kontrast temada bekçi uyarısı (M4)", () => {
    /* brand teması: bg=#FFF8EF, heading=#C8102E → oran ~4.9 (uyarı yok);
       kontrastı bozmak için kit renklerini yaklaştır */
    const client = makeClient();
    client.brandkit.colors.background = "#C8102E";
    client.brandkit.colors.primary = "#B5122D"; // zemine çok yakın
    const a = analyzeEnseigne(client, DocumentStateSchema.parse({
      template_id: "enseigne-panneau",
      params: { w_cm: 300, h_cm: 60 },
    }));
    const warn = a.warnings.find((w) => w.type === "contrast");
    expect(warn).toBeDefined();
    expect((warn as { ratio: number }).ratio).toBeLessThan(3);
  });

  it("300×60 cm → 3000×600 mm, başlık müşteri adına düşer", () => {
    const a = analyzeEnseigne(makeClient(), DocumentStateSchema.parse({
      template_id: "enseigne-panneau",
      params: { w_cm: 300, h_cm: 60 },
    }));
    expect(a.w_mm).toBe(3000);
    expect(a.title).toBe("Vitro Test");
    expect(a.scale).toBe(1);
  });
});
