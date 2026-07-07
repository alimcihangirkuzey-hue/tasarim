/* Mimar kararı #3 kanıtı: export_records yeniden kurulurken Faz 1 verisi ve
   akışı KIRILMAZ; proje bazlı sunum kayıtları mümkün olur; CHECK kapısı çalışır. */

import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS } from "./migrations.js";

function seedV2(db: Database.Database): void {
  db.exec(MIGRATIONS[0]);
  db.exec(MIGRATIONS[1]);
  db.exec(`
    INSERT INTO clients (id, name, slug, brandkit_json, catalog_json, created_at, updated_at)
      VALUES ('cli1', 'Test', 'test', '{}', '{}', 't', 't');
    INSERT INTO projects (id, client_id, name, created_at) VALUES ('prj1', 'cli1', 'Genel', 't');
    INSERT INTO documents (id, project_id, template_id, created_at, updated_at)
      VALUES ('doc1', 'prj1', 'menu-grid-cells', 't', 't');
    INSERT INTO export_records (id, document_id, kind, filepath, snapshot_json, version, created_at)
      VALUES ('exp1', 'doc1', 'print', 'data/exports/x_v1_print.pdf', '{}', 1, 't'),
             ('exp2', 'doc1', 'preview', 'data/exports/x_v1_preview.pdf', '{}', 1, 't');
  `);
}

describe("migration v3 (mimar kararı #3)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    db.exec(MIGRATIONS[2]);
  });

  it("Faz 1 export kayıtları aynen korunur", () => {
    const rows = db
      .prepare("SELECT * FROM export_records ORDER BY id")
      .all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "exp1",
      document_id: "doc1",
      project_id: null,
      kind: "print",
      version: 1,
    });
  });

  it("Faz 1 akışı kırılmaz: belge bazlı versiyon sayacı ve yeni belge kaydı", () => {
    const v =
      ((db
        .prepare("SELECT MAX(version) AS v FROM export_records WHERE document_id = ?")
        .get("doc1") as { v: number | null }).v ?? 0) + 1;
    expect(v).toBe(2);
    db.prepare(
      `INSERT INTO export_records (id, document_id, kind, filepath, snapshot_json, version, created_at)
       VALUES ('exp3', 'doc1', 'print', 'f', '{}', ?, 't')`
    ).run(v);
    expect(db.prepare("SELECT COUNT(*) AS c FROM export_records").get()).toMatchObject({ c: 3 });
  });

  it("proje bazlı sunum kaydı açılabilir (document_id NULL)", () => {
    db.prepare(
      `INSERT INTO export_records (id, project_id, kind, filepath, snapshot_json, version, created_at)
       VALUES ('expP', 'prj1', 'presentation', 'data/exports/x_v1_presentation.pdf', '{}', 1, 't')`
    ).run();
    const row = db.prepare("SELECT * FROM export_records WHERE id = 'expP'").get() as Record<string, unknown>;
    expect(row).toMatchObject({ document_id: null, project_id: "prj1", kind: "presentation" });
  });

  it("CHECK: document_id ve project_id ikisi birden NULL olamaz", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO export_records (id, kind, filepath, snapshot_json, version, created_at)
           VALUES ('expX', 'print', 'f', '{}', 1, 't')`
        )
        .run()
    ).toThrow(/CHECK/i);
  });

  it("order_items tablosu ve projects yeni kolonları hazır", () => {
    db.prepare(
      `INSERT INTO order_items (id, project_id, product_type, created_at, updated_at)
       VALUES ('oi1', 'prj1', 'vitrophanie', 't', 't')`
    ).run();
    db.prepare("UPDATE projects SET due_date = '2026-07-20', source_text = 'ham' WHERE id = 'prj1'").run();
    const p = db.prepare("SELECT due_date, source_text FROM projects WHERE id='prj1'").get();
    expect(p).toEqual({ due_date: "2026-07-20", source_text: "ham" });
  });

  it("belge silinince kaydı düşer (CASCADE korunu)", () => {
    db.prepare("DELETE FROM documents WHERE id = 'doc1'").run();
    expect(db.prepare("SELECT COUNT(*) AS c FROM export_records").get()).toMatchObject({ c: 0 });
  });
});
