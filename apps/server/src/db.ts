import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./paths.js";
import { MIGRATIONS } from "./migrations.js";

/* CONSTITUTION §4.2 — şema migrations.ts'te; burada yalnız bağlantı + uygulama */

ensureDirs();

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate(): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec(MIGRATIONS[v]);
    db.pragma(`user_version = ${v + 1}`);
  }
}
