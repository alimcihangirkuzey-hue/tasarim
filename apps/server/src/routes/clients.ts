import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import {
  BrandKitSchema,
  CatalogSchema,
  ClientCreateSchema,
  ClientUpdateSchema,
  CurrencySchema,
  MenuLanguageSchema,
  defaultBrandKit,
  newId,
  nowISO,
  slugify,
  type AssetDTO,
  type ClientDTO,
  type ClientSummaryDTO,
} from "@tezgah/shared";
import { dogusKatalogu } from "../dogus-katalogu.js";
import { isKollariIlani } from "../is-kollari.js";
import { dogusVarsayilanlari } from "../dogus-varsayilanlari.js";
import { db } from "../db.js";
import { ASSETS_DIR } from "../paths.js";

type ClientRow = {
  id: string;
  name: string;
  slug: string;
  notes: string;
  currency: string;
  menu_language: string;
  brandkit_json: string;
  catalog_json: string;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: string;
  client_id: string | null;
  kind: "logo" | "photo" | "other";
  tags: string;
  filename: string;
  width_px: number;
  height_px: number;
  created_at: string;
};

/* orig ve master aynı dosya adı kalıbını kullanır: {id}.{ext}; thumb her zaman jpg */
export function assetToDTO(a: AssetRow): AssetDTO {
  return {
    ...a,
    urls: {
      orig: `/assets/orig/${a.filename}`,
      master: `/assets/master/${a.filename}`,
      thumb: `/assets/thumb/${a.id}.jpg`,
    },
  };
}

export function uniqueSlug(name: string): string {
  const base = slugify(name);
  let slug = base;
  let i = 2;
  const exists = db.prepare("SELECT 1 FROM clients WHERE slug = ?");
  while (exists.get(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

function clientAssets(clientId: string): AssetDTO[] {
  /* Ortak havuz (client_id NULL) her müşterinin seçicilerinde görünür (FAZ2-GOREV §4);
     binding assetById de böylece ortak fotoğrafları çözer.

     BRIEF DIŞLAMASI (6.3/440 "üretim girdisi olan dosyalar galeri varlığı
     DEĞİLDİR ve paylaşılan havuzlara sızmaz"; journal
     2026-07-26-brief-varlik-sinirlari): aynı kural ortak havuz ucunda zaten
     uygulanıyordu (routes/assets.ts "/api/assets/common") ama BURADA yoktu —
     brief-files.ts asset'i `brief.customer_ref` ile yazdığı için müşterisi
     olan bir brief'in üretim girdisi müşteri galerisine (ClientDetailPage) ve
     AssetPicker'ın "Müşteri" sekmesine düşüyordu. İkincil kanıt: brief
     yüklemesi yalnız orig+master üretir, THUMB üretmez — assetToDTO koşulsuz
     thumb yolu döndürdüğü için galeride KIRIK GÖRSEL çıkıyordu; filtre bunu
     da kapatır. brief_files boş olduğu sürece sonuç birebir eskisi (regresyon
     nöbetçisi: clients-brief-sizinti.test.ts). */
  const rows = db
    .prepare(
      `SELECT * FROM assets
        WHERE (client_id = ? OR client_id IS NULL)
          AND id NOT IN (SELECT asset_id FROM brief_files)
        ORDER BY created_at DESC`
    )
    .all(clientId) as AssetRow[];
  return rows.map(assetToDTO);
}

function rowToClient(row: ClientRow): ClientDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    notes: row.notes,
    currency: CurrencySchema.parse(row.currency),
    menu_language: MenuLanguageSchema.parse(row.menu_language),
    brandkit: BrandKitSchema.parse(JSON.parse(row.brandkit_json)),
    catalog: CatalogSchema.parse(JSON.parse(row.catalog_json)),
    assets: clientAssets(row.id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function clientRoutes(app: FastifyInstance): void {
  /* Liste — özet + logo thumbnail (Faz 0 kabul kriteri) */
  app.get("/api/clients", async (): Promise<ClientSummaryDTO[]> => {
    const rows = db
      .prepare("SELECT * FROM clients ORDER BY updated_at DESC")
      .all() as ClientRow[];
    const assetById = db.prepare("SELECT * FROM assets WHERE id = ?");
    return rows.map((r) => {
      const kit = JSON.parse(r.brandkit_json) as { logo_primary?: string | null };
      let logo_thumb: string | null = null;
      if (kit.logo_primary) {
        const a = assetById.get(kit.logo_primary) as AssetRow | undefined;
        if (a) logo_thumb = `/assets/thumb/${a.id}.jpg`;
      }
      return { id: r.id, name: r.name, slug: r.slug, logo_thumb, updated_at: r.updated_at };
    });
  });

  /* Oluştur */
  app.post("/api/clients", async (req, reply) => {
    const body = ClientCreateSchema.parse(req.body ?? {});
    const dogus = dogusVarsayilanlari();
    const now = nowISO();
    const client: ClientRow = {
      id: newId("cli"),
      name: body.name.trim(),
      slug: uniqueSlug(body.name),
      notes: body.notes ?? "",
      /* K-1/D: doğuş varsayılanları kurulum ilanından (dogus-varsayilanlari.ts).
         İstek gövdesi HER ZAMAN kazanır — ilan yalnız BOŞLUĞU doldurur.
         İlan yoksa değerler bugünküyle birebir (EUR/fr). */
      currency: body.currency ?? dogus.currency,
      menu_language: body.menu_language ?? dogus.menu_language,
      brandkit_json: JSON.stringify(defaultBrandKit()),
      /* K-1/D: dipnot varsayılanı kurulumun iş koluna bağlı (dogus-katalogu.ts).
         Yapılandırma yoksa bugünkü metin birebir. */
      catalog_json: JSON.stringify(dogusKatalogu(isKollariIlani())),
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
       VALUES (@id, @name, @slug, @notes, @currency, @menu_language, @brandkit_json, @catalog_json, @created_at, @updated_at)`
    ).run(client);
    reply.code(201);
    return rowToClient(client);
  });

  /* Tek müşteri — tam veri */
  app.get<{ Params: { id: string } }>("/api/clients/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id) as
      | ClientRow
      | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });
    return rowToClient(row);
  });

  /* Güncelle — kısmi; brandkit/catalog verilirse tam şema doğrulanır (M1, M4) */
  app.put<{ Params: { id: string } }>("/api/clients/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id) as
      | ClientRow
      | undefined;
    if (!row) return reply.code(404).send({ error: "not_found" });

    const patch = ClientUpdateSchema.parse(req.body ?? {});
    const next: ClientRow = {
      ...row,
      name: patch.name?.trim() ?? row.name,
      notes: patch.notes ?? row.notes,
      currency: patch.currency ?? row.currency,
      menu_language: patch.menu_language ?? row.menu_language,
      brandkit_json: patch.brandkit ? JSON.stringify(patch.brandkit) : row.brandkit_json,
      catalog_json: patch.catalog ? JSON.stringify(patch.catalog) : row.catalog_json,
      updated_at: nowISO(),
    };
    db.prepare(
      `UPDATE clients SET name=@name, notes=@notes, currency=@currency, menu_language=@menu_language,
        brandkit_json=@brandkit_json, catalog_json=@catalog_json, updated_at=@updated_at WHERE id=@id`
    ).run(next);
    return rowToClient(next);
  });

  /* Sil — müşteriye ait asset dosyalarını da diskten temizler */
  app.delete<{ Params: { id: string } }>("/api/clients/:id", async (req, reply) => {
    const assets = db
      .prepare("SELECT * FROM assets WHERE client_id = ?")
      .all(req.params.id) as AssetRow[];
    const res = db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: "not_found" });
    const stillUsed = db.prepare("SELECT 1 FROM assets WHERE filename = ? LIMIT 1");
    for (const a of assets) {
      /* Klon dosya paylaşır (M6): aynı filename'i kullanan başka satır varsa dosya kalır */
      if (!stillUsed.get(a.filename)) {
        fs.rmSync(path.join(ASSETS_DIR, "orig", a.filename), { force: true });
        fs.rmSync(path.join(ASSETS_DIR, "master", a.filename), { force: true });
      }
      fs.rmSync(path.join(ASSETS_DIR, "thumb", `${a.id}.jpg`), { force: true });
    }
    return { ok: true };
  });
}
