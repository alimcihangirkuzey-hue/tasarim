/* DOĞUŞ KATALOĞU — UÇ TARAFI + NÖBETÇİ (K-1/D).

   Kural `dogus-katalogu.test.ts`'te ölçülür. Bu dosya iki AYRI şeyi ölçer:

   1. Uçların gerçekten o gövdeden geçtiği — DB'ye YAZILAN satır okunarak,
      yanıt gövdesine güvenilmeden. Doğru yanıtı dönüp yanlış satırı yazmak
      tam da bu testin var olma sebebidir.
   2. NÖBETÇİ: müşteri YARATAN her yol doğuş gövdesinden geçer. Üçüncü bir
      yaratma yolu doğduğu gün `defaultCatalog()`'u doğrudan çağırırsa, yara
      o yolda sessizce geri açılırdı. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const { migrate, db } = await import("../db.js");
const { buildApp } = await import("../app.js");
const { IS_KOLLARI_ENV } = await import("../is-kollari.js");
const { DIPNOT_IS_KOLU } = await import("../dogus-katalogu.js");
const { defaultCatalog } = await import("@tezgah/shared");
const { PARA_BIRIMI_ENV, CIKTI_DILI_ENV } = await import("../dogus-varsayilanlari.js");

const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));

let app: FastifyInstance;

beforeAll(async () => {
  migrate();
  app = await buildApp({ logger: false });
});

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  delete process.env[PARA_BIRIMI_ENV];
  delete process.env[CIKTI_DILI_ENV];
});

/** Yanıta DEĞİL, yazılan satıra bakar. */
function yazilanDipnot(id: string): string {
  const row = db.prepare("SELECT catalog_json FROM clients WHERE id = ?").get(id) as
    | { catalog_json: string }
    | undefined;
  return (JSON.parse(row!.catalog_json) as { footnote_fr: string }).footnote_fr;
}

async function musteriYarat(ad: string): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/api/clients", payload: { name: ad } });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

describe("POST /api/clients — doğuş dipnotu", () => {
  it("YAPILANDIRMA YOKKEN bugünkü dipnot YAZILIR", async () => {
    const id = await musteriYarat("Varsayilan Kurulum");
    expect(yazilanDipnot(id)).toBe(defaultCatalog().footnote_fr);
  });

  it("MENÜ ÜRETİCİSİ kurulumunda dipnot KORUNUR", async () => {
    process.env[IS_KOLLARI_ENV] = DIPNOT_IS_KOLU;
    const id = await musteriYarat("Menucu Kurulum");
    expect(yazilanDipnot(id)).toBe(defaultCatalog().footnote_fr);
  });

  it("TABELACI kurulumunda dipnot BOŞ yazılır", async () => {
    process.env[IS_KOLLARI_ENV] = "tabelaci";
    const id = await musteriYarat("Kuzey Ozalit");
    expect(yazilanDipnot(id)).toBe("");
  });

  it("MATBAA kurulumunda da BOŞ — flyer dipnotu bu yoldan geliyordu", async () => {
    process.env[IS_KOLLARI_ENV] = "matbaa";
    const id = await musteriYarat("Anadolu Matbaa");
    expect(yazilanDipnot(id)).toBe("");
  });

  it("MEVCUT MÜŞTERİ ETKİLENMEZ — doğuş kuralı geriye dönük ÇALIŞMAZ", async () => {
    /* Geriye dönük veri düzenlemek ürün sahibinin kararıdır (geri
       döndürülemez veri). Yapılandırma sonradan daraltılsa bile önce
       doğmuş müşterinin dipnotu yerinde kalır. */
    const id = await musteriYarat("Once Dogan");
    process.env[IS_KOLLARI_ENV] = "tabelaci";
    const res = await app.inject({ method: "GET", url: `/api/clients/${id}` });
    expect(res.statusCode).toBe(200);
    expect(yazilanDipnot(id)).toBe(defaultCatalog().footnote_fr);
  });
});

describe("nöbetçi — müşteri yaratan her yol doğuş gövdesinden geçer", () => {
  /* Bu nöbetçi ilk koşuşunda İŞE YARADI: `clone.ts`'i buldum diye değil,
     onu OKUMAK ZORUNDA bıraktığı için. Klon bir DOĞUŞ değil KOPYAdır ve
     doğuş kuralı orada uygulanmamalıdır — ama aynı dosyada ölçülen ikinci
     bir K-1/D yarası çıktı (aşağıdaki klon dili testi). */

  /** Doğuş kuralından bilerek MUAF yollar — her biri gerekçesiyle. */
  const ISTISNALAR: ReadonlyArray<{ dosya: string; neden: string }> = [
    {
      dosya: "clone.ts",
      neden:
        "Klon DOĞUŞ değil KOPYAdır: katalog kaynaktan gelir. Doğuş kuralını " +
        "uygulamak, operatörün kaynak müşteride ELLE yazdığı dipnotu klonda " +
        "sessizce silerdi — daraltma bir içerik silme yetkisi değildir.",
    },
  ];

  /** `INSERT INTO clients` yazan rota dosyaları. */
  function musteriYazanlar(): string[] {
    return readdirSync(ROUTES_DIR)
      .filter((f) => /\.ts$/.test(f) && !f.includes(".test."))
      .filter((f) => /INSERT INTO clients\b/.test(readFileSync(path.join(ROUTES_DIR, f), "utf8")));
  }

  it("NÖBETÇİNİN KENDİSİ çalışıyor (ön-koşul: bilinen yazıcılar bulundu)", () => {
    /* Ön-koşul olmadan aşağıdaki iddia, hiçbir dosya bulamayan bozuk bir
       tarayıcıyla da yeşil kalırdı. */
    const yazanlar = musteriYazanlar();
    expect(yazanlar).toContain("clients.ts");
    expect(yazanlar).toContain("intake.ts");
    expect(yazanlar, "istisna yazılı ama tarama onu görmüyor").toContain("clone.ts");
  });

  it("HER yazıcı ya dogusKatalogu ÇAĞIRIR ya GEREKÇELİ İSTİSNADADIR", () => {
    const bagisik = new Set(ISTISNALAR.map((i) => i.dosya));
    const kacan = musteriYazanlar().filter((f) => {
      if (bagisik.has(f)) return false;
      const s = readFileSync(path.join(ROUTES_DIR, f), "utf8");
      return !s.includes("dogusKatalogu(") || /\bdefaultCatalog\s*\(/.test(s);
    });
    expect(
      kacan,
      "Bu rota(lar) müşteri yaratıyor ama doğuş kuralından geçmiyor: " +
        "kurulum menü üretmiyorken bile Fransızca alerjen dipnotu yazılır " +
        "(K-1/D). dogusKatalogu(isKollariIlani()) kullanın ya da " +
        "ISTISNALAR'a GEREKÇESİYLE yazın.",
    ).toEqual([]);
  });

  it("SINIRIN DÜRÜST KAYDI: nöbetçi ÇAĞRILDIĞINI görür, DOĞRU ÇAĞRILDIĞINI değil", () => {
    /* Kaynak taraması bir çağrının varlığını kanıtlar, argümanının doğruluğunu
       değil. Davranışı çakan şey yukarıdaki uç testleridir; bu satır, tarama
       nöbetçisinin ne kadar söz verdiğini yazılı tutar. */
    const bagisik = new Set(ISTISNALAR.map((i) => i.dosya));
    for (const f of musteriYazanlar().filter((f) => !bagisik.has(f))) {
      expect(readFileSync(path.join(ROUTES_DIR, f), "utf8")).toContain("dogusKatalogu(");
    }
  });
});

describe("klon çıktı dilini KORUR (K-1/D — aynı turda ölçülen ikinci yara)", () => {
  it("ÖN-KOŞUL: kaynak müşteri gerçekten Fransızca DEĞİL", async () => {
    /* Bu satır olmadan aşağıdaki iddia, kaynağı da 'fr' olan bir kurulumda
       hiçbir şey ayırt etmeden yeşil kalırdı. */
    const res = await app.inject({
      method: "POST",
      url: "/api/clients",
      payload: { name: "On Kosul TR", menu_language: "tr" },
    });
    expect((res.json() as { menu_language: string }).menu_language).toBe("tr");
  });

  it("TÜRKÇE müşterinin klonu TÜRKÇE kalır — 'fr'ye DÜŞMEZ", async () => {
    /* ÖLÇÜLEN YARA: klon INSERT'i `menu_language` sütununu atlıyordu ve şema
       varsayılanı 'fr'. Türk bir müşteriyi klonlayan operatör, çıktı dili
       sessizce Fransızcaya dönmüş bir müşteri elde ediyordu. */
    const kaynak = await app.inject({
      method: "POST",
      url: "/api/clients",
      payload: { name: "Kuzey Ozalit Klon Kaynak", menu_language: "tr" },
    });
    const kaynakId = (kaynak.json() as { id: string }).id;

    const klon = await app.inject({
      method: "POST",
      url: `/api/clients/${kaynakId}/clone`,
      payload: { name: "Kuzey Ozalit Sube" },
    });
    expect(klon.statusCode).toBe(201);

    const yeniId = (klon.json() as { id: string }).id;
    const row = db.prepare("SELECT menu_language FROM clients WHERE id = ?").get(yeniId) as {
      menu_language: string;
    };
    expect(row.menu_language, "klon dili kaynaktan kopyalanmadı").toBe("tr");
  });
});

/* DOĞUŞ VARSAYILANLARI — UÇ TARAFI (K-1/D, 2026-08-06).

   Kural `../dogus-varsayilanlari.test.ts`'te ölçülür. Burada ölçülen şey,
   uçların gerçekten o ilandan geçtiği — ve yine YANITA değil, DB'ye YAZILAN
   satıra bakılarak. */
describe("POST /api/clients — doğuş para birimi ve çıktı dili", () => {
  function yazilan(id: string): { currency: string; menu_language: string } {
    return db
      .prepare("SELECT currency, menu_language FROM clients WHERE id = ?")
      .get(id) as { currency: string; menu_language: string };
  }

  it("İLAN YOKKEN bugünkü değerler YAZILIR (EUR/fr)", async () => {
    const id = await musteriYarat("Varsayilan Dogus");
    expect(yazilan(id)).toEqual({ currency: "EUR", menu_language: "fr" });
  });

  it("TÜRK KURULUMUNDA müşteri TRY/tr DOĞAR", async () => {
    /* Yaranın kendisi: operatör her müşteride iki alanı elle çeviriyordu. */
    process.env[PARA_BIRIMI_ENV] = "TRY";
    process.env[CIKTI_DILI_ENV] = "tr";
    const id = await musteriYarat("Kuzey Ozalit Dogus");
    expect(yazilan(id)).toEqual({ currency: "TRY", menu_language: "tr" });
  });

  it("İSTEK GÖVDESİ İLANI EZER — ilan yalnız BOŞLUĞU doldurur", async () => {
    /* Kurulum TL ilan etse de, o müşteri gerçekten euro çalışıyorsa operatör
       yazabilmelidir. İlan bir varsayılandır, bir kilit değil. */
    process.env[PARA_BIRIMI_ENV] = "TRY";
    process.env[CIKTI_DILI_ENV] = "tr";
    const res = await app.inject({
      method: "POST",
      url: "/api/clients",
      payload: { name: "Ihracat Musterisi", currency: "EUR", menu_language: "fr" },
    });
    expect(res.statusCode).toBe(201);
    expect(yazilan((res.json() as { id: string }).id)).toEqual({
      currency: "EUR",
      menu_language: "fr",
    });
  });

  it("MEVCUT MÜŞTERİ ETKİLENMEZ — ilan geriye dönük ÇALIŞMAZ", async () => {
    const id = await musteriYarat("Ilan Oncesi Dogan");
    process.env[PARA_BIRIMI_ENV] = "TRY";
    process.env[CIKTI_DILI_ENV] = "tr";
    expect(yazilan(id)).toEqual({ currency: "EUR", menu_language: "fr" });
  });
});

describe("nöbetçi — doğuş varsayılanı elle yazılmaz", () => {
  it("HİÇBİR müşteri yaratan rota EUR/fr'yi SERT KODLAMAZ", () => {
    /* Ölçülen yara iki rotada AYRI AYRI yazılıydı; biri güncellenip diğeri
       unutulsaydı aynı kurulumda iki farklı doğuş davranışı olurdu. */
    const bagisik = new Set(["clone.ts"]); // klon kopyadır, kaynağından alır
    const kacan: string[] = [];
    for (const f of readdirSync(ROUTES_DIR).filter(
      (f) => /\.ts$/.test(f) && !f.includes(".test."),
    )) {
      if (bagisik.has(f)) continue;
      const s = readFileSync(path.join(ROUTES_DIR, f), "utf8");
      if (!/INSERT INTO clients\b/.test(s)) continue;
      if (/\?\?\s*"EUR"/.test(s) || /\?\?\s*"fr"/.test(s)) kacan.push(f);
    }
    expect(
      kacan,
      "Bu rota(lar) doğuş varsayılanını sert kodluyor: kurulum ilanı " +
        "(TEZGAH_PARA_BIRIMI / TEZGAH_CIKTI_DILI) bu yolda etkisiz kalır.",
    ).toEqual([]);
  });
});
