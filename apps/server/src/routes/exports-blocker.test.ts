/* BLOCKER backstop testi (Canonical 4.7: istisna verilemez) — gerçek HTTP
   ucu, izole :memory: db. 409 dalı browser çağrısından ÖNCE fırladığı için
   puppeteer'siz test edilebilir; geçiş yolu browser ister ve BURADA test
   EDİLMEZ (kapsam sınırı bilinçli). */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");

let app: FastifyInstance;
let docId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  const clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Blocker Test', 'blocker-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());
  const res = await app.inject({
    method: "POST",
    url: `/api/clients/${clientId}/documents`,
    payload: { template_id: "menu-liste-premium" },
  });
  docId = (res.json() as { id: string }).id;
});

describe("POST /api/documents/:id/export — blocker backstop", () => {
  it("blocker türü taşıyan uyarı gövdesi → 409 blocker_present (browser'a HİÇ girmeden)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${docId}/export`,
      payload: { warnings: [{ type: "empty-required", slotId: "logo" }] },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "blocker_present", detail: ["empty-required"] });
  });

  it("strateji ihlali de 409; birden çok engel detayda listelenir", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${docId}/export`,
      payload: {
        warnings: [
          { type: "overflow-items", count: 2 },
          { type: "overflow-strategy-violation", declared: "flow", dropped: 2 },
          { type: "empty-required", slotId: "qr" },
        ],
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: "blocker_present",
      detail: ["overflow-strategy-violation", "empty-required"],
    });
  });

  it("çöp/tipsiz uyarı gövdesi backstop'u YANLIŞ tetiklemez (409 üretmez)", async () => {
    /* Backstop rotanın İLK kapısıdır: warning-sınıfı + çöp girdilerle 409
       ÜRETMEDEN geçer; istek bir sonraki kapıya (variants: [] → 400) düşer.
       Browser'a hiç girilmez — kanıt sıralamadan bağımsız ve puppeteer'siz. */
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${docId}/export`,
      payload: {
        variants: [],
        warnings: [{ type: "overflow-items", count: 1 }, { tip: "yok" }, null, "metin", 42],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "no_variants" });
  });

  it("blocker, variants kapısından da ÖNCE kazanır (ilk kapı kanıtı)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${docId}/export`,
      payload: { variants: [], warnings: [{ type: "empty-required", slotId: "logo" }] },
    });
    expect(res.statusCode).toBe(409);
  });
});
