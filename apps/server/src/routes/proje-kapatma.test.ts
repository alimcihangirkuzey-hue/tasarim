/* YAKLAŞAN İŞLER ↔ PROJE DURUMU testi (K-1/B).

   ÖLÇÜLEN YARA: sunucu `status`'ü KABUL ediyordu (ProjectUpdateSchema) ve
   yaklaşan-işler sorgusu ona BAĞLIYDI, ama 'done' hiçbir yerde YAZILMIYORDU
   (bu turda grep'le sayıldı: sıfır geçiş). Yani kapatma yeteneği vardı ama
   ERİŞİLEMEZDİ; vadeli her proje operatörün şeridinde sonsuza dek kalıyordu.

   Bu dosya SUNUCU tarafını ölçer: kapanan proje şeritten düşer, açılan geri
   gelir. Arayüz tarafı apps/web ProjectsPanel.kapatma.test.tsx'te. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO, PROJE_ACIK, PROJE_KAPALI } = await import("@tezgah/shared");

let app: FastifyInstance;
let projectId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  const clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Kapatma Test', 'kapatma-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  projectId = newId("prj");
  db.prepare(
    `INSERT INTO projects (id, client_id, name, status, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(projectId, clientId, "Vadeli İş", PROJE_ACIK, "2026-12-31", nowISO());
  /* Şerit AÇIK kalem sayar (status NOT IN teslim/iptal) — biri gerekli. */
  db.prepare(
    `INSERT INTO order_items (id, project_id, product_type, qty, width_cm, height_cm,
       details_json, notes, status, document_id, created_at, updated_at)
     VALUES (?, ?, 'flyer', 1, NULL, NULL, '{}', '', 'olcu_bekliyor', NULL, ?, ?)`
  ).run(newId("oi"), projectId, nowISO(), nowISO());
});

async function seritte(): Promise<boolean> {
  const res = await app.inject({ method: "GET", url: "/api/projects/upcoming" });
  expect(res.statusCode).toBe(200);
  return (res.json() as Array<{ id: string }>).some((p) => p.id === projectId);
}

async function durumYaz(status: string): Promise<void> {
  const res = await app.inject({ method: "PUT", url: `/api/projects/${projectId}`, payload: { status } });
  expect(res.statusCode).toBe(200);
}

describe("yaklaşan işler şeridi — proje durumuna bağlı", () => {
  it("AÇIK proje şeritte GÖRÜNÜR (ön-koşul)", async () => {
    /* Bu iddia kırılırsa aşağıdaki kapatma testi hiçbir şey ölçmezdi:
       zaten görünmeyen bir projenin "düştüğünü" doğrulamak boş olurdu. */
    expect(await seritte()).toBe(true);
  });

  it("KAPANAN proje şeritten DÜŞER — yetenek artık erişilebilir", async () => {
    await durumYaz(PROJE_KAPALI);
    expect(await seritte()).toBe(false);
  });

  it("YENİDEN AÇILAN proje şeride GERİ GELİR (kapatma geri alınabilir)", async () => {
    await durumYaz(PROJE_ACIK);
    expect(await seritte()).toBe(true);
  });
});
