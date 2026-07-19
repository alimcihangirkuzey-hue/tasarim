/* Cockpit modül fazı 0 — DIGEST (Canonical 11.3).

   node:crypto shared'a giremez (journal.ts I/O'suz saf şemadır), bu yüzden
   zincir doğrulayıcısı digest'i ENJEKTE alır. Enjekte edilen işlev budur:
   tek yerde tanımlı olduğu için yazma ile doğrulama aynı fonksiyonu kullanır,
   ikisinin ayrışması mümkün değildir. */

import { createHash } from "node:crypto";

/** sha256(utf8) → 64 hex. journalHashInput()'un ürettiği kanonik metne uygulanır. */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
