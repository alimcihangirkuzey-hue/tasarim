/* Migration dizisi — CONSTITUTION §4.2. db.ts uygular; migrations.test.ts
   :memory: üzerinde replay ederek eski akışların kırılmadığını kanıtlar. */

export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS clients (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    notes         TEXT NOT NULL DEFAULT '',
    brandkit_json TEXT NOT NULL,
    catalog_json  TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id         TEXT PRIMARY KEY,
    client_id  TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documents (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id    TEXT NOT NULL,
    params_json    TEXT NOT NULL DEFAULT '{}',
    theme_id       TEXT NOT NULL DEFAULT 'brand',
    selection_json TEXT NOT NULL DEFAULT '{}',
    overrides_json TEXT NOT NULL DEFAULT '{}',
    status         TEXT NOT NULL DEFAULT 'draft',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS assets (
    id         TEXT PRIMARY KEY,
    client_id  TEXT REFERENCES clients(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL DEFAULT 'other',
    filename   TEXT NOT NULL,
    width_px   INTEGER NOT NULL DEFAULT 0,
    height_px  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS export_records (
    id            TEXT PRIMARY KEY,
    document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    version       INTEGER NOT NULL,
    created_at    TEXT NOT NULL
  );
  `,
  // v2 — Faz 1: müşteri bazında para birimi (FAZ1-GOREV §2.1)
  `ALTER TABLE clients ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';`,
  // v3 — Faz 2: Sipariş Defteri (FAZ2-GOREV §2.1) + export_records yeniden kurma (mimar kararı #3)
  `
  ALTER TABLE projects ADD COLUMN due_date TEXT;
  ALTER TABLE projects ADD COLUMN source_text TEXT;

  CREATE TABLE IF NOT EXISTS order_items (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL,
    qty          INTEGER NOT NULL DEFAULT 1,
    width_cm     REAL,
    height_cm    REAL,
    details_json TEXT NOT NULL DEFAULT '{}',
    notes        TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'olcu_bekliyor',
    document_id  TEXT REFERENCES documents(id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  /* export_records: document_id artık NULL olabilir; project_id eklendi (sunum PDF'leri
     proje bazlı kayıt açar). SQLite yeniden-kurma deseni — mevcut satırlar korunur. */
  CREATE TABLE export_records_v3 (
    id            TEXT PRIMARY KEY,
    document_id   TEXT REFERENCES documents(id) ON DELETE CASCADE,
    project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    version       INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    CHECK (document_id IS NOT NULL OR project_id IS NOT NULL)
  );
  INSERT INTO export_records_v3 (id, document_id, kind, filepath, snapshot_json, version, created_at)
    SELECT id, document_id, kind, filepath, snapshot_json, version, created_at FROM export_records;
  DROP TABLE export_records;
  ALTER TABLE export_records_v3 RENAME TO export_records;
  `,
  /* v4 — Faz 3: mockup sahneleri (FAZ3-GOREV §2). CONSTITUTION §4.2'de "Faz 3"
     olarak işaretlenen tablo burada İLK KEZ açılır; paketin istediği kind ve
     settings_json kolonları baştan dahildir. client_id NULL = ortak sahne. */
  `
  CREATE TABLE IF NOT EXISTS mockup_scenes (
    id             TEXT PRIMARY KEY,
    client_id      TEXT REFERENCES clients(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    photo_asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quad_json      TEXT NOT NULL,
    kind           TEXT NOT NULL DEFAULT 'generic',
    settings_json  TEXT NOT NULL DEFAULT '{}',
    created_at     TEXT NOT NULL
  );
  `,
];
