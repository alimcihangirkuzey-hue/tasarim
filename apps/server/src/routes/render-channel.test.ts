/* /render KANAL BEKÇİSİ testleri (7.2/8.5; journal 2026-07-26-render-kanal-bekcisi)
   — önizleme-türleri keşfinin borcu kapanır: İMZALI istemci bile profil ilanının
   dışına çıkamaz. Bekçi browser'dan ÖNCE fırlar → puppeteer'siz inject-testli;
   geçiş (happy-path) yolu browser ister ve BURADA test edilmez (exports-channel
   .test.ts ile aynı bilinçli kapsam sınırı — kayıtsız-id null geçişi de öyle:
   geçen istek getBrowser'a iner, browser'siz kanıtı yoktur). Kontrat pinleri
   (503/401) bekçinin İSTEK ŞEMASINI ve imza akışını değiştirmediğinin kanıtıdır
   → RENDER_CONTRACT_V=1 korunur. */

process.env.TEZGAH_DB_PATH = ":memory:";
process.env.RENDER_CONTRACT_SECRET = "test-secret";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");
const { RenderRequestV1Schema, signRender } = await import("../render-contract.js");

let app: FastifyInstance;
let garmentDocId: string;

/** Gövde şema-parse edilir ki imza KANONİK (default'lu) değerler üzerinden
    atılsın — rota da aynı parse'ı yapar (watermark=false, target="pdf"). */
const imzali = (body: Record<string, unknown>) => {
  const parsed = RenderRequestV1Schema.parse(body);
  return app.inject({
    method: "POST",
    url: "/render",
    payload: parsed,
    headers: { "x-render-signature": signRender(parsed, "test-secret") },
  });
};

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  const clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Render Kanal', 'render-kanal', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  const res = await app.inject({
    method: "POST",
    url: `/api/clients/${clientId}/documents`,
    payload: { template_id: "garment" },
  });
  garmentDocId = (res.json() as { id: string }).id;
});

describe("POST /render — kanal bekçisi (makine kanalı da ilana tabidir)", () => {
  it("İMZALI garment+print REDDEDİLİR: tekstil pdf kanalı ilan etmez", async () => {
    /* Eski hâlde bu istek browser'a iner ve anlamlı olmayan bir 'üretim'
       PDF'i dönerdi; stateless şim uç kayıt yazmadığından iz yalnız yanıt
       meta'sındaydı — bekçi bu sessiz sapmayı kapatır */
    const res = await imzali({ doc: garmentDocId, variant: "print" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["print"], declared: ["png", "broderie"] },
    });
  });

  it("İMZALI garment+preview de REDDEDİLİR: preview de ilan dışıdır", async () => {
    const res = await imzali({ doc: garmentDocId, variant: "preview" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["preview"], declared: ["png", "broderie"] },
    });
  });

  it("PİN — imzasız istek 401 KALIR: bekçi imza kapısının ARKASINDADIR", async () => {
    const body = RenderRequestV1Schema.parse({ doc: garmentDocId, variant: "print" });
    const res = await app.inject({ method: "POST", url: "/render", payload: body });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "invalid_signature" });
  });

  it("PİN — secret'siz 503 KALIR: kapalı duruş bekçiden önce kazanır", async () => {
    /* Rota secret'ı İSTEK ANINDA okur → geçici unset güvenli, finally geri koyar */
    delete process.env.RENDER_CONTRACT_SECRET;
    try {
      const res = await imzali({ doc: garmentDocId, variant: "print" });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ error: "contract_disabled" });
    } finally {
      process.env.RENDER_CONTRACT_SECRET = "test-secret";
    }
  });

  it("PİN — imzalı ama YOK belge 404 KALIR: belge kapısı bekçiden önce", async () => {
    const res = await imzali({ doc: "doc_yok", variant: "print" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "document_not_found" });
  });
});
