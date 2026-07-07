import { describe, expect, it } from "vitest";
import { defaultBrandKit } from "@tezgah/shared";
import { buildQr, contrastRatio, qrSourceUrl } from "./qr.js";

describe("qrSourceUrl", () => {
  it("kaynakları BrandKit'ten çözer; boşsa null", () => {
    const kit = defaultBrandKit();
    expect(qrSourceUrl("review", kit)).toBeNull();
    expect(qrSourceUrl("tel", kit)).toBeNull();

    kit.contact.phone = "04 78 12 34 56";
    kit.contact.google_review_url = "https://g.page/r/abc";
    kit.contact.instagram = "@aras.lyon";
    kit.contact.delivery = [{ platform: "ubereats", url: "https://ubereats.com/x" }];

    expect(qrSourceUrl("tel", kit)).toBe("tel:0478123456");
    expect(qrSourceUrl("review", kit)).toBe("https://g.page/r/abc");
    expect(qrSourceUrl("instagram", kit)).toBe("https://instagram.com/aras.lyon");
    expect(qrSourceUrl("delivery", kit)).toBe("https://ubereats.com/x");
  });
});

describe("buildQr", () => {
  it("deterministik: aynı girdi aynı path", () => {
    const a = buildQr("https://g.page/r/abc", 16, "#1A1A1A");
    const b = buildQr("https://g.page/r/abc", 16, "#1A1A1A");
    expect(a.d).toBe(b.d);
    expect(a.d.length).toBeGreaterThan(100);
    expect(a.modules).toBeGreaterThanOrEqual(21);
  });

  it("koyu metin rengi korunur; açık renkte siyah fallback + bayrak (M4)", () => {
    const dark = buildQr("tel:0478123456", 16, "#1A1A1A");
    expect(dark.fill).toBe("var(--c-item)");
    expect(dark.contrastFallback).toBe(false);

    const light = buildQr("tel:0478123456", 16, "#FFFFFF"); // velours metni
    expect(light.fill).toBe("#000000");
    expect(light.contrastFallback).toBe(true);
  });
});

describe("contrastRatio", () => {
  it("siyah-beyaz 21:1, beyaz-beyaz 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
  });
});
