/* GÖRÜNÜRLÜK ≠ YETKİ — KALAN YAZMA YOLLARI (K-1/C modül sınırı).

   NEREDEN GELDİ: `2026-08-07-gorunurluk-yetki-ucu` paketinin açık bulgusu
   `K1C-UC-2`: "kalem yazma ve belge açma uçları ölçüldü; aynı soruyu taşıyan
   DİĞER yazma uçları (`PUT /api/order-items/:id` ile türü SONRADAN kapalı bir
   türe çevirmek, klon ucu, intake commit) bu pakette KOŞULMADI."

   O CÜMLENİN BİR ÜÇTE BİRİ ÖLÇÜMLE DÜŞTÜ — ve bu paketin ilk işi kendi
   listemi düzeltmek oldu: `POST /api/intake` bu sorunun yolu DEĞİLDİR.
   Ölçüldü (kaynak taraması): intake `product_type` ya da `order_items`
   sözcüğünü hiç geçirmez — sipariş kalemi yazmaz. Üstelik `isKollariIlani()`i
   İMPORT EDER (doğuş kataloğu için) — yani "iş kolu ilanını import eden uçlar"
   diye bir tarama intake'i "kapsanmış" sayardı. İLANI OKUMAK ile ONA GÖRE
   DARALTMAK aynı şey değildir; bu ölçüm aracı kör noktası kayda geçti.

   GERİYE İKİ GERÇEK YOL KALDI ve ikisi de burada koşuluyor:
     · `PUT /api/order-items/:id` — türü SONRADAN kapalı bir kola çevirmek.
       Yaratma yolundan farkı şudur: kalem zaten meşru bir türle doğmuş
       olabilir; kapanma sonradan gelir (kurulum daraltılır) ya da operatör
       türü değiştirir. "Yaratmada bakmıyor" ölçümü bunu KAPSAMAZ.
     · `POST /api/clients/:id/clone` — klon, kaynak müşterinin BELGELERİNİ
       kopyalar (`clone.ts:170`). Yani tek bir çağrı, kapalı iş kollarının
       şablonlarını taşıyan N belgeyi dar bir kuruluma çoğaltabilir. Bu bir
       yaratma değil TOPLU KOPYALAMADIR ve ayrı ölçülmesi gerekir.

   BU DOSYA BİR ŞEY DEĞİŞTİRMEZ. 7.1/481 "kullanıcı yalnızca yaptığı işi
   görür" der, "yapamaz" demez; yetki katmanı (entitlement) hiç yazılmadı ve
   yazılıp yazılmayacağı ÜRÜN KARARIDIR — sorulmamıştır, uydurulmamıştır.
   Karar verildiği gün burası kırmızıya döner. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO, ProductTypeSchema } = await import("@tezgah/shared");
const { IS_KOLLARI_ENV, isKollariIlani } = await import("../is-kollari.js");
const { siparisSablonlari, siparisSektoru } = await import("@tezgah/templates/identity");

/** Dar kurulum: modül tek iş koluna kiralanmış. */
const DAR = "tabelaci";

let app: FastifyInstance;
let clientId: string;
let projectId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Yazma Yollari Test', 'yazma-yollari-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  projectId = newId("prj");
  db.prepare(
    `INSERT INTO projects (id, client_id, name, status, due_date, created_at)
     VALUES (?, ?, 'Yazma Projesi', 'open', NULL, ?)`
  ).run(projectId, clientId, nowISO());
});

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  db.prepare("DELETE FROM order_items WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM documents WHERE project_id = ?").run(projectId);
  /* Klon testleri yeni müşteri doğurur — kaynak müşteri hariç hepsi silinir. */
  db.prepare("DELETE FROM clients WHERE id <> ?").run(clientId);
});

/** Dar kurulumda KAPALI kalan türler — ilandan TÜRETİLİR, elle yazılmaz. */
function kapaliTurler(): string[] {
  const ilan = isKollariIlani(DAR);
  return ProductTypeSchema.options.filter((t) => {
    const s = siparisSektoru(t);
    return s !== null && !ilan.aktif.includes(s);
  });
}

/** Dar kurulumda AÇIK kalan, tasarlanabilir bir tür. */
function acikTur(): string {
  const ilan = isKollariIlani(DAR);
  const t = ProductTypeSchema.options.find((x) => {
    const s = siparisSektoru(x);
    return s !== null && ilan.aktif.includes(s) && siparisSablonlari(x as never).length > 0;
  });
  if (!t) throw new Error("dar kurulumda açık tasarlanabilir tür yok — ölçüm konusuz");
  return t;
}

async function kalemYaz(tur: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `/api/projects/${projectId}/items`,
    payload: { product_type: tur, qty: 1 },
  });
  expect(res.statusCode, "hazırlık kalemi yazılamadı").toBe(201);
  return (res.json() as { id: string }).id;
}

function belgeYaz(templateId: string): string {
  const id = newId("doc");
  db.prepare(
    `INSERT INTO documents (id, project_id, template_id, params_json, theme_id, selection_json,
                            overrides_json, status, created_at, updated_at)
     VALUES (?, ?, ?, '{}', 'brand', '{}', '{}', 'draft', ?, ?)`
  ).run(id, projectId, templateId, nowISO(), nowISO());
  return id;
}

describe("ÖN KOŞUL — ölçümün konusu var", () => {
  it("dar kurulum hem KAPALI hem AÇIK tasarlanabilir tür bırakıyor", () => {
    /* Bu satır olmadan aşağıdaki her iddia, hiçbir türü kapatmayan bozuk bir
       ilanla da yeşil kalırdı — uçlar zaten hiçbir şeyi reddetmiyor. */
    expect(kapaliTurler().length, "hiçbir tür kapanmıyor").toBeGreaterThan(0);
    expect(() => acikTur(), "hiç açık tür yok — daraltma yetkiye dönmüş").not.toThrow();
  });

  it("KAPALI türlerin köprüsü sağlam — klon ölçümünün şablonu var", () => {
    const koprusuz = kapaliTurler().filter((t) => siparisSablonlari(t as never).length === 0);
    expect(koprusuz).toEqual([]);
  });
});

describe("GÜNCELLEME YOLU — tür SONRADAN kapalı kola çevrilebiliyor", () => {
  it("PUT kalemin türünü kapalı iş koluna ÇEVİRİR ve diske YAZAR", async () => {
    /* Yaratma ölçümünün kapsamadığı hâl: kalem AÇIK bir türle doğuyor,
       sonra kapalı bir türe çevriliyor. Kurulum sonradan daraltıldığında
       (ya da operatör türü değiştirdiğinde) gerçekleşen yol budur. */
    const itemId = await kalemYaz(acikTur());
    process.env[IS_KOLLARI_ENV] = DAR;
    const hedef = kapaliTurler()[0]!;

    const res = await app.inject({
      method: "PUT",
      url: `/api/order-items/${itemId}`,
      payload: { product_type: hedef },
    });

    expect(res.statusCode, `${hedef}: güncelleme reddedildi — yetki katmanı doğmuş`).toBe(200);
    const satir = db
      .prepare("SELECT product_type FROM order_items WHERE id = ?")
      .get(itemId) as { product_type: string };
    expect(satir.product_type, "tür diske yazılmadı").toBe(hedef);
  });

  it("KAPALI TÜRLERİN HEPSİ aynı yolu izler — tek türe özgü kaza değil", async () => {
    process.env[IS_KOLLARI_ENV] = DAR;
    for (const hedef of kapaliTurler()) {
      const itemId = await kalemYaz(acikTur());
      const res = await app.inject({
        method: "PUT",
        url: `/api/order-items/${itemId}`,
        payload: { product_type: hedef },
      });
      expect(res.statusCode, `${hedef}: reddedildi`).toBe(200);
    }
  });
});

describe("KLON YOLU — kapalı kolun BELGELERİ dar kuruluma çoğalıyor", () => {
  it("müşteri klonu kapalı iş kolunun şablonlu belgesini KOPYALAR", async () => {
    /* Klon bir yaratma değil TOPLU KOPYALAMADIR: tek çağrı, N belge. Kapalı
       kolun şablonunu taşıyan belge de kopyalanır ve yeni müşteride yaşar. */
    const kapaliTur = kapaliTurler()[0]!;
    const templateId = siparisSablonlari(kapaliTur as never)[0]!;
    const docId = belgeYaz(templateId);
    process.env[IS_KOLLARI_ENV] = DAR;

    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/clone`,
      payload: { name: "Klon Hedefi", document_ids: [docId] },
    });

    expect(res.statusCode, "klon reddedildi").toBe(201);
    const body = res.json() as { id: string; cloned_documents: number };
    expect(body.cloned_documents, "kapalı kolun belgesi kopyalanmadı").toBe(1);

    const kopya = db
      .prepare(
        `SELECT d.template_id AS tid FROM documents d
         JOIN projects p ON p.id = d.project_id WHERE p.client_id = ?`
      )
      .all(body.id) as Array<{ tid: string }>;
    expect(kopya.map((r) => r.tid)).toEqual([templateId]);
  });

  it("KARŞIT ÖLÇÜM: aynı klon, İLANSIZ kurulumda da AYNI sonuç", async () => {
    /* Sonucun ilandan BAĞIMSIZ olduğunu gösterir: klon ucu ilanı okumuyor,
       "bugün tesadüfen geçiyor" değil. */
    const kapaliTur = kapaliTurler()[0]!;
    const templateId = siparisSablonlari(kapaliTur as never)[0]!;
    const docId = belgeYaz(templateId);

    delete process.env[IS_KOLLARI_ENV];
    const ilansiz = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/clone`,
      payload: { name: "Klon Ilansiz", document_ids: [docId] },
    });
    process.env[IS_KOLLARI_ENV] = DAR;
    const dar = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/clone`,
      payload: { name: "Klon Dar", document_ids: [docId] },
    });

    expect(ilansiz.statusCode).toBe(201);
    expect(dar.statusCode, "dar kurulumda klon sonucu DEĞİŞTİ — uç ilanı okuyor").toBe(
      ilansiz.statusCode
    );
    expect((dar.json() as { cloned_documents: number }).cloned_documents).toBe(
      (ilansiz.json() as { cloned_documents: number }).cloned_documents
    );
  });
});

describe("KENDİ LİSTEMİN DÜZELTMESİ — intake bu sorunun yolu DEĞİL", () => {
  it("intake rotası `product_type` ya da `order_items` hiç geçirmiyor", async () => {
    /* `K1C-UC-2` intake'i aday olarak saymıştı; ölçüm onu listeden DÜŞÜRDÜ.
       Ayrıca intake `isKollariIlani`i İMPORT EDER (doğuş kataloğu için) —
       yani "ilanı import eden uçlar" taraması onu yanlışlıkla "kapsanmış"
       sayardı. İLANI OKUMAK ile ONA GÖRE DARALTMAK aynı şey değildir. */
    const fs = await import("node:fs");
    const path = await import("node:path");
    const url = await import("node:url");
    const buDosya = url.fileURLToPath(import.meta.url);
    const kaynak = fs.readFileSync(path.join(path.dirname(buDosya), "intake.ts"), "utf8");

    expect(kaynak, "intake sipariş kalemi yazıyor — ölçüm listesi eksik").not.toMatch(
      /order_items|product_type/
    );
    expect(kaynak, "ön koşul: intake ilanı gerçekten import ediyor").toMatch(/isKollariIlani/);
  });
});
