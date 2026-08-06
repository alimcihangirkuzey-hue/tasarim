/* AÇILIŞ TAKIMI UCU × KURULUM İŞ KOLLARI (K-1/A × K-1/C).

   Süzme kuralı ../preset-kapsami.test.ts'te ölçülür. Bu dosya UCUN davranışını
   ölçer ve asıl iddiası şudur: kalem üretilemeyen kurulumda uç SESSİZ BOŞ PROJE
   AÇMAZ. Boş proje açmak operatöre "oldu" der ve geriye elle silinecek bir kabuk
   bırakırdı — üstelik "tek tıkla bitir" düğmesinden. Bu yüzden proje satırının
   HİÇ YAZILMADIĞI ayrıca sayılır; 409 dönüp yine de satır bırakmak, sessiz
   olanından beter olurdu. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO, OPENING_KIT } = await import("@tezgah/shared");
const { IS_KOLLARI_ENV } = await import("../is-kollari.js");

let app: FastifyInstance;
let clientId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Preset Test', 'preset-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());
});

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  db.prepare("DELETE FROM projects WHERE client_id = ?").run(clientId);
});

const projeSayisi = (): number =>
  (db.prepare("SELECT COUNT(*) AS n FROM projects WHERE client_id = ?").get(clientId) as { n: number }).n;

const kalemTurleri = (projectId: string): string[] =>
  (
    db
      .prepare("SELECT product_type FROM order_items WHERE project_id = ? ORDER BY rowid ASC")
      .all(projectId) as Array<{ product_type: string }>
  ).map((r) => r.product_type);

async function takimKur(): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const res = await app.inject({
    method: "POST",
    url: `/api/clients/${clientId}/presets/opening`,
    payload: {},
  });
  return { statusCode: res.statusCode, body: res.json() as Record<string, unknown> };
}

describe("açılış takımı ucu — iş kolu kapsamı", () => {
  it("YAPILANDIRMA YOKKEN bugünkü dört kalem birebir üretilir", async () => {
    const { statusCode, body } = await takimKur();
    expect(statusCode).toBe(201);
    expect(body.items).toBe(OPENING_KIT.items.length);
    expect(kalemTurleri(body.project_id as string)).toEqual(
      OPENING_KIT.items.map((k) => k.product_type),
    );
  });

  it("MENÜ ÜRETİCİ kurulumunda proje TEK kalemle açılır", async () => {
    process.env[IS_KOLLARI_ENV] = "menu-uretici";
    const { statusCode, body } = await takimKur();
    expect(statusCode).toBe(201);
    expect(body.items).toBe(1);
    /* Sayı değil, DB'ye YAZILANLAR ölçülür: yanıt doğru sayıyı verip yanlış
       satırları yazmak tam olarak bu testin var olma sebebidir. */
    expect(kalemTurleri(body.project_id as string)).toEqual(["menu"]);
  });

  it("TABELACI kurulumunda 409 döner ve PROJE SATIRI HİÇ YAZILMAZ", async () => {
    process.env[IS_KOLLARI_ENV] = "tabelaci";
    expect(projeSayisi()).toBe(0); // ön-koşul: temiz başlangıç
    const { statusCode, body } = await takimKur();
    expect(statusCode).toBe(409);
    expect(body.error).toBe("is_kolu_disi");
    /* Gerekçe gövdede: arayüz "hangi iş kolları" diyebilsin. */
    expect(body.is_kollari).toEqual(["tabelaci"]);
    expect(projeSayisi(), "409 döndü ama proje kabuğu bırakıldı").toBe(0);
  });

  it("ORTAM DEĞİŞKENİ her istekte YENİDEN okunur (uç donmuş değil)", async () => {
    /* app.ready() yapılandırma YOKKEN koştu. Donmuş olsaydı kiralanan kurulum
       takımı ancak yeniden başlatmayla daraltabilirdi. */
    process.env[IS_KOLLARI_ENV] = "matbaa";
    const ilk = await takimKur();
    expect(ilk.body.items).toBe(2);
    delete process.env[IS_KOLLARI_ENV];
    const sonra = await takimKur();
    expect(sonra.body.items).toBe(OPENING_KIT.items.length);
  });
});
