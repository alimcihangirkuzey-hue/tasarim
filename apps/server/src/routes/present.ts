/* Sunum PDF'i (BAT) — FAZ2-GOREV §7, mimar kararı #1 (sunum kartı) + #3 (proje bazlı kayıt).
   Versiyon sayacı PROJE + TÜR bazında ilerler; document_id NULL kalır.

   F8-E/H4: mockup_mode="per_scene_kind" → belge×sahne-türü matrisi (tür başına
   EN SON mockup, çok-yüzey kurumsal sunum). Seçim SUNUCUDA yapılır çünkü
   ExportRecordDTO snapshot taşımaz (scene_id oradadır); web sayfası planı
   mplan URL parametresinden basar. mockup_mode="last" (default) = bugünkü
   davranış BİREBİR (URL'e mode/mplan hiç eklenmez). */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  PresentMockupModeSchema,
  classifySceneKind,
  newId,
  nowISO,
  pickLatestMockupPerSceneKind,
  slugify,
  type SceneKind,
} from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { getBrowser, toDTO, type ExportRow } from "./exports.js";
import { sceneById } from "./scenes.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

const PresentSchema = z.object({
  document_ids: z.array(z.string()).default([]),
  note: z.string().max(600).default(""),
  /** FAZ3-GOREV §3.4: son mockup varsa kart sonrası tam sayfa (default açık) */
  include_mockups: z.boolean().default(true),
  /** F8-E additive: "last" = bugünkü davranış (varsayılan) */
  mockup_mode: PresentMockupModeSchema.default("last"),
});

/* F8-E: çok-yüzey plan girdisi (kısa anahtarlar — URL'de taşınır):
   d=document_id · f=export filepath · k=scene kind */
type MockupPlanEntry = { d: string; f: string; k: SceneKind };

function buildMockupPlan(docIds: string[]): MockupPlanEntry[] {
  const q = db.prepare(
    `SELECT filepath, snapshot_json, version FROM export_records
     WHERE document_id = ? AND kind = 'mockup' ORDER BY version DESC, created_at DESC`
  );
  const out: MockupPlanEntry[] = [];
  for (const d of docIds) {
    const rows = q.all(d) as Array<{ filepath: string; snapshot_json: string; version: number }>;
    const cands = rows.map((r) => {
      let sceneId = "";
      try {
        sceneId = String((JSON.parse(r.snapshot_json) as { scene_id?: unknown }).scene_id ?? "");
      } catch {
        /* bozuk snapshot → sahnesiz sayılır (generic; M8 sessiz düşmez) */
      }
      const scene = sceneId ? sceneById(sceneId) : undefined;
      return { scene_kind: classifySceneKind(scene?.kind), version: r.version, filepath: r.filepath };
    });
    for (const c of pickLatestMockupPerSceneKind(cands)) out.push({ d, f: c.filepath, k: c.scene_kind });
  }
  return out;
}

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

    let url =
      `${PRINT_BASE}/present/${req.params.id}` +
      `?docs=${encodeURIComponent(docIds.join(","))}` +
      `&note=${encodeURIComponent(body.note)}&date=${day}` +
      `&mockups=${body.include_mockups ? "1" : "0"}`;
    /* F8-E: yalnız per_scene_kind modunda plan taşınır; "last" URL'i BİREBİR eski */
    if (body.include_mockups && body.mockup_mode === "per_scene_kind") {
      url +=
        `&mode=per_scene_kind` +
        `&mplan=${encodeURIComponent(JSON.stringify(buildMockupPlan(docIds)))}`;
    }

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
      /* F8-E: mockup_mode yalnız default-dışıysa snapshot'a yazılır (last kaydı birebir eski) */
      snapshot_json: JSON.stringify({
        document_ids: docIds,
        note: body.note,
        ...(body.mockup_mode !== "last" ? { mockup_mode: body.mockup_mode } : {}),
      }),
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
