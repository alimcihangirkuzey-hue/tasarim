/* Belge CRUD — Faz 1. Proje yönetimi arayüzü Faz 2'dedir; her müşteri için
   "Genel" adlı varsayılan proje ilk belgede otomatik açılır (en basit çözüm,
   FAZ1-GOREV §0.6 — TODO.md'ye not düşüldü). */

import type { FastifyInstance } from "fastify";
import {
  DocumentCreateSchema,
  DocumentStateSchema,
  DocumentUpdateSchema,
  newId,
  nowISO,
  type DocumentDTO,
  type DocumentSummaryDTO,
} from "@tezgah/shared";
import { db } from "../db.js";
import { surfacePrefillParams } from "../surfaces.js";

type DocumentRow = {
  id: string;
  project_id: string;
  template_id: string;
  params_json: string;
  theme_id: string;
  selection_json: string;
  overrides_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function rowToDocument(row: DocumentRow, clientId: string): DocumentDTO {
  const state = DocumentStateSchema.parse({
    template_id: row.template_id,
    params: JSON.parse(row.params_json),
    theme_id: row.theme_id,
    selection: JSON.parse(row.selection_json),
    overrides: JSON.parse(row.overrides_json),
    status: row.status,
  });
  return {
    ...state,
    id: row.id,
    project_id: row.project_id,
    client_id: clientId,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function documentWithClient(docId: string): { row: DocumentRow; clientId: string } | null {
  const row = db
    .prepare(
      `SELECT d.*, p.client_id AS client_id FROM documents d
       JOIN projects p ON p.id = d.project_id WHERE d.id = ?`
    )
    .get(docId) as (DocumentRow & { client_id: string }) | undefined;
  if (!row) return null;
  return { row, clientId: row.client_id };
}

export function ensureDefaultProject(clientId: string): string {
  const existing = db
    .prepare("SELECT id FROM projects WHERE client_id = ? ORDER BY created_at ASC LIMIT 1")
    .get(clientId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = newId("prj");
  db.prepare(
    "INSERT INTO projects (id, client_id, name, status, created_at) VALUES (?, ?, 'Genel', 'open', ?)"
  ).run(id, clientId, nowISO());
  return id;
}

export function documentRoutes(app: FastifyInstance): void {
  /* Müşterinin belgeleri (özet) */
  app.get<{ Params: { id: string } }>("/api/clients/:id/documents", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id);
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    const rows = db
      .prepare(
        `SELECT d.* FROM documents d JOIN projects p ON p.id = d.project_id
         WHERE p.client_id = ? ORDER BY d.updated_at DESC`
      )
      .all(req.params.id) as DocumentRow[];
    const out: DocumentSummaryDTO[] = rows.map((r) => {
      const params = JSON.parse(r.params_json) as Record<string, unknown>;
      return {
        id: r.id,
        template_id: r.template_id,
        status: r.status as DocumentSummaryDTO["status"],
        theme_id: r.theme_id,
        format: typeof params.format === "string" ? params.format : null,
        updated_at: r.updated_at,
      };
    });
    return out;
  });

  /* Belge oluştur */
  app.post<{ Params: { id: string } }>("/api/clients/:id/documents", async (req, reply) => {
    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(req.params.id) as
      | { id: string }
      | undefined;
    if (!client) return reply.code(404).send({ error: "client_not_found" });

    const body = DocumentCreateSchema.parse(req.body ?? {});
    let projectId: string;
    if (body.project_id) {
      const proj = db
        .prepare("SELECT id FROM projects WHERE id = ? AND client_id = ?")
        .get(body.project_id, client.id);
      if (!proj) return reply.code(404).send({ error: "project_not_found" });
      projectId = body.project_id;
    } else {
      projectId = ensureDefaultProject(client.id);
    }
    const state = DocumentStateSchema.parse({ template_id: body.template_id });
    /* F8-A (D6): vitro/enseigne belgesinde müşteri yüzey ölçüsü ön-dolumu. Yoksa
       {} → şablon varsayılanı geçerli. Değer editör param panelinde görünür (M8). */
    const params = { ...state.params, ...surfacePrefillParams(db, client.id, state.template_id) };
    const now = nowISO();
    const row: DocumentRow = {
      id: newId("doc"),
      project_id: projectId,
      template_id: state.template_id,
      params_json: JSON.stringify(params),
      theme_id: state.theme_id,
      selection_json: JSON.stringify(state.selection),
      overrides_json: JSON.stringify(state.overrides),
      status: state.status,
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      `INSERT INTO documents (id, project_id, template_id, params_json, theme_id,
        selection_json, overrides_json, status, created_at, updated_at)
       VALUES (@id, @project_id, @template_id, @params_json, @theme_id,
        @selection_json, @overrides_json, @status, @created_at, @updated_at)`
    ).run(row);
    reply.code(201);
    return rowToDocument(row, client.id);
  });

  /* Tek belge — editör açılışı */
  app.get<{ Params: { id: string } }>("/api/documents/:id", async (req, reply) => {
    const found = documentWithClient(req.params.id);
    if (!found) return reply.code(404).send({ error: "not_found" });
    return rowToDocument(found.row, found.clientId);
  });

  /* Güncelle — otomatik kayıt; JSON kolonlar Zod'dan geçmeden yazılamaz (§4.2) */
  app.put<{ Params: { id: string } }>("/api/documents/:id", async (req, reply) => {
    const found = documentWithClient(req.params.id);
    if (!found) return reply.code(404).send({ error: "not_found" });
    const { row } = found;

    const patch = DocumentUpdateSchema.parse(req.body ?? {});
    const next: DocumentRow = {
      ...row,
      template_id: patch.template_id ?? row.template_id,
      params_json: patch.params !== undefined ? JSON.stringify(patch.params) : row.params_json,
      theme_id: patch.theme_id ?? row.theme_id,
      selection_json:
        patch.selection !== undefined ? JSON.stringify(patch.selection) : row.selection_json,
      overrides_json:
        patch.overrides !== undefined ? JSON.stringify(patch.overrides) : row.overrides_json,
      status: patch.status ?? row.status,
      updated_at: nowISO(),
    };
    db.prepare(
      `UPDATE documents SET template_id=@template_id, params_json=@params_json,
        theme_id=@theme_id, selection_json=@selection_json, overrides_json=@overrides_json,
        status=@status, updated_at=@updated_at WHERE id=@id`
    ).run(next);
    return rowToDocument(next, found.clientId);
  });

  /* Snapshot'tan geri yükleme — FAZ4-GOREV §5 + mimar kararı #13.
     Dönmeden önce mevcut durum kind:"snapshot" güvenlik kaydı olur
     (filepath boş dize; versiyon sayacı belge+tür bazında ilerler). */
  app.post<{ Params: { id: string; exportId: string } }>(
    "/api/documents/:id/restore/:exportId",
    async (req, reply) => {
      const found = documentWithClient(req.params.id);
      if (!found) return reply.code(404).send({ error: "not_found" });

      const rec = db
        .prepare("SELECT snapshot_json FROM export_records WHERE id = ? AND document_id = ?")
        .get(req.params.exportId, req.params.id) as { snapshot_json: string } | undefined;
      if (!rec) return reply.code(404).send({ error: "export_not_found" });

      let state: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(rec.snapshot_json) as { state?: unknown };
        if (parsed.state && typeof parsed.state === "object") {
          state = parsed.state as Record<string, unknown>;
        }
      } catch {
        state = null;
      }
      if (!state) return reply.code(400).send({ error: "no_state_snapshot" });

      const patch = DocumentUpdateSchema.parse({
        template_id: state.template_id,
        params: state.params,
        theme_id: state.theme_id,
        selection: state.selection,
        overrides: state.overrides,
      });

      const now = nowISO();
      const current = rowToDocument(found.row, found.clientId);
      const version =
        ((db
          .prepare(
            "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = 'snapshot'"
          )
          .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

      const next: DocumentRow = {
        ...found.row,
        template_id: patch.template_id ?? found.row.template_id,
        params_json: patch.params !== undefined ? JSON.stringify(patch.params) : found.row.params_json,
        theme_id: patch.theme_id ?? found.row.theme_id,
        selection_json:
          patch.selection !== undefined ? JSON.stringify(patch.selection) : found.row.selection_json,
        overrides_json:
          patch.overrides !== undefined ? JSON.stringify(patch.overrides) : found.row.overrides_json,
        updated_at: now,
      };

      const safetyId = newId("exp");
      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
           VALUES (?, ?, NULL, 'snapshot', '', ?, ?, ?)`
        ).run(safetyId, req.params.id, JSON.stringify({ state: current }), version, now);
        db.prepare(
          `UPDATE documents SET template_id=@template_id, params_json=@params_json,
            theme_id=@theme_id, selection_json=@selection_json, overrides_json=@overrides_json,
            updated_at=@updated_at WHERE id=@id`
        ).run(next);
      });
      tx();

      return { document: rowToDocument(next, found.clientId), safety_record_id: safetyId };
    }
  );

  /* Sil */
  app.delete<{ Params: { id: string } }>("/api/documents/:id", async (req, reply) => {
    const res = db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
