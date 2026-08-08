/* YAZMA YOLU ENVANTERİ MEKANİKLEŞTİ + ADLANDIRDIĞI BOŞLUKLAR ÖLÇÜLDÜ (K-1/C).

   NEREDEN GELDİ: `2026-08-07-yetki-yazma-yollari` paketinin açık bulgusu
   `K1C-YAZMA-3`: "hangi uçların `product_type`/`template_id` yazdığı KAYNAK
   OKUMASIYLA belirlendi, mekanik bir sayımla DEĞİL. Üç paket boyunca liste bir
   kez yanlış çıktı (intake). 'Hepsi bu' iddiasını tutan bir nöbetçi YOK."

   İKİ İŞ BİR ARADA, VE SIRA ÖNEMLİ: önce envanter mekanikleştirildi, SONRA
   onun adlandırdığı boşluklar koşuldu. Tersi olsaydı yine elle bir liste
   yazmış olurdum; bu sefer listeyi tarama üretti ve bana ÜÇ yeni yazma yeri
   söyledi — ikisini elle hiç saymamıştım:

     · `PUT /api/documents/:id`            — `template_id` DEĞİŞTİREBİLİR
     · `POST /api/documents/:id/restore/:exportId` — geri sarma da template_id yazar
     · `POST /api/documents/:id/clone`     — belge klonu (önceki turda "koşulmadı" diye yazılıydı)

   ARACIN SEÇİMİ ÖLÇÜMLE: tarama SQL yazma cümlelerine bakar (`INSERT INTO` /
   `UPDATE` + tablo adı), rota adlarına ya da import'lara DEĞİL. Gerekçe geçen
   turun kendi hatasıdır: "iş kolu ilanını import eden uçlar" diye bir tarama
   `intake.ts`'i KAPSANMIŞ sayıyordu, oysa intake kalem hiç yazmaz. Yazmayı
   ölçmenin doğru yeri yazmanın kendisidir. Bugünkü ölçüm: 4 dosya, 8 yazma
   yeri — gürültüsüz.

   NE İDDİA EDİLMİYOR: bu envanter "kimse başka türlü yazamaz" DEMEZ. Yalnız
   bu iki tablonun SQL yazma yerlerini sayar; ORM/dinamik SQL ya da başka bir
   tablo üzerinden dolaylı etki kapsam dışıdır. Sınır dar ve yazılı. */

process.env.TEZGAH_DB_PATH = ":memory:";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO, ProductTypeSchema } = await import("@tezgah/shared");
const { IS_KOLLARI_ENV, isKollariIlani } = await import("../is-kollari.js");
const { siparisSablonlari, siparisSektoru } = await import("@tezgah/templates/identity");

const BU_DOSYA = fileURLToPath(import.meta.url);
const ROTALAR = path.dirname(BU_DOSYA);

/* İlgilendiğimiz iki tablo: `order_items` ve `documents`. İkisi de aşağıdaki
   sayımlarda ADIYLA geçer — ayrı bir sabit listesi tutmak, envanter tablosuyla
   ikinci bir kaynak yaratırdı (bu depoda kayıtlı çift-kaynak yasağı). */

/** SQL yazma cümlesi — `INSERT INTO <tablo>` ya da `UPDATE <tablo>`. */
function yazmaSayisi(kaynak: string, tablo: string): number {
  const desen = new RegExp(String.raw`(?:INSERT\s+INTO|UPDATE)\s+${tablo}\b`, "g");
  return (kaynak.match(desen) ?? []).length;
}

/**
 * BUGÜNKÜ ENVANTER — ölçülerek yazıldı, elle tahmin edilmedi.
 *
 * `olculdu` alanı, o dosyadaki yazma yerlerinin DAR KURULUM altında koşulup
 * koşulmadığını söyler. Yeni bir yazma yeri doğduğunda sayı tutmaz ve
 * nöbetçi kırmızıya döner — o gün "bu yol da iş koluna bakmıyor mu" sorusu
 * kendiliğinden gündeme gelir.
 */
const ENVANTER: Array<{ dosya: string; order_items: number; documents: number; not: string }> = [
  {
    dosya: "orders.ts",
    order_items: 2,
    documents: 0,
    not: "kalem yaratma + kalem güncelleme — ikisi de ölçüldü (yetki-ucu · yetki-yazma-yollari)",
  },
  {
    dosya: "documents.ts",
    order_items: 0,
    documents: 3,
    not: "belge açma (ölçüldü) + PUT şablon değiştirme + restore — son ikisi BU pakette ölçüldü",
  },
  {
    dosya: "presets.ts",
    order_items: 1,
    documents: 0,
    not: "açılış takımı — TEK DARALTAN yol (409 + proje satırı bile yazılmaz)",
  },
  {
    dosya: "clone.ts",
    order_items: 0,
    documents: 2,
    not: "müşteri klonu (ölçüldü) + belge klonu — ikincisi BU pakette ölçüldü",
  },
];

let app: FastifyInstance;
let clientId: string;
let projectId: string;

const DAR = "tabelaci";

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Envanter Test', 'envanter-test', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  projectId = newId("prj");
  db.prepare(
    `INSERT INTO projects (id, client_id, name, status, due_date, created_at)
     VALUES (?, ?, 'Envanter Projesi', 'open', NULL, ?)`
  ).run(projectId, clientId, nowISO());
});

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  db.prepare("DELETE FROM documents WHERE project_id = ?").run(projectId);
});

function kapaliTurler(): string[] {
  const ilan = isKollariIlani(DAR);
  return ProductTypeSchema.options.filter((t) => {
    const s = siparisSektoru(t);
    return s !== null && !ilan.aktif.includes(s);
  });
}

/** Dar kurulumda AÇIK kalan tasarlanabilir türün şablonu. */
function acikSablon(): string {
  const ilan = isKollariIlani(DAR);
  const t = ProductTypeSchema.options.find((x) => {
    const s = siparisSektoru(x);
    return s !== null && ilan.aktif.includes(s) && siparisSablonlari(x as never).length > 0;
  });
  if (!t) throw new Error("dar kurulumda açık tasarlanabilir tür yok");
  return siparisSablonlari(t as never)[0]!;
}

/** Kapalı iş kolunun şablonu. */
function kapaliSablon(): string {
  return siparisSablonlari(kapaliTurler()[0]! as never)[0]!;
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

describe("ENVANTER MEKANİK — 'hepsi bu' artık bir tarama", () => {
  it("ön koşul: tarama GERÇEKTEN yazma buluyor (konusuz değil)", () => {
    /* Bu satır olmadan aşağıdaki eşitlik, hiçbir şeye uymayan bozuk bir
       desenle de doğru çıkardı — sıfır = sıfır. */
    const toplam = ENVANTER.reduce((n, e) => n + e.order_items + e.documents, 0);
    expect(toplam, "envanter tablosu boş — ölçüm konusuz").toBeGreaterThan(5);
  });

  it("TARANAN yazma yerleri İLAN EDİLEN envanterle BİREBİR", () => {
    const bulunan = new Map<string, { order_items: number; documents: number }>();
    for (const ad of fs.readdirSync(ROTALAR)) {
      if (!/\.ts$/.test(ad) || /\.test\.ts$/.test(ad)) continue;
      const kaynak = fs.readFileSync(path.join(ROTALAR, ad), "utf8");
      const sayim = {
        order_items: yazmaSayisi(kaynak, "order_items"),
        documents: yazmaSayisi(kaynak, "documents"),
      };
      if (sayim.order_items + sayim.documents > 0) bulunan.set(ad, sayim);
    }

    const ilan = new Map(ENVANTER.map((e) => [e.dosya, { order_items: e.order_items, documents: e.documents }]));
    expect(
      [...bulunan.keys()].sort(),
      "yeni bir yazma yolu doğdu ya da biri kayboldu — envanteri güncelleyin ve dar kurulumda KOŞUN"
    ).toEqual([...ilan.keys()].sort());
    for (const [ad, sayim] of bulunan) {
      expect(sayim, `${ad}: yazma yeri sayısı değişti`).toEqual(ilan.get(ad));
    }
  });

  it("DESEN AYIRT EDİCİ: yazmayan dosyayı yazan saymıyor", () => {
    /* Pozitif kontrolün ikinci yarısı: desen her şeye uysaydı yukarıdaki
       eşitlik yine tutabilirdi (her dosya listeye girerdi). `intake.ts`
       ilanı OKUR ama kalem YAZMAZ — geçen turun ölçüm aracı kör noktası
       tam buradaydı ve artık mekanik olarak ayrılıyor. */
    const intake = fs.readFileSync(path.join(ROTALAR, "intake.ts"), "utf8");
    expect(yazmaSayisi(intake, "order_items")).toBe(0);
    expect(yazmaSayisi(intake, "documents")).toBe(0);
    expect(intake, "ön koşul: intake ilanı gerçekten import ediyor").toMatch(/isKollariIlani/);
  });
});

describe("ENVANTERİN ADLANDIRDIĞI BOŞLUKLAR — üçü de koşuldu", () => {
  it("PUT belgeyi kapalı iş kolunun ŞABLONUNA çevirir ve diske YAZAR", async () => {
    /* Elle hiç saymadığım yol. Editördeki "şablon değiştir" buradan geçer:
       açık bir şablonla doğmuş belge, dar kurulumda kapalı bir kola
       taşınabiliyor. */
    const docId = belgeYaz(acikSablon());
    process.env[IS_KOLLARI_ENV] = DAR;
    const hedef = kapaliSablon();

    const res = await app.inject({
      method: "PUT",
      url: `/api/documents/${docId}`,
      payload: { template_id: hedef, params: {} },
    });

    expect(res.statusCode, `${hedef}: PUT reddedildi — yetki katmanı doğmuş`).toBe(200);
    const satir = db.prepare("SELECT template_id FROM documents WHERE id = ?").get(docId) as {
      template_id: string;
    };
    expect(satir.template_id, "şablon diske yazılmadı").toBe(hedef);
  });

  it("RESTORE kapalı iş kolunun şablonunu GERİ SARAR", async () => {
    /* İkinci elle-sayılmamış yol: geri sarma da `template_id` yazar. Kapalı
       kolun şablonuyla alınmış eski bir sürüm dar kurulumda geri gelebilir. */
    const kapali = kapaliSablon();
    const docId = belgeYaz(kapali);
    const exportId = newId("exp");
    db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
       VALUES (?, ?, NULL, 'snapshot', '', ?, 1, ?)`
    ).run(
      exportId,
      docId,
      JSON.stringify({ state: { template_id: kapali, params: {}, theme_id: "brand", selection: {}, overrides: {} } }),
      nowISO()
    );
    /* Belge açık bir şablona alınır ki geri sarmanın GERÇEKTEN yazdığı
       görülebilsin — yoksa "değişmedi" ile "geri sardı" ayırt edilemezdi. */
    db.prepare("UPDATE documents SET template_id = ? WHERE id = ?").run(acikSablon(), docId);
    process.env[IS_KOLLARI_ENV] = DAR;

    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${docId}/restore/${exportId}`,
      payload: {},
    });

    expect(res.statusCode, "restore reddedildi").toBe(200);
    const satir = db.prepare("SELECT template_id FROM documents WHERE id = ?").get(docId) as {
      template_id: string;
    };
    expect(satir.template_id, "geri sarma yazmadı").toBe(kapali);
  });

  it("BELGE KLONU kapalı iş kolunun belgesini ÇOĞALTIR", async () => {
    /* Önceki turda "koşulmadı" diye yazılan yol. Müşteri klonundan farkı
       ölçeği değil kapsamı: tek belge, ama aynı soru. */
    const kapali = kapaliSablon();
    const docId = belgeYaz(kapali);
    process.env[IS_KOLLARI_ENV] = DAR;

    const res = await app.inject({
      method: "POST",
      url: `/api/documents/${docId}/clone`,
      payload: {},
    });

    expect(res.statusCode, "belge klonu reddedildi").toBe(201);
    const sayi = (
      db
        .prepare("SELECT COUNT(*) AS n FROM documents WHERE project_id = ? AND template_id = ?")
        .get(projectId, kapali) as { n: number }
    ).n;
    expect(sayi, "klon yazılmadı").toBe(2);
  });
});
