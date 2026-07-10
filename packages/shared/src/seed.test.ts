import { describe, expect, it } from "vitest";
import { INGREDIENT_SEED } from "./ingredients.js";
import { SEED_CHIPS, chipId } from "./seed-chips.js";
import { IngredientChipSchema } from "./sector.js";

describe("INGREDIENT_SEED tohum çipleri (F7-B2)", () => {
  it("INGREDIENT_SEED === SEED_CHIPS; 60 çip", () => {
    expect(INGREDIENT_SEED).toBe(SEED_CHIPS);
    expect(SEED_CHIPS.length).toBe(60);
  });

  it("her çip IngredientChipSchema'dan geçer; tr + fr DOLU (Fransa terminolojisi)", () => {
    for (const c of SEED_CHIPS) {
      expect(() => IngredientChipSchema.parse(c)).not.toThrow();
      expect(c.tr.trim()).not.toBe("");
      expect(c.fr.trim()).not.toBe("");
    }
  });

  it("id benzersiz + ing_ deseni + tr'den türetilmiş", () => {
    const ids = SEED_CHIPS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // çakışma yok
    for (const c of SEED_CHIPS) {
      expect(c.id).toMatch(/^ing_[a-z0-9_]+$/);
      expect(c.id).toBe(chipId(c.tr));
    }
  });

  it("chipId: TR katlaması + boşluk→_ (ing_domates_sosu, ing_kozlenmis_biber)", () => {
    expect(chipId("domates sosu")).toBe("ing_domates_sosu");
    expect(chipId("közlenmiş biber")).toBe("ing_kozlenmis_biber");
    expect(chipId("soğan")).toBe("ing_sogan");
  });

  it("tüm çipler tags:[] (B2 verisinde tag yok)", () => {
    for (const c of SEED_CHIPS) expect(c.tags).toEqual([]);
  });
});
