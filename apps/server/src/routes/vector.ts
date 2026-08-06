/* Vektör SVG exportu — découpe (vitro) ve broderie (garment) ortak ucu.
   FAZ3-GOREV §4/§6: çıktıda <text> kalmaz; kesimde raster logo kabul edilmez. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { newId, nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { baskiyaHazirBekle } from "../baski-bekle.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { documentWithClient, rowToDocument } from "./documents.js";
import { getBrowser, toDTO, type ExportRow } from "./exports.js";
import { paramlariDogrula } from "../param-kapisi.js";
import { svgExportKind } from "../material-routing.js";
import { exportDosyaAdi } from "../dosya-adi.js";
import { kanalNitelikleriOf } from "@tezgah/templates/identity";
import { EXTRACT_TEXT_RUNS, injectPaths, type TextRun } from "../vector.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

export function vectorRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string }; Body: { kind?: string } }>(
    "/api/documents/:id/export-svg",
    async (req, reply) => {
      const found = documentWithClient(req.params.id);
      if (!found) return reply.code(404).send({ error: "not_found" });
      const docDTO = rowToDocument(found.row, found.clientId);

      /* C-P1: tür manifest'ten okunur (cam → découpe, tekstil → broderie);
         kayıtsız/diğer id eskisi gibi 400'e düşer */
      const kind = svgExportKind(docDTO.template_id);
      if (kind === null) {
        return reply.code(400).send({ error: "svg_export_only_vitro_or_garment" });
      }
      const isVitro = kind === "decoupe";

      /* PARAM KAPISI — İCRA SINIRINDA ERKEN RED (journal 2026-07-27-sunucu-
         params-dogrulamasi; garment.ts:37 emsali, exports.ts ile aynı kapı):
         kind bekçisinden SONRA (mevcut 400 svg_export_only_vitro_or_garment
         sırası değişmez), getBrowser'dan ÖNCE — bozuk params'lı belge 30-45 sn
         Puppeteer timeout + 500 yerine anında 400 + issues[] alır. */
      paramlariDogrula(docDTO.template_id, docDTO.params);

      const client = db
        .prepare("SELECT slug FROM clients WHERE id = ?")
        .get(found.clientId) as { slug: string };

      const browser = await getBrowser();
      const page = await browser.newPage();
      let svgOut: string;
      try {
        await page.goto(`${PRINT_BASE}/print/${req.params.id}?variant=preview`, {
          waitUntil: "networkidle0",
          timeout: 60_000,
        });
        await baskiyaHazirBekle(page, 45_000);

        /* Découpe kuralı: raster görsel (png/jpg) kesilemez — SVG logo şart */
        if (isVitro) {
          const rasterCount = (await page.evaluate(
            `Array.from(document.querySelectorAll(".sheet svg image"))
               .filter((i) => !/\\.svg$/i.test(i.getAttribute("href") || "")).length`
          )) as number;
          if (rasterCount > 0) {
            return reply
              .code(400)
              .send({ error: "raster_in_decoupe", detail: "Kesim için mono logo SVG olmalı" });
          }
        }

        const extracted = (await page.evaluate(EXTRACT_TEXT_RUNS)) as {
          runs: TextRun[];
          outer?: string;
          error?: string;
        };
        if (!extracted.outer) {
          return reply.code(500).send({ error: "extract_failed", detail: extracted.error });
        }
        svgOut = injectPaths(extracted.outer, extracted.runs);
      } finally {
        await page.close();
      }

      const version =
        ((db
          .prepare(
            "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = ?"
          )
          .get(req.params.id, kind) as { v: number | null }).v ?? 0) + 1;

      const day = nowISO().slice(0, 10);
      const format =
        typeof docDTO.params["format"] === "string"
          ? (docDTO.params["format"] as string)
          : `${String(docDTO.params["w_cm"] ?? "x")}x${String(docDTO.params["h_cm"] ?? "x")}cm`;
      const dir = path.join(EXPORTS_DIR, client.slug);
      await fs.mkdir(dir, { recursive: true });
      /* ad SÖZLEŞMEDEN (8.5, dosya-adi.ts) */
      const abs = path.join(
        dir,
        exportDosyaAdi({ day, templateId: docDTO.template_id, format, version, kind, uzanti: "svg" })
      );
      await fs.writeFile(
        abs,
        `<?xml version="1.0" encoding="UTF-8"?>\n` + svgOut,
        "utf8"
      );

      const row: ExportRow = {
        id: newId("exp"),
        document_id: req.params.id,
        project_id: null,
        kind,
        filepath: path.relative(ROOT_DIR, abs).split(path.sep).join("/"),
        /* 8.5 dürüstlük: vektör çıktı — renk yönetimi uygulanmaz (denetim izi) */
        snapshot_json: JSON.stringify({ state: docDTO, nitelikler: kanalNitelikleriOf(kind) }),
        version,
        created_at: nowISO(),
      };
      db.prepare(
        `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
         VALUES (@id, @document_id, @project_id, @kind, @filepath, @snapshot_json, @version, @created_at)`
      ).run(row);

      reply.code(201);
      return toDTO(row);
    }
  );
}
