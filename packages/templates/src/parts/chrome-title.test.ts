/* TUR-FIX-2 — chrome başlığı dil-duyarlı (TR menüde "NOTRE CARTE" bug'ı) */

import { describe, expect, it } from "vitest";
import { TITLE_BY_LANG, resolveChromeTitle } from "./chrome-title.js";

describe("resolveChromeTitle (TUR-FIX-2)", () => {
  it("override yok → dil varsayılanı: tr=MENÜ, fr=NOTRE CARTE, de=SPEISEKARTE", () => {
    const def = { str: "NOTRE CARTE", detached: false }; // resolveSlotValue default_fr çıktısı
    expect(resolveChromeTitle(def, "tr")).toBe("MENÜ");
    expect(resolveChromeTitle(def, "fr")).toBe("NOTRE CARTE");
    expect(resolveChromeTitle(def, "de")).toBe("SPEISEKARTE");
  });

  it("de başlığı ß içermez (CH-Almancası, M9/DE-CH kuralı)", () => {
    expect(TITLE_BY_LANG.de.includes("ß")).toBe(false);
  });

  it("kullanıcı override'ı (detached) HER dilde aynen kazanır", () => {
    const ov = { str: "CARTE SPÉCIALE", detached: true };
    expect(resolveChromeTitle(ov, "tr")).toBe("CARTE SPÉCIALE");
    expect(resolveChromeTitle(ov, "de")).toBe("CARTE SPÉCIALE");
    expect(resolveChromeTitle(ov, "fr")).toBe("CARTE SPÉCIALE");
  });

  it("bilinmeyen dil (bozuk eski veri) → güvenli fr", () => {
    expect(resolveChromeTitle({ str: "", detached: false }, "en" as never)).toBe("NOTRE CARTE");
  });
});
