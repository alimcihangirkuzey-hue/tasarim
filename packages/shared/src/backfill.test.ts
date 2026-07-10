import { describe, expect, it } from "vitest";
import { suggestChipsFromDesc } from "./backfill.js";

describe("suggestChipsFromDesc (F7-A / Adım 5) — SAF araç, katalog mutasyonu YOK", () => {
  it("Arriva-tarzı virgüllü açıklama → çip adayları (böl + kırp)", () => {
    expect(suggestChipsFromDesc("Sauce tomate, mozzarella, salami")).toEqual([
      "Sauce tomate",
      "mozzarella",
      "salami",
    ]);
  });

  it("noktalı virgül de ayırıcı; fazla boşluk kırpılır", () => {
    expect(suggestChipsFromDesc("  Jambon ;  fromage , champignons  ")).toEqual([
      "Jambon",
      "fromage",
      "champignons",
    ]);
  });

  it("boş/yalnız-ayırıcı → boş liste; tekrarlar tekilleşir (harf duyarsız, ilk casing kalır)", () => {
    expect(suggestChipsFromDesc("")).toEqual([]);
    expect(suggestChipsFromDesc(" , ; ")).toEqual([]);
    expect(suggestChipsFromDesc("Tomate, tomate, TOMATE")).toEqual(["Tomate"]);
  });

  it("tek malzeme (ayırıcı yok) → tek aday", () => {
    expect(suggestChipsFromDesc("Merguez maison")).toEqual(["Merguez maison"]);
  });
});
