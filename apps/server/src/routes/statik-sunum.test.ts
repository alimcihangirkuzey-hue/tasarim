/* STATİK DOSYA SUNUMU — MEŞRU YOL ÇALIŞIR, AŞIM REDDEDİLİR (K-1/C).

   NİYE VAR: `@fastify/static` bu turda 8.3.0 → 10.1.3'e çıkarıldı (iki majör
   sürüm). Gerekçe güvenlikti — dördü yüksek, en ağırı CVSS 7.5 "route guard
   bypass via path traversal". Ama bir güvenlik yükseltmesi, sessizce bir
   REGRESYON getirebilir: sunucu ayağa kalkar, testler geçer ve varlıklar
   artık servis edilmez. O yüzden bu dosya İKİ ŞEYİ BİRDEN ölçer ve ikisi de
   şart:

   1. MEŞRU DOSYA GERÇEKTEN SERVİS EDİLİR (üç önek de: assets · exports · fonts).
      Yalnız "aşım reddediliyor" ölçmek, hiçbir şeyi servis etmeyen bozuk bir
      kurulumda da yeşil kalırdı — sahte güvenlik.
   2. YOL AŞIMI REDDEDİLİR (düz, yüzde-kodlu, çift-kodlu, ters bölü).

   ÖLÇÜLEN GERÇEK (yükseltmeden ÖNCE, 8.3.0): düz ve ters-bölü aşımlar 404,
   yüzde-kodlu olanlar 403 — yani temel vektörler zaten kapalıydı ve bizim
   yapılandırmamız (`list` yok, statik öneklerde route guard yok) advisory'nin
   en ağır yollarını AÇMIYORDU. Yükseltme yine de yapıldı: dışarıya verilecek
   bir modül bilinen zafiyetli bağımlılık taşımamalı (K-1 güvenlik şerhi).
   Yükseltmeden SONRA hepsi 404 — davranış sıkılaştı, gevşemedi. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

/* Veri kökü geçici dizine alınır — repo data/ kirlenmez (P3 deseni). */
const TMP = path.join(os.tmpdir(), `tezgah-statik-${process.pid}`);
process.env.TEZGAH_DATA_DIR = TMP;

const { migrate } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { ASSETS_DIR, EXPORTS_DIR, FONTS_DIR } = await import("../paths.js");

let app: FastifyInstance;

/** Her önek için: kök dizin + oraya yazılan gerçek bir dosya. */
const ORNEKLER = [
  { onek: "assets", dir: () => ASSETS_DIR, ad: "ornek-varlik.txt", icerik: "VARLIK" },
  { onek: "exports", dir: () => EXPORTS_DIR, ad: "ornek-cikti.txt", icerik: "CIKTI" },
  { onek: "fonts", dir: () => FONTS_DIR, ad: "ornek-font.txt", icerik: "FONT" },
];

beforeAll(async () => {
  migrate();
  for (const o of ORNEKLER) {
    mkdirSync(o.dir(), { recursive: true });
    writeFileSync(path.join(o.dir(), o.ad), o.icerik);
  }
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await app?.close();
});

describe("meşru statik dosya servis edilir", () => {
  it("ÖN-KOŞUL: veri kökü geçici dizine alındı (repo kirlenmiyor)", () => {
    /* Bu satır olmadan test repo data/'sına yazar ve "temiz ağaç" kuralını
       sessizce çiğnerdi. */
    expect(ASSETS_DIR.startsWith(TMP)).toBe(true);
  });

  for (const o of ORNEKLER) {
    it(`/${o.onek}/ altındaki dosya 200 döner ve İÇERİĞİ doğru`, async () => {
      /* Bu testler olmadan aşağıdaki "aşım reddedilir" iddiası, hiçbir şeyi
         servis etmeyen bozuk bir kurulumda da yeşil kalırdı. */
      const r = await app.inject({ method: "GET", url: `/${o.onek}/${o.ad}` });
      expect(r.statusCode, `${o.onek}: servis edilmiyor`).toBe(200);
      expect(r.body).toBe(o.icerik);
    });
  }

  it("OLMAYAN dosya 404 — sunucu hatası değil", async () => {
    const r = await app.inject({ method: "GET", url: "/assets/yok-boyle-bir-dosya.txt" });
    expect(r.statusCode).toBe(404);
  });
});

describe("yol aşımı reddedilir", () => {
  const ASIMLAR = [
    "../../../../etc/passwd",
    "..%2f..%2f..%2f..%2fetc%2fpasswd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..\\..\\..\\..\\etc\\passwd",
    "....//....//....//etc/passwd",
  ];

  for (const o of ORNEKLER) {
    for (const asim of ASIMLAR) {
      it(`/${o.onek}/ + ${asim.slice(0, 26)}… kök DIŞINA çıkamaz`, async () => {
        const r = await app.inject({ method: "GET", url: `/${o.onek}/${asim}` });
        expect(r.statusCode, `${o.onek}${asim}: 200 döndü`).not.toBe(200);
        expect(r.body).not.toContain("root:");
      });
    }
  }

  it("ÖNEKİN KENDİSİ 404 — dizin içeriği dökülmez", async () => {
    /* SINIRIN DÜRÜST KAYDI: bu bir DAVRANIŞ ÇİVİSİDİR, `list` seçeneğinin
       NÖBETÇİSİ DEĞİLDİR. Negatif kontrolde ölçüldü: `list: true` eklemek
       BİLE v10.1.3'te önek kökünü 200 yapmıyor (hâlâ 404) — yani bu test
       "dizin listesi asla açılamaz" diye bir söz VERMEZ. Söz verdiği tek şey,
       bugünkü 404 davranışının sessizce içerik dökmeye dönüşmemesi. Gerçek
       bir liste kapısı gerekirse ayrı ve farklı bir ölçüm ister. */
    for (const o of ORNEKLER) {
      const r = await app.inject({ method: "GET", url: `/${o.onek}/` });
      expect(r.statusCode, `${o.onek}: önek kökü artık içerik dönüyor`).toBe(404);
    }
  });
});
