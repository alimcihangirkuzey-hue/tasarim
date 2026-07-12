import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CatalogSchema } from "./schemas.js";
import {
  IntakeAnswersSchema,
  IntakeItemSchema,
  projectIntake,
  type IntakeAnswers,
} from "./projection.js";

/* Fixture'lar şemanın GİRDİ tipinde (opsiyoneller boş bırakılabilir); parse doldurur. */
function answers(items: z.input<typeof IntakeItemSchema>[]): IntakeAnswers {
  return IntakeAnswersSchema.parse({ items });
}

describe("projectIntake (F7-A / K1) — SAF deterministik projeksiyon", () => {
  it("varyant → prices[] (etiketli, sırayla); pending boş", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Pizzas",
          name: "Margherita",
          variants: [
            { label: "Ø24", value: 8 },
            { label: "Ø32", value: 12 },
          ],
        },
      ]),
      "SEED"
    );
    expect(r.categories[0].items[0].prices).toEqual([
      { label: "Ø24", value: 8 },
      { label: "Ø32", value: 12 },
    ]);
    expect(r.pending).toEqual([]);
  });

  it("çip → ingredients[] (inline denormalize) + desc_fr içerik listesi (virgüllü)", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Dönerler",
          name: "Döner",
          variants: [{ label: "seul", value: 9 }],
          chips: [
            { chip_id: "c_et", tr: "Et", fr: "Viande" },
            { tr: "Soğan", fr: "Oignon" },
          ],
        },
      ]),
      "SEED"
    );
    const item = r.categories[0].items[0];
    expect(item.ingredients).toHaveLength(2);
    expect(item.ingredients[0]).toMatchObject({ chip_id: "c_et", fr: "Viande" });
    /* desc_fr fr etiketlerinden, virgüllü içerik listesi */
    expect(item.desc_fr).toBe("Viande, Oignon");
  });

  it("ek-ikram (extras) → desc_fr'ye GÖRSEL ayraçla eklenir (D2); içerikten ayrılabilir", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Dönerler",
          name: "İskender",
          variants: [{ label: "seul", value: 15 }],
          chips: [
            { tr: "Et", fr: "Viande" },
            { tr: "Yoğurt", fr: "Yaourt" },
          ],
          extras: ["supplément beurre", "pain compris"],
        },
      ]),
      "SEED"
    );
    const desc = r.categories[0].items[0].desc_fr;
    /* içerik listesi virgüllü; ek-ikram " · " ile GÖRSEL ayrı */
    expect(desc).toBe("Viande, Yaourt · supplément beurre · pain compris");
    /* ayrım doğrulaması: içerik kısmı ilk " · " öncesi, ek-ikram sonrası */
    const [content, ...extras] = desc.split(" · ");
    expect(content).toBe("Viande, Yaourt"); // içerik: virgüllü tek blok
    expect(extras).toEqual(["supplément beurre", "pain compris"]); // ek-ikram: ayrı bloklar
  });

  it("yalnız ek-ikram (çip yok) → desc_fr sadece ek-ikram bloklarından", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "Y", variants: [{ label: "seul", value: 5 }], extras: ["à emporter"] },
      ]),
      "SEED"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("à emporter");
  });

  it("menü dili 'de' → desc_fr de etiketlerinden kurulur (fr yerine)", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "Y", variants: [{ label: "seul", value: 5 }], chips: [{ tr: "Et", fr: "Viande", de: "Fleisch" }] },
      ]),
      "SEED",
      "de"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Fleisch");
  });

  it("menü dili 'tr' (CILA4/EK-1) → desc_fr tr etiketlerinden kurulur; boşluk YOK", () => {
    const r = projectIntake(
      answers([
        { category_name: "Pizzalar", name: "Margherita", variants: [{ label: "Ø32", value: 12 }], chips: [{ tr: "Domates sosu", fr: "Sauce tomate", de: "Tomatensauce" }] },
      ]),
      "SEED",
      "tr"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Domates sosu"); // tr basıldı (fr/de değil)
    expect(r.translationGaps).toEqual([]); // tr dolu → boşluk yok
  });

  it("menü dili 'tr', tr boş → fr'ye düşer (tr→fr→de sırası) + boşluk işareti", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "Y", variants: [{ label: "seul", value: 5 }], chips: [{ tr: "", fr: "Fromage", de: "Käse" }] },
      ]),
      "SEED",
      "tr"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Fromage"); // de ("Käse") değil, fr fallback (tr'den sonra)
    expect(r.translationGaps).toEqual([
      { category: "X", item: "Y", label: "Fromage", missingLang: "tr", usedLang: "fr" },
    ]);
  });

  it("fiyatsız (value null / varyantsız) → prices:[] + pending KALEM listesi (K3/M8)", () => {
    const r = projectIntake(
      answers([
        { category_name: "Boissons", name: "Ayran", variants: [{ label: "seul", value: null }] },
        { category_name: "Boissons", name: "Çay" }, // hiç varyant yok → yine pending
      ]),
      "SEED"
    );
    expect(r.categories[0].items[0].prices).toEqual([]);
    expect(r.categories[0].items[1].prices).toEqual([]);
    expect(r.pending).toEqual([
      { name: "Ayran", category: "Boissons" },
      { name: "Çay", category: "Boissons" },
    ]);
  });

  it("kısmi fiyat: null varyant düşer, dolu varyant kalır; pending'e girmez", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Pizzas",
          name: "Mixte",
          variants: [
            { label: "Ø24", value: 8 },
            { label: "Ø32", value: null }, // bu varyant fiyatsız → düşer
          ],
        },
      ]),
      "SEED"
    );
    expect(r.categories[0].items[0].prices).toEqual([{ label: "Ø24", value: 8 }]);
    expect(r.pending).toEqual([]); // en az bir fiyat var → bekleyen değil
  });

  it("aynı kategori adı gruplanır (sıra korunur); deterministik id (aynı seed → aynı çıktı)", () => {
    const input = answers([
      { category_name: "Pizzas", name: "A", variants: [{ label: "seul", value: 8 }] },
      { category_name: "Boissons", name: "Cola", variants: [{ label: "seul", value: 3 }] },
      { category_name: "Pizzas", name: "B", variants: [{ label: "seul", value: 9 }] },
    ]);
    const a = projectIntake(input, "SEED");
    const b = projectIntake(input, "SEED");
    expect(a.categories.map((c) => c.name_fr)).toEqual(["Pizzas", "Boissons"]);
    expect(a.categories[0].items.map((i) => i.name_fr)).toEqual(["A", "B"]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // aynı seed → aynı çıktı
    expect(a.categories[0].items[0].id).toBe("ord_SEED_c1_i1");
  });

  it("çıktı CatalogSchema'dan geçer (DB'ye yazılabilir)", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Grill",
          name: "Adana",
          variants: [{ label: "seul", value: 14 }],
          chips: [{ tr: "Kıyma", fr: "Viande hachée" }],
        },
      ]),
      "SEED"
    );
    expect(() => CatalogSchema.parse({ categories: r.categories })).not.toThrow();
  });
});

describe("projectIntake çeviri fallback + boşluk işareti (MERGE-F7-A önkoşulu)", () => {
  it("fr istenir, fr boş → tr'ye düşer + translationGaps işareti (sessiz değil)", () => {
    const r = projectIntake(
      answers([
        { category_name: "Grill", name: "Adana", variants: [{ label: "seul", value: 10 }], chips: [{ tr: "Kıyma" }] },
      ]),
      "SEED",
      "fr"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Kıyma"); // tr fallback basıldı
    expect(r.translationGaps).toEqual([
      { category: "Grill", item: "Adana", label: "Kıyma", missingLang: "fr", usedLang: "tr" },
    ]);
  });

  it("de istenir, de boş → fr'ye düşer (tr'den ÖNCE — de→fr→tr sırası)", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "Y", variants: [{ label: "seul", value: 5 }], chips: [{ tr: "Et", fr: "Viande" }] },
      ]),
      "SEED",
      "de"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Viande"); // tr ("Et") değil, fr fallback
    expect(r.translationGaps).toEqual([
      { category: "X", item: "Y", label: "Viande", missingLang: "de", usedLang: "fr" },
    ]);
  });

  it("de istenir, yalnız tr dolu → tr'ye düşer (zincir sonu)", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "Y", variants: [{ label: "seul", value: 5 }], chips: [{ tr: "Soğan" }] },
      ]),
      "SEED",
      "de"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Soğan");
    expect(r.translationGaps[0]).toMatchObject({ missingLang: "de", usedLang: "tr" });
  });

  it("istenen dil dolu → fallback yok, translationGaps boş", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "X",
          name: "Y",
          variants: [{ label: "seul", value: 5 }],
          chips: [{ tr: "Et", fr: "Viande", de: "Fleisch" }],
        },
      ]),
      "SEED",
      "de"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Fleisch");
    expect(r.translationGaps).toEqual([]);
  });

  it("karışık: bir çip tam bir çip fallback → yalnız eksik olan işaretlenir", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Pizzas",
          name: "Mixte",
          variants: [{ label: "seul", value: 9 }],
          chips: [{ fr: "Tomate" }, { tr: "Zeytin" }], // fr menü: 1. çip tam, 2. çip fr boş→tr
        },
      ]),
      "SEED",
      "fr"
    );
    expect(r.categories[0].items[0].desc_fr).toBe("Tomate, Zeytin");
    expect(r.translationGaps).toEqual([
      { category: "Pizzas", item: "Mixte", label: "Zeytin", missingLang: "fr", usedLang: "tr" },
    ]);
  });
});

describe("projectIntake kategori notu (F7-C / E)", () => {
  it("item.category_note → Category.note_fr; notsuz kategoride note_fr yok", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "Tabaklar",
          name: "Kebap Tabağı",
          variants: [{ label: "seul", value: 12 }],
          category_note: "Servies avec frites et salade",
        },
        { category_name: "İçecekler", name: "Ayran", variants: [{ label: "seul", value: 2 }] },
      ]),
      "SEED"
    );
    expect(r.categories[0].note_fr).toBe("Servies avec frites et salade");
    expect(r.categories[1].note_fr).toBeUndefined();
  });

  it("kategorideki İLK dolu category_note kullanılır (boş olan atlanır)", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "A", variants: [{ label: "seul", value: 1 }] }, // notsuz
        { category_name: "X", name: "B", variants: [{ label: "seul", value: 2 }], category_note: "Note B" },
      ]),
      "SEED"
    );
    expect(r.categories[0].note_fr).toBe("Note B");
  });
});

describe("projectIntake hide_content (F7-C / B4)", () => {
  it("hide_content: çipler BASILMAZ (ingredients:[], desc yalnız ek-ikram); gap yok", () => {
    const r = projectIntake(
      answers([
        {
          category_name: "X",
          name: "Y",
          variants: [{ label: "seul", value: 5 }],
          chips: [{ tr: "Et", fr: "Viande" }],
          extras: ["à emporter"],
          hide_content: true,
        },
      ]),
      "SEED"
    );
    const item = r.categories[0].items[0];
    expect(item.ingredients).toEqual([]); // çip basılmaz
    expect(item.desc_fr).toBe("à emporter"); // yalnız ek-ikram
    expect(r.translationGaps).toEqual([]); // gösterilmeyen çip → gap yok
  });

  it("hide_content=false (varsayılan): çipler normal basılır", () => {
    const r = projectIntake(
      answers([
        { category_name: "X", name: "Y", variants: [{ label: "seul", value: 5 }], chips: [{ tr: "Et", fr: "Viande" }] },
      ]),
      "SEED"
    );
    expect(r.categories[0].items[0].ingredients).toHaveLength(1);
    expect(r.categories[0].items[0].desc_fr).toBe("Viande");
  });
});
