/* Toplu fiyat güncelleme + katalog geçmişi — FAZ4-GOREV §4.
   Uygulamadan ÖNCE mevcut katalog otomatik geçmişe yazılır (tek transaction).
   Önizleme istemci tarafında saf motorla yapılır (aynı hesap, @tezgah/shared). */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CatalogSchema,
  applyBulkPrice,
  bulkPriceReason,
  newId,
  nowISO,
  type BulkPriceOp,
} from "@tezgah/shared";
import { db } from "../db.js";

const BulkPriceSchema = z.object({
  scope: z.union([z.literal("all"), z.object({ categoryId: z.string() })]),
  op: z.object({
    kind: z.enum(["percent", "add", "set"]),
    value: z.number().finite(),
  }),
  rounding: z.enum(["none", "r010", "r050", "x90"]),
});

type HistoryRow = {
  id: string;
  client_id: string;
  catalog_json: string;
  reason: string;
  created_at: string;
};

export function catalogRoutes(app: FastifyInstance): void {
  /* Toplu fiyat uygula — önce otomatik geçmiş kaydı, sonra katalog güncelle */
  app.post<{ Params: { id: string } }>(
    "/api/clients/:id/catalog/bulk-price",
    async (req, reply) => {
      const row = db
        .prepare("SELECT catalog_json FROM clients WHERE id = ?")
        .get(req.params.id) as { catalog_json: string } | undefined;
      if (!row) return reply.code(404).send({ error: "not_found" });

      const op = BulkPriceSchema.parse(req.body ?? {}) as BulkPriceOp;
      const catalog = CatalogSchema.parse(JSON.parse(row.catalog_json));
      const { catalog: next, changes } = applyBulkPrice(catalog, op);
      if (changes.length === 0) {
        return reply.code(400).send({ error: "no_changes" });
      }

      const now = nowISO();
      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO catalog_history (id, client_id, catalog_json, reason, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).run(newId("ch"), req.params.id, row.catalog_json, bulkPriceReason(op, catalog), now);
        db.prepare("UPDATE clients SET catalog_json = ?, updated_at = ? WHERE id = ?").run(
          JSON.stringify(next),
          now,
          req.params.id
        );
      });
      tx();

      return { applied: changes.length, changes };
    }
  );

  /* Geçmiş listesi (hafif — json gövdesiz) */
  app.get<{ Params: { id: string } }>("/api/clients/:id/catalog/history", async (req) => {
    const rows = db
      .prepare(
        `SELECT id, reason, created_at, LENGTH(catalog_json) AS size
         FROM catalog_history WHERE client_id = ? ORDER BY created_at DESC`
      )
      .all(req.params.id) as Array<{ id: string; reason: string; created_at: string; size: number }>;
    return rows;
  });

  /* Geçmişten geri yükle — dönmeden önce mevcut durum da geçmişe yazılır */
  app.post<{ Params: { id: string; historyId: string } }>(
    "/api/clients/:id/catalog/restore/:historyId",
    async (req, reply) => {
      const client = db
        .prepare("SELECT catalog_json FROM clients WHERE id = ?")
        .get(req.params.id) as { catalog_json: string } | undefined;
      if (!client) return reply.code(404).send({ error: "not_found" });
      const hist = db
        .prepare("SELECT * FROM catalog_history WHERE id = ? AND client_id = ?")
        .get(req.params.historyId, req.params.id) as HistoryRow | undefined;
      if (!hist) return reply.code(404).send({ error: "history_not_found" });

      /* geçerlilik: geçmişteki json bugünkü şemadan geçmeli */
      const restored = CatalogSchema.parse(JSON.parse(hist.catalog_json));

      const now = nowISO();
      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO catalog_history (id, client_id, catalog_json, reason, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).run(
          newId("ch"),
          req.params.id,
          client.catalog_json,
          "geri yükleme öncesi otomatik kayıt",
          now
        );
        db.prepare("UPDATE clients SET catalog_json = ?, updated_at = ? WHERE id = ?").run(
          JSON.stringify(restored),
          now,
          req.params.id
        );
      });
      tx();

      return { ok: true, restored_from: hist.id };
    }
  );
}
