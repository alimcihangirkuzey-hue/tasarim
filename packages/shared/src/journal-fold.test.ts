/* Paket kaydı TÜRETİMİ testleri (Canonical 11.3-a).

   Paket kaydının dosyası YOKTUR: her okumada olay akışından katlanır. Bu yüzden
   ilk test SAFLIK'tır — fold girdiye dokunursa "türetilen görünüm" sessizce
   ikinci bir doğruluk kaynağına döner ve 11.3'ün yasağı delinir.

   Zarf alanları (seq/prev/hash) elle tutarlı yazılır: fold zinciri DOĞRULAMAZ,
   yalnız okur; doğrulama verifyJournalChain'in işidir. */

import { describe, expect, it } from "vitest";
import { foldPackageJournal } from "./journal-fold.js";
import {
  JOURNAL_SCHEMA_VERSION,
  type JournalActor,
  type JournalEvent,
  type JournalGateRun,
  type JournalLine,
  type JournalPackageDeclared,
  type JournalStage,
} from "./journal.js";

/* ── ortak kurgu ──────────────────────────────────────────────────────── */

const AJAN: JournalActor = { kind: "agent", id: "uygulayici:opus", role: "uygulayici" };
const INSAN: JournalActor = { kind: "human", id: "urun-sahibi:ali", role: "urun-sahibi" };

const hex = (n: number): string => n.toString(16).padStart(64, "0");
const TS = (i: number): string => `2026-07-19T09:00:${String(i).padStart(2, "0")}.000Z`;

/** Elle tutarlı zarf: prev(i) = hash(i−1); zincir okunabilir ama doğrulanmaz */
const kayit = (events: JournalEvent[], actor: JournalActor = AJAN): JournalLine[] =>
  events.map(
    (event, i) =>
      ({
        ...event,
        v: JOURNAL_SCHEMA_VERSION,
        package_id: "PJ-01",
        seq: i + 1,
        ts: TS(i),
        actor,
        prev: i === 0 ? null : hex(i),
        hash: hex(i + 1),
      }) as JournalLine
  );

const DECLARED: JournalPackageDeclared = {
  name: "Package Journal",
  purpose: "Geliştirme operasyonunun tek gerçeği append-only olay akışıdır",
  canonical_version: "4.1.0",
  canonical_sections: ["11.3", "11.5", "11.7"],
  adr_tdr: ["ADR-011"],
  modules: ["packages/shared"],
  contracts: [],
  scope_in: ["saf çekirdek"],
  scope_out: ["I/O"],
  risk_class: "orta",
};

const PD: JournalEvent = { type: "package_declared", payload: DECLARED };

const asama = (from: JournalStage | null, to: JournalStage): JournalEvent => ({
  type: "stage_changed",
  payload: { from, to },
});

const not = (text: string): JournalEvent => ({ type: "note", payload: { text } });

const kapi = (payload: JournalGateRun): JournalEvent => ({ type: "gate_run", payload });

const git = (
  kind: "base" | "branch" | "commit" | "merge",
  value: string,
  subject: string | null = null
): JournalEvent => ({ type: "git_recorded", payload: { kind, value, subject } });

const risk = (risk_id: string, status: "acik" | "kapali", summary: string): JournalEvent => ({
  type: "risk_recorded",
  payload: { risk_id, status, summary },
});

const TEST_KAPISI: JournalGateRun = {
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

/* ── saflık ───────────────────────────────────────────────────────────── */

describe("SAFLIK — fold girdiyi değiştirmez", () => {
  it("katlama sonrası olay akışı BİREBİR aynı kalır", () => {
    const lines = kayit([
      PD,
      asama(null, "planlama"),
      kapi(TEST_KAPISI),
      { type: "agent_started", payload: { agent_label: "AJAN-5", task: "şüpheci tur" } },
      git("commit", "b32a183", "P5 garment intake"),
      risk("R-1", "acik", "vite stdout'u ayrıştırılmıyor"),
      not("kapasite uyarısı eklendi"),
    ]);
    const snapshot = JSON.stringify(lines);
    foldPackageJournal(lines);
    expect(JSON.stringify(lines)).toBe(snapshot);
  });

  it("kimlik, kapı koşumu ve aktör KOPYALANIR — kayıt üstünden olay akışına yazılamaz", () => {
    const lines = kayit([PD, kapi(TEST_KAPISI), not("anlatı")], INSAN);
    const rec = foldPackageJournal(lines);
    expect(rec.identity).toEqual(DECLARED);
    expect(rec.identity).not.toBe(lines[0].payload);
    expect(rec.gate_history[0]).toEqual(TEST_KAPISI);
    expect(rec.gate_history[0]).not.toBe(lines[1].payload);
    expect(rec.notes[0].actor).toEqual(INSAN);
    expect(rec.notes[0].actor).not.toBe(lines[2].actor);
  });
});

/* ── aşama ────────────────────────────────────────────────────────────── */

describe("aşama — türetilen görünüm, yazılan alan değil (11.3)", () => {
  it("stage SON stage_changed.to'dur", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        asama(null, "planlama"),
        asama("planlama", "canonical-kaydi"),
        asama("canonical-kaydi", "gelistirme"),
      ])
    );
    expect(rec.stage).toBe("gelistirme");
    expect(rec.stage_history.map((s) => s.to)).toEqual([
      "planlama",
      "canonical-kaydi",
      "gelistirme",
    ]);
    expect(rec.started_at).toBe(TS(0));
  });

  it("hiç stage_changed yoksa stage null — VARSAYILAN AŞAMA UYDURULMAZ", () => {
    const rec = foldPackageJournal(kayit([PD, kapi(TEST_KAPISI), not("anlatı")]));
    expect(rec.stage).toBeNull();
    expect(rec.stage_history).toEqual([]);
  });

  it("yön işaretlenir: geri dönüş 'geri' (11.5'te GEÇERLİ geçiştir)", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        asama(null, "planlama"),
        asama("planlama", "canonical-kaydi"),
        asama("canonical-kaydi", "gelistirme"),
        asama("gelistirme", "test"),
        asama("test", "hazir"),
        asama("hazir", "gelistirme"),
      ])
    );
    expect(rec.stage_history.map((s) => s.direction)).toEqual([
      "ileri",
      "ileri",
      "ileri",
      "ileri",
      "ileri",
      "geri",
    ]);
    expect(rec.stage).toBe("gelistirme");
    expect(rec.stage_history[5]).toMatchObject({ from: "hazir", to: "gelistirme", ts: TS(6) });
  });
});

/* ── ajanlar ──────────────────────────────────────────────────────────── */

describe("aktörün anlık durumu olay akışından çıkar", () => {
  it("active_agents = agent_started − agent_finished; eşleşmeyen finish ÇÖKERTMEZ", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        { type: "agent_started", payload: { agent_label: "AJAN-5", task: "şüpheci tur" } },
        { type: "agent_started", payload: { agent_label: "AJAN-6", task: "test yazımı" } },
        {
          type: "agent_finished",
          payload: { agent_label: "AJAN-5", outcome: "ok", summary: "10 bulgu" },
        },
        {
          type: "agent_finished",
          payload: { agent_label: "HAYALET", outcome: "hata", summary: "hiç başlamadı" },
        },
      ])
    );
    expect(rec.active_agents.map((a) => a.agent_label)).toEqual(["AJAN-6"]);
    expect(rec.active_agents[0]).toMatchObject({ task: "test yazımı", started_at: TS(2) });
  });

  it("tüm ajanlar kapanınca liste boşalır", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        { type: "agent_started", payload: { agent_label: "AJAN-5", task: "şüpheci tur" } },
        {
          type: "agent_finished",
          payload: { agent_label: "AJAN-5", outcome: "atlandi", summary: "tur iptal" },
        },
      ])
    );
    expect(rec.active_agents).toEqual([]);
  });
});

/* ── kapılar ──────────────────────────────────────────────────────────── */

describe("kapılar — son koşum kazanır, tarihçe hiçbirini kaybetmez", () => {
  it("aynı kapı iki kez koşulmuşsa gates SON koşumu tutar, gate_history İKİSİNİ de", () => {
    const kirmizi: JournalGateRun = {
      ...TEST_KAPISI,
      outcome: "kaldi",
      exit_code: 1,
      values: { tests: 628, failed: 1 },
    };
    const rec = foldPackageJournal(kayit([PD, kapi(kirmizi), kapi(TEST_KAPISI)]));

    expect(rec.gates.test).toMatchObject({ outcome: "gecti", exit_code: 0, values: { tests: 629 } });
    expect(rec.gate_history.map((g) => g.outcome)).toEqual(["kaldi", "gecti"]);
    expect(rec.gate_history.map((g) => g.exit_code)).toEqual([1, 0]);
    expect(Object.keys(rec.gates)).toEqual(["test"]);
  });

  it("farklı kapılar birbirini ezmez", () => {
    const lint: JournalGateRun = {
      ...TEST_KAPISI,
      gate: "lint",
      command: "npx eslint . --format json",
      values: { errors: 0, warnings: 0 },
      method: "eslint json çıktısındaki errorCount toplamı",
    };
    const rec = foldPackageJournal(kayit([PD, kapi(TEST_KAPISI), kapi(lint)]));
    expect(Object.keys(rec.gates).sort()).toEqual(["lint", "test"]);
    expect(rec.gates.lint?.values).toEqual({ errors: 0, warnings: 0 });
    expect(rec.gates.test?.values).toEqual({ tests: 629 });
  });
});

/* ── bitiş anı ────────────────────────────────────────────────────────── */

describe("finished_at — TAHMİNİ BİTİŞ ÜRETİLMEZ", () => {
  it("yalnız merge aşamasına geçişte dolar", () => {
    const rec = foldPackageJournal(
      kayit([PD, asama(null, "planlama"), asama("hazir", "merge"), not("dal silindi")])
    );
    expect(rec.finished_at).toBe(TS(2));
  });

  it("merge yoksa null kalır (hazır aşaması bitiş SAYILMAZ)", () => {
    const rec = foldPackageJournal(
      kayit([PD, asama(null, "planlama"), asama("ikinci-dogrulayici", "hazir")])
    );
    expect(rec.finished_at).toBeNull();
    expect(rec.stage).toBe("hazir");
  });

  it("merge'e ikinci kez geçilse bile İLK merge anı korunur", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        asama(null, "planlama"),
        asama("hazir", "merge"),
        asama("merge", "hazir"),
        asama("hazir", "merge"),
      ])
    );
    expect(rec.finished_at).toBe(TS(2));
  });
});

/* ── git ──────────────────────────────────────────────────────────────── */

describe("git — tekil işaretçiler ve birikimli commit'ler", () => {
  it("base/branch/merge tekil, commit'ler BİRİKİR", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        git("base", "d46b877", "B: Dynamic Composition Engine"),
        git("branch", "feature/package-journal"),
        git("commit", "aaa1111", "P0 saf çekirdek"),
        git("commit", "bbb2222", "P1 testler"),
        git("merge", "ccc3333", "PR #12"),
      ])
    );
    expect(rec.git).toEqual({
      base: "d46b877",
      branch: "feature/package-journal",
      commits: ["aaa1111", "bbb2222"],
      merge: "ccc3333",
    });
  });

  it("git olayı yoksa dört alan da boş başlar", () => {
    const rec = foldPackageJournal(kayit([PD]));
    expect(rec.git).toEqual({ base: null, branch: null, commits: [], merge: null });
  });
});

/* ── risk ─────────────────────────────────────────────────────────────── */

describe("risk — aynı id'nin son hâli geçerlidir", () => {
  it("acik→kapali güncellemesi closed_risks'e GEÇER, open'da kalmaz", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        risk("R-1", "acik", "vite stdout'u ayrıştırılmıyor"),
        risk("R-2", "acik", "packages/templates .tsx lint DIŞI"),
        risk("R-1", "kapali", "method alanıyla kapatıldı"),
      ])
    );
    expect(rec.open_risks.map((r) => r.risk_id)).toEqual(["R-2"]);
    expect(rec.closed_risks.map((r) => r.risk_id)).toEqual(["R-1"]);
    expect(rec.closed_risks[0]).toMatchObject({
      summary: "method alanıyla kapatıldı",
      ts: TS(3),
    });
  });

  it("kapali risk yeniden açılırsa open'a döner", () => {
    const rec = foldPackageJournal(
      kayit([PD, risk("R-1", "kapali", "kapandı"), risk("R-1", "acik", "yeniden açıldı")])
    );
    expect(rec.open_risks.map((r) => r.risk_id)).toEqual(["R-1"]);
    expect(rec.closed_risks).toEqual([]);
  });
});

/* ── doğrulayıcı ──────────────────────────────────────────────────────── */

describe("doğrulayıcı — sayı verdict'ten okunur", () => {
  it("son verdict kazanır; tek tek bulgular sayacı DEĞİŞTİRMEZ", () => {
    const rec = foldPackageJournal(
      kayit([
        PD,
        {
          type: "verifier_finding",
          payload: {
            finding_id: "B-1",
            severity: "blocker",
            summary: "kapı sayısı kapsamsız sunuluyor",
            file: "packages/shared/src/journal.ts",
          },
        },
        {
          type: "verifier_verdict",
          payload: { decision: "bulgu", findings_open: 1, findings_closed: 0, summary: "1 blocker" },
        },
        {
          type: "verifier_verdict",
          payload: { decision: "onay", findings_open: 0, findings_closed: 1, summary: "kapandı" },
        },
      ])
    );
    expect(rec.verifier).toEqual({
      decision: "onay",
      findings_open: 0,
      findings_closed: 1,
      summary: "kapandı",
      ts: TS(3),
    });
    /* Bulgu OLAYI kararın beyanından bağımsız durur: karar "0 açık" dese de
       kaydedilen bulgu kaybolmaz. */
    expect(rec.findings.map((f) => f.finding_id)).toEqual(["B-1"]);
  });

  /* Bu davranış eskiden YOKTU: `verifier_finding` olayları hiçbir yere
     düşmüyordu ve bulgu sayısı yalnız karardan doluyordu. Sonuç, doğrulama
     turunun ORTASINDAKİ paketin (bulgular yazılmış, karar henüz yok) hiç bulgu
     çıkmamış paketle aynı görünmesiydi — en riskli an, en sakin görünen andı. */
  it("KARAR YOKKEN kaydedilmiş bulgular korunur (sayı karardan türetilmez)", () => {
    const bulgu = (id: string, severity: "blocker" | "ciddi" | "kucuk"): JournalEvent => ({
      type: "verifier_finding",
      payload: { finding_id: id, severity, summary: `${id} özeti`, file: null },
    });
    const rec = foldPackageJournal(
      kayit([PD, bulgu("B-1", "blocker"), bulgu("B-2", "ciddi"), bulgu("B-3", "kucuk")])
    );
    expect(rec.findings).toEqual([
      { finding_id: "B-1", severity: "blocker", summary: "B-1 özeti", file: null, ts: TS(1) },
      { finding_id: "B-2", severity: "ciddi", summary: "B-2 özeti", file: null, ts: TS(2) },
      { finding_id: "B-3", severity: "kucuk", summary: "B-3 özeti", file: null, ts: TS(3) },
    ]);
    /* Karar yok: beyan da yok. Biri diğerini ÖRTMEZ. */
    expect(rec.verifier.decision).toBeNull();
    expect(rec.verifier.findings_open).toBe(0);
  });

  it("bulgu listesi girdiyi DEĞİŞTİRMEZ (fold saflığı iç içe yapılara da uzanır)", () => {
    const satirlar = kayit([
      PD,
      {
        type: "verifier_finding",
        payload: { finding_id: "B-9", severity: "ciddi", summary: "özet", file: "a.ts" },
      },
    ]);
    const once = JSON.stringify(satirlar);
    const rec = foldPackageJournal(satirlar);
    rec.findings[0].summary = "SIZDI";
    expect(JSON.stringify(satirlar)).toBe(once);
  });
});

/* ── anlatı ───────────────────────────────────────────────────────────── */

describe("notes — ANLATI ölçüm sınıfına karışmaz (11.4)", () => {
  it("sayı içeren not kapı ölçümüne dönüşmez", () => {
    const rec = foldPackageJournal(
      kayit([PD, not("bundle 187.45 gibi görünüyor ama ÖLÇÜLMEDİ"), not("dal silindi")])
    );
    expect(rec.notes.map((n) => n.text)).toEqual([
      "bundle 187.45 gibi görünüyor ama ÖLÇÜLMEDİ",
      "dal silindi",
    ]);
    expect(rec.notes[0]).toMatchObject({ ts: TS(1), actor: AJAN });
    expect(rec.gates).toEqual({});
    expect(rec.gate_history).toEqual([]);
  });
});

/* ── sınır ────────────────────────────────────────────────────────────── */

describe("boş akış", () => {
  it("çökertmez ve hiçbir alan uydurulmaz", () => {
    expect(foldPackageJournal([])).toEqual({
      package_id: "",
      identity: null,
      started_at: null,
      finished_at: null,
      stage: null,
      stage_history: [],
      gates: {},
      gate_history: [],
      active_agents: [],
      verifier: {
        decision: null,
        findings_open: 0,
        findings_closed: 0,
        summary: null,
        ts: null,
      },
      findings: [],
      git: { base: null, branch: null, commits: [], merge: null },
      open_risks: [],
      closed_risks: [],
      notes: [],
      event_count: 0,
      last_event_ts: null,
      chain_head: null,
    });
  });

  it("event_count, last_event_ts ve chain_head akışın ucundan okunur", () => {
    const lines = kayit([PD, not("a"), not("b")]);
    const rec = foldPackageJournal(lines);
    expect(rec.event_count).toBe(3);
    expect(rec.last_event_ts).toBe(TS(2));
    expect(rec.chain_head).toBe(hex(3));
    expect(rec.package_id).toBe("PJ-01");
  });
});
