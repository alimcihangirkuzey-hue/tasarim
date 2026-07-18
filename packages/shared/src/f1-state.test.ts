/* F1 durum makinesi testleri (P1) — iki eşiğin AYRI olduğu, gerilemenin
   kayıtsız yapılamadığı ve üretim kapısının yalnız PRODUCTION_READY'de
   açıldığı kanıtlanır. F1.1 / F1.7 / F1.8'in saf-çekirdek yarısı. */

import { describe, expect, it } from "vitest";
import {
  F1_FORWARD,
  F1_STATES,
  F1StateSchema,
  canTransitionF1,
  f1StateIndex,
  isF1ProductionGateOpen,
  isF1State,
  type F1State,
  type F1TransitionInput,
} from "./f1-state.js";

const READY = { designReady: true, productionCompleteness: 100 };
const NOT_READY = { designReady: false, productionCompleteness: 0 };
const go = (from: F1State, to: F1State, extra: Partial<F1TransitionInput> = {}) =>
  canTransitionF1({ from, to, readiness: READY, ...extra });

describe("F1 durum kümesi", () => {
  it("6 durum, spec sırasıyla; şema yalnız bunları kabul eder", () => {
    expect([...F1_STATES]).toEqual([
      "DRAFT",
      "INCOMPLETE",
      "READY_FOR_DESIGN",
      "DESIGN_IN_PROGRESS",
      "READY_FOR_PRODUCTION_REVIEW",
      "PRODUCTION_READY",
    ]);
    expect(F1StateSchema.parse("DRAFT")).toBe("DRAFT");
    expect(() => F1StateSchema.parse("ARCHIVED")).toThrow();
    expect(isF1State("PRODUCTION_READY")).toBe(true);
    expect(isF1State("yok")).toBe(false);
    expect(f1StateIndex("PRODUCTION_READY")).toBe(5);
  });
});

describe("ileri geçişler", () => {
  it("zincir uçtan uca yürür (F1.8 saf yarısı)", () => {
    const chain: Array<[F1State, F1State]> = [
      ["DRAFT", "INCOMPLETE"],
      ["INCOMPLETE", "READY_FOR_DESIGN"],
      ["READY_FOR_DESIGN", "DESIGN_IN_PROGRESS"],
      ["DESIGN_IN_PROGRESS", "READY_FOR_PRODUCTION_REVIEW"],
      ["READY_FOR_PRODUCTION_REVIEW", "PRODUCTION_READY"],
    ];
    for (const [from, to] of chain) {
      expect(go(from, to), `${from}→${to}`).toMatchObject({ ok: true, direction: "forward" });
    }
  });

  it("SIÇRAMA izinli değil: DRAFT → PRODUCTION_READY reddedilir", () => {
    expect(go("DRAFT", "PRODUCTION_READY")).toMatchObject({ ok: false, code: "not_allowed" });
  });

  it("PRODUCTION_READY ileri terminaldir", () => {
    expect(F1_FORWARD.PRODUCTION_READY).toEqual([]);
  });

  it("aynı duruma geçiş no-op olarak reddedilir (boş audit satırı doğmasın)", () => {
    expect(go("DRAFT", "DRAFT")).toMatchObject({ ok: false, code: "same_state" });
  });
});

describe("design_readiness eşiği (üretim eşiğinden AYRI)", () => {
  it("tasarım eşiği kapalıyken READY_FOR_DESIGN ve DESIGN_IN_PROGRESS bloklanır", () => {
    expect(canTransitionF1({ from: "DRAFT", to: "READY_FOR_DESIGN", readiness: NOT_READY })).toMatchObject({
      ok: false,
      code: "design_not_ready",
    });
    expect(
      canTransitionF1({ from: "INCOMPLETE", to: "DESIGN_IN_PROGRESS", readiness: NOT_READY })
    ).toMatchObject({ ok: false, code: "design_not_ready" });
  });

  it("SPEC: EKSİK brief ile tasarım BAŞLAYABİLİR — INCOMPLETE + designReady → DESIGN_IN_PROGRESS", () => {
    const r = canTransitionF1({
      from: "INCOMPLETE",
      to: "DESIGN_IN_PROGRESS",
      readiness: { designReady: true, productionCompleteness: 20 },
    });
    expect(r).toMatchObject({ ok: true, direction: "forward" });
  });
});

describe("üretim kapısı (%100 şartı — F1.1)", () => {
  it("tamlık %99 iken PRODUCTION_READY bloklanır", () => {
    const r = canTransitionF1({
      from: "READY_FOR_PRODUCTION_REVIEW",
      to: "PRODUCTION_READY",
      readiness: { designReady: true, productionCompleteness: 99 },
    });
    expect(r).toMatchObject({ ok: false, code: "production_incomplete" });
  });

  it("tamlık %100'de açılır", () => {
    expect(go("READY_FOR_PRODUCTION_REVIEW", "PRODUCTION_READY")).toMatchObject({ ok: true });
  });

  it("üretim kapısı (Pack mühür · üretime-hazır · üretim işi · operatör kuyruğu) YALNIZ PRODUCTION_READY'de açık", () => {
    for (const s of F1_STATES) {
      expect(isF1ProductionGateOpen(s), s).toBe(s === "PRODUCTION_READY");
    }
  });
});

describe("gerileme: meşru + KAYITLI (F1.7 zemini)", () => {
  it("kayıtsız gerileme reddedilir (sebep ya da kaydeden boş)", () => {
    expect(go("PRODUCTION_READY", "INCOMPLETE")).toMatchObject({
      ok: false,
      code: "regression_unrecorded",
    });
    expect(
      go("PRODUCTION_READY", "INCOMPLETE", { regression: { reason: "   ", recordedBy: "op" } })
    ).toMatchObject({ ok: false, code: "regression_unrecorded" });
    expect(
      go("DESIGN_IN_PROGRESS", "INCOMPLETE", { regression: { reason: "dosya bozuldu", recordedBy: " " } })
    ).toMatchObject({ ok: false, code: "regression_unrecorded" });
  });

  it("kayıtlı gerileme geçer: dosya geçersizleşince PRODUCTION_READY → INCOMPLETE", () => {
    const r = go("PRODUCTION_READY", "INCOMPLETE", {
      regression: { reason: "logo dosyası geçersizleşti (v2 bozuk)", recordedBy: "operator:ayse" },
    });
    expect(r).toMatchObject({ ok: true, direction: "backward" });
  });
});

describe("saflık ve tip güvenliği", () => {
  it("girdi nesnesi DEĞİŞTİRİLMEZ", () => {
    const input: F1TransitionInput = {
      from: "DRAFT",
      to: "READY_FOR_DESIGN",
      readiness: { designReady: true, productionCompleteness: 0 },
      regression: null,
    };
    const snapshot = JSON.stringify(input);
    canTransitionF1(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("bilinmeyen durum kodla reddedilir (tip dışı veri gelirse)", () => {
    const r = canTransitionF1({
      from: "ARCHIVED" as F1State,
      to: "DRAFT",
      readiness: READY,
    });
    expect(r).toMatchObject({ ok: false, code: "unknown_state" });
  });
});
