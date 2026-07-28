/* KLON KAPISI testleri (journal 2026-07-27-klon-kapisi-yetim-telafi).

   Klonun iki INSERT noktası artık paramlariDogrula'dan geçer. Bozuk kaynak
   belgeler DOĞRUDAN db UPDATE ile kurulur (param-kapisi.test.ts deseninin
   aynısı ve aynı gerekçeyle): PUT kapısı varken bozuk param uçtan yazılamaz —
   klon kapısının asıl işi de tam bu, kapıdan ÖNCE diske girmiş tarihsel
   satırların ÇOĞALMASINI durdurmak. Kaynak belge okunabilir kalır (okuma yolu
   gevşek); yalnızca klonlanamaz. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");

let app: FastifyInstance;
let clientId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Klon Kapı', 'klon-kapi', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());
});

const olustur = async (template_id: string): Promise<string> => {
  const res = await app.inject({
    method: "POST",
    url: `/api/clients/${clientId}/documents`,
    payload: { template_id },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
};

/** Bozuk paramı kapının ARKASINDAN yaz — tarihsel satır simülasyonu. */
const boz = (docId: string, params: Record<string, unknown>): void => {
  db.prepare("UPDATE documents SET params_json = ? WHERE id = ?").run(JSON.stringify(params), docId);
};

const belgeSayisi = (): number =>
  (db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number }).n;
const musteriSayisi = (): number =>
  (db.prepare("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n;

describe("belge klonu — kapı INSERT'ten önce", () => {
  it("bozuk cut_color'lı kaynak 400 alır, yeni satır yazılmaz", async () => {
    const docId = await olustur("vitro-centre");
    boz(docId, { cut_color: "kırmızı" });

    const once = belgeSayisi();
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/clone`, payload: {} });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string; issues: { path: string }[] };
    expect(body.error).toBe("validation");
    expect(body.issues.some((i) => i.path === "cut_color")).toBe(true);
    expect(belgeSayisi(), "ret hiçbir yan etki bırakmamalı").toBe(once);
  });

  it("geçerli kaynak 201 klonlanır (regresyon)", async () => {
    const docId = await olustur("vitro-centre");
    const once = belgeSayisi();
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/clone`, payload: {} });
    expect(res.statusCode).toBe(201);
    expect(belgeSayisi()).toBe(once + 1);
  });

  it("şemasız aile (menü) bozulamaz-diye-bilinen params'la da klonlanır — kapı yalnız VAR OLAN sözleşmeyi uygular", async () => {
    const docId = await olustur("menu-grid-cells");
    boz(docId, { format: 42, tuhaf: true });
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/clone`, payload: {} });
    expect(res.statusCode).toBe(201);
  });
});

describe("müşteri klonu — ATOMİK ret", () => {
  it("bozuk belge içeren klon isteği HİÇBİR ŞEY yazmaz (müşteri satırı dahil)", async () => {
    /* Fırlatma transaction İÇİNDE → better-sqlite3 geri sarar. Bozuk belgeyi
       sessizce ATLAYIP kalanını kopyalamak bilinçli reddedildi (declare):
       eksik kopyayı "başarılı" göstermek fail-silent'tır. */
    const saglamId = await olustur("vitro-centre");
    const bozukId = await olustur("enseigne-panneau");
    boz(bozukId, { h_cm: 0 });

    const onceM = musteriSayisi();
    const onceB = belgeSayisi();
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/clone`,
      payload: { name: "Kopya Atomik", document_ids: [saglamId, bozukId] },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("validation");
    expect(musteriSayisi(), "yeni müşteri satırı geri sarılmalı").toBe(onceM);
    expect(belgeSayisi(), "sağlam belge de kopyalanmamalı (atomiklik)").toBe(onceB);
  });

  it("hepsi geçerliyse klon 201 ve belgeler kopyalanır (regresyon)", async () => {
    const d1 = await olustur("vitro-centre");
    const d2 = await olustur("menu-grid-cells");
    const onceB = belgeSayisi();
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/clone`,
      payload: { name: "Kopya Sağlam", document_ids: [d1, d2] },
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as { cloned_documents: number }).cloned_documents).toBe(2);
    expect(belgeSayisi()).toBe(onceB + 2);
  });
});
