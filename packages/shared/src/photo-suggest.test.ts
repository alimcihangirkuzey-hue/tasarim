import { describe, expect, it } from "vitest";
import { parseTags, suggestPhotos, suggestPhotosForName } from "./photo-suggest.js";

const ASSETS = [
  { id: "a_adana", tags: "adana, brochette", kind: "photo" },
  { id: "a_doner", tags: "döner, sandwich döner", kind: "photo" },
  { id: "a_tacos", tags: "Tacos", kind: "photo" },
  { id: "a_logo", tags: "adana", kind: "logo" },
  { id: "a_bos", tags: "", kind: "photo" },
];

describe("foto önerisi motoru (FAZ4 §9)", () => {
  it("kabul 8: 'adana' etiketi 'Assiette Adana' ürününe önerilir; logo asla önerilmez", () => {
    const s = suggestPhotosForName("Assiette Adana", ASSETS);
    expect(s).toContain("a_adana");
    expect(s).not.toContain("a_logo");
    expect(s).not.toContain("a_bos");
  });

  it("TR/FR aksan katlama: 'döner' etiketi 'Doner Kebab'ı bulur; çok kelimeli etiket daha özgül", () => {
    expect(suggestPhotosForName("Doner Kebab", ASSETS)).toEqual(["a_doner"]);
    /* "sandwich döner" (uzun etiket) tam geçerse öne gelir */
    const s = suggestPhotosForName("Sandwich Döner XL", ASSETS);
    expect(s[0]).toBe("a_doner");
  });

  it("kelime sınırı: 'ada' gibi kısmi parça eşleşmez", () => {
    const assets = [{ id: "x", tags: "ada", kind: "photo" }];
    expect(suggestPhotosForName("Adana Dürüm", assets)).toEqual([]);
  });

  it("otomatik bağlama YOK: motor yalnız harita döner; fotolu ürün atlanır, girdi değişmez", () => {
    const items = [
      { id: "i1", name_fr: "Assiette Adana", photo: null },
      { id: "i2", name_fr: "Tacos Mixte", photo: "ast_mevcut" },
    ];
    const before = JSON.stringify(items);
    const map = suggestPhotos(items, ASSETS);
    expect(map.get("i1")).toContain("a_adana");
    expect(map.has("i2")).toBe(false); /* fotosu olana dokunulmaz */
    expect(JSON.stringify(items)).toBe(before); /* saf — yan etki yok */
  });

  it("parseTags: virgül + normalize + boşları at", () => {
    expect(parseTags(" Adana , BROCHETTE kebab,, é ")).toEqual(["adana", "brochette kebab", "e"]);
  });
});
