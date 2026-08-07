/* GÖRÜNÜRLÜK ≠ YETKİ — SINIRIN UÇ TARAFI ÖLÇÜLDÜ (K-1/C modül sınırı).

   NEREDEN GELDİ: `2026-08-07-gorunurluk-yetki-siniri` paketinin açık bulgusu
   `K1C-YETKI-3`. O tur sınırın iki yarısını da ölçtü ama YALNIZ ARAYÜZ
   GÖVDESİNDE (`topluBaslat`): "köprü açık" iddiası uç için **yalnızca kaynak
   okumasıyla** biliniyordu. Bu dosya onu koşarak ölçer.

   NİYE UÇ AYRI BİR SORU: arayüz gövdesi kiracının kendi ekranıdır; uç,
   modülün DIŞARIYA açık yüzeyidir. "Operatör menüyü göremiyor" ile "bu
   kurulum menü belgesi ÜRETEMEZ" birbirinden bağımsız iki iddiadır ve
   ikincisi ancak uç ölçülürse bilinir. Bugünkü cevap ölçüldü: uç iş koluna
   HİÇ BAKMIYOR — ne kalem yazarken ne belge açarken.

   BU BİR KUSUR RAPORU DEĞİL, BİR KARARIN KAYDI: 7.1/481 "kullanıcı yalnızca
   yaptığı işi görür" der, "yapamaz" demez. Yetki katmanı (entitlement) hiç
   yazılmadı ve yazılıp yazılmayacağı ürün kararıdır — kiralama senaryosunun
   ne istediği sorulmamıştır. Bu dosya o kararı VERMEZ; verildiği gün burası
   kırmızıya döner ve karar açıkça verilmek zorunda kalır.

   ASİMETRİ AYNI DOSYADA ÖLÇÜLÜR: aynı dar kurulumda AÇILIŞ TAKIMI ucu
   daraltılır (kalem üretilemezse 409 ve proje satırı bile yazılmaz —
   `preset-kapsami.test.ts`). Yani sunucu daraltmayı BİLİYOR, sadece bu iki
   uçta UYGULAMIYOR. Sessiz bir eksiklik ile bilinçli bir sınır arasındaki
   fark budur ve ancak ikisi yan yana ölçülürse görünür. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO, ProductTypeSchema } = await import("@tezgah/shared");
const { IS_KOLLARI_ENV } = await import("../is-kollari.js");
const { isKollariIlani } = await import("../is-kollari.js");
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
     VALUES (?, 'Yetki Sinir Test', 'yetki-sinir-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  projectId = newId("prj");
  db.prepare(
    `INSERT INTO projects (id, client_id, name, status, due_date, created_at)
     VALUES (?, ?, 'Sinir Projesi', 'open', NULL, ?)`
  ).run(projectId, clientId, nowISO());
});

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  db.prepare("DELETE FROM order_items WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM documents WHERE project_id = ?").run(projectId);
});

/** Dar kurulumda KAPALI kalan türler — ilandan türetilir, elle yazılmaz. */
function kapaliTurler(): string[] {
  const ilan = isKollariIlani(DAR);
  return ProductTypeSchema.options.filter((t) => {
    const s = siparisSektoru(t);
    return s !== null && !ilan.aktif.includes(s);
  });
}

const kalemSayisi = (): number =>
  (db.prepare("SELECT COUNT(*) AS n FROM order_items WHERE project_id = ?").get(projectId) as {
    n: number;
  }).n;

const belgeSayisi = (): number =>
  (db.prepare("SELECT COUNT(*) AS n FROM documents WHERE project_id = ?").get(projectId) as {
    n: number;
  }).n;

describe("ÖN KOŞUL — dar kurulum GERÇEKTEN daraltıyor", () => {
  it("ilan okunuyor ve hem KAPALI hem AÇIK tür bırakıyor", () => {
    /* Bu satır olmadan aşağıdaki her şey, hiçbir türü kapatmayan bozuk bir
       ilanla da yeşil kalırdı — uç zaten hiçbir şeyi reddetmiyor. */
    const ilan = isKollariIlani(DAR);
    expect(ilan.kaynak).toBe("yapilandirma");
    expect(ilan.aktif).toEqual([DAR]);
    expect(kapaliTurler().length, "hiçbir tür kapanmıyor — ölçüm konusuz").toBeGreaterThan(0);
    expect(
      kapaliTurler().length,
      "her tür kapanıyor — daraltma yetki katmanına dönmüş"
    ).toBeLessThan(ProductTypeSchema.options.length);
  });

  it("KAPALI türlerin köprüsü sağlam — uç ölçümünün konusu var", () => {
    const koprusuz = kapaliTurler().filter((t) => siparisSablonlari(t as never).length === 0);
    expect(koprusuz, "kapalı türün şablonu yok — belge ucu ölçülemez").toEqual([]);
  });
});

describe("UÇ İŞ KOLUNA BAKMIYOR — ölçüldü, çivilendi", () => {
  it("KALEM UCU kapalı iş kolunun türünü KABUL EDER ve satırı YAZAR", async () => {
    process.env[IS_KOLLARI_ENV] = DAR;
    const tur = kapaliTurler()[0]!;

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/items`,
      payload: { product_type: tur, qty: 1 },
    });

    expect(res.statusCode, `${tur}: uç kapalı türü reddetti — yetki katmanı doğmuş`).toBe(201);
    expect(kalemSayisi(), "satır yazılmadı").toBe(1);
    const yazilan = db
      .prepare("SELECT product_type FROM order_items WHERE project_id = ?")
      .get(projectId) as { product_type: string };
    expect(yazilan.product_type).toBe(tur);
  });

  it("BELGE UCU kapalı iş kolunun şablonunu KABUL EDER ve belgeyi YAZAR", async () => {
    process.env[IS_KOLLARI_ENV] = DAR;
    const tur = kapaliTurler()[0]!;
    const templateId = siparisSablonlari(tur as never)[0]!;

    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/documents`,
      payload: { template_id: templateId, project_id: projectId },
    });

    expect(res.statusCode, `${templateId}: uç kapalı kolun şablonunu reddetti`).toBe(201);
    expect(belgeSayisi(), "belge yazılmadı").toBe(1);
    const doc = res.json() as { template_id: string };
    expect(doc.template_id).toBe(templateId);
  });

  it("KAPALI TÜRLERİN HEPSİ aynı yolu izler — tek türe özgü bir kaza değil", async () => {
    /* Bir üstteki iki test tek türle çalışıyor; bu, "yalnız o tür kaçıyor"
       ile "uç iş kolunu hiç okumuyor"u ayırt edemez. Kapalı kümenin tamamı
       koşulur ve tamamı yazılırsa iddia SINIF düzeyindedir. */
    process.env[IS_KOLLARI_ENV] = DAR;
    const turler = kapaliTurler();
    for (const tur of turler) {
      const res = await app.inject({
        method: "POST",
        url: `/api/projects/${projectId}/items`,
        payload: { product_type: tur, qty: 1 },
      });
      expect(res.statusCode, `${tur}: reddedildi`).toBe(201);
    }
    expect(kalemSayisi()).toBe(turler.length);
  });

  it("KARŞIT ÖLÇÜM: aynı uç, aynı çağrı, İLANSIZ kurulumda da AYNI sonuç", async () => {
    /* Yukarıdaki testler, ucun kalemleri hiç yazamadığı bozuk bir kurgu ile
       de "yeşil" kalabilirdi ancak status 201 + satır sayısı bunu zaten
       dışlıyor. Asıl ayrım şu: sonuç ilandan BAĞIMSIZ mı? İlan silinip aynı
       çağrı koşulur ve aynı sonuç alınırsa, ucun ilanı hiç okumadığı
       ölçülmüş olur — "bugün tesadüfen geçiyor" değil. */
    const tur = kapaliTurler()[0]!;

    delete process.env[IS_KOLLARI_ENV];
    const ilansiz = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/items`,
      payload: { product_type: tur, qty: 1 },
    });
    expect(ilansiz.statusCode).toBe(201);
    const ilansizSayi = kalemSayisi();

    db.prepare("DELETE FROM order_items WHERE project_id = ?").run(projectId);
    process.env[IS_KOLLARI_ENV] = DAR;
    const dar = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/items`,
      payload: { product_type: tur, qty: 1 },
    });
    expect(dar.statusCode, "dar kurulumda sonuç DEĞİŞTİ — uç ilanı okuyor").toBe(
      ilansiz.statusCode
    );
    expect(kalemSayisi()).toBe(ilansizSayi);
  });
});

describe("ASİMETRİ — aynı sunucu, aynı ilan, BAŞKA uçta daraltma VAR", () => {
  it("AÇILIŞ TAKIMI ucu dar kurulumda 409 döner ve proje satırı bile YAZMAZ", async () => {
    /* Sessiz eksiklik ile bilinçli sınır arasındaki farkın kanıtı: sunucu
       daraltmayı BİLİYOR (aynı ilan, aynı süreç) — yalnız yukarıdaki iki
       uçta UYGULAMIYOR. Bu satır olmadan "uç iş kolunu hiç okumuyor" cümlesi
       "sunucuda daraltma diye bir şey yok"tan ayırt edilemezdi. */
    process.env[IS_KOLLARI_ENV] = DAR;
    const onceki = (
      db.prepare("SELECT COUNT(*) AS n FROM projects WHERE client_id = ?").get(clientId) as {
        n: number;
      }
    ).n;

    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/presets/opening`,
      payload: {},
    });

    expect(res.statusCode, "preset ucu dar kurulumda daraltmıyor").toBe(409);
    const sonraki = (
      db.prepare("SELECT COUNT(*) AS n FROM projects WHERE client_id = ?").get(clientId) as {
        n: number;
      }
    ).n;
    expect(sonraki, "reddedilen preset yine de proje satırı bıraktı").toBe(onceki);
  });
});
