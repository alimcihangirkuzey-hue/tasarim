/* Package Journal saf çekirdeği (Canonical 11.3/11.5/11.7) — ölçüm dürüstlüğü,
   aşama geçişi, satır şeması, dosya bütünlüğü ve hash zinciri testleri.

   Zincir doğrulayıcısı digest'i ENJEKTE aldığı için burada node:crypto YOKTUR:
   aşağıdaki sahte digest içerikten TÜRETİLİR, deterministiktir ve bu dosyanın
   girdileri için çakışmasızdır (uzunluk + iki bağımsız ağırlıklı toplam kodlanır).

   Her olumsuz test issues dizisini TAM olarak bekler ("içeriyor" ile geçiştirmez):
   böylece bir kural sessizce kaldırıldığında ilgili test kırılmak ZORUNDA kalır. */

import { describe, expect, it } from "vitest";
import {
  JOURNAL_GATES,
  JOURNAL_GATE_NAMES,
  JOURNAL_SCHEMA_VERSION,
  canonicalJson,
  checkGateActor,
  checkGateHonesty,
  isJournalGateName,
  isValidStageTransition,
  journalHashInput,
  validateJournalLine,
  validateJournalPayload,
  verifyJournalChain,
  verifyJournalStructure,
  type JournalActor,
  type JournalEvent,
  type JournalEventType,
  type JournalGateName,
  type JournalGateRun,
  type JournalLine,
  type JournalPackageDeclared,
  type JournalStage,
} from "./journal.js";

/* ── ortak kurgu ──────────────────────────────────────────────────────── */

const AJAN: JournalActor = { kind: "agent", id: "uygulayici:opus", role: "uygulayici" };
const INSAN: JournalActor = { kind: "human", id: "urun-sahibi:ali", role: "urun-sahibi" };

/** 64 hex — HEX64 denetiminden geçen, çakışmasız sahte hash */
const hex = (n: number): string => n.toString(16).padStart(64, "0");

const TS = (i: number): string => `2026-07-19T09:00:${String(i).padStart(2, "0")}.000Z`;

/** İçerikten türetilen, node:crypto'suz, deterministik digest */
const sahteDigest = (input: string): string => {
  let a = 0x811c9dc5;
  let b = 7;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619) >>> 0;
    b = (Math.imul(b, 31) + c * (i + 1)) >>> 0;
  }
  return (
    input.length.toString(16).padStart(8, "0") +
    a.toString(16).padStart(8, "0") +
    b.toString(16).padStart(8, "0")
  ).padEnd(64, "0");
};

const MAKINE: JournalGateRun = {
  gate: "test",
  outcome: "gecti",
  origin: "olculdu",
  command: "npm test",
  cwd: "C:/Users/MacBook/tasarim",
  tool: { name: "vitest", version: "3.2.4" },
  runner_platform: "win32/node24.15.0/npm11.12.1",
  exit_code: 0,
  measured_at: "2026-07-19T09:10:00.000Z",
  duration_ms: 10_100,
  values: { tests: 629 },
  method: "npm test stdout: 'Tests  629 passed'",
  evidence: null,
  reason: null,
  raw_evidence: null,
  raw_sha256: null,
};

const INSAN_KAPISI: JournalGateRun = {
  gate: "gt",
  outcome: "gecti",
  origin: "olculdu",
  command: null,
  cwd: null,
  tool: null,
  runner_platform: null,
  exit_code: null,
  measured_at: "2026-07-19T09:20:00.000Z",
  duration_ms: null,
  values: null,
  method: null,
  evidence: "GT-F1/P5 tutanağı 6/6 — ekran kaydı sha256:9f2c…",
  reason: null,
  raw_evidence: null,
  raw_sha256: null,
};

const DECLARED: JournalPackageDeclared = {
  name: "Package Journal",
  purpose: "Geliştirme operasyonunun tek gerçeği append-only olay akışıdır",
  canonical_version: "4.1.0",
  canonical_sections: ["11.3", "11.5", "11.7"],
  adr_tdr: ["ADR-011"],
  modules: ["packages/shared"],
  contracts: [],
  scope_in: ["saf çekirdek", "zincir doğrulama"],
  scope_out: ["I/O", "CLI"],
  risk_class: "orta",
};

const PD: JournalEvent = { type: "package_declared", payload: DECLARED };
const NOT: JournalEvent = { type: "note", payload: { text: "kapasite uyarısı eklendi" } };

const asama = (from: JournalStage | null, to: JournalStage): JournalEvent => ({
  type: "stage_changed",
  payload: { from, to },
});

/** Olay dizisini gerçek zarflara sarar: seq bitişik, ts artan, prev/hash zincirli */
const kayit = (events: JournalEvent[], pkg = "PJ-01", actor: JournalActor = AJAN): JournalLine[] => {
  const out: JournalLine[] = [];
  let prev: string | null = null;
  events.forEach((event, i) => {
    const body = {
      ...event,
      v: JOURNAL_SCHEMA_VERSION,
      package_id: pkg,
      seq: i + 1,
      ts: TS(i),
      actor,
      prev,
    };
    const hash = sahteDigest(journalHashInput(body));
    out.push({ ...body, hash } as JournalLine);
    prev = hash;
  });
  return out;
};

/** Tek satırı bozar — zarf alanlarını kurcalayan senaryolar için */
const yamala = (lines: JournalLine[], i: number, patch: Record<string, unknown>): JournalLine[] =>
  lines.map((l, k) => (k === i ? ({ ...l, ...patch } as unknown as JournalLine) : l));

/* ── kapı kütüğü ──────────────────────────────────────────────────────── */

describe("kapı kütüğü — kapsam şerhi kapı tanımının YANINDA veri olarak durur", () => {
  it("her kapı boş olmayan scope taşır; insan kapısının komutu YOKTUR, makinenin VARDIR", () => {
    for (const name of JOURNAL_GATE_NAMES) {
      const spec = JOURNAL_GATES[name];
      expect(spec.scope.trim().length, name).toBeGreaterThan(0);
      if (spec.human) expect(spec.command, name).toBeNull();
      else expect(spec.command, name).toBeTruthy();
    }
  });

  it("insan turu gereken kapılar yalnız gt ve smoke (otomatik ölçümü YOK)", () => {
    expect(JOURNAL_GATE_NAMES.filter((n) => JOURNAL_GATES[n].human)).toEqual(["gt", "smoke"]);
    expect(isJournalGateName("bundle")).toBe(true);
    expect(isJournalGateName("uydurma")).toBe(false);
  });
});

/* ── ölçüm dürüstlüğü ─────────────────────────────────────────────────── */

describe("checkGateHonesty — makine kapısının sonucu yalnız GERÇEK koşumdan doğar", () => {
  it("tam ölçülmüş makine koşumu geçer", () => {
    expect(checkGateHonesty(MAKINE)).toEqual({ ok: true });
  });

  it("origin='olculdu' değilse sonuç yazılamaz (gerekçe verilse bile)", () => {
    const run: JournalGateRun = { ...MAKINE, origin: "turetilmis", reason: "önceki turdan taşındı" };
    expect(checkGateHonesty(run)).toEqual({
      ok: false,
      issues: ["makine kapısı sonucu origin='olculdu' olmalı"],
    });
  });

  it("command olmadan makine sonucu yazılamaz", () => {
    expect(checkGateHonesty({ ...MAKINE, command: null })).toEqual({
      ok: false,
      issues: ["makine kapısı sonucu command olmadan yazılamaz"],
    });
    /* boş dize de "komut yok" demektir */
    expect(checkGateHonesty({ ...MAKINE, command: "   " })).toEqual({
      ok: false,
      issues: ["makine kapısı sonucu command olmadan yazılamaz"],
    });
  });

  it("exit_code olmadan makine sonucu yazılamaz (0 meşru, null değil)", () => {
    expect(checkGateHonesty({ ...MAKINE, exit_code: null })).toEqual({
      ok: false,
      issues: ["makine kapısı sonucu exit_code olmadan yazılamaz"],
    });
    expect(checkGateHonesty({ ...MAKINE, outcome: "kaldi", exit_code: 1 })).toEqual({ ok: true });
  });

  it("tool sürümü olmadan makine sonucu yazılamaz", () => {
    expect(checkGateHonesty({ ...MAKINE, tool: null })).toEqual({
      ok: false,
      issues: ["makine kapısı sonucu tool sürümü olmadan yazılamaz"],
    });
  });

  it("measured_at olmadan makine sonucu yazılamaz (kayıt anı ≠ ölçüm anı)", () => {
    expect(checkGateHonesty({ ...MAKINE, measured_at: null })).toEqual({
      ok: false,
      issues: ["makine kapısı sonucu measured_at taşımalı"],
    });
  });
});

describe("checkGateHonesty — insan kapısı yeşil testle ikame EDİLEMEZ (11.6/3)", () => {
  it("kanıtlı insan turu geçer", () => {
    expect(checkGateHonesty(INSAN_KAPISI)).toEqual({ ok: true });
  });

  it("kanıtsız insan kapısı 'gecti' yazılamaz (sözlü onay yetmez)", () => {
    expect(checkGateHonesty({ ...INSAN_KAPISI, evidence: null })).toEqual({
      ok: false,
      issues: ["insan kapısı kanıt kaydı olmadan yazılamaz"],
    });
    expect(checkGateHonesty({ ...INSAN_KAPISI, evidence: " " })).toEqual({
      ok: false,
      issues: ["insan kapısı kanıt kaydı olmadan yazılamaz"],
    });
  });

  it("insan kapısında exit_code olamaz (görsel yargının çıkış kodu yoktur)", () => {
    expect(checkGateHonesty({ ...INSAN_KAPISI, exit_code: 0 })).toEqual({
      ok: false,
      issues: ["insan kapısında exit_code olamaz"],
    });
  });

  it("insan kapısı komuta bağlanamaz (otomatikleştirme yasağı)", () => {
    expect(checkGateHonesty({ ...INSAN_KAPISI, command: "npx playwright test" })).toEqual({
      ok: false,
      issues: ["insan kapısı komuta bağlanamaz"],
    });
  });

  /* Eski kural yalnız KOMUTSUZ makine kapısında kanıtı reddediyordu; bu, gerçek
     bir komutun yanına insan imzası iliştirmeye açık kapı bırakıyordu — ölçümü
     görsel yargıyla ikame etmenin arka yolu (11.6/3'ün simetriği). Kural artık
     komuttan BAĞIMSIZ: makine kapısı hiçbir koşulda insan kanıtı taşımaz. */
  it("makine kapısı komutsuz kanıtla geçirilemez", () => {
    const run: JournalGateRun = { ...MAKINE, command: null, evidence: "ekran görüntüsü" };
    expect(checkGateHonesty(run)).toEqual({
      ok: false,
      issues: [
        "makine kapısı sonucu command olmadan yazılamaz",
        "makine kapısı insan kanıtı taşıyamaz",
      ],
    });
  });

  it("makine kapısı GERÇEK komutla birlikte de insan kanıtı taşıyamaz", () => {
    const run: JournalGateRun = { ...MAKINE, evidence: "ekran görüntüsü" };
    expect(checkGateHonesty(run)).toEqual({
      ok: false,
      issues: ["makine kapısı insan kanıtı taşıyamaz"],
    });
  });
});

describe("checkGateHonesty — koşulmayan kapı ve ölçülmemiş değer", () => {
  it("atlandi: gerekçe ZORUNLU", () => {
    const run: JournalGateRun = {
      ...MAKINE,
      outcome: "atlandi",
      command: null,
      exit_code: null,
      measured_at: null,
      values: null,
      method: null,
      reason: null,
    };
    expect(checkGateHonesty(run)).toEqual({
      ok: false,
      issues: ["outcome='atlandi' gerekçe ZORUNLU"],
    });
    expect(checkGateHonesty({ ...run, reason: "sunucu ayakta değildi" })).toEqual({ ok: true });
  });

  it("olculemedi: koşulmayan kapı SAYI taşıyamaz", () => {
    const run: JournalGateRun = {
      ...MAKINE,
      outcome: "olculemedi",
      reason: "vite stdout'u ayrıştırılamadı",
      values: { bundle_kb: 187.45 },
      method: "gzip(dist/assets/*.js)",
    };
    expect(checkGateHonesty(run)).toEqual({
      ok: false,
      issues: ["outcome='olculemedi' sayısal değer taşıyamaz"],
    });
  });

  it("origin='tahmini' gerekçesiz sunulamaz (tahmin yasak değil, ölçüm gibi sunulması yasak)", () => {
    /* İnsan kapısı seçildi: makine kapısında aynı ihlal 1. kuralı da tetikler,
       kural 4 tek başına yalıtılamazdı. */
    expect(checkGateHonesty({ ...INSAN_KAPISI, origin: "tahmini" })).toEqual({
      ok: false,
      issues: ["origin='tahmini' gerekçe ZORUNLU"],
    });
    expect(
      checkGateHonesty({ ...INSAN_KAPISI, origin: "tahmini", reason: "önceki turun tutanağından" })
    ).toEqual({ ok: true });
  });

  it("values var ama method yok: sayının NASIL çıkarıldığı ZORUNLU", () => {
    expect(checkGateHonesty({ ...MAKINE, method: null })).toEqual({
      ok: false,
      issues: ["values var: sayının nasıl çıkarıldığı (method) ZORUNLU"],
    });
  });

  it("bilinmeyen kapı adı erken reddedilir (tipo geçerli kapı sayılmaz)", () => {
    const run = { ...MAKINE, gate: "typechek" as unknown as JournalGateName };
    expect(checkGateHonesty(run)).toEqual({ ok: false, issues: ["bilinmeyen kapı: typechek"] });
  });
});

describe("checkGateActor — insan turunu ajan imzalayamaz (11.6/3)", () => {
  it("ajan gt kapısını 'gecti' imzalayamaz", () => {
    expect(checkGateActor(INSAN_KAPISI, AJAN)).toEqual({
      ok: false,
      issues: ["insan turu gereken kapıyı ajan imzalayamaz (11.6/3)"],
    });
  });

  it("insan imzalarsa geçer", () => {
    expect(checkGateActor(INSAN_KAPISI, INSAN)).toEqual({ ok: true });
    expect(checkGateActor({ ...INSAN_KAPISI, outcome: "kaldi" }, INSAN)).toEqual({ ok: true });
  });

  it("ajan makine kapısını imzalayabilir", () => {
    expect(checkGateActor(MAKINE, AJAN)).toEqual({ ok: true });
  });

  it("koşulmayan insan kapısını (atlandi) ajan kaydedebilir — imza değil, kayıt", () => {
    const run: JournalGateRun = {
      ...INSAN_KAPISI,
      outcome: "atlandi",
      evidence: null,
      reason: "insan turu bu pakette tetiklenmedi",
    };
    expect(checkGateActor(run, AJAN)).toEqual({ ok: true });
  });
});

/* ── aşama geçişi ─────────────────────────────────────────────────────── */

describe("isValidStageTransition — sessiz ileri atlama YAPISAL olarak imkânsız (11.5)", () => {
  it("from=null yalnız planlama'yı kabul eder", () => {
    expect(isValidStageTransition(null, "planlama")).toBe(true);
    expect(isValidStageTransition(null, "gelistirme")).toBe(false);
    expect(isValidStageTransition(null, "merge")).toBe(false);
  });

  it("ileri geçiş TAM BİR ADIM olmalı", () => {
    expect(isValidStageTransition("planlama", "canonical-kaydi")).toBe(true);
    expect(isValidStageTransition("test", "ikinci-dogrulayici")).toBe(true);
    expect(isValidStageTransition("hazir", "merge")).toBe(true);
  });

  it("iki adım ileri atlama REDDEDİLİR (gelistirme→ikinci-dogrulayici)", () => {
    expect(isValidStageTransition("gelistirme", "ikinci-dogrulayici")).toBe(false);
    expect(isValidStageTransition("planlama", "gelistirme")).toBe(false);
    expect(isValidStageTransition("test", "dagitim")).toBe(false);
  });

  it("geri dönüş HERHANGİ mesafe serbesttir (doğrulayıcı bulgusu geçerli geçiştir)", () => {
    expect(isValidStageTransition("hazir", "gelistirme")).toBe(true);
    expect(isValidStageTransition("dagitim", "planlama")).toBe(true);
    expect(isValidStageTransition("test", "gelistirme")).toBe(true);
  });

  it("aynı aşamaya geçiş REDDEDİLİR (olay üretmeyen geçiş gürültüdür)", () => {
    expect(isValidStageTransition("gelistirme", "gelistirme")).toBe(false);
  });

  it("sözlükte olmayan aşama adı reddedilir", () => {
    expect(isValidStageTransition("uydurma" as unknown as JournalStage, "test")).toBe(false);
    expect(isValidStageTransition("test", "uydurma" as unknown as JournalStage)).toBe(false);
  });
});

/* ── satır doğrulama ──────────────────────────────────────────────────── */

const NOT_SATIRI: JournalLine = {
  type: "note",
  payload: { text: "kapasite uyarısı eklendi" },
  v: JOURNAL_SCHEMA_VERSION,
  package_id: "PJ-01",
  seq: 1,
  ts: "2026-07-19T09:00:00.000Z",
  actor: AJAN,
  prev: null,
  hash: hex(1),
};

const eksilt = (line: JournalLine, key: string): Record<string, unknown> => {
  const copy = { ...line } as Record<string, unknown>;
  delete copy[key];
  return copy;
};

describe("validateJournalLine — kapalı birlik, sert şema", () => {
  it("geçerli satır ok:true", () => {
    expect(validateJournalLine(NOT_SATIRI)).toEqual({ ok: true });
  });

  it("nesne olmayan girdi reddedilir", () => {
    for (const bad of ["{}", 42, null, [NOT_SATIRI]]) {
      expect(validateJournalLine(bad)).toEqual({ ok: false, issues: ["satır bir nesne değil"] });
    }
  });

  it("bilinmeyen olay türü SERT REDDEDİLİR (tipo geçerli olay sayılmaz)", () => {
    expect(validateJournalLine({ ...NOT_SATIRI, type: "gate_ran" })).toEqual({
      ok: false,
      issues: ["bilinmeyen olay türü: gate_ran"],
    });
  });

  it("payload ZORUNLU — olay türü tek başına kayıt sayılmaz", () => {
    expect(validateJournalLine(eksilt(NOT_SATIRI, "payload"))).toEqual({
      ok: false,
      issues: ["payload ZORUNLU"],
    });
    expect(validateJournalLine({ ...NOT_SATIRI, payload: null })).toEqual({
      ok: false,
      issues: ["payload ZORUNLU"],
    });
  });

  it("actor ZORUNLU ve rolü kapalı sözlükten olmalı (ASLA null)", () => {
    expect(validateJournalLine(eksilt(NOT_SATIRI, "actor"))).toEqual({
      ok: false,
      issues: ["actor ZORUNLU"],
    });
    expect(
      validateJournalLine({ ...NOT_SATIRI, actor: { kind: "agent", id: "x", role: "sef" } })
    ).toEqual({ ok: false, issues: ["actor.role bilinmiyor: sef"] });
    expect(
      validateJournalLine({ ...NOT_SATIRI, actor: { kind: "bot", id: "", role: "uygulayici" } })
    ).toEqual({
      ok: false,
      issues: ["actor.kind human|agent olmalı", "actor.id boş olamaz"],
    });
  });

  it("seq 1-tabanlıdır: 0 kabul edilmez", () => {
    expect(validateJournalLine({ ...NOT_SATIRI, seq: 0, prev: hex(9) })).toEqual({
      ok: false,
      issues: ["seq 1-tabanlı tamsayı olmalı"],
    });
    expect(validateJournalLine({ ...NOT_SATIRI, seq: 1.5, prev: hex(9) })).toEqual({
      ok: false,
      issues: ["seq 1-tabanlı tamsayı olmalı"],
    });
  });

  it("seq=1'de prev null olmalı (zincirin başı bağsızdır)", () => {
    expect(validateJournalLine({ ...NOT_SATIRI, prev: hex(9) })).toEqual({
      ok: false,
      issues: ["seq=1 satırında prev null olmalı"],
    });
  });

  it("seq>1'de prev 64 hex olmalı", () => {
    expect(validateJournalLine({ ...NOT_SATIRI, seq: 2, prev: "abc" })).toEqual({
      ok: false,
      issues: ["prev 64 hex olmalı"],
    });
    expect(validateJournalLine({ ...NOT_SATIRI, seq: 2, prev: null })).toEqual({
      ok: false,
      issues: ["prev 64 hex olmalı"],
    });
    expect(validateJournalLine({ ...NOT_SATIRI, seq: 2, prev: hex(1) })).toEqual({ ok: true });
  });

  it("hash 64 hex olmalı", () => {
    expect(validateJournalLine({ ...NOT_SATIRI, hash: "ABC" })).toEqual({
      ok: false,
      issues: ["hash 64 hex olmalı"],
    });
  });

  it("ts ISO-8601 UTC(ms) değilse reddedilir", () => {
    for (const ts of ["2026-07-19 09:00:00", "2026-07-19T09:00:00Z", "2026-07-19T09:00:00+03:00"]) {
      expect(validateJournalLine({ ...NOT_SATIRI, ts })).toEqual({
        ok: false,
        issues: ["ts ISO-8601 UTC(ms) olmalı"],
      });
    }
  });

  it("şema sürümü yanlışsa reddedilir", () => {
    expect(validateJournalLine({ ...NOT_SATIRI, v: 2 })).toEqual({
      ok: false,
      issues: [`v !== ${JOURNAL_SCHEMA_VERSION}`],
    });
  });

  it("gate_run satırı ölçüm dürüstlüğüne VE aktör kuralına bağlıdır", () => {
    expect(
      validateJournalLine({
        ...NOT_SATIRI,
        type: "gate_run",
        payload: { ...MAKINE, exit_code: null },
      })
    ).toEqual({ ok: false, issues: ["makine kapısı sonucu exit_code olmadan yazılamaz"] });

    expect(
      validateJournalLine({ ...NOT_SATIRI, type: "gate_run", payload: INSAN_KAPISI })
    ).toEqual({
      ok: false,
      issues: ["insan turu gereken kapıyı ajan imzalayamaz (11.6/3)"],
    });

    expect(
      validateJournalLine({
        ...NOT_SATIRI,
        type: "gate_run",
        payload: INSAN_KAPISI,
        actor: INSAN,
      })
    ).toEqual({ ok: true });
  });

  it("stage_changed satırı geçiş kuralına bağlıdır", () => {
    expect(
      validateJournalLine({
        ...NOT_SATIRI,
        type: "stage_changed",
        payload: { from: "planlama", to: "hazir" },
      })
    ).toEqual({ ok: false, issues: ["geçersiz aşama geçişi: planlama → hazir"] });

    expect(
      validateJournalLine({
        ...NOT_SATIRI,
        type: "stage_changed",
        payload: { from: null, to: "planlama" },
      })
    ).toEqual({ ok: true });
  });
});

/* ── olay GÖVDESİ (validateJournalPayload) ────────────────────────────── */

/**
 * Bir olay türünün gövdesi için SAĞLAM/BOZUK çifti.
 *
 * Pozitif eşlenik ŞARTTIR: yalnız RED yazmak sahte-yeşildir — satır başka bir
 * sebepten de düşüyor olabilirdi ve test bunu ayırt edemezdi (argv kilitlerinin
 * doktrini burada da geçerli). `issues` TAM beklenir, "içerir" ile geçiştirilmez:
 * bir gövde kuralı sessizce kaldırıldığında ilgili satır kırılmak ZORUNDA.
 */
interface GovdeVakasi {
  ad: string;
  type: JournalEventType;
  /** gate_run satırlarında insan kapısı için gerekebilir */
  actor?: JournalActor;
  saglam: unknown;
  bozuk: unknown;
  issues: string[];
}

const ASAMA_SOZLUGU = "planlama|canonical-kaydi|gelistirme|test|ikinci-dogrulayici|hazir|merge|dagitim";

const VERDICT = { decision: "bulgu", findings_open: 2, findings_closed: 8, summary: "iki açık bulgu" };
const FINDING = {
  finding_id: "B-1",
  severity: "blocker",
  summary: "zincir denetimi atlanıyor",
  file: "src/verify.ts",
};
const GIT = { kind: "commit", value: "d46b877", subject: "B: Dynamic Composition Engine" };
const RISK = { risk_id: "R-1", status: "acik", summary: "kilit yok" };
const HAM_KANIT = "docs/journal/evidence/PJ-01/test-kaldi.txt";

const GOVDE_VAKALARI: GovdeVakasi[] = [
  /* ── package_declared ──────────────────────────────────────────────── */
  {
    ad: "package_declared: name boş olamaz",
    type: "package_declared",
    saglam: DECLARED,
    bozuk: { ...DECLARED, name: "   " },
    issues: ["payload.name boş olamaz"],
  },
  {
    ad: "package_declared: risk_class kapalı sözlükten (tipo risk sınıfı olmaz)",
    type: "package_declared",
    saglam: DECLARED,
    bozuk: { ...DECLARED, risk_class: "belki" },
    issues: ["payload.risk_class geçersiz: belki (beklenen: dusuk|orta|yuksek)"],
  },
  {
    ad: "package_declared: modules DİZE dizisi olmalı (sayı sızamaz)",
    type: "package_declared",
    saglam: DECLARED,
    bozuk: { ...DECLARED, modules: [1] },
    issues: ["payload.modules dize dizisi olmalı"],
  },
  {
    ad: "package_declared: canonical_sections BOŞ olamaz (izlenebilirlik)",
    type: "package_declared",
    saglam: DECLARED,
    bozuk: { ...DECLARED, canonical_sections: [] },
    issues: ["payload.canonical_sections en az bir bölüm taşımalı (izlenebilirlik)"],
  },

  /* ── stage_changed ─────────────────────────────────────────────────── */
  {
    /* İKİ ayrı kural düşer: gövde sözlüğü (payload.to) ve geçiş kuralı.
       Geçiş kuralı tek başına bırakılırsa "bilinmeyen aşama" ile "yasak
       geçiş" aynı mesaja çöker; ikisi AYRI raporlanır. */
    ad: "stage_changed: to bilinmeyen aşama",
    type: "stage_changed",
    saglam: { from: null, to: "planlama" },
    bozuk: { from: null, to: "neredeyse-bitti" },
    issues: [
      `payload.to geçersiz: neredeyse-bitti (beklenen: ${ASAMA_SOZLUGU})`,
      "geçersiz aşama geçişi: null → neredeyse-bitti",
    ],
  },
  {
    ad: "stage_changed: from bilinmeyen aşama (null meşru, tipo değil)",
    type: "stage_changed",
    saglam: { from: "planlama", to: "canonical-kaydi" },
    bozuk: { from: "uydurma", to: "canonical-kaydi" },
    issues: [
      "payload.from bilinmeyen aşama: uydurma",
      "geçersiz aşama geçişi: uydurma → canonical-kaydi",
    ],
  },

  /* ── gate_run · kural 5b (sonlu sayı) ──────────────────────────────── */
  {
    /* JSON NaN TAŞIYAMAZ; gerçek saldırı yüzeyi sayı KILIĞINDAKİ dizedir.
       Tip denetimi çalışma zamanında yoktur: dosyadan okunan satır `unknown`
       gelir ve "629" burada durdurulmazsa hash girdisine dize olarak girer. */
    ad: "gate_run 5b: values sayı kılığında DİZE taşıyamaz",
    type: "gate_run",
    saglam: MAKINE,
    bozuk: { ...MAKINE, values: { tests: "629" } },
    issues: ["values.tests sonlu sayı değil (629)"],
  },
  {
    /* Bellekte üretilen yolda (ölçüm kodu bir bölmeyi 0'a bölerse) Infinity
       tipten GEÇER ama canonicalJson onu null'a çevirir — hash girdisi
       bellekteki değerden ayrışır. */
    ad: "gate_run 5b: values Infinity taşıyamaz (canonicalJson null'a çevirir)",
    type: "gate_run",
    saglam: MAKINE,
    bozuk: { ...MAKINE, values: { tests: Number.POSITIVE_INFINITY } },
    issues: ["values.tests sonlu sayı değil (Infinity)"],
  },

  /* ── gate_run · kural 7 (ham kanıt) ────────────────────────────────── */
  {
    ad: "gate_run 7: ham kanıt yalnız 'kaldi' satırında, raw_sha256 64 hex olmalı",
    type: "gate_run",
    saglam: {
      ...MAKINE,
      outcome: "kaldi",
      exit_code: 1,
      raw_evidence: HAM_KANIT,
      raw_sha256: hex(0xbeef),
    },
    bozuk: { ...MAKINE, raw_evidence: HAM_KANIT, raw_sha256: "SUS" },
    issues: [
      "ham kanıt yalnız outcome='kaldi' satırında olur",
      "raw_sha256 64 hex olmalı",
    ],
  },

  /* ── agent_started / agent_finished ────────────────────────────────── */
  {
    ad: "agent_started: agent_label boş olamaz",
    type: "agent_started",
    saglam: { agent_label: "AJAN-5", task: "kilit turu" },
    bozuk: { agent_label: "", task: "kilit turu" },
    issues: ["payload.agent_label boş olamaz"],
  },
  {
    ad: "agent_finished: outcome kapalı sözlükten (ok|hata|atlandi)",
    type: "agent_finished",
    saglam: { agent_label: "AJAN-5", outcome: "ok", summary: "bitti" },
    bozuk: { agent_label: "AJAN-5", outcome: "basarili", summary: "bitti" },
    issues: ["payload.outcome geçersiz: basarili (beklenen: ok|hata|atlandi)"],
  },

  /* ── verifier_finding ──────────────────────────────────────────────── */
  {
    ad: "verifier_finding: severity kapalı sözlükten (kritik diye bir ağırlık YOK)",
    type: "verifier_finding",
    saglam: FINDING,
    bozuk: { ...FINDING, severity: "kritik" },
    issues: ["payload.severity geçersiz: kritik (beklenen: blocker|ciddi|kucuk)"],
  },
  {
    ad: "verifier_finding: file dize ya da null olmalı",
    type: "verifier_finding",
    saglam: { ...FINDING, file: null },
    bozuk: { ...FINDING, file: 42 },
    issues: ["payload.file dize ya da null olmalı"],
  },

  /* ── verifier_verdict ──────────────────────────────────────────────── */
  {
    ad: "verifier_verdict: findings_open negatif olamaz",
    type: "verifier_verdict",
    saglam: VERDICT,
    bozuk: { ...VERDICT, findings_open: -1 },
    issues: ["payload.findings_open negatif olmayan tamsayı olmalı"],
  },
  {
    /* 11.6/1 kapısı: açık bulgu varken onay, kapıyı yeşil göstermenin sessiz
       yoludur. CLI'daki eşleniği argv.test.ts'te kilitli; burada kilitlenen
       şey DOSYAYA YAZILMIŞ satırın aynı kapıdan geçmesi. */
    ad: "verifier_verdict: açık bulgu varken 'onay' verilemez (11.6/1)",
    type: "verifier_verdict",
    saglam: { decision: "onay", findings_open: 0, findings_closed: 5, summary: "temiz" },
    bozuk: { decision: "onay", findings_open: 5, findings_closed: 0, summary: "sonra bakarız" },
    issues: ["açık bulgu varken 'onay' verilemez"],
  },

  /* ── git_recorded / risk_recorded / note ───────────────────────────── */
  {
    ad: "git_recorded: kind kapalı sözlükten (tag kaydı YOK)",
    type: "git_recorded",
    saglam: GIT,
    bozuk: { ...GIT, kind: "tag" },
    issues: ["payload.kind geçersiz: tag (beklenen: base|branch|commit|merge)"],
  },
  {
    ad: "risk_recorded: status kapalı sözlükten (acik|kapali)",
    type: "risk_recorded",
    saglam: RISK,
    bozuk: { ...RISK, status: "belirsiz" },
    issues: ["payload.status geçersiz: belirsiz (beklenen: acik|kapali)"],
  },
  {
    ad: "note: text boş olamaz (boş anlatı kayıt değildir)",
    type: "note",
    saglam: { text: "kapasite uyarısı eklendi" },
    bozuk: { text: "" },
    issues: ["payload.text boş olamaz"],
  },
  {
    /* Dizi `typeof "object"` olduğu için zarf denetiminden GEÇER; gövde
       denetimi olmasa şemasız bir dizi geçerli olay sayılırdı. */
    ad: "payload DİZİ olamaz (typeof 'object' tuzağı)",
    type: "note",
    saglam: { text: "kapasite uyarısı eklendi" },
    bozuk: [],
    issues: ["payload bir nesne değil"],
  },
];

describe("validateJournalPayload — 10 olay türünün GÖVDESİ de şemalıdır", () => {
  it.each(GOVDE_VAKALARI)("$ad", ({ type, actor, saglam, bozuk, issues }) => {
    const zarf = { ...NOT_SATIRI, type, actor: actor ?? AJAN };
    /* POZİTİF eşlenik — satır yalnız bozuk gövde yüzünden düşmeli */
    expect(validateJournalLine({ ...zarf, payload: saglam })).toEqual({ ok: true });
    expect(validateJournalLine({ ...zarf, payload: bozuk })).toEqual({ ok: false, issues });
  });

  it("gövde denetimi ÜRETİM yolundan bağımsız olarak da aynı kararı verir", () => {
    /* Doğrudan çağrı, satır yolundaki ikinci issue'nun nereden geldiğini
       ayırır: aşama sözlüğü GÖVDE kuralıdır, geçiş kuralı AYRI bir katman. */
    expect(validateJournalPayload("stage_changed", { from: null, to: "neredeyse-bitti" })).toEqual({
      ok: false,
      issues: [`payload.to geçersiz: neredeyse-bitti (beklenen: ${ASAMA_SOZLUGU})`],
    });
    expect(validateJournalPayload("note", { text: "kapasite uyarısı eklendi" })).toEqual({ ok: true });
    /* Nesne olmayan gövde: satır yolunda "payload ZORUNLU" zaten yakalar,
       ama saf motorun kendi kapısı da kapalı olmalı. */
    for (const bad of [42, "{}", null, []]) {
      expect(validateJournalPayload("note", bad)).toEqual({
        ok: false,
        issues: ["payload bir nesne değil"],
      });
    }
  });
});

/* ── dosya bütünlüğü ──────────────────────────────────────────────────── */

describe("verifyJournalStructure — dosyanın ŞEKLİ (zincirden ayrı)", () => {
  const AKIS: JournalEvent[] = [
    PD,
    asama(null, "planlama"),
    asama("planlama", "canonical-kaydi"),
    NOT,
  ];

  it("düzgün akış temiz geçer", () => {
    expect(verifyJournalStructure(kayit(AKIS), "PJ-01")).toEqual({ ok: true });
  });

  it("boş journal reddedilir", () => {
    expect(verifyJournalStructure([], "PJ-01")).toEqual({ ok: false, issues: ["journal boş"] });
  });

  it("ilk satır package_declared olmalı", () => {
    expect(verifyJournalStructure(kayit([NOT, PD]), "PJ-01")).toEqual({
      ok: false,
      issues: ["ilk satır package_declared olmalı"],
    });
  });

  it("package_declared TAM BİR KEZ yazılır (paket ortadan yeniden ilan edilemez)", () => {
    expect(verifyJournalStructure(kayit([PD, NOT, PD]), "PJ-01")).toEqual({
      ok: false,
      issues: ["package_declared tam bir kez olmalı (bulunan: 2)"],
    });
  });

  it("seq boşluğu yakalanır (1,2,4) — silinen satır yapısal olarak görünür", () => {
    const bozuk = yamala(kayit([PD, NOT, NOT]), 2, { seq: 4 });
    expect(verifyJournalStructure(bozuk, "PJ-01")).toEqual({
      ok: false,
      issues: ["seq boşluğu/atlaması: beklenen 3, bulunan 4"],
    });
  });

  it("ts geriye gidemez", () => {
    const bozuk = yamala(kayit([PD, NOT, NOT]), 2, { ts: "2026-07-19T08:00:00.000Z" });
    expect(verifyJournalStructure(bozuk, "PJ-01")).toEqual({
      ok: false,
      issues: ["seq 3: ts geriye gidiyor"],
    });
  });

  it("package_id dosya adıyla uyuşmalı", () => {
    const bozuk = yamala(kayit([PD, NOT]), 1, { package_id: "PJ-02" });
    expect(verifyJournalStructure(bozuk, "PJ-01")).toEqual({
      ok: false,
      issues: ["seq 2: package_id dosya adıyla uyuşmuyor (PJ-02 ≠ PJ-01)"],
    });
  });

  it("stage_changed'in from'u AKIŞLA uyuşmalı (tek başına geçerli geçiş yetmez)", () => {
    /* gelistirme→test tek adımdır, yani satır düzeyinde GEÇERLİ;
       akıştaki son aşama planlama olduğu için yine de reddedilir. */
    const lines = kayit([PD, asama(null, "planlama"), asama("gelistirme", "test")]);
    expect(verifyJournalStructure(lines, "PJ-01")).toEqual({
      ok: false,
      issues: ["seq 3: geçişin from'u akışla uyuşmuyor (akış: planlama)"],
    });
  });

  it("satır şeması ihlali seq etiketiyle raporlanır", () => {
    const bozuk = yamala(kayit([PD, NOT]), 1, { v: 2 });
    expect(verifyJournalStructure(bozuk, "PJ-01")).toEqual({
      ok: false,
      issues: [`seq 2: v !== ${JOURNAL_SCHEMA_VERSION}`],
    });
  });
});

/* ── kanonik serileştirme ─────────────────────────────────────────────── */

describe("canonicalJson — hash girdisi platformdan ve anahtar sırasından bağımsız", () => {
  it("anahtar sırası girdi sırasından BAĞIMSIZ aynı dizeyi üretir", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
  });

  it("iç içe nesne ve dizilerde de sıralar; DİZİ SIRASI korunur", () => {
    const x = { z: { d: 1, c: 2 }, a: [{ n: 1, m: 2 }, "s"] };
    const y = { a: [{ m: 2, n: 1 }, "s"], z: { c: 2, d: 1 } };
    expect(canonicalJson(x)).toBe(canonicalJson(y));
    expect(canonicalJson(x)).toBe('{"a":[{"m":2,"n":1},"s"],"z":{"c":2,"d":1}}');
    /* dizi sıralanırsa anlam değişir — sıralama YALNIZ anahtarlara uygulanır */
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it("ilkel değerler JSON ile aynı, boşluk yok", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(3.5)).toBe("3.5");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson("ç")).toBe('"ç"');
    expect(canonicalJson({})).toBe("{}");
    expect(canonicalJson({ a: [1, { b: null }] })).toBe('{"a":[1,{"b":null}]}');
  });

  it("undefined FIRLATIR — sessizce atlanıp hash'i sahte kılamaz", () => {
    expect(() => canonicalJson(undefined)).toThrow(/serileştirilemeyen/);
    expect(() => canonicalJson({ a: undefined })).toThrow(/serileştirilemeyen/);
    expect(() => canonicalJson([1, undefined])).toThrow(/serileştirilemeyen/);
  });
});

describe("journalHashInput — gövde hash'i DIŞLAR, prev'i İÇERİR", () => {
  const line = kayit([PD])[0];

  it("hash alanı gövdeye girmez: hash değişse girdi aynı kalır", () => {
    const baska = { ...line, hash: hex(99) };
    expect(JSON.parse(journalHashInput(line))).not.toHaveProperty("hash");
    expect(journalHashInput(baska)).toBe(journalHashInput(line));
  });

  it("prev gövdededir: prev değişince girdi de değişir (zincirin taşıyıcısı)", () => {
    const baska = { ...line, prev: hex(7) };
    expect(journalHashInput(baska)).not.toBe(journalHashInput(line));
  });
});

/* ── hash zinciri ─────────────────────────────────────────────────────── */

describe("verifyJournalChain — enjekte digest ile değişmezlik", () => {
  const zincir = kayit([PD, asama(null, "planlama"), NOT]);

  it("sağlam zincir doğrulanır", () => {
    expect(verifyJournalChain(zincir, sahteDigest)).toEqual({ ok: true });
    expect(zincir[0].prev).toBeNull();
    expect(zincir[2].prev).toBe(zincir[1].hash);
  });

  it("ortadaki satırın payload'ı düzenlenince O SATIRIN hash'i tutmaz", () => {
    const bozuk = yamala(zincir, 1, { payload: { from: null, to: "merge" } });
    expect(verifyJournalChain(bozuk, sahteDigest)).toEqual({
      ok: false,
      issues: ["seq 2: hash tutmuyor (satır düzenlenmiş)"],
    });
  });

  it("hash'i de yeniden hesaplanan sahtecilik SONRAKİ satırın prev'inde yakalanır", () => {
    const sahte: { from: JournalStage | null; to: JournalStage } = { from: null, to: "merge" };
    /* Kasten uyuşmayan tür/gövde çifti: sahtecilik senaryosu tip sözleşmesini
       zaten ihlal eder, bu yüzden cast burada DOĞRU — sınanan şey, zincirin
       böyle bir satırı yakalayıp yakalamadığı. */
    const govde = { ...zincir[1], payload: sahte } as unknown as JournalLine;
    const yeniden = { ...govde, hash: sahteDigest(journalHashInput(govde)) } as unknown as JournalLine;
    const bozuk = zincir.map((l, i) => (i === 1 ? yeniden : l));
    expect(verifyJournalChain(bozuk, sahteDigest)).toEqual({
      ok: false,
      issues: ["seq 3: prev zinciri kopuk"],
    });
  });

  it("prev kurcalanınca satırın kendi hash'i de tutmaz (prev gövdenin parçası)", () => {
    const bozuk = yamala(zincir, 1, { prev: hex(7) });
    expect(verifyJournalChain(bozuk, sahteDigest)).toEqual({
      ok: false,
      issues: ["seq 2: hash tutmuyor (satır düzenlenmiş)", "seq 2: prev zinciri kopuk"],
    });
  });

  it("satır SİLİNİRSE zincir kopar (seq bitişikliğinden bağımsız ikinci katman)", () => {
    const eksik = [zincir[0], zincir[2]];
    expect(verifyJournalChain(eksik, sahteDigest)).toEqual({
      ok: false,
      issues: ["seq 3: prev zinciri kopuk"],
    });
  });
});
