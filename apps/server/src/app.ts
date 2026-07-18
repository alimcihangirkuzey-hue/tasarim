/* Uygulama KURULUŞU — P0 (route-test harness).
   index.ts artık yalnız migrate + listen yapar; kuruluşun tamamı burada ve
   DİNLEMEDEN döner → route testleri app.inject() ile GERÇEK uç üzerinden
   koşar (F1.1/3/6/7 ön-şartı, TODO'daki kayıtlı borç).

   DAVRANIŞ DEĞİŞMEZ: eklenti kayıt sırası, prefix'ler, /api/health gövdesi,
   rota kayıt sırası ve Zod→400 hata işleyicisi index.ts'teki eski haliyle
   BİREBİR aynıdır. Tek enjeksiyon noktası logger (test sessizliği için;
   varsayılan eski değer). */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { ZodError } from "zod";
import { ASSETS_DIR, EXPORTS_DIR, FONTS_DIR } from "./paths.js";
import { clientRoutes } from "./routes/clients.js";
import { assetRoutes } from "./routes/assets.js";
import { documentRoutes } from "./routes/documents.js";
import { exportRoutes } from "./routes/exports.js";
import { orderRoutes } from "./routes/orders.js";
import { cloneRoutes } from "./routes/clone.js";
import { presentRoutes } from "./routes/present.js";
import { sceneRoutes } from "./routes/scenes.js";
import { mockupRoutes } from "./routes/mockup.js";
import { vectorRoutes } from "./routes/vector.js";
import { garmentRoutes } from "./routes/garment.js";
import { catalogRoutes } from "./routes/catalog.js";
import { backupRoutes } from "./routes/backup.js";
import { themeRoutes } from "./routes/themes.js";
import { synonymRoutes } from "./routes/synonyms.js";
import { presetRoutes2 } from "./routes/presets.js";
import { factoryRoutes } from "./routes/factory.js";
import { cmykRoutes } from "./routes/cmyk.js";
import { fontRoutes } from "./routes/fonts.js";
import { digitalMenuRoutes } from "./routes/digital-menu.js";
import { sectorRoutes } from "./routes/sectors.js";
import { ingredientRoutes } from "./routes/ingredients.js";
import { intakeRoutes } from "./routes/intake.js";
import { surfaceRoutes } from "./routes/surfaces.js";
import { renderRoutes } from "./routes/render.js";
import { briefFileRoutes } from "./routes/brief-files.js";

export async function buildApp(
  opts: { logger?: FastifyServerOptions["logger"] } = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? { level: "info" } });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  });

  await app.register(fastifyStatic, {
    root: ASSETS_DIR,
    prefix: "/assets/",
  });

  await app.register(fastifyStatic, {
    root: EXPORTS_DIR,
    prefix: "/exports/",
    decorateReply: false,
  });

  /* FAZ5 §7: kullanıcı yüklediği fontlar (@font-face aynı kaynak — M3) */
  await app.register(fastifyStatic, {
    root: FONTS_DIR,
    prefix: "/fonts/",
    decorateReply: false,
  });

  app.get("/api/health", async () => ({ ok: true, app: "tezgah", phase: 6 }));

  clientRoutes(app);
  assetRoutes(app);
  documentRoutes(app);
  exportRoutes(app);
  orderRoutes(app);
  cloneRoutes(app);
  presentRoutes(app);
  sceneRoutes(app);
  mockupRoutes(app);
  vectorRoutes(app);
  garmentRoutes(app);
  catalogRoutes(app);
  backupRoutes(app);
  themeRoutes(app);
  synonymRoutes(app);
  presetRoutes2(app);
  factoryRoutes(app);
  cmykRoutes(app);
  fontRoutes(app);
  digitalMenuRoutes(app);
  sectorRoutes(app);
  ingredientRoutes(app);
  intakeRoutes(app);
  surfaceRoutes(app);
  renderRoutes(app); // T3 PART-B: Render Contract v1 kapısı (env'siz 503 — kapalı)
  briefFileRoutes(app); // F1 P3: brief dosya kabul + istisna-audit uçları

  /* Zod hataları 400 + okunur mesaj; geri kalanı 500 (M4: hatalar görünür olur) */
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: "validation",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    app.log.error(err);
    const e = err instanceof Error ? err : new Error(String(err));
    const status = (e as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send({ error: "internal", message: e.message });
  });

  return app;
}
