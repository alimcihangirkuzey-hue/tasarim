/* Kullanıcı font yükleme + glif bekçisi — FAZ5-GOREV §7, mimar kararı #18.
   woff2/ttf yüklenir → fontkit ile parse → #18 kapsam kümesi kontrol edilir →
   eksikse 400 + eksik glif listesi; tamsa custom_fonts + data/fonts/.
   Print @font-face aynı /fonts/ kaynağını kullanır (M3). */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import * as fontkitNS from "fontkit";
import { BrandKitSchema, FontFamilySchema, missingCoverageGlyphs, newId, nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { FONTS_DIR } from "../paths.js";

type FontLike = { hasGlyphForCodePoint(cp: number): boolean };
const fk = fontkitNS as unknown as {
  create?: (b: Buffer) => FontLike;
  default?: { create: (b: Buffer) => FontLike };
};
const createFont = (fk.create ?? fk.default?.create)!;

const ALLOWED: Record<string, string> = {
  "font/woff2": "woff2",
  "application/font-woff2": "woff2",
  "font/ttf": "ttf",
  "font/sfnt": "ttf",
  "application/x-font-ttf": "ttf",
  "application/octet-stream": "", // uzantıdan çözülür
};

type FontRow = { id: string; family: string; filename: string; created_at: string };

export function fontRoutes(app: FastifyInstance): void {
  app.get("/api/fonts", async () => {
    return db.prepare("SELECT id, family, filename, created_at FROM custom_fonts ORDER BY family ASC").all() as FontRow[];
  });

  app.post("/api/fonts", async (req, reply) => {
    const mp = await req.file();
    if (!mp) return reply.code(400).send({ error: "file_missing" });

    const rawFamily = (() => {
      const f = mp.fields["family"] as unknown as { value?: unknown } | undefined;
      return typeof f?.value === "string" ? f.value : "";
    })();
    const parsedFamily = FontFamilySchema.safeParse(rawFamily);
    if (!parsedFamily.success) {
      return reply.code(400).send({ error: "family_invalid", detail: parsedFamily.error.issues[0]?.message });
    }
    const family = parsedFamily.data;

    /* uzantı: mimetype ya da dosya adından */
    const extFromName = path.extname(mp.filename).slice(1).toLowerCase();
    let ext = ALLOWED[mp.mimetype];
    if (ext === "" || ext === undefined) ext = extFromName === "ttf" || extFromName === "otf" ? "ttf" : extFromName;
    if (ext !== "woff2" && ext !== "ttf") {
      return reply.code(415).send({ error: "unsupported_type", detail: `${mp.mimetype} / .${extFromName}` });
    }

    const buf = await mp.toBuffer();

    /* #18 glif kapsam bekçisi — YALNIZ kullanıcı yüklemesine */
    let font: FontLike;
    try {
      font = createFont(buf);
    } catch {
      return reply.code(400).send({ error: "parse_failed", detail: "Font dosyası okunamadı" });
    }
    const missing = missingCoverageGlyphs((cp) => font.hasGlyphForCodePoint(cp));
    if (missing.length > 0) {
      return reply.code(400).send({ error: "missing_glyphs", missing });
    }

    /* family benzersiz mi */
    const exists = db.prepare("SELECT 1 FROM custom_fonts WHERE family = ?").get(family);
    if (exists) return reply.code(409).send({ error: "family_exists", detail: family });

    const id = newId("fnt");
    const filename = `${id}.${ext}`;
    await fs.writeFile(path.join(FONTS_DIR, filename), buf);
    const row: FontRow = { id, family, filename, created_at: nowISO() };
    db.prepare(
      "INSERT INTO custom_fonts (id, family, filename, created_at) VALUES (@id, @family, @filename, @created_at)"
    ).run(row);
    reply.code(201);
    return row;
  });

  /* Silme — kullanımda ise (kit/tema referanslı) 409; nerede kullanıldığı söylenir */
  app.delete<{ Params: { id: string } }>("/api/fonts/:id", async (req, reply) => {
    const row = db
      .prepare("SELECT id, family, filename FROM custom_fonts WHERE id = ?")
      .get(req.params.id) as FontRow | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });

    const usages: Array<{ where: string; label: string }> = [];
    /* marka kiti fonts.heading / fonts.body */
    const clients = db.prepare("SELECT name, brandkit_json FROM clients").all() as Array<{
      name: string;
      brandkit_json: string;
    }>;
    for (const c of clients) {
      try {
        const kit = BrandKitSchema.parse(JSON.parse(c.brandkit_json));
        if (kit.fonts.heading === row.family || kit.fonts.body === row.family) {
          usages.push({ where: "marka kiti", label: c.name });
        }
      } catch {
        /* bozuk kit atlanır */
      }
    }
    /* temalar: tokens_json font anahtarları family'yi içerebilir */
    const themes = db.prepare("SELECT name, tokens_json FROM themes").all() as Array<{
      name: string;
      tokens_json: string;
    }>;
    for (const th of themes) {
      if (th.tokens_json.includes(`"${row.family}"`)) usages.push({ where: "tema", label: th.name });
    }

    if (usages.length > 0) return reply.code(409).send({ error: "in_use", usages });

    db.prepare("DELETE FROM custom_fonts WHERE id = ?").run(req.params.id);
    await fs.rm(path.join(FONTS_DIR, row.filename), { force: true });
    return { ok: true };
  });
}
