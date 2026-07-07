/* Parse sözlüğü yönetimi — FAZ4-GOREV §10.
   parser = kod içi çekirdek sözlük ∪ bu tablo; web, çözümlemeden hemen önce
   listeyi çeker (aynı oturumda etki). */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ProductTypeSchema, foldTr } from "@tezgah/shared";
import { db } from "../db.js";

const BodySchema = z.object({
  word: z.string().min(2).max(60),
  product_type: ProductTypeSchema,
});

export function synonymRoutes(app: FastifyInstance): void {
  app.get("/api/parse-synonyms", async () => {
    return db
      .prepare("SELECT word, product_type FROM parse_synonyms ORDER BY word ASC")
      .all() as Array<{ word: string; product_type: string }>;
  });

  /* Upsert — kelime normalize (foldTr) edilerek saklanır; PK aynı kelimeyi teke indirir */
  app.post("/api/parse-synonyms", async (req, reply) => {
    const body = BodySchema.parse(req.body ?? {});
    const word = foldTr(body.word).trim();
    if (!word) return reply.code(400).send({ error: "empty_word" });
    db.prepare(
      `INSERT INTO parse_synonyms (word, product_type) VALUES (?, ?)
       ON CONFLICT(word) DO UPDATE SET product_type = excluded.product_type`
    ).run(word, body.product_type);
    reply.code(201);
    return { word, product_type: body.product_type };
  });

  app.delete<{ Params: { word: string } }>("/api/parse-synonyms/:word", async (req, reply) => {
    const res = db
      .prepare("DELETE FROM parse_synonyms WHERE word = ?")
      .run(decodeURIComponent(req.params.word));
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
