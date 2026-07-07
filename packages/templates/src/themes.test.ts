import { describe, expect, it } from "vitest";
import { defaultBrandKit } from "@tezgah/shared";
import { PRESET_THEMES, brandTheme, resolveTheme } from "./themes.js";

const VAR_KEYS = [
  "--c-bg", "--c-panel", "--c-heading", "--c-item", "--c-desc",
  "--c-price", "--c-accent", "--c-line",
  "--f-heading", "--f-item", "--f-body", "--f-script",
] as const;

describe("tema sistemi (FAZ1-GOREV §3)", () => {
  it("üç hazır tema kayıtlı ve rol seti eksiksiz", () => {
    expect(Object.keys(PRESET_THEMES).sort()).toEqual(
      ["aras-orange", "or-noir", "velours-rouge"]
    );
    for (const theme of Object.values(PRESET_THEMES)) {
      for (const k of VAR_KEYS) {
        expect(theme.vars[k], `${theme.id} ${k}`).toBeTruthy();
      }
    }
  });

  it("velours-rouge kurdele, diğerleri underline", () => {
    expect(PRESET_THEMES["velours-rouge"].categoryStyle).toBe("ribbon");
    expect(PRESET_THEMES["or-noir"].categoryStyle).toBe("underline");
    expect(PRESET_THEMES["aras-orange"].categoryStyle).toBe("underline");
  });

  it("brand teması marka kitinden beslenir (M5)", () => {
    const kit = defaultBrandKit();
    const t = brandTheme(kit);
    expect(t.vars["--c-heading"]).toBe(kit.colors.primary);
    expect(t.vars["--c-bg"]).toBe(kit.colors.background);
    expect(t.vars["--c-accent"]).toBe(kit.colors.accent);
    expect(t.vars["--f-heading"]).toContain(kit.fonts.heading);
  });

  it("resolveTheme: brand, hazır tema ve bilinmeyen kimlik", () => {
    const kit = defaultBrandKit();
    expect(resolveTheme("brand", kit).id).toBe("brand");
    expect(resolveTheme("or-noir", kit).id).toBe("or-noir");
    expect(resolveTheme("boyle-tema-yok", kit).id).toBe("brand");
  });
});
