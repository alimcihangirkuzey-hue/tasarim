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

describe("migration v4 (Faz 3 — mockup_scenes)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    db.exec(MIGRATIONS[2]);
    db.exec(MIGRATIONS[3]);
    db.exec(`INSERT INTO assets (id, client_id, kind, filename, created_at)
             VALUES ('ast1', 'cli1', 'photo', 'ast1.jpg', 't'),
                    ('astC', NULL, 'photo', 'astC.jpg', 't')`);
  });

  it("müşteri sahnesi ve ORTAK sahne (client_id NULL) açılabilir; defaultlar doğru", () => {
    db.prepare(
      `INSERT INTO mockup_scenes (id, client_id, name, photo_asset_id, quad_json, created_at)
       VALUES ('sc1', 'cli1', 'Vitrin', 'ast1', '[]', 't')`
    ).run();
    db.prepare(
      `INSERT INTO mockup_scenes (id, client_id, name, photo_asset_id, quad_json, kind, settings_json, created_at)
       VALUES ('sc2', NULL, 'Ortak tişört', 'astC', '[]', 'garment', '{"blend":"multiply"}', 't')`
    ).run();
    const sc1 = db.prepare("SELECT * FROM mockup_scenes WHERE id='sc1'").get() as Record<string, unknown>;
    expect(sc1).toMatchObject({ kind: "generic", settings_json: "{}" });
  });

  it("müşteri silinince sahnesi düşer, ortak sahne kalır; Faz 1-2 tabloları sağlam", () => {
    db.prepare(
      `INSERT INTO mockup_scenes (id, client_id, name, photo_asset_id, quad_json, created_at)
       VALUES ('sc1', 'cli1', 'Vitrin', 'ast1', '[]', 't'),
              ('sc2', NULL, 'Ortak', 'astC', '[]', 't')`
    ).run();
    db.prepare("DELETE FROM clients WHERE id = 'cli1'").run();
    const kalan = db.prepare("SELECT id FROM mockup_scenes").all() as Array<{ id: string }>;
    expect(kalan.map((r) => r.id)).toEqual(["sc2"]);
    /* Faz 2 akışı: order_items + export_records şeması yerinde */
    expect(db.prepare("SELECT COUNT(*) AS c FROM order_items").get()).toMatchObject({ c: 0 });
    expect(() =>
      db.prepare("SELECT document_id, project_id FROM export_records LIMIT 1").all()
    ).not.toThrow();
  });
});

describe("migration v5 (Faz 4 — catalog_history, themes, assets.tags, parse_synonyms)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    db.exec(MIGRATIONS[2]);
    db.exec(MIGRATIONS[3]);
    db.exec(MIGRATIONS[4]);
  });

  it("dört ek de yerinde; assets.tags default boş dize", () => {
    db.prepare(
      `INSERT INTO catalog_history (id, client_id, catalog_json, reason, created_at)
       VALUES ('ch1', 'cli1', '{}', 'toplu +%5', 't')`
    ).run();
    db.prepare(
      `INSERT INTO themes (id, name, tokens_json, created_at) VALUES ('th1', 'Özel', '{}', 't')`
    ).run();
    db.prepare(
      `INSERT INTO parse_synonyms (word, product_type) VALUES ('cephe', 'tabela')`
    ).run();
    db.prepare(
      `INSERT INTO assets (id, client_id, kind, filename, created_at)
       VALUES ('astT', 'cli1', 'photo', 't.jpg', 't')`
    ).run();
    const a = db.prepare("SELECT tags FROM assets WHERE id='astT'").get();
    expect(a).toEqual({ tags: "" });
    db.prepare("UPDATE assets SET tags = 'adana, brochette' WHERE id='astT'").run();
    expect(db.prepare("SELECT tags FROM assets WHERE id='astT'").get()).toEqual({
      tags: "adana, brochette",
    });
  });

  it("müşteri silinince katalog geçmişi düşer (CASCADE); tema ve sözlük kalır", () => {
    db.exec(`
      INSERT INTO catalog_history (id, client_id, catalog_json, created_at) VALUES ('ch1','cli1','{}','t');
      INSERT INTO themes (id, name, tokens_json, created_at) VALUES ('th1','Özel','{}','t');
      INSERT INTO parse_synonyms (word, product_type) VALUES ('cephe','tabela');
    `);
    db.prepare("DELETE FROM clients WHERE id='cli1'").run();
    expect(db.prepare("SELECT COUNT(*) AS c FROM catalog_history").get()).toMatchObject({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) AS c FROM themes").get()).toMatchObject({ c: 1 });
    expect(db.prepare("SELECT COUNT(*) AS c FROM parse_synonyms").get()).toMatchObject({ c: 1 });
  });

  it("parse_synonyms.word PRIMARY KEY: aynı kelime ikinci kez giremez", () => {
    db.prepare("INSERT INTO parse_synonyms (word, product_type) VALUES ('cephe','tabela')").run();
    expect(() =>
      db.prepare("INSERT INTO parse_synonyms (word, product_type) VALUES ('cephe','vitrophanie')").run()
    ).toThrow(/UNIQUE|PRIMARY/i);
  });

  it("Faz 1-3 akışları kırılmadı: export_records CHECK + mockup_scenes yerinde", () => {
    expect(() =>
      db.prepare("SELECT document_id, project_id FROM export_records LIMIT 1").all()
    ).not.toThrow();
    expect(() =>
      db.prepare("SELECT kind, settings_json FROM mockup_scenes LIMIT 1").all()
    ).not.toThrow();
  });
});

describe("migration v6 (Faz 5 — custom_fonts)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    db.exec(MIGRATIONS[2]);
    db.exec(MIGRATIONS[3]);
    db.exec(MIGRATIONS[4]);
    db.exec(MIGRATIONS[5]);
  });

  it("custom_fonts tablosu yerinde; family UNIQUE", () => {
    db.prepare(
      "INSERT INTO custom_fonts (id, family, filename, created_at) VALUES ('fnt1', 'Menu Sans', 'fnt1.woff2', 't')"
    ).run();
    const row = db.prepare("SELECT family, filename FROM custom_fonts WHERE id='fnt1'").get();
    expect(row).toEqual({ family: "Menu Sans", filename: "fnt1.woff2" });
    expect(() =>
      db.prepare(
        "INSERT INTO custom_fonts (id, family, filename, created_at) VALUES ('fnt2', 'Menu Sans', 'fnt2.ttf', 't')"
      ).run()
    ).toThrow(/UNIQUE/i);
  });

  it("Faz 1-5 akışları kırılmadı: tüm önceki tablolar okunabilir", () => {
    for (const q of [
      "SELECT document_id, project_id FROM export_records LIMIT 1",
      "SELECT kind, settings_json FROM mockup_scenes LIMIT 1",
      "SELECT catalog_json FROM catalog_history LIMIT 1",
      "SELECT tokens_json FROM themes LIMIT 1",
      "SELECT tags FROM assets LIMIT 1",
      "SELECT word FROM parse_synonyms LIMIT 1",
    ]) {
      expect(() => db.prepare(q).all(), q).not.toThrow();
    }
  });
});

describe("migration v7 (Faz 5 — export_records.client_id, dijital menü)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    for (let i = 2; i <= 6; i++) db.exec(MIGRATIONS[i]);
  });

  it("müşteri düzeyli digital_menu kaydı açılabilir (belge+proje NULL, client_id dolu)", () => {
    db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, client_id, kind, filepath, snapshot_json, version, created_at)
       VALUES ('expdm', NULL, NULL, 'cli1', 'digital_menu', 'data/exports/test/x_menu-digital_v1.html', '{}', 1, 't')`
    ).run();
    const row = db.prepare("SELECT client_id, kind, document_id, project_id FROM export_records WHERE id='expdm'").get();
    expect(row).toEqual({ client_id: "cli1", kind: "digital_menu", document_id: null, project_id: null });
  });

  it("CHECK: belge, proje ve müşteri üçü birden NULL olamaz", () => {
    expect(() =>
      db.prepare(
        `INSERT INTO export_records (id, document_id, project_id, client_id, kind, filepath, snapshot_json, version, created_at)
         VALUES ('bad', NULL, NULL, NULL, 'digital_menu', 'x', '{}', 1, 't')`
      ).run()
    ).toThrow(/CHECK/i);
  });

  it("Faz 1 belge bazlı kayıtlar (exp1/exp2) korunur; client_id NULL", () => {
    const rows = db
      .prepare("SELECT id, document_id, client_id FROM export_records WHERE id IN ('exp1','exp2') ORDER BY id")
      .all();
    expect(rows).toEqual([
      { id: "exp1", document_id: "doc1", client_id: null },
      { id: "exp2", document_id: "doc1", client_id: null },
    ]);
  });

  it("müşteri silinince digital_menu kaydı düşer (client_id CASCADE)", () => {
    db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, client_id, kind, filepath, snapshot_json, version, created_at)
       VALUES ('expdm', NULL, NULL, 'cli1', 'digital_menu', 'x', '{}', 1, 't')`
    ).run();
    db.prepare("DELETE FROM clients WHERE id='cli1'").run();
    expect(db.prepare("SELECT 1 FROM export_records WHERE id='expdm'").get()).toBeUndefined();
  });

  it("Faz 1-5 akışları kırılmadı: custom_fonts + önceki tablolar okunabilir", () => {
    for (const q of [
      "SELECT id, family FROM custom_fonts LIMIT 1",
      "SELECT client_id, kind FROM export_records LIMIT 1",
      "SELECT settings_json FROM mockup_scenes LIMIT 1",
      "SELECT tokens_json FROM themes LIMIT 1",
    ]) {
      expect(() => db.prepare(q).all(), q).not.toThrow();
    }
  });
});

describe("migration v8 (Faz 7 — ingredient_library + clients.menu_language)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    for (let i = 2; i <= 7; i++) db.exec(MIGRATIONS[i]);
  });

  it("ingredient_library: seed kaydı; fr/de/usage_count default; learned kaydı", () => {
    db.prepare(
      `INSERT INTO ingredient_library (id, tr, source, created_at) VALUES ('ing_et', 'Et', 'seed', 't')`
    ).run();
    /* fr/de '' , usage_count 0 default (TR tıkla / FR-DE sonradan basılır) */
    expect(db.prepare("SELECT * FROM ingredient_library WHERE id='ing_et'").get()).toMatchObject({
      id: "ing_et", tr: "Et", fr: "", de: "", usage_count: 0, source: "seed",
    });
    db.prepare(
      `INSERT INTO ingredient_library (id, tr, fr, de, usage_count, source, created_at)
       VALUES ('ing_x', 'Yeni', 'Nouveau', 'Neu', 3, 'learned', 't')`
    ).run();
    expect(
      db.prepare("SELECT source, usage_count FROM ingredient_library WHERE id='ing_x'").get()
    ).toEqual({ source: "learned", usage_count: 3 });
  });

  it("ingredient_library.source yalnız seed|learned (CHECK)", () => {
    expect(() =>
      db
        .prepare(`INSERT INTO ingredient_library (id, tr, source, created_at) VALUES ('bad', 'X', 'imported', 't')`)
        .run()
    ).toThrow(/CHECK/i);
  });

  it("ingredient_library.id PRIMARY KEY: aynı id ikinci kez giremez", () => {
    db.prepare(`INSERT INTO ingredient_library (id, tr, source, created_at) VALUES ('dup', 'A', 'seed', 't')`).run();
    expect(() =>
      db.prepare(`INSERT INTO ingredient_library (id, tr, source, created_at) VALUES ('dup', 'B', 'learned', 't')`).run()
    ).toThrow(/UNIQUE|PRIMARY/i);
  });

  it("clients.menu_language: mevcut satır 'fr' default alır (geriye uyumlu); 'de' güncellenebilir", () => {
    /* cli1 seedV2'de menu_language'sız eklendi → ALTER DEFAULT 'fr' */
    expect(db.prepare("SELECT menu_language FROM clients WHERE id='cli1'").get()).toEqual({
      menu_language: "fr",
    });
    db.prepare("UPDATE clients SET menu_language='de' WHERE id='cli1'").run();
    expect(db.prepare("SELECT menu_language FROM clients WHERE id='cli1'").get()).toEqual({
      menu_language: "de",
    });
  });

  it("ingredient_library GLOBAL: müşteri silinince kalır (client_id bağı yok — K2)", () => {
    db.prepare(`INSERT INTO ingredient_library (id, tr, source, created_at) VALUES ('g', 'Global', 'seed', 't')`).run();
    db.prepare("DELETE FROM clients WHERE id='cli1'").run();
    expect(db.prepare("SELECT COUNT(*) AS c FROM ingredient_library").get()).toMatchObject({ c: 1 });
  });

  it("Faz 1-7 akışları kırılmadı: önceki tablolar + kolonlar okunabilir", () => {
    for (const q of [
      "SELECT menu_language, currency FROM clients LIMIT 1",
      "SELECT id, family FROM custom_fonts LIMIT 1",
      "SELECT client_id, kind FROM export_records LIMIT 1",
      "SELECT settings_json FROM mockup_scenes LIMIT 1",
      "SELECT word FROM parse_synonyms LIMIT 1",
    ]) {
      expect(() => db.prepare(q).all(), q).not.toThrow();
    }
  });
});
