/* PARAM KAPISI testleri (journal 2026-07-27-sunucu-params-dogrulamasi) — iki
   katman:

   (1) BİRİM: paramsSemasiOf/paramlariDogrula saf kimlik+şema okumasıdır
       (db'siz — material-routing.test.ts deseni). Eşleme referans eşitliğiyle
       çivilenir: kapının hangi şemayı uyguladığı iddia değil ölçümdür.

   (2) UÇ ENTEGRASYONU: gerçek HTTP uçları, izole :memory: db
       (exports-channel.test.ts deseni). Yazma sınırı (PUT/restore/create) ve
       icra sınırı (export/export-svg) kapıları setErrorHandler'ın 400
       {error:"validation", issues} gövdesiyle test edilir — istemci
       apiErrorMessage bu biçimi zaten okuyor, uçlar ekstra biçim kurmaz.
       İcra-sınırı bozuk belgeleri DOĞRUDAN db UPDATE ile kurulur: PUT kapısı
       varken bozuk param uçtan yazılamaz; icra kapısının asıl işi de tam bu —
       kapıdan ÖNCE diske girmiş tarihsel satırları yakalamak.

       Happy-path export/export-svg BURADA TEST EDİLMEZ: browser ister
       (exports-channel.test.ts'in bilinçli kapsam sınırı aynen). Geçerli
       params'ın kapıdan geçtiği birim katmanında + PUT/restore/create 200
       yollarında kanıtlıdır. /render'ın invalid_params + denetim izi testleri
       render-channel.test.ts'tedir (o dosyanın iz yardımcıları oradadır). */

process.env.TEZGAH_DB_PATH = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("./db.js");
const { buildApp } = await import("./app.js");
const { paramlariDogrula, paramsSemasiOf } = await import("./param-kapisi.js");
const {
  GarmentParamsSchema,
  TabelaParamsSchema,
  VitroParamsSchema,
  newId,
  nowISO,
} = await import("@tezgah/shared");

/* ————— (1) BİRİM ————— */

describe("paramsSemasiOf — eşleme MALZEME CİNSİNDEN (id listesi değil, ilan)", () => {
  it("cam ailesinin ÜÇ id'si de VitroParamsSchema'ya çözülür (referans eşitliği)", () => {
    /* Üç id tek şemaya: eşleme materialTypeOfOrNull üzerinden gittiği için
       yarın dördüncü bir cam id'si doğsa kapı onu liste güncellenmeden kapsar
       — id-listesi kurgusu olsaydı bu test üçlü değil tekil olurdu */
    for (const id of ["vitro-bandeau", "vitro-centre", "vitro-colonne"]) {
      expect(paramsSemasiOf(id), id).toBe(VitroParamsSchema);
    }
  });

  it("tabela → TabelaParamsSchema, tekstil → GarmentParamsSchema", () => {
    expect(paramsSemasiOf("enseigne-panneau")).toBe(TabelaParamsSchema);
    expect(paramsSemasiOf("garment")).toBe(GarmentParamsSchema);
  });

  it("şemasız malzeme cinsleri (menu/flyer/kart) null — uydurma şema üretilmez", () => {
    for (const id of ["menu-grid-cells", "menu-liste-premium", "menu-trifold", "flyer", "carte-fidelite"]) {
      expect(paramsSemasiOf(id), id).toBe(null);
    }
  });

  it("kayıtsız id (fabrika dahil) null — atölye düşme deseni", () => {
    /* kabul-fabrika GERÇEK fabrika id'sidir (identity kaydı generated'ı
       bilerek kapsamaz, C-P2); uydurma id de aynı yere düşer */
    for (const id of ["kabul-fabrika", "olmayan-sablon", "", "toString"]) {
      expect(paramsSemasiOf(id), id).toBe(null);
    }
  });
});

describe("paramlariDogrula — kapı fırlatır ya da geçirir, ASLA dönüştürmez", () => {
  it("vitro + bozuk cut_color FIRLATIR (ZodError → setErrorHandler 400'e çevirir)", () => {
    expect(() => paramlariDogrula("vitro-centre", { cut_color: "kırmızı" })).toThrow(ZodError);
  });

  it("tabela + h_cm: 0 FIRLATIR (positive ihlali)", () => {
    expect(() => paramlariDogrula("enseigne-panneau", { h_cm: 0 })).toThrow(ZodError);
  });

  it("geçerli vitro params GEÇER (kısmi params da: şema default'ları tamamlar)", () => {
    expect(() => paramlariDogrula("vitro-centre", { w_cm: 150, cut_color: "#112233" })).not.toThrow();
    expect(() => paramlariDogrula("vitro-centre", {})).not.toThrow();
  });

  it("kayıtsız id (kabul-fabrika/uydurma) HER params'la geçer — şema yok, kapı yok", () => {
    expect(() => paramlariDogrula("kabul-fabrika", { cut_color: "kırmızı", h_cm: 0 })).not.toThrow();
    expect(() => paramlariDogrula("uydurma-sablon", { ne: "olursa" })).not.toThrow();
  });

  it("menü id'si de geçer — şemasız malzeme cinsi", () => {
    expect(() => paramlariDogrula("menu-liste-premium", { format: 42, bozuk: true })).not.toThrow();
  });

  it("KAPI ≠ DÖNÜŞTÜRÜCÜ: girdi mutasyona uğramaz, dönüş void (default-doldurma yok)", () => {
    /* .parse'ın dönüşü yazılsaydı boş vitro params'ı {w_cm:100, ...} diye
       şişerdi — kullanıcının yazmadığı değer kayda geçerdi. Girdi nesnesi
       olduğu gibi kalır; route'lardaki "ham params diske" iddiasının birim eşi
       (uç eşi: aşağıda PUT sonrası params_json ölçümü). */
    const p: Record<string, unknown> = { w_cm: 150 };
    const donus = paramlariDogrula("vitro-centre", p);
    expect(donus).toBeUndefined();
    expect(p).toEqual({ w_cm: 150 });
  });
});

/* ————— (2) UÇ ENTEGRASYONU ————— */

let app: FastifyInstance;
let clientId: string;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
  await app.ready();

  clientId = newId("cli");
  db.prepare(
    `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
     VALUES (?, 'Param Kapı', 'param-kapi', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
  ).run(clientId, nowISO(), nowISO());
});

const olustur = async (template_id: string, cid = clientId): Promise<string> => {
  const res = await app.inject({
    method: "POST",
    url: `/api/clients/${cid}/documents`,
    payload: { template_id },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
};

/** Diskteki HAM params_json — "ne yazıldı" iddiaları yanıttan değil db'den ölçülür */
const paramsJson = (docId: string): string =>
  (db.prepare("SELECT params_json FROM documents WHERE id = ?").get(docId) as {
    params_json: string;
  }).params_json;

describe("PUT /api/documents/:id — yazma sınırı kapısı", () => {
  it("bozuk params 400 {error:'validation', issues[]} alır ve DİSKE YAZILMAZ", async () => {
    const docId = await olustur("vitro-centre");
    const once = paramsJson(docId);
    const res = await app.inject({
      method: "PUT",
      url: `/api/documents/${docId}`,
      payload: { params: { cut_color: "kırmızı" } },
    });
    expect(res.statusCode).toBe(400);
    const govde = res.json() as { error: string; issues: Array<{ path: string; message: string }> };
    expect(govde.error).toBe("validation");
    expect(govde.issues.some((i) => i.path === "cut_color")).toBe(true);
    /* yazma sınırı: red edilen istek satıra DOKUNMAZ (updated_at dahil) */
    expect(paramsJson(docId)).toBe(once);
  });

  it("aynı belge geçerli params'la 200 — ve diske HAM params gider (default-şişme yok)", async () => {
    const docId = await olustur("vitro-centre");
    const res = await app.inject({
      method: "PUT",
      url: `/api/documents/${docId}`,
      payload: { params: { w_cm: 150 } },
    });
    expect(res.statusCode).toBe(200);
    /* .parse dönüşü yazılsaydı burada mode/miroir/cut_color/bleed_mm default'ları
       da görünürdü — kapı ile dönüştürücü ayrımının UÇ kanıtı */
    expect(JSON.parse(paramsJson(docId))).toEqual({ w_cm: 150 });
  });

  it("TEMPLATE_ID DEĞİŞİMLİ PUT: doğrulama YENİ şablona göredir (menü→vitro + bozuk cut_color → 400)", async () => {
    const docId = await olustur("menu-liste-premium");
    /* Kontrol ölçümü: AYNI bozuk params, şablon değişmeden menüye yazılabilir
       (menu şemasızdır) — yani aşağıdaki 400'ün tek kaynağı yeni template_id'nin
       şemasıdır, params'ın kendisi değil */
    const kontrol = await app.inject({
      method: "PUT",
      url: `/api/documents/${docId}`,
      payload: { params: { cut_color: "kırmızı" } },
    });
    expect(kontrol.statusCode).toBe(200);

    const res = await app.inject({
      method: "PUT",
      url: `/api/documents/${docId}`,
      payload: { template_id: "vitro-centre", params: { cut_color: "kırmızı" } },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("validation");
  });
});

describe("POST /api/documents/:id/restore/:exportId — bozuk paramın dirilme yolu kapalı", () => {
  /** Restore kaynağı: snapshot_json'lu export kaydı (rota yalnız id+document_id arar) */
  const snapshotEkle = (docId: string, state: Record<string, unknown>): string => {
    const id = newId("exp");
    db.prepare(
      `INSERT INTO export_records (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
       VALUES (?, ?, NULL, 'snapshot', '', ?, 1, ?)`
    ).run(id, docId, JSON.stringify({ state }), nowISO());
    return id;
  };

  it("bozuk snapshot restore'u 400 — belge DEĞİŞMEZ, güvenlik kaydı da AÇILMAZ", async () => {
    const docId = await olustur("vitro-centre");
    const expId = snapshotEkle(docId, {
      template_id: "vitro-centre",
      params: { cut_color: "bozuk-renk" },
    });
    const once = paramsJson(docId);
    const kayitOnce = (db
      .prepare("SELECT COUNT(*) AS c FROM export_records WHERE document_id = ?")
      .get(docId) as { c: number }).c;

    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/restore/${expId}` });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("validation");
    expect(paramsJson(docId)).toBe(once);
    /* kapı transaction'dan ÖNCE fırlar: yarım iş yok — güvenlik snapshot'ı da yazılmadı */
    expect(
      (db.prepare("SELECT COUNT(*) AS c FROM export_records WHERE document_id = ?").get(docId) as {
        c: number;
      }).c
    ).toBe(kayitOnce);
  });

  it("geçerli snapshot restore'u 200 KALIR (kapı meşru geri-yüklemeyi daraltmaz)", async () => {
    const docId = await olustur("vitro-centre");
    const expId = snapshotEkle(docId, {
      template_id: "vitro-centre",
      params: { w_cm: 77, cut_color: "#AABBCC" },
    });
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/restore/${expId}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(paramsJson(docId))).toEqual({ w_cm: 77, cut_color: "#AABBCC" });
  });
});

describe("POST /api/clients/:id/documents — ön-dolum da kapıdan geçer", () => {
  it("geçerli yüzey ön-dolumlu vitro belgesi 201 (bugünkü meşru yol daralmaz)", async () => {
    db.prepare(
      `INSERT INTO client_surfaces (id, client_id, kind, label, w_cm, h_cm, note, source_intake_id, created_at, updated_at)
       VALUES (?, ?, 'vitrine', 'Ön cam', 120, 80, '', NULL, ?, ?)`
    ).run(newId("srf"), clientId, nowISO(), nowISO());
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${clientId}/documents`,
      payload: { template_id: "vitro-centre" },
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as { params: Record<string, unknown> }).params).toMatchObject({
      w_cm: 120,
      h_cm: 80,
    });
  });

  it("aralık dışı yüzey satırı (elle yazılmış w_cm=5000) belge doğumunda 400 — sessizce diske girmez", async () => {
    /* intake yolu aynı aralığı doğruluyor diye bu kapı gereksiz DEĞİL:
       client_surfaces'a elle/eski araçla yazılmış satırın aralık garantisi yok
       ("kendi verimize güvenmek değil ölçmek"). Ayrı müşteri: updated_at DESC
       seçiminin üstteki geçerli satırla yarışmaması için. */
    const cid2 = newId("cli");
    db.prepare(
      `INSERT INTO clients (id, name, slug, notes, currency, menu_language, brandkit_json, catalog_json, created_at, updated_at)
       VALUES (?, 'Bozuk Yüzey', 'bozuk-yuzey', '', 'EUR', 'fr', '{}', '{}', ?, ?)`
    ).run(cid2, nowISO(), nowISO());
    db.prepare(
      `INSERT INTO client_surfaces (id, client_id, kind, label, w_cm, h_cm, note, source_intake_id, created_at, updated_at)
       VALUES (?, ?, 'vitrine', 'Dev cam', 5000, 80, '', NULL, ?, ?)`
    ).run(newId("srf"), cid2, nowISO(), nowISO());
    const res = await app.inject({
      method: "POST",
      url: `/api/clients/${cid2}/documents`,
      payload: { template_id: "vitro-centre" },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("validation");
  });
});

describe("icra sınırında erken red — export/export-svg bozuk belgede 400 (browser'a İNMEDEN)", () => {
  /** Tarihsel bozuk satır kurulumu: PUT kapısı varken uçtan yazılamaz —
      kapı-öncesi diske girmiş veriyi DOĞRUDAN db ile taklit ederiz */
  const boz = (docId: string): void => {
    db.prepare("UPDATE documents SET params_json = ? WHERE id = ?").run(
      JSON.stringify({ cut_color: "kırmızı", h_cm: 0 }),
      docId
    );
  };

  it("POST .../export: eskiden 30-45sn timeout + 500 'internal' — şimdi anında 400 + issues", async () => {
    const docId = await olustur("vitro-centre");
    boz(docId);
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/export`, payload: {} });
    expect(res.statusCode).toBe(400);
    const govde = res.json() as { error: string; issues: Array<{ path: string }> };
    expect(govde.error).toBe("validation");
    expect(govde.issues.length).toBeGreaterThan(0);
    /* browser'a inilmediğinin kanıtı yanıtın KENDİSİDİR: bu test ortamında
       PRINT_BASE'de sayfa yok — Puppeteer'a inen istek 400 validation değil
       60sn goto timeout'u (500) üretirdi (exports-channel.test.ts'in
       "bekçi browser'dan önce" kanıt deseniyle aynı akıl yürütme) */
  });

  it("POST .../export-svg: aynı kapı, kind bekçisinden SONRA (mevcut sıra korunur)", async () => {
    const docId = await olustur("vitro-centre");
    boz(docId);
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/export-svg`, payload: {} });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("validation");
  });

  it("PİN — export-svg'nin kind bekçisi kapıdan ÖNCE kalır: menü belgesi (bozuk params'la bile) eski 400'ünü alır", async () => {
    const docId = await olustur("menu-liste-premium");
    const res = await app.inject({ method: "POST", url: `/api/documents/${docId}/export-svg`, payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "svg_export_only_vitro_or_garment" });
  });
});
