/* Dosya politikası testleri (P3) — üç sınıfın sınırları ve F1.5 kilidi. */

import { describe, expect, it } from "vitest";
import {
  F1_ACCEPTED_UPLOAD_TYPES,
  F1_DPI_THRESHOLDS,
  F1_POLICY_CODES,
  classifyF1File,
  f1PolicyClassOf,
  f1UploadTypeFromMime,
  isF1Acknowledgeable,
  type F1FileFindings,
} from "./file-policy.js";

const OK: F1FileFindings = {
  mime: "image/png",
  size_bytes: 2048,
  parsed: true,
  width_px: 1200,
  height_px: 800,
};

describe("kod sözlüğü ve sınıflar", () => {
  it("REDDET sınıfı dörtlüsü sabit", () => {
    const rejects = Object.entries(F1_POLICY_CODES)
      .filter(([, c]) => c === "reject")
      .map(([k]) => k)
      .sort();
    expect(rejects).toEqual([
      "bozuk_dosya",
      "desteklenmeyen_tur",
      "olcu_belirlenemedi",
      "zorunlu_dosya_eksik",
    ]);
  });

  it("UYAR üçlüsü ve BİLGİ dörtlüsü sabit", () => {
    const byClass = (cls: string) =>
      Object.entries(F1_POLICY_CODES)
        .filter(([, c]) => c === cls)
        .map(([k]) => k)
        .sort();
    expect(byClass("warn")).toEqual(["dusuk_dpi", "font_riski", "guvenli_alan_riski"]);
    expect(byClass("info")).toEqual([
      "cmyk_dogrulanamadi",
      "icc_dogrulanamadi",
      "pdf_derin_dogrulama_yok",
      "pdfx_dogrulanamadi",
    ]);
  });

  it("F1.5: YALNIZ uyarı sınıfı kayıtlı onayla kapatılabilir", () => {
    expect(isF1Acknowledgeable("dusuk_dpi")).toBe(true);
    expect(isF1Acknowledgeable("bozuk_dosya")).toBe(false);
    expect(isF1Acknowledgeable("olcu_belirlenemedi")).toBe(false);
    expect(isF1Acknowledgeable("cmyk_dogrulanamadi")).toBe(false);
    expect(isF1Acknowledgeable("uydurma_kod")).toBe(false);
    expect(f1PolicyClassOf("uydurma_kod")).toBeNull();
  });

  it("kabul edilen tür listesi spec v1 ile birebir; webp YOK", () => {
    expect([...F1_ACCEPTED_UPLOAD_TYPES]).toEqual(["png", "jpg", "svg", "pdf"]);
    expect(f1UploadTypeFromMime("image/png")).toBe("png");
    expect(f1UploadTypeFromMime("image/jpeg")).toBe("jpg");
    expect(f1UploadTypeFromMime("image/svg+xml")).toBe("svg");
    expect(f1UploadTypeFromMime("application/pdf")).toBe("pdf");
    expect(f1UploadTypeFromMime("image/webp")).toBeNull();
    expect(f1UploadTypeFromMime(null)).toBeNull();
  });

  it("DPI eşikleri checkDpi ile birebir (250/150 — kopya değer, testle sabitlendi)", () => {
    expect(F1_DPI_THRESHOLDS).toEqual({ yellow: 250, red: 150 });
  });
});

describe("REDDET sınıfı", () => {
  it("desteklenmeyen tür (webp) reddedilir", () => {
    const v = classifyF1File({ ...OK, mime: "image/webp" });
    expect(v.decision).toBe("reject");
    expect(v.rejects.map((r) => r.code)).toEqual(["desteklenmeyen_tur"]);
    expect(v.type).toBeNull();
  });

  it("boş dosya ve parse edilemeyen dosya bozuk sayılır", () => {
    expect(classifyF1File({ ...OK, size_bytes: 0 }).rejects.map((r) => r.code)).toEqual([
      "bozuk_dosya",
    ]);
    const broken = classifyF1File({ ...OK, parsed: false });
    expect(broken.decision).toBe("reject");
    expect(broken.rejects.map((r) => r.code)).toEqual(["bozuk_dosya"]);
  });

  it("raster/svg'de ölçü okunamazsa REDDET", () => {
    const v = classifyF1File({ ...OK, width_px: 0, height_px: null });
    expect(v.rejects.map((r) => r.code)).toEqual(["olcu_belirlenemedi"]);
  });

  it("PDF'te ölçü kuralı UYGULANMAZ (yalnız-sakla yolu) — bunun yerine BİLGİ notu", () => {
    const v = classifyF1File({
      mime: "application/pdf",
      size_bytes: 4096,
      parsed: true,
      deep_validation_available: false,
    });
    expect(v.decision).toBe("accept");
    expect(v.rejects).toEqual([]);
    expect(v.infos.map((i) => i.code)).toEqual(["pdf_derin_dogrulama_yok"]);
  });
});

describe("UYAR sınıfı (kayıtlı onayla kapanır)", () => {
  it("DPI eşik altındaysa uyarı; eşik üstü sessiz", () => {
    expect(classifyF1File({ ...OK, effective_dpi: 240 }).warnings.map((w) => w.code)).toEqual([
      "dusuk_dpi",
    ]);
    expect(classifyF1File({ ...OK, effective_dpi: 90 }).warnings[0].detail_tr).toMatch(/kritik/);
    expect(classifyF1File({ ...OK, effective_dpi: 300 }).warnings).toEqual([]);
    expect(classifyF1File({ ...OK }).warnings).toEqual([]); // ölçülmediyse uyarı yok
  });

  it("güvenli alan ve font riski uyarı üretir; kabul kararını DEĞİŞTİRMEZ", () => {
    const v = classifyF1File({ ...OK, safe_area_risk: true, font_risk: true });
    expect(v.decision).toBe("accept");
    expect(v.warnings.map((w) => w.code)).toEqual(["guvenli_alan_riski", "font_riski"]);
  });
});

describe("BİLGİLENDİR sınıfı (keşif G düzeltmesi: sessiz yokluk YASAK)", () => {
  it("renk profili doğrulanamıyorsa CMYK/ICC/PDF-X notları AÇIKÇA üretilir", () => {
    const v = classifyF1File({ ...OK, color_profile_verifiable: false });
    expect(v.decision).toBe("accept");
    expect(v.infos.map((i) => i.code)).toEqual([
      "cmyk_dogrulanamadi",
      "icc_dogrulanamadi",
      "pdfx_dogrulanamadi",
    ]);
  });

  it("doğrulanabiliyorsa not üretilmez", () => {
    expect(classifyF1File({ ...OK, color_profile_verifiable: true }).infos).toEqual([]);
  });
});

describe("birleşik davranış ve saflık", () => {
  it("REDDET varken uyarı/bilgi notları YİNE de döner (audit zenginliği — F1.1)", () => {
    const v = classifyF1File({
      ...OK,
      parsed: false,
      effective_dpi: 100,
      color_profile_verifiable: false,
    });
    expect(v.decision).toBe("reject");
    expect(v.rejects.map((r) => r.code)).toEqual(["bozuk_dosya"]);
    expect(v.warnings.map((w) => w.code)).toEqual(["dusuk_dpi"]);
    expect(v.infos.length).toBe(3);
  });

  it("temiz dosya: kabul, not yok", () => {
    const v = classifyF1File({ ...OK, color_profile_verifiable: true });
    expect(v).toMatchObject({ decision: "accept", type: "png", rejects: [], warnings: [], infos: [] });
  });

  it("girdi DEĞİŞTİRİLMEZ", () => {
    const input = { ...OK, effective_dpi: 100 };
    const snapshot = JSON.stringify(input);
    classifyF1File(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
