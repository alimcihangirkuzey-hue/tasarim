import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AssetKindSchema, BrandKitSchema, newId, nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { ASSETS_DIR } from "../paths.js";
import { assetToDTO } from "./clients.js";

/* CONSTITUTION ADR-7: orig saklanır, master <=4000px, thumb 400px jpg */

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function assetRoutes(app: FastifyInstance): void {
  /* Ortak havuz listesi (§4) */
  app.get("/api/assets/common", async () => {
    const rows = db
      .prepare("SELECT * FROM assets WHERE client_id IS NULL ORDER BY created_at DESC")
      .all() as Parameters<typeof assetToDTO>[0][];
    return rows.map(assetToDTO);
  });

  app.post<{ Params: { id: string } }>(
    "/api/clients/:id/assets",
    async (req, reply) => {
      const client = db
        .prepare("SELECT id, brandkit_json FROM clients WHERE id = ?")
        .get(req.params.id) as { id: string; brandkit_json: string } | undefined;
      if (!client) return reply.code(404).send({ error: "client_not_found" });

      const mp = await req.file();
      if (!mp) return reply.code(400).send({ error: "file_missing" });

      const ext = ALLOWED[mp.mimetype];
      if (!ext) {
        return reply
          .code(415)
          .send({ error: "unsupported_type", detail: mp.mimetype });
      }

      const fieldValue = (name: string): unknown => {
        const f = mp.fields[name] as unknown as
          | { value?: unknown }
          | Array<{ value?: unknown }>
          | undefined;
        return Array.isArray(f) ? f[0]?.value : f?.value;
      };
      const kind = AssetKindSchema.catch("other").parse(fieldValue("kind") ?? "other");
      /* FAZ2-GOREV §4: scope=common → ortak havuz (client_id NULL), tüm müşterilere açık */
      const scope = fieldValue("scope") === "common" ? "common" : "client";

      const buf = await mp.toBuffer();
      const id = newId("ast");
      const filename = `${id}.${ext}`;
      const isSvg = ext === "svg";

      /* SVG: raster işleme için density verilir, orig+master aynı dosyadır */
      const src = isSvg ? sharp(buf, { density: 150 }) : sharp(buf).rotate();
      const meta = await src.metadata();

      await fs.writeFile(path.join(ASSETS_DIR, "orig", filename), buf);

      let width = meta.width ?? 0;
      let height = meta.height ?? 0;

      if (isSvg) {
        await fs.writeFile(path.join(ASSETS_DIR, "master", filename), buf);
      } else {
        const master = await sharp(buf)
          .rotate()
          .resize(4000, 4000, { fit: "inside", withoutEnlargement: true })
          .toBuffer({ resolveWithObject: true });
        await fs.writeFile(path.join(ASSETS_DIR, "master", filename), master.data);
        width = master.info.width;
        height = master.info.height;
      }

      const thumb = await (isSvg ? sharp(buf, { density: 150 }) : sharp(buf).rotate())
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 82 })
        .toBuffer();
      await fs.writeFile(path.join(ASSETS_DIR, "thumb", `${id}.jpg`), thumb);

      const row = {
        id,
        client_id: scope === "common" ? null : client.id,
        kind,
        filename,
        width_px: width,
        height_px: height,
        created_at: nowISO(),
      };
      db.prepare(
        `INSERT INTO assets (id, client_id, kind, filename, width_px, height_px, created_at)
         VALUES (@id, @client_id, @kind, @filename, @width_px, @height_px, @created_at)`
      ).run(row);

      /* kind=logo (müşteri kapsamlı) ise marka kitine otomatik bağlanır (M5) */
      if (kind === "logo" && scope === "client") {
        const kit = BrandKitSchema.parse(JSON.parse(client.brandkit_json));
        kit.logo_primary = id;
        db.prepare(
          "UPDATE clients SET brandkit_json = ?, updated_at = ? WHERE id = ?"
        ).run(JSON.stringify(kit), nowISO(), client.id);
      }

      reply.code(201);
      return assetToDTO(row);
    }
  );
}
