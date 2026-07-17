/* F8-D — mockup sabitleri + SceneSettings additive katmanlar + preset iskeletleri
   F8-E — kapılı yüksek-çöz yolu + çok-yüzey sunum seçim helper'ları */

import { describe, expect, it } from "vitest";
import {
  MOCKUP_HIRES_CONFIRM,
  MOCKUP_HIRES_MAX_W,
  MOCKUP_MAX_W,
  MOCKUP_WATERMARK,
  MockupHiresRequestSchema,
  PresentMockupModeSchema,
  SCENE_KIND_ORDER,
  classifySceneKind,
  mockupWatermarkText,
  pickLatestMockupPerSceneKind,
  surfaceToSceneKind,
} from "./mockup.js";
import {
  SCENE_STYLE_PRESETS,
  SceneKindSchema,
  SceneSettingsSchema,
  SurfaceKindSchema,
} from "./schemas.js";

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

describe("F8-E sabitleri (kapılı yüksek-çöz yolu)", () => {
  it("MOCKUP_HIRES_MAX_W = 3200 — yönetişim kararı D-30; tavan MAX_W'den büyük", () => {
    expect(MOCKUP_HIRES_MAX_W).toBe(3200);
    expect(MOCKUP_HIRES_MAX_W).toBeGreaterThan(MOCKUP_MAX_W);
  });

  it("varsayılan tavan DEĞİŞMEDİ (1600 — ADR-005 şerhi: default yol aynen)", () => {
    expect(MOCKUP_MAX_W).toBe(1600);
  });

  it("re-onay literal'i AYNEN: 'baskı için değildir'", () => {
    expect(MOCKUP_HIRES_CONFIRM).toBe("baskı için değildir");
  });
});

describe("MockupHiresRequestSchema (re-onay kapısı)", () => {
  it("doğru literal + scene_id → geçer", () => {
    const r = MockupHiresRequestSchema.parse({ scene_id: "scn_1", confirm: "baskı için değildir" });
    expect(r.scene_id).toBe("scn_1");
  });

  it("confirm eksik → reddedilir (route'ta ZodError → 400)", () => {
    expect(() => MockupHiresRequestSchema.parse({ scene_id: "scn_1" })).toThrow();
  });

  it("yanlış/yaklaşık literal → reddedilir (birebir eşleşme şart)", () => {
    expect(() => MockupHiresRequestSchema.parse({ scene_id: "scn_1", confirm: "baski icin degildir" })).toThrow();
    expect(() => MockupHiresRequestSchema.parse({ scene_id: "scn_1", confirm: "BASKI İÇİN DEĞİLDİR" })).toThrow();
  });

  it("boş scene_id → reddedilir", () => {
    expect(() => MockupHiresRequestSchema.parse({ scene_id: "", confirm: MOCKUP_HIRES_CONFIRM })).toThrow();
  });

  it("bilinmeyen ek alanlar İSTEĞİ KIRMAZ, çıktıdan atılır (istemci toleransı)", () => {
    const r = MockupHiresRequestSchema.parse({
      scene_id: "scn_1",
      confirm: MOCKUP_HIRES_CONFIRM,
      extra: "yok sayılır",
    });
    expect(r).toEqual({ scene_id: "scn_1", confirm: MOCKUP_HIRES_CONFIRM });
  });
});

describe("PresentMockupModeSchema (F8-E/H4 sunum modu)", () => {
  it("last + per_scene_kind geçer; bilinmeyen mod reddedilir", () => {
    expect(PresentMockupModeSchema.parse("last")).toBe("last");
    expect(PresentMockupModeSchema.parse("per_scene_kind")).toBe("per_scene_kind");
    expect(() => PresentMockupModeSchema.parse("all")).toThrow();
  });

  it("sözleşme sabit: seçenek kümesi tam olarak {last, per_scene_kind}", () => {
    expect([...PresentMockupModeSchema.options]).toEqual(["last", "per_scene_kind"]);
  });
});

describe("surfaceToSceneKind (schemas.ts F8-A eşleme borcu — F8-E'de kapandı)", () => {
  it("dörtlü eşleme: vitrine→vitrine · tabela→facade · garment→garment · diger→generic", () => {
    expect(surfaceToSceneKind("vitrine")).toBe("vitrine");
    expect(surfaceToSceneKind("tabela")).toBe("facade");
    expect(surfaceToSceneKind("garment")).toBe("garment");
    expect(surfaceToSceneKind("diger")).toBe("generic");
  });

  it("TÜKETİCİ garantisi: her SurfaceKind seçeneği geçerli bir SceneKind'a düşer", () => {
    for (const sk of SurfaceKindSchema.options) {
      expect(SceneKindSchema.options).toContain(surfaceToSceneKind(sk));
    }
  });
});

describe("classifySceneKind (M8 — silinmiş sahne sessiz düşmez)", () => {
  it("geçerli türler aynen geçer", () => {
    expect(classifySceneKind("vitrine")).toBe("vitrine");
    expect(classifySceneKind("facade")).toBe("facade");
    expect(classifySceneKind("garment")).toBe("garment");
    expect(classifySceneKind("generic")).toBe("generic");
  });

  it("silinmiş sahne (undefined/null) ve bilinmeyen tür → generic", () => {
    expect(classifySceneKind(undefined)).toBe("generic");
    expect(classifySceneKind(null)).toBe("generic");
    expect(classifySceneKind("banner")).toBe("generic");
  });

  it("boş dize (bozuk snapshot'tan gelen scene_id yolu) → generic", () => {
    expect(classifySceneKind("")).toBe("generic");
  });
});

describe("pickLatestMockupPerSceneKind (H4 çekirdeği — tür başına EN SON)", () => {
  const c = (scene_kind: (typeof SCENE_KIND_ORDER)[number], version: number, tag?: string) => ({
    scene_kind,
    version,
    tag: tag ?? `${scene_kind}-v${version}`,
  });

  it("boş girdi → boş çıktı", () => {
    expect(pickLatestMockupPerSceneKind([])).toEqual([]);
  });

  it("tek tür, çok sürüm → yalnız en yüksek sürüm", () => {
    const out = pickLatestMockupPerSceneKind([c("vitrine", 1), c("vitrine", 3), c("vitrine", 2)]);
    expect(out).toHaveLength(1);
    expect(out[0].version).toBe(3);
  });

  it("çok tür → her türden en son, SCENE_KIND_ORDER sırasıyla (deterministik)", () => {
    const out = pickLatestMockupPerSceneKind([
      c("generic", 5),
      c("facade", 2),
      c("vitrine", 1),
      c("facade", 4),
      c("garment", 7),
    ]);
    expect(out.map((o) => o.scene_kind)).toEqual(["vitrine", "facade", "garment", "generic"]);
    expect(out.find((o) => o.scene_kind === "facade")?.version).toBe(4);
  });

  it("girdi sırasından bağımsız aynı sonuç (kararlı PDF)", () => {
    const a = [c("facade", 1), c("vitrine", 2), c("generic", 3)];
    const b = [c("generic", 3), c("facade", 1), c("vitrine", 2)];
    expect(pickLatestMockupPerSceneKind(a)).toEqual(pickLatestMockupPerSceneKind(b));
  });

  it("sürüm eşitliğinde İLK gelen kalır (> karşılaştırması — sabitlenmiş davranış)", () => {
    const out = pickLatestMockupPerSceneKind([c("vitrine", 2, "ilk"), c("vitrine", 2, "ikinci")]);
    expect(out[0].tag).toBe("ilk");
  });

  it("SCENE_KIND_ORDER dört türü tam kapsar (SceneKindSchema ile eş küme)", () => {
    expect([...SCENE_KIND_ORDER].sort()).toEqual([...SceneKindSchema.options].sort());
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
