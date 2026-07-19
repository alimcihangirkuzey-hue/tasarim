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
  completeness: {
    designReady: boolean;
    productionCompleteness: number;
    notices: Array<{ code: string; message_tr: string }>;
  };
  missing: Array<{ id: string; label_tr: string; layer: string; reject_class: boolean }>;
  next_states: string[];
  locked_states: string[];
  price_coverage: { items: number; missing: number } | null;
  acknowledged: unknown[];
  idempotent_hit?: boolean;
  error?: string;
  code?: string;
  detail?: string;
  keys?: string[];
  issues?: Array<{ size: string; reason: string; detail_tr: string }>;
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

describe("P5 — GARMENT ailesi", () => {
  /** tasarım-önkoşulları tam, üretim eksik garment brief'i */
  async function garmentBrief() {
    const res = await create({
      request_type: "garment",
      customer_ref: "cli1",
      spec_values: { garment_type: "tshirt", placements: ["chest_center"] },
    });
    return json(res).brief.id;
  }

  it("garment brief: aile matrisi menüden FARKLI (isimli eksikler garment alanları)", async () => {
    const id = await garmentBrief();
    const view = json(await get(id));
    const ids = view.missing.map((m) => m.id);
    expect(ids).toContain("fabric_color");
    expect(ids).toContain("size_distribution");
    expect(ids).toContain("technique");
    expect(ids).toContain("file:tasarim");
    /* menü alanları garment'ta SORULMAZ */
    expect(ids).not.toContain("format");
    expect(ids).not.toContain("languages");
    expect(view.completeness.designReady).toBe(true);
  });

  it("tasarım önkoşulu (ürün tipi + baskı yeri) eksikse tasarıma GEÇİLEMEZ", async () => {
    const bos = json(await create({ request_type: "garment", customer_ref: "cli1" }));
    expect(bos.completeness.designReady).toBe(false);
    expect(bos.missing.map((m) => m.id)).toEqual(
      expect.arrayContaining(["garment_type", "placements"])
    );
    await transition(bos.brief.id, { to: "INCOMPLETE" });
    const res = await transition(bos.brief.id, { to: "READY_FOR_DESIGN" });
    expect(res.statusCode).toBe(409);
    expect(json(res).code).toBe("design_not_ready");
  });

  it("BEDEN×ADET: geçerli yazım + toplam HESAPLANIR (0 adet MEŞRU, korunur)", async () => {
    const id = await garmentBrief();
    await patch(id, { spec_values: { size_distribution: { XS: 0, S: 10, M: 20, L: 15 } } });
    const view = json(await get(id));
    expect(view.brief.spec_values.size_distribution).toEqual({ XS: 0, S: 10, M: 20, L: 15 });
    expect(view.missing.map((m) => m.id)).not.toContain("size_distribution");
  });

  it("D-63 KATI DOĞRULAMA: negatif · ondalık · metin · NaN · bilinmeyen beden → 400 (sessiz düzeltme YOK)", async () => {
    const id = await garmentBrief();
    const cases: Array<[string, unknown]> = [
      ["negatif", { S: -3 }],
      ["ondalık", { S: 2.5 }],
      ["metin", { S: "10" }],
      ["NaN", { S: Number.NaN }],
      ["bilinmeyen beden", { XXXL: 5 }],
      ["dizi", [1, 2]],
    ];
    /* AJAN-5/B-7: fixture ÖNCE geçerli değer yazar — böylece "red mevcut veriyi
       KORUR" iddiası gerçekten sınanır (boş fixture'da assertion boşta geçerdi) */
    await patch(id, { spec_values: { size_distribution: { S: 10, M: 5 } } });

    for (const [ad, dist] of cases) {
      const res = await patch(id, { spec_values: { size_distribution: dist } });
      expect(res.statusCode, ad).toBe(400);
      expect(json(res).error, ad).toBe("invalid_size_distribution");
      /* AJAN-5/B-8: gerekçe GERÇEKTEN dolu bir metin olmalı (undefined geçmesin) */
      const detail = json(res).detail;
      expect(typeof detail, ad).toBe("string");
      expect((detail as string).length, ad).toBeGreaterThan(5);
      /* reddedilen yazım MEVCUT GEÇERLİ DEĞERİ EZMEZ */
      expect(json(await get(id)).brief.spec_values.size_distribution, ad).toEqual({ S: 10, M: 5 });
    }
  });

  it("AJAN-5/B-1: üst sınır — 1e21 · MAX_VALUE · güvensiz tam sayı reddedilir (toplam Infinity olamaz)", async () => {
    const id = await garmentBrief();
    for (const dist of [{ S: 1e21 }, { S: Number.MAX_VALUE }, { S: Number.MAX_SAFE_INTEGER + 1 }, { S: 1_000_001 }]) {
      const res = await patch(id, { spec_values: { size_distribution: dist } });
      expect(res.statusCode, JSON.stringify(dist)).toBe(400);
      expect(json(res).error).toBe("invalid_size_distribution");
    }
    /* sınır İÇİ değer geçer */
    expect((await patch(id, { spec_values: { size_distribution: { S: 1_000_000 } } })).statusCode).toBe(200);
  });

  it("AJAN-5/B-2: ilan edilen teknik listesi ZORLANIR — decoupe garment'ta reddedilir", async () => {
    const id = await garmentBrief();
    const res = await patch(id, { spec_values: { technique: "decoupe" } });
    expect(res.statusCode).toBe(400);
    expect(json(res).error).toBe("invalid_spec_value");
    expect(String(json(res).detail)).toContain("broderie");
    /* DTF bilinçli olarak KABUL (bilgi notu üretir) */
    expect((await patch(id, { spec_values: { technique: "dtf" } })).statusCode).toBe(200);
  });

  it("BULGU-5: BOŞ DİZİ alanı TEMİZLER — aynı gövdedeki geçerli alanları ENGELLEMEZ", async () => {
    const id = json(await create({ request_type: "garment", customer_ref: "cli1" })).brief.id;
    /* UI ürün tipi değişiminde placements'ı boşaltabilir; bu istek REDDEDİLMEMELİ */
    const res = await patch(id, { spec_values: { garment_type: "tshirt", placements: [] } });
    expect(res.statusCode).toBe(200);
    expect(json(res).brief.spec_values.garment_type).toBe("tshirt");
    expect(json(res).brief.spec_values.placements).toBeUndefined();
    /* ve alan gerçekten EKSİK sayılır (temizlendi) */
    expect(json(res).missing.map((m) => m.id)).toContain("placements");

    /* dolu yazım hâlâ çalışır, sonra boşaltma temizler */
    await patch(id, { spec_values: { placements: ["chest_center"] } });
    expect(json(await get(id)).brief.spec_values.placements).toEqual(["chest_center"]);
    await patch(id, { spec_values: { placements: [] } });
    expect(json(await get(id)).brief.spec_values.placements).toBeUndefined();
  });

  it("AJAN-5/B-3: çöp veri REDDET-sınıfı tasarım kapısını AÇAMAZ (tip denetimi)", async () => {
    const id = json(await create({ request_type: "garment", customer_ref: "cli1" })).brief.id;
    for (const bad of [
      { placements: "duz-metin" },
            { placements: ["olmayan_alan"] },
      { garment_type: { a: 1 } },
      { garment_type: "uydurma_tip" },
      { fabric_color: 42 },
      { print_size_position: 42 },
    ]) {
      const res = await patch(id, { spec_values: bad });
      expect(res.statusCode, JSON.stringify(bad)).toBe(400);
      expect(json(res).error, JSON.stringify(bad)).toBe("invalid_spec_value");
    }
    /* hiçbiri yazılmadı → tasarım kapısı hâlâ KAPALI */
    const view = json(await get(id));
    expect(view.completeness.designReady).toBe(false);
    expect(view.missing.map((m) => m.id)).toEqual(
      expect.arrayContaining(["garment_type", "placements"])
    );
  });

  it("boş harita ve TOPLAM=0 → üretim önkoşulu EKSİK (0'lar meşru ama toplam sıfır)", async () => {
    const id = await garmentBrief();
    await patch(id, { spec_values: { size_distribution: {} } });
    expect(json(await get(id)).missing.map((m) => m.id)).toContain("size_distribution");

    await patch(id, { spec_values: { size_distribution: { S: 0, M: 0 } } });
    const sifir = json(await get(id));
    expect(sifir.brief.spec_values.size_distribution).toEqual({ S: 0, M: 0 });
    expect(sifir.missing.map((m) => m.id)).toContain("size_distribution");
    expect(sifir.completeness.productionCompleteness).toBeLessThan(100);
  });

  it("İSTEMCİ TOPLAMI güvenilir kaynak DEĞİL: total_quantity yazılamaz (400) — toplam hep hesaplanır", async () => {
    const id = await garmentBrief();
    const res = await patch(id, {
      spec_values: { size_distribution: { S: 1 }, total_quantity: 9999 },
    });
    expect(res.statusCode).toBe(400);
    expect(json(res).error).toBe("unknown_spec_keys");
    const view = json(await get(id));
    expect(view.brief.spec_values.total_quantity).toBeUndefined();
  });

  it("DTF seçimi REDDEDİLMEZ — bilgi notu üretir (keşif E düzeltmesi)", async () => {
    const id = await garmentBrief();
    await patch(id, { spec_values: { technique: "dtf" } });
    const view = json(await get(id));
    expect(view.missing.map((m) => m.id)).not.toContain("technique");
    expect(view.completeness.notices.map((n) => n.code)).toContain("technique_info:dtf");
    expect(view.completeness.notices[0].message_tr).toMatch(/alfa-PNG/i);
  });

  it("YAZMA BEKÇİSİ: tanımsız anahtar 400 + AUDIT satırı; menü alanı garment'a yazılamaz", async () => {
    const id = await garmentBrief();
    const uydurma = await patch(id, { spec_values: { uydurma_alan: "x" } });
    expect(uydurma.statusCode).toBe(400);
    expect(json(uydurma).error).toBe("unknown_spec_keys");
    expect(String(json(uydurma).detail)).toContain("uydurma_alan");

    /* D-63: red SESSİZ değil — denetim izi kalır */
    const audit = db
      .prepare("SELECT event_type, reason, payload_json FROM brief_audit WHERE brief_id = ? AND event_type = 'spec_write_rejected'")
      .all(id) as Array<{ event_type: string; reason: string; payload_json: string }>;
    expect(audit).toHaveLength(1);
    expect(audit[0].reason).toContain("uydurma_alan");
    expect(JSON.parse(audit[0].payload_json).unknown_keys).toEqual(["uydurma_alan"]);

    const menuAlani = await patch(id, { spec_values: { qr_target_url: "https://x" } });
    expect(menuAlani.statusCode).toBe(400);

    /* kolon/türetme kaynaklı alanlar da spec_values'a yazılamaz (çift kaynak yasağı) */
    const kolon = await patch(id, { spec_values: { delivery_deadline: "2026-09-01" } });
    expect(kolon.statusCode).toBe(400);
  });

  it("garment üretim tamlığı %100 olunca tasarım zinciri yürür (dosya dahil)", async () => {
    const id = await garmentBrief();
    await patch(id, {
      delivery_deadline: "2026-09-01",
      spec_values: {
        fabric_color: "siyah",
        technique: "broderie",
        size_distribution: { S: 5, M: 5 },
        print_size_position: "göğüs merkez 25×30",
      },
    });
    const upload = await app.inject({
      method: "POST",
      url: `/api/briefs/${id}/files`,
      payload: Buffer.concat([
        Buffer.from(
          `--${BOUNDARY}\r\nContent-Disposition: form-data; name="role"\r\n\r\ntasarim\r\n` +
            `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="t.png"\r\n` +
            `Content-Type: image/png\r\n\r\n`
        ),
        PNG,
        Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
      ]),
      headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    });
    expect(upload.statusCode).toBe(201);

    const view = json(await get(id));
    expect(view.missing).toEqual([]);
    expect(view.completeness.productionCompleteness).toBe(100);

    await transition(id, { to: "INCOMPLETE" });
    await transition(id, { to: "READY_FOR_DESIGN" });
    const design = await transition(id, { to: "DESIGN_IN_PROGRESS" });
    expect(design.statusCode).toBe(200);
    /* üretim incelemesi hâlâ P7'ye kilitli */
    expect((await transition(id, { to: "READY_FOR_PRODUCTION_REVIEW" })).statusCode).toBe(501);
  });
});

describe("REGRESYON — P4 menü yolu ve genel intake yüzeyi (D-63 gate kalemi)", () => {
  it("P4 MENÜ yolu bozulmadı: menü alan matrisi + kapasite/fiyat görünümü aynen", async () => {
    const res = await create({
      request_type: "menu",
      customer_ref: "cli1",
      language_requirements: ["tr"],
      requested_publications: ["a4_print"],
      content_reference: "catalog:cli1",
      spec_values: { format: "a4-portrait", format_template: "menu-liste-premium" },
    });
    expect(res.statusCode).toBe(201);
    const view = json(res);
    const ids = view.missing.map((m) => m.id);
    /* menü koşulluları canlı */
    expect(ids).toEqual(expect.arrayContaining(["print_quantity", "print_material", "file:logo"]));
    /* garment alanları menüde SORULMAZ */
    expect(ids).not.toContain("size_distribution");
    expect(ids).not.toContain("garment_type");
    expect(view.price_coverage).toMatchObject({ items: 2, missing: 0 });
    expect(view.completeness.designReady).toBe(true);
  });

  it("GENEL INTAKE yüzeyi ayakta: /api/sectors · /api/ingredients · /api/intake doğrulaması", async () => {
    const sectors = await app.inject({ method: "GET", url: "/api/sectors" });
    expect(sectors.statusCode).toBe(200);
    const ingredients = await app.inject({ method: "GET", url: "/api/ingredients" });
    expect(ingredients.statusCode).toBe(200);
    expect((ingredients.json() as unknown[]).length).toBeGreaterThan(0);
    /* intake commit ucu şemasıyla ayakta (boş gövde → Zod 400, çökme değil) */
    const intake = await app.inject({ method: "POST", url: "/api/intake", payload: {} });
    expect(intake.statusCode).toBe(400);
    expect((intake.json() as { error: string }).error).toBe("validation");
  });

  it("APPEND-ONLY: MEVCUT satırların İÇERİĞİ değişmez (yalnız yeni satır eklenir)", async () => {
    const id = await create({ request_type: "menu", customer_ref: "cli1" }).then((r) => json(r).brief.id);
    /* id'ler rastgele → kronolojik sıra YOK; kimlik bazlı karşılaştırma yapılır */
    const byId = () => {
      const rows = db
        .prepare("SELECT id, event_type, reason, payload_json, created_at FROM brief_audit WHERE brief_id = ?")
        .all(id) as Array<Record<string, unknown>>;
      return new Map(rows.map((r) => [String(r.id), JSON.stringify(r)]));
    };

    const before = byId();
    await patch(id, { requester_notes: "not-1" });
    await patch(id, { requester_notes: "not-2" });
    await patch(id, { spec_values: { uydurma: 1 } }); /* reddedilen yazım da satır açar */
    const after = byId();

    expect(after.size).toBe(before.size + 3);
    /* AJAN-5/B-9: eski satırların İÇERİĞİ birebir aynı mı? (sayı+id tekilliği bunu ölçmezdi) */
    for (const [rowId, content] of before) {
      expect(after.get(rowId), `audit satırı değişmiş: ${rowId}`).toBe(content);
    }
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
