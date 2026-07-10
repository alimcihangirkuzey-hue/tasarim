import { describe, expect, it } from "vitest";
import {
  DocumentStateSchema,
  cmToPx300,
  defaultBrandKit,
  defaultCatalog,
  type ClientDTO,
} from "@tezgah/shared";
import { analyzeGarment, garment } from "./index.js";

function makeClient(withMono = true): ClientDTO {
  const kit = defaultBrandKit();
  kit.logo_primary = "ast_p";
  if (withMono) kit.logo_mono = "ast_m";
  kit.contact.phone = "04 78 12 34 56";
  kit.contact.address = "12 rue de la République, Lyon";
  const asset = (id: string) => ({
    id, client_id: "cli_g", kind: "logo" as const, filename: `${id}.svg`,
    width_px: 4000, height_px: 4000, tags: "", created_at: "t",
    urls: { orig: "/o", master: `/m/${id}`, thumb: "/t" },
  });
  return {
    id: "cli_g", name: "Garment Test", slug: "garment-test", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: kit, catalog: defaultCatalog(),
    assets: withMono ? [asset("ast_p"), asset("ast_m")] : [asset("ast_p")],
    created_at: "t", updated_at: "t",
  };
}

const doc = (params: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "garment", params, overrides });

describe("analyzeGarment (FAZ3-GOREV §6)", () => {
  it("tshirt alan preset'leri; mavi kumaşta mono otomatik + primary'de öneri uyarısı", () => {
    const a = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", fabric_color: "blue", areas: ["chest_left", "back_full"] })
    );
    expect(a.fabricDark).toBe(true);
    expect(a.areas.map((x) => x.id)).toEqual(["chest_left", "back_full"]);
    /* mono asset var → otomatik mono seçilir, öneri uyarısı ÇIKMAZ */
    expect(a.areas[0].logoVariant).toBe("mono");
    expect(a.warnings.some((w) => w.type === "mono-suggest")).toBe(false);

    /* primary'ye zorlanırsa öneri uyarısı çıkar */
    const forced = analyzeGarment(
      makeClient(),
      doc(
        { garment_kind: "tshirt", fabric_color: "blue", areas: ["chest_left"] },
        { "area:chest_left:logo": { value: "primary", detached: true } }
      )
    );
    expect(forced.warnings.some((w) => w.type === "mono-suggest")).toBe(true);
  });

  it("kit-bağlı metinler: line1 default telefon; adres kaynağı seçilebilir (M1)", () => {
    const a = analyzeGarment(
      makeClient(),
      doc(
        { garment_kind: "tshirt", areas: ["back_full"] },
        { "area:back_full:line2": { value: { source: "address" }, detached: true } }
      )
    );
    expect(a.areas[0].lines[0].text).toBe("04 78 12 34 56");
    expect(a.areas[0].lines[1].text).toContain("Lyon");
  });

  it("broderie + <15cm alan → ince-detay uyarısı; büyük alanda çıkmaz", () => {
    const small = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", technique: "broderie", areas: ["sleeve"] })
    );
    expect(small.warnings.some((w) => w.type === "fine-detail")).toBe(true);

    const big = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "apron_bavette", technique: "broderie", areas: ["chest"] })
    );
    expect(big.warnings.some((w) => w.type === "fine-detail")).toBe(false);
  });

  it("iki kademe (FAZ4 §3, mimar #8): her broderie belgesinde bilgi notu; impression'da yok", () => {
    /* büyük alan: güçlü uyarı YOK ama bilgi notu VAR */
    const big = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "apron_bavette", technique: "broderie", areas: ["chest"] })
    );
    expect(big.warnings.filter((w) => w.type === "broderie-info")).toHaveLength(1);
    expect(big.warnings.some((w) => w.type === "fine-detail")).toBe(false);

    /* küçük alan: ikisi birden */
    const small = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", technique: "broderie", areas: ["sleeve"] })
    );
    expect(small.warnings.some((w) => w.type === "broderie-info")).toBe(true);
    expect(small.warnings.some((w) => w.type === "fine-detail")).toBe(true);

    /* impression: not yok */
    const imp = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", technique: "impression", areas: ["chest_left"] })
    );
    expect(imp.warnings.some((w) => w.type === "broderie-info")).toBe(false);
  });

  it("kind'e uymayan alanlar elenir; boş kalırsa ilk geçerli alan", () => {
    const a = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "apron_taille", areas: ["back_full"] })
    );
    expect(a.areas.map((x) => x.id)).toEqual(["front"]);
  });

  it("cmToPx300: 30cm → 3543 px (kabul §8/5 hedefi)", () => {
    expect(cmToPx300(30)).toBe(3543);
    expect(cmToPx300(40)).toBe(4724);
  });

  it("entry: alan başına sayfa boyutu (pageSizeMMAt) + şeffaf zemin sözleşmesi", () => {
    const c = makeClient();
    const d = doc({ garment_kind: "tshirt", areas: ["chest_left", "back_full"] });
    expect(garment.pageCount!(c, d)).toBe(2);
    /* 300 dpi PNG hedefleri bu mm'lerden türer: 10×10 cm ve 30×40 cm */
    expect(garment.pageSizeMMAt!(c, d, 0)).toEqual({ w_mm: 100, h_mm: 100, bleed_mm: 0 });
    expect(garment.pageSizeMMAt!(c, d, 1)).toEqual({ w_mm: 300, h_mm: 400, bleed_mm: 0 });
    expect(garment.transparentBg).toBe(true);
  });
});
