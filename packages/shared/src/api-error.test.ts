/* P5 GT bulgusu (BULGU-P5-1) regresyon testleri: ham kod DEĞİL, gerekçe. */

import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./api-error.js";

describe("apiErrorMessage — operatör NEDENİ görür", () => {
  it("BULGU: bozuk dosya reddi artık 'policy_reject' değil, gerekçeli", () => {
    const msg = apiErrorMessage({
      error: "policy_reject",
      code: "bozuk_dosya",
      rejects: [{ code: "bozuk_dosya", detail_tr: "Dosya açılamadı / okunamadı" }],
      warnings: [],
      infos: [],
    });
    expect(msg).toBe("Dosya reddedildi — Dosya açılamadı / okunamadı");
    expect(msg).not.toMatch(/policy_reject/);
  });

  it("desteklenmeyen tür: gerekçe kabul listesini söyler", () => {
    const msg = apiErrorMessage({
      error: "policy_reject",
      code: "desteklenmeyen_tur",
      rejects: [
        { code: "desteklenmeyen_tur", detail_tr: "Desteklenmeyen dosya türü: image/webp (kabul: PNG, JPG, SVG, PDF)" },
      ],
    });
    expect(msg).toContain("Desteklenmeyen dosya türü");
    expect(msg).toContain("PNG, JPG, SVG, PDF");
  });

  it("birden çok red gerekçesi birleştirilir", () => {
    const msg = apiErrorMessage({
      error: "policy_reject",
      rejects: [
        { detail_tr: "Dosya boş (0 bayt)" },
        { detail_tr: "Dosyanın ölçü/yön bilgisi belirlenemedi" },
      ],
    });
    expect(msg).toBe("Dosya reddedildi — Dosya boş (0 bayt) · Dosyanın ölçü/yön bilgisi belirlenemedi");
  });

  it("durum geçişi engeli: kod değil sebep gösterilir", () => {
    const msg = apiErrorMessage({
      error: "transition_blocked",
      code: "design_not_ready",
      detail: "Tasarım eşiği kapalı: format/ölçü/yön asgari bilgisi eksik",
      missing: [],
    });
    expect(msg).toBe("Geçiş engellendi — Tasarım eşiği kapalı: format/ölçü/yön asgari bilgisi eksik");
  });

  it("kilitli adım (501) anlaşılır", () => {
    expect(
      apiErrorMessage({ error: "not_yet_available", detail: "PRODUCTION_READY P7 kutusunda açılır" })
    ).toBe("Bu adım henüz açık değil — PRODUCTION_READY P7 kutusunda açılır");
  });

  it("Zod doğrulama: ilk anlamlı mesaj", () => {
    expect(
      apiErrorMessage({ error: "validation", issues: [{ path: "reason", message: "reason boş olamaz" }] })
    ).toBe("Geçersiz veri — reason boş olamaz");
  });

  it("tanımsız spec anahtarı: hangi alan olduğu yazılır", () => {
    expect(apiErrorMessage({ error: "unknown_spec_keys", keys: ["uydurma_alan"] })).toBe(
      "Tanımsız alan — uydurma_alan"
    );
  });

  it("yalnız kod varsa Türkçe başlık; eşleşmeyen kod aynen kalır", () => {
    expect(apiErrorMessage({ error: "brief_not_found" })).toBe("Brief bulunamadı");
    expect(apiErrorMessage({ error: "gelecek_kod" })).toBe("gelecek_kod");
  });

  it("boş/tanınmayan gövde: sessiz kalmaz, durum kodu gösterilir", () => {
    expect(apiErrorMessage({}, 500)).toBe("Sunucu hatası (500)");
    expect(apiErrorMessage(null)).toBe("Sunucu hatası");
    expect(apiErrorMessage("düz metin", 502)).toBe("Sunucu hatası (502)");
  });
});
