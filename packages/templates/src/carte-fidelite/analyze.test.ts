import { describe, expect, it } from "vitest";
import { DocumentStateSchema, defaultBrandKit, defaultCatalog, type ClientDTO } from "@tezgah/shared";
import { manifest } from "./manifest.js";
import { analyzeFidelite, CARD_H, CARD_W } from "./analyze.js";

const client: ClientDTO = {
  id: "cli_c", name: "Kart Test", slug: "kart-test", notes: "", currency: "EUR", menu_language: "fr",
  brandkit: defaultBrandKit(), catalog: defaultCatalog(),
  assets: [], created_at: "t", updated_at: "t",
};
const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "carte-fidelite", params });

describe("carte-fidelite (FAZ2-GOREV §6.3)", () => {
  it("ölçüler: 85×54, bleed 2 (print 89×58 hedefi)", () => {
    expect(CARD_W).toBe(85);
    expect(CARD_H).toBe(54);
    expect(manifest.bleed_mm).toBe(2);
  });

  it("default 10 damga → 2×5, numaralı 1..10", () => {
    const a = analyzeFidelite(client, doc());
    expect(a.stampCount).toBe(10);
    expect(a.stamps).toHaveLength(10);
    expect(a.stamps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    /* 2 satır × 5 sütun */
    const ys = [...new Set(a.stamps.map((s) => s.y))];
    expect(ys).toHaveLength(2);
    expect(a.stamps.filter((s) => s.y === ys[0])).toHaveLength(5);
  });

  it("8 → 2×4, 12 → 2×6", () => {
    expect(analyzeFidelite(client, doc({ stampCount: 8 })).stamps).toHaveLength(8);
    const twelve = analyzeFidelite(client, doc({ stampCount: 12 }));
    expect(twelve.stamps).toHaveLength(12);
    const row1 = twelve.stamps.filter((s) => s.y === twelve.stamps[0].y);
    expect(row1).toHaveLength(6);
  });

  it("varsayılan metinler ve override", () => {
    const a = analyzeFidelite(client, doc());
    expect(a.title.text).toBe("CARTE DE FIDÉLITÉ");
    expect(a.subtitle.text).toBe("1 menu acheté = 1 tampon");
    expect(a.reward.text).toBe("11ᵉ KEBAB OU PIZZA OFFERT !");
    expect(a.services.text).toBe("Sur place · à emporter · Livraison");
    expect(a.pages).toBe(2);

    const d = DocumentStateSchema.parse({
      template_id: "carte-fidelite",
      overrides: { reward: { value: "9ᵉ TACOS OFFERT !", detached: true } },
    });
    expect(analyzeFidelite(client, d).reward).toEqual({ text: "9ᵉ TACOS OFFERT !", detached: true });
  });

  it("damgalar kart içinde kalır", () => {
    const a = analyzeFidelite(client, doc({ stampCount: 12 }));
    for (const s of a.stamps) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(CARD_W);
      expect(s.y + s.h).toBeLessThanOrEqual(CARD_H - 11.5); // ödül bandına girmez
    }
  });
});
