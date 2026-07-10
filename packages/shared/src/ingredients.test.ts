import { describe, expect, it } from "vitest";
import {
  chipKey,
  findChipByTr,
  IngredientCreateSchema,
  IngredientPatchSchema,
  mergeIngredients,
  planUsageBump,
  resolvePatchTarget,
  type IngredientLibraryRow,
} from "./ingredients.js";
import type { IngredientChip } from "./sector.js";

/* Fixture kurucular — kod seed BOŞ olsa da saf mantık burada kanıtlanır. */
const seed = (o: Partial<IngredientChip> & { id: string; tr: string }): IngredientChip => ({
  fr: "", de: "", tags: [], ...o,
});
const row = (o: Partial<IngredientLibraryRow> & { id: string; tr: string }): IngredientLibraryRow => ({
  fr: "", de: "", usage_count: 0, source: "learned", created_at: "t", ...o,
});

describe("mergeIngredients (F7-B1) — SEED ∪ DB", () => {
  it("yalnız kod-seed: source seed, usage_count 0, tags korunur", () => {
    const r = mergeIngredients([seed({ id: "c_tom", tr: "Domates", fr: "Tomate", tags: ["sauce"] })], []);
    expect(r).toEqual([
      { id: "c_tom", tr: "Domates", fr: "Tomate", de: "", tags: ["sauce"], source: "seed", usage_count: 0 },
    ]);
  });

  it("learned DB satırı (yeni id) eklenir: source learned, tags []", () => {
    const r = mergeIngredients([], [row({ id: "ing_1", tr: "Zeytin", fr: "Olive", usage_count: 2 })]);
    expect(r).toEqual([
      { id: "ing_1", tr: "Zeytin", fr: "Olive", de: "", tags: [], source: "learned", usage_count: 2 },
    ]);
  });

  it("seed override (aynı id): DB fr/de/usage EZER; TAGS kod-seed'den KORUNUR (ŞERH 1); source seed", () => {
    const s = seed({ id: "c_tom", tr: "Domates", fr: "", de: "", tags: ["sauce", "legume"] });
    const o = row({ id: "c_tom", tr: "Domates", fr: "Tomate", de: "Tomaten", usage_count: 5, source: "seed" });
    expect(mergeIngredients([s], [o])).toEqual([
      { id: "c_tom", tr: "Domates", fr: "Tomate", de: "Tomaten", tags: ["sauce", "legume"], source: "seed", usage_count: 5 },
    ]);
  });

  it("öncelik #4: override, kod-seed DEĞERİNİ ezer (sonraki kod güncellemesi de kazanamaz)", () => {
    const s = seed({ id: "c_x", tr: "X", fr: "FR-KOD" });
    const o = row({ id: "c_x", tr: "X", fr: "FR-DUZELTME", source: "seed" });
    expect(mergeIngredients([s], [o])[0].fr).toBe("FR-DUZELTME"); // atölye düzeltmesi kazanır
  });

  it("orphan seed-override (kod-seed yok) → tags:[] ile dahil edilir (veri kaybı yok)", () => {
    const o = row({ id: "c_removed", tr: "Eski", source: "seed", usage_count: 1 });
    expect(mergeIngredients([], [o])[0]).toMatchObject({ id: "c_removed", tags: [], source: "seed" });
  });

  it("sıra: usage_count azalan, sonra tr", () => {
    const r = mergeIngredients(
      [seed({ id: "a", tr: "Biber" }), seed({ id: "b", tr: "Ananas" })],
      [row({ id: "c", tr: "Cacık", usage_count: 9 })]
    );
    expect(r.map((c) => c.tr)).toEqual(["Cacık", "Ananas", "Biber"]); // Cacık(9) önce, kalan tr sırası
  });
});

describe("findChipByTr (F7-B1) — mükerrer koruması", () => {
  const list = mergeIngredients(
    [seed({ id: "c_sogan", tr: "Soğan", fr: "Oignon", tags: ["legume"] })],
    [row({ id: "ing_z", tr: "Zeytin" })]
  );
  it("SEED çiple eşleşir (foldTr: 'sogan' ≡ 'Soğan') → mevcut SEED döner (ŞERH 2)", () => {
    const hit = findChipByTr(list, "sogan");
    expect(hit?.id).toBe("c_sogan");
    expect(hit?.source).toBe("seed"); // learned satır AÇILMAZ — seed dedup
  });
  it("learned çiple eşleşir (trim + harf duyarsız)", () => {
    expect(findChipByTr(list, "  ZEYTİN ")?.id).toBe("ing_z");
  });
  it("eşleşme yok → undefined", () => {
    expect(findChipByTr(list, "Marul")).toBeUndefined();
  });
});

describe("resolvePatchTarget (F7-B1) — kopyala-yaz (#4)", () => {
  const seeds = [seed({ id: "c_tom", tr: "Domates" })];
  it("learned DB satırı → update", () => {
    expect(resolvePatchTarget(seeds, [row({ id: "ing_1", tr: "Zeytin" })], "ing_1")).toEqual({
      action: "update", id: "ing_1",
    });
  });
  it("seed-override DB satırı → update", () => {
    expect(
      resolvePatchTarget(seeds, [row({ id: "c_tom", tr: "Domates", source: "seed" })], "c_tom")
    ).toEqual({ action: "update", id: "c_tom" });
  });
  it("kod-seed (DB'de yok) → insert-override (base=seed)", () => {
    expect(resolvePatchTarget(seeds, [], "c_tom")).toEqual({ action: "insert-override", base: seeds[0] });
  });
  it("bilinmeyen id → not-found", () => {
    expect(resolvePatchTarget(seeds, [], "yok")).toEqual({ action: "not-found" });
  });
});

describe("chipKey", () => {
  it("TR katlaması + trim (aksansız küçük harf)", () => {
    expect(chipKey("  Soğan ")).toBe("sogan");
    expect(chipKey("İSKENDER")).toBe("iskender");
  });
});

describe("IngredientCreateSchema / IngredientPatchSchema (F7-B1)", () => {
  it("Create: tr zorunlu; fr/de opsiyonel", () => {
    expect(IngredientCreateSchema.parse({ tr: "Et" })).toEqual({ tr: "Et" });
    expect(IngredientCreateSchema.parse({ tr: "Et", fr: "Viande" })).toMatchObject({ fr: "Viande" });
    expect(() => IngredientCreateSchema.parse({ tr: "" })).toThrow();
    expect(() => IngredientCreateSchema.parse({})).toThrow();
  });
  it("Patch: fr/de'den EN AZ BİRİ dolu (ŞERH 3); boş patch → hata", () => {
    expect(IngredientPatchSchema.parse({ fr: "Tomate" })).toMatchObject({ fr: "Tomate" });
    expect(IngredientPatchSchema.parse({ de: "Zwiebel" })).toMatchObject({ de: "Zwiebel" });
    expect(() => IngredientPatchSchema.parse({})).toThrow();
    expect(() => IngredientPatchSchema.parse({ fr: "  " })).toThrow(); // yalnız boşluk
    expect(() => IngredientPatchSchema.parse({ fr: "", de: "" })).toThrow();
  });
});

describe("planUsageBump (F7-C, B1 #5 borcu) — SAF", () => {
  const seedIds = new Set(["ing_domates", "ing_sogan"]);

  it("mevcut DB → increment; kod-seed → insertSeed; bilinmeyen → skipped (ŞERH 4)", () => {
    const dbRows = [row({ id: "ing_learned", tr: "Zeytin", source: "learned" })];
    const plan = planUsageBump(seedIds, dbRows, ["ing_learned", "ing_domates", "ing_yok"]);
    expect(plan.increment).toEqual(["ing_learned"]);
    expect(plan.insertSeed).toEqual(["ing_domates"]);
    expect(plan.skipped).toEqual(["ing_yok"]); // sessiz değil
  });

  it("seed-override DB satırı (source=seed) → increment (DB'de var, insertSeed değil)", () => {
    const dbRows = [row({ id: "ing_domates", tr: "Domates", source: "seed" })];
    const plan = planUsageBump(seedIds, dbRows, ["ing_domates"]);
    expect(plan.increment).toEqual(["ing_domates"]);
    expect(plan.insertSeed).toEqual([]);
  });

  it("görüşme içinde tekilleştirilir (aynı id iki kez → bir bump)", () => {
    const plan = planUsageBump(seedIds, [], ["ing_sogan", "ing_sogan", "ing_domates"]);
    expect(plan.insertSeed).toEqual(["ing_sogan", "ing_domates"]);
    expect(plan.skipped).toEqual([]);
  });
});
