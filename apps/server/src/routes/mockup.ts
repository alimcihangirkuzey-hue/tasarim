/* Mockup JPG üretimi — FAZ3-GOREV §3.3 (mimar #5: /mockup sayfasının ekran görüntüsü).
   Versiyon sayacı belge + kind:'mockup' bazında; §9.3 adlandırma `_mockup.jpg`.
   F8-D/H2: çözünürlük tavanı MOCKUP_MAX_W (shared — MockupPage ile AYNI sabit,
   dedupe). Damga /mockup sayfasında piksele gömülü gelir (mockup ≠ baskı
   provası, ADR-005).

   F8-E (ADR-005 tadili — "yolun yokluğu" → "KAPILI YOL"): yüksek-çöz (EKRAN)
   artık AYRI uçtan mümkün: POST /api/documents/:id/mockup-hires — zorunlu
   re-onay literal'i (MockupHiresRequestSchema z.literal; yanlış/eksik → 400) +
   koşulsuz damga + ayrı kind (mockup_hires) + MOCKUP_HIRES_MAX_W=3200 tavanı.
   Varsayılan uç/tavan AYNEN. İki uç da sayfaya &shot=1 geçer: operatör hires
   çubuğu YALNIZ canlı görünümde render olur, ekran görüntüsüne giremez. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  MOCKUP_HIRES_MAX_W,
  MOCKUP_MAX_W,
  MockupHiresRequestSchema,
  newId,
  nowISO,
} from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { documentWithClient, rowToDocument } from "./documents.js";
import { getBrowser, toDTO, type ExportRow } from "./exports.js";
import { sceneById } from "./scenes.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

const MockupSchema = z.object({ scene_id: z.string().min(1) });

/** Foto pikselinden görüntü boyutu — cap: MOCKUP_MAX_W (default) | MOCKUP_HIRES_MAX_W (hires). */
function mockupDims(
  asset: { width_px: number; height_px: number },
  cap: number
): { dispW: number; dispH: number } {
  const pw = asset.width_px || cap;
  const ph = asset.height_px || Math.round(cap * 0.75);
  const dispW = Math.min(cap, pw);
  return { dispW, dispH: Math.round((ph * dispW) / pw) };
}

export function mockupRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string } }>("/api/documents/:id/mockup", async (req, reply) => {
    const found = documentWithClient(req.params.id);
    if (!found) return reply.code(404).send({ error: "not_found" });
    const body = MockupSchema.parse(req.body ?? {});

    const scene = sceneById(body.scene_id);
    if (!scene) return reply.code(404).send({ error: "scene_not_found" });
    if (scene.client_id !== null && scene.client_id !== found.clientId) {
      return reply.code(400).send({ error: "scene_not_visible" });
    }
    const asset = db
      .prepare("SELECT width_px, height_px FROM assets WHERE id = ?")
      .get(scene.photo_asset_id) as { width_px: number; height_px: number } | undefined;
    if (!asset) return reply.code(400).send({ error: "scene_photo_missing" });

    const client = db
      .prepare("SELECT slug FROM clients WHERE id = ?")
      .get(found.clientId) as { slug: string };
    const docDTO = rowToDocument(found.row, found.clientId);

    const version =
      ((db
        .prepare(
          "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = 'mockup'"
        )
        .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

    const { dispW, dispH } = mockupDims(asset, MOCKUP_MAX_W);

    const browser = await getBrowser();
    const page = await browser.newPage();
    let jpg: Uint8Array;
    try {
      await page.setViewport({ width: dispW, height: dispH, deviceScaleFactor: 1 });
      await page.goto(
        `${PRINT_BASE}/mockup/${req.params.id}?scene=${encodeURIComponent(body.scene_id)}&shot=1`,
        { waitUntil: "networkidle0", timeout: 60_000 }
      );
      await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 45_000 });
      jpg = await page.screenshot({ type: "jpeg", quality: 85 });
    } finally {
      await page.close();
    }

    const day = nowISO().slice(0, 10);
    const format =
      typeof docDTO.params["format"] === "string" ? (docDTO.params["format"] as string) : "default";
    const dir = path.join(EXPORTS_DIR, client.slug);
    await fs.mkdir(dir, { recursive: true });
    const abs = path.join(dir, `${day}_${docDTO.template_id}_${format}_v${version}_mockup.jpg`);
    await fs.writeFile(abs, jpg);

    const row: ExportRow = {
      id: newId("exp"),
      document_id: req.params.id,
      project_id: null,
      kind: "mockup",
      filepath: path.relative(ROOT_DIR, abs).split(path.sep).join("/"),
      snapshot_json: JSON.stringify({ scene_id: body.scene_id }),
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

  /* F8-E: KAPILI yüksek-çöz (EKRAN) ucu. Varsayılan uçla farkları:
     re-onay literal'i şemada (yanlış/eksik → ZodError → 400, setErrorHandler) ·
     tavan MOCKUP_HIRES_MAX_W · sayfaya &hires=1 (MockupPage tavanı yalnız bu
     parametreyle yükseltir) · kind/versiyon/adlandırma 'mockup_hires'.
     Damga sayfada KOŞULSUZ — bu uçta da piksele gömülü çıkar. */
  app.post<{ Params: { id: string } }>("/api/documents/:id/mockup-hires", async (req, reply) => {
    const found = documentWithClient(req.params.id);
    if (!found) return reply.code(404).send({ error: "not_found" });
    const body = MockupHiresRequestSchema.parse(req.body ?? {});

    const scene = sceneById(body.scene_id);
    if (!scene) return reply.code(404).send({ error: "scene_not_found" });
    if (scene.client_id !== null && scene.client_id !== found.clientId) {
      return reply.code(400).send({ error: "scene_not_visible" });
    }
    const asset = db
      .prepare("SELECT width_px, height_px FROM assets WHERE id = ?")
      .get(scene.photo_asset_id) as { width_px: number; height_px: number } | undefined;
    if (!asset) return reply.code(400).send({ error: "scene_photo_missing" });

    const client = db
      .prepare("SELECT slug FROM clients WHERE id = ?")
      .get(found.clientId) as { slug: string };
    const docDTO = rowToDocument(found.row, found.clientId);

    const version =
      ((db
        .prepare(
          "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = 'mockup_hires'"
        )
        .get(req.params.id) as { v: number | null }).v ?? 0) + 1;

    const { dispW, dispH } = mockupDims(asset, MOCKUP_HIRES_MAX_W);

    const browser = await getBrowser();
    const page = await browser.newPage();
    let jpg: Uint8Array;
    try {
      await page.setViewport({ width: dispW, height: dispH, deviceScaleFactor: 1 });
      await page.goto(
        `${PRINT_BASE}/mockup/${req.params.id}?scene=${encodeURIComponent(body.scene_id)}&hires=1&shot=1`,
        { waitUntil: "networkidle0", timeout: 60_000 }
      );
      await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 45_000 });
      jpg = await page.screenshot({ type: "jpeg", quality: 85 });
    } finally {
      await page.close();
    }

    const day = nowISO().slice(0, 10);
    const format =
      typeof docDTO.params["format"] === "string" ? (docDTO.params["format"] as string) : "default";
    const dir = path.join(EXPORTS_DIR, client.slug);
    await fs.mkdir(dir, { recursive: true });
    const abs = path.join(dir, `${day}_${docDTO.template_id}_${format}_v${version}_mockup-hires.jpg`);
    await fs.writeFile(abs, jpg);

    const row: ExportRow = {
      id: newId("exp"),
      document_id: req.params.id,
      project_id: null,
      kind: "mockup_hires",
      filepath: path.relative(ROOT_DIR, abs).split(path.sep).join("/"),
      snapshot_json: JSON.stringify({ scene_id: body.scene_id }),
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
