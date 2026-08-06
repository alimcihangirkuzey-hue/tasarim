/* KURULUM KÜNYESİ UCU + TEK KOPYA NÖBETÇİSİ (K-1/C modül sınırı).

   Birim davranışı ../kurulum-kunyesi.test.ts'te ölçülür. Bu dosya iki ayrı
   şeyi ölçer:
   1. UÇ gerçekten ilanı döndürüyor mu (kurulum ortamıyla birlikte).
   2. Basılı künye dizesi ARTIK TEK KOPYA mı — nöbetçi. Paketin bütün değeri
      "kiracı kendi adını basabilsin"dir; yarın biri altbilgiye dizeyi yeniden
      elle gömerse kiracı kurulumunda o yüzey sessizce SATICININ adını basmaya
      döner ve bunu ancak basılmış kâğıtta görürsünüz. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { buildApp } = await import("../app.js");
const { migrate } = await import("../db.js");
const { KUNYE_ENV, VARSAYILAN_KUNYE } = await import("../kurulum-kunyesi.js");

const SERVER_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_SRC = path.resolve(SERVER_SRC, "../../web/src");
/** İlanın kendisi — künyenin YAŞAMASI GEREKEN tek yer. */
const ILAN = path.join(SERVER_SRC, "kurulum-kunyesi.ts");

let app: FastifyInstance;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(() => {
  delete process.env[KUNYE_ENV];
});

function kaynaklar(dizin: string): string[] {
  const cikti: string[] = [];
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) cikti.push(...kaynaklar(tam));
    else if (/\.tsx?$/.test(g.name) && !g.name.includes(".test.")) cikti.push(tam);
  }
  return cikti;
}

describe("kurulum künyesi ucu", () => {
  it("YAPILANDIRMA YOKKEN uç bugünkü künyeyi döndürür", async () => {
    delete process.env[KUNYE_ENV];
    const res = await app.inject({ method: "GET", url: "/api/kurulum-kunyesi" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ kunye: VARSAYILAN_KUNYE, kaynak: "varsayilan" });
  });

  it("KİRACI YAPILANDIRMASI uçtan okunur (env donmuş değil)", async () => {
    /* app.ready() yapılandırma YOKKEN koştu; uç yine de yeni değeri görmeli —
       görmezse kiralanan kurulumda künye ancak yeniden başlatmayla değişirdi. */
    process.env[KUNYE_ENV] = "Kuzey Ozalit — Reklam";
    const res = await app.inject({ method: "GET", url: "/api/kurulum-kunyesi" });
    expect(res.json()).toEqual({ kunye: "Kuzey Ozalit — Reklam", kaynak: "yapilandirma" });
  });
});

describe("basılı künye TEK KOPYA", () => {
  const dosyalar = [...kaynaklar(SERVER_SRC), ...kaynaklar(WEB_SRC)];

  it("NÖBETÇİNİN KENDİSİ çalışıyor (ön-koşul: ilan tarandı ve dizeyi taşıyor)", () => {
    /* Tarama ilan dosyasını hiç görmezse aşağıdaki iddia HİÇBİR ŞEY ölçmeden
       yeşil kalırdı — ölçüm aracının kör noktası ölçtüğü kusurdan tehlikelidir. */
    expect(dosyalar).toContain(ILAN);
    expect(readFileSync(ILAN, "utf8")).toContain(VARSAYILAN_KUNYE);
    expect(dosyalar.length).toBeGreaterThan(50);
  });

  it("İLAN DIŞINDA hiçbir üretim dosyası künyeyi elle YAZMAZ", () => {
    const gomenler = dosyalar
      .filter((f) => f !== ILAN)
      .filter((f) => readFileSync(f, "utf8").includes(VARSAYILAN_KUNYE));
    expect(
      gomenler.map((f) => path.relative(path.resolve(SERVER_SRC, "../.."), f)),
      "Künye elle gömülmüş: kiralanan kurulumda bu yüzey kiracının değil " +
        "SATICININ adını basar ve kayıp yalnız basılmış kâğıtta görülür. " +
        "Değeri api.kurulumKunyesi() ucundan okuyun (K-1/C).",
    ).toEqual([]);
  });
});
