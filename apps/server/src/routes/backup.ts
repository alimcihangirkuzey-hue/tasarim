/* Zip yedek — FAZ4-GOREV §6 (M7: yedek = data/ kopyası).
   Önce WAL checkpoint (app.db dosyası bütünlenir), sonra data/ akışla
   ziplenir; -wal/-shm zip'e girmez (checkpoint sonrası gereksiz). */

import type { FastifyInstance } from "fastify";
import path from "node:path";
import { createRequire } from "node:module";
import { db } from "../db.js";
import { DATA_DIR } from "../paths.js";

/* archiver salt-CJS; ESM default interop'u Node 24 + tsx altında yok */
const require = createRequire(import.meta.url);
const archiver = require("archiver") as typeof import("archiver");

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function backupRoutes(app: FastifyInstance): void {
  app.get("/api/backup", async (_req, reply) => {
    /* WAL'daki her şey ana dosyaya insin */
    db.pragma("wal_checkpoint(TRUNCATE)");

    const filename = `tezgah-yedek-${stamp()}.zip`;
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.file(path.join(DATA_DIR, "app.db"), { name: "app.db" });
    archive.directory(path.join(DATA_DIR, "assets"), "assets");
    archive.directory(path.join(DATA_DIR, "exports"), "exports");
    void archive.finalize();

    reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(archive);
  });
}
