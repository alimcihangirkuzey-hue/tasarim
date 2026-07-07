/* Mockup sahneleri — FAZ3-GOREV §3.2/§3.3. client_id NULL = ortak sahne
   (her müşteriden görülür ve yönetilir — kullanıcı kararı, Faz 3 onayı). */

import type { FastifyInstance } from "fastify";
import {
  QuadSchema,
  SceneCreateSchema,
  SceneSettingsSchema,
  SceneUpdateSchema,
  newId,
  nowISO,
  type MockupSceneDTO,
  type SceneKind,
} from "@tezgah/shared";
import { db } from "../db.js";

type SceneRow = {
  id: string;
  client_id: string | null;
  name: string;
  photo_asset_id: string;
  quad_json: string;
  kind: string;
  settings_json: string;
  created_at: string;
};

export function rowToScene(r: SceneRow): MockupSceneDTO {
  const asset = db
    .prepare("SELECT id, filename, width_px, height_px FROM assets WHERE id = ?")
    .get(r.photo_asset_id) as
    | { id: string; filename: string; width_px: number; height_px: number }
    | undefined;
  return {
    id: r.id,
    client_id: r.client_id,
    name: r.name,
    kind: r.kind as SceneKind,
    photo_asset_id: r.photo_asset_id,
    photo_urls: asset
      ? { master: `/assets/master/${asset.filename}`, thumb: `/assets/thumb/${asset.id}.jpg` }
      : null,
    photo_px: asset ? { w: asset.width_px, h: asset.height_px } : null,
    quad: QuadSchema.parse(JSON.parse(r.quad_json)),
    settings: SceneSettingsSchema.parse(JSON.parse(r.settings_json)),
    created_at: r.created_at,
  };
}

export function sceneById(id: string): SceneRow | undefined {
  return db.prepare("SELECT * FROM mockup_scenes WHERE id = ?").get(id) as SceneRow | undefined;
}

export function sceneRoutes(app: FastifyInstance): void {
  /* Müşterinin görebildiği sahneler: kendi + ortak */
  app.get<{ Params: { id: string } }>("/api/clients/:id/scenes", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id);
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    const rows = db
      .prepare(
        `SELECT * FROM mockup_scenes WHERE client_id = ? OR client_id IS NULL
         ORDER BY created_at DESC`
      )
      .all(req.params.id) as SceneRow[];
    return rows.map(rowToScene);
  });

  app.post<{ Params: { id: string } }>("/api/clients/:id/scenes", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id) as
      | { id: string }
      | undefined;
    if (!client) return reply.code(404).send({ error: "client_not_found" });

    const body = SceneCreateSchema.parse(req.body ?? {});
    /* foto bu müşteriye ya da ortak havuza ait olmalı */
    const asset = db
      .prepare("SELECT 1 FROM assets WHERE id = ? AND (client_id = ? OR client_id IS NULL)")
      .get(body.photo_asset_id, client.id);
    if (!asset) return reply.code(400).send({ error: "photo_not_resolvable" });

    const row: SceneRow = {
      id: newId("scn"),
      client_id: body.common ? null : client.id,
      name: body.name.trim(),
      photo_asset_id: body.photo_asset_id,
      quad_json: JSON.stringify(body.quad),
      kind: body.kind,
      settings_json: JSON.stringify(body.settings),
      created_at: nowISO(),
    };
    db.prepare(
      `INSERT INTO mockup_scenes (id, client_id, name, photo_asset_id, quad_json, kind, settings_json, created_at)
       VALUES (@id, @client_id, @name, @photo_asset_id, @quad_json, @kind, @settings_json, @created_at)`
    ).run(row);
    reply.code(201);
    return rowToScene(row);
  });

  app.put<{ Params: { id: string } }>("/api/scenes/:id", async (req, reply) => {
    const row = sceneById(req.params.id);
    if (!row) return reply.code(404).send({ error: "not_found" });
    const patch = SceneUpdateSchema.parse(req.body ?? {});
    const next: SceneRow = {
      ...row,
      name: patch.name?.trim() ?? row.name,
      kind: patch.kind ?? row.kind,
      quad_json: patch.quad ? JSON.stringify(patch.quad) : row.quad_json,
      settings_json: patch.settings ? JSON.stringify(patch.settings) : row.settings_json,
    };
    db.prepare(
      `UPDATE mockup_scenes SET name=@name, kind=@kind, quad_json=@quad_json,
        settings_json=@settings_json WHERE id=@id`
    ).run(next);
    return rowToScene(next);
  });

  app.delete<{ Params: { id: string } }>("/api/scenes/:id", async (req, reply) => {
    const res = db.prepare("DELETE FROM mockup_scenes WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
