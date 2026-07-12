/* F8-A — yüzey profili: migration v10 replay + upsertClientSurfaces semantiği +
   extractSurfaces + CASCADE. db-enjekte (:memory:) — server route-harness'ı yok. */

import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { IntakeSurfaceSchema, type IntakeSurface } from "@tezgah/shared";
import { MIGRATIONS } from "./migrations.js";
import { extractSurfaces, surfacePrefillParams, upsertClientSurfaces } from "./surfaces.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const m of MIGRATIONS) db.exec(m); // v1..v10
  db.exec(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES ('cli1','Test','test','','EUR','fr','{}','{}','t0','t0')`
  );
  return db;
}

const surf = (o: Partial<IntakeSurface> & { label: string }): IntakeSurface =>
  IntakeSurfaceSchema.parse(o);

function countSurfaces(db: Database.Database, clientId = "cli1"): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM client_surfaces WHERE client_id = ?").get(clientId) as { n: number }).n;
}

describe("migration v10 (F8-A) — client_surfaces", () => {
  it("tablo v1..v10 replay sonrası var; kolonlar beklenen", () => {
    const db = freshDb();
    const cols = (db.prepare("PRAGMA table_info(client_surfaces)").all() as Array<{ name: string }>).map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining(["id", "client_id", "kind", "label", "w_cm", "h_cm", "note", "source_intake_id", "created_at", "updated_at"])
    );
    expect(countSurfaces(db)).toBe(0);
  });
});

describe("upsertClientSurfaces (F8-A / D2 UPSERT)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("farklı label → ayrı satır (2 yüzey → 2 satır)", () => {
    const r = upsertClientSurfaces(db, "cli1", [surf({ kind: "vitrine", label: "Ön cam", w_cm: 218, h_cm: 134 }), surf({ kind: "tabela", label: "Tabela" })], "intk1", "t1");
    expect(r).toEqual({ inserted: 2, updated: 0, total: 2 });
    expect(countSurfaces(db)).toBe(2);
  });

  it("aynı label (foldTr — büyük/küçük harf) → GÜNCELLENİR, çoğalmaz; id/created_at korunur", () => {
    upsertClientSurfaces(db, "cli1", [surf({ kind: "vitrine", label: "Ön cam", w_cm: 200, note: "eski" })], "intk1", "t1");
    const before = db.prepare("SELECT * FROM client_surfaces WHERE client_id='cli1'").get() as Record<string, unknown>;

    const r = upsertClientSurfaces(db, "cli1", [surf({ kind: "vitrine", label: "ÖN CAM", w_cm: 218, h_cm: 134, note: "yeni" })], "intk2", "t2");
    expect(r).toEqual({ inserted: 0, updated: 1, total: 1 });
    expect(countSurfaces(db)).toBe(1); // ÇİFT SATIR YOK

    const after = db.prepare("SELECT * FROM client_surfaces WHERE client_id='cli1'").get() as Record<string, unknown>;
    expect(after.id).toBe(before.id); // id korunur
    expect(after.created_at).toBe("t1"); // created_at korunur
    expect(after.updated_at).toBe("t2"); // updated_at yenilenir
    expect(after.w_cm).toBe(218);
    expect(after.h_cm).toBe(134);
    expect(after.note).toBe("yeni");
    expect(after.source_intake_id).toBe("intk2"); // son intake köprüsü
  });

  it("AYNI commit'te iki kez aynı label → tek satır (ikincisi ilkini günceller)", () => {
    const r = upsertClientSurfaces(db, "cli1", [surf({ label: "Cam", w_cm: 100 }), surf({ label: "cam", w_cm: 200 })], "intk1", "t1");
    expect(r.total).toBe(2);
    expect(countSurfaces(db)).toBe(1); // çift satır yok
    const row = db.prepare("SELECT w_cm FROM client_surfaces WHERE client_id='cli1'").get() as { w_cm: number };
    expect(row.w_cm).toBe(200); // ikincisi kazanır
  });

  it("boş surfaces → no-op", () => {
    expect(upsertClientSurfaces(db, "cli1", [], "intk1", "t1")).toEqual({ inserted: 0, updated: 0, total: 0 });
    expect(countSurfaces(db)).toBe(0);
  });

  it("CASCADE: müşteri silinince yüzeyleri de silinir (delete rotası dokunmaz)", () => {
    upsertClientSurfaces(db, "cli1", [surf({ label: "Ön cam" }), surf({ label: "Tabela" })], "intk1", "t1");
    expect(countSurfaces(db)).toBe(2);
    db.prepare("DELETE FROM clients WHERE id = 'cli1'").run();
    expect(countSurfaces(db)).toBe(0);
  });
});

describe("surfacePrefillParams (F8-A / D6) — belge ölçü ön-dolumu", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
    upsertClientSurfaces(db, "cli1", [
      surf({ kind: "vitrine", label: "Ön cam", w_cm: 218, h_cm: 134 }),
      surf({ kind: "tabela", label: "Tabela", w_cm: 400 }), // yalnız w
    ], "intk1", "t1");
  });

  it("vitro-* → vitrine yüzeyinin w/h'i", () => {
    expect(surfacePrefillParams(db, "cli1", "vitro-bandeau")).toEqual({ w_cm: 218, h_cm: 134 });
  });

  it("enseigne-panneau → tabela; yalnız w varsa yalnız w", () => {
    expect(surfacePrefillParams(db, "cli1", "enseigne-panneau")).toEqual({ w_cm: 400 });
  });

  it("eşleşmeyen şablon → {} (şablon varsayılanı)", () => {
    expect(surfacePrefillParams(db, "cli1", "menu-liste-premium")).toEqual({});
    expect(surfacePrefillParams(db, "cli1", "garment")).toEqual({}); // garment ön-dolumu yok
  });

  it("yüzey yoksa → {}", () => {
    const empty = freshDb();
    expect(surfacePrefillParams(empty, "cli1", "vitro-centre")).toEqual({});
  });
});

describe("extractSurfaces (F8-A) — geriye uyum + fail-loud", () => {
  it("surfaces anahtarı YOK → boş (eski intake_records)", () => {
    expect(extractSurfaces({})).toEqual([]);
    expect(extractSurfaces({ logo: "var", contact_confirmed: true })).toEqual([]);
    expect(extractSurfaces(undefined)).toEqual([]);
  });

  it("geçerli surfaces → parse edilir (note default'lu)", () => {
    const out = extractSurfaces({ surfaces: [{ kind: "vitrine", label: "Ön cam", w_cm: 218 }] });
    expect(out).toEqual([{ kind: "vitrine", label: "Ön cam", w_cm: 218, note: "" }]);
  });

  it("bozuk surfaces → FIRLAR (route 400'e çevirir, atomiklik)", () => {
    expect(() => extractSurfaces({ surfaces: [{ label: "" }] })).toThrow();
    expect(() => extractSurfaces({ surfaces: [{ kind: "uçak", label: "L" }] })).toThrow();
    expect(() => extractSurfaces({ surfaces: "değil-dizi" })).toThrow();
  });
});
