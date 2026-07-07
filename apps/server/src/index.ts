import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { ZodError } from "zod";
import { migrate } from "./db.js";
import { ASSETS_DIR, EXPORTS_DIR } from "./paths.js";
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

migrate();

const app = Fastify({ logger: { level: "info" } });

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

app.get("/api/health", async () => ({ ok: true, app: "tezgah", phase: 3 }));

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

const PORT = Number(process.env.PORT ?? 3001);
await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`TEZGAH server -> http://localhost:${PORT}/api/health`);
