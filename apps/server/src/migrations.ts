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
  /* v5 — Faz 4 (FAZ4-GOREV §4/§7/§9/§10 tek göçte):
     catalog_history: toplu fiyat öncesi otomatik yedek + elle geri yükleme;
     themes: özel tema kütüphanesi (yerleşikler kodda kalır);
     assets.tags: virgüllü etiketler (foto önerisi);
     parse_synonyms: parse sözlüğünün DB katmanı (çekirdek ∪ DB). */
  `
  CREATE TABLE IF NOT EXISTS catalog_history (
    id           TEXT PRIMARY KEY,
    client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    catalog_json TEXT NOT NULL,
    reason       TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS themes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    tokens_json TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  ALTER TABLE assets ADD COLUMN tags TEXT NOT NULL DEFAULT '';
  CREATE TABLE IF NOT EXISTS parse_synonyms (
    word         TEXT PRIMARY KEY,
    product_type TEXT NOT NULL
  );
  `,
  /* v6 — Faz 5 (FAZ5-GOREV §2): kullanıcı yüklenen fontlar. Dosyalar data/fonts/
     altında (git dışı); family UNIQUE (tema/kit seçicilerinde tekil ad). */
  `
  CREATE TABLE IF NOT EXISTS custom_fonts (
    id         TEXT PRIMARY KEY,
    family     TEXT NOT NULL UNIQUE,
    filename   TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
  /* v7 — Faz 5 (FAZ5-GOREV §9, mimar #16): dijital menü (statik HTML) MÜŞTERİ
     düzeyli export'tur — belge/proje değil, doğrudan katalog+kitten üretilir.
     export_records'e client_id eklenir; CHECK üç kaynaktan (belge|proje|müşteri)
     birine izin verir. v3 yeniden-kurma deseni; mevcut satırlar korunur.
     (#16 "yalnız Zod" yalnızca kind DEĞERİ içindi; kapsama kolonu ayrı konudur.) */
  `
  CREATE TABLE export_records_v7 (
    id            TEXT PRIMARY KEY,
    document_id   TEXT REFERENCES documents(id) ON DELETE CASCADE,
    project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
    client_id     TEXT REFERENCES clients(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    version       INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    CHECK (document_id IS NOT NULL OR project_id IS NOT NULL OR client_id IS NOT NULL)
  );
  INSERT INTO export_records_v7 (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
    SELECT id, document_id, project_id, kind, filepath, snapshot_json, version, created_at FROM export_records;
  DROP TABLE export_records;
  ALTER TABLE export_records_v7 RENAME TO export_records;
  `,
];
