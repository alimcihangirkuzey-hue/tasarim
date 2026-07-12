/* F8-A — müşteri yüzey profili uçları. GET liste (hafif tüketici, ClientDetailPage
   paneli) + DELETE tek (hijyen: yanlış girilen yüzey silinebilir, D5). Yazım
   YALNIZ intake commit'inde (upsertClientSurfaces) — bu uçlar salt okuma + silme. */

import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { rowToSurfaceDTO, type ClientSurfaceRow } from "../surfaces.js";

export function surfaceRoutes(app: FastifyInstance): void {
  /* Müşterinin yüzeyleri (en son güncellenen önce) */
  app.get<{ Params: { id: string } }>("/api/clients/:id/surfaces", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id);
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    const rows = db
      .prepare("SELECT * FROM client_surfaces WHERE client_id = ? ORDER BY updated_at DESC, label ASC")
      .all(req.params.id) as ClientSurfaceRow[];
    return rows.map(rowToSurfaceDTO);
  });

  /* Tek yüzey sil (hijyen — D5) */
  app.delete<{ Params: { id: string } }>("/api/surfaces/:id", async (req, reply) => {
    const res = db.prepare("DELETE FROM client_surfaces WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
