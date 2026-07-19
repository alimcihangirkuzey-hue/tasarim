/* Cockpit modül fazı 0 — PACKAGE JOURNAL, saf çekirdek (Canonical 11.3/11.5/11.7).

   Bu dosya ŞEMADIR ve I/O yapmaz: node:fs, node:crypto, process YOKTUR.
   Yazma, ölçüm ve hash hesabı @tezgah/journal'da yaşar; buradaki zincir
   doğrulayıcısı digest'i ENJEKTE alır (f1-completeness'in "saf motor dar
   görünüm alır" deseni). Böylece zincir mantığı I/O'suz test edilebilir.

   İKİ KAYIT TÜRÜ (11.3):
   · OLAY kaydı  — diskteki tek gerçek; append-only JSONL, satır başına bir olay
   · PAKET kaydı — DOSYASI YOKTUR; journal-fold.ts olay akışından TÜRETİR.
     Ayrı yazılabilecek bir yer bırakılmadığı için "türetilmemesi" imkânsızdır;
     11.3'ün "aşama bağımsız yazılan alan değil, türetilen görünümdür" hükmü
     üslup kuralı değil YAPISAL kısıt olur.

   DEĞİŞMEZLİK üç katmanla korunur: boşluksuz `seq` (silme/ekleme boşluk açar) ·
   `prev` hash zinciri (N. satırı düzenlemek N..son tüm hash'leri geçersizler) ·
   git tarihçesi (verify.ts'te silinen-satır=0 şartı). Tek başına hiçbiri yetmez:
   ölçüldü ki temiz ortaya-sokma git diff'e `1 0` görünür — onu yakalayan seq
   bitişikliği ve zincirdir. */

export const JOURNAL_SCHEMA_VERSION = 1;

/* ── Kapalı sözlükler ─────────────────────────────────────────────────── */

/** 11.5 yaşam döngüsü — SIRA ANLAMLIDIR (geçiş kuralı indeksten okur) */
export const JOURNAL_STAGES = [
  "planlama",
  "canonical-kaydi",
  "gelistirme",
  "test",
  "ikinci-dogrulayici",
  "hazir",
  "merge",
  "dagitim",
] as const;
export type JournalStage = (typeof JOURNAL_STAGES)[number];

/** 11.7: rol modeli UYGULANMAZ, yeri şimdiden ayrılır */
export const JOURNAL_ACTOR_ROLES = [
  "urun-sahibi",
  "uygulayici",
  "dogrulayici",
  "hakem",
  "kesif",
  "otomasyon",
] as const;
export type JournalActorRole = (typeof JOURNAL_ACTOR_ROLES)[number];

/** 11.3 ölçüm dürüstlüğü: DÖRT değer — ikili değil.
    Koşulmayan kapı "gecti" yazılamaz; atlanan "atlandi", ölçülemeyen
    "olculemedi" olarak kayda geçer. */
export const JOURNAL_GATE_OUTCOMES = ["gecti", "kaldi", "atlandi", "olculemedi"] as const;
export type JournalGateOutcome = (typeof JOURNAL_GATE_OUTCOMES)[number];

/** 11.3 kaynak dürüstlüğü: tahmin YASAK DEĞİL, ölçüm gibi sunulması yasak */
export const JOURNAL_ORIGINS = ["olculdu", "turetilmis", "tahmini"] as const;
export type JournalOrigin = (typeof JOURNAL_ORIGINS)[number];

export interface JournalGateSpec {
  /** REFERANS komut — koşucunun gerçekten çalıştırdığı çağrı `run.command`'dadır
      ve ondan sapabilir (ör. `test` kapısı workspace başına ayrı koşar). Bu alan
      kapının ne olduğunu insana anlatır; ölçümün kaynağı DEĞİLDİR. İnsan kapısında null. */
  command: string | null;
  /** true → insan turu gerektirir (11.6/3: yeşil testle ikame EDİLEMEZ) */
  human: boolean;
  /** true → bu kapı ölçüldüğünde SAYI üretmek zorundadır. typecheck false'tur:
      başarısı sessizdir ve sayısızlığı meşrudur. Bu ayrım olmadan "lint sessizce
      sayı kaybetti" ile "typecheck zaten sayı üretmez" birbirinden ayrılamaz. */
  produces_values: boolean;
  /** Kapının ÖLÇMEDİĞİ şey. Faz 1 bunu her sayının yanında göstermek ZORUNDA;
      aksi hâlde "lint 0" ifadesi kapsamı kadar dürüst olmayan bir sayı olur. */
  scope: string;
}

/** Kapı kütüğü — kapsam şerhi kapı tanımının YANINDA veri olarak durur */
export const JOURNAL_GATES = {
  typecheck: {
    command: "npm run typecheck",
    human: false,
    produces_values: false,
    scope:
      "5 workspace; başarı SESSİZDİR — tek sinyal exit code (tsc hatası 2 döner, 1 değil), sayısal değer yok. Hangi workspace'in kaldığı exit code'dan ÇIKARILAMAZ",
  },
  lint: {
    command: "npx eslint . --format json -o <tmp>",
    human: false,
    produces_values: true,
    scope:
      "eslint.config.js deseni packages/*/src/**/*.ts — packages/templates'teki .tsx DENETİM DIŞI. values.files = DENETLENEN dosya sayısı, sorunlu dosya değil",
  },
  test: {
    command: "npm test",
    human: false,
    produces_values: true,
    scope:
      "koşucu workspace başına AYRI koşar (referans komutun kök fan-out'u apps/web'i sessizce atlardı); apps/web'in test script'i YOK — o workspace ölçüm dışıdır",
  },
  build: {
    command: "npm run build -w apps/web",
    human: false,
    produces_values: false,
    scope: "yalnız apps/web derlenir; kökte build script'i tanımlı DEĞİL",
  },
  bundle: {
    command: "npm run build -w apps/web",
    human: false,
    produces_values: true,
    scope:
      "dist/assets/*.js gzip boyutu; vite'ın kendi stdout satırı AYRIŞTIRILMAZ. ÖLÇÜM NODE_ENV=production ile alınır — test sürecinden miras kalan NODE_ENV=test React'in development yapısını derler ve boyutu ~%42 şişirir (ölçüldü: 191.13 → 271.19)",
  },
  gt: {
    command: null,
    human: true,
    produces_values: false,
    scope: "görsel yargı (reflow, simetri); otomatik ölçümü YOKTUR — KK-7a tetik listesi",
  },
  smoke: {
    command: null,
    human: true,
    produces_values: false,
    scope: "canlı sunucuda elle akış; otomatik ölçümü YOKTUR",
  },
} as const satisfies Record<string, JournalGateSpec>;

export type JournalGateName = keyof typeof JOURNAL_GATES;

export const JOURNAL_GATE_NAMES = Object.keys(JOURNAL_GATES) as JournalGateName[];

export function isJournalGateName(x: string): x is JournalGateName {
  return Object.prototype.hasOwnProperty.call(JOURNAL_GATES, x);
}

/* ── Aktör (11.7) ─────────────────────────────────────────────────────── */

/** ASLA null. brief_audit aktörü 8 olay türünün 5'inde NULL bırakıyor;
    o kayıt "kim yaptı" sorusunu geriye dönük cevaplayamıyor — tekrarlanmaz. */
export interface JournalActor {
  kind: "human" | "agent";
  id: string;
  role: JournalActorRole;
}

/* ── Kapı ölçümü ──────────────────────────────────────────────────────── */

export interface JournalGateRun {
  gate: JournalGateName;
  outcome: JournalGateOutcome;
  origin: JournalOrigin;
  /** TEK STRING — argv dizisi değil: Windows'ta npm bir .cmd kabuğudur */
  command: string | null;
  cwd: string | null;
  tool: { name: string; version: string } | null;
  /** ör. "win32/node24.15.0/npm11.12.1" — süreler makineye bağlıdır */
  runner_platform: string | null;
  exit_code: number | null;
  /** Zarfın `ts`'inden AYRIDIR: kayıt anı ≠ ölçüm anı */
  measured_at: string | null;
  duration_ms: number | null;
  values: Record<string, number> | null;
  /** Sayı komutun kendi stdout'undan gelmiyorsa NASIL çıkarıldığı.
      bundle'da command "npm run build" iken sayı gzip(dist/*.js)'ten gelir;
      ikisini tek alanda birleştirmek kaynak dürüstlüğünü ihlal ederdi. */
  method: string | null;
  /** İnsan kapısında kanıt işaretçisi (11.6/3: sözlü onay yetmez) */
  evidence: string | null;
  /** atlandi/olculemedi/tahmini için ZORUNLU gerekçe */
  reason: string | null;
  raw_evidence: string | null;
  raw_sha256: string | null;
}

/* ── Olaylar (11.3-b) ─────────────────────────────────────────────────── */

export interface JournalPackageDeclared {
  name: string;
  purpose: string;
  canonical_version: string;
  canonical_sections: string[];
  adr_tdr: string[];
  modules: string[];
  contracts: string[];
  scope_in: string[];
  scope_out: string[];
  risk_class: "dusuk" | "orta" | "yuksek";
}

export type JournalEvent =
  | { type: "package_declared"; payload: JournalPackageDeclared }
  | { type: "stage_changed"; payload: { from: JournalStage | null; to: JournalStage } }
  | { type: "gate_run"; payload: JournalGateRun }
  | { type: "agent_started"; payload: { agent_label: string; task: string } }
  | {
      type: "agent_finished";
      payload: { agent_label: string; outcome: "ok" | "hata" | "atlandi"; summary: string };
    }
  | {
      type: "verifier_finding";
      payload: {
        finding_id: string;
        severity: "blocker" | "ciddi" | "kucuk";
        summary: string;
        file: string | null;
      };
    }
  | {
      type: "verifier_verdict";
      payload: {
        decision: "onay" | "bulgu";
        findings_open: number;
        findings_closed: number;
        summary: string;
      };
    }
  | {
      type: "git_recorded";
      payload: { kind: "base" | "branch" | "commit" | "merge"; value: string; subject: string | null };
    }
  | {
      type: "risk_recorded";
      payload: { risk_id: string; status: "acik" | "kapali"; summary: string };
    }
  /** ANLATI — ölçüm DEĞİL. Ayrı tür olduğu için Faz 1'de ölçüm alanına sızamaz. */
  | { type: "note"; payload: { text: string } };

export type JournalEventType = JournalEvent["type"];

export const JOURNAL_EVENT_TYPES: JournalEventType[] = [
  "package_declared",
  "stage_changed",
  "gate_run",
  "agent_started",
  "agent_finished",
  "verifier_finding",
  "verifier_verdict",
  "git_recorded",
  "risk_recorded",
  "note",
];

/** Diskteki satır. ANAHTAR SIRASI SABİTTİR — canonicalJson zaten sıralar,
    ama okunabilir diff için yazma da bu sırayı korur. */
export type JournalLine = JournalEvent & {
  v: number;
  package_id: string;
  /** 1-tabanlı, BOŞLUKSUZ, kesin artan — silme/ekleme yapısal olarak görünür */
  seq: number;
  ts: string;
  actor: JournalActor;
  /** Önceki satırın hash'i; seq===1 ise null */
  prev: string | null;
  /** sha256(canonicalJson(satır − hash)) — 64 hex */
  hash: string;
};

/* ── Doğrulama sonucu ─────────────────────────────────────────────────── */

export type JournalCheck = { ok: true } | { ok: false; issues: string[] };

const fail = (issues: string[]): JournalCheck =>
  issues.length === 0 ? { ok: true } : { ok: false, issues };

const isNonEmpty = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HEX64 = /^[0-9a-f]{64}$/;

/* ── Aşama geçişi (11.5) ──────────────────────────────────────────────── */

/**
 * İleri geçiş TAM BİR ADIM olmak zorundadır → "aşama sessizce ileri atlamaz"
 * yapısal olarak imkânsızdır. Geriye dönüş HERHANGİ mesafe serbesttir:
 * 11.5 doğrulayıcının bulgu çıkarmasını GEÇERLİ geçiş sayar. Aynı aşamaya
 * geçiş reddedilir (olay üretmeyen geçiş kaydı gürültüdür).
 */
export function isValidStageTransition(
  from: JournalStage | null,
  to: JournalStage
): boolean {
  if (from === null) return to === "planlama";
  const i = JOURNAL_STAGES.indexOf(from);
  const j = JOURNAL_STAGES.indexOf(to);
  if (i < 0 || j < 0 || i === j) return false;
  return j < i || j === i + 1;
}

/* ── Ölçüm dürüstlüğü (11.3) ──────────────────────────────────────────── */

/**
 * Altı kural. CLI bunları BAYRAKLA aşamaz: makine kapılarında --outcome
 * kabul edilmez, insan kapılarında --command/--exit-code kabul edilmez.
 */
export function checkGateHonesty(run: JournalGateRun): JournalCheck {
  const issues: string[] = [];
  const spec = JOURNAL_GATES[run.gate] as JournalGateSpec | undefined;
  if (!spec) return { ok: false, issues: [`bilinmeyen kapı: ${String(run.gate)}`] };

  /* 0 — KAPALI SÖZLÜK DENETİMİ, her şeyden önce.
     Bu denetim olmadan `outcome:"PASSED"` gibi bir yazım hatası aşağıdaki
     `measured` hesabında SESSİZCE false'a düşer ve gerçek bir ölçüm, gerekçeli
     bir ölçümsüzlüğe dönüşür — yani tam olarak bu modülün önlemek için var
     olduğu sessiz bozulma. Tanınmayan değer SERT HATADIR, varsayılan değildir. */
  if (!JOURNAL_GATE_OUTCOMES.includes(run.outcome)) {
    return { ok: false, issues: [`bilinmeyen outcome: ${String(run.outcome)}`] };
  }
  if (!JOURNAL_ORIGINS.includes(run.origin)) {
    return { ok: false, issues: [`bilinmeyen origin: ${String(run.origin)}`] };
  }

  const measured = run.outcome === "gecti" || run.outcome === "kaldi";

  /* 1 — makine kapısının sonucu yalnız GERÇEK koşumdan doğar */
  if (!spec.human && measured) {
    if (run.origin !== "olculdu") issues.push("makine kapısı sonucu origin='olculdu' olmalı");
    if (!isNonEmpty(run.command)) issues.push("makine kapısı sonucu command olmadan yazılamaz");
    if (run.exit_code === null) issues.push("makine kapısı sonucu exit_code olmadan yazılamaz");
    if (run.tool === null) issues.push("makine kapısı sonucu tool sürümü olmadan yazılamaz");
    if (!isNonEmpty(run.measured_at)) issues.push("makine kapısı sonucu measured_at taşımalı");
    /* Koşum ortamı olmadan süre yorumlanamaz — "3s" hangi makinede? */
    if (!isNonEmpty(run.runner_platform)) issues.push("makine kapısı sonucu runner_platform taşımalı");

    /* SONUÇ ile EXIT CODE TUTARLILIĞI. Bu olmadan `outcome:"gecti"` +
       `exit_code:1` altı kuralın hepsinden geçiyordu: kural yalnız exit_code'un
       VAR OLMASINI şart koşuyordu, sonucu DOĞRULAMASINI değil. */
    if (typeof run.exit_code === "number") {
      if (run.outcome === "gecti" && run.exit_code !== 0) {
        issues.push(`outcome='gecti' ama exit_code=${run.exit_code} — çelişki`);
      }
      if (run.outcome === "kaldi" && run.exit_code === 0) {
        issues.push("outcome='kaldi' ama exit_code=0 — çelişki");
      }
    }

    /* İnsan imzası makine kapısına iliştirilemez: kanıt alanı, ölçümü
       görsel yargıyla ikame etmenin arka kapısı olurdu (11.6/3'ün simetriği). */
    if (run.evidence !== null) issues.push("makine kapısı insan kanıtı taşıyamaz");
  }

  /* 2 — insan kapısı: kanıt şart, exit_code olamaz, AJAN İMZALAYAMAZ (11.6/3) */
  if (spec.human && measured) {
    if (!isNonEmpty(run.evidence)) issues.push("insan kapısı kanıt kaydı olmadan yazılamaz");
    if (run.exit_code !== null) issues.push("insan kapısında exit_code olamaz");
  }

  /* 3 — koşulmayan kapı sayı taşıyamaz */
  if (!measured) {
    if (!isNonEmpty(run.reason)) issues.push(`outcome='${run.outcome}' gerekçe ZORUNLU`);
    if (run.values !== null) issues.push(`outcome='${run.outcome}' sayısal değer taşıyamaz`);
  }

  /* 4 — ölçülmemiş değer gerekçesiz sunulamaz */
  if (run.origin !== "olculdu" && !isNonEmpty(run.reason)) {
    issues.push(`origin='${run.origin}' gerekçe ZORUNLU`);
  }

  /* 5 — sayı komutun stdout'undan gelmiyorsa yöntemi yazılır */
  if (run.values !== null && !isNonEmpty(run.method)) {
    issues.push("values var: sayının nasıl çıkarıldığı (method) ZORUNLU");
  }

  /* 5b — SAYININ SONLU OLMASI. NaN/Infinity tipten geçer (`typeof NaN` ===
     "number") ama canonicalJson onları `null`'a çevirir: hash girdisi bellekteki
     değerden AYRIŞIR ve satır round-trip'te sessizce null döner. Kurcalama-kanıtı
     zincirin temelinde bütünlük deliği — sayı burada, merkezde kapatılır. */
  if (run.values !== null) {
    for (const [k, v] of Object.entries(run.values)) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        issues.push(`values.${k} sonlu sayı değil (${String(v)})`);
      }
    }
  }

  /* 5c — sayı üretmesi beklenen kapı sessizce sayısız geçemez. Aksi hâlde
     ölçümün kaybolması, typecheck'in MEŞRU sayısızlığından ayırt edilemezdi. */
  if (!spec.human && measured && spec.produces_values && run.values === null) {
    issues.push(`'${run.gate}' kapısı sayı üretmek zorunda; values null olamaz`);
  }

  /* 6 — insan kapısı otomatikleştirilemez (11.6/3) */
  if (spec.human && run.command !== null) issues.push("insan kapısı komuta bağlanamaz");

  /* 7 — ham kanıt yalnız KALAN kapıda, ve işaretçi/özet çifti eksiksiz olmalı.
     Denetimsiz bırakılırsa "geçti" satırı da kanıt taşıyabilir ve raw_sha256
     hiçbir şeyi bağlamayan süs bir dize olur. */
  if (run.raw_evidence !== null || run.raw_sha256 !== null) {
    if (run.outcome !== "kaldi") issues.push("ham kanıt yalnız outcome='kaldi' satırında olur");
    if (!isNonEmpty(run.raw_evidence)) issues.push("raw_sha256 var ama raw_evidence yok");
    if (typeof run.raw_sha256 !== "string" || !HEX64.test(run.raw_sha256)) {
      issues.push("raw_sha256 64 hex olmalı");
    }
  }

  return fail(issues);
}

/** İnsan kapısını ajanın imzalamasını engeller — actor zarfta olduğu için ayrı kural */
export function checkGateActor(run: JournalGateRun, actor: JournalActor): JournalCheck {
  const spec = JOURNAL_GATES[run.gate] as JournalGateSpec | undefined;
  if (!spec) return { ok: false, issues: [`bilinmeyen kapı: ${String(run.gate)}`] };
  const measured = run.outcome === "gecti" || run.outcome === "kaldi";
  if (spec.human && measured && actor.kind !== "human") {
    return { ok: false, issues: ["insan turu gereken kapıyı ajan imzalayamaz (11.6/3)"] };
  }
  return { ok: true };
}

/* ── Satır doğrulama ──────────────────────────────────────────────────── */

const strArray = (x: unknown): boolean =>
  Array.isArray(x) && x.every((s) => typeof s === "string");

/**
 * Payload GÖVDESİNİ türüne göre denetler. Bu olmadan kapalı birlik yalnız
 * AYIRT EDİCİYİ (`type`) koruyordu; `{type:"note", payload:{}}` ve
 * `{type:"git_recorded", payload:{kind:"ZIPLA"}}` geçerli sayılıyordu —
 * yani 10 olay türünün 8'i şemasızdı. `payload_json`'ı şemasız bırakan
 * brief_audit kusurunun aynısıydı.
 */
export function validateJournalPayload(type: JournalEventType, payload: unknown): JournalCheck {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, issues: ["payload bir nesne değil"] };
  }
  const p = payload as Record<string, unknown>;
  const issues: string[] = [];
  const req = (k: string) => {
    if (!isNonEmpty(p[k])) issues.push(`payload.${k} boş olamaz`);
  };
  const oneOf = (k: string, allowed: readonly string[]) => {
    if (!allowed.includes(p[k] as string)) {
      issues.push(`payload.${k} geçersiz: ${String(p[k])} (beklenen: ${allowed.join("|")})`);
    }
  };
  const intAtLeast0 = (k: string) => {
    const v = p[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
      issues.push(`payload.${k} negatif olmayan tamsayı olmalı`);
    }
  };

  switch (type) {
    case "package_declared": {
      req("name");
      req("purpose");
      req("canonical_version");
      oneOf("risk_class", ["dusuk", "orta", "yuksek"]);
      for (const k of [
        "canonical_sections",
        "adr_tdr",
        "modules",
        "contracts",
        "scope_in",
        "scope_out",
      ]) {
        if (!strArray(p[k])) issues.push(`payload.${k} dize dizisi olmalı`);
      }
      if (Array.isArray(p.canonical_sections) && p.canonical_sections.length === 0) {
        issues.push("payload.canonical_sections en az bir bölüm taşımalı (izlenebilirlik)");
      }
      break;
    }
    case "stage_changed": {
      if (p.from !== null && !JOURNAL_STAGES.includes(p.from as JournalStage)) {
        issues.push(`payload.from bilinmeyen aşama: ${String(p.from)}`);
      }
      oneOf("to", JOURNAL_STAGES);
      break;
    }
    case "gate_run": {
      if (!isJournalGateName(String(p.gate))) issues.push(`payload.gate bilinmiyor: ${String(p.gate)}`);
      break; /* ayrıntı checkGateHonesty'de */
    }
    case "agent_started": {
      req("agent_label");
      req("task");
      break;
    }
    case "agent_finished": {
      req("agent_label");
      req("summary");
      oneOf("outcome", ["ok", "hata", "atlandi"]);
      break;
    }
    case "verifier_finding": {
      req("finding_id");
      req("summary");
      oneOf("severity", ["blocker", "ciddi", "kucuk"]);
      if (p.file !== null && !isNonEmpty(p.file)) issues.push("payload.file dize ya da null olmalı");
      break;
    }
    case "verifier_verdict": {
      req("summary");
      oneOf("decision", ["onay", "bulgu"]);
      intAtLeast0("findings_open");
      intAtLeast0("findings_closed");
      /* 11.6/1: açık bulgu varken onay verilemez — kapı yeşil değilken geçilemez */
      if (p.decision === "onay" && typeof p.findings_open === "number" && p.findings_open > 0) {
        issues.push("açık bulgu varken 'onay' verilemez");
      }
      break;
    }
    case "git_recorded": {
      req("value");
      oneOf("kind", ["base", "branch", "commit", "merge"]);
      if (p.subject !== null && !isNonEmpty(p.subject)) {
        issues.push("payload.subject dize ya da null olmalı");
      }
      break;
    }
    case "risk_recorded": {
      req("risk_id");
      req("summary");
      oneOf("status", ["acik", "kapali"]);
      break;
    }
    case "note": {
      req("text");
      break;
    }
  }
  return fail(issues);
}

/** Ham JSON → şema denetimi. zod DEĞİL: shared'ın elle-validator deseni (f1-spec). */
export function validateJournalLine(raw: unknown): JournalCheck {
  const issues: string[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, issues: ["satır bir nesne değil"] };
  }
  const l = raw as Record<string, unknown>;

  if (l.v !== JOURNAL_SCHEMA_VERSION) issues.push(`v !== ${JOURNAL_SCHEMA_VERSION}`);
  if (!isNonEmpty(l.package_id)) issues.push("package_id boş");
  if (typeof l.seq !== "number" || !Number.isInteger(l.seq) || l.seq < 1) {
    issues.push("seq 1-tabanlı tamsayı olmalı");
  }
  if (typeof l.ts !== "string" || !ISO_UTC.test(l.ts)) issues.push("ts ISO-8601 UTC(ms) olmalı");

  const a = l.actor as Record<string, unknown> | undefined;
  if (typeof a !== "object" || a === null) {
    issues.push("actor ZORUNLU");
  } else {
    if (a.kind !== "human" && a.kind !== "agent") issues.push("actor.kind human|agent olmalı");
    if (!isNonEmpty(a.id)) issues.push("actor.id boş olamaz");
    if (!JOURNAL_ACTOR_ROLES.includes(a.role as JournalActorRole)) {
      issues.push(`actor.role bilinmiyor: ${String(a.role)}`);
    }
  }

  /* Kapalı birlik: bilinmeyen tür SERT HATA. brief_audit'in kısıtsız TEXT
     event_type kolonu, tipo'yu geçerli olay gibi kabul ediyor. */
  if (!JOURNAL_EVENT_TYPES.includes(l.type as JournalEventType)) {
    issues.push(`bilinmeyen olay türü: ${String(l.type)}`);
  }
  if (typeof l.payload !== "object" || l.payload === null) {
    issues.push("payload ZORUNLU");
  } else if (JOURNAL_EVENT_TYPES.includes(l.type as JournalEventType)) {
    const pv = validateJournalPayload(l.type as JournalEventType, l.payload);
    if (!pv.ok) issues.push(...pv.issues);
  }

  if (l.seq === 1) {
    if (l.prev !== null) issues.push("seq=1 satırında prev null olmalı");
  } else if (typeof l.prev !== "string" || !HEX64.test(l.prev)) {
    issues.push("prev 64 hex olmalı");
  }
  if (typeof l.hash !== "string" || !HEX64.test(l.hash)) issues.push("hash 64 hex olmalı");

  if (l.type === "gate_run" && typeof l.payload === "object" && l.payload !== null) {
    const g = checkGateHonesty(l.payload as JournalGateRun);
    if (!g.ok) issues.push(...g.issues);
    if (a && typeof a === "object") {
      const ga = checkGateActor(l.payload as JournalGateRun, a as unknown as JournalActor);
      if (!ga.ok) issues.push(...ga.issues);
    }
  }
  if (l.type === "stage_changed" && typeof l.payload === "object" && l.payload !== null) {
    const p = l.payload as { from: JournalStage | null; to: JournalStage };
    if (!isValidStageTransition(p.from ?? null, p.to)) {
      issues.push(`geçersiz aşama geçişi: ${String(p.from)} → ${String(p.to)}`);
    }
  }

  return fail(issues);
}

/** Dosya bütünlüğü — yapı kuralları (zincirden AYRI: bu ŞEKİL denetler, o İÇERİK) */
export function verifyJournalStructure(lines: JournalLine[], packageId: string): JournalCheck {
  const issues: string[] = [];
  if (lines.length === 0) return { ok: false, issues: ["journal boş"] };

  if (lines[0].type !== "package_declared") issues.push("ilk satır package_declared olmalı");
  const declared = lines.filter((l) => l.type === "package_declared").length;
  if (declared !== 1) issues.push(`package_declared tam bir kez olmalı (bulunan: ${declared})`);

  let stage: JournalStage | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const v = validateJournalLine(l);
    if (!v.ok) issues.push(`seq ${l.seq}: ${v.issues.join(" · ")}`);
    if (l.package_id !== packageId) {
      issues.push(`seq ${l.seq}: package_id dosya adıyla uyuşmuyor (${l.package_id} ≠ ${packageId})`);
    }
    if (l.seq !== i + 1) issues.push(`seq boşluğu/atlaması: beklenen ${i + 1}, bulunan ${l.seq}`);
    if (i > 0 && l.ts < lines[i - 1].ts) issues.push(`seq ${l.seq}: ts geriye gidiyor`);
    if (l.type === "stage_changed") {
      const p = l.payload as { from: JournalStage | null; to: JournalStage };
      if ((p.from ?? null) !== stage) {
        issues.push(`seq ${l.seq}: geçişin from'u akışla uyuşmuyor (akış: ${String(stage)})`);
      }
      stage = p.to;
    }
  }
  return fail(issues);
}

/* ── Kanonik serileştirme + hash zinciri ──────────────────────────────── */

/** Anahtar-sıralı, boşluksuz JSON — hash girdisi platformdan bağımsız olsun */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  /* undefined / function — JSON'da yeri yok; sessizce atlamak yerine patlar */
  throw new Error(`canonicalJson: serileştirilemeyen değer (${typeof value})`);
}

/**
 * Hash'lenen gövde: `hash` HARİÇ, `prev` DAHİL — zincirin taşıyıcısı budur.
 *
 * Parametre TAM satırdır. Önceki imza `Omit<JournalLine,"hash">` idi ve birliği
 * tek nesneye çökertiyordu: `type` tüm türlerin, `payload` tüm payload'ların
 * birleşimi oluyor, aralarındaki EŞLEŞME kayboluyordu — `{type:"note",
 * payload:<kapı ölçümü>}` tip denetiminden geçerdi. `DistributiveOmit` bunu
 * kapatıyor ama TS bir birliği nesne literaline yaydığında korelasyonu zaten
 * kaybettiği için her çağırma noktasına cast gerekiyordu; cast de aynı deliği
 * geri açardı, üstelik daha görünmez biçimde.
 *
 * `DistributiveOmit` korelasyonu korur ve hem hash'siz taslağı hem tam satırı
 * kabul eder (alan zaten siliniyor, dolayısıyla `hash` değeri sonucu etkilemez).
 * Çalışma zamanında aynı garantiyi `validateJournalPayload` bağımsız olarak
 * verir: uyuşmayan tür/gövde çifti `appendEvent`'ten GEÇEMEZ.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export function journalHashInput(line: DistributiveOmit<JournalLine, "hash">): string {
  const { ...rest } = line as Record<string, unknown>;
  delete rest.hash;
  return canonicalJson(rest);
}

/**
 * Zinciri yürür. digest ENJEKTE EDİLİR (node:crypto shared'a giremez).
 *
 * İki tespit ALTERNATİFTİR, eşzamanlı değil — zincir SAKLANAN hash'ten yürür
 * (`prev = l.hash`), hesaplanandan değil: satır düzenlenip hash'i yenilenmezse
 * "hash tutmuyor" düşer; hash de yenilenirse bu kez sonraki satırın `prev`'i
 * kopar. Her durumda en az biri düşer; ikisinin birden düşmesi gerekmez.
 */
export function verifyJournalChain(
  lines: JournalLine[],
  digest: (input: string) => string
): JournalCheck {
  const issues: string[] = [];
  let prev: string | null = null;
  for (const l of lines) {
    const expected = digest(journalHashInput(l));
    if (l.hash !== expected) issues.push(`seq ${l.seq}: hash tutmuyor (satır düzenlenmiş)`);
    if (l.prev !== prev) issues.push(`seq ${l.seq}: prev zinciri kopuk`);
    prev = l.hash;
  }
  return fail(issues);
}
