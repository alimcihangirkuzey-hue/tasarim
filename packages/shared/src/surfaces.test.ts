import { describe, expect, it } from "vitest";
import {
  ChecklistSurfacesSchema,
  IntakeSurfaceSchema,
  SurfaceKindSchema,
  migrateIntakeDraftV2toV3,
} from "./schemas.js";

describe("SurfaceKindSchema (F8-A)", () => {
  it("vitrine|tabela|garment|diger kabul; geçersiz reddedilir", () => {
    for (const k of ["vitrine", "tabela", "garment", "diger"]) {
      expect(SurfaceKindSchema.parse(k)).toBe(k);
    }
    expect(() => SurfaceKindSchema.parse("facade")).toThrow(); // SceneKind ≠ SurfaceKind (F8-D işi)
    expect(() => SurfaceKindSchema.parse("")).toThrow();
  });
});

describe("IntakeSurfaceSchema (F8-A) — tek yapısal yüzey", () => {
  it("tam geçerli yüzey parse olur", () => {
    const s = IntakeSurfaceSchema.parse({
      kind: "vitrine",
      label: "Ön cam sol",
      w_cm: 218,
      h_cm: 134,
      note: "içten uygulama",
    });
    expect(s).toEqual({ kind: "vitrine", label: "Ön cam sol", w_cm: 218, h_cm: 134, note: "içten uygulama" });
  });

  it("kind varsayılan 'diger'; note varsayılan ''; w/h opsiyonel", () => {
    const s = IntakeSurfaceSchema.parse({ label: "Tabela" });
    expect(s.kind).toBe("diger");
    expect(s.note).toBe("");
    expect(s.w_cm).toBeUndefined();
    expect(s.h_cm).toBeUndefined();
  });

  it("label trim edilir; boş/salt-boşluk reddedilir (1..80)", () => {
    expect(IntakeSurfaceSchema.parse({ label: "  Arka cam  " }).label).toBe("Arka cam");
    expect(() => IntakeSurfaceSchema.parse({ label: "" })).toThrow();
    expect(() => IntakeSurfaceSchema.parse({ label: "   " })).toThrow(); // salt-boşluk → trim → "" → min(1)
    expect(() => IntakeSurfaceSchema.parse({ label: "x".repeat(81) })).toThrow();
    expect(IntakeSurfaceSchema.parse({ label: "x".repeat(80) }).label).toHaveLength(80);
  });

  it("w_cm/h_cm: 0<..≤2000; sıfır/negatif/2001 reddedilir", () => {
    expect(IntakeSurfaceSchema.parse({ label: "L", w_cm: 2000, h_cm: 0.5 }).w_cm).toBe(2000);
    expect(() => IntakeSurfaceSchema.parse({ label: "L", w_cm: 0 })).toThrow();
    expect(() => IntakeSurfaceSchema.parse({ label: "L", h_cm: -5 })).toThrow();
    expect(() => IntakeSurfaceSchema.parse({ label: "L", w_cm: 2001 })).toThrow();
  });

  it("note >300 reddedilir", () => {
    expect(() => IntakeSurfaceSchema.parse({ label: "L", note: "n".repeat(301) })).toThrow();
    expect(IntakeSurfaceSchema.parse({ label: "L", note: "n".repeat(300) }).note).toHaveLength(300);
  });
});

describe("ChecklistSurfacesSchema (F8-A) — dizi + geriye uyum", () => {
  it("boş dizi geçer (surfaces anahtarı VAR ama boş)", () => {
    expect(ChecklistSurfacesSchema.parse([])).toEqual([]);
  });

  it("çoklu geçerli yüzey parse olur", () => {
    const arr = ChecklistSurfacesSchema.parse([
      { kind: "vitrine", label: "Ön cam", w_cm: 218, h_cm: 134 },
      { kind: "tabela", label: "Tabela" },
    ]);
    expect(arr).toHaveLength(2);
    expect(arr[1]).toMatchObject({ kind: "tabela", label: "Tabela", note: "" });
  });

  it("dizide TEK bozuk eleman → tüm parse fırlatır (fail-loud, atomiklik zemini)", () => {
    expect(() =>
      ChecklistSurfacesSchema.parse([{ kind: "vitrine", label: "OK" }, { label: "" }])
    ).toThrow();
    expect(() =>
      ChecklistSurfacesSchema.parse([{ kind: "uçak", label: "L" }])
    ).toThrow();
  });
});

describe("migrateIntakeDraftV2toV3 (F8-A / D4 — additive migrate)", () => {
  it("v2 taslağa checklist.surfaces:[] ekler; KALAN HER ŞEY aynen", () => {
    /* Record<string, unknown> (taze literal DEĞİL) — persisted taslak gerçekte
       any-şekilli gelir; fn dönüşünü aynı şekilde okuruz. */
    const v2: Record<string, unknown> = {
      step: 3,
      clientMode: "new",
      products: [{ uid: "p1", name: { tr: "Kebap" } }],
      checklist: { logo: "var", contact_confirmed: true, size_note: "not", photo_policy: "musteri" },
      savedAt: 123,
    };
    const v3 = migrateIntakeDraftV2toV3(v2) as Record<string, any>;
    expect(v3.checklist.surfaces).toEqual([]); // additive
    expect(v3.checklist).toMatchObject({ logo: "var", contact_confirmed: true, size_note: "not", photo_policy: "musteri" }); // kalan aynen
    expect(v3.step).toBe(3);
    expect(v3.products).toEqual([{ uid: "p1", name: { tr: "Kebap" } }]);
    expect(v3.savedAt).toBe(123);
  });

  it("checklist yoksa da güvenli (surfaces:[] ile kurar)", () => {
    const out = migrateIntakeDraftV2toV3({ step: 1 } as Record<string, unknown>) as Record<string, any>;
    expect(out.checklist).toEqual({ surfaces: [] });
  });

  it("surfaces zaten varsa dokunmaz (idempotent — aynı referans)", () => {
    const x = { checklist: { surfaces: [{ label: "X" }] } };
    expect(migrateIntakeDraftV2toV3(x)).toBe(x);
  });
});
