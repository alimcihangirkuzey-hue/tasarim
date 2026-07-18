/* Sunucu giriş noktası — P0'dan sonra YALNIZ migrate + listen.
   Kuruluşun tamamı app.ts'te (buildApp); davranış eskisiyle birebir. */

import { buildApp } from "./app.js";
import { migrate } from "./db.js";

migrate();

const app = await buildApp();

const PORT = Number(process.env.PORT ?? 3001);
await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`TEZGAH server -> http://localhost:${PORT}/api/health`);
