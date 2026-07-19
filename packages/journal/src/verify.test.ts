/* DÖRT KATMANLI DOĞRULAYICI testleri (Canonical 11.3 değişmezlik).

   Testlerin çekirdek iddiası şudur: KATMANLAR BİRBİRİNİN YERİNE GEÇMEZ.
     · Bir satırın içeriği düzenlenirse  → yalnız ZİNCİR yakalar (seq bozulmaz)
     · Bir satır çıkarılıp zincir yeniden hesaplanırsa → yalnız YAPI yakalar
       (zincir o dosyayı kusursuz bulur)
   İki senaryo da ayrı ayrı kurulur ve DİĞER katmanın temiz kaldığı da iddia
   edilir. "İhlal var" demek yetmez; hangi katmanın gördüğü sabitlenmezse
   katmanlardan biri sessizce ölse test yine yeşil kalırdı. */

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { journalHashInput, type JournalActor, type JournalEvent, type JournalLine } from "@tezgah/shared";
import { kaynakIcerigiTara, type JournalViolation } from "./verify.js";

/* Fixture hash'i BİLEREK node:crypto ile hesaplanır, ./hash.js ile değil:
   doğrulayıcının kullandığı digest'i fixture de kullansaydı, ikisi birlikte
   yanlış olsa test yine yeşil kalırdı. Bağımsız hesap = çapraz denetim. */
const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

const PKG = "PKG-TEST-01";
const AKTOR: JournalActor = { kind: "agent", id: "ajan-dogrulayici", role: "dogrulayici" };

const temizlenecek: string[] = [];

/* ── Fixture kurucu ───────────────────────────────────────────────────── */

interface Taslak {
  seq: number;
  ts: string;
  event: JournalEvent;
}

function satirKur<E extends JournalEvent>(seq: number, ts: string, event: E, prev: string | null): JournalLine {
  const govde = { ...event, v: 1, package_id: PKG, seq, ts, actor: AKTOR, prev };
  return { ...govde, hash: sha(journalHashInput(govde)) };
}

/** Verilen seq'leri KORUYARAK zinciri hesaplar. Boşluk açıp yeniden zincirleme
    saldırısı bu yüzden kurulabiliyor: seq girdi, zincir çıktıdır. */
function zincirle(taslaklar: readonly Taslak[]): JournalLine[] {
  const out: JournalLine[] = [];
  let prev: string | null = null;
  for (const t of taslaklar) {
    /* Açık tür şart: satır `prev`'den doğuyor, `prev` de satırın hash'inden —
       tsc bunu döngüsel çıkarım sayıyor (TS7022). */
    const satir: JournalLine = satirKur(t.seq, t.ts, t.event, prev);
    out.push(satir);
    prev = satir.hash;
  }
  return out;
}

const OLAYLAR: readonly Taslak[] = [
  {
    seq: 1,
    ts: "2026-07-19T10:00:00.000Z",
    event: {
      type: "package_declared",
      payload: {
        name: "Test paketi",
        purpose: "doğrulayıcı testi",
        canonical_version: "4.1.0",
        canonical_sections: ["11.3"],
        adr_tdr: ["TDR-001"],
        modules: ["packages/journal"],
        contracts: ["JournalLine v1"],
        scope_in: ["olay kaydı"],
        scope_out: ["cockpit"],
        risk_class: "dusuk",
      },
    },
  },
  {
    seq: 2,
    ts: "2026-07-19T10:01:00.000Z",
    event: { type: "stage_changed", payload: { from: null, to: "planlama" } },
  },
  {
    seq: 3,
    ts: "2026-07-19T10:02:00.000Z",
    event: { type: "note", payload: { text: "ilk not satiri" } },
  },
  {
    seq: 4,
    ts: "2026-07-19T10:03:00.000Z",
    event: { type: "stage_changed", payload: { from: "planlama", to: "canonical-kaydi" } },
  },
];

/* ── Ortam ────────────────────────────────────────────────────────────── */

interface Ortam {
  journalFile: (id: string) => string;
  journalDir: () => string;
  verifyAllJournals: () => JournalViolation[];
}

/** TEZGAH_JOURNAL_DIR'i kurar ve modülleri TAZE yükler. resetModules şart:
    paths.js env'i modül yüklenirken okuyorsa, ilk yükleme kalıcı olurdu. */
async function ortamKur(dir: string | null): Promise<Ortam> {
  vi.resetModules();
  if (dir === null) delete process.env.TEZGAH_JOURNAL_DIR;
  else process.env.TEZGAH_JOURNAL_DIR = dir;
  const paths = await import("./paths.js");
  const verify = await import("./verify.js");
  return {
    journalFile: paths.journalFile,
    journalDir: paths.journalDir,
    verifyAllJournals: verify.verifyAllJournals,
  };
}

function geciciDizin(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "tezgah-journal-"));
  temizlenecek.push(d);
  return d;
}

function jsonlYaz(dosya: string, govde: string): void {
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  fs.writeFileSync(dosya, govde, "utf8");
}

const serile = (lines: readonly JournalLine[]): string =>
  `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`;

/** Katmanı okunabilir metne indirger — kalan testte mesaj görünür olsun */
const katman = (ihlaller: readonly JournalViolation[], l: JournalViolation["layer"]): string[] =>
  ihlaller.filter((x) => x.layer === l).map((x) => `${x.package_id}: ${x.message}`);

afterEach(() => {
  delete process.env.TEZGAH_JOURNAL_DIR;
});

afterAll(() => {
  for (const d of temizlenecek) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* geçici dizin temizliği testin sonucunu etkilemez */
    }
  }
});

/* ── Katman C+D: sağlam journal ───────────────────────────────────────── */

describe("sağlam journal", () => {
  it("yapi ve zincir katmanları temiz döner", async () => {
    const dir = geciciDizin();
    const ortam = await ortamKur(dir);
    /* TEZGAH_JOURNAL_DIR seam'i gerçekten kuruldu mu — kurulmadıysa test
       repo'nun kendi journal'ını ölçer ve yanıltıcı biçimde yeşil olurdu. */
    expect(path.resolve(ortam.journalDir()).startsWith(path.resolve(dir))).toBe(true);

    jsonlYaz(ortam.journalFile(PKG), serile(zincirle(OLAYLAR)));

    const ihlaller = ortam.verifyAllJournals();
    expect(katman(ihlaller, "yapi")).toEqual([]);
    expect(katman(ihlaller, "zincir")).toEqual([]);
  });

  it("depo dışı journal dizininde git katmanı SESSİZ KALMAZ, ölçülemediğini söyler", async () => {
    const dir = geciciDizin();
    const ortam = await ortamKur(dir);
    jsonlYaz(ortam.journalFile(PKG), serile(zincirle(OLAYLAR)));

    const gitIhlalleri = katman(ortam.verifyAllJournals(), "git");
    /* 11.3: koşulmayan denetim "koşuldu" diye geçilemez. Geçici dizin git
       ağacının dışındadır; doğru cevap sessizlik değil, ölçülemedi'dir. */
    expect(gitIhlalleri.length).toBe(1);
    expect(gitIhlalleri[0]).toMatch(/git denetimi koşulamadı/);
  });
});

/* ── Katman D yalnız: içerik düzenlemesi ──────────────────────────────── */

describe("bir satır elle düzenlenirse", () => {
  it("ZİNCİR ihlali doğar, YAPI temiz kalır", async () => {
    const dir = geciciDizin();
    const ortam = await ortamKur(dir);
    const govde = serile(zincirle(OLAYLAR));
    /* Dosyayı editörle açıp bir kelimeyi değiştirmenin birebir karşılığı:
       seq bozulmaz, satır sayısı değişmez, git diff'e `1 1` görünür. */
    const duzenlenmis = govde.replace("ilk not satiri", "ELLE DEGISTIRILDI");
    expect(duzenlenmis).not.toBe(govde);
    jsonlYaz(ortam.journalFile(PKG), duzenlenmis);

    const ihlaller = ortam.verifyAllJournals();
    const zincir = katman(ihlaller, "zincir");
    expect(zincir.length).toBe(1);
    expect(zincir[0]).toMatch(/seq 3: hash tutmuyor/);
    /* Yapı katmanı bu saldırıya KÖRDÜR — zincirin var olma sebebi budur. */
    expect(katman(ihlaller, "yapi")).toEqual([]);
  });
});

/* ── Katman C yalnız: satır çıkarma ───────────────────────────────────── */

describe("bir satır çıkarılıp zincir yeniden hesaplanırsa", () => {
  it("YAPI ihlali doğar (seq boşluğu), ZİNCİR temiz kalır", async () => {
    const dir = geciciDizin();
    const ortam = await ortamKur(dir);
    /* Saldırganın en temiz hamlesi: satırı sil ve kalanları yeniden zincirle.
       Hash zinciri kusursuz görünür; boşluksuz seq bunu tek başına yakalar. */
    const eksik = OLAYLAR.filter((o) => o.seq !== 3);
    jsonlYaz(ortam.journalFile(PKG), serile(zincirle(eksik)));

    const ihlaller = ortam.verifyAllJournals();
    const yapi = katman(ihlaller, "yapi");
    expect(yapi.length).toBe(1);
    expect(yapi[0]).toMatch(/seq boşluğu\/atlaması: beklenen 3, bulunan 4/);
    /* Zincir katmanı bu saldırıya KÖRDÜR — seq'in var olma sebebi budur. */
    expect(katman(ihlaller, "zincir")).toEqual([]);
  });

  it("ilk satır bildirim değilse YAPI yakalar", async () => {
    const dir = geciciDizin();
    const ortam = await ortamKur(dir);
    const bildirimsiz = OLAYLAR.filter((o) => o.seq !== 1).map((o, i) => ({ ...o, seq: i + 1 }));
    jsonlYaz(ortam.journalFile(PKG), serile(zincirle(bildirimsiz)));

    const yapi = katman(ortam.verifyAllJournals(), "yapi");
    expect(yapi.some((x) => /ilk satır package_declared olmalı/.test(x))).toBe(true);
  });
});

/* ── Katman A: kaynak taraması ────────────────────────────────────────── */

describe("kaynak tarayıcısı — boş sonucun anlamlı olması için", () => {
  /* Aşağıdaki "ihlal yok" iddiası, tarayıcı ölmüş olsa da yeşil kalırdı.
     Bu yüzden önce tarayıcının DOLU sonuç üretebildiği sınanır. */

  it("üzerine-yazan çağrıyı YAKALAR", () => {
    const bulgular = kaynakIcerigiTara("ornek.ts", 'writeFileSync(dosya, "govde");');
    expect(bulgular.length).toBe(1);
    expect(bulgular[0]).toMatch(/ornek\.ts:1 üzerine-yazan çağrı: writeFileSync/);
  });

  it("ad alanı üzerinden yapılan çağrıyı da yakalar", () => {
    expect(kaynakIcerigiTara("ornek.ts", "fs.writeFileSync(x, y);").length).toBe(1);
  });

  it.each(["truncateSync", "rmSync", "createWriteStream", "ftruncateSync"])(
    "%s çağrısını yakalar",
    (ad) => {
      expect(kaynakIcerigiTara("ornek.ts", `${ad}(x);`).length).toBeGreaterThan(0);
    }
  );

  it("ftruncateSync çağrısı truncateSync deseniyle ÇİFT sayılmaz", () => {
    const bulgular = kaynakIcerigiTara("ornek.ts", "ftruncateSync(fd, 0);");
    expect(bulgular.length).toBe(1);
    expect(bulgular[0]).toMatch(/ftruncateSync/);
  });

  it("appendFileSync SERBESTTİR — append-only'nin kendisi budur", () => {
    expect(kaynakIcerigiTara("ornek.ts", "appendFileSync(dosya, satir);")).toEqual([]);
  });

  it("unlinkSync yalnız store.ts'te serbesttir", () => {
    expect(kaynakIcerigiTara("store.ts", "fs.unlinkSync(kilit);")).toEqual([]);
    expect(kaynakIcerigiTara("gates.ts", "fs.unlinkSync(kilit);").length).toBe(1);
  });

  it("KURALI ANLATAN AÇIKLAMA SATIRI ihlal DEĞİLDİR", () => {
    /* Gerileme testi: ilk sürüm düz ad araması yapıyor ve gates.ts'in bu
       satırını ihlal sanıyordu. Kuralı anlatan cümleyi kuralın ihlali saymak
       doğrulayıcıyı kalıcı kırmızıda tutardı. */
    const yorum = " * fs.writeFileSync bilinçli KULLANILMAZ (kaynak taraması yasaklıyor) —";
    expect(kaynakIcerigiTara("gates.ts", yorum)).toEqual([]);
  });

  it("içe aktarım listesinde adın geçmesi tek başına ihlal değildir", () => {
    /* Kapsam şerhi: tarama ÇAĞRI biçimini ölçer, adın varlığını değil. */
    expect(kaynakIcerigiTara("ornek.ts", 'import { writeFileSync } from "node:fs";')).toEqual([]);
  });
});

describe("kaynak katmanı", () => {
  it("packages/journal/src'te üzerine-yazan çağrı YOKTUR", async () => {
    const ortam = await ortamKur(geciciDizin());
    const kaynakIhlalleri = katman(ortam.verifyAllJournals(), "kaynak");
    expect(kaynakIhlalleri).toEqual([]);
  });

  it("kaynak katmanı journal dosyasından BAĞIMSIZ koşar (hiç journal yokken de)", async () => {
    /* Katman yalıtımı: paket listesi boşken de tarama yapılmalı. Aksi hâlde
       ilk paket yazılana kadar yazma yüzeyi denetimsiz kalırdı. */
    const ortam = await ortamKur(geciciDizin());
    const ihlaller = ortam.verifyAllJournals();
    expect(katman(ihlaller, "yapi")).toEqual([]);
    expect(katman(ihlaller, "kaynak")).toEqual([]);
  });
});

/* ── Gerçek depo ──────────────────────────────────────────────────────── */

describe("gerçek depo journal'ı", () => {
  it("verifyAllJournals() ihlalsiz döner — kök npm test bunu kapıya bağlar", async () => {
    /* TEZGAH_JOURNAL_DIR YOK → üretim yolu. Bu iddia, Journal bütünlüğünü
       test kapısının kendisine bağlar: bozuk bir journal main'e merge
       edilemez, çünkü `npm test` kırmızıya döner.
       (Henüz hiç journal dosyası yoksa boş dizi DOĞRU cevaptır.) */
    const ortam = await ortamKur(null);
    expect(ortam.verifyAllJournals()).toEqual([]);
  });
});
