/* Garment exportları — FAZ3-GOREV §6.
   impression: alan başına 300 dpi ALFA PNG (px = cm×300/2.54) + alan başına vektör PDF.
   broderie: PNG yok — alan başına text→path SVG + A4 Broderie Fişi PDF'i. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { GarmentParamsSchema, cmToPx300, newId, nowISO } from "@tezgah/shared";
import { productionChannelsOf } from "@tezgah/templates/identity";
import { garmentDosyaTabani } from "../dosya-adi.js";
import { db } from "../db.js";
import { baskiyaHazirBekle } from "../baski-bekle.js";
import { garmentKayitlari } from "../garment-kayitlari.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { documentWithClient, rowToDocument } from "./documents.js";
import { getBrowser, toDTO, type ExportRow } from "./exports.js";
import { EXTRACT_TEXT_RUNS, injectPaths, type TextRun } from "../vector.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";
const MM_PX = 96 / 25.4;

export function garmentRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string } }>("/api/documents/:id/export-garment", async (req, reply) => {
    const found = documentWithClient(req.params.id);
    if (!found) return reply.code(404).send({ error: "not_found" });
    const docDTO = rowToDocument(found.row, found.clientId);
    /* KANAL BEKÇİSİ (7.2/8.5, uretim-kanali-ilani): eski hâl `template_id
       !== "garment"` İD-SNİFF'iydi (C-P1'in temizlediği desenin kaçağı) —
       ikinci bir tekstil ailesi eklense uç onu reddederdi. Bu uç png/broderie
       kanalları üretir; bekçi artık o İLANI okur. Eski hata adı `not_garment`
       kanal sözlüğüne emekli edildi (UI hata adını tüketmiyor; journal kaydı). */
    const kanallar = productionChannelsOf(docDTO.template_id);
    if (kanallar === null || (!kanallar.includes("png") && !kanallar.includes("broderie"))) {
      return reply.code(400).send({
        error: "channel_not_declared",
        detail: { requested: ["png", "broderie"], declared: kanallar },
      });
    }
    const params = GarmentParamsSchema.parse(docDTO.params);
    const client = db
      .prepare("SELECT slug, name FROM clients WHERE id = ?")
      .get(found.clientId) as { slug: string; name: string };

    /* Alan boyutlarını sayfadan değil preset'ten alırız (deterministik) */
    const { GARMENT_AREAS, areasForKind } = await import("@tezgah/shared");
    const valid = areasForKind(params.garment_kind);
    let areaIds = params.areas.filter((a) => valid.includes(a));
    if (areaIds.length === 0) areaIds = [valid[0]];

    const kind = params.technique === "broderie" ? "broderie" : "png";
    const version =
      ((db
        .prepare(
          "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = ?"
        )
        .get(req.params.id, kind) as { v: number | null }).v ?? 0) + 1;

    const day = nowISO().slice(0, 10);
    const dir = path.join(EXPORTS_DIR, client.slug);
    await fs.mkdir(dir, { recursive: true });
    /* taban ad SÖZLEŞMEDEN (8.5, dosya-adi.ts) — alan/fiche ekleri aşağıda */
    const base = garmentDosyaTabani({ day, garmentKind: params.garment_kind, version });

    const browser = await getBrowser();
    const files: string[] = [];
    let fisDosyasi: string | null = null;

    for (let i = 0; i < areaIds.length; i++) {
      const areaId = areaIds[i];
      const preset = GARMENT_AREAS[areaId];
      const cssW = Math.round(preset.w_cm * 10 * MM_PX);
      const cssH = Math.round(preset.h_cm * 10 * MM_PX);
      const page = await browser.newPage();
      try {
        const url = `${PRINT_BASE}/print/${req.params.id}?variant=preview&page=${i}`;

        if (params.technique === "impression") {
          /* 300 dpi alfa PNG: css px × dpr(300/96) = cm×300/2.54 */
          await page.setViewport({ width: cssW, height: cssH, deviceScaleFactor: 300 / 96 });
          await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
          await baskiyaHazirBekle(page, 45_000);
          const png = await page.screenshot({ type: "png", omitBackground: true });
          const pngAbs = path.join(dir, `${base}_${areaId}.png`);
          await fs.writeFile(pngAbs, png);
          files.push(pngAbs);
          /* hedef px kontrolü (kabul §8/5): sapma > 2 px ise hata */
          const targetW = cmToPx300(preset.w_cm);
          const gotW = Math.round(cssW * (300 / 96));
          if (Math.abs(gotW - targetW) > 2) {
            return reply.code(500).send({ error: "px_mismatch", targetW, gotW });
          }
          /* vektör PDF (alan boyutunda) */
          const pdf = await page.pdf({
            width: `${preset.w_cm * 10}mm`,
            height: `${preset.h_cm * 10}mm`,
            printBackground: false,
            pageRanges: "1",
          });
          const pdfAbs = path.join(dir, `${base}_${areaId}.pdf`);
          await fs.writeFile(pdfAbs, pdf);
          files.push(pdfAbs);
        } else {
          /* broderie: text→path SVG */
          await page.setViewport({ width: cssW, height: cssH });
          await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
          await baskiyaHazirBekle(page, 45_000);
          const extracted = (await page.evaluate(EXTRACT_TEXT_RUNS)) as {
            runs: TextRun[];
            outer?: string;
            error?: string;
          };
          if (!extracted.outer) {
            return reply.code(500).send({ error: "extract_failed", detail: extracted.error });
          }
          const svg = injectPaths(extracted.outer, extracted.runs);
          const svgAbs = path.join(dir, `${base}_${areaId}.svg`);
          await fs.writeFile(svgAbs, `<?xml version="1.0" encoding="UTF-8"?>\n` + svg, "utf8");
          files.push(svgAbs);
        }
      } finally {
        await page.close();
      }
    }

    /* Broderie Fişi (A4) — /fiche sayfasından */
    if (params.technique === "broderie") {
      const page = await browser.newPage();
      try {
        await page.goto(`${PRINT_BASE}/fiche/${req.params.id}?date=${day}`, {
          waitUntil: "networkidle0",
          timeout: 60_000,
        });
        await baskiyaHazirBekle(page, 45_000);
        const pdf = await page.pdf({ width: "210mm", height: "297mm", printBackground: true });
        const ficheAbs = path.join(dir, `${base}_broderie-fiche.pdf`);
        await fs.writeFile(ficheAbs, pdf);
        /* FİŞ `files`E DE GİRER (denetim izi tam kalsın) ama KENDİ değişkeninde
           de tutulur: kayıt şekli artık onu tasarımdan AYIRIYOR — eskiden
           `files[files.length-1]` olduğu için tasarımın filepath'ini gasp
           ediyordu (garment-kayitlari.ts başlığı). */
        fisDosyasi = ficheAbs;
        files.push(ficheAbs);
      } finally {
        await page.close();
      }
    }

    /* KAYIT ŞEKLİ SAF KATMANDA (garment-kayitlari.ts): nakışta tasarım ve fiş
       AYRI kayıtlara düşer. Eskiden tek satır vardı ve `files[files.length-1]`
       yüzünden onun filepath'i FİŞE gidiyordu. */
    const rel = (f: string): string => path.relative(ROOT_DIR, f).split(path.sep).join("/");
    const taslaklar = garmentKayitlari(params.technique, {
      tasarim: files.filter((f) => f !== fisDosyasi),
      fis: fisDosyasi,
    });
    const ekle = db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
       VALUES (@id, @document_id, @project_id, @kind, @filepath, @snapshot_json, @version, @created_at)`
    );
    let row: ExportRow | null = null;
    for (const t of taslaklar) {
      /* Versiyon sayacı TÜR BAZINDA ilerler; fişin kendi sayacı vardır. */
      const v =
        t.kind === kind
          ? version
          : ((db
              .prepare(
                "SELECT MAX(version) AS v FROM export_records WHERE document_id = ? AND kind = ?"
              )
              .get(req.params.id, t.kind) as { v: number | null }).v ?? 0) + 1;
      const satir: ExportRow = {
        id: newId("exp"),
        document_id: req.params.id,
        project_id: null,
        kind: t.kind,
        filepath: rel(t.dosya),
        /* 8.5 dürüstlük: png=RGB / broderie=vektör, ICC-PDF/X yok (denetim izi) */
        snapshot_json: JSON.stringify({
          state: docDTO,
          files: files.map(rel),
          nitelikler: t.nitelikler,
        }),
        version: v,
        created_at: nowISO(),
      };
      ekle.run(satir);
      /* Yanıt TASARIM kaydıdır (fiş eki): çağıranın sözleşmesi değişmez. */
      if (t.kind === kind) row = satir;
    }

    /* row her zaman dolar (taslaklar en az bir tasarım kaydı içerir; saf katman
       tasarımsız turda FIRLATIR) — yine de sessiz `null` yanıtı üretmeyelim. */
    if (row === null) throw new Error("tekstil export: tasarım kaydı yazılamadı");

    reply.code(201);
    return {
      record: toDTO(row),
      files: files.map((f) => path.relative(ROOT_DIR, f).split(path.sep).join("/")),
    };
  });
}
