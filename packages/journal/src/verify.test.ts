/* DÖRT KATMANLI DOĞRULAYICI testleri (Canonical 11.3 değişmezlik).

   Testlerin çekirdek iddiası şudur: KATMANLAR BİRBİRİNİN YERİNE GEÇMEZ.
     · Bir satırın içeriği düzenlenirse  → yalnız ZİNCİR yakalar (seq bozulmaz)
     · Bir satır çıkarılıp zincir yeniden hesaplanırsa → yalnız YAPI yakalar
       (zincir o dosyayı kusursuz bulur)
   İki senaryo da ayrı ayrı kurulur ve DİĞER katmanın temiz kaldığı da iddia
   edilir. "İhlal var" demek yetmez; hangi katmanın gördüğü sabitlenmezse
   katmanlardan biri sessizce ölse test yine yeşil kalırdı. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { journalHashInput, type JournalActor, type JournalEvent, type JournalLine } from "@tezgah/shared";
import { baytOneki, kaynakIcerigiTara, numstatSilinen, type JournalViolation } from "./verify.js";

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
  ROOT_DIR: string;
  listPackageIds: () => string[];
  verifyAllJournals: () => JournalViolation[];
}

/** TEZGAH_JOURNAL_DIR'i kurar ve modülleri TAZE yükler. resetModules şart:
    paths.js env'i modül yüklenirken okuyorsa, ilk yükleme kalıcı olurdu. */
async function ortamKur(dir: string | null): Promise<Ortam> {
  vi.resetModules();
  if (dir === null) delete process.env.TEZGAH_JOURNAL_DIR;
  else process.env.TEZGAH_JOURNAL_DIR = dir;
  const paths = await import("./paths.js");
  const store = await import("./store.js");
  const verify = await import("./verify.js");
  return {
    journalFile: paths.journalFile,
    journalDir: paths.journalDir,
    ROOT_DIR: paths.ROOT_DIR,
    listPackageIds: store.listPackageIds,
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
  delete process.env.GIT_DIR;
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

/* ── Katman B'nin SAF yargıları ───────────────────────────────────────── */

/* Bu iki fonksiyon append-only'nin B1/B2 kararını TAŞIR ama uçtan uca git
   harness'ı olmadan hiç pozitif koşmuyordu: git katmanı bu depoda temiz
   olduğu için ikisi de yalnız "hiçbir şey bulmama" yolundan geçiyordu.
   Karar veren kod, kararın yanlış tarafından da sınanmadıkça ölçülmemiştir. */

describe("numstatSilinen — B1: SİLİNEN satır sayısı", () => {
  it("silinen sütununu okur", () => {
    expect(numstatSilinen("0\t1\tdocs/journal/events/x.jsonl")).toBe(1);
    expect(numstatSilinen("3\t0\tdocs/journal/events/x.jsonl")).toBe(0);
    expect(numstatSilinen("12\t34\tyol")).toBe(34);
  });

  it("EKLENEN sütunuyla karıştırılmaz", () => {
    /* Sütunlar ters okunsaydı "0 eklendi, 7 silindi" satırı 0 dönerdi ve
       silme sessizce geçerdi — B1'in tam tersi. */
    expect(numstatSilinen("7\t0\tyol")).toBe(0);
    expect(numstatSilinen("0\t7\tyol")).toBe(7);
  });

  it("ikili dosya bildirimi 0 SAYILMAZ, hata döner", () => {
    expect(numstatSilinen("-\t-\tbin/app.exe")).toEqual({ hata: "numstat ikili dosya bildirdi" });
  });

  it("sayı olmayan sütun sessizce 0'a düşmez", () => {
    expect(numstatSilinen("x\ty\tyol")).toEqual({ hata: expect.stringContaining("sayı değil") });
  });

  it("KISMEN sayı olan sütun da reddedilir — parseInt tek başına yetmez", () => {
    /* Number.parseInt("1abc") === 1 döner ve sonludur; regex olmasa bozuk bir
       numstat satırı geçerli ölçüm sanılır, silme sayısı 1 diye okunurdu. */
    expect(numstatSilinen("0\t1abc\tyol")).toEqual({ hata: expect.stringContaining("sayı değil") });
    expect(numstatSilinen("0\t-1\tyol")).toEqual({ hata: expect.stringContaining("sayı değil") });
  });

  it("iki sütuna bölünemeyen satır çözümlenemez", () => {
    expect(numstatSilinen("bozuk")).toEqual({ hata: expect.stringContaining("çözümlenemedi") });
    expect(numstatSilinen("")).toEqual({ hata: expect.stringContaining("çözümlenemedi") });
  });
});

describe("baytOneki — B2: HEAD sürümü çalışma ağacının ÖNEKİ mi", () => {
  const b = (s: string): Buffer => Buffer.from(s, "utf8");

  it("üstüne satır eklenmiş dosya → true (append-only'nin kendisi)", () => {
    expect(baytOneki(b("satir1\nsatir2\n"), b("satir1\nsatir2\nsatir3\n"))).toBe(true);
  });

  it("birebir aynı içerik → true (commit'ten beri değişmemiş)", () => {
    expect(baytOneki(b("satir1\n"), b("satir1\n"))).toBe(true);
  });

  it("boş önek her dosyanın önekidir", () => {
    expect(baytOneki(b(""), b("satir1\n"))).toBe(true);
  });

  it("eşit uzunlukta 7. bayttan ayrışan içerik → false", () => {
    /* Satır içi düzenleme: uzunluk KORUNUR, tek bayt değişir. Yalnız uzunluğa
       bakan bir karşılaştırma bu saldırıya kördür. */
    expect(b("satir-A").length).toBe(b("satir-B").length);
    expect(baytOneki(b("satir-A"), b("satir-B"))).toBe(false);
  });

  it("önek daha uzunsa → false (dosya KISALMIŞ)", () => {
    expect(baytOneki(b("satir1\nsatir2\n"), b("satir1\n"))).toBe(false);
  });
});

/* ── Katman B: SİLME denetimi (git-izlenen ⊆ çalışma ağacı) ───────────── */

/* ÖLÇÜLMÜŞ KÖR NOKTA: denetlenecek id listesi çalışma ağacından türetildiği
   için bir journal dosyasını TAMAMEN silmek dört katmanın hiçbirine
   görünmüyordu — `verify` exit 0 diyordu. Kayıt düzenlemek anında
   yakalanırken silmek görünmezdi.

   NEDEN GIT_DIR: verify.ts'in git komutları `cwd: ROOT_DIR` ile koşar ve
   ROOT_DIR modül konumundan türer — env ile taşınamaz; denetlenen yol da
   journalDir()'dir. Senaryoyu doğrudan kurmak gerçek depoya dosya ekleyip
   commit'leyip silmeyi gerektirirdi (çalışma ağacı kirlenir, tarihçe kirlenir).
   GIT_DIR ise git'in BAKTIĞI depoyu değiştirir; GIT_WORK_TREE verilmediğinde
   cwd (=ROOT_DIR) o depo için çalışma ağacının tepesi sayılır. Böylece
   "git biliyor, çalışma ağacında yok" durumu gerçek depoya TEK BAYT
   yazmadan kurulur ve yalnız OKUYAN git komutları koşar. */

const SILINEN_ID = "PKG-SILINMIS-DENEK-01";
const OLAY_YOLU = "docs/journal/events";

function gitKomut(cwd: string, args: readonly string[]): void {
  execFileSync("git", [...args], { cwd, stdio: "ignore" });
}

/** Verilen yolları commit'leyip sonra silen tek kullanımlık depo; .git yolunu döner. */
function sahteDepo(yollar: readonly string[], sil: "worktree" | "commit"): string {
  const kok = geciciDizin();
  gitKomut(kok, ["init", "-q", "."]);
  gitKomut(kok, ["config", "user.email", "dogrulayici@test.local"]);
  gitKomut(kok, ["config", "user.name", "dogrulayici"]);
  for (const y of yollar) {
    const tam = path.join(kok, y);
    fs.mkdirSync(path.dirname(tam), { recursive: true });
    fs.writeFileSync(tam, "{}\n", "utf8");
  }
  gitKomut(kok, ["add", "-A"]);
  gitKomut(kok, ["commit", "-qm", "journal eklendi"]);

  if (sil === "commit") {
    /* `git rm` + commit: dosya artık İZLENMİYOR → ls-files onu görmez,
       tek tanık silme TARİHÇESİDİR. */
    gitKomut(kok, ["rm", "-q", ...yollar]);
    gitKomut(kok, ["commit", "-qm", "journal SILINDI"]);
  } else {
    /* Düz `rm`: dosya HÂLÂ izleniyor, tarihçede silme yok → tek tanık ls-files. */
    for (const y of yollar) fs.rmSync(path.join(kok, y));
  }
  return path.join(kok, ".git");
}

function gitDirIle<T>(gitDir: string, f: () => T): T {
  process.env.GIT_DIR = gitDir;
  try {
    return f();
  } finally {
    delete process.env.GIT_DIR;
  }
}

describe("git-izlenen journal çalışma ağacında YOKSA", () => {
  /* İKİ TANIK AYRI AYRI sınanır: biri diğerinin yerine geçmez. ls-files
     kaynağı kaldırılsa "worktree" senaryosu, --diff-filter=D kaynağı
     kaldırılsa "commit" senaryosu görünmez kalırdı. */
  it.each([
    ["çalışma ağacından silinmiş, HÂLÂ izleniyor (ls-files tanığı)", "worktree"],
    ["git rm + commit — artık izlenmiyor (--diff-filter=D tanığı)", "commit"],
  ] as const)("%s → git ihlali", async (_ad, sil) => {
    const ortam = await ortamKur(null); // ÜRETİM yolu: journalDir = <kök>/docs/journal/events
    expect(ortam.listPackageIds()).not.toContain(SILINEN_ID);

    const gitDir = sahteDepo(
      [
        `${OLAY_YOLU}/${SILINEN_ID}.jsonl`,
        /* Aşağıdaki üçü ihlal SAYILMAMALI — id ayrıştırmasının süzgeçleri:
           git pathspec'inde `*` bölü işaretini de geçer, bu yüzden alt
           dizindeki dosya `events/*.jsonl` ile EŞLEŞİR ve elenmesi gerekir. */
        `${OLAY_YOLU}/alt/IC-ICE-PAKET.jsonl`,
        `${OLAY_YOLU}/OKUBENI.md`,
        "docs/journal/BASKA-PAKET.jsonl",
      ],
      sil
    );

    const ihlaller = gitDirIle(gitDir, ortam.verifyAllJournals);
    const gitIhlalleri = ihlaller.filter((x) => x.layer === "git");

    /* TAM KÜME iddiası: fazladan bir id de eksik bir id kadar hatadır */
    expect(gitIhlalleri.map((x) => x.package_id)).toEqual([SILINEN_ID]);
    expect(gitIhlalleri[0].message).toMatch(/append-only ihlali: journal dosyası SİLİNMİŞ/);
  });

  it("çalışma ağacında olup git'te olmayan dosya İHLAL DEĞİLDİR (yeni paket)", async () => {
    /* Kural TEK YÖNLÜ: git-izlenen ⊆ çalışma-ağacı. Tersi de ihlal sayılsaydı
       henüz commit edilmemiş her yeni paket doğrulayıcıyı kırmızıya çevirir,
       kapı da okunmaz olurdu. Boş bir depo, gerçek journal'ın tamamını
       "git'te yok" durumuna sokar. */
    const ortam = await ortamKur(null);
    expect(ortam.listPackageIds().length).toBeGreaterThan(0);

    const bosDepo = sahteDepo([".yer-tutucu"], "worktree");
    const ihlaller = gitDirIle(bosDepo, ortam.verifyAllJournals);

    expect(ihlaller.filter((x) => x.layer === "git")).toEqual([]);
  });
});

/* ── Gerçek depo ──────────────────────────────────────────────────────── */

describe("gerçek depo journal'ı", () => {
  it("ihlalsiz döner VE denetlenen üretim kümesi BOŞ DEĞİLDİR", async () => {
    /* TEZGAH_JOURNAL_DIR YOK → üretim yolu. Bu iddia, Journal bütünlüğünü
       test kapısının kendisine bağlar: bozuk bir journal main'e merge
       edilemez, çünkü `npm test` kırmızıya döner. */
    const ortam = await ortamKur(null);

    /* Seam GERÇEKTEN kapalı mı — sızmış bir env bu testi geçici dizine
       yöneltir ve iddia hiçbir üretim dosyasına dokunmadan yeşil kalırdı. */
    expect(path.resolve(ortam.journalDir())).toBe(
      path.resolve(ortam.ROOT_DIR, "docs", "journal", "events")
    );

    /* FAIL-OPEN KAPATILDI. Eski sürüm yalnız `toEqual([])` diyor ve
       "henüz hiç journal yok" ile "journal SİLİNDİ"yi ayırt edemiyordu:
       dosya kaldırılınca denetlenecek küme boşalıyor, dört katman susuyor,
       iddia yeşil kalıyordu — kapının kendisi fail-open'dı.
       Paket id'si SABİT YAZILMAZ: küme BOŞ DEĞİL diye ölçülür, böylece yeni
       paket eklendiğinde veya adı değiştiğinde testin bakım borcu doğmaz. */
    expect(ortam.listPackageIds().length).toBeGreaterThan(0);

    expect(ortam.verifyAllJournals()).toEqual([]);
  });
});
