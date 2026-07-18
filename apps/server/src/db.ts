import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./paths.js";
import { MIGRATIONS } from "./migrations.js";

/* CONSTITUTION §4.2 — şema migrations.ts'te; burada yalnız bağlantı + uygulama.

   P0 (route-test harness): bağlantı artık ENJEKTE EDİLEBİLİR. Üretim yolu
   BİREBİR aynı (env yoksa DB_PATH; aynı pragma'lar; aynı sıra). Testler
   `TEZGAH_DB_PATH` ile izole bir dosya/:memory: açar (import anında — canlı
   app.db'ye hiç dokunulmaz) ya da setDatabase ile takas eder. Rotalar `db`yi
   ÇAĞRI ANINDA okur (ESM canlı bağ) → 24 rota dosyasının imzası DEĞİŞMEZ. */

ensureDirs();

export function openDatabase(file: string): Database.Database {
  const instance = new Database(file);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  return instance;
}

export let db: Database.Database = openDatabase(process.env.TEZGAH_DB_PATH ?? DB_PATH);

/** YALNIZ test harness'ı: etkin bağlantıyı takas eder (üretim yolunda çağrılmaz). */
export function setDatabase(instance: Database.Database): void {
  db = instance;
}

export function migrate(target: Database.Database = db): void {
  const current = target.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    target.exec(MIGRATIONS[v]);
    target.pragma(`user_version = ${v + 1}`);
  }
}
