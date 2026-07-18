/* F1 durum makinesi testleri (P1 + P2 §7 hizalaması).
   Kanıtlananlar: zincir spec §7 ile BİREBİR doğrusal · iki katman ayrı
   (K4 bir kısayol kenarı DEĞİL, guard'tır) · üretim incelemesi %100 + açık
   REDDET yok ister · PRODUCTION_READY insan onayı ister · gerileme kayıtlı. */

import { describe, expect, it } from "vitest";
import {
  F1_APPROVAL_GATED,
  F1_DESIGN_GATED,
  F1_FORWARD,
  F1_PRODUCTION_GATED,
  F1_STATES,
  F1StateSchema,
  canTransitionF1,
  f1StateIndex,
  isF1ProductionGateOpen,
  isF1State,
  type F1Readiness,
  type F1State,
  type F1TransitionInput,
} from "./f1-state.js";

const READY: F1Readiness = { designReady: true, productionCompleteness: 100, openRejects: 0 };
const NOT_READY: F1Readiness = { designReady: false, productionCompleteness: 0, openRejects: 1 };
const APPROVAL = { approvedBy: "operator:ayse" };
const go = (from: F1State, to: F1State, extra: Partial<F1TransitionInput> = {}) =>
  canTransitionF1({ from, to, readiness: READY, approval: APPROVAL, ...extra });

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

describe("§7 HİZALAMA — kanonik zincir birebir (P2 düzeltmesi)", () => {
  it("zincir DOĞRUSAL: her durumun tek ileri kenarı var, kısayol YOK", () => {
    expect(F1_FORWARD).toEqual({
      DRAFT: ["INCOMPLETE"],
      INCOMPLETE: ["READY_FOR_DESIGN"],
      READY_FOR_DESIGN: ["DESIGN_IN_PROGRESS"],
      DESIGN_IN_PROGRESS: ["READY_FOR_PRODUCTION_REVIEW"],
      READY_FOR_PRODUCTION_REVIEW: ["PRODUCTION_READY"],
      PRODUCTION_READY: [],
    });
  });

  it("KALDIRILAN SAPMA-1: INCOMPLETE → DESIGN_IN_PROGRESS doğrudan kenarı YOK", () => {
    expect(F1_FORWARD.INCOMPLETE).not.toContain("DESIGN_IN_PROGRESS");
    expect(go("INCOMPLETE", "DESIGN_IN_PROGRESS")).toMatchObject({ ok: false, code: "not_allowed" });
  });

  it("KALDIRILAN SAPMA-2: DRAFT → READY_FOR_DESIGN kısayolu YOK", () => {
    expect(go("DRAFT", "READY_FOR_DESIGN")).toMatchObject({ ok: false, code: "not_allowed" });
  });

  it("SAPMA-3 düzeltmesi: %100 kapısı ÜRETİM İNCELEMESİ girişinde, insan onayı PRODUCTION_READY'de", () => {
    expect([...F1_PRODUCTION_GATED]).toEqual(["READY_FOR_PRODUCTION_REVIEW"]);
    expect([...F1_APPROVAL_GATED]).toEqual(["PRODUCTION_READY"]);
    expect([...F1_DESIGN_GATED]).toEqual(["READY_FOR_DESIGN", "DESIGN_IN_PROGRESS"]);
  });

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

  it("aynı duruma geçiş no-op olarak reddedilir (boş audit satırı doğmasın)", () => {
    expect(go("DRAFT", "DRAFT")).toMatchObject({ ok: false, code: "same_state" });
  });
});

describe("İKİ-KATMAN KURALI (spec §4)", () => {
  it("tasarım önkoşulu eksikken READY_FOR_DESIGN ve DESIGN_IN_PROGRESS KAPALI", () => {
    expect(
      canTransitionF1({ from: "INCOMPLETE", to: "READY_FOR_DESIGN", readiness: NOT_READY })
    ).toMatchObject({ ok: false, code: "design_not_ready" });
    expect(
      canTransitionF1({
        from: "READY_FOR_DESIGN",
        to: "DESIGN_IN_PROGRESS",
        readiness: { designReady: false, productionCompleteness: 100, openRejects: 0 },
      })
    ).toMatchObject({ ok: false, code: "design_not_ready" });
  });

  it("K4 GUARD (kısayol DEĞİL): üretim eksikleri tasarımı ENGELLEMEZ — INCOMPLETE → READY_FOR_DESIGN açık", () => {
    const r = canTransitionF1({
      from: "INCOMPLETE",
      to: "READY_FOR_DESIGN",
      readiness: { designReady: true, productionCompleteness: 20, openRejects: 0 },
    });
    expect(r).toMatchObject({ ok: true, direction: "forward" });
  });
});

describe("üretim incelemesi kapısı (§7: %100 + açık REDDET yok)", () => {
  it("tamlık %99 iken kapalı", () => {
    expect(
      canTransitionF1({
        from: "DESIGN_IN_PROGRESS",
        to: "READY_FOR_PRODUCTION_REVIEW",
        readiness: { designReady: true, productionCompleteness: 99, openRejects: 0 },
      })
    ).toMatchObject({ ok: false, code: "production_incomplete" });
  });

  it("tamlık %100 OLSA BİLE açık REDDET varsa kapalı (F1.5 zinciri)", () => {
    expect(
      canTransitionF1({
        from: "DESIGN_IN_PROGRESS",
        to: "READY_FOR_PRODUCTION_REVIEW",
        readiness: { designReady: true, productionCompleteness: 100, openRejects: 1 },
      })
    ).toMatchObject({ ok: false, code: "open_rejects" });
  });

  it("%100 + REDDET yok → açık", () => {
    expect(go("DESIGN_IN_PROGRESS", "READY_FOR_PRODUCTION_REVIEW")).toMatchObject({ ok: true });
  });
});

describe("insan onayı kapısı (§7 son adım)", () => {
  it("onaysız PRODUCTION_READY olmaz", () => {
    expect(
      canTransitionF1({
        from: "READY_FOR_PRODUCTION_REVIEW",
        to: "PRODUCTION_READY",
        readiness: READY,
      })
    ).toMatchObject({ ok: false, code: "approval_required" });
    expect(
      canTransitionF1({
        from: "READY_FOR_PRODUCTION_REVIEW",
        to: "PRODUCTION_READY",
        readiness: READY,
        approval: { approvedBy: "   " },
      })
    ).toMatchObject({ ok: false, code: "approval_required" });
  });

  it("onayla açılır; üretim kapısı YALNIZ PRODUCTION_READY'de açıktır (F1.1)", () => {
    expect(go("READY_FOR_PRODUCTION_REVIEW", "PRODUCTION_READY")).toMatchObject({ ok: true });
    for (const s of F1_STATES) {
      expect(isF1ProductionGateOpen(s), s).toBe(s === "PRODUCTION_READY");
    }
  });
});

describe("gerileme: meşru + KAYITLI (F1.7 zemini)", () => {
  it("kayıtsız gerileme reddedilir (sebep ya da kaydeden boş)", () => {
    expect(go("PRODUCTION_READY", "INCOMPLETE", { regression: null })).toMatchObject({
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
      to: "INCOMPLETE",
      readiness: { designReady: true, productionCompleteness: 0, openRejects: 0 },
      regression: null,
    };
    const snapshot = JSON.stringify(input);
    canTransitionF1(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("bilinmeyen durum kodla reddedilir (tip dışı veri gelirse)", () => {
    expect(
      canTransitionF1({ from: "ARCHIVED" as F1State, to: "DRAFT", readiness: READY })
    ).toMatchObject({ ok: false, code: "unknown_state" });
  });
});
