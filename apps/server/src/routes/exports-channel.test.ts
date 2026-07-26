/* KANAL BEKÇİSİ testleri (7.2/8.5, uretim-kanali-ilani) — gerçek HTTP uçları,
   izole :memory: db. Her iki bekçi de browser'dan ÖNCE fırlar → puppeteer'siz
   inject-testli; geçiş (happy-path) yolları browser ister ve BURADA test
   edilmez (exports-blocker.test.ts ile aynı bilinçli kapsam sınırı). */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");

let app: FastifyInstance;
let menuDocId: string;
let garmentDocId: string;
let fabrikaDocId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  const clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Kanal Test', 'kanal-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  const olustur = async (template_id: string): Promise<string> => {
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/documents`,
      payload: { template_id },
    });
    return (res.json() as { id: string }).id;
  };
  menuDocId = await olustur("menu-liste-premium");
  garmentDocId = await olustur("garment");
  /* kimlik-yalnız kayıtta OLMAYAN aile (generated/) — asimetri çivisi için */
  fabrikaDocId = await olustur("kabul-fabrika");
});

describe("POST /api/documents/:id/export — kanal bekçisi (print/preview ilanı)", () => {
  it("tekstil belgesine PDF üretimi REDDEDİLİR: garment print/preview İLAN ETMEZ", async () => {
    /* Eski hâlde bu istek 201 dönüp anlamlı olmayan bir 'üretim' PDF'i
       yazardı (UI yönlendirmesi maskeliyordu) — bekçi doğrudan-API/UI-hatası
       savunmasıdır, blocker-backstop emsali */
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${garmentDocId}/export`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["print", "preview"], declared: ["png", "broderie"] },
    });
  });

  it("BLOCKER İLK KAPI KALIR: tekstil belgesinde bile blocker 409'u kanal reddinden önce kazanır", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${garmentDocId}/export`,
      payload: { warnings: [{ type: "empty-required", slotId: "logo" }] },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "blocker_present", detail: ["empty-required"] });
  });

  it("variants kapısı kanal bekçisinden önce: boş variants tekstilde de no_variants döner", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${garmentDocId}/export`,
      payload: { variants: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "no_variants" });
  });

  it("ATÖLYE/MAKİNE ASİMETRİSİ ÇİVİSİ: kayıtsız profil (fabrika) atölye ucunda GEÇER", async () => {
    /* entegrasyon-siniri paketi /render'da kayıtsız profili 400
       profile_not_registered'a çevirdi; ATÖLYE ucu bilinçli olarak ESKİ
       düşme davranışını korur (operatör sorumludur, UI fabrika belgesini
       export edebilmeye devam eder). Bu ayrım bir ürün kararıdır ve burada
       ÇİVİLİDİR: biri "tutarlılık" adına exports.ts'i sıkılaştırırsa bu test
       patlar ve karar journal'sız değiştirilemez (journal
       2026-07-26-entegrasyon-siniri-karari). Kanıt sıralamadan: istek kanal
       reddi GÖRMEZ, variants kapısına iner. */
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${fabrikaDocId}/export`,
      payload: { variants: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "no_variants" });
  });

  it("print/preview İLAN EDEN profil (menu) kanal bekçisine TAKILMAZ", async () => {
    /* Happy-path browser ister; kanıt sıralamadan: menu isteği variants
       kapısına kadar iner (no_variants), kanal reddi HİÇ görmez */
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${menuDocId}/export`,
      payload: { variants: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "no_variants" });
  });
});

describe("POST /api/documents/:id/export-garment — id-sniff emekli, kanal ilanı devrede", () => {
  it("png/broderie İLAN ETMEYEN belge (menu) reddedilir — eski not_garment adı kanal sözlüğüne emekli", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${menuDocId}/export-garment`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["png", "broderie"], declared: ["print", "preview"] },
    });
  });
});
