/* @tezgah/journal — Cockpit modül fazı 0 (Canonical 11.3/11.4).

   Package Journal'ın I/O KATMANI. Saf çekirdek (şema, aşama kuralı, hash
   zinciri, paket kaydı türetimi) @tezgah/shared'da yaşar; burada yalnız
   diske/git'e/sürece dokunan kısım vardır.

   cli.ts BİLEREK DIŞARIDA: barrel'dan export edilseydi bu paketi import eden
   her yerde CLI gövdesi çalışırdı. Giriş noktası doğrudan çağrılır. */

export * from "./paths.js";
export * from "./hash.js";
export * from "./authorize.js"; // 11.7: tek yetki kontrol noktası (bugün "izin ver")
export * from "./store.js"; // TEK yazma kapısı — append-only
export * from "./gates.js"; // kapı koşumu: sonuç yalnız gerçek exit code'dan
export * from "./verify.js"; // dört katmanlı bütünlük doğrulayıcı
export * from "./argv.js"; // saf CLI ayrıştırıcı + kilitler
