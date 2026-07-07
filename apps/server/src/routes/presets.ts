/* Küçük bakım — FAZ4-GOREV §11: asset silme (kullanım korumalı) + paket preseti.
   Preset tanımları @tezgah/shared'da sabittir; yönetim arayüzü Faz S. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { OPENING_KIT, newId, nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { ASSETS_DIR } from "../paths.js";

interface Usage {
  where: string;
  label: string;
}

/** Varlığın kullanıldığı yerleri tarar: katalog fotoları, marka kiti logoları,
    sahne fotoğrafları, belge override'ları (FAZ4 §11). */
function scanUsages(assetId: string): Usage[] {
  const usages: Usage[] = [];
  const needle = `"${assetId}"`;

  const clients = db
    .prepare("SELECT id, name, brandkit_json, catalog_json FROM clients")
    .all() as Array<{ id: string; name: string; brandkit_json: string; catalog_json: string }>;
  for (const c of clients) {
    if (c.brandkit_json.includes(needle)) {
      usages.push({ where: "marka kiti", label: c.name });
    }
    if (c.catalog_json.includes(needle)) {
      /* hangi ürün(ler)? */
      try {
        const cat = JSON.parse(c.catalog_json) as {
          categories?: Array<{ items?: Array<{ name_fr?: string; photo?: string | null }> }>;
        };
        const items = (cat.categories ?? [])
          .flatMap((k) => k.items ?? [])
          .filter((i) => i.photo === assetId)
          .map((i) => i.name_fr ?? "?");
        usages.push({ where: "katalog", label: `${c.name}: ${items.join(", ") || "?"}` });
      } catch {
        usages.push({ where: "katalog", label: c.name });
      }
    }
  }

  const scenes = db
    .prepare("SELECT name FROM mockup_scenes WHERE photo_asset_id = ?")
    .all(assetId) as Array<{ name: string }>;
  for (const s of scenes) usages.push({ where: "sahne", label: s.name });

  const docs = db
    .prepare(
      `SELECT d.id, d.template_id FROM documents d WHERE d.overrides_json LIKE ?`
    )
    .all(`%${needle}%`) as Array<{ id: string; template_id: string }>;
  for (const d of docs) usages.push({ where: "belge override", label: `${d.template_id} (${d.id.slice(0, 12)}…)` });

  return usages;
}

export function presetRoutes2(app: FastifyInstance): void {
  /* Asset silme — kullanım korumalı; serbestse kayıt + üç dosya silinir */
  app.delete<{ Params: { id: string } }>("/api/assets/:id", async (req, reply) => {
    const row = db
      .prepare("SELECT id, filename FROM assets WHERE id = ?")
      .get(req.params.id) as { id: string; filename: string } | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });

    const usages = scanUsages(req.params.id);
    if (usages.length > 0) {
      return reply.code(409).send({ error: "in_use", usages });
    }

    db.prepare("DELETE FROM assets WHERE id = ?").run(req.params.id);
    for (const p of [
      path.join(ASSETS_DIR, "orig", row.filename),
      path.join(ASSETS_DIR, "master", row.filename),
      path.join(ASSETS_DIR, "thumb", `${row.id}.jpg`),
    ]) {
      await fs.rm(p, { force: true });
    }
    return { ok: true };
  });

  /* "Açılış Takımı" — tek tıkla proje + kalemler (kabul 11) */
  app.post<{ Params: { id: string } }>("/api/clients/:id/presets/opening", async (req, reply) => {
    const client = db
      .prepare("SELECT id FROM clients WHERE id = ?")
      .get(req.params.id) as { id: string } | undefined;
    if (!client) return reply.code(404).send({ error: "not_found" });

    const now = nowISO();
    const projectId = newId("prj");
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO projects (id, client_id, name, status, created_at)
         VALUES (?, ?, ?, 'open', ?)`
      ).run(projectId, client.id, OPENING_KIT.name_tr, now);
      for (const it of OPENING_KIT.items) {
        db.prepare(
          `INSERT INTO order_items (id, project_id, product_type, qty, width_cm, height_cm,
            details_json, notes, status, document_id, created_at, updated_at)
           VALUES (?, ?, ?, 1, NULL, NULL, ?, '', 'olcu_bekliyor', NULL, ?, ?)`
        ).run(newId("oi"), projectId, it.product_type, JSON.stringify(it.details ?? {}), now, now);
      }
    });
    tx();

    reply.code(201);
    return { project_id: projectId, items: OPENING_KIT.items.length };
  });
}
