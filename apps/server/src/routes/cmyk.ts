/* CMYK export opsiyonu — FAZ4-GOREV §13, ADR-4 (v1 RGB; CMYK opsiyonel).
   Ghostscript varsa son print PDF'i pdfwrite ile DeviceCMYK'ye çevirir;
   yoksa uç 503 döner, arayüz düğmeyi pasif gösterip kurulum yönlendirir. */

import type { FastifyInstance } from "fastify";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { newId, nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { ROOT_DIR } from "../paths.js";
import { toDTO, type ExportRow } from "./exports.js";

let cached: { bin: string; version: string } | null | undefined;

/** gswin64c (Windows) ya da gs (PATH) tespiti — sonuç süreç ömrünce önbellekli */
export function detectGs(): { bin: string; version: string } | null {
  if (cached !== undefined) return cached;
  for (const bin of ["gswin64c", "gs"]) {
    try {
      const r = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 5000 });
      if (r.status === 0 && r.stdout.trim()) {
        cached = { bin, version: r.stdout.trim() };
        return cached;
      }
    } catch {
      /* sıradakini dene */
    }
  }
  cached = null;
  return null;
}

export function cmykRoutes(app: FastifyInstance): void {
  app.get("/api/cmyk/status", async () => {
    const gs = detectGs();
    return { available: !!gs, version: gs?.version ?? null };
  });

  app.post<{ Params: { id: string } }>("/api/documents/:id/export-cmyk", async (req, reply) => {
    const gs = detectGs();
    if (!gs) {
      return reply.code(503).send({
        error: "ghostscript_missing",
        detail: "Ghostscript kurulu değil (gswin64c/gs PATH'te olmalı) — https://ghostscript.com",
      });
    }

    /* kaynak: belgenin SON print PDF'i */
    const src = db
      .prepare(
        `SELECT * FROM export_records WHERE document_id = ? AND kind = 'print'
         ORDER BY version DESC LIMIT 1`
      )
      .get(req.params.id) as ExportRow | undefined;
    if (!src) return reply.code(400).send({ error: "no_print_export", detail: "Önce print PDF al" });

    const srcAbs = path.join(ROOT_DIR, src.filepath);
    const outAbs = srcAbs.replace(/_print\.pdf$/, "_print-cmyk.pdf");
    if (outAbs === srcAbs) return reply.code(500).send({ error: "bad_filename" });

    const r = spawnSync(
      gs.bin,
      [
        "-dBATCH", "-dNOPAUSE", "-dQUIET",
        "-sDEVICE=pdfwrite",
        "-sColorConversionStrategy=CMYK",
        "-dProcessColorModel=/DeviceCMYK",
        `-o`, outAbs,
        srcAbs,
      ],
      { encoding: "utf8", timeout: 120_000 }
    );
    if (r.status !== 0) {
      return reply.code(500).send({ error: "gs_failed", detail: (r.stderr || "").slice(0, 400) });
    }
    await fs.access(outAbs);

    /* mimar #13: print_cmyk mevcut versiyon sayacı mantığına katılır */
    const version =
      ((db
        .prepare(
          "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = 'print_cmyk'"
        )
        .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

    const row: ExportRow = {
      id: newId("exp"),
      document_id: req.params.id,
      project_id: null,
      kind: "print_cmyk",
      filepath: path.relative(ROOT_DIR, outAbs).split(path.sep).join("/"),
      snapshot_json: JSON.stringify({ source_export: src.id, gs: gs.version }),
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
}
