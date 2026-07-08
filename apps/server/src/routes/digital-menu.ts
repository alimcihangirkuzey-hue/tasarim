/* Dijital menü (statik HTML) üretimi — FAZ5-GOREV §9, mimar kararı #16.
   Katalog + kitten TEK dosyalık HTML (ortak saf motor renderDigitalMenu) üretir,
   data/exports/<slug>/ altına yazar, export_records'e MÜŞTERİ düzeyli kayıt açar
   (client_id dolu; belge/proje null — migration v7). Dosya file:// ile çevrimdışı açılır. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BrandKitSchema,
  CatalogSchema,
  renderDigitalMenu,
  newId,
  nowISO,
  slugify,
  type ClientDTO,
} from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { toDTO, type ExportRow } from "./exports.js";

type ClientRow = {
  id: string;
  name: string;
  slug: string;
  notes: string;
  currency: ClientDTO["currency"];
  brandkit_json: string;
  catalog_json: string;
  created_at: string;
  updated_at: string;
};

export function digitalMenuRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string } }>("/api/clients/:id/menu-digital", async (req, reply) => {
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id) as ClientRow | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });

    const client: ClientDTO = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      notes: row.notes,
      currency: row.currency,
      brandkit: BrandKitSchema.parse(JSON.parse(row.brandkit_json)),
      catalog: CatalogSchema.parse(JSON.parse(row.catalog_json)),
      assets: [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const html = renderDigitalMenu(client);

    /* versiyon: müşteri + tür bazında ilerler */
    const version =
      ((db
        .prepare("SELECT MAX(version) AS v FROM export_records WHERE client_id = ? AND kind = 'digital_menu'")
        .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

    const day = nowISO().slice(0, 10);
    const dir = path.join(EXPORTS_DIR, row.slug);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${day}_${slugify(row.name)}_menu-digital_v${version}.html`;
    const abs = path.join(dir, filename);
    await fs.writeFile(abs, html, "utf8");

    const record: ExportRow = {
      id: newId("exp"),
      document_id: null,
      project_id: null,
      client_id: req.params.id,
      kind: "digital_menu",
      filepath: path.relative(ROOT_DIR, abs).split(path.sep).join("/"),
      snapshot_json: JSON.stringify({ categories: client.catalog.categories.length }),
      version,
      created_at: nowISO(),
    };
    db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, client_id, kind, filepath, snapshot_json, version, created_at)
       VALUES (@id, @document_id, @project_id, @client_id, @kind, @filepath, @snapshot_json, @version, @created_at)`
    ).run(record);

    reply.code(201);
    return toDTO(record);
  });

  /* Müşteri dijital menü geçmişi */
  app.get<{ Params: { id: string } }>("/api/clients/:id/menu-digital/history", async (req) => {
    const rows = db
      .prepare("SELECT * FROM export_records WHERE client_id = ? AND kind = 'digital_menu' ORDER BY version DESC")
      .all(req.params.id) as ExportRow[];
    return rows.map(toDTO);
  });
}
