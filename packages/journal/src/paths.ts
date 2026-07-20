/* Cockpit modül fazı 0 — JOURNAL YOL ÇÖZÜMÜ (Canonical 11.3).

   apps/server/src/paths.ts'in üslubunu izler ama BİR TUZAĞINI TAŞIMAZ:
   orada DATA_DIR modül gövdesinde `process.env.TEZGAH_DATA_DIR ?? ...` ile
   const'a alınır; env modül YÜKLENDİĞİ AN okunduğu için, testin env'i ilk
   import'tan sonra değiştirmesi hiçbir şeyi değiştirmez. Bedeli ölçüldü:
   o modülleri kullanan testler `await import()` ile dinamik yükleme yapmak
   ZORUNDA kalıyor (db.ts:22 aynı tuzağı taşır).

   Burada env FONKSİYON İÇİNDE okunur → journalDir() her çağrıda güncel
   process.env'i görür → testler DÜZ STATİK import yazabilir. ROOT_DIR const
   kalır; o env'e değil dosya konumuna bağlıdır, yükleme anında sabittir. */

import path from "node:path";
import { fileURLToPath } from "node:url";

/* Repo kökü: packages/journal/src -> ../../.. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(HERE, "..", "..", "..");

/* Dosya adı = package_id. Ayraç/nokta-nokta taşıyan bir id, journalDir()
   dışına yazma yolu açardı (kilit dosyası da aynı id'den türetilir), o yüzden
   yol kurulmadan ÖNCE reddedilir. Sözleşmedeki imza değişmez: string döner
   ya da fırlatır. */
const SAFE_PACKAGE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Olay dosyalarının dizini. Env her çağrıda okunur (yukarıdaki not). */
export function journalDir(): string {
  return process.env.TEZGAH_JOURNAL_DIR ?? path.join(ROOT_DIR, "docs", "journal", "events");
}

/** Kanıt dosyaları — journalDir'in KARDEŞİ (env ile taşındığında birlikte taşınır) */
export function evidenceDir(): string {
  return path.join(path.dirname(journalDir()), "evidence");
}

/** Yazma kilitleri — journalDir'in KARDEŞİ: .lock dosyaları olay dizinini
    kirletmez, listPackageIds() onları görmez. */
export function lockDir(): string {
  return path.join(path.dirname(journalDir()), ".lock");
}

/** <journalDir>/<packageId>.jsonl — append-only olay akışı */
export function journalFile(packageId: string): string {
  if (!SAFE_PACKAGE_ID.test(packageId)) {
    throw new Error(
      `geçersiz packageId: ${JSON.stringify(packageId)} — izinli: [A-Za-z0-9._-], harf/rakamla başlar`
    );
  }
  return path.join(journalDir(), `${packageId}.jsonl`);
}
