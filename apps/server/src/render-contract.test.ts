/* T3 PART-B adım-1 — Render Contract v1 uyum testleri (şema + kanonik + HMAC).
   Route davranışı canlı smoke'ta (401/201 + dosya + sha256). */

import { describe, expect, it } from "vitest";
import { CD_VERSION } from "@tezgah/shared";
import {
  RENDER_CONTRACT_V,
  RenderRequestV1Schema,
  canonicalRenderString,
  signRender,
  verifyRender,
} from "./render-contract.js";

const base = { doc: "doc_abc", variant: "preview" as const };

describe("Render Contract v1 — şema", () => {
  it("geçerli istek kabul + default'lar (watermark=false, target=pdf)", () => {
    const r = RenderRequestV1Schema.parse(base);
    expect(r).toEqual({ doc: "doc_abc", variant: "preview", watermark: false, target: "pdf" });
  });

  it("print varyantı + açık watermark kabul", () => {
    const r = RenderRequestV1Schema.parse({ ...base, variant: "print", watermark: true });
    expect(r.variant).toBe("print");
    expect(r.watermark).toBe(true);
  });

  it("bozuk variant / bilinmeyen target / boş doc RED (fail-loud)", () => {
    expect(() => RenderRequestV1Schema.parse({ ...base, variant: "mockup" })).toThrow();
    expect(() => RenderRequestV1Schema.parse({ ...base, target: "png" })).toThrow();
    expect(() => RenderRequestV1Schema.parse({ ...base, doc: "" })).toThrow();
  });
});

describe("Render Contract v1 — kanonik dize + HMAC", () => {
  const req = RenderRequestV1Schema.parse({ ...base, watermark: true });
  const SECRET = "test-secret";

  it("kanonik dize deterministik + sürüm-etiketli + alan-sıralı", () => {
    expect(canonicalRenderString(req)).toBe("render.v1|doc=doc_abc|variant=preview|watermark=true|target=pdf");
    expect(canonicalRenderString(req)).toBe(canonicalRenderString({ ...req })); // aynı girdi → aynı dize
  });

  it("sign → verify round-trip", () => {
    const sig = signRender(req, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyRender(req, sig, SECRET)).toBe(true);
  });

  it("tamper (alan değişti) → verify false", () => {
    const sig = signRender(req, SECRET);
    expect(verifyRender({ ...req, doc: "doc_BAŞKA" }, sig, SECRET)).toBe(false);
    expect(verifyRender({ ...req, variant: "print" }, sig, SECRET)).toBe(false);
    expect(verifyRender({ ...req, watermark: false }, sig, SECRET)).toBe(false);
  });

  it("yanlış secret / boş imza / bozuk imza → false (fırlatmaz)", () => {
    const sig = signRender(req, SECRET);
    expect(verifyRender(req, sig, "baska-secret")).toBe(false);
    expect(verifyRender(req, undefined, SECRET)).toBe(false);
    expect(verifyRender(req, "kisa-hex", SECRET)).toBe(false);
  });

  it("sürüm sabiti = 1 (kırıcı değişiklik = MAJOR + iki-taraflı goal — direktif §2)", () => {
    expect(RENDER_CONTRACT_V).toBe(1);
  });
});

describe("CD1-2 (P1) — cd_version meta'sı contract yüzeyini DEĞİŞTİRMEZ", () => {
  it("RENDER_CONTRACT_V=1 KORUNDU (CD, contract sürümünü etkilemez — D-35)", () => {
    expect(RENDER_CONTRACT_V).toBe(1);
    expect(CD_VERSION).toBe(1);
  });

  it("istek şemasında cd_version ALANI YOK — gönderilirse strip edilir, imza yüzeyine giremez", () => {
    const r = RenderRequestV1Schema.parse({ ...base, cd_version: 1 } as Record<string, unknown>);
    expect("cd_version" in r).toBe(false);
    expect(r).toEqual({ doc: "doc_abc", variant: "preview", watermark: false, target: "pdf" });
  });

  it("kanonik imza dizesi CD1 sonrası BİREBİR v1 biçiminde (bayt-bayt sabit)", () => {
    const req = RenderRequestV1Schema.parse({ ...base, watermark: true });
    expect(canonicalRenderString(req)).toBe(
      "render.v1|doc=doc_abc|variant=preview|watermark=true|target=pdf"
    );
  });
});
