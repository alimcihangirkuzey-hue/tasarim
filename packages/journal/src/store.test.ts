/* Cockpit modül fazı 0 — YAZMA KATMANI TESTLERİ (Canonical 11.3/11.5/11.7).

   İki şey aynı anda sınanır: (1) zincirin doğru KURULDUĞU, (2) bozuk kaydın
   diske ULAŞMADIĞI. İkincisi için her reddedilen yazmada dosya boyutu BAYT
   olarak ölçülür — "hata fırladı" yetmez, yarım satır bırakmadığı da görülmeli.

   Env mkdtemp ile izole edilir ve DÜZ STATİK import kullanılır: paths.ts env'i
   fonksiyon içinde okuduğu için `await import()` gerekmiyor. Bu dosyanın statik
   import'la çalışıyor olması, o kuralın kendisinin testidir (bkz. yol testi). */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { kaynakIcerigiTara } from "./verify.js";
import {
  verifyJournalChain,
  type JournalActor,
  type JournalEvent,
  type JournalGateRun,
  type JournalStage,
} from "@tezgah/shared";
import { sha256 } from "./hash.js";
import { evidenceDir, journalDir, journalFile, lockDir } from "./paths.js";
import { appendEvent, listPackageIds, readJournal } from "./store.js";

const PKG = "PKG-TEST-01";

const OWNER: JournalActor = { kind: "human", id: "urun-sahibi", role: "urun-sahibi" };
const AGENT: JournalActor = { kind: "agent", id: "ajan-1", role: "uygulayici" };

const DECLARED: JournalEvent = {
  type: "package_declared",
  payload: {
    name: "Package Journal yazma katmanı",
    purpose: "Olay akışının tek yazma kapısı",
    canonical_version: "4.1.0",
    canonical_sections: ["11.3", "11.5", "11.7"],
    adr_tdr: [],
    modules: ["packages/journal"],
    contracts: ["appendEvent"],
    scope_in: ["yazma", "kilit", "zincir"],
    scope_out: ["CLI", "kokpit"],
    risk_class: "orta",
  },
};

const NOTE: JournalEvent = { type: "note", payload: { text: "anlatı — ölçüm değil" } };

/** Geçerli MAKİNE kapısı koşumu (11.3 altı kuralın tamamını karşılar) */
function machineGate(over: Partial<JournalGateRun> = {}): JournalEvent {
  return {
    type: "gate_run",
    payload: {
      gate: "typecheck",
      outcome: "gecti",
      origin: "olculdu",
      command: "npm run typecheck",
      cwd: "C:/Users/MacBook/tasarim",
      tool: { name: "tsc", version: "5.6.3" },
      runner_platform: "win32/node24.15.0/npm11.12.1",
      exit_code: 0,
      measured_at: "2026-07-19T10:00:00.000Z",
      duration_ms: 4210,
      values: null,
      method: null,
      evidence: null,
      reason: null,
      raw_evidence: null,
      raw_sha256: null,
      ...over,
    },
  };
}

/** İNSAN kapısı koşumu (gt) — kanıt/aktör kurallarını sınamak için */
function humanGate(over: Partial<JournalGateRun> = {}): JournalEvent {
  return {
    type: "gate_run",
    payload: {
      gate: "gt",
      outcome: "gecti",
      origin: "olculdu",
      command: null,
      cwd: null,
      tool: null,
      runner_platform: null,
      exit_code: null,
      measured_at: null,
      duration_ms: null,
      values: null,
      method: null,
      evidence: "docs/journal/evidence/gt-01.md",
      reason: null,
      raw_evidence: null,
      raw_sha256: null,
      ...over,
    },
  };
}

const stage = (from: JournalStage | null, to: JournalStage): JournalEvent => ({
  type: "stage_changed",
  payload: { from, to },
});

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tezgah-journal-"));
  /* events/ ALT dizin: evidence ve .lock onun kardeşleri olduğu için hepsi
     tmpRoot içinde kalır, os.tmpdir() kirlenmez. */
  process.env.TEZGAH_JOURNAL_DIR = path.join(tmpRoot, "events");
});

afterEach(() => {
  delete process.env.TEZGAH_JOURNAL_DIR;
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const fileSize = (): number => {
  const f = journalFile(PKG);
  return fs.existsSync(f) ? fs.readFileSync(f).length : 0;
};

/* ── Yol çözümü ───────────────────────────────────────────────────────── */

describe("paths — env FONKSİYON İÇİNDE okunur", () => {
  it("journalDir/evidence/lock env'i import'tan SONRA değişse bile izler", () => {
    expect(journalDir()).toBe(path.join(tmpRoot, "events"));
    expect(journalFile(PKG)).toBe(path.join(tmpRoot, "events", `${PKG}.jsonl`));
    expect(evidenceDir()).toBe(path.join(tmpRoot, "evidence"));
    expect(lockDir()).toBe(path.join(tmpRoot, ".lock"));

    /* Aynı süreçte ikinci kez değiştir: modül gövdesinde const olsaydı bu
       satır hiçbir şeyi değiştirmez, testler repo docs/'una yazardı. */
    process.env.TEZGAH_JOURNAL_DIR = path.join(tmpRoot, "ikinci");
    expect(journalDir()).toBe(path.join(tmpRoot, "ikinci"));
  });

  it("ayraç taşıyan packageId yol kurulmadan reddedilir", () => {
    expect(() => journalFile("../kacis")).toThrow(/geçersiz packageId/);
    expect(() => journalFile("a/b")).toThrow(/geçersiz packageId/);
    expect(() => journalFile("")).toThrow(/geçersiz packageId/);
  });
});

/* ── Zincir ───────────────────────────────────────────────────────────── */

describe("appendEvent — seq/prev zinciri", () => {
  it("ilk olay seq=1/prev=null, ikinci olay seq=2/prev=birincinin hash'i", () => {
    const first = appendEvent(PKG, DECLARED, OWNER);
    expect(first.seq).toBe(1);
    expect(first.prev).toBeNull();
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);

    const second = appendEvent(PKG, NOTE, AGENT);
    expect(second.seq).toBe(2);
    expect(second.prev).toBe(first.hash);
    expect(second.hash).not.toBe(first.hash);

    const lines = readJournal(PKG);
    expect(lines.map((l) => l.seq)).toEqual([1, 2]);
    expect(lines[1].prev).toBe(lines[0].hash);
  });

  it("yazılan dosya verifyJournalChain(lines, sha256) ile DOĞRULANIR", () => {
    appendEvent(PKG, DECLARED, OWNER);
    appendEvent(PKG, stage(null, "planlama"), OWNER);
    appendEvent(PKG, machineGate(), AGENT);
    appendEvent(PKG, NOTE, AGENT);

    const lines = readJournal(PKG);
    expect(lines).toHaveLength(4);
    expect(verifyJournalChain(lines, sha256)).toEqual({ ok: true });
  });

  it("satır anahtar sırası zarf tipiyle aynı yazılır", () => {
    appendEvent(PKG, DECLARED, OWNER);
    const raw = fs.readFileSync(journalFile(PKG), "utf8").split("\n")[0];
    expect(Object.keys(JSON.parse(raw) as Record<string, unknown>)).toEqual([
      "v",
      "package_id",
      "seq",
      "ts",
      "actor",
      "type",
      "payload",
      "prev",
      "hash",
    ]);
  });

  it("readJournal dosya yoksa [] döner; listPackageIds yazılanları sıralı verir", () => {
    expect(readJournal(PKG)).toEqual([]);
    expect(listPackageIds()).toEqual([]);

    appendEvent(PKG, DECLARED, OWNER);
    appendEvent("PKG-TEST-02", DECLARED, OWNER);
    expect(listPackageIds()).toEqual(["PKG-TEST-01", "PKG-TEST-02"]);
  });

  it("bozuk JSON satırı SESSİZCE ATLANMAZ — satır numarasıyla fırlar", () => {
    appendEvent(PKG, DECLARED, OWNER);
    fs.appendFileSync(journalFile(PKG), "{bozuk\n", "utf8");
    expect(() => readJournal(PKG)).toThrow(/:2: bozuk JSON/);
  });
});

/* ── Reddedilen yazmalar: dosya BÜYÜMEZ ───────────────────────────────── */

describe("appendEvent — geçersiz kayıt diske ULAŞMAZ", () => {
  it("yırtık-yazma: dosya '\\n' ile bitmiyorsa append REDDEDİLİR", () => {
    appendEvent(PKG, DECLARED, OWNER);
    const file = journalFile(PKG);

    /* Yarıda kalmış yazmayı taklit et: son newline'ı düşür */
    const text = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, text.slice(0, -1), "utf8");
    const before = fileSize();

    expect(() => appendEvent(PKG, NOTE, AGENT)).toThrow(/satır sonu ile bitmiyor/);
    expect(fileSize()).toBe(before);
    /* Kayıt öncekinin kuyruğuna YAPIŞMADI: dosya hâlâ tek satır */
    expect(fs.readFileSync(file, "utf8").split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("gt kapısı 'gecti' ama kanıt yok → fırlatır, dosya boyutu DEĞİŞMEZ", () => {
    appendEvent(PKG, DECLARED, OWNER);
    const before = fileSize();

    expect(() => appendEvent(PKG, humanGate({ evidence: null }), OWNER)).toThrow(
      /kanıt kaydı olmadan yazılamaz/
    );
    expect(fileSize()).toBe(before);
    expect(readJournal(PKG)).toHaveLength(1);
  });

  it("insan kapısını AJAN imzalayamaz (11.6/3)", () => {
    appendEvent(PKG, DECLARED, OWNER);
    const before = fileSize();

    expect(() => appendEvent(PKG, humanGate(), AGENT)).toThrow(/ajan imzalayamaz/);
    expect(fileSize()).toBe(before);
  });

  it("geçersiz aşama geçişi (planlama→test) fırlatır", () => {
    appendEvent(PKG, DECLARED, OWNER);
    appendEvent(PKG, stage(null, "planlama"), OWNER);
    const before = fileSize();

    expect(() => appendEvent(PKG, stage("planlama", "test"), OWNER)).toThrow(
      /geçersiz aşama geçişi/
    );
    expect(fileSize()).toBe(before);
    /* Bir adımlık ileri geçiş ise kabul edilir */
    expect(appendEvent(PKG, stage("planlama", "canonical-kaydi"), OWNER).seq).toBe(3);
  });

  it("journal package_declared DIŞINDA bir olayla AÇILAMAZ", () => {
    expect(() => appendEvent(PKG, NOTE, AGENT)).toThrow(/ilk satır package_declared olmalı/);
    expect(fs.existsSync(journalFile(PKG))).toBe(false);
  });

  it("yetkisiz aktör (ajan + urun-sahibi rolü) diske dokunmadan reddedilir", () => {
    const forged: JournalActor = { kind: "agent", id: "ajan-x", role: "urun-sahibi" };
    expect(() => appendEvent(PKG, DECLARED, forged)).toThrow(/yetki|devredilmez/);
    expect(fs.existsSync(journalFile(PKG))).toBe(false);
  });

  it("ölçülmemiş kapı sayı taşıyamaz (11.3 üçüncü kural)", () => {
    appendEvent(PKG, DECLARED, OWNER);
    const before = fileSize();
    expect(() =>
      appendEvent(
        PKG,
        machineGate({ outcome: "atlandi", values: { hata: 0 }, reason: "zaman yok" }),
        AGENT
      )
    ).toThrow(/sayısal değer taşıyamaz/);
    expect(fileSize()).toBe(before);
  });
});

/* ── Kilit ────────────────────────────────────────────────────────────── */

describe("kilit", () => {
  const lockFile = (): string => path.join(lockDir(), `${PKG}.lock`);

  it("appendEvent fırlattığında kilit SERBEST kalır", () => {
    appendEvent(PKG, DECLARED, OWNER);
    expect(() => appendEvent(PKG, humanGate({ evidence: null }), OWNER)).toThrow();
    expect(fs.existsSync(lockFile())).toBe(false);

    /* Kilit sızmış olsaydı bu append 'kilit meşgul' ile düşerdi */
    expect(appendEvent(PKG, NOTE, AGENT).seq).toBe(2);
    expect(fs.existsSync(lockFile())).toBe(false);
  });

  it("kilit duruyorsa SESSİZCE BEKLEMEZ, açık hata verir", () => {
    appendEvent(PKG, DECLARED, OWNER);
    fs.mkdirSync(lockDir(), { recursive: true });
    fs.writeFileSync(lockFile(), "", "utf8");

    expect(() => appendEvent(PKG, NOTE, AGENT)).toThrow(/kilidi meşgul/);
    expect(readJournal(PKG)).toHaveLength(1);
  });
});

/* ── Kaynak taraması (şart 4) ─────────────────────────────────────────── */

describe("kaynak taraması — append-only'yi delen fs çağrısı YOK", () => {
  /* Emsal: apps/server/src/migrations.test.ts'teki repo taraması.
     .test.ts DIŞARIDA: (a) bu dosyadaki regex literali kendi kendini
     eşleştirirdi, (b) testler bozulmayı TAKLİT etmek için üzerine yazmak
     zorundadır — sınanan şey üretim yolunun ne yazdığıdır. */
  /* Tarama MANTIĞI burada TEKRARLANMAZ — verify.ts'in kaynakIcerigiTara'sı
     çağrılır. Yinelenen bir regex ikinci doğruluk kaynağıydı ve ikisi ayrıştı:
     buradaki `\bad\b` biçimi ADIN GEÇMESİNİ arıyordu, çağrılmasını değil; bu
     yüzden gates.ts'teki "fs.writeFileSync bilinçli KULLANILMAZ" açıklama
     satırını ihlal sayıyordu — kurala uyulduğunu anlatan cümle, kuralın ihlali
     olarak raporlanıyordu. Tek kaynak, tek biçim (`\bad\s*\(` = çağrı). */
  const SRC = path.dirname(fileURLToPath(import.meta.url));
  const ALLOWED_FS = new Set([
    "existsSync",
    "readFileSync",
    "appendFileSync",
    "mkdirSync",
    "readdirSync",
    "openSync",
    "closeSync",
    "unlinkSync",
  ]);

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...sourceFiles(full));
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) out.push(full);
    }
    return out;
  }

  it("üretim kaynağında üzerine-yazan fs çağrısı bulunmuyor", () => {
    const offenders = sourceFiles(SRC).filter(
      (f) => kaynakIcerigiTara(path.basename(f), fs.readFileSync(f, "utf8")).length > 0
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it("kullanılan fs yüzeyi izinli listeyle sınırlı", () => {
    const used = new Set<string>();
    for (const f of sourceFiles(SRC)) {
      for (const m of fs.readFileSync(f, "utf8").matchAll(/\bfs\.([A-Za-z]+)\s*\(/g)) {
        used.add(m[1]);
      }
    }
    expect([...used].filter((n) => !ALLOWED_FS.has(n))).toEqual([]);
  });
});
