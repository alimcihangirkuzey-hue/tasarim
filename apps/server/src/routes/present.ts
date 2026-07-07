/* Sunum PDF'i (BAT) — FAZ2-GOREV §7, mimar kararı #1 (sunum kartı) + #3 (proje bazlı kayıt).
   Versiyon sayacı PROJE + TÜR bazında ilerler; document_id NULL kalır. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { newId, nowISO, slugify } from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { getBrowser, toDTO, type ExportRow } from "./exports.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

const PresentSchema = z.object({
  document_ids: z.array(z.string()).default([]),
  note: z.string().max(600).default(""),
});

export function presentRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string } }>("/api/projects/:id/present", async (req, reply) => {
    const project = db
      .prepare(
        `SELECT p.*, c.slug AS client_slug, c.name AS client_name
         FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = ?`
      )
      .get(req.params.id) as
      | { id: string; name: string; client_slug: string }
      | undefined;
    if (!project) return reply.code(404).send({ error: "not_found" });

    const body = PresentSchema.parse(req.body ?? {});
    let docIds = body.document_ids;
    if (docIds.length === 0) {
      docIds = (
        db
          .prepare("SELECT id FROM documents WHERE project_id = ? ORDER BY created_at ASC")
          .all(req.params.id) as Array<{ id: string }>
      ).map((r) => r.id);
    }
    if (docIds.length === 0) return reply.code(400).send({ error: "no_documents" });

    /* Mimar kararı #3: versiyon proje + tür bazında */
    const version =
      ((db
        .prepare(
          "SELECT MAX(version) AS v FROM export_records WHERE project_id = ? AND kind = 'presentation'"
        )
        .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

    const day = nowISO().slice(0, 10);
    const dir = path.join(EXPORTS_DIR, project.client_slug);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${day}_${slugify(project.name)}_a4_v${version}_presentation.pdf`;
    const abs = path.join(dir, filename);

    const url =
      `${PRINT_BASE}/present/${req.params.id}` +
      `?docs=${encodeURIComponent(docIds.join(","))}` +
      `&note=${encodeURIComponent(body.note)}&date=${day}`;

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
      await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 45_000 });
      const size = (await page.evaluate("window.__PAGE_SIZE__")) as {
        w: number;
        h: number;
        pages: number;
      };
      const pdf = await page.pdf({
        width: `${size.w}mm`,
        height: `${size.h}mm`,
        printBackground: true,
        pageRanges: `1-${size.pages}`,
      });
      await fs.writeFile(abs, pdf);
    } finally {
      await page.close();
    }

    const row: ExportRow = {
      id: newId("exp"),
      document_id: null,
      project_id: req.params.id,
      kind: "presentation",
      filepath: path.relative(ROOT_DIR, abs).split(path.sep).join("/"),
      snapshot_json: JSON.stringify({ document_ids: docIds, note: body.note }),
      version,
      created_at: nowISO(),
    };
    db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
       VALUES (@id, @document_id, @project_id, @kind, @filepath, @snapshot_json, @version, @created_at)`
    ).run(row);

    reply.code(201);
    return toDTO(row);
  });

  /* Proje sunum geçmişi */
  app.get<{ Params: { id: string } }>("/api/projects/:id/exports", async (req) => {
    const rows = db
      .prepare(
        "SELECT * FROM export_records WHERE project_id = ? ORDER BY version DESC"
      )
      .all(req.params.id) as ExportRow[];
    return rows.map(toDTO);
  });
}
