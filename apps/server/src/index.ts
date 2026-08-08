/* Sunucu giriş noktası — YALNIZ açılış sırası + listen.

   SIRA BURADA DEĞİL `acilis.ts`'te (2026-08-07, açılış sırası paketi): bu dosya
   import edildiği anda dinlemeye başlar, yani sırası TEST EDİLEMEZDİ ve
   ölçülmüş bir yara tam da sıradaydı — reddedilen bir boot, kiracının veri
   ağacını (app.db · WAL · assets · exports · fonts) ÇOKTAN yazmış oluyordu,
   çünkü `./db.js` STATİK import ediliyordu ve o modül yüklenirken disk yazıyor.
   Davranış geçerli yapılandırmada BİREBİR aynıdır. */

import { acilisSirasi } from "./acilis.js";

const app = await acilisSirasi();

const PORT = Number(process.env.PORT ?? 3001);
await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`TEZGAH server -> http://localhost:${PORT}/api/health`);
