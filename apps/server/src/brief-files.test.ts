/* F1 P3 — brief sınırı ROUTE testleri (P0 harness'ının ilk gerçek tüketimi).
   İzolasyon: DB :memory: + veri kökü geçici dizin (repo data/ KİRLENMEZ);
   ikisi de import ANINDAN önce kurulur → dinamik import zorunlu. */

import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";

const TMP_DATA = fsSync.mkdtempSync(path.join(os.tmpdir(), "tezgah-p3-"));
process.env.TEZGAH_DB_PATH = ":memory:";
process.env.TEZGAH_DATA_DIR = TMP_DATA;

const { db, migrate } = await import("./db.js");
const { buildApp } = await import("./app.js");

let app: FastifyInstance;

const BOUNDARY = "----tezgahP3Boundary";
function multipart(
  role: string,
  file: { filename: string; contentType: string; data: Buffer }
): { payload: Buffer; headers: Record<string, string> } {
  /* alan ÖNCE, dosya SONRA — @fastify/multipart fields'i bu sırayla doldurur */
  const head = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="role"\r\n\r\n${role}\r\n` +
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return {
    payload: Buffer.concat([head, file.data, tail]),
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
  };
}

const upload = (briefId: string, role: string, file: Parameters<typeof multipart>[1]) =>
  app.inject({ method: "POST", url: `/api/briefs/${briefId}/files`, ...multipart(role, file) });

let PNG: Buffer;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const BOZUK = Buffer.from("bu bir PNG değil, düz metin");

function seedBrief(id: string, key: string, customer: string | null = "cli1"): void {
  db.prepare(
    `INSERT INTO briefs (id, source_system, request_type, idempotency_key, customer_ref, created_at, updated_at)
     VALUES (?, 'swiss_restoran', 'menu_refresh', ?, ?, 't', 't')`
  ).run(id, key, customer);
}
const auditRows = (briefId: string) =>
  db
    .prepare("SELECT * FROM brief_audit WHERE brief_id = ? ORDER BY created_at, id")
    .all(briefId) as Array<Record<string, unknown>>;

beforeAll(async () => {
  migrate();
  db.prepare(
    `INSERT INTO clients (id, name, slug, brandkit_json, catalog_json, created_at, updated_at)
     VALUES ('cli1', 'Test Müşteri', 'test-musteri', '{}', '{}', 't', 't')`
  ).run();
  PNG = await sharp({
    create: { width: 120, height: 80, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app?.close();
  fsSync.rmSync(TMP_DATA, { recursive: true, force: true });
});

describe("brief dosya yükleme — politika kapısı", () => {
  it("bilinmeyen brief 404; geçersiz rol 400", async () => {
    const yok = await upload("brf_yok", "logo", {
      filename: "a.png",
      contentType: "image/png",
      data: PNG,
    });
    expect(yok.statusCode).toBe(404);

    seedBrief("brf_role", "idem-role");
    const rol = await upload("brf_role", "afis", {
      filename: "a.png",
      contentType: "image/png",
      data: PNG,
    });
    expect(rol.statusCode).toBe(400);
    expect(rol.json()).toMatchObject({ error: "invalid_role" });
  });

  it("F1.3: BOZUK dosya 400 policy-red + audit satırı (dosya ve brief_files YAZILMAZ)", async () => {
    seedBrief("brf_bozuk", "idem-bozuk");
    const res = await upload("brf_bozuk", "logo", {
      filename: "bozuk.png",
      contentType: "image/png",
      data: BOZUK,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "policy_reject", code: "bozuk_dosya" });

    const audit = auditRows("brf_bozuk");
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ event_type: "file_rejected", warning_code: "bozuk_dosya" });
    expect(
      db.prepare("SELECT COUNT(*) AS c FROM brief_files WHERE brief_id='brf_bozuk'").get()
    ).toMatchObject({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) AS c FROM assets").get()).toMatchObject({ c: 0 });
  });

  it("TÜR REDDİ: webp brief sınırında reddedilir (genel uçta serbest — bilinçli fark)", async () => {
    seedBrief("brf_webp", "idem-webp");
    const webp = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#000000" },
    })
      .webp()
      .toBuffer();
    const res = await upload("brf_webp", "logo", {
      filename: "a.webp",
      contentType: "image/webp",
      data: webp,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "policy_reject", code: "desteklenmeyen_tur" });
    expect(auditRows("brf_webp")[0]).toMatchObject({ warning_code: "desteklenmeyen_tur" });
  });

  it("PNG kabul: brief_files + asset + audit; renk profili notları AÇIK", async () => {
    seedBrief("brf_png", "idem-png");
    const res = await upload("brf_png", "logo", {
      filename: "logo.png",
      contentType: "image/png",
      data: PNG,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { file: Record<string, unknown>; infos: Array<{ code: string }> };
    expect(body.file).toMatchObject({ role: "logo", version: 1, status: "valid" });
    expect(body.infos.map((i) => i.code)).toEqual([
      "cmyk_dogrulanamadi",
      "icc_dogrulanamadi",
      "pdfx_dogrulanamadi",
    ]);

    const asset = db
      .prepare("SELECT * FROM assets WHERE id = ?")
      .get(body.file.asset_id as string) as Record<string, unknown>;
    expect(asset).toMatchObject({ client_id: "cli1", kind: "logo", width_px: 120, height_px: 80 });
    expect(fsSync.existsSync(path.join(TMP_DATA, "assets", "orig", asset.filename as string))).toBe(true);
    expect(auditRows("brf_png").map((a) => a.event_type)).toEqual(["file_accepted"]);
  });

  it("PDF: yalnız-sakla yolu — kabul + derin-doğrulama BİLGİ notu", async () => {
    seedBrief("brf_pdf", "idem-pdf");
    const res = await upload("brf_pdf", "tasarim", {
      filename: "tasarim.pdf",
      contentType: "application/pdf",
      data: PDF,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { infos: Array<{ code: string }> };
    expect(body.infos.map((i) => i.code)).toContain("pdf_derin_dogrulama_yok");
  });

  it("BOZUK PDF (imza yok) reddedilir", async () => {
    seedBrief("brf_pdfbad", "idem-pdfbad");
    const res = await upload("brf_pdfbad", "tasarim", {
      filename: "x.pdf",
      contentType: "application/pdf",
      data: Buffer.from("PDF değil"),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "bozuk_dosya" });
  });

  it("aynı rolde yeniden yükleme → version++ (eski satır DURUR)", async () => {
    seedBrief("brf_ver", "idem-ver");
    const first = await upload("brf_ver", "logo", {
      filename: "1.png",
      contentType: "image/png",
      data: PNG,
    });
    const second = await upload("brf_ver", "logo", {
      filename: "2.png",
      contentType: "image/png",
      data: PNG,
    });
    expect((first.json() as { file: { version: number } }).file.version).toBe(1);
    expect((second.json() as { file: { version: number } }).file.version).toBe(2);
    expect(
      db.prepare("SELECT COUNT(*) AS c FROM brief_files WHERE brief_id='brf_ver'").get()
    ).toMatchObject({ c: 2 });
  });
});

describe("uyarı onayı — audit beşlisi (K2) ve F1.5 kilidi", () => {
  it("UYAR sınıfı onaylanır: beş alan da DOLU", async () => {
    seedBrief("brf_ack", "idem-ack");
    const res = await app.inject({
      method: "POST",
      url: "/api/briefs/brf_ack/warnings/dusuk_dpi/ack",
      payload: {
        acknowledged_by: "operator:ayse",
        reason: "müşteri düşük çözünürlüğü kabul etti (telefon onayı)",
        source_file_version: 2,
      },
    });
    expect(res.statusCode).toBe(201);
    const row = res.json() as Record<string, unknown>;
    expect(row).toMatchObject({
      event_type: "warning_acknowledged",
      warning_code: "dusuk_dpi",
      acknowledged_by: "operator:ayse",
      source_file_version: 2,
    });
    expect(String(row.reason)).toContain("telefon onayı");
    expect(String(row.acknowledged_at)).not.toBe("");
  });

  it("F1.5 ROTA DÜZEYİ: REDDET koduna istisna verilemez", async () => {
    seedBrief("brf_f15", "idem-f15");
    for (const code of ["bozuk_dosya", "olcu_belirlenemedi", "desteklenmeyen_tur"]) {
      const res = await app.inject({
        method: "POST",
        url: `/api/briefs/brf_f15/warnings/${code}/ack`,
        payload: { acknowledged_by: "operator:ayse", reason: "yine de devam" },
      });
      expect(res.statusCode, code).toBe(400);
      expect(res.json()).toMatchObject({ error: "reject_not_acknowledgeable" });
    }
    expect(auditRows("brf_f15")).toHaveLength(0); /* reddedilen deneme satır AÇMAZ */
  });

  it("BİLGİ notu onay istemez; bilinmeyen kod reddedilir; boş kimlik/sebep 400", async () => {
    seedBrief("brf_ack2", "idem-ack2");
    const info = await app.inject({
      method: "POST",
      url: "/api/briefs/brf_ack2/warnings/cmyk_dogrulanamadi/ack",
      payload: { acknowledged_by: "op", reason: "ok" },
    });
    expect(info.statusCode).toBe(400);
    expect(info.json()).toMatchObject({ error: "info_not_acknowledgeable" });

    const unknown = await app.inject({
      method: "POST",
      url: "/api/briefs/brf_ack2/warnings/uydurma/ack",
      payload: { acknowledged_by: "op", reason: "ok" },
    });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json()).toMatchObject({ error: "unknown_warning_code" });

    const bos = await app.inject({
      method: "POST",
      url: "/api/briefs/brf_ack2/warnings/font_riski/ack",
      payload: { acknowledged_by: "   ", reason: "" },
    });
    expect(bos.statusCode).toBe(400);
    expect(bos.json()).toMatchObject({ error: "validation" });
  });
});

describe("dosya geçersizleştirme (F1.7 zemini)", () => {
  it("status=invalid + audit satırı; durum GERİLEMESİ bu pakette çağrılmaz", async () => {
    seedBrief("brf_inv", "idem-inv");
    const up = await upload("brf_inv", "logo", {
      filename: "l.png",
      contentType: "image/png",
      data: PNG,
    });
    const fileId = (up.json() as { file: { id: string } }).file.id;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/briefs/brf_inv/files/${fileId}/invalidate`,
      payload: { reason: "matbaa dosyayı açamadı", recordedBy: "operator:mehmet" },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { file: { status: string } }).file.status).toBe("invalid");
    expect(
      db.prepare("SELECT status FROM brief_files WHERE id = ?").get(fileId)
    ).toEqual({ status: "invalid" });

    const last = auditRows("brf_inv").at(-1) as Record<string, unknown>;
    expect(last).toMatchObject({
      event_type: "file_invalidated",
      acknowledged_by: "operator:mehmet",
      source_file_version: 1,
    });
    /* brief durumu DEĞİŞMEDİ — gerileme tüketici paketin işi */
    expect(db.prepare("SELECT status FROM briefs WHERE id='brf_inv'").get()).toEqual({
      status: "DRAFT",
    });
  });

  it("olmayan dosya 404", async () => {
    seedBrief("brf_inv2", "idem-inv2");
    const res = await app.inject({
      method: "PATCH",
      url: "/api/briefs/brf_inv2/files/bfl_yok/invalidate",
      payload: { reason: "x", recordedBy: "op" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GENEL /api/assets sertleştirmesi (B1) ve havuz sızıntısı", () => {
  it("bozuk dosya artık 500 değil 400 policy-red; DB'ye satır YAZILMAZ", async () => {
    const before = (db.prepare("SELECT COUNT(*) AS c FROM assets").get() as { c: number }).c;
    const res = await app.inject({
      method: "POST",
      url: "/api/clients/cli1/assets",
      ...multipart("logo", { filename: "bozuk.png", contentType: "image/png", data: BOZUK }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "policy_reject", code: "bozuk_dosya" });
    expect(db.prepare("SELECT COUNT(*) AS c FROM assets").get()).toMatchObject({ c: before });
  });

  it("webp GENEL uçta kabul edilmeye devam eder (mevcut tüketiciler korunur)", async () => {
    const webp = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#123456" },
    })
      .webp()
      .toBuffer();
    const res = await app.inject({
      method: "POST",
      url: "/api/clients/cli1/assets",
      ...multipart("photo", { filename: "a.webp", contentType: "image/webp", data: webp }),
    });
    expect(res.statusCode).toBe(201);
  });

  it("brief dosyaları ORTAK HAVUZA sızmaz (müşterisiz brief)", async () => {
    seedBrief("brf_pool", "idem-pool", null);
    const up = await upload("brf_pool", "logo", {
      filename: "p.png",
      contentType: "image/png",
      data: PNG,
    });
    const assetId = (up.json() as { file: { asset_id: string } }).file.asset_id;
    expect(db.prepare("SELECT client_id FROM assets WHERE id = ?").get(assetId)).toEqual({
      client_id: null,
    });

    const pool = await app.inject({ method: "GET", url: "/api/assets/common" });
    expect(pool.statusCode).toBe(200);
    expect((pool.json() as Array<{ id: string }>).map((a) => a.id)).not.toContain(assetId);
  });
});
