import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./paths.js";

/* CONSTITUTION §4.2 — tablolar Faz 1+ için de şimdiden açılır */

ensureDirs();

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const MIGRATIONS: string[] = [
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
];

export function migrate(): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec(MIGRATIONS[v]);
    db.pragma(`user_version = ${v + 1}`);
  }
}
