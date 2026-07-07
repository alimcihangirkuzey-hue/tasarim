/* Sipariş Defteri — FAZ2-GOREV §2. Durum geçişi zorunlu-alan KAPILIDIR (§2.2):
   eksik kalem olcu_bekliyor'dan çıkamaz (409 + eksik alan listesi). */

import type { FastifyInstance } from "fastify";
import {
  OrderDetailsSchema,
  OrderItemCreateSchema,
  OrderItemUpdateSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  canTransition,
  newId,
  nowISO,
  type OrderItemDTO,
  type OrderStatus,
  type ProjectDTO,
} from "@tezgah/shared";
import { db } from "../db.js";

type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  status: string;
  due_date: string | null;
  source_text: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  project_id: string;
  product_type: string;
  qty: number;
  width_cm: number | null;
  height_cm: number | null;
  details_json: string;
  notes: string;
  status: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToItem(r: ItemRow): OrderItemDTO {
  return {
    id: r.id,
    project_id: r.project_id,
    product_type: r.product_type as OrderItemDTO["product_type"],
    qty: r.qty,
    width_cm: r.width_cm,
    height_cm: r.height_cm,
    details: OrderDetailsSchema.parse(JSON.parse(r.details_json)),
    notes: r.notes,
    status: r.status as OrderStatus,
    document_id: r.document_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToProject(r: ProjectRow): ProjectDTO {
  const items = (
    db
      .prepare("SELECT * FROM order_items WHERE project_id = ? ORDER BY created_at ASC")
      .all(r.id) as ItemRow[]
  ).map(rowToItem);
  return {
    id: r.id,
    client_id: r.client_id,
    name: r.name,
    status: r.status,
    due_date: r.due_date,
    source_text: r.source_text,
    items,
    created_at: r.created_at,
  };
}

function insertItem(projectId: string, body: unknown): OrderItemDTO {
  const it = OrderItemCreateSchema.parse(body ?? {});
  const now = nowISO();
  const row: ItemRow = {
    id: newId("oit"),
    project_id: projectId,
    product_type: it.product_type,
    qty: it.qty,
    width_cm: it.width_cm,
    height_cm: it.height_cm,
    details_json: JSON.stringify(it.details),
    notes: it.notes,
    status: "olcu_bekliyor",
    document_id: null,
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO order_items (id, project_id, product_type, qty, width_cm, height_cm,
      details_json, notes, status, document_id, created_at, updated_at)
     VALUES (@id, @project_id, @product_type, @qty, @width_cm, @height_cm,
      @details_json, @notes, @status, @document_id, @created_at, @updated_at)`
  ).run(row);
  return rowToItem(row);
}

export function orderRoutes(app: FastifyInstance): void {
  /* Müşterinin projeleri (kalemleriyle) */
  app.get<{ Params: { id: string } }>("/api/clients/:id/projects", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id);
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    const rows = db
      .prepare("SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC")
      .all(req.params.id) as ProjectRow[];
    return rows.map(rowToProject);
  });

  /* Proje oluştur (elle ya da yapıştır-parse sonrası; kalemler dahil olabilir) */
  app.post<{ Params: { id: string } }>("/api/clients/:id/projects", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id) as
      | { id: string }
      | undefined;
    if (!client) return reply.code(404).send({ error: "client_not_found" });

    const body = ProjectCreateSchema.parse(req.body ?? {});
    const row: ProjectRow = {
      id: newId("prj"),
      client_id: client.id,
      name: body.name.trim(),
      status: "open",
      due_date: body.due_date,
      source_text: body.source_text,
      created_at: nowISO(),
    };
    db.prepare(
      `INSERT INTO projects (id, client_id, name, status, due_date, source_text, created_at)
       VALUES (@id, @client_id, @name, @status, @due_date, @source_text, @created_at)`
    ).run(row);
    for (const item of body.items) insertItem(row.id, item);
    reply.code(201);
    return rowToProject(row);
  });

  app.put<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as
      | ProjectRow
      | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });
    const patch = ProjectUpdateSchema.parse(req.body ?? {});
    const next = {
      ...row,
      name: patch.name?.trim() ?? row.name,
      status: patch.status ?? row.status,
      due_date: patch.due_date !== undefined ? patch.due_date : row.due_date,
    };
    db.prepare(
      "UPDATE projects SET name=@name, status=@status, due_date=@due_date WHERE id=@id"
    ).run(next);
    return rowToProject(next);
  });

  app.delete<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const res = db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  /* Kalem ekle */
  app.post<{ Params: { id: string } }>("/api/projects/:id/items", async (req, reply) => {
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.id);
    if (!project) return reply.code(404).send({ error: "project_not_found" });
    reply.code(201);
    return insertItem(req.params.id, req.body);
  });

  /* Kalem güncelle — durum geçişi kapılı (§2.2) */
  app.put<{ Params: { id: string } }>("/api/order-items/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM order_items WHERE id = ?").get(req.params.id) as
      | ItemRow
      | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });

    const patch = OrderItemUpdateSchema.parse(req.body ?? {});
    const current = rowToItem(row);
    const merged = {
      product_type: patch.product_type ?? current.product_type,
      qty: patch.qty ?? current.qty,
      width_cm: patch.width_cm !== undefined ? patch.width_cm : current.width_cm,
      height_cm: patch.height_cm !== undefined ? patch.height_cm : current.height_cm,
      details: patch.details ?? current.details,
    };

    if (patch.status && patch.status !== current.status) {
      const gate = canTransition(merged, current.status, patch.status);
      if (!gate.ok) {
        return reply.code(409).send({ error: "missing_fields", missing: gate.missing });
      }
    }

    const next: ItemRow = {
      ...row,
      product_type: merged.product_type,
      qty: merged.qty,
      width_cm: merged.width_cm,
      height_cm: merged.height_cm,
      details_json: JSON.stringify(merged.details),
      notes: patch.notes ?? row.notes,
      status: patch.status ?? row.status,
      document_id: patch.document_id !== undefined ? patch.document_id : row.document_id,
      updated_at: nowISO(),
    };
    db.prepare(
      `UPDATE order_items SET product_type=@product_type, qty=@qty, width_cm=@width_cm,
        height_cm=@height_cm, details_json=@details_json, notes=@notes, status=@status,
        document_id=@document_id, updated_at=@updated_at WHERE id=@id`
    ).run(next);
    return rowToItem(next);
  });

  app.delete<{ Params: { id: string } }>("/api/order-items/:id", async (req, reply) => {
    const res = db.prepare("DELETE FROM order_items WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  /* Yaklaşan terminler şeridi (§2.3) — teslim/iptal edilmemiş kalemi olan projeler */
  app.get("/api/projects/upcoming", async () => {
    const rows = db
      .prepare(
        `SELECT p.*, c.name AS client_name,
           (SELECT COUNT(*) FROM order_items oi
             WHERE oi.project_id = p.id AND oi.status NOT IN ('teslim','iptal')) AS open_items
         FROM projects p JOIN clients c ON c.id = p.client_id
         WHERE p.due_date IS NOT NULL AND p.status != 'done'
         ORDER BY p.due_date ASC LIMIT 12`
      )
      .all() as Array<ProjectRow & { client_name: string; open_items: number }>;
    return rows
      .filter((r) => r.open_items > 0)
      .map((r) => ({
        id: r.id,
        client_id: r.client_id,
        client_name: r.client_name,
        name: r.name,
        due_date: r.due_date,
        open_items: r.open_items,
      }));
  });
}
