import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/* Repo kökü: apps/server/src -> ../../..  (M7: her şey diskte, data/ altında) */
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(HERE, "..", "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const DB_PATH = path.join(DATA_DIR, "app.db");
export const ASSETS_DIR = path.join(DATA_DIR, "assets");
export const EXPORTS_DIR = path.join(DATA_DIR, "exports");
export const FONTS_DIR = path.join(DATA_DIR, "fonts"); // FAZ5 §7: kullanıcı fontları

export function ensureDirs(): void {
  for (const d of [
    DATA_DIR,
    ASSETS_DIR,
    path.join(ASSETS_DIR, "orig"),
    path.join(ASSETS_DIR, "master"),
    path.join(ASSETS_DIR, "thumb"),
    EXPORTS_DIR,
    FONTS_DIR,
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
}
