import { describe, expect, it } from "vitest";
import { renderDigitalMenu } from "./digital-menu.js";
import { defaultBrandKit, defaultCatalog, type ClientDTO, type Category } from "./schemas.js";

function makeClient(categories: Category[], currency: ClientDTO["currency"] = "EUR"): ClientDTO {
  return {
    id: "cli_t",
    name: "Aras Restaurant",
    slug: "aras-restaurant",
    notes: "",
    currency,
    brandkit: defaultBrandKit(),
    catalog: { ...defaultCatalog(), categories },
    assets: [],
    created_at: "t",
    updated_at: "t",
  };
}

/** N ürünlük tek kategori (görünür) */
function bigCategory(n: number): Category {
  return {
    id: "c1",
    name_fr: "Sandwichs",
    order: 1,
    items: Array.from({ length: n }, (_, i) => ({
      id: `i${i}`,
      name_fr: `Ürün ${i} ğşİöç`,
      desc_fr: "Crudités, sauce",
      photo: null,
      prices: [{ label: "seul", value: 7.5 }],
      ingredients: [],
      tags: [],
      visible: true,
      order: i,
    })),
  };
}

describe("dijital menü üretici (FAZ5 §9)", () => {
  it("75 ürün → geçerli tek dosya HTML (doctype, tüm adlar, kapanış)", () => {
    const html = renderDigitalMenu(makeClient([bigCategory(75)]));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
    expect(html).toContain("<title>Aras Restaurant — Menu</title>");
    // 75 ürün adının hepsi gömülü
    for (const i of [0, 37, 74]) expect(html).toContain(`Ürün ${i}`);
  });

  it("HARİCİ İSTEK YOK — http/https/img/link/@import/url(http yok", () => {
    const html = renderDigitalMenu(makeClient([bigCategory(75)]));
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/i);
    // sistem font yığını kullanılır (harici font indirilmez)
    expect(html).toContain("-apple-system");
  });

  it("fiyat formatPrice ile — EUR '7,50 €', etiketli menü, CHF sade", () => {
    const eur = renderDigitalMenu(makeClient([bigCategory(1)]));
    expect(eur).toContain("7,50 €");

    const labeled: Category = {
      id: "c2", name_fr: "Menus", order: 1,
      items: [{ id: "m1", name_fr: "Menu Midi", desc_fr: "", photo: null,
        prices: [{ label: "seul", value: 8 }, { label: "menu", value: 10.5 }],
        ingredients: [], tags: [], visible: true, order: 1 }],
    };
    const eurLabeled = renderDigitalMenu(makeClient([labeled]));
    expect(eurLabeled).toContain("8,00 €");
    expect(eurLabeled).toContain("menu 10,50 €"); // "seul" gizlenir, "menu" gösterilir

    const chf = renderDigitalMenu(makeClient([bigCategory(1)], "CHF"));
    expect(chf).toContain("7.50"); // CHF: nokta ondalık, sembolsüz
    expect(chf).not.toContain("7,50 €");
  });

  it("kategori çapa navigasyonu üretir", () => {
    const two: Category[] = [
      { ...bigCategory(2), id: "a", name_fr: "Entrées", order: 1 },
      { ...bigCategory(2), id: "b", name_fr: "Plats", order: 2 },
    ];
    const html = renderDigitalMenu(makeClient(two));
    expect(html).toContain('href="#cat-0"');
    expect(html).toContain('href="#cat-1"');
    expect(html).toContain('id="cat-0"');
    expect(html).toContain('id="cat-1"');
  });

  it("HTML kaçışı — < & \" kullanıcı içeriğinde güvenli", () => {
    const evil: Category = {
      id: "c3", name_fr: 'Bur<ger> & "Co"', order: 1,
      items: [{ id: "x", name_fr: '<script>alert(1)</script>', desc_fr: "A & B", photo: null,
        prices: [{ label: "seul", value: 5 }], ingredients: [], tags: [], visible: true, order: 1 }],
    };
    const html = renderDigitalMenu(makeClient([evil]));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Bur&lt;ger&gt; &amp; &quot;Co&quot;");
  });

  it("yalnız görünür ürün + sıra + boş kategori elenir", () => {
    const cat: Category = {
      id: "c4", name_fr: "Karışık", order: 1,
      items: [
        { id: "v", name_fr: "Görünür", desc_fr: "", photo: null, prices: [{ label: "seul", value: 3 }], ingredients: [], tags: [], visible: true, order: 2 },
        { id: "h", name_fr: "Gizli", desc_fr: "", photo: null, prices: [{ label: "seul", value: 4 }], ingredients: [], tags: [], visible: false, order: 1 },
      ],
    };
    const emptyCat: Category = { id: "c5", name_fr: "Boş", order: 2, items: [] };
    const html = renderDigitalMenu(makeClient([cat, emptyCat]));
    expect(html).toContain("Görünür");
    expect(html).not.toContain("Gizli");
    expect(html).not.toContain("Boş"); // ürünsüz kategori bölümü/nav'a girmez
  });
});
