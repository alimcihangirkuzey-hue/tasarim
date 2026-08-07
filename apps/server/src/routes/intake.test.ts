/* SİPARİŞ MODU INTAKE — ROTA TESTLERİ (journal 2026-08-07-intake-izi-okuma-mutlu-yol).

   NEDEN VAR: intake.ts 8 adımlı TEK transaction'dır ve bugüne kadar routes/
   altında hiç rota testi taşımadı. Projeksiyon/birleşme mantığı shared'da
   testlidir (intake-merge.test.ts · intake-ux.test.ts) — ama KABLOLAMA
   ölçülmemişti: 201 gövdesinin alanları, iki müşteri yolu (yeni/mevcut), 404
   dalı ve intake.ts:54-58'in ATOMİKLİK VAADİ.

   O vaat şunu diyor: *"yüzeyleri transaction'dan ÖNCE doğrula — bozuksa
   ChecklistSurfacesSchema.parse ZodError fırlatır → setErrorHandler 400'e
   çevirir, transaction HİÇ AÇILMAZ (yeni müşteri/intake_record/katalog
   doğmaz; sessiz yarım kayıt YASAK)."* Bu cümle bir yorum satırıydı; burada
   üç tablonun satır sayısıyla çivilenir.

   KAPSAM ŞERHİ — İLK TASLAKTAKİ İDDİA ÖLÇÜMLE ÇÜRÜTÜLDÜ: bu dosyanın ilk hâli
   "burada kanıtlanan şey transaction'ın AÇILMADIĞIdır" diyordu. Kırmızı-kanıt
   turu bunu yalanladı — kılavuz (extractSurfaces) transaction'ın İÇİNE
   taşındığında 14 testin HEPSİ yeşil kaldı. Sebep: better-sqlite3'ün
   db.transaction() sarmalayıcısı fırlatmada geri sarar, dolayısıyla iki
   mekanizma DIŞARIDAN AYIRT EDİLEMEZ; ikisi de "400 + sıfır satır" üretir.
   Bu testler MEKANİZMAYI değil SONUCU çivilerler — yani ürünün umursadığı
   özelliği: yarım yazılmış durum diske KALMAZ. Doğru okuma budur; "kapı
   transaction'dan önce" bir kod-düzeni tercihidir ve bu testlerin konusu
   değildir. (Ders TODO:243'ün kardeşi: erişilebilir mekanizma ile ölçülen
   davranış ayrı şeylerdir.)

   Kırmızı-kanıt turu bir de hediye verdi: kılavuz içeri alındığında hata adım
   1/4/5/6/7'nin YAZMALARINDAN SONRA fırlıyordu ve tablolar yine boş kaldı —
   yani geri sarma yolu GERÇEKTEN çalışıyor. O yol artık kalıcı bir testle
   ölçülür (aşağıdaki "GERİ SARMA" bloğu, geçici SQLite trigger'ıyla), üretim
   kodu bozulmadan. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { newId, nowISO } = await import("@tezgah/shared");

let app: FastifyInstance;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();
});

/* ── Yardımcılar ──────────────────────────────────────────────────────── */

/** Doğrudan DB'ye müşteri — POST /api/clients'a bağımlı olmadan (bu dosya
    intake ucunu ölçer, müşteri ucunu değil). */
function musteriYaz(name: string, menu_language = "fr"): string {
  const id = newId("cli");
  const t = nowISO();
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, ?, ?, '', 'EUR', ?, '{}', ?, ?, ?)`
  ).run(id, name, `slug-${id}`, menu_language, JSON.stringify({ categories: [] }), t, t);
  return id;
}

/** Satır sayısı; clientId verilirse o müşteriye daraltır. `clients` tablosunda
    müşteri anahtarı `id`, diğerlerinde `client_id` — kolon adı tabloya göre
    seçilir (aksi hâlde "no such column" ile patlar). */
const say = (tablo: string, clientId?: string): number => {
  const kolon = tablo === "clients" ? "id" : "client_id";
  const sql = clientId
    ? `SELECT COUNT(*) AS n FROM ${tablo} WHERE ${kolon} = ?`
    : `SELECT COUNT(*) AS n FROM ${tablo}`;
  const stmt = db.prepare(sql);
  return ((clientId ? stmt.get(clientId) : stmt.get()) as { n: number }).n;
};

const commit = (payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/intake", payload });

const izleriOku = (clientId: string) =>
  app.inject({ method: "GET", url: `/api/clients/${clientId}/intake-records` });

/** Tek ürünlü asgari intake — iki fiyat varyantı ve bir serbest çip. */
const answersTek = () => ({
  items: [
    {
      category_name: "Dönerler",
      name: "Tavuk Döner",
      variants: [{ label: "seul", value: 9.5 }],
      chips: [{ tr: "tavuk", fr: "poulet", de: "Hähnchen" }],
    },
  ],
});

/* ── 1. MUTLU YOL: yeni müşteri ───────────────────────────────────────── */

describe("POST /api/intake — mutlu yol (new_client)", () => {
  it("201 döner; gövdenin sekiz alanı da beklenen; üç tabloya yazar", async () => {
    const res = await commit({
      new_client: { name: "Mutlu Yol Lokantası", currency: "EUR", menu_language: "fr" },
      answers: answersTek(),
      checklist: { surfaces: [] },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;

    /* ALAN ALAN — "201 geldi" yetmez: sonuç ekranı (M8) bu alanları basar,
       biri sessizce kaybolursa operatör ekranı boşalır ve test yeşil kalırdı. */
    expect(body.created_client).toBe(true);
    expect(typeof body.client_id).toBe("string");
    expect(typeof body.intake_id).toBe("string");
    expect(body.applied_categories).toBe(1); // gerçekten YENİ açılan kategori
    expect(body.merged_into_existing).toEqual([]); // boş katalog → birleşme yok
    expect(body.catalog_had_categories).toBe(false); // ŞERH 1 ölçümü
    expect(body.pending).toEqual([]); // fiyat verildi → bekleyen yok
    expect(body.translationGaps).toEqual([]); // üç dil de dolu → boşluk yok
    expect(body.skipped_bumps).toEqual([]); // chip_id yok → atlanan yok
    expect(body.surfaces_saved).toBe(0); // surfaces boş → no-op

    const clientId = body.client_id as string;
    expect(say("clients", clientId)).toBe(1);
    expect(say("intake_records", clientId)).toBe(1);
    expect(say("catalog_history", clientId)).toBe(1); // geri-al güvencesi

    /* Katalog GERÇEKTEN yazıldı (adım 5) — yalnız yanıt değil, disk */
    const row = db.prepare("SELECT catalog_json FROM clients WHERE id = ?").get(clientId) as {
      catalog_json: string;
    };
    /* Katalog kategorisinin adı `name_fr`'dir (CategorySchema) — intake'in
       `category_name`'i projeksiyonda buraya çözülür. */
    const katalog = JSON.parse(row.catalog_json) as { categories: Array<{ name_fr: string }> };
    expect(katalog.categories.map((c) => c.name_fr)).toEqual(["Dönerler"]);
  });
});

/* ── 2. MUTLU YOL: mevcut müşteri ─────────────────────────────────────── */

describe("POST /api/intake — mutlu yol (client_id)", () => {
  it("mevcut müşteriye ekler; created_client=false; YENİ müşteri DOĞMAZ", async () => {
    const clientId = musteriYaz("Mevcut Müşteri");
    const oncekiMusteri = say("clients");

    const res = await commit({
      client_id: clientId,
      answers: answersTek(),
      checklist: {},
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.created_client).toBe(false);
    expect(body.client_id).toBe(clientId);
    expect(say("clients")).toBe(oncekiMusteri); // müşteri sayısı DEĞİŞMEDİ
    expect(say("intake_records", clientId)).toBe(1);
  });

  it("aynı müşteriye ikinci intake: aynı etiketli kategori MÜKERRER AÇILMAZ (T1b/FIX-3)", async () => {
    const clientId = musteriYaz("İki Turlu");

    const bir = await commit({ client_id: clientId, answers: answersTek(), checklist: {} });
    expect((bir.json() as { applied_categories: number }).applied_categories).toBe(1);

    const iki = await commit({
      client_id: clientId,
      answers: {
        items: [
          {
            category_name: "DÖNERLER", // foldTr eşleşmesi — büyük harf
            name: "Et Döner",
            variants: [{ label: "seul", value: 11 }],
            chips: [],
          },
        ],
      },
      checklist: {},
    });

    const body = iki.json() as Record<string, unknown>;
    expect(body.applied_categories).toBe(0); // YENİ kategori açılmadı
    expect(body.merged_into_existing).not.toEqual([]); // birleşme görünür (M8)
    expect(body.catalog_had_categories).toBe(true);
    expect(say("intake_records", clientId)).toBe(2); // her tur AYRI iz
  });
});

/* ── 3. 404 dalı ──────────────────────────────────────────────────────── */

describe("POST /api/intake — bilinmeyen client_id", () => {
  it("404 döner ve HİÇBİR ŞEY yazmaz", async () => {
    const oncekiIz = say("intake_records");
    const oncekiGecmis = say("catalog_history");

    const res = await commit({
      client_id: "cli_boyle_bir_musteri_yok",
      answers: answersTek(),
      checklist: {},
    });

    expect(res.statusCode).toBe(404);
    /* GÖVDE ŞEKLİ ÖLÇÜLDÜ, VARSAYILMADI: bu dal Object.assign(new Error(...),
       {statusCode:404}) ile fırlar ve genel setErrorHandler'a düşer → gövde
       {error:"internal", message:"client_not_found"} olur. Okuma ucunun 404'ü
       (aşağıda) {error:"client_not_found"} döner — surfaces.ts deseni.
       İKİ ŞEKİL AYNI DEĞİL; bu ASİMETRİ bilerek kayda geçiriliyor, bu pakette
       DÜZELTİLMİYOR (yanıt gövdesi değiştirmek mevcut tüketicileri kırabilir —
       ayrı karar). Test bugünün gerçeğini çiviler. */
    expect(res.json()).toEqual({ error: "internal", message: "client_not_found" });

    expect(say("intake_records")).toBe(oncekiIz);
    expect(say("catalog_history")).toBe(oncekiGecmis);
  });
});

/* ── 4. ATOMİKLİK — intake.ts:54-58'in vaadi ──────────────────────────── */

describe("POST /api/intake — ATOMİKLİK: bozuk surfaces transaction'ı AÇTIRMAZ", () => {
  it("bozuk checklist.surfaces → 400 VE üç tabloya SIFIR satır (yarım müşteri yok)", async () => {
    const oncekiMusteri = say("clients");
    const oncekiIz = say("intake_records");
    const oncekiGecmis = say("catalog_history");
    const oncekiYuzey = say("client_surfaces");

    const res = await commit({
      /* YENİ müşteri istenir — vaadin en pahalı kısmı budur: transaction
         açılsaydı müşteri satırı doğar ve 400'e rağmen diskte kalırdı. */
      new_client: { name: "Yarım Kalmasın Lokantası" },
      answers: answersTek(),
      checklist: { surfaces: [{ label: "" }] }, // label min(1) → ZodError
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("validation");

    /* VAADİN KENDİSİ: hiçbir tabloya tek satır düşmedi */
    expect(say("clients")).toBe(oncekiMusteri);
    expect(say("intake_records")).toBe(oncekiIz);
    expect(say("catalog_history")).toBe(oncekiGecmis);
    expect(say("client_surfaces")).toBe(oncekiYuzey);

    /* Ad da sızmadı — slug/isim araması boş */
    const kacak = db
      .prepare("SELECT COUNT(*) AS n FROM clients WHERE name = ?")
      .get("Yarım Kalmasın Lokantası") as { n: number };
    expect(kacak.n).toBe(0);
  });

  /* GERİ SARMA — yazılmış satırlar geri alınır (kırmızı-kanıt turunun hediyesi).
     Yukarıdaki testler transaction AÇILMADAN reddedilen isteği ölçer; bu test
     transaction AÇILDIKTAN ve adım 1/4/5 diske yazdıktan SONRA hata atıldığında
     ne olduğunu ölçer. Hata GEÇİCİ BİR SQLite TRIGGER'ıyla üretilir: üretim
     kodu değişmez, uydurma bir dal açılmaz — DB'nin kendisi adım 7'yi reddeder
     (RAISE(ABORT)). Bu, 8 adımın "tek transaction" olduğu iddiasının tek
     doğrudan kanıtıdır. */
  it("adım 7 DB düzeyinde reddedilirse adım 1/4/5'in yazdıkları GERİ SARILIR", async () => {
    const oncekiMusteri = say("clients");
    const oncekiIz = say("intake_records");
    const oncekiGecmis = say("catalog_history");

    db.exec(
      `CREATE TRIGGER test_intake_red BEFORE INSERT ON intake_records
       BEGIN SELECT RAISE(ABORT, 'test_zorlanmis_hata'); END;`
    );
    try {
      const res = await commit({
        new_client: { name: "Geri Sarılacak Lokanta" },
        answers: answersTek(),
        checklist: { surfaces: [{ label: "Ön cam", w_cm: 200 }] },
      });
      expect(res.statusCode).toBe(500); // trigger hatası → genel error handler
    } finally {
      db.exec("DROP TRIGGER test_intake_red;");
    }

    /* ÜÇÜ DE BAŞLANGIÇTAKİ DEĞERDE: müşteri adım 1'de, catalog_history adım
       4'te, katalog adım 5'te YAZILMIŞTI — transaction geri sardı. */
    expect(say("clients")).toBe(oncekiMusteri);
    expect(say("intake_records")).toBe(oncekiIz);
    expect(say("catalog_history")).toBe(oncekiGecmis);
    const kacak = db
      .prepare("SELECT COUNT(*) AS n FROM clients WHERE name = ?")
      .get("Geri Sarılacak Lokanta") as { n: number };
    expect(kacak.n).toBe(0);
  });

  it("client_id VE new_client birlikte → 400 (refine), yine sıfır yazma", async () => {
    const clientId = musteriYaz("Tek Biri");
    const oncekiIz = say("intake_records");

    const res = await commit({
      client_id: clientId,
      new_client: { name: "Aynı Anda İkisi" },
      answers: answersTek(),
      checklist: {},
    });

    expect(res.statusCode).toBe(400);
    expect(say("intake_records")).toBe(oncekiIz);
  });
});

/* ── 5. OKUMA UCU — kayıtlı kusurun kapanışı ──────────────────────────── */

describe("GET /api/clients/:id/intake-records — denetim izi OKUNABİLİR", () => {
  it("bilinmeyen müşteri → 404 client_not_found (boş dizi DEĞİL)", async () => {
    const res = await izleriOku("cli_yok_boyle_biri");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "client_not_found" });
  });

  it("intake'i olmayan müşteri → 200 + boş dizi ('bilinmeyen' ile karışmaz)", async () => {
    const clientId = musteriYaz("Hiç Sipariş Vermedi");
    const res = await izleriOku(clientId);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("commit edilen intake OKUNABİLİR: DTO alanları + answers/checklist NESNE olarak", async () => {
    const clientId = musteriYaz("Okunabilir");
    const post = await commit({
      client_id: clientId,
      answers: answersTek(),
      checklist: { surfaces: [], not: "kapı ölçüsü alınacak" },
    });
    const intakeId = (post.json() as { intake_id: string }).intake_id;

    const res = await izleriOku(clientId);
    expect(res.statusCode).toBe(200);
    const list = res.json() as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);

    const dto = list[0];
    expect(dto.id).toBe(intakeId);
    expect(dto.client_id).toBe(clientId);
    expect(typeof dto.created_at).toBe("string");

    /* HAM DİZE DEĞİL, ÇÖZÜLMÜŞ NESNE — çağırana JSON.parse borcu bırakılmaz */
    expect(typeof dto.answers).toBe("object");
    expect(typeof dto.checklist).toBe("object");
    const answers = dto.answers as { items: Array<{ name: string }> };
    expect(answers.items[0].name).toBe("Tavuk Döner");
    expect((dto.checklist as { not: string }).not).toBe("kapı ölçüsü alınacak");

    /* Kolon adları DIŞARI SIZMAZ (render.ts'in Row/DTO ayrımı kuralı) */
    expect(dto).not.toHaveProperty("answers_json");
    expect(dto).not.toHaveProperty("checklist_json");
  });

  it("SIRA created_at DESC — denetim önce 'az önce ne oldu' diye sorar", async () => {
    const clientId = musteriYaz("Sıralı");
    /* created_at ELLE verilir: nowISO ms çözünürlüğünde eşitlenebilir, sıra
       iddiası gerçek zamana bırakılırsa kırılgan olur (render-channel.test.ts
       izEkle deseni). */
    const yaz = (id: string, ts: string): void => {
      db.prepare(
        `INSERT INTO intake_records (id, client_id, answers_json, checklist_json, created_at)
         VALUES (?, ?, '{}', '{}', ?)`
      ).run(id, clientId, ts);
    };
    yaz("intk_eski", "2026-01-01T00:00:00.000Z");
    yaz("intk_yeni", "2026-08-01T00:00:00.000Z");
    yaz("intk_orta", "2026-04-01T00:00:00.000Z");

    const list = (await izleriOku(clientId)).json() as Array<{ id: string }>;
    expect(list.map((r) => r.id)).toEqual(["intk_yeni", "intk_orta", "intk_eski"]);
  });

  it("YALNIZ o müşterinin izleri — başka müşterinin kaydı sızmaz", async () => {
    const a = musteriYaz("Müşteri A");
    const b = musteriYaz("Müşteri B");
    await commit({ client_id: a, answers: answersTek(), checklist: {} });
    await commit({ client_id: b, answers: answersTek(), checklist: {} });

    const listA = (await izleriOku(a)).json() as Array<{ client_id: string }>;
    expect(listA).toHaveLength(1);
    expect(listA.every((r) => r.client_id === a)).toBe(true);
  });

  it("BOZUK answers_json tüm izi okunmaz kılmaz: o satır {} olur, komşusu sağlam", async () => {
    const clientId = musteriYaz("Bozuk Satır");
    db.prepare(
      `INSERT INTO intake_records (id, client_id, answers_json, checklist_json, created_at)
       VALUES ('intk_bozuk', ?, '{bu gecerli json degil', '{}', '2026-05-01T00:00:00.000Z')`
    ).run(clientId);
    db.prepare(
      `INSERT INTO intake_records (id, client_id, answers_json, checklist_json, created_at)
       VALUES ('intk_saglam', ?, '{"items":[]}', '{}', '2026-04-01T00:00:00.000Z')`
    ).run(clientId);

    const list = (await izleriOku(clientId)).json() as Array<Record<string, unknown>>;
    expect(list).toHaveLength(2); // 500 DEĞİL — iz okunur kaldı
    const bozuk = list.find((r) => r.id === "intk_bozuk");
    const saglam = list.find((r) => r.id === "intk_saglam");
    expect(bozuk?.answers).toEqual({}); // bozuk gövde boş nesneye düştü
    expect(bozuk?.created_at).toBe("2026-05-01T00:00:00.000Z"); // satırın GERİ KALANI görünür
    expect(saglam?.answers).toEqual({ items: [] });
  });

  it("NORMALİZE ETMEZ: şemanın varsayılanları okumada UYDURULMAZ", async () => {
    /* Bu DTO'nun tasarım kararının pinidir (schemas.ts IntakeRecordDTO şerhi):
       IntakeAnswersSchema okumada koşsaydı, alanı HİÇ OLMAYAN bu satır
       {items:[]} diye okunurdu. Denetim izi YAZILANI gösterir, yeniden
       kurulmuş hâlini değil. */
    const clientId = musteriYaz("Normalize Yok");
    db.prepare(
      `INSERT INTO intake_records (id, client_id, answers_json, checklist_json, created_at)
       VALUES ('intk_ciplak', ?, '{"serbest_anahtar":42}', '{}', '2026-06-01T00:00:00.000Z')`
    ).run(clientId);

    const list = (await izleriOku(clientId)).json() as Array<Record<string, unknown>>;
    const dto = list.find((r) => r.id === "intk_ciplak");
    expect(dto?.answers).toEqual({ serbest_anahtar: 42 }); // items UYDURULMADI
    expect(dto?.answers).not.toHaveProperty("items");
  });

  it("TAVAN 100 — belgeli kesim (sessiz kırpma değil, sabit sayı)", async () => {
    const clientId = musteriYaz("Çok İzli");
    const ins = db.prepare(
      `INSERT INTO intake_records (id, client_id, answers_json, checklist_json, created_at)
       VALUES (?, ?, '{}', '{}', ?)`
    );
    /* 101 satır: tavanın ALTINDA değil, ÜSTÜNDE olduğunu ölçebilmek için */
    for (let i = 0; i < 101; i++) {
      ins.run(`intk_tavan_${i}`, clientId, `2026-03-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`);
    }

    const list = (await izleriOku(clientId)).json() as unknown[];
    expect(list).toHaveLength(100);
    expect(say("intake_records", clientId)).toBe(101); // veri duruyor, yalnız gövde kesildi
  });
});
