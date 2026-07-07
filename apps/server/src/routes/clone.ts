/* Klonlama — M6 / FAZ2-GOREV §3.
   Müşteri klonu: kit + katalog kopyalanır; referans verilen asset SATIRLARI yeni
   kimlikle çoğaltılır ama DOSYALAR kopyalanmaz (aynı filename'i paylaşırlar).
   Belge klonu: state kopyası; başka müşteriye gidince binding'ler otomatik yeni
   müşterinin verisine bakar (M1); çözülemeyen görsel override'ları düşürülür. */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  BrandKitSchema,
  CatalogSchema,
  newId,
  nowISO,
  slugify,
  type BrandKit,
  type Catalog,
} from "@tezgah/shared";
import { db } from "../db.js";
import { documentWithClient, ensureDefaultProject, rowToDocument } from "./documents.js";

const ClientCloneSchema = z.object({
  name: z.string().min(1).max(120),
  document_ids: z.array(z.string()).default([]),
});

const DocumentCloneSchema = z.object({
  target_client_id: z.string().optional(),
  project_id: z.string().optional(),
});

type AssetRow = {
  id: string;
  client_id: string | null;
  kind: string;
  filename: string;
  width_px: number;
  height_px: number;
  created_at: string;
};

function uniqueSlugFor(name: string): string {
  const base = slugify(name);
  let slug = base;
  let i = 2;
  const exists = db.prepare("SELECT 1 FROM clients WHERE slug = ?");
  while (exists.get(slug)) slug = `${base}-${i++}`;
  return slug;
}

/** Kaynak asset satırını hedef müşteri için çoğaltır (dosya paylaşılır) */
function duplicateAsset(srcId: string, targetClientId: string): string | null {
  const src = db.prepare("SELECT * FROM assets WHERE id = ?").get(srcId) as AssetRow | undefined;
  if (!src) return null;
  const id = newId("ast");
  db.prepare(
    `INSERT INTO assets (id, client_id, kind, filename, width_px, height_px, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, targetClientId, src.kind, src.filename, src.width_px, src.height_px, nowISO());
  return id;
}

/** Hedefte çözülebilir mi: hedefe ait ya da ortak havuzda */
export function assetResolvable(assetId: string, clientId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM assets WHERE id = ? AND (client_id = ? OR client_id IS NULL)")
    .get(assetId, clientId);
}

export function cloneRoutes(app: FastifyInstance): void {
  /* Müşteri klonla */
  app.post<{ Params: { id: string } }>("/api/clients/:id/clone", async (req, reply) => {
    const src = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id) as
      | {
          id: string;
          currency: string;
          brandkit_json: string;
          catalog_json: string;
        }
      | undefined;
    if (!src) return reply.code(404).send({ error: "not_found" });

    const body = ClientCloneSchema.parse(req.body ?? {});

    const runClone = db.transaction(() => {
      const kit = BrandKitSchema.parse(JSON.parse(src.brandkit_json)) as BrandKit;
      const catalog = CatalogSchema.parse(JSON.parse(src.catalog_json)) as Catalog;
      const newClientId = newId("cli");
      const now = nowISO();

      /* 1) Müşteri satırı ÖNCE açılır (asset kopyaları FK ile buna bağlanacak) */
      db.prepare(
        `INSERT INTO clients (id, name, slug, notes, currency, brandkit_json, catalog_json, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, '{}', '{}', ?, ?)`
      ).run(newClientId, body.name.trim(), uniqueSlugFor(body.name), src.currency, now, now);

      const assetMap = new Map<string, string>(); // eski asset id -> yeni
      const remap = (oldId: string | null): string | null => {
        if (!oldId) return null;
        const row = db.prepare("SELECT client_id FROM assets WHERE id = ?").get(oldId) as
          | { client_id: string | null }
          | undefined;
        if (!row) return null;
        if (row.client_id === null) return oldId; // ortak havuz herkese görünür — kopyalanmaz
        if (!assetMap.has(oldId)) {
          const dup = duplicateAsset(oldId, newClientId);
          if (!dup) return null;
          assetMap.set(oldId, dup);
        }
        return assetMap.get(oldId)!;
      };

      /* 2) Kit + katalog referansları yeni kopyalara eşlenir */
      kit.logo_primary = remap(kit.logo_primary);
      kit.logo_mono = remap(kit.logo_mono);
      for (const cat of catalog.categories) {
        for (const item of cat.items) item.photo = remap(item.photo);
      }
      db.prepare("UPDATE clients SET brandkit_json = ?, catalog_json = ? WHERE id = ?").run(
        JSON.stringify(kit),
        JSON.stringify(catalog),
        newClientId
      );

      /* 3) Opsiyonel: seçili belgeler de klonlanır (overrides dahil) */
      let clonedDocs = 0;
      if (body.document_ids.length > 0) {
        const projectId = ensureDefaultProject(newClientId);
        for (const docId of body.document_ids) {
          const found = documentWithClient(docId);
          if (!found || found.clientId !== src.id) continue;
          const d = found.row;
          const overrides = JSON.parse(d.overrides_json) as Record<string, { value: unknown }>;
          for (const [k, ov] of Object.entries(overrides)) {
            if (typeof ov?.value === "string" && ov.value.startsWith("ast_")) {
              const mapped = remap(ov.value);
              if (mapped) (ov as { value: unknown }).value = mapped;
              else delete overrides[k];
            }
          }
          db.prepare(
            `INSERT INTO documents (id, project_id, template_id, params_json, theme_id,
              selection_json, overrides_json, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
          ).run(
            newId("doc"),
            projectId,
            d.template_id,
            d.params_json,
            d.theme_id,
            d.selection_json,
            JSON.stringify(overrides),
            now,
            now
          );
          clonedDocs++;
        }
      }
      return { id: newClientId, cloned_documents: clonedDocs };
    });

    reply.code(201);
    return runClone();
  });

  /* Belge klonla — aynı müşteri (varsayılan) ya da hedef müşteri */
  app.post<{ Params: { id: string } }>("/api/documents/:id/clone", async (req, reply) => {
    const found = documentWithClient(req.params.id);
    if (!found) return reply.code(404).send({ error: "not_found" });
    const body = DocumentCloneSchema.parse(req.body ?? {});

    const targetClientId = body.target_client_id ?? found.clientId;
    const target = db.prepare("SELECT id FROM clients WHERE id = ?").get(targetClientId);
    if (!target) return reply.code(404).send({ error: "target_client_not_found" });

    let projectId: string;
    if (body.project_id) {
      const proj = db
        .prepare("SELECT id FROM projects WHERE id = ? AND client_id = ?")
        .get(body.project_id, targetClientId);
      if (!proj) return reply.code(404).send({ error: "project_not_found" });
      projectId = body.project_id;
    } else if (targetClientId === found.clientId) {
      projectId = found.row.project_id;
    } else {
      projectId = ensureDefaultProject(targetClientId);
    }

    /* Hedefte çözülemeyen görsel override'ları düşür (bound slotlar M1 ile zaten
       hedef veriye bakar); düşenler yanıtta listelenir */
    const overrides = JSON.parse(found.row.overrides_json) as Record<string, { value: unknown }>;
    const dropped: string[] = [];
    if (targetClientId !== found.clientId) {
      for (const [k, ov] of Object.entries(overrides)) {
        if (typeof ov?.value === "string" && ov.value.startsWith("ast_")) {
          if (!assetResolvable(ov.value, targetClientId)) {
            dropped.push(k);
            delete overrides[k];
          }
        }
      }
    }

    const now = nowISO();
    const row = {
      ...found.row,
      id: newId("doc"),
      project_id: projectId,
      overrides_json: JSON.stringify(overrides),
      status: "draft",
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
    return { document: rowToDocument(row, targetClientId), dropped_overrides: dropped };
  });
}
