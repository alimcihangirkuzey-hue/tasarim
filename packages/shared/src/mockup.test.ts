/* F8-D — mockup sabitleri + SceneSettings additive katmanlar + preset iskeletleri */

import { describe, expect, it } from "vitest";
import { MOCKUP_MAX_W, MOCKUP_WATERMARK, mockupWatermarkText } from "./mockup.js";
import { SCENE_STYLE_PRESETS, SceneSettingsSchema } from "./schemas.js";

describe("mockup damga (F8-D/Δ2 — dil-duyarlı)", () => {
  it("üç dil: fr/de/tr; MOCKUP çekirdeği sabit", () => {
    expect(mockupWatermarkText("fr")).toBe("MOCKUP — ne pas utiliser pour l'impression");
    expect(mockupWatermarkText("de")).toBe("MOCKUP — nicht zum Drucken verwenden");
    expect(mockupWatermarkText("tr")).toBe("MOCKUP — baskı provası değildir");
  });

  it("de damgası ß içermez (CH-Almancası, M9/DE-CH)", () => {
    expect(MOCKUP_WATERMARK.de.includes("ß")).toBe(false);
  });

  it("bilinmeyen dil (bozuk eski veri) → güvenli fr", () => {
    expect(mockupWatermarkText("en" as never)).toBe("MOCKUP — ne pas utiliser pour l'impression");
  });
});

describe("MOCKUP_MAX_W (F8-D/H2 — anti-kaçış tavanı)", () => {
  it("1600 sabit — ekran için yeter, baskı için bilerek yetmez", () => {
    expect(MOCKUP_MAX_W).toBe(1600);
  });
});

describe("SceneSettings additive katmanlar (F8-D/H3 — migrationsız)", () => {
  it("ESKİ sahne settings_json'ı (shadow/overlay YOK) varsayılanla parse olur", () => {
    const old = SceneSettingsSchema.parse({ blend: "multiply", opacity: 0.8 });
    expect(old.shadow).toEqual({ opacity: 0, blur_px: 24, dy_px: 12 }); // kapalı
    expect(old.overlay).toEqual({ opacity: 0, color: "#000000" }); // kapalı
    expect(old.blend).toBe("multiply"); // mevcut alanlar aynen
  });

  it("boş settings ({}) tüm varsayılanlarla dolar (yeni sahne)", () => {
    const s = SceneSettingsSchema.parse({});
    expect(s).toEqual({
      blend: "normal",
      opacity: 0.9,
      shadow: { opacity: 0, blur_px: 24, dy_px: 12 },
      overlay: { opacity: 0, color: "#000000" },
    });
  });

  it("sınırlar: opacity 0..1, blur 0..200 dışı reddedilir", () => {
    expect(() => SceneSettingsSchema.parse({ shadow: { opacity: 1.5 } })).toThrow();
    expect(() => SceneSettingsSchema.parse({ shadow: { blur_px: 999 } })).toThrow();
    expect(() => SceneSettingsSchema.parse({ overlay: { opacity: -0.1 } })).toThrow();
  });
});

describe("SCENE_STYLE_PRESETS (F8-D iskeletleri)", () => {
  it("2 preset var; ikisi de SceneSettingsSchema'dan geçer (round-trip)", () => {
    const keys = Object.keys(SCENE_STYLE_PRESETS);
    expect(keys).toEqual(["soft_shadow", "vitrine_glare"]);
    for (const k of keys) {
      const p = SCENE_STYLE_PRESETS[k];
      expect(p.label_tr.length).toBeGreaterThan(0);
      expect(() => SceneSettingsSchema.parse(p.settings)).not.toThrow();
    }
  });

  it("soft_shadow: gölge açık, overlay kapalı; vitrine_glare: multiply + beyaz ışık", () => {
    expect(SCENE_STYLE_PRESETS.soft_shadow.settings.shadow.opacity).toBeGreaterThan(0);
    expect(SCENE_STYLE_PRESETS.soft_shadow.settings.overlay.opacity).toBe(0);
    expect(SCENE_STYLE_PRESETS.vitrine_glare.settings.blend).toBe("multiply");
    expect(SCENE_STYLE_PRESETS.vitrine_glare.settings.overlay.color).toBe("#ffffff");
  });
});
