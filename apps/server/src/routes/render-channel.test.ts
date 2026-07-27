/* /render KANAL BEKÇİSİ testleri (7.2/8.5 + 7.2/507, 9.6/703; journal
   2026-07-26-render-kanal-bekcisi ve 2026-07-26-entegrasyon-siniri-karari)
   — önizleme-türleri keşfinin borcu kapanır: İMZALI istemci bile profil ilanının
   dışına çıkamaz. Bekçi browser'dan ÖNCE fırlar → puppeteer'siz inject-testli;
   geçiş (happy-path) yolu browser ister ve BURADA test edilmez (exports-channel
   .test.ts ile aynı bilinçli kapsam sınırı). Kontrat pinleri (503/401/404)
   bekçinin İSTEK ŞEMASINI ve imza akışını değiştirmediğinin kanıtıdır →
   RENDER_CONTRACT_V=1 korunur.

   ENTEGRASYON SINIRI TURU (2026-07-26): eski "kayıtsız id null → GEÇER" düşme
   deseni MAKİNE ucunda kaldırıldı — o desen atölye içindi (exports.ts'te AYNEN
   duruyor), dış istemci ilan denetiminden geçmemiş profile üretim yaptıramaz.
   Kayıtsız-id yolu artık browser'a İNMEDİĞİ için ilk kez inject-testlenebilir.

   DENETİM İZİ KATMANI (ADR-008, migration v14): her kapı testi artık YANIT'ın
   yanında YAN ETKİYİ de çivileyir — integration_events'e satır yazıldı mı,
   yazıldıysa hangi alanlarla. Kritik iddia SIRAYA dairdir: 503 ve 401
   dallarında satır YAZILMAZ (imzasız istemci DB'ye satır yazdıramaz —
   gürültü/DoS yüzeyi açılmaz), 404/400 dallarında YAZILIR (imza doğrulandı,
   istemci bilinen taraf; red de kayda değer bir olaydır). Bu testler olmadan
   "kayıt imza kapısının arkasındadır" kuralı yorum satırından ibaret kalırdı. */

process.env.TEZGAH_DB_PATH = ":memory:";
process.env.RENDER_CONTRACT_SECRET = "test-secret";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");
const { DIS_KANALLAR } = await import("@tezgah/templates/identity");
const { RENDER_CONTRACT_V, RenderRequestV1Schema, signRender } = await import(
  "../render-contract.js"
);

let app: FastifyInstance;
let garmentDocId: string;
let fabrikaDocId: string;
let clientId: string;
/** Okuma ucu için ayrı belge: izleri DOĞRUDAN INSERT'le kurulur (kapı
    testlerinin yazdıklarıyla karışmasın, sıra iddiası deterministik olsun) */
let izDocId: string;

/** Gövde şema-parse edilir ki imza KANONİK (default'lu) değerler üzerinden
    atılsın — rota da aynı parse'ı yapar (watermark=false, target="pdf"). */
const imzali = (body: Record<string, unknown>) => {
  const parsed = RenderRequestV1Schema.parse(body);
  return app.inject({
    method: "POST",
    url: "/render",
    payload: parsed,
    headers: { "x-render-signature": signRender(parsed, "test-secret") },
  });
};

type IzSatiri = Record<string, unknown>;

/** Denetim izi satır sayısı — "yazıldı mı / yazılmadı mı" iddialarının ölçüsü */
const izSayisi = (): number =>
  (db.prepare("SELECT COUNT(*) AS c FROM integration_events").get() as { c: number }).c;

/** EN SON yazılan satır. rowid'ye göre okunur, created_at'e göre DEĞİL: nowISO
    milisaniye çözünürlüğündedir ve aynı test içinde iki kayıt eşitlenebilir;
    rowid ekleme sırası hakkında yalan söylemez. */
const sonIz = (): IzSatiri =>
  db.prepare("SELECT * FROM integration_events ORDER BY rowid DESC LIMIT 1").get() as IzSatiri;

/** payload_json → nesne (izin gövdesini alan alan doğrulamak için) */
const izPayload = (satir: IzSatiri): Record<string, unknown> =>
  JSON.parse((satir.payload_json as string) ?? "{}") as Record<string, unknown>;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Render Kanal', 'render-kanal', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());

  const olustur = async (template_id: string): Promise<string> => {
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/documents`,
      payload: { template_id },
    });
    return (res.json() as { id: string }).id;
  };
  garmentDocId = await olustur("garment");
  /* KAYITSIZ PROFİL kurulumu — BELGE ROTASI kullanıldı (doğrudan INSERT
     gerekmedi): belge ucu template_id'yi serbest dize olarak kabul eder
     (DocumentCreateSchema z.string) ve "kabul-fabrika" TEMPLATES kayıt
     defterinde VAR ama identity kaydında YOK (generated/ bilinçli kapsam
     dışı, C-P2 kaydı) — tam da bekçinin ayırt etmesi gereken vaka. Gerçek
     uç üzerinden kurmak, deliğin üretim yolunda ulaşılabilir olduğunu da
     kanıtlar (elle INSERT bunu kanıtlamazdı). */
  fabrikaDocId = await olustur("kabul-fabrika");
  izDocId = await olustur("garment");
});

describe("POST /render — kanal bekçisi (makine kanalı da ilana tabidir)", () => {
  it("İMZALI garment+print REDDEDİLİR: tekstil pdf kanalı ilan etmez", async () => {
    /* Eski hâlde bu istek browser'a iner ve anlamlı olmayan bir 'üretim'
       PDF'i dönerdi; stateless şim uç kayıt yazmadığından iz yalnız yanıt
       meta'sındaydı — bekçi bu sessiz sapmayı kapatır.
       BEKLENTİ GÜNCELLENDİ (2026-07-26, journal 2026-07-26-entegrasyon-siniri-
       karari): yanıt artık disa_acik TAŞIR. Gerekçe M8 dürüstlüğüdür — yalnız
       declared:["png","broderie"] bildirmek dış istemciye YANLIŞ sınır
       veriyordu ("demek ki png isteyebilirim"), oysa ikisi de dış kanal DEĞİL;
       contract enum'u print|preview taşır ve garment'ın o kümeyle kesişimi
       BOŞTUR. declared ham profil ilanı olarak kalır (tanı), disa_acik
       istemcinin gerçekten isteyebileceğini söyler. */
    const once = izSayisi();
    const res = await imzali({ doc: garmentDocId, variant: "print" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["print"], declared: ["png", "broderie"], disa_acik: [] },
    });
    /* DENETİM İZİ: red de bir OLAYDIR — imzalı istemcinin ilan dışına çıkma
       denemesi kalıcı kayda geçer (yanıt uçar, iz kalır). */
    expect(izSayisi()).toBe(once + 1);
    const iz = sonIz();
    expect(iz).toMatchObject({
      channel: "render",
      contract_v: RENDER_CONTRACT_V,
      outcome: "reddedildi",
      http_status: 400,
      error_code: "channel_not_declared",
      document_id: garmentDocId,
      template_id: "garment",
      variant: "print",
      sha256: null,
      filepath: null,
    });
    /* Yanıtta istemciye BİLDİRİLEN sınır, izde de AYNEN durur */
    expect(izPayload(iz)).toEqual({ declared: ["png", "broderie"], disa_acik: [] });
  });

  it("İMZALI garment+preview de REDDEDİLİR: preview de ilan dışıdır", async () => {
    const once = izSayisi();
    const res = await imzali({ doc: garmentDocId, variant: "preview" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["preview"], declared: ["png", "broderie"], disa_acik: [] },
    });
    expect(izSayisi()).toBe(once + 1);
    /* variant izde AYRIŞIR: aynı belge/aynı hata kodu, farklı istek —
       "hangi kanal istendi" sorusu tek satırdan yanıtlanır */
    expect(sonIz()).toMatchObject({
      outcome: "reddedildi",
      http_status: 400,
      error_code: "channel_not_declared",
      document_id: garmentDocId,
      variant: "preview",
    });
  });

  it("İMZALI ama KAYITSIZ PROFİL REDDEDİLİR: fabrika belgesi makine kanalına giremez", async () => {
    /* kabul-fabrika print/preview İLAN EDİYOR (generated manifest) — yani
       reddin sebebi kanal değil, PROFİLİN İLAN DENETİMİNDEN GEÇMEMİŞ olması
       (identity kaydı fabrikayı kapsam dışı bırakır). Eski hâlde null→GEÇER
       deseni bu belgeyi browser'a indiriyordu: dış istemci, kimsenin ilan
       incelemesinden geçirmediği bir profile imzalı üretim yaptırabiliyordu.
       ASİMETRİ ŞERHİ: atölye ucu (exports.ts) bu belgeyi HÂLÂ export eder —
       orada operatör sorumludur; sıkılaşan yalnız dış sözleşmeli uçtur. */
    const once = izSayisi();
    const res = await imzali({ doc: fabrikaDocId, variant: "print" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "profile_not_registered",
      detail: { template_id: "kabul-fabrika" },
    });
    /* İZİN ASIL DEĞERİ BURADA: ilan denetiminden geçmemiş bir profile üretim
       istenmesi, yönetişimin görmesi gereken bir olaydır — template_id kayda
       girer, "hangi kayıtsız profil dışarıdan zorlandı" sayılabilir olur. */
    expect(izSayisi()).toBe(once + 1);
    expect(sonIz()).toMatchObject({
      channel: "render",
      contract_v: RENDER_CONTRACT_V,
      outcome: "reddedildi",
      http_status: 400,
      error_code: "profile_not_registered",
      document_id: fabrikaDocId,
      template_id: "kabul-fabrika",
      variant: "print",
    });
  });

  it("kayıtsız profil reddi VARYANTTAN BAĞIMSIZ: preview de aynı kapıya takılır", async () => {
    const once = izSayisi();
    const res = await imzali({ doc: fabrikaDocId, variant: "preview" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "profile_not_registered" });
    expect(izSayisi()).toBe(once + 1);
    expect(sonIz()).toMatchObject({
      error_code: "profile_not_registered",
      http_status: 400,
      template_id: "kabul-fabrika",
      variant: "preview",
    });
  });

  it("PİN — imzasız istek 401 KALIR: bekçi imza kapısının ARKASINDADIR", async () => {
    const once = izSayisi();
    const body = RenderRequestV1Schema.parse({ doc: garmentDocId, variant: "print" });
    const res = await app.inject({ method: "POST", url: "/render", payload: body });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "invalid_signature" });
    /* KAYIT YOK — kural budur: imzasız istemci DB'ye satır YAZDIRAMAZ. Aksi
       hâlde denetim tablosu kimliksiz bir gürültü/DoS yüzeyi olurdu (tek
       anonim istek = tek kalıcı satır) ve iz, tam da güvenilmesi gereken
       yerde güvenilmez hâle gelirdi. */
    expect(
      izSayisi(),
      "imzasız istek denetim tablosuna satır yazdırdı — kayıt imza kapısının ARKASINDA kalmalı"
    ).toBe(once);
  });

  it("PİN — secret'siz 503 KALIR: kapalı duruş bekçiden önce kazanır", async () => {
    /* Rota secret'ı İSTEK ANINDA okur → geçici unset güvenli, finally geri koyar */
    delete process.env.RENDER_CONTRACT_SECRET;
    const once = izSayisi();
    try {
      const res = await imzali({ doc: garmentDocId, variant: "print" });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ error: "contract_disabled" });
      /* KAYIT YOK — kapı KAPALIYKEN sözleşme yoktur: "v1 ile şu istendi" diye
         kaydedilecek bir olay da yoktur, DB'ye hiç dokunulmaz. */
      expect(
        izSayisi(),
        "kapı kapalıyken DB'ye yazıldı — 503 dalı denetim tablosuna dokunmamalı"
      ).toBe(once);
    } finally {
      process.env.RENDER_CONTRACT_SECRET = "test-secret";
    }
  });

  it("PİN — imzalı ama YOK belge 404 KALIR: belge kapısı bekçiden önce", async () => {
    const once = izSayisi();
    const res = await imzali({ doc: "doc_yok", variant: "print" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "document_not_found" });
    /* YAZILIR ama document_id NULL: belge yoktur, var olmayan satıra FK bağı
       kurmak izi yalanlardı. İstenen id payload'da yaşar — denetim sorusu
       ("hangi id istendi de bulunamadı") yine de yanıtlanabilir. */
    expect(izSayisi()).toBe(once + 1);
    const iz = sonIz();
    expect(iz).toMatchObject({
      outcome: "reddedildi",
      http_status: 404,
      error_code: "document_not_found",
      document_id: null,
      template_id: null,
    });
    expect(izPayload(iz)).toMatchObject({ istenen_doc: "doc_yok" });
  });
});

describe("NÖBETÇİ — DIS_KANALLAR ≡ Render Contract v1 variant enum", () => {
  /* DENETİM İZİ İSTİSNASI (şerh): bu blok İSTEK ATMAZ — iki sabit kümeyi
     karşılaştıran saf bir nöbetçidir; geçmediği bir kapı yoktur, dolayısıyla
     "satır yazıldı/yazılmadı" iddiası buraya ANLAMSIZ olurdu. Kapı testlerinin
     tamamı (503/401/404/400) izi çiviler; burada yokluğu kapsam sınırıdır. */
  it("dış-kanal ilanı ile contract enum'u ES-KÜMEDİR (iki kaynak sürüklenemez)", () => {
    /* Bekçinin anlamı bu eşitliğe dayanır: disaAcikKanallar() ilanla enum'un
       KESİŞİMİNİ döndürür — kümeler ayrışırsa kesişim sessizce daralır/genişler
       ve dış istemciye bildirilen sınır ile gerçekte kabul edilen küme birbirini
       tutmaz. Bu yüzden ayrışma DERLEMEYLE değil, YÜKSEK SESLE burada yakalanır:
       enum'a decoupe/png eklemek (kesim ve tekstil çıktılarını imzalı makine
       kanalından istenebilir yapmak) ya da DIS_KANALLAR'ı daraltmak, bu testin
       düzeltilmesiyle geçiştirilecek bir bakım işi DEĞİLDİR. */
    const enumKanallari = [...RenderRequestV1Schema.shape.variant.options].sort();
    const ilanEdilen = [...DIS_KANALLAR].sort();
    expect(
      ilanEdilen,
      "contract enum ile dış-kanal ilanı ayrıştı: MULTI_REPO kuralınca MAJOR karar, iki tarafta eşzamanlı goal ister"
    ).toEqual(enumKanallari);
  });
});

describe("GET /api/documents/:id/integration-events — denetim izi OKUNABİLİR", () => {
  /* Okunamayan iz denetlenemez: yazılıp hiç okunmayan tablo denetim izi değil,
     ölü depodur. intake_records'un yalnız-yazılır olması EMSAL DEĞİL, kayıtlı
     bir KUSURDUR — bu uç onu tekrarlamamak için vardır. */

  /** created_at'i ELLE verilen satır: DESC sırasını gerçek zamana değil,
      belirlenmiş değerlere karşı doğrularız (nowISO ms çözünürlüğünde
      eşitlenebilir → sıra iddiası kırılgan olurdu). */
  const izEkle = (id: string, docId: string, created_at: string, payload: string): void => {
    db.prepare(
      `INSERT INTO integration_events
         (id, channel, contract_v, outcome, http_status, error_code, document_id, template_id, variant, payload_json, created_at)
       VALUES (?, 'render', 1, 'reddedildi', 400, 'channel_not_declared', ?, 'garment', 'print', ?, ?)`
    ).run(id, docId, payload, created_at);
  };

  it("belgenin kayıtları döner ve sıra created_at DESC'tir (en yeni olay üstte)", async () => {
    izEkle("iev_eski", izDocId, "2026-07-20T10:00:00.000Z", '{"sira":"eski"}');
    izEkle("iev_yeni", izDocId, "2026-07-22T10:00:00.000Z", '{"sira":"yeni"}');
    izEkle("iev_orta", izDocId, "2026-07-21T10:00:00.000Z", '{"sira":"orta"}');

    const res = await app.inject({
      method: "GET",
      url: `/api/documents/${izDocId}/integration-events`,
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.id)).toEqual(["iev_yeni", "iev_orta", "iev_eski"]);
    /* payload_json → payload NESNE olarak çözülür (ham dize sızmaz) */
    expect(rows[0]).toMatchObject({
      channel: "render",
      contract_v: 1,
      outcome: "reddedildi",
      http_status: 400,
      error_code: "channel_not_declared",
      document_id: izDocId,
      template_id: "garment",
      variant: "print",
      payload: { sira: "yeni" },
    });
    expect(typeof (rows[0] as { payload: unknown }).payload).toBe("object");
    /* payload_json ham kolonu DIŞA SIZMAZ (DTO sınırı — exports.ts toDTO emsali) */
    expect(rows[0]).not.toHaveProperty("payload_json");
  });

  it("BAŞKA belgenin izi karışmaz: uç yalnız istenen belgeyi döndürür", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/documents/${garmentDocId}/integration-events`,
    });
    const rows = res.json() as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.document_id).toBe(garmentDocId);
  });

  it("izi olmayan belgede BOŞ DİZİ döner (404 değil — 'olay yok' bir yanıttır)", async () => {
    const temiz = (
      await app.inject({
        method: "POST",
        url: `/api/clients/${clientId}/documents`,
        payload: { template_id: "garment" },
      })
    ).json() as { id: string };
    const res = await app.inject({
      method: "GET",
      url: `/api/documents/${temiz.id}/integration-events`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
