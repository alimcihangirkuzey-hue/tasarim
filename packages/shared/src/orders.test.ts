import { describe, expect, it } from "vitest";
import { canTransition, dueLevel, missingFields, needsMiroirWarning } from "./orders.js";
import type { OrderItemLike } from "./orders.js";

const base = (p: Partial<OrderItemLike>): OrderItemLike => ({
  product_type: "diger",
  qty: 1,
  width_cm: null,
  height_cm: null,
  details: {},
  ...p,
});

describe("missingFields (FAZ2-GOREV §2.2 matrisi)", () => {
  it("vitrophanie: ölçü + yön + mod zorunlu", () => {
    expect(missingFields(base({ product_type: "vitrophanie" }))).toEqual([
      "width_cm", "height_cm", "side", "mode",
    ]);
    expect(
      missingFields(
        base({
          product_type: "vitrophanie",
          width_cm: 180,
          height_cm: 120,
          details: { side: "exterieur", mode: "impression" },
        })
      )
    ).toEqual([]);
  });

  it("tabela: yalnız ölçü zorunlu", () => {
    expect(missingFields(base({ product_type: "tabela" }))).toEqual(["width_cm", "height_cm"]);
    expect(missingFields(base({ product_type: "tabela", width_cm: 300, height_cm: 80 }))).toEqual([]);
  });

  it("tisort/onluk: adet + teknik", () => {
    expect(missingFields(base({ product_type: "tisort", qty: 0 }))).toEqual(["qty", "technique"]);
    expect(
      missingFields(base({ product_type: "onluk", qty: 5, details: { technique: "broderie" } }))
    ).toEqual([]);
  });

  it("menu/trifold/flyer/fidelite: format", () => {
    for (const t of ["menu", "trifold", "flyer", "fidelite"] as const) {
      expect(missingFields(base({ product_type: t }))).toEqual(["format"]);
      expect(missingFields(base({ product_type: t, details: { format: "a3" } }))).toEqual([]);
    }
  });

  it("diger: zorunlu alan yok", () => {
    expect(missingFields(base({}))).toEqual([]);
  });
});

describe("canTransition (durum kapısı)", () => {
  const eksikTabela = base({ product_type: "tabela" });
  const tamTabela = base({ product_type: "tabela", width_cm: 300, height_cm: 80 });

  it("eksik kalem olcu_bekliyor'dan çıkamaz (kabul §9/2)", () => {
    const r = canTransition(eksikTabela, "olcu_bekliyor", "tasarimda");
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["width_cm", "height_cm"]);
  });

  it("alanlar dolunca çıkabilir", () => {
    expect(canTransition(tamTabela, "olcu_bekliyor", "tasarimda").ok).toBe(true);
  });

  it("iptal her durumdan serbest", () => {
    expect(canTransition(eksikTabela, "olcu_bekliyor", "iptal").ok).toBe(true);
  });

  it("ileri aşamalar arasında kapı yok", () => {
    expect(canTransition(eksikTabela, "tasarimda", "onayda").ok).toBe(true);
  });
});

describe("needsMiroirWarning", () => {
  it("intérieur vitrophanie miroir uyarısı ister", () => {
    expect(
      needsMiroirWarning(base({ product_type: "vitrophanie", details: { side: "interieur" } }))
    ).toBe(true);
    expect(
      needsMiroirWarning(base({ product_type: "vitrophanie", details: { side: "exterieur" } }))
    ).toBe(false);
  });
});

describe("dueLevel (termin vurgusu §2.3)", () => {
  const today = "2026-07-07";
  it("geçmiş kırmızı, ≤3 gün sarı, uzak none", () => {
    expect(dueLevel("2026-07-05", today)).toBe("red");
    expect(dueLevel("2026-07-09", today)).toBe("yellow");
    expect(dueLevel("2026-07-20", today)).toBe("none");
    expect(dueLevel(null, today)).toBe("none");
  });
});
