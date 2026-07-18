/* P0 harness KANITI — yeni davranış iddiası YOK.
   Amaç: buildApp() + app.inject() ile GERÇEK uçlar, İZOLE bir DB üzerinde
   koşuyor mu? (F1.1/3/6/7 route testlerinin ön-şartı.)

   İzolasyon: TEZGAH_DB_PATH import ANINDAN önce ":memory:"ye çekilir →
   canlı data/app.db hiç açılmaz (bu yüzden db/app dinamik import edilir;
   statik import'lar hoist edilip env'den önce çalışırdı). */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate } = await import("./db.js");
const { buildApp } = await import("./app.js");

let app: FastifyInstance;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();
});

describe("P0 route-test harness (buildApp + inject)", () => {
  it("GET /api/health — uç kayıtlı ve gövde aynen", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, app: "tezgah", phase: 6 });
  });

  it("GET /api/clients — İZOLE DB boş döner (canlı app.db'ye dokunulmadığının kanıtı)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/clients" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("GET /api/documents/<yok> — 404 yolu ve hata işleyicisi kurulu", async () => {
    const res = await app.inject({ method: "GET", url: "/api/documents/doc_yok" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not_found" });
  });
});
