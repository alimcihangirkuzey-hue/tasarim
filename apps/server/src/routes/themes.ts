/* Özel tema CRUD — FAZ4-GOREV §7. Yerleşik 3 tema + brand kodda yaşar,
   DB'ye girmez ve silinemez; özel temalar tüm müşterilerce kullanılabilir. */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ThemeTokensSchema, newId, nowISO, type ThemeDTO } from "@tezgah/shared";
import { db } from "../db.js";

const BUILTIN = new Set(["brand", "or-noir", "aras-orange", "velours-rouge"]);

const ThemeBodySchema = z.object({
  name: z.string().min(1).max(60),
  tokens: ThemeTokensSchema,
});

type ThemeRow = { id: string; name: string; tokens_json: string; created_at: string };

const toDTO = (r: ThemeRow): ThemeDTO => ({
  id: r.id,
  name: r.name,
  tokens: ThemeTokensSchema.parse(JSON.parse(r.tokens_json)),
  created_at: r.created_at,
});

export function themeRoutes(app: FastifyInstance): void {
  app.get("/api/themes", async () => {
    const rows = db
      .prepare("SELECT * FROM themes ORDER BY created_at ASC")
      .all() as ThemeRow[];
    return rows.map(toDTO);
  });

  app.post("/api/themes", async (req, reply) => {
    const body = ThemeBodySchema.parse(req.body ?? {});
    const row: ThemeRow = {
      id: newId("th"),
      name: body.name,
      tokens_json: JSON.stringify(body.tokens),
      created_at: nowISO(),
    };
    db.prepare(
      "INSERT INTO themes (id, name, tokens_json, created_at) VALUES (@id, @name, @tokens_json, @created_at)"
    ).run(row);
    reply.code(201);
    return toDTO(row);
  });

  app.put<{ Params: { id: string } }>("/api/themes/:id", async (req, reply) => {
    if (BUILTIN.has(req.params.id)) {
      return reply.code(400).send({ error: "builtin_theme" });
    }
    const body = ThemeBodySchema.parse(req.body ?? {});
    const res = db
      .prepare("UPDATE themes SET name = ?, tokens_json = ? WHERE id = ?")
      .run(body.name, JSON.stringify(body.tokens), req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    const row = db.prepare("SELECT * FROM themes WHERE id = ?").get(req.params.id) as ThemeRow;
    return toDTO(row);
  });

  /* Yerleşikler silinemez (kabul 6); özel tema silinirse onu kullanan
     belgeler resolveTheme gereği marka temasına düşer (sessiz kırılma yok) */
  app.delete<{ Params: { id: string } }>("/api/themes/:id", async (req, reply) => {
    if (BUILTIN.has(req.params.id)) {
      return reply.code(400).send({ error: "builtin_theme" });
    }
    const res = db.prepare("DELETE FROM themes WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
