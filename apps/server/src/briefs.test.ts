/* F1 P4 — brief yaşam döngüsü ROUTE testleri (izole DB + geçici veri kökü). */

import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";

const TMP_DATA = fsSync.mkdtempSync(path.join(os.tmpdir(), "tezgah-p4-"));
process.env.TEZGAH_DB_PATH = ":memory:";
process.env.TEZGAH_DATA_DIR = TMP_DATA;

const { db, migrate } = await import("./db.js");
const { buildApp } = await import("./app.js");

let app: FastifyInstance;
let PNG: Buffer;

/** Yanıt gövdesinin test-görünümü (uç sözleşmesi route kodunda sabit) */
interface ViewLike {
  brief: {
    id: string;
    status: string;
    idempotency_key: string;
    spec_values: Record<string, unknown>;
    language_requirements: string[];
    requested_publications: string[];
  };
  completeness: { designReady: boolean; productionCompleteness: number };
  missing: Array<{ id: string; label_tr: string; layer: string; reject_class: boolean }>;
  next_states: string[];
  locked_states: string[];
  price_coverage: { items: number; missing: number } | null;
  acknowledged: unknown[];
  idempotent_hit?: boolean;
  error?: string;
  code?: string;
}
const json = (res: { json: () => unknown }) => res.json() as ViewLike;
const create = (body: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/briefs", payload: body });
const patch = (id: string, body: Record<string, unknown>) =>
  app.inject({ method: "PATCH", url: `/api/briefs/${id}`, payload: body });
const transition = (id: string, body: Record<string, unknown>) =>
  app.inject({ method: "POST", url: `/api/briefs/${id}/transition`, payload: body });
const get = (id: string) => app.inject({ method: "GET", url: `/api/briefs/${id}` });

const BOUNDARY = "----tezgahP4";
const uploadLogo = (id: string) =>
  app.inject({
    method: "POST",
    url: `/api/briefs/${id}/files`,
    payload: Buffer.concat([
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="role"\r\n\r\nlogo\r\n` +
          `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="l.png"\r\n` +
          `Content-Type: image/png\r\n\r\n`
      ),
      PNG,
      Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
    ]),
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
  });

/** Tasarım-önkoşulları tam, üretim tarafı eksik bir menü brief'i */
async function designReadyBrief(publications: string[] = ["digital_menu"]) {
  const res = await create({
    request_type: "menu",
    customer_ref: "cli1",
    brand_ref: "brand:aras",
    language_requirements: ["tr", "fr"],
    requested_publications: publications,
    content_reference: "catalog:cli1",
    spec_values: { format: "a4-portrait" },
  });
  return json(res).brief.id;
}

beforeAll(async () => {
  migrate();
  PNG = await sharp({ create: { width: 60, height: 40, channels: 3, background: "#fff" } })
    .png()
    .toBuffer();
  /* Fiyatı EKSİKSİZ katalog (14e: fiyat eksiksizliği katalogdan okunur) */
  const catalog = {
    categories: [
      {
        id: "c1",
        name_fr: "Pizzas",
        order: 0,
        items: [
          { id: "i1", name_fr: "Margherita", prices: [{ label: "seul", value: 9 }], order: 0 },
          { id: "i2", name_fr: "Reine", prices: [{ label: "seul", value: 11 }], order: 1 },
        ],
      },
    ],
    footnote_fr: "x",
  };
  db.prepare(
    `INSERT INTO clients (id, name, slug, brandkit_json, catalog_json, created_at, updated_at)
     VALUES ('cli1', 'Test', 'test', '{}', ?, 't', 't')`
  ).run(JSON.stringify(catalog));
  /* Fiyatı EKSİK ikinci müşteri (m.P4.5 senaryosu) */
  db.prepare(
    `INSERT INTO clients (id, name, slug, brandkit_json, catalog_json, created_at, updated_at)
     VALUES ('cli2', 'Fiyatsız', 'fiyatsiz', '{}', ?, 't', 't')`
  ).run(
    JSON.stringify({
      categories: [
        { id: "c1", name_fr: "Kebap", order: 0, items: [{ id: "i1", name_fr: "Adana", prices: [], order: 0 }] },
      ],
      footnote_fr: "x",
    })
  );
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app?.close();
  fsSync.rmSync(TMP_DATA, { recursive: true, force: true });
});

describe("brief oluşturma", () => {
  it("DRAFT doğar; idempotency_key SUNUCU üretir; audit(create) yazılır", async () => {
    const res = await create({ request_type: "menu" });
    expect(res.statusCode).toBe(201);
    const view = json(res);
    expect(view.brief.status).toBe("DRAFT");
    expect(String(view.brief.idempotency_key)).toMatch(/^manual:/);
    expect(view.brief.spec_values).toEqual({});
    const audit = db
      .prepare("SELECT event_type FROM brief_audit WHERE brief_id = ?")
      .all(view.brief.id) as Array<{ event_type: string }>;
    expect(audit.map((a) => a.event_type)).toEqual(["brief_created"]);
  });

  it("F1.6: aynı idempotency_key ikinci kez → TEK brief (mevcut döner)", async () => {
    const a = await create({ request_type: "menu", idempotency_key: "swiss:req-1" });
    const b = await create({ request_type: "menu", idempotency_key: "swiss:req-1" });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(200);
    expect(json(b).idempotent_hit).toBe(true);
    expect(json(b).brief.id).toBe(json(a).brief.id);
    expect(
      db.prepare("SELECT COUNT(*) AS c FROM briefs WHERE idempotency_key='swiss:req-1'").get()
    ).toMatchObject({ c: 1 });
  });

  it("olmayan müşteri 404", async () => {
    const res = await create({ request_type: "menu", customer_ref: "cli_yok" });
    expect(res.statusCode).toBe(404);
  });
});

describe("eksiksizlik görünümü (F1.1/F1.2 zemini)", () => {
  it("boş brief: tasarım hazır DEĞİL, eksikler İSİMLİ", async () => {
    const id = json(await create({ request_type: "menu" })).brief.id;
    const view = json(await get(id));
    expect(view.completeness.designReady).toBe(false);
    const ids = view.missing.map((m) => m.id);
    expect(ids).toContain("format");
    expect(ids).toContain("languages");
    expect(ids).toContain("content_skeleton");
    expect(ids).toContain("file:logo");
  });

  it("14e: fiyat eksiksizliği KATALOGDAN okunur — eksik fiyat tamlığı düşürür", async () => {
    const eksik = await create({ request_type: "menu", customer_ref: "cli2" });
    const v1 = json(eksik);
    expect(v1.missing.map((m) => m.id)).toContain("prices");
    expect(v1.price_coverage).toMatchObject({ items: 1, missing: 1 });

    const tam = await create({ request_type: "menu", customer_ref: "cli1" });
    const v2 = json(tam);
    expect(v2.missing.map((m) => m.id)).not.toContain("prices");
    expect(v2.price_coverage).toMatchObject({ items: 2, missing: 0 });
  });

  it("koşullu tetikleme uçtan uca: QR seçilince qr_target_url eksiği doğar", async () => {
    const id = await designReadyBrief(["qr_image"]);
    const view = json(await get(id));
    expect(view.missing.map((m) => m.id)).toContain(
      "qr_target_url"
    );
  });
});

describe("durum geçişleri — TEK KAPI (guard) + kilitli kenarlar", () => {
  it("DRAFT → INCOMPLETE serbest; PATCH durum YAZAMAZ", async () => {
    const id = await designReadyBrief();
    const res = await transition(id, { to: "INCOMPLETE" });
    expect(res.statusCode).toBe(200);
    expect(json(res).brief.status).toBe("INCOMPLETE");

    await patch(id, { status: "PRODUCTION_READY" } as Record<string, unknown>);
    expect(db.prepare("SELECT status FROM briefs WHERE id = ?").get(id)).toEqual({
      status: "INCOMPLETE",
    });
  });

  it("tasarım önkoşulu eksikken READY_FOR_DESIGN 409 + NEDEN listesi döner", async () => {
    const id = json(await create({ request_type: "menu" })).brief.id;
    await transition(id, { to: "INCOMPLETE" });
    const res = await transition(id, { to: "READY_FOR_DESIGN" });
    expect(res.statusCode).toBe(409);
    expect(json(res).code).toBe("design_not_ready");
    expect(json(res).missing.length).toBeGreaterThan(0);
  });

  it("önkoşullar dolunca READY_FOR_DESIGN → DESIGN_IN_PROGRESS yürür (üretim eksikleri ENGELLEMEZ)", async () => {
    const id = await designReadyBrief();
    await transition(id, { to: "INCOMPLETE" });
    expect((await transition(id, { to: "READY_FOR_DESIGN" })).statusCode).toBe(200);
    const res = await transition(id, { to: "DESIGN_IN_PROGRESS" });
    expect(res.statusCode).toBe(200);
    /* üretim tarafı hâlâ eksik (logo yok) ama tasarım başladı — K4 */
    expect(json(res).completeness.productionCompleteness).toBeLessThan(100);
  });

  it("SIÇRAMA reddedilir; kilitli kenarlar 501 not_yet_available", async () => {
    const id = await designReadyBrief();
    const sicrama = await transition(id, { to: "DESIGN_IN_PROGRESS" });
    expect(sicrama.statusCode).toBe(409);
    expect(json(sicrama).code).toBe("not_allowed");

    for (const to of ["READY_FOR_PRODUCTION_REVIEW", "PRODUCTION_READY"]) {
      const res = await transition(id, { to });
      expect(res.statusCode, to).toBe(501);
      expect(json(res).error).toBe("not_yet_available");
    }
    const view = json(await get(id));
    expect(view.locked_states).toEqual(["READY_FOR_PRODUCTION_REVIEW", "PRODUCTION_READY"]);
  });

  it("gerileme kayıtsız reddedilir, kayıtlı geçer", async () => {
    const id = await designReadyBrief();
    await transition(id, { to: "INCOMPLETE" });
    await transition(id, { to: "READY_FOR_DESIGN" });

    const kayitsiz = await transition(id, { to: "DRAFT" });
    expect(kayitsiz.statusCode).toBe(409);
    expect(json(kayitsiz).code).toBe("regression_unrecorded");

    const kayitli = await transition(id, {
      to: "DRAFT",
      reason: "müşteri talebi geri çekti",
      recordedBy: "operator:ayse",
    });
    expect(kayitli.statusCode).toBe(200);
    expect(json(kayitli).brief.status).toBe("DRAFT");
  });
});

describe("F1.7 — dosya geçersizleşince iş GERİ DÜŞER (P3'ün açık ucu kapandı)", () => {
  it("DESIGN_IN_PROGRESS'te logo invalidate → INCOMPLETE + state_changed audit", async () => {
    const id = await designReadyBrief();
    const up = await uploadLogo(id);
    expect(up.statusCode).toBe(201);
    const fileId = (up.json() as { file: { id: string } }).file.id;

    await transition(id, { to: "INCOMPLETE" });
    await transition(id, { to: "READY_FOR_DESIGN" });
    await transition(id, { to: "DESIGN_IN_PROGRESS" });
    expect(db.prepare("SELECT status FROM briefs WHERE id = ?").get(id)).toEqual({
      status: "DESIGN_IN_PROGRESS",
    });

    const inv = await app.inject({
      method: "PATCH",
      url: `/api/briefs/${id}/files/${fileId}/invalidate`,
      payload: { reason: "matbaa açamadı", recordedBy: "operator:mehmet" },
    });
    expect(inv.statusCode).toBe(200);
    expect((inv.json() as { regressed_to: string }).regressed_to).toBe("INCOMPLETE");
    expect(db.prepare("SELECT status FROM briefs WHERE id = ?").get(id)).toEqual({
      status: "INCOMPLETE",
    });
    const events = (
      db.prepare("SELECT event_type FROM brief_audit WHERE brief_id = ?").all(id) as Array<{
        event_type: string;
      }>
    ).map((e) => e.event_type);
    expect(events).toContain("file_invalidated");
    expect(events).toContain("state_changed");
  });

  it("DRAFT'ta invalidate durumu değiştirmez (gerileyecek yer yok)", async () => {
    const id = await designReadyBrief();
    const up = await uploadLogo(id);
    const fileId = (up.json() as { file: { id: string } }).file.id;
    const inv = await app.inject({
      method: "PATCH",
      url: `/api/briefs/${id}/files/${fileId}/invalidate`,
      payload: { reason: "yanlış dosya", recordedBy: "op" },
    });
    expect((inv.json() as { regressed_to: string | null }).regressed_to).toBeNull();
    expect(db.prepare("SELECT status FROM briefs WHERE id = ?").get(id)).toEqual({ status: "DRAFT" });
  });
});

describe("alan güncelleme", () => {
  it("spec_values BİRLEŞTİRİLİR; audit(update) yazılır; eksikler yeniden hesaplanır", async () => {
    const id = await designReadyBrief(["a4_print"]);
    const before = json(await get(id));
    expect(before.missing.map((m) => m.id)).toContain(
      "print_quantity"
    );

    await patch(id, { spec_values: { print_quantity: 500 } });
    const mid = json(await get(id));
    expect(mid.brief.spec_values).toEqual({ format: "a4-portrait", print_quantity: 500 });
    const ids = mid.missing.map((m) => m.id);
    expect(ids).not.toContain("print_quantity");
    expect(ids).toContain("print_material");

    const events = (
      db.prepare("SELECT event_type FROM brief_audit WHERE brief_id = ?").all(id) as Array<{
        event_type: string;
      }>
    ).map((e) => e.event_type);
    expect(events).toContain("brief_updated");
  });
});
