import { describe, expect, it } from "vitest";
import { INGREDIENT_SEED } from "./ingredients.js";
import { SEED_CHIPS, chipId } from "./seed-chips.js";
import { COMMON_QUESTIONS, SECTOR_PACKS } from "./sector-registry.js";
import { IngredientChipSchema, SectorPackSchema } from "./sector.js";

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

describe("SECTOR_PACKS tohum paketleri (F7-B2)", () => {
  it("5 paket; id pack_ deseni; her paket SectorPackSchema'dan geçer (kabul #1)", () => {
    expect(SECTOR_PACKS.length).toBe(5);
    expect(SECTOR_PACKS.map((p) => p.id)).toEqual([
      "pack_kebap_doner", "pack_pizza_fastfood", "pack_lokanta", "pack_cafe", "pack_pastane",
    ]);
    for (const p of SECTOR_PACKS) expect(() => SectorPackSchema.parse(p)).not.toThrow();
  });

  it("REFERANS BÜTÜNLÜĞÜ: her default_chips id'si INGREDIENT_SEED'de mevcut (kabul #2)", () => {
    const seedIds = new Set(INGREDIENT_SEED.map((c) => c.id));
    for (const p of SECTOR_PACKS)
      for (const c of p.categories)
        for (const it of c.items)
          for (const chip of it.default_chips)
            expect(seedIds, `${p.id} / ${it.name.tr} → ${chip}`).toContain(chip);
  });

  it("REFERANS BÜTÜNLÜĞÜ: her item.questions id'si paket sorularında mevcut (kabul #2)", () => {
    for (const p of SECTOR_PACKS) {
      const packQ = new Set(p.questions.map((qq) => qq.id));
      for (const c of p.categories)
        for (const it of c.items)
          for (const qid of it.questions)
            expect(packQ, `${p.id} / ${it.name.tr} → ${qid}`).toContain(qid);
    }
  });

  it("her item name.tr + fr DOLU (tr zorunlu; fr terminoloji)", () => {
    for (const p of SECTOR_PACKS)
      for (const c of p.categories)
        for (const it of c.items) {
          expect(it.name.tr.trim(), p.id).not.toBe("");
          expect(it.name.fr.trim(), `${p.id} / ${it.name.tr}`).not.toBe("");
        }
  });

  it("paket soruları yalnız COMMON ∪ paket-özel; tekrar yok; affects variant|note", () => {
    const known = new Set([
      ...COMMON_QUESTIONS.map((qq) => qq.id),
      "q_boy_kahve", "q_boy_cay", "q_adet_top", "q_birim_kisi",
    ]);
    for (const p of SECTOR_PACKS) {
      const seen = new Set<string>();
      for (const qq of p.questions) {
        expect(known, qq.id).toContain(qq.id);
        expect(seen.has(qq.id), `tekrar ${qq.id}`).toBe(false);
        seen.add(qq.id);
        expect(["variant", "note"]).toContain(qq.affects);
      }
    }
  });

  it("kategori notları taşındı (F7-C/E): Tabaklar + Günün Yemekleri (gerçek terminoloji)", () => {
    const kebap = SECTOR_PACKS.find((p) => p.id === "pack_kebap_doner")!;
    const tabaklar = kebap.categories.find((c) => c.name.tr === "Tabaklar")!;
    expect(tabaklar.note?.fr).toBe("Servies avec frites et salade");
    const lokanta = SECTOR_PACKS.find((p) => p.id === "pack_lokanta")!;
    const gunun = lokanta.categories.find((c) => c.name.tr === "Günün Yemekleri")!;
    expect(gunun.note?.fr).toBe("Change chaque jour");
    /* not olmayan kategoride note undefined */
    const sandvic = kebap.categories.find((c) => c.name.tr === "Sandviçler")!;
    expect(sandvic.note).toBeUndefined();
  });

  it("COMMON_QUESTIONS 12 (q_icerik ÇIKARILDI #3); paket-özel sorular montajlandı", () => {
    expect(COMMON_QUESTIONS.length).toBe(12);
    expect(COMMON_QUESTIONS.some((qq) => qq.id === "q_icerik")).toBe(false);
    const cafe = SECTOR_PACKS.find((p) => p.id === "pack_cafe")!;
    const cafeQ = new Set(cafe.questions.map((qq) => qq.id));
    for (const id of ["q_boy_kahve", "q_boy_cay", "q_adet_top", "q_birim_kisi"])
      expect(cafeQ, id).toContain(id);
  });
});

describe("Seed DE alanları CH-Almancası — ß KULLANILMAZ (İsviçre kuralı, M9/DE-CH)", () => {
  it("hiçbir seed DE string'i 'ß' içermez (çip + item + kategori)", () => {
    const bad: string[] = [];
    for (const c of SEED_CHIPS) if (c.de.includes("ß")) bad.push(`çip ${c.id}: "${c.de}"`);
    for (const p of SECTOR_PACKS)
      for (const cat of p.categories) {
        if (cat.name.de.includes("ß")) bad.push(`${p.id} kategori: "${cat.name.de}"`);
        if (cat.note?.de?.includes("ß")) bad.push(`${p.id} kategori notu: "${cat.note.de}"`);
        for (const it of cat.items)
          if (it.name.de.includes("ß")) bad.push(`${p.id}/${it.name.tr}: "${it.name.de}"`);
      }
    expect(bad, `ß içeren DE alanları: ${bad.join(" · ")}`).toEqual([]);
  });
});
