/* PDF export hattı — CONSTITUTION §9.1/§9.3.
   Puppeteer, web'in /print/:id sayfasını açar (aynı bileşen mode:"print", M3).
   Bir export çağrısı print + preview üretir; ikisi aynı versiyon numarasını taşır. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { newId, nowISO, type ExportRecordDTO } from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { documentWithClient, rowToDocument } from "./documents.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  browserPromise ??= puppeteer.launch({ headless: true });
  return browserPromise;
}

type ExportRow = {
  id: string;
  document_id: string | null;
  project_id: string | null;
  /** F5-10: müşteri düzeyli export (dijital menü). Belge/proje bazlı kayıtlar bunu
      atlar → INSERT kolon listesinde yoksa DB'de NULL; okumada toDTO ?? null. */
  client_id?: string | null;
  kind: string;
  filepath: string;
  snapshot_json: string;
  version: number;
  created_at: string;
};

function toDTO(r: ExportRow): ExportRecordDTO {
  return {
    id: r.id,
    document_id: r.document_id,
    project_id: r.project_id ?? null,
    client_id: r.client_id ?? null,
    kind: r.kind as ExportRecordDTO["kind"],
    filepath: r.filepath,
    version: r.version,
    created_at: r.created_at,
  };
}

export { getBrowser, toDTO, type ExportRow };

export function exportRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string }; Body: { variants?: string[]; warnings?: unknown[] } }>(
    "/api/documents/:id/export",
    async (req, reply) => {
      const found = documentWithClient(req.params.id);
      if (!found) return reply.code(404).send({ error: "not_found" });

      const client = db
        .prepare("SELECT slug FROM clients WHERE id = ?")
        .get(found.clientId) as { slug: string } | undefined;
      if (!client) return reply.code(404).send({ error: "client_not_found" });

      const body = (req.body ?? {}) as { variants?: string[]; warnings?: unknown[] };
      const variants = (body.variants ?? ["print", "preview"]).filter(
        (v): v is "print" | "preview" => v === "print" || v === "preview"
      );
      if (variants.length === 0) {
        return reply.code(400).send({ error: "no_variants" });
      }

      const docDTO = rowToDocument(found.row, found.clientId);
      const version =
        ((db
          .prepare("SELECT MAX(version) AS v FROM export_records WHERE document_id = ?")
          .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

      const dir = path.join(EXPORTS_DIR, client.slug);
      await fs.mkdir(dir, { recursive: true });
      const day = nowISO().slice(0, 10);
      const format =
        typeof docDTO.params["format"] === "string" ? (docDTO.params["format"] as string) : "default";

      /* Uyarılar snapshot'a gömülür: "yine de export et" kayda geçer (M4) */
      const snapshot = JSON.stringify({ state: docDTO, warnings: body.warnings ?? [] });

      const browser = await getBrowser();
      const records: ExportRecordDTO[] = [];
      const insert = db.prepare(
        `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
         VALUES (@id, @document_id, @project_id, @kind, @filepath, @snapshot_json, @version, @created_at)`
      );

      for (const variant of variants) {
        const page = await browser.newPage();
        try {
          const url = `${PRINT_BASE}/print/${req.params.id}?variant=${variant}`;
          await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
          await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 30_000 });
          const size = (await page.evaluate("window.__PAGE_SIZE__")) as {
            w: number;
            h: number;
            pages: number;
          };

          const filename = `${day}_${docDTO.template_id}_${format}_v${version}_${variant}.pdf`;
          const abs = path.join(dir, filename);
          const pdf = await page.pdf({
            width: `${size.w}mm`,
            height: `${size.h}mm`,
            printBackground: true,
            pageRanges: `1-${size.pages}`,
          });
          await fs.writeFile(abs, pdf);

          const row: ExportRow = {
            id: newId("exp"),
            document_id: req.params.id,
            project_id: null,
            kind: variant,
            filepath: path.relative(ROOT_DIR, abs).split(path.sep).join("/"),
            snapshot_json: snapshot,
            version,
            created_at: nowISO(),
          };
          insert.run(row);
          records.push(toDTO(row));
        } finally {
          await page.close();
        }
      }

      reply.code(201);
      return records;
    }
  );

  /* Export geçmişi (v numaraları) */
  app.get<{ Params: { id: string } }>("/api/documents/:id/exports", async (req) => {
    const rows = db
      .prepare(
        "SELECT * FROM export_records WHERE document_id = ? ORDER BY version DESC, created_at DESC"
      )
      .all(req.params.id) as ExportRow[];
    return rows.map(toDTO);
  });

  /* Klasörde göster (yalnız data/ altı; local-first araç — FAZ2-GOREV §8) */
  app.post<{ Body: { filepath?: string } }>("/api/reveal", async (req, reply) => {
    const rel = (req.body?.filepath ?? "").replace(/\\/g, "/");
    if (!rel.startsWith("data/")) return reply.code(400).send({ error: "bad_path" });
    const abs = path.resolve(ROOT_DIR, rel);
    if (!abs.startsWith(path.resolve(ROOT_DIR, "data"))) {
      return reply.code(400).send({ error: "bad_path" });
    }
    const { spawn } = await import("node:child_process");
    if (process.platform === "win32") {
      spawn("explorer.exe", ["/select,", abs], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn(process.platform === "darwin" ? "open" : "xdg-open", [path.dirname(abs)], {
        detached: true,
        stdio: "ignore",
      }).unref();
    }
    return { ok: true };
  });
}
