/* Şablon fabrikası ucu — FAZ4-GOREV §12 (d), mimar kararı #12.
   Üretilen dosyalar packages/templates/src/generated/<id>/ altına yazılır;
   barrel yeniden üretilir; vite dev yeniden derler → şablon anında kayıtlı.
   Local-first tek kullanıcı varsayımı: sunucu repo çalışma kopyasına yazar. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { nowISO } from "@tezgah/shared";
import { ROOT_DIR } from "../paths.js";
import {
  generateBarrel,
  generateIndexTs,
  generateManifestTs,
  generateTemplateTsx,
  validateFactoryInput,
  type FactoryInput,
} from "../factory.js";

const GENERATED_DIR = path.join(ROOT_DIR, "packages", "templates", "src", "generated");

/* El yazımı kayıt defteri kimlikleri — üretim bunlarla çakışamaz */
const HANDWRITTEN_IDS = [
  "menu-grid-cells", "menu-liste-premium", "menu-trifold", "flyer", "carte-fidelite",
  "vitro-bandeau", "vitro-centre", "vitro-colonne", "enseigne-panneau", "garment",
];

const BBox = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const TextAttrs = z.object({
  x: z.number(), y: z.number(), fontSize: z.number().positive(),
  anchor: z.string().default("start"), fill: z.string().default("var(--c-item)"),
});
const InputSchema = z.object({
  id: z.string(),
  name_tr: z.string().min(1).max(80),
  w_mm: z.number().positive(),
  h_mm: z.number().positive(),
  viewBox: BBox,
  staticInner: z.string().max(2_000_000),
  marks: z.array(
    z.object({
      slotId: z.string().regex(/^[a-z][a-z0-9_-]{1,30}$/),
      kind: z.enum(["text", "image", "color", "price", "qr", "badge"]),
      bind: z.string().nullable(),
      default_fr: z.string().optional(),
      font_mm: z.object({ min: z.number(), max: z.number() }).optional(),
      maxLines: z.number().int().positive().optional(),
      bbox: BBox,
      text: TextAttrs.optional(),
      chunk: z.string().max(100_000).optional(),
    })
  ),
  proto: z
    .object({
      bbox: BBox,
      cols: z.number().int().min(1).max(8),
      gap: z.number().min(0),
      yon: z.enum(["row", "column"]).default("row"),
      staticChunk: z.string().max(500_000),
      itemSlots: z.array(
        z.object({
          slot: z.enum(["name", "desc", "photo", "price"]),
          bbox: BBox,
          text: TextAttrs.optional(),
        })
      ),
    })
    .nullable(),
  /* Künye (#20) — imported_at sunucuda damgalanır, istemci göndermez */
  provenance: z
    .object({
      source_filename: z.string().max(260).default(""),
      source_note: z.string().max(2000).default(""),
      fonts: z.array(z.string()).default([]),
      embedded_assets: z.number().int().nonnegative().default(0),
      missing_assets: z.array(z.string()).default([]),
      svg_sha256: z.string().max(64).default(""),
    })
    .optional(),
});

async function generatedIds(): Promise<string[]> {
  try {
    const entries = await fs.readdir(GENERATED_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export function factoryRoutes(app: FastifyInstance): void {
  app.get("/api/factory/generated", async () => generatedIds());

  app.post("/api/factory/generate", async (req, reply) => {
    const parsed = InputSchema.parse(req.body ?? {});
    /* Künye: imported_at sunucu saatiyle damgalanır (#20) */
    const input: FactoryInput = {
      ...parsed,
      provenance: parsed.provenance ? { ...parsed.provenance, imported_at: nowISO() } : undefined,
    } as FactoryInput;
    const existing = [...HANDWRITTEN_IDS, ...(await generatedIds())];
    const err = validateFactoryInput(input, existing);
    if (err) return reply.code(400).send({ error: "invalid_input", detail: err });

    const dir = path.join(GENERATED_DIR, input.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "manifest.ts"), generateManifestTs(input), "utf8");
    await fs.writeFile(path.join(dir, "Template.tsx"), generateTemplateTsx(input), "utf8");
    await fs.writeFile(path.join(dir, "index.ts"), generateIndexTs(), "utf8");

    const ids = await generatedIds();
    await fs.writeFile(path.join(GENERATED_DIR, "index.ts"), generateBarrel(ids), "utf8");

    reply.code(201);
    return {
      id: input.id,
      files: [
        `packages/templates/src/generated/${input.id}/manifest.ts`,
        `packages/templates/src/generated/${input.id}/Template.tsx`,
        `packages/templates/src/generated/${input.id}/index.ts`,
        "packages/templates/src/generated/index.ts",
      ],
    };
  });
}
