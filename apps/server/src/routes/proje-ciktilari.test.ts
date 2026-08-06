/* GET /api/projects/:id/exports — projenin ÜRETİLMİŞ DOSYALARI testi.
   Gerçek HTTP ucu, izole :memory: db; puppeteer GEREKMEZ çünkü kayıtlar
   doğrudan export_records'a yazılır (üretim yolunu değil, OKUMA bağını
   ölçüyoruz — üretim yolu exports-blocker/channel testlerinin konusu).

   ÖLÇÜLEN YARA: belge çıktılarının tamamı `export_records.project_id`'yi
   null bırakır (exports.ts:184 · cmyk.ts:95 · garment.ts:143 · mockup.ts:107,187
   · digital-menu.ts:74 · vector.ts — yedi yazıcı, bu turda komutla sayıldı).
   Uç eskiden `WHERE project_id = ?` diyordu; sonuç: toplu üretimden çıkan
   HİÇBİR dosya bu uçta görünmüyordu, yalnız sunum kayıtları görünüyordu.
   Bağ artık okuma anında belgeden türetilir (documents.project_id NOT NULL). */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");

let app: FastifyInstance;
let projectId: string;
let baskaProjectId: string;
let docId: string;
let musteriId: string;
let baskaDocId: string;

/** export_records'a doğrudan kayıt — yazıcıların BUGÜNKÜ şeklini taklit eder:
    belge çıktısı project_id'yi NULL bırakır (yara buradadır, testte de öyle). */
function ciktiYaz(p: {
  document_id: string | null;
  project_id: string | null;
  client_id?: string | null;
  kind: string;
  filepath: string;
  version: number;
  created_at?: string;
}): string {
  const id = newId("exp");
  db.prepare(
    `INSERT INTO export_records (id, document_id, project_id, client_id, kind, filepath, snapshot_json, version, created_at)
     VALUES (@id, @document_id, @project_id, @client_id, @kind, @filepath, '{}', @version, @created_at)`
  ).run({ ...p, id, client_id: p.client_id ?? null, created_at: p.created_at ?? nowISO() });
  return id;
}

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  const clientId = newId("cli");
  musteriId = clientId;
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Cikti Test', 'cikti-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  const proje = (ad: string): string => {
    const id = newId("prj");
    db.prepare(
      `INSERT INTO projects (id, client_id, name, status, created_at) VALUES (?, ?, ?, 'open', ?)`
    ).run(id, clientId, ad, nowISO());
    return id;
  };
  projectId = proje("Açılış Paketi");
  baskaProjectId = proje("Başka Proje");

  const belge = async (pid: string): Promise<string> => {
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/documents`,
      payload: { template_id: "menu-liste-premium", project_id: pid },
    });
    return (res.json() as { id: string }).id;
  };
  docId = await belge(projectId);
  baskaDocId = await belge(baskaProjectId);
});

async function ciktilar(pid: string): Promise<Array<{ id: string; kind: string }>> {
  const res = await app.inject({ method: "GET", url: `/api/projects/${pid}/exports` });
  expect(res.statusCode).toBe(200);
  return res.json() as Array<{ id: string; kind: string }>;
}

describe("GET /api/projects/:id/exports — bağ okuma anında belgeden türetilir", () => {
  it("BELGE ÇIKTISI GÖRÜNÜR — project_id null olsa bile (asıl yara)", async () => {
    const expId = ciktiYaz({
      document_id: docId,
      project_id: null, // yazıcıların bugünkü şekli
      kind: "print",
      filepath: "data/exports/x.pdf",
      version: 1,
    });
    const liste = await ciktilar(projectId);
    /* Eski sorgu (WHERE project_id = ?) bunu ASLA döndüremezdi. */
    expect(liste.map((r) => r.id)).toContain(expId);
  });

  it("SUNUM KAYDI DA GÖRÜNÜR — document_id taşımaz, er.project_id dalı korundu", async () => {
    const expId = ciktiYaz({
      document_id: null,
      project_id: projectId,
      kind: "presentation",
      filepath: "data/exports/sunum.pdf",
      version: 1,
    });
    const liste = await ciktilar(projectId);
    expect(liste.map((r) => r.id)).toContain(expId);
    /* İki dal birlikte çalışır: aynı listede hem belge çıktısı hem sunum. */
    expect(liste.map((r) => r.kind)).toEqual(expect.arrayContaining(["print", "presentation"]));
  });

  it("BAŞKA PROJENİN ÇIKTISI SIZMAZ — türetme sınırı korur", async () => {
    const yabanci = ciktiYaz({
      document_id: baskaDocId,
      project_id: null,
      kind: "print",
      filepath: "data/exports/yabanci.pdf",
      version: 1,
    });
    const liste = await ciktilar(projectId);
    /* LEFT JOIN'in "OR d.project_id" dalı gevşek yazılsaydı (ör. parametre
       karıştırılsaydı) bütün belge çıktıları her projede görünürdü. */
    expect(liste.map((r) => r.id)).not.toContain(yabanci);
    expect((await ciktilar(baskaProjectId)).map((r) => r.id)).toContain(yabanci);
  });

  it("MÜŞTERİ DÜZEYLİ KAYIT (dijital menü) SIZMAZ", async () => {
    /* Şema en az bir bağ ZORUNLU kılar (CHECK: document_id/project_id/client_id
       üçünden biri dolu) — ilk yazımda üçü de null bir satır denedim ve veritabanı
       reddetti: uydurulmuş bir durumu ölçüyordum. Gerçek şekil budur: dijital menü
       yalnız client_id taşır (digital-menu.ts:74, mimar kararı #16). */
    const musteriDuzeyli = ciktiYaz({
      document_id: null,
      project_id: null,
      client_id: musteriId,
      kind: "digital_menu",
      filepath: "data/exports/menu.html",
      version: 1,
    });
    /* LEFT JOIN'de d NULL olur; her iki dal da yanlış → satır düşmeli.
       Düşmeseydi müşteri düzeyli kayıt HER projede görünürdü. */
    expect((await ciktilar(projectId)).map((r) => r.id)).not.toContain(musteriDuzeyli);
  });
});
