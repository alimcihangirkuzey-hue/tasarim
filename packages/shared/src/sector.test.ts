import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  ClientCreateSchema,
  IngredientRefSchema,
  ItemSchema,
  MenuLanguageSchema,
} from "./schemas.js";
import { IngredientChipSchema, QuestionSchema, SectorPackSchema } from "./sector.js";

describe("Item.ingredients + IngredientRef (F7-A / karar D1)", () => {
  it("geriye uyumluluk: ingredients'sız katalog parse olur; ingredients:[] eklenir; mevcut alanlar aynen", () => {
    const cat = CatalogSchema.parse({
      categories: [
        {
          id: "c1",
          name_fr: "Pizzas",
          order: 1,
          items: [
            {
              id: "i1",
              name_fr: "Margherita",
              desc_fr: "Tomate, mozza",
              prices: [{ label: "seul", value: 9 }],
              order: 1,
            },
          ],
        },
      ],
    });
    const it0 = cat.categories[0].items[0];
    expect(it0.ingredients).toEqual([]); // yeni alan default([]) ile eklendi
    /* mevcut alanlar hiç değişmez (arşiv sabitliği) */
    expect(it0.name_fr).toBe("Margherita");
    expect(it0.desc_fr).toBe("Tomate, mozza");
    expect(it0.prices).toEqual([{ label: "seul", value: 9 }]);
  });

  it("INLINE DENORMALIZE: chip_id + üç dil gömülü aynen parse olur (baskı kendine yeter)", () => {
    const ref = IngredientRefSchema.parse({
      chip_id: "chip_domates",
      tr: "Domates",
      fr: "Tomate",
      de: "Tomaten",
    });
    expect(ref).toEqual({ chip_id: "chip_domates", tr: "Domates", fr: "Tomate", de: "Tomaten" });
  });

  it("tek dil (yalnız tr) yeterli; eksik diller '' varsayılır; chip_id opsiyonel", () => {
    const ref = IngredientRefSchema.parse({ tr: "Soğan" });
    expect(ref).toEqual({ tr: "Soğan", fr: "", de: "" });
    expect("chip_id" in ref).toBe(false);
  });

  it("D1 sertleştirme: üç dil de boş/beyaz-boşluk REDDEDİLİR", () => {
    expect(() => IngredientRefSchema.parse({ chip_id: "x" })).toThrow(); // yalnız chip_id
    expect(() => IngredientRefSchema.parse({ tr: "", fr: "", de: "" })).toThrow();
    expect(() => IngredientRefSchema.parse({ tr: "   " })).toThrow(); // sadece boşluk sayılmaz
  });

  it("Item ingredients dolu bir çip listesiyle parse olur", () => {
    const item = ItemSchema.parse({
      id: "i2",
      name_fr: "Döner",
      ingredients: [{ tr: "Et" }, { chip_id: "c_sogan", fr: "Oignon" }],
    });
    expect(item.ingredients).toHaveLength(2);
    expect(item.ingredients[0]).toEqual({ tr: "Et", fr: "", de: "" });
    expect(item.ingredients[1]).toMatchObject({ chip_id: "c_sogan", fr: "Oignon" });
  });

  it("Item içinde geçersiz çip (üç dil boş) tüm parse'ı reddeder", () => {
    expect(() =>
      ItemSchema.parse({ id: "i3", name_fr: "X", ingredients: [{ chip_id: "y" }] })
    ).toThrow();
  });
});

describe("MenuLanguageSchema (F7-A / K2)", () => {
  it("fr|de kabul; varsayılan fr; geçersiz reddedilir", () => {
    expect(MenuLanguageSchema.parse("fr")).toBe("fr");
    expect(MenuLanguageSchema.parse("de")).toBe("de");
    expect(MenuLanguageSchema.parse(undefined)).toBe("fr"); // default
    expect(() => MenuLanguageSchema.parse("en")).toThrow();
  });
});

describe("Sektör paketi iskeleti (F7-A / K1) — örnek yapı YALNIZ testte (tohum içeriği F7-B)", () => {
  /* Bu fixture yalnız ŞEMAyı doğrular — sector.ts hiçbir gerçek paket taşımaz. */
  const examplePack = {
    id: "ornek",
    label_tr: "Örnek Sektör",
    categories: [
      {
        name: { tr: "Dönerler", fr: "Kebabs", de: "" },
        items: [
          {
            name: { tr: "Döner", fr: "Kebab" },
            default_chips: ["c_et", "c_sogan"],
            questions: ["q_porsiyon"],
          },
        ],
      },
    ],
    questions: [
      {
        id: "q_porsiyon",
        label_tr: "Porsiyon",
        kind: "portion",
        affects: "variant",
        options: [
          { value: "yarim", label_tr: "Yarım" },
          { value: "tam", label_tr: "Tam" },
        ],
      },
      { id: "q_kaymak", label_tr: "Ek kaymak?", kind: "boolean", affects: "note" },
    ],
    chips: [
      { id: "c_et", tr: "Et", fr: "Viande", de: "Fleisch", tags: ["viande"] },
      { id: "c_sogan", tr: "Soğan" },
    ],
  };

  it("örnek paket SectorPackSchema'dan geçer; iç yapı korunur", () => {
    const pack = SectorPackSchema.parse(examplePack);
    expect(pack.categories[0].items[0].default_chips).toEqual(["c_et", "c_sogan"]);
    expect(pack.questions[0].kind).toBe("portion");
    expect(pack.questions[0].affects).toBe("variant");
    /* çip eksik diller/tags default'la tamamlanır */
    expect(pack.chips[1]).toEqual({ id: "c_sogan", tr: "Soğan", fr: "", de: "", tags: [] });
  });

  it("Question.affects yalnız variant|note; kind yalnız boolean|choice|portion", () => {
    expect(() =>
      QuestionSchema.parse({ id: "q", label_tr: "?", kind: "boolean", affects: "katalog" })
    ).toThrow();
    expect(() =>
      QuestionSchema.parse({ id: "q", label_tr: "?", kind: "textbox", affects: "note" })
    ).toThrow();
  });

  it("IngredientChip tr zorunlu (TR tıkla tabanı); fr/de basılınca dolar", () => {
    expect(() => IngredientChipSchema.parse({ id: "c", fr: "Sauce" })).toThrow(); // tr eksik
    const chip = IngredientChipSchema.parse({ id: "c", tr: "Sos" });
    expect(chip).toEqual({ id: "c", tr: "Sos", fr: "", de: "", tags: [] });
  });

  it("LocalizedName tr zorunlu; fr/de '' varsayılır (çok-dilli render TODO)", () => {
    const pack = SectorPackSchema.parse({
      ...examplePack,
      categories: [{ name: { tr: "Sadece TR" }, items: [] }],
    });
    expect(pack.categories[0].name).toEqual({ tr: "Sadece TR", fr: "", de: "" });
  });
});

describe("ClientCreateSchema currency + menu_language (F7-A / Adım 6)", () => {
  it("opsiyonel: verilmezse undefined (route EUR/fr uygular)", () => {
    const c = ClientCreateSchema.parse({ name: "Yeni" });
    expect(c.currency).toBeUndefined();
    expect(c.menu_language).toBeUndefined();
  });

  it("verilirse taşınır (CHF/de) — oluşturmada ikinci-PUT zorunluluğu kalkar", () => {
    const c = ClientCreateSchema.parse({ name: "Arriva", currency: "CHF", menu_language: "de" });
    expect(c.currency).toBe("CHF");
    expect(c.menu_language).toBe("de");
  });

  it("geçersiz currency/menu_language reddedilir", () => {
    expect(() => ClientCreateSchema.parse({ name: "X", currency: "USD" })).toThrow();
    expect(() => ClientCreateSchema.parse({ name: "X", menu_language: "en" })).toThrow();
  });
});
