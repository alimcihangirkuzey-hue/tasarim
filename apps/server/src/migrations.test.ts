/* Mimar kararı #3 kanıtı: export_records yeniden kurulurken Faz 1 verisi ve
   akışı KIRILMAZ; proje bazlı sunum kayıtları mümkün olur; CHECK kapısı çalışır. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { CanvasDocSchema } from "@tezgah/shared";
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

describe("migration v9 (Faz 7 — intake_records)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    for (let i = 2; i <= 8; i++) db.exec(MIGRATIONS[i]);
  });

  it("intake_records: kayıt açılabilir; checklist_json default '{}'", () => {
    db.prepare(
      `INSERT INTO intake_records (id, client_id, answers_json, created_at)
       VALUES ('intk1', 'cli1', '{"items":[]}', 't')`
    ).run();
    expect(db.prepare("SELECT client_id, answers_json, checklist_json FROM intake_records WHERE id='intk1'").get()).toEqual({
      client_id: "cli1",
      answers_json: '{"items":[]}',
      checklist_json: "{}",
    });
  });

  it("müşteri silinince intake kaydı düşer (CASCADE)", () => {
    db.prepare(
      `INSERT INTO intake_records (id, client_id, answers_json, created_at) VALUES ('intk1', 'cli1', '{}', 't')`
    ).run();
    db.prepare("DELETE FROM clients WHERE id='cli1'").run();
    expect(db.prepare("SELECT 1 FROM intake_records WHERE id='intk1'").get()).toBeUndefined();
  });

  it("Faz 1-8 akışları kırılmadı: ingredient_library + önceki tablolar okunabilir", () => {
    for (const q of [
      "SELECT id, usage_count, source FROM ingredient_library LIMIT 1",
      "SELECT menu_language FROM clients LIMIT 1",
      "SELECT catalog_json FROM catalog_history LIMIT 1",
    ]) {
      expect(() => db.prepare(q).all(), q).not.toThrow();
    }
  });
});

describe("migration v11 (P3 CAP-LAYER-01 / D-48 — documents.canvas_json)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    for (let i = 2; i <= 10; i++) db.exec(MIGRATIONS[i]);
  });

  it("eski satır (doc1) NULL kalır — yokluk = eski davranış; veri dönüşümü yok", () => {
    expect(db.prepare("SELECT canvas_json FROM documents WHERE id='doc1'").get()).toEqual({
      canvas_json: null,
    });
  });

  it("canvas_json yazılır-okunur; içerik CanvasDocSchema'dan geçer (rowToDocument köprüsünün DB yarısı)", () => {
    const canvasDoc = {
      v: 1,
      layers: [
        {
          id: "ly_1",
          name: "Katman 1",
          locked: false,
          visible: true,
          shapes: [{ id: "sh1", kind: "rect", x: 10, y: 20, w: 100, h: 50 }],
        },
      ],
    };
    db.prepare("UPDATE documents SET canvas_json = ? WHERE id='doc1'").run(
      JSON.stringify(canvasDoc)
    );
    const row = db.prepare("SELECT canvas_json FROM documents WHERE id='doc1'").get() as {
      canvas_json: string;
    };
    expect(CanvasDocSchema.parse(JSON.parse(row.canvas_json))).toEqual(canvasDoc);
  });

  it("canvas_json'suz INSERT NULL alır (yeni belge canvas'sız doğar — create şemasında alan yok)", () => {
    db.prepare(
      `INSERT INTO documents (id, project_id, template_id, created_at, updated_at)
       VALUES ('doc2', 'prj1', 'menu-grid-cells', 't', 't')`
    ).run();
    expect(db.prepare("SELECT canvas_json FROM documents WHERE id='doc2'").get()).toEqual({
      canvas_json: null,
    });
  });

  it("Faz 1-8 akışları kırılmadı: documents JSON kolonları + önceki tablolar okunabilir", () => {
    for (const q of [
      "SELECT params_json, selection_json, overrides_json, status FROM documents LIMIT 1",
      "SELECT client_id, kind, label, w_cm, h_cm FROM client_surfaces LIMIT 1",
      "SELECT client_id, answers_json FROM intake_records LIMIT 1",
      "SELECT menu_language, currency FROM clients LIMIT 1",
      "SELECT document_id, project_id, client_id FROM export_records LIMIT 1",
    ]) {
      expect(() => db.prepare(q).all(), q).not.toThrow();
    }
  });
});

describe("migration v12 (F1 pilot P1 / D-61 — briefs + brief_audit + brief_files)", () => {
  let db: Database.Database;

  const insertBrief = (d: Database.Database, id: string, key: string, extra = "NULL") =>
    d.prepare(
      `INSERT INTO briefs (id, source_system, request_type, idempotency_key, customer_ref, created_at, updated_at)
       VALUES (?, 'swiss_restoran', 'menu_refresh', ?, ${extra}, 't', 't')`
    ).run(id, key);

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    for (let i = 2; i <= 11; i++) db.exec(MIGRATIONS[i]);
    db.exec(`INSERT INTO assets (id, client_id, kind, filename, created_at)
             VALUES ('ast1', 'cli1', 'logo', 'ast1.svg', 't')`);
  });

  it("üç tablo + indeksler açıldı; default'lar spec'e uygun", () => {
    insertBrief(db, "brf1", "idem-1");
    const row = db.prepare("SELECT * FROM briefs WHERE id='brf1'").get() as Record<string, unknown>;
    expect(row).toMatchObject({
      status: "DRAFT",
      requested_publications_json: "[]",
      language_requirements_json: "[]",
      requester_notes: "",
      customer_ref: null,
    });
    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_brief%' ORDER BY name")
      .all() as Array<{ name: string }>;
    expect(idx.map((i) => i.name)).toEqual([
      "idx_brief_audit_brief",
      "idx_brief_files_brief",
      "idx_briefs_customer",
      "idx_briefs_status",
    ]);
  });

  it("v12 TEKRAR koşulabilir (idempotent — IF NOT EXISTS); veri kaybolmaz", () => {
    insertBrief(db, "brf1", "idem-1");
    expect(() => db.exec(MIGRATIONS[11])).not.toThrow();
    expect(db.prepare("SELECT COUNT(*) AS c FROM briefs").get()).toMatchObject({ c: 1 });
  });

  it("F1.6 DB GARANTİSİ: aynı idempotency_key İKİNCİ kez giremez (çift gönderim → tek Brief)", () => {
    insertBrief(db, "brf1", "idem-1");
    expect(() => insertBrief(db, "brf2", "idem-1")).toThrow(/UNIQUE/i);
    expect(db.prepare("SELECT COUNT(*) AS c FROM briefs").get()).toMatchObject({ c: 1 });
  });

  it("idempotency_key NOT NULL: anahtarsız brief açılamaz", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO briefs (id, source_system, request_type, created_at, updated_at)
           VALUES ('brfX', 'swiss_restoran', 'menu_refresh', 't', 't')`
        )
        .run()
    ).toThrow(/NOT NULL/i);
  });

  it("status CHECK: yalnız 6 F1 durumu; uydurma durum reddedilir", () => {
    for (const s of [
      "DRAFT",
      "INCOMPLETE",
      "READY_FOR_DESIGN",
      "DESIGN_IN_PROGRESS",
      "READY_FOR_PRODUCTION_REVIEW",
      "PRODUCTION_READY",
    ]) {
      db.prepare("UPDATE briefs SET status = ? WHERE id = 'brf1'").run(s); // satır yoksa no-op
      expect(() =>
        db
          .prepare(
            `INSERT INTO briefs (id, source_system, request_type, idempotency_key, status, created_at, updated_at)
             VALUES (?, 's', 'r', ?, ?, 't', 't')`
          )
          .run(`b_${s}`, `k_${s}`, s)
      ).not.toThrow();
    }
    expect(() =>
      db
        .prepare(
          `INSERT INTO briefs (id, source_system, request_type, idempotency_key, status, created_at, updated_at)
           VALUES ('bad', 's', 'r', 'k_bad', 'ARCHIVED', 't', 't')`
        )
        .run()
    ).toThrow(/CHECK/i);
  });

  it("brief silinince audit + files CASCADE düşer", () => {
    insertBrief(db, "brf1", "idem-1");
    db.prepare(
      `INSERT INTO brief_audit (id, brief_id, event_type, warning_code, acknowledged_by, acknowledged_at, reason, source_file_version, created_at)
       VALUES ('aud1', 'brf1', 'warning_acknowledged', 'low_dpi', 'operator:ayse', 't', 'müşteri onayladı', 2, 't')`
    ).run();
    db.prepare(
      `INSERT INTO brief_files (id, brief_id, asset_id, role, version, status, created_at, updated_at)
       VALUES ('bf1', 'brf1', 'ast1', 'logo', 1, 'valid', 't', 't')`
    ).run();
    db.prepare("DELETE FROM briefs WHERE id='brf1'").run();
    expect(db.prepare("SELECT COUNT(*) AS c FROM brief_audit").get()).toMatchObject({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) AS c FROM brief_files").get()).toMatchObject({ c: 0 });
  });

  it("ŞERHLİ SAPMA: müşteri silinince brief KALIR, customer_ref NULL olur (denetim izi korunur)", () => {
    insertBrief(db, "brf1", "idem-1", "'cli1'");
    expect(db.prepare("SELECT customer_ref FROM briefs WHERE id='brf1'").get()).toEqual({
      customer_ref: "cli1",
    });
    db.prepare("DELETE FROM clients WHERE id='cli1'").run();
    expect(db.prepare("SELECT id, customer_ref FROM briefs WHERE id='brf1'").get()).toEqual({
      id: "brf1",
      customer_ref: null,
    });
  });

  it("brief_files: status CHECK valid|invalid (F1.7 zemini) + varsayılan version 1/valid", () => {
    insertBrief(db, "brf1", "idem-1");
    db.prepare(
      `INSERT INTO brief_files (id, brief_id, asset_id, role, created_at, updated_at)
       VALUES ('bf1', 'brf1', 'ast1', 'logo', 't', 't')`
    ).run();
    expect(db.prepare("SELECT version, status FROM brief_files WHERE id='bf1'").get()).toEqual({
      version: 1,
      status: "valid",
    });
    expect(() =>
      db
        .prepare(
          `INSERT INTO brief_files (id, brief_id, asset_id, role, status, created_at, updated_at)
           VALUES ('bf2', 'brf1', 'ast1', 'logo', 'bozuk', 't', 't')`
        )
        .run()
    ).toThrow(/CHECK/i);
  });

  it("assets tablosuna DOKUNULMADI: köprü FK'sı çalışır, asset silinince köprü düşer", () => {
    insertBrief(db, "brf1", "idem-1");
    db.prepare(
      `INSERT INTO brief_files (id, brief_id, asset_id, role, created_at, updated_at)
       VALUES ('bf1', 'brf1', 'ast1', 'logo', 't', 't')`
    ).run();
    expect(() => db.prepare("SELECT tags, kind, filename FROM assets WHERE id='ast1'").all()).not.toThrow();
    db.prepare("DELETE FROM assets WHERE id='ast1'").run();
    expect(db.prepare("SELECT COUNT(*) AS c FROM brief_files").get()).toMatchObject({ c: 0 });
  });

  it("Faz 1-P3 akışları kırılmadı: documents.canvas_json + önceki tablolar aynen okunur", () => {
    for (const q of [
      "SELECT canvas_json, params_json, status FROM documents LIMIT 1",
      "SELECT client_id, kind, label FROM client_surfaces LIMIT 1",
      "SELECT client_id, answers_json FROM intake_records LIMIT 1",
      "SELECT menu_language, currency FROM clients LIMIT 1",
      "SELECT id, family FROM custom_fonts LIMIT 1",
    ]) {
      expect(() => db.prepare(q).all(), q).not.toThrow();
    }
  });
});

describe("migration v13 (F1 pilot P4 — briefs.spec_values_json)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    seedV2(db);
    for (let i = 2; i <= 11; i++) db.exec(MIGRATIONS[i]);
    db.prepare(
      `INSERT INTO briefs (id, source_system, request_type, idempotency_key, created_at, updated_at)
       VALUES ('brf_eski', 's', 'menu', 'k1', 't', 't')`
    ).run();
    db.exec(MIGRATIONS[12]);
  });

  it("eski satır '{}' alır (yokluk); veri dönüşümü yok", () => {
    expect(db.prepare("SELECT spec_values_json FROM briefs WHERE id='brf_eski'").get()).toEqual({
      spec_values_json: "{}",
    });
  });

  it("spec değerleri yazılır-okunur (BLOCKER-3'ün evi)", () => {
    const values = {
      format: "a4-portrait",
      orientation: "portrait",
      qr_target_url: "https://ornek",
      print_quantity: 500,
      print_material: "kuşe 170gr",
      color_font_choice: "marka kiti",
    };
    db.prepare("UPDATE briefs SET spec_values_json = ? WHERE id='brf_eski'").run(
      JSON.stringify(values)
    );
    const row = db.prepare("SELECT spec_values_json FROM briefs WHERE id='brf_eski'").get() as {
      spec_values_json: string;
    };
    expect(JSON.parse(row.spec_values_json)).toEqual(values);
  });

  it("13 sözleşme alanı + status DEĞİŞMEDİ (additive: 17 → 18 kolon)", () => {
    const cols = (db.prepare("PRAGMA table_info(briefs)").all() as Array<{ name: string }>).map(
      (c) => c.name
    );
    expect(cols).toHaveLength(18);
    expect(cols.at(-1)).toBe("spec_values_json");
    for (const c of ["idempotency_key", "status", "customer_ref", "requested_publications_json"]) {
      expect(cols, c).toContain(c);
    }
  });

  it("v12 akışları kırılmadı: audit + files + UNIQUE + CHECK yerinde", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO briefs (id, source_system, request_type, idempotency_key, status, created_at, updated_at)
           VALUES ('b2', 's', 'menu', 'k1', 'DRAFT', 't', 't')`
        )
        .run()
    ).toThrow(/UNIQUE/i);
    expect(() =>
      db
        .prepare(
          `INSERT INTO briefs (id, source_system, request_type, idempotency_key, status, created_at, updated_at)
           VALUES ('b3', 's', 'menu', 'k3', 'ARCHIVED', 't', 't')`
        )
        .run()
    ).toThrow(/CHECK/i);
    expect(() => db.prepare("SELECT warning_code FROM brief_audit LIMIT 1").all()).not.toThrow();
    expect(() => db.prepare("SELECT version, status FROM brief_files LIMIT 1").all()).not.toThrow();
  });
});

describe("brief_audit APPEND-ONLY sözleşmesi (uygulama katmanı — repo taraması)", () => {
  /* Sözleşme: tarihçe yerinde DEĞİŞTİRİLMEZ. Kod tabanında brief_audit'e UPDATE
     ya da DELETE yazan bir yol BULUNMAMALI (üst kaydın CASCADE temizliği hariç —
     o ebeveyn silmenin sonucudur, tarihçe mutasyonu değil). */
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...sourceFiles(full));
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) out.push(full);
    }
    return out;
  }

  it("sunucu kaynağında brief_audit'e UPDATE/DELETE yolu YOK", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = fs.readFileSync(file, "utf8");
      if (/\bUPDATE\s+brief_audit\b/i.test(text) || /\bDELETE\s+FROM\s+brief_audit\b/i.test(text)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
