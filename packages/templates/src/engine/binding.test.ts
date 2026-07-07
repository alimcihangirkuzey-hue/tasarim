import { describe, expect, it } from "vitest";
import { CatalogSchema, SelectionSchema, defaultBrandKit } from "@tezgah/shared";
import type { SlotDef } from "../types.js";
import {
  missingPhotoItems,
  resolvePath,
  resolveSelection,
  resolveSlotValue,
  selectionFlow,
} from "./binding.js";

/* Test verisi: 2 kategori, karışık görünürlük/sıra */
const catalog = CatalogSchema.parse({
  categories: [
    {
      id: "cat_pizzas",
      name_fr: "Pizzas",
      order: 2,
      items: [
        { id: "p1", name_fr: "Margherita", order: 1, prices: [{ label: "seul", value: 9 }] },
        { id: "p2", name_fr: "Regina", order: 2, visible: false },
      ],
    },
    {
      id: "cat_sandwichs",
      name_fr: "Sandwichs",
      note_fr: "Pain au choix",
      order: 1,
      items: [
        { id: "s2", name_fr: "Yufka", order: 2, photo: "ast_1" },
        { id: "s1", name_fr: "Döner Kebab", order: 1 },
        { id: "s3", name_fr: "Assiette", order: 3 },
      ],
    },
  ],
});
const brand = defaultBrandKit();

describe("resolvePath", () => {
  it("brand ve catalog köklerini çözer", () => {
    expect(resolvePath("brand.colors.primary", { brand, catalog })).toBe("#C8102E");
    expect(resolvePath("catalog.footnote_fr", { brand, catalog })).toContain("Prix nets");
  });

  it("item kökü yalnız item verilince çözülür", () => {
    const item = catalog.categories[0].items[0];
    expect(resolvePath("item.name_fr", { brand, catalog, item })).toBe("Margherita");
    expect(resolvePath("item.name_fr", { brand, catalog })).toBeNull();
  });

  it("eksik yol / bilinmeyen kök null döner, throw etmez", () => {
    expect(resolvePath("brand.contact.olmayan.alan", { brand, catalog })).toBeNull();
    expect(resolvePath("gecersizkok.x", { brand, catalog })).toBeNull();
  });
});

describe("resolveSelection (CONSTITUTION §4.5)", () => {
  it("boş category_order → tüm kategoriler order alanına göre", () => {
    const sel = SelectionSchema.parse({});
    const out = resolveSelection(catalog, sel);
    expect(out.map((s) => s.category.id)).toEqual(["cat_sandwichs", "cat_pizzas"]);
  });

  it("category_order sırayı belirler, bilinmeyen id atlanır", () => {
    const sel = SelectionSchema.parse({ category_order: ["cat_pizzas", "yok", "cat_sandwichs"] });
    const out = resolveSelection(catalog, sel);
    expect(out.map((s) => s.category.id)).toEqual(["cat_pizzas", "cat_sandwichs"]);
  });

  it("visible:false hiçbir belgeye akmaz; excluded_items belge bazında düşer", () => {
    const sel = SelectionSchema.parse({ excluded_items: ["s3"] });
    const out = resolveSelection(catalog, sel);
    const sandw = out.find((s) => s.category.id === "cat_sandwichs")!;
    expect(sandw.items.map((i) => i.id)).toEqual(["s1", "s2"]); // order'a göre + s3 hariç
    const pizzas = out.find((s) => s.category.id === "cat_pizzas")!;
    expect(pizzas.items.map((i) => i.id)).toEqual(["p1"]); // p2 visible:false
  });

  it("tüm ürünleri elenen kategori akıştan düşer", () => {
    const sel = SelectionSchema.parse({ excluded_items: ["p1"] });
    const out = resolveSelection(catalog, sel);
    expect(out.map((s) => s.category.id)).toEqual(["cat_sandwichs"]);
  });
});

describe("selectionFlow", () => {
  it("kategori ayracı + ürün dizisi üretir", () => {
    const flow = selectionFlow(resolveSelection(catalog, SelectionSchema.parse({})));
    expect(flow.map((e) => (e.kind === "category" ? `#${e.category.id}` : e.item.id)))
      .toEqual(["#cat_sandwichs", "s1", "s2", "s3", "#cat_pizzas", "p1"]);
  });
});

describe("resolveSlotValue (M5 override katmanı)", () => {
  const titleSlot: SlotDef = { id: "title", kind: "text", bind: null, default_fr: "NOTRE CARTE" };
  const phoneSlot: SlotDef = { id: "phone", kind: "text", bind: "brand.contact.phone" };

  it("bind boşsa default_fr kullanılır", () => {
    expect(resolveSlotValue(titleSlot, {}, { brand, catalog })).toEqual({
      value: "NOTRE CARTE",
      detached: false,
    });
  });

  it("bind dolu değer dönerse onu kullanır", () => {
    const b = { ...brand, contact: { ...brand.contact, phone: "01 23 45 67 89" } };
    expect(resolveSlotValue(phoneSlot, {}, { brand: b, catalog }).value).toBe("01 23 45 67 89");
  });

  it("bind boş string dönerse default'a düşer", () => {
    const slot: SlotDef = { ...phoneSlot, default_fr: "—" };
    expect(resolveSlotValue(slot, {}, { brand, catalog }).value).toBe("—");
  });

  it("override her şeyi ezer ve detached işaretlenir", () => {
    const out = resolveSlotValue(
      titleSlot,
      { title: { value: "NOS SANDWICHS", detached: true } },
      { brand, catalog }
    );
    expect(out).toEqual({ value: "NOS SANDWICHS", detached: true });
  });
});

describe("missingPhotoItems (§8.2)", () => {
  it("seçimdeki fotoğrafsız ürünleri kategori sırasıyla listeler", () => {
    const out = missingPhotoItems(resolveSelection(catalog, SelectionSchema.parse({})));
    expect(out.map((m) => m.item.id)).toEqual(["s1", "s3", "p1"]); // s2'nin fotosu var
  });
});
