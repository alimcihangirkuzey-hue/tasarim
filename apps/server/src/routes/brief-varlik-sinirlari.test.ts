/* ÜRETİM GİRDİSİ GALERİ VARLIĞI DEĞİLDİR (Canonical 6.3/440; journal
   2026-07-26-brief-varlik-sinirlari) — iki sızıntının nöbetçisi.

   Ölçülen durum: aynı kural ortak havuz ucunda (routes/assets.ts
   "/api/assets/common") uygulanıyordu ama MÜŞTERİ havuzunda (clientAssets)
   uygulanmıyordu; ve varlık silme taraması (presets.ts scanUsages) dört yere
   bakıp brief_files'a bakmadığı için silme, brief tamlığını AUDIT'SİZ
   geriletiyordu (FK ON DELETE CASCADE).

   Kurulum brief ROTASINDAN değil DOĞRUDAN INSERT'le yapılır: burada sınanan
   şey yükleme akışı değil, brief_files'ta satırı OLAN bir asset'in iki
   yüzeyde nasıl davrandığıdır — sharp/multipart bağımlılığı bu iddia için
   gereksiz (brief-files.test.ts o akışı zaten kapsıyor). */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { db, migrate } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");

let app: FastifyInstance;
let clientId: string;
let galeriAssetId: string;
let briefAssetId: string;
let ortakBriefAssetId: string;
let briefId: string;

/** Müşteri sayfasının gördüğü varlık id'leri (clientAssets çıktısı) */
const galeriIdleri = async (): Promise<string[]> => {
  const res = await app.inject({ method: "GET", url: `/api/clients/${clientId}` });
  return (res.json() as { assets: Array<{ id: string }> }).assets.map((a) => a.id);
};

const asset = (id: string, clientRef: string | null, filename: string): void => {
  db.prepare(
    `INSERT INTO assets (id, client_id, kind, filename, width_px, height_px, tags, created_at)
     VALUES (?, ?, 'photo', ?, 100, 100, '', ?)`
  ).run(id, clientRef, filename, nowISO());
};

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Sızıntı Testi', 'sizinti-testi', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  galeriAssetId = newId("ast");
  briefAssetId = newId("ast");
  ortakBriefAssetId = newId("ast");
  asset(galeriAssetId, clientId, "galeri.jpg");
  asset(briefAssetId, clientId, "brief-musteri.png"); /* müşteriye BAĞLI brief dosyası */
  asset(ortakBriefAssetId, null, "brief-ortak.png"); /* müşterisiz brief dosyası */

  briefId = newId("brf");
  db.prepare(
    `INSERT INTO briefs (id, source_system, customer_ref, request_type, idempotency_key,
                         status, created_at, updated_at)
     VALUES (?, 'test', ?, 'menu', ?, 'DRAFT', ?, ?)`
  ).run(briefId, clientId, `idem-${briefId}`, nowISO(), nowISO());

  const briefFile = (assetId: string, role: string): void => {
    db.prepare(
      `INSERT INTO brief_files (id, brief_id, asset_id, role, version, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 'valid', ?, ?)`
    ).run(newId("bf"), briefId, assetId, role, nowISO(), nowISO());
  };
  briefFile(briefAssetId, "logo");
  briefFile(ortakBriefAssetId, "tasarim");
});

describe("clientAssets — brief üretim girdisi müşteri galerisine SIZMAZ (6.3/440)", () => {
  it("brief dosyaları listede YOK, sıradan galeri varlığı VAR", async () => {
    /* Eski hâlde ÜÇÜ de dönüyordu: brief-files asset'i brief.customer_ref ile
       yazdığı için müşteri havuzuna, müşterisiz olan da ortak havuz dalına
       düşüyordu. Üstelik brief yüklemesi thumb ÜRETMEZ → galeride kırık görsel. */
    const idler = await galeriIdleri();
    expect(idler).toContain(galeriAssetId);
    expect(idler).not.toContain(briefAssetId);
    expect(idler).not.toContain(ortakBriefAssetId);
  });

  it("REGRESYON NÖBETÇİSİ: brief_files satırı kalkınca varlık yine görünür", async () => {
    /* Filtrenin kapsamı DAR olmalı: yalnız brief'e bağlı olanı eler. Bu test,
       "brief_files boş olduğu sürece sonuç birebir eskisi" iddiasının icrası —
       filtre fazla eleseydi burada patlardı. */
    db.prepare("DELETE FROM brief_files WHERE asset_id = ?").run(ortakBriefAssetId);
    const idler = await galeriIdleri();
    expect(idler).toContain(ortakBriefAssetId);
    /* müşteriye bağlı brief dosyası HÂLÂ elenir (bağı duruyor) */
    expect(idler).not.toContain(briefAssetId);
  });
});

describe("scanUsages — brief'te kullanılan varlık SESSİZCE silinemez (4.7/354)", () => {
  it("brief dosyası olan asset silme 409 döner ve kullanım listesinde görünür", async () => {
    /* Eski hâlde 200 dönerdi: FK CASCADE brief_files satırını siler, brief
       tamlığı file_invalidated audit'i YAZILMADAN gerilerdi (izsiz gerileme). */
    const res = await app.inject({ method: "DELETE", url: `/api/assets/${briefAssetId}` });
    expect(res.statusCode).toBe(409);
    const govde = res.json() as { usages: Array<{ where: string; label: string }> };
    const brief = govde.usages.filter((u) => u.where === "brief dosyası");
    expect(brief).toHaveLength(1);
    expect(brief[0].label).toContain("logo v1");
    expect(brief[0].label).toContain(briefId.slice(0, 12));
    /* satır DURUYOR — 409 gerçekten korudu, sessiz silme olmadı */
    const kalan = db
      .prepare("SELECT COUNT(*) AS c FROM brief_files WHERE asset_id = ?")
      .get(briefAssetId) as { c: number };
    expect(kalan.c).toBe(1);
  });

  it("brief bağı OLMAYAN varlık silinebilir (koruma dar, silme yolu kapanmadı)", async () => {
    const res = await app.inject({ method: "DELETE", url: `/api/assets/${galeriAssetId}` });
    expect(res.statusCode).toBe(200);
  });
});
