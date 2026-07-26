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
   Kayıtsız-id yolu artık browser'a İNMEDİĞİ için ilk kez inject-testlenebilir. */

process.env.TEZGAH_DB_PATH = ":memory:";
process.env.RENDER_CONTRACT_SECRET = "test-secret";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");
const { DIS_KANALLAR } = await import("@tezgah/templates/identity");
const { RenderRequestV1Schema, signRender } = await import("../render-contract.js");

let app: FastifyInstance;
let garmentDocId: string;
let fabrikaDocId: string;

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

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  const clientId = newId("cli");
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
    const res = await imzali({ doc: garmentDocId, variant: "print" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["print"], declared: ["png", "broderie"], disa_acik: [] },
    });
  });

  it("İMZALI garment+preview de REDDEDİLİR: preview de ilan dışıdır", async () => {
    const res = await imzali({ doc: garmentDocId, variant: "preview" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "channel_not_declared",
      detail: { requested: ["preview"], declared: ["png", "broderie"], disa_acik: [] },
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
    const res = await imzali({ doc: fabrikaDocId, variant: "print" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "profile_not_registered",
      detail: { template_id: "kabul-fabrika" },
    });
  });

  it("kayıtsız profil reddi VARYANTTAN BAĞIMSIZ: preview de aynı kapıya takılır", async () => {
    const res = await imzali({ doc: fabrikaDocId, variant: "preview" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "profile_not_registered" });
  });

  it("PİN — imzasız istek 401 KALIR: bekçi imza kapısının ARKASINDADIR", async () => {
    const body = RenderRequestV1Schema.parse({ doc: garmentDocId, variant: "print" });
    const res = await app.inject({ method: "POST", url: "/render", payload: body });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "invalid_signature" });
  });

  it("PİN — secret'siz 503 KALIR: kapalı duruş bekçiden önce kazanır", async () => {
    /* Rota secret'ı İSTEK ANINDA okur → geçici unset güvenli, finally geri koyar */
    delete process.env.RENDER_CONTRACT_SECRET;
    try {
      const res = await imzali({ doc: garmentDocId, variant: "print" });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ error: "contract_disabled" });
    } finally {
      process.env.RENDER_CONTRACT_SECRET = "test-secret";
    }
  });

  it("PİN — imzalı ama YOK belge 404 KALIR: belge kapısı bekçiden önce", async () => {
    const res = await imzali({ doc: "doc_yok", variant: "print" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "document_not_found" });
  });
});

describe("NÖBETÇİ — DIS_KANALLAR ≡ Render Contract v1 variant enum", () => {
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
