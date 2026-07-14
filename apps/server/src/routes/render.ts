/* T3 PART-B adım-1 — Render Contract v1 kapısı: POST /render (B→C makine kanalı;
   styva FLYER M7 buradan çağırır). Kısıtlar (paket): additive-only · mevcut
   davranışa SIFIR dokunuş (PrintPage/exports/MockupPage el değmez — getBrowser
   yalnız IMPORT edilir) · contract dışı yüzey yok.

   Kapı varsayılan KAPALI (local-first güvenli duruş): RENDER_CONTRACT_SECRET
   env'i yoksa 503 contract_disabled — görünür, sessiz değil. STATELESS şim:
   export_records'a YAZMAZ (versiyon sayacı/geçmiş atölye UI kanalınındır;
   provenance = yanıt meta'sı + dosya adı). Çıktı ayrı klasörde
   (data/exports/_contract/<slug>/) — atölye export adlandırmasıyla çakışmaz. */

import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { documentWithClient, rowToDocument } from "./documents.js";
import { getBrowser } from "./exports.js";
import {
  RENDER_CONTRACT_V,
  RenderRequestV1Schema,
  verifyRender,
} from "../render-contract.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

export function renderRoutes(app: FastifyInstance): void {
  app.post("/render", async (req, reply) => {
    const secret = process.env.RENDER_CONTRACT_SECRET;
    if (!secret) {
      return reply.code(503).send({
        error: "contract_disabled",
        hint: "RENDER_CONTRACT_SECRET tanımlı değil — render kapısı kapalı (varsayılan güvenli duruş).",
      });
    }

    const body = RenderRequestV1Schema.parse(req.body ?? {});
    const sig = req.headers["x-render-signature"];
    if (!verifyRender(body, typeof sig === "string" ? sig : undefined, secret)) {
      return reply.code(401).send({ error: "invalid_signature" });
    }

    const found = documentWithClient(body.doc);
    if (!found) return reply.code(404).send({ error: "document_not_found" });
    const client = db.prepare("SELECT slug FROM clients WHERE id = ?").get(found.clientId) as
      | { slug: string }
      | undefined;
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    const docDTO = rowToDocument(found.row, found.clientId);

    /* Engine iç çağrısı: mevcut /print sayfası (M3 tek render kaynağı) —
       exports.ts rotasıyla aynı desen, exports.ts DEĞİŞTİRİLMEDEN. */
    const browser = await getBrowser();
    const page = await browser.newPage();
    let pdf: Uint8Array;
    let size: { w: number; h: number; pages: number };
    try {
      await page.goto(`${PRINT_BASE}/print/${body.doc}?variant=${body.variant}`, {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });
      await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 30_000 });
      size = (await page.evaluate("window.__PAGE_SIZE__")) as { w: number; h: number; pages: number };
      pdf = await page.pdf({
        width: `${size.w}mm`,
        height: `${size.h}mm`,
        printBackground: true,
        pageRanges: `1-${size.pages}`,
      });
    } finally {
      await page.close();
    }

    const dir = path.join(EXPORTS_DIR, "_contract", client.slug);
    await fs.mkdir(dir, { recursive: true });
    const created_at = nowISO();
    const abs = path.join(dir, `render_v${RENDER_CONTRACT_V}_${body.doc}_${body.variant}_${Date.parse(created_at)}.pdf`);
    await fs.writeFile(abs, pdf);
    const file = path.relative(ROOT_DIR, abs).split(path.sep).join("/");

    reply.code(201);
    return {
      file,
      meta: {
        contract_v: RENDER_CONTRACT_V,
        document_id: body.doc,
        template_id: docDTO.template_id,
        variant: body.variant,
        target: body.target,
        watermark: body.watermark,
        /* v1 şimi filigran uygulamaz — GÖRÜNÜR bildirim (M8), sessiz düşme yok */
        watermark_applied: false,
        ...(body.watermark ? { note: "watermark v1 şiminde uygulanmaz (engine'de taslak-filigran yok; ADR-005)" } : {}),
        pages: size.pages,
        page_w_mm: size.w,
        page_h_mm: size.h,
        sha256: crypto.createHash("sha256").update(pdf).digest("hex"),
        created_at,
      },
    };
  });
}
