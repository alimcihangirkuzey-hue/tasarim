/* Cockpit modül fazı 1 — GÖRÜNÜM KURUCU + SUNUCU TESTLERİ (Canonical 11.1/11.4).

   Üç şey ayrı ayrı sınanır ve hiçbiri diğerinin yerine geçmez:

   (1) SAF KARAR — aktifPaketId. Girdi elle kurulur; diske hiç dokunulmaz.
   (2) I/O KATMANI — cockpitGorunumu geçici bir TEZGAH_JOURNAL_DIR'de gerçek
       dosyalarla koşar. Sınıf etiketleri (olcum/canli/plan) tek tek ölçülür:
       11.4'ün ayrımı tipte taşınıyor olsa da, YANLIŞ SARMALAYICIYLA kurulan
       bir alan tipi geçer ve ekranda sınıf değiştirirdi.
   (3) SUNUCU — sahte istek nesnesiyle değil, GERÇEK PORTTA. Yalnız gerçek
       dinleme, "127.0.0.1'e bağlandı" ve "POST reddedildi" iddialarını ölçebilir;
       elde uydurulmuş bir req/res çifti ikisini de doğrulamış GİBİ yapardı.

   Sunucu testleri 0 portu ile açılır (OS atar): sabit port paralel koşumda
   çakışır ve testi makineye bağımlı kılardı. */

import fs from "node:fs";
import { once } from "node:events";
import type http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  foldPackageJournal,
  type JournalActor,
  type JournalEvent,
  type JournalPackageRecord,
  type JournalStage,
} from "@tezgah/shared";

import { aktifPaketId, cockpitGorunumu } from "./cockpit.js";
import { journalFile } from "./paths.js";
import { appendEvent } from "./store.js";
import { cockpitSunucusu } from "./serve.js";
import type { AsamaAdimi } from "./view.js";

const OWNER: JournalActor = { kind: "human", id: "urun-sahibi", role: "urun-sahibi" };
const AGENT: JournalActor = { kind: "agent", id: "ajan-1", role: "uygulayici" };

const bildirim = (ad: string): JournalEvent => ({
  type: "package_declared",
  payload: {
    name: ad,
    purpose: "Cockpit testi",
    canonical_version: "4.1.0",
    canonical_sections: ["11.1", "11.4"],
    adr_tdr: [],
    modules: ["packages/journal"],
    contracts: ["cockpitGorunumu"],
    scope_in: ["okuma"],
    scope_out: ["yazma"],
    risk_class: "dusuk",
  },
});

const not = (text: string): JournalEvent => ({ type: "note", payload: { text } });

/* ── Geçici journal ───────────────────────────────────────────────────── */

let tmpRoot: string;
const acikSunucular: http.Server[] = [];

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tezgah-cockpit-"));
  /* events/ ALT dizin: evidence ve .lock kardeşleri de tmpRoot'ta kalır.
     GERÇEK docs/journal/ bu testlerde HİÇ AÇILMAZ. */
  process.env.TEZGAH_JOURNAL_DIR = path.join(tmpRoot, "events");
});

afterEach(async () => {
  for (const s of acikSunucular.splice(0)) await kapat(s);
  delete process.env.TEZGAH_JOURNAL_DIR;
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

/** Aynı milisaniyede iki paket yazılırsa "en son olay" ölçülemez; saat ilerlet */
function msIlerle(): void {
  const t = Date.now();
  while (Date.now() === t) {
    /* boş: sistem saatinin bir sonraki milisaniyesi bekleniyor */
  }
}

function paketKur(id: string, olaylar: readonly JournalEvent[] = []): void {
  appendEvent(id, bildirim(id), OWNER);
  for (const ev of olaylar) appendEvent(id, ev, AGENT);
}

/* ── (1) aktifPaketId — SAF ───────────────────────────────────────────── */

/** Tam ve geçerli bir boş kayıt; yalnız sınanan iki alan değiştirilir */
const kayit = (package_id: string, last_event_ts: string | null): JournalPackageRecord => ({
  ...foldPackageJournal([]),
  package_id,
  last_event_ts,
});

describe("aktifPaketId — en son olayı olan paket", () => {
  it("boş liste → null", () => {
    expect(aktifPaketId([])).toBeNull();
  });

  it("tek paket → o paket", () => {
    expect(aktifPaketId([kayit("PKG-TEK", "2026-07-19T10:00:00.000Z")])).toBe("PKG-TEK");
  });

  it("en son last_event_ts kazanır — liste sırasından BAĞIMSIZ", () => {
    const eski = kayit("PKG-ESKI", "2026-07-18T23:59:59.999Z");
    const yeni = kayit("PKG-YENI", "2026-07-19T00:00:00.000Z");
    expect(aktifPaketId([eski, yeni])).toBe("PKG-YENI");
    expect(aktifPaketId([yeni, eski])).toBe("PKG-YENI");
  });

  it("id sırası ile zaman sırası ÇELİŞİRSE zaman kazanır", () => {
    /* id'si BÜYÜK ama olayı ESKİ olan paket aktif değildir; sıralama
       alfabetik bir kısayola düşerse bu test kırmızıya döner. */
    const zBuyukEski = kayit("ZZZ-eski", "2026-07-01T00:00:00.000Z");
    const aKucukYeni = kayit("AAA-yeni", "2026-07-19T12:00:00.000Z");
    expect(aktifPaketId([zBuyukEski, aKucukYeni])).toBe("AAA-yeni");
  });

  it("olayı olmayan kayıt (ts null), olayı olana yenilir", () => {
    expect(aktifPaketId([kayit("PKG-BOS", null), kayit("PKG-DOLU", "2026-01-01T00:00:00.000Z")])).toBe(
      "PKG-DOLU"
    );
  });

  it("kimliği boş kayıt aktif seçilmez (açılamayacak paket gösterilmez)", () => {
    expect(aktifPaketId([kayit("", "2099-01-01T00:00:00.000Z")])).toBeNull();
  });

  it("beraberlikte sonuç BELİRLİDİR (aynı girdi → aynı cevap)", () => {
    const a = kayit("PKG-A", "2026-07-19T10:00:00.000Z");
    const b = kayit("PKG-B", "2026-07-19T10:00:00.000Z");
    expect(aktifPaketId([a, b])).toBe(aktifPaketId([b, a]));
  });
});

/* ── (2) cockpitGorunumu — I/O ────────────────────────────────────────── */

/* notlar BU LİSTEDE DEĞİLDİR: ANLATI sınıfıdır (11.4). Ayrı sınanır. */
const OLCUM_ALANLARI = [
  "aktif_paket",
  "zaman_cizelgesi",
  "kapilar",
  "izlenebilirlik",
  "gecmis",
  "riskler",
] as const;

describe("cockpitGorunumu — sınıflar", () => {
  it("ölçüm alanlarının HEPSİ sinif:'olcum' ve kaynak taşır", () => {
    paketKur("PKG-OLCUM", [not("anlatı")]);
    const g = cockpitGorunumu();
    for (const ad of OLCUM_ALANLARI) {
      expect(g[ad].sinif, ad).toBe("olcum");
      expect(typeof g[ad].kaynak, ad).toBe("string");
      expect(g[ad].kaynak.length, ad).toBeGreaterThan(0);
    }
  });

  it("notlar ANLATI'dır; hiçbir ölçüm alanı 'anlati' TAŞIMAZ", () => {
    paketKur("PKG-ANLATI", [not("insan cümlesi — ölçüm değil")]);
    const g = cockpitGorunumu();

    expect(g.notlar.sinif).toBe("anlati");
    expect(g.notlar.deger.map((n) => n.text)).toEqual(["insan cümlesi — ölçüm değil"]);
    /* Karşı yön: anlatı ölçüm alanına sızmasın, ölçüm de anlatı kılığına girmesin */
    for (const ad of OLCUM_ALANLARI) expect(g[ad].sinif, ad).not.toBe("anlati");
    expect(g.notlar.sinif).not.toBe("olcum");
  });

  it("git alanı DAİMA sınıflıdır: 'canli' ya da 'canli-okunamadi' (null YOK)", () => {
    paketKur("PKG-GIT");
    const g = cockpitGorunumu();
    expect(g.git).not.toBeNull();
    expect(["canli", "canli-okunamadi"]).toContain(g.git.sinif);
    /* Hangi dal olursa olsun: okundu anı ve komut ZORUNLU (11.3) */
    expect(typeof g.git.okundu).toBe("string");
    expect(g.git.okundu.length).toBeGreaterThan(0);
    expect(g.git.komut.length).toBeGreaterThan(0);
    if (g.git.sinif === "canli") expect(typeof g.git.deger.dal).toBe("string");
  });

  it("gecmis.kaynak GERÇEK okuma dizinini bildirir (sabit yol değil)", () => {
    paketKur("PKG-KAYNAK");
    const g = cockpitGorunumu();
    const dizin = process.env.TEZGAH_JOURNAL_DIR as string;
    /* view.ts ayraçları tekleştirir (Windows'ta `…\events/*.jsonl` karışık yol
       üretiyordu), o yüzden karşılaştırma da normalleştirilmiş yolla yapılır.
       Sınanan şey biçim değil, kaynağın GERÇEK okuma dizinini bildirmesidir. */
    expect(g.gecmis.kaynak).toContain(dizin.replace(/\\/g, "/"));
    /* Sabit yazılı yol geri gelirse bu satır kırmızıya döner */
    expect(g.gecmis.kaynak).not.toBe("docs/journal/events/*.jsonl");
  });

  it("plan alanlarının hepsi sinif:'plan' ve bayatlığını taşır", () => {
    paketKur("PKG-PLAN");
    const g = cockpitGorunumu();
    expect(Array.isArray(g.plan)).toBe(true);
    for (const p of g.plan) {
      expect(p.sinif).toBe("plan");
      expect(typeof p.kaynak).toBe("string");
      /* 11.4: "plan" demek yetmez, ne kadar eski olduğu da alanda olmalı */
      expect(p).toHaveProperty("guncellendi");
      expect(p).toHaveProperty("geride_commit");
    }
  });

  it("canlı git okuması DÜŞERSE alan 'canli-okunamadi' olur, sebep taşır", () => {
    paketKur("PKG-GITSIZ");
    /* git'i PATH'ten düşür: gitCalistir ENOENT alır, gitDurumu null döner.
       live.ts sebebi taşımıyor; bu katman null'ı SINIFLI bir "okunamadı"ya
       çevirir — 11.3'ün "ölçülemedi" hükmünün canlı okuma karşılığı. */
    const eskiPath = process.env.PATH;
    process.env.PATH = tmpRoot;
    try {
      const g = cockpitGorunumu();
      expect(g.git.sinif).toBe("canli-okunamadi");
      if (g.git.sinif !== "canli-okunamadi") throw new Error("sınıf beklenenden farklı");
      expect(g.git.sebep).toMatch(/okunamadı/);
      expect(g.git.komut).toMatch(/git/);
      expect(g.git.okundu.length).toBeGreaterThan(0);
      /* TEK KANAL: aynı olgu ayrıca `hatalar`a YAZILMAZ (çift kayıt çelişir) */
      expect(g.hatalar.deger).toEqual([]);
      /* Ölçüm alanları bu arızadan ETKİLENMEZ: journal okunmaya devam eder */
      expect(g.aktif_paket.deger?.package_id).toBe("PKG-GITSIZ");
    } finally {
      process.env.PATH = eskiPath;
    }
  });

  it("hatalar alanı sinif:'canli' — ölçüm sınıfına karışmaz", () => {
    paketKur("PKG-TEMIZ");
    const g = cockpitGorunumu();
    expect(g.hatalar.sinif).toBe("canli");
    expect(g.hatalar.deger).toEqual([]);
  });
});

describe("cockpitGorunumu — okuma", () => {
  it("hiç paket yokken çökmez; aktif paket null, geçmiş boş", () => {
    const g = cockpitGorunumu();
    expect(g.aktif_paket.deger).toBeNull();
    expect(g.gecmis.deger).toEqual([]);
    expect(g.kapilar.deger).toEqual([]);
    expect(g.zaman_cizelgesi.deger).toEqual([]);
    expect(g.hatalar.deger).toEqual([]);
  });

  it("aktif paket EN SON olaylı olandır; geçmiş tüm paketleri taşır", () => {
    /* id'si büyük olan ÖNCE yazılır: aktif paket alfabetik kısayolla
       seçilseydi yanlış paketi gösterirdi. */
    paketKur("ZZZ-once");
    msIlerle();
    paketKur("AAA-sonra", [not("son olay")]);

    const g = cockpitGorunumu();
    expect(g.aktif_paket.deger?.package_id).toBe("AAA-sonra");
    expect(g.gecmis.deger.map((p) => p.package_id)).toEqual(["AAA-sonra", "ZZZ-once"]);
    /* Aktif paketin ölçümleri O paketten gelir */
    expect(g.aktif_paket.deger?.olay_sayisi).toBe(2);
    expect(g.notlar.deger.map((n) => n.text)).toEqual(["son olay"]);
  });

  it("geçmiş YENİDEN ESKİYE sıralanır — diskteki (alfabetik) sıra DEĞİL", () => {
    /* MUTASYON TURU BULGUSU: üstteki testte id sırası ile zaman sırası aynı
       yöne bakıyordu, bu yüzden "sıralamayı tümüyle kaldır" mutasyonu YEŞİL
       KALIYORDU. Burada ikisi ters yöne bakar: listPackageIds alfabetik verir
       (AAA, ZZZ), doğru cevap ise zamana göre terstir (ZZZ, AAA). */
    paketKur("AAA-eski");
    msIlerle();
    paketKur("ZZZ-yeni");

    const g = cockpitGorunumu();
    expect(fs.readdirSync(process.env.TEZGAH_JOURNAL_DIR as string).sort()).toEqual([
      "AAA-eski.jsonl",
      "ZZZ-yeni.jsonl",
    ]);
    expect(g.gecmis.deger.map((p) => p.package_id)).toEqual(["ZZZ-yeni", "AAA-eski"]);
  });

  it("ÖNBELLEK YOK: her çağrı diskten yeniden okur", () => {
    paketKur("PKG-TAZE");
    const once = cockpitGorunumu();
    expect(once.aktif_paket.deger?.olay_sayisi).toBe(1);

    appendEvent("PKG-TAZE", not("yeni olay"), AGENT);

    const sonra = cockpitGorunumu();
    expect(sonra.aktif_paket.deger?.olay_sayisi).toBe(2);
    expect(sonra.notlar.deger.map((n) => n.text)).toEqual(["yeni olay"]);
    /* Üretim anı da yenilenir; sabit kalsaydı sayfa kendi bayatlığını gizlerdi */
    expect(sonra.uretildi >= once.uretildi).toBe(true);
  });

  it("her ölçüm alanı journal'daki karşılığından gelir (izlenebilirlik)", () => {
    paketKur("PKG-IZ");
    const g = cockpitGorunumu();
    expect(g.izlenebilirlik.deger.canonical_version).toBe("4.1.0");
    expect(g.izlenebilirlik.deger.bolumler).toEqual(["11.1", "11.4"]);
    expect(g.izlenebilirlik.deger.kapsam_dis).toEqual(["yazma"]);
  });
});

/* ── GERİLEME TESTİ: geri dönüş ekranda KAYBOLMAZ ─────────────────────── */

describe("cockpitGorunumu — zaman çizelgesi geri dönüşü gösterir", () => {
  /* BULGU (bu turda ölçüldü, view.ts'te kapatıldı): çizelge yalnız İLK varış
     anını okuduğu sürece, doğrulayıcının geri gönderdiği paket ile temiz
     geçmiş paket AYNI görünüyordu — `ikinci-dogrulayici: gecildi`. 11.5 geri
     dönüşü geçerli bir geçiş sayar ve kayda geçirir; kayıtta olup ekranda
     olmayan geçiş, ekranın yalanıdır. Bu test o yalanın gerileme kapısıdır. */
  const gec = (from: JournalStage | null, to: JournalStage): JournalEvent => ({
    type: "stage_changed",
    payload: { from, to },
  });

  it("geri gönderilen paket: ikinci-dogrulayici.geri_donus=1 · test.ziyaret=2", () => {
    paketKur("PKG-GERI", [
      gec(null, "planlama"),
      gec("planlama", "canonical-kaydi"),
      gec("canonical-kaydi", "gelistirme"),
      gec("gelistirme", "test"),
      gec("test", "ikinci-dogrulayici"),
      /* DOĞRULAYICI BULGU ÇIKARDI — 11.5'te geçerli GERİ dönüş */
      gec("ikinci-dogrulayici", "gelistirme"),
      gec("gelistirme", "test"),
    ]);

    const cizelge = cockpitGorunumu().zaman_cizelgesi.deger;
    const adim = (ad: JournalStage): AsamaAdimi => {
      const bulunan = cizelge.find((a) => a.asama === ad);
      if (bulunan === undefined) throw new Error(`çizelgede yok: ${ad}`);
      return bulunan;
    };

    /* Terk edilen aşama "buradan geri gönderildi" der */
    expect(adim("ikinci-dogrulayici").geri_donus).toBe(1);
    /* Tekrar gelinen aşama ziyaret sayısını taşır */
    expect(adim("test").ziyaret).toBe(2);
    expect(adim("gelistirme").ziyaret).toBe(2);

    /* Geri dönüşü OLMAYAN aşamalar 0 taşır — sayaç her yere yazılmıyor */
    expect(adim("test").geri_donus).toBe(0);
    expect(adim("planlama").ziyaret).toBe(1);
    expect(adim("planlama").geri_donus).toBe(0);

    /* Hiç uğranmamış aşama: ziyaret 0 ve "bekliyor" */
    expect(adim("hazir").ziyaret).toBe(0);
    expect(adim("hazir").durum).toBe("bekliyor");

    /* Paket ŞU AN test'te; ikinci-dogrulayici "gecildi" görünse de artık
       yanındaki geri_donus onu temiz geçmiş paketten AYIRIYOR */
    expect(adim("test").durum).toBe("simdi");
    expect(adim("ikinci-dogrulayici").durum).toBe("gecildi");
  });

  it("düz ilerleyen paketin hiçbir aşamasında geri dönüş YOKTUR (simetrik negatif)", () => {
    paketKur("PKG-DUZ", [
      gec(null, "planlama"),
      gec("planlama", "canonical-kaydi"),
      gec("canonical-kaydi", "gelistirme"),
      gec("gelistirme", "test"),
      gec("test", "ikinci-dogrulayici"),
    ]);

    const cizelge = cockpitGorunumu().zaman_cizelgesi.deger;
    expect(cizelge.map((a) => a.geri_donus)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(cizelge.filter((a) => a.ziyaret > 1)).toEqual([]);
  });
});

/* ── Bozuk dosya: çökme YOK, sessiz yutma da YOK ──────────────────────── */

describe("cockpitGorunumu — bozuk journal", () => {
  const bozukYaz = (id: string): void => {
    fs.appendFileSync(journalFile(id), "{bu satır JSON değil\n", "utf8");
  };

  it("bozuk satır sunucuyu ÇÖKERTMEZ; hata GÖRÜNÜR ve paketi adıyla söyler", () => {
    paketKur("PKG-BOZUK");
    bozukYaz("PKG-BOZUK");

    const g = cockpitGorunumu();
    expect(g.hatalar.deger).toHaveLength(1);
    expect(g.hatalar.deger[0].kaynak).toBe("PKG-BOZUK");
    expect(g.hatalar.deger[0].mesaj).toMatch(/okunamadı/);
    /* Satır numarası kaybolmaz: hangi satırın bozuk olduğu operatörün işidir */
    expect(g.hatalar.deger[0].mesaj).toMatch(/:2:/);
  });

  it("bozuk paket SAĞLAM paketleri ekrandan silmez", () => {
    paketKur("PKG-SAGLAM");
    msIlerle();
    paketKur("PKG-YIKIK");
    bozukYaz("PKG-YIKIK");

    const g = cockpitGorunumu();
    expect(g.gecmis.deger.map((p) => p.package_id)).toEqual(["PKG-SAGLAM"]);
    expect(g.aktif_paket.deger?.package_id).toBe("PKG-SAGLAM");
    expect(g.hatalar.deger.map((h) => h.kaynak)).toEqual(["PKG-YIKIK"]);
  });
});

/* ── (3) SUNUCU — gerçek portta ───────────────────────────────────────── */

async function kapat(s: http.Server): Promise<void> {
  s.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    s.close((e) => (e === undefined || e === null ? resolve() : reject(e)));
  });
}

interface AcikSunucu {
  server: http.Server;
  taban: string;
  adres: string;
}

async function sunucuAc(): Promise<AcikSunucu> {
  const server = cockpitSunucusu(0);
  acikSunucular.push(server);
  await once(server, "listening");
  const adr = server.address();
  if (adr === null || typeof adr === "string") throw new Error("dinleme adresi alınamadı");
  return { server, taban: `http://127.0.0.1:${adr.port}`, adres: adr.address };
}

describe("cockpitSunucusu — uçlar", () => {
  it("YALNIZ 127.0.0.1'e bağlanır (ağa açılmaz)", async () => {
    const s = await sunucuAc();
    expect(s.adres).toBe("127.0.0.1");
    expect(s.adres).not.toBe("0.0.0.0");
  });

  it("GET / → 200 text/html ve önbelleklenmez", async () => {
    paketKur("PKG-HTML");
    const s = await sunucuAc();
    const r = await fetch(`${s.taban}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/^text\/html/);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect((await r.text()).length).toBeGreaterThan(0);
  });

  it("GET /api/view → 200 JSON ve görünümün TAMAMINI taşır", async () => {
    paketKur("PKG-API", [not("api notu")]);
    const s = await sunucuAc();
    const r = await fetch(`${s.taban}/api/view`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/^application\/json/);

    const g = (await r.json()) as Record<string, { sinif?: string; deger?: unknown }>;
    for (const ad of OLCUM_ALANLARI) expect(g[ad].sinif, ad).toBe("olcum");
    /* Sınıflar TELDEN GEÇTİKTEN sonra da ayrı: JSON serileştirmesi
       sarmalayıcıyı düzleştirmiş olsaydı ekranda sınıf ayrımı kalmazdı */
    expect(g.notlar.sinif).toBe("anlati");
    expect(g.hatalar.sinif).toBe("canli");
    expect(["canli", "canli-okunamadi"]).toContain(g.git.sinif);
    expect((g.aktif_paket.deger as { package_id: string }).package_id).toBe("PKG-API");
  });

  it("GET /saglik → 200 {ok:true}", async () => {
    const s = await sunucuAc();
    const r = await fetch(`${s.taban}/saglik`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("bilinmeyen yol → 404", async () => {
    const s = await sunucuAc();
    const r = await fetch(`${s.taban}/olmayan-yol`);
    expect(r.status).toBe(404);
    const govde = (await r.json()) as { uclar: string[] };
    expect(govde.uclar).toContain("/api/view");
  });

  it("her istekte diskten okur: iki GET arasında yazılan olay İKİNCİSİNDE görünür", async () => {
    paketKur("PKG-CANLI");
    const s = await sunucuAc();

    const bir = (await (await fetch(`${s.taban}/api/view`)).json()) as {
      aktif_paket: { deger: { olay_sayisi: number } };
    };
    expect(bir.aktif_paket.deger.olay_sayisi).toBe(1);

    appendEvent("PKG-CANLI", not("istekler arası olay"), AGENT);

    const iki = (await (await fetch(`${s.taban}/api/view`)).json()) as {
      aktif_paket: { deger: { olay_sayisi: number } };
    };
    expect(iki.aktif_paket.deger.olay_sayisi).toBe(2);
  });
});

describe("cockpitSunucusu — SALT-OKUNUR (11.4)", () => {
  it("GET DIŞINDAKİ her yöntem 405 ve Allow: GET", async () => {
    const s = await sunucuAc();
    for (const yontem of ["POST", "PUT", "DELETE", "PATCH"]) {
      const r = await fetch(`${s.taban}/`, { method: yontem });
      expect(r.status, yontem).toBe(405);
      expect(r.headers.get("allow"), yontem).toBe("GET");
      await r.text();
    }
  });

  it("POST /api/view de reddedilir (uç değil YÖNTEM kapalıdır)", async () => {
    const s = await sunucuAc();
    const r = await fetch(`${s.taban}/api/view`, {
      method: "POST",
      body: JSON.stringify({ note: "sızmaya çalışan yazma" }),
      headers: { "content-type": "application/json" },
    });
    expect(r.status).toBe(405);
    await r.text();
  });

  it("hiçbir istek journal'ı BÜYÜTMEZ (bayt bayt ölçülür)", async () => {
    paketKur("PKG-DOKUNMA");
    const dizin = process.env.TEZGAH_JOURNAL_DIR as string;
    const parmakIzi = (): string =>
      fs
        .readdirSync(dizin)
        .sort()
        .map((ad) => `${ad}:${fs.readFileSync(path.join(dizin, ad)).length}`)
        .join("|");

    const once = parmakIzi();
    const s = await sunucuAc();
    await (await fetch(`${s.taban}/`)).text();
    await (await fetch(`${s.taban}/api/view`)).text();
    await (await fetch(`${s.taban}/saglik`)).text();
    await (await fetch(`${s.taban}/`, { method: "POST", body: "x" })).text();
    await (await fetch(`${s.taban}/yok`)).text();

    expect(parmakIzi()).toBe(once);
  });
});

describe("cockpitSunucusu — bozuk journal", () => {
  it("bozuk dosya varken GET / cevap VERİR ve hatayı SAYFADA gösterir", async () => {
    paketKur("PKG-KIRIK");
    fs.appendFileSync(journalFile("PKG-KIRIK"), "}}bozuk\n", "utf8");

    const s = await sunucuAc();
    const r = await fetch(`${s.taban}/`);
    /* Çökme yok: sunucu ayakta ve gövde geliyor */
    expect(r.status).toBeLessThan(600);
    const html = await r.text();
    expect(html).toContain("cockpit-okuma-hatalari");
    expect(html).toContain("PKG-KIRIK");
    expect(html).toMatch(/okunamad/);

    /* Sunucu bir sonraki isteği de karşılıyor (süreç ayakta) */
    expect((await fetch(`${s.taban}/saglik`)).status).toBe(200);
  });

  it("bozuk dosya varken /api/view hatayı JSON'da taşır", async () => {
    paketKur("PKG-KIRIK2");
    fs.appendFileSync(journalFile("PKG-KIRIK2"), "{yok\n", "utf8");

    const s = await sunucuAc();
    const g = (await (await fetch(`${s.taban}/api/view`)).json()) as {
      hatalar: { sinif: string; deger: { kaynak: string }[] };
    };
    expect(g.hatalar.sinif).toBe("canli");
    expect(g.hatalar.deger.map((h) => h.kaynak)).toEqual(["PKG-KIRIK2"]);
  });
});
