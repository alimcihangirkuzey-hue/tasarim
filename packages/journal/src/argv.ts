/* Cockpit modül fazı 0 — CLI ARGV AYRIŞTIRICI (Canonical 11.3 / 11.6).

   SAF: node:fs, node:child_process, process YOKTUR. Ayrıştırma bir VERİ
   dönüşümüdür; diske dokunmadığı için kilit kuralları I/O kurmadan sabitlenebilir
   — argv.test.ts'in hem hızlı hem gerçekten bir şey ölçüyor olmasının sebebi budur.

   BU DOSYANIN ASIL DEĞERİ AYRIŞTIRMA DEĞİL, KİLİTLERDİR. 11.3'ün ölçüm
   dürüstlüğü burada bir üslup kuralı değil, ARGÜMAN YÜZEYİNİN ŞEKLİDİR:

   · MAKİNE kapısında (typecheck/lint/test/build/bundle) --outcome · --exit-code ·
     --command · --reason YOKTUR. Sonuç yalnız gerçek koşumdan doğabilir; elle
     "gecti" yazmanın SÖZDİZİMİ bırakılmamıştır. Yasak bir denetimle değil,
     dilbilgisiyle kurulur — denetim gevşetilebilir, olmayan bayrak gevşetilemez.
   · İNSAN kapısında (gt/smoke) --command · --exit-code YOKTUR; --evidence
     ZORUNLUDUR (11.6/3: sözlü onay yetmez) ve ölçülmüş bir sonucu AJAN imzalayamaz.
   · TANINMAYAN BAYRAK REDDEDİLİR. --skip/--force bu CLI'da yok; sessizce yok
     sayılsalardı "işe yaradı" izlenimi üretirlerdi — bu, sahte-yeşilin en ucuz
     biçimidir. Yok sayma yerine yüzde yüz red.

   Kaçış bayrağı BİLEREK yoktur ve eklenmemelidir: kaçış bayrağı olan bir kilit,
   kilit değil öneridir. */

import {
  JOURNAL_ACTOR_ROLES,
  JOURNAL_GATES,
  JOURNAL_GATE_NAMES,
  JOURNAL_GATE_OUTCOMES,
  JOURNAL_STAGES,
  isJournalGateName,
  type JournalActor,
  type JournalGateName,
  type JournalGateOutcome,
  type JournalPackageDeclared,
  type JournalStage,
} from "@tezgah/shared";

/* ── Ayrıştırılmış komut ──────────────────────────────────────────────── */

/** İnsan kapısının elle verilen bölümü. Makine kapısında bu alan NULL'dur —
    tip düzeyinde: makine kapısı için elle sonuç taşıyacak bir yer YOKTUR. */
export interface JournalHumanGateInput {
  outcome: JournalGateOutcome;
  /** 11.6/3: kanıt işaretçisi zorunlu */
  evidence: string;
  /** atlandi/olculemedi için zorunlu; gecti/kaldi'da null */
  reason: string | null;
}

export type ParsedJournalCommand =
  | { cmd: "declare"; packageId: string; payload: JournalPackageDeclared; actor: JournalActor }
  | { cmd: "stage"; packageId: string; to: JournalStage; actor: JournalActor }
  | {
      cmd: "gate";
      packageId: string;
      gate: JournalGateName;
      actor: JournalActor;
      /** null → makine kapısı: sonucu CLI runGate()'ten alır, argv'den ASLA */
      human: JournalHumanGateInput | null;
    }
  | {
      cmd: "git";
      packageId: string;
      kind: "base" | "branch" | "commit" | "merge";
      value: string;
      subject: string | null;
      actor: JournalActor;
    }
  | { cmd: "agent"; packageId: string; phase: "started"; agentLabel: string; task: string; actor: JournalActor }
  | {
      cmd: "agent";
      packageId: string;
      phase: "finished";
      agentLabel: string;
      /** BİLEREK --result: --outcome tek bir şey demeli (kapı yargısı) */
      result: "ok" | "hata" | "atlandi";
      summary: string;
      actor: JournalActor;
    }
  | {
      cmd: "verifier";
      packageId: string;
      kind: "finding";
      findingId: string;
      severity: "blocker" | "ciddi" | "kucuk";
      summary: string;
      file: string | null;
      actor: JournalActor;
    }
  | {
      cmd: "verifier";
      packageId: string;
      kind: "verdict";
      decision: "onay" | "bulgu";
      findingsOpen: number;
      findingsClosed: number;
      summary: string;
      actor: JournalActor;
    }
  | {
      cmd: "risk";
      packageId: string;
      riskId: string;
      status: "acik" | "kapali";
      summary: string;
      actor: JournalActor;
    }
  | { cmd: "note"; packageId: string; text: string; actor: JournalActor }
  | { cmd: "show"; packageId: string }
  | { cmd: "verify" }
  | { cmd: "error"; message: string };

export const JOURNAL_SUBCOMMANDS = [
  "declare",
  "stage",
  "gate",
  "git",
  "agent",
  "verifier",
  "risk",
  "note",
  "show",
  "verify",
] as const;

/* ── Bayrak okuma ─────────────────────────────────────────────────────── */

type Flags = ReadonlyMap<string, readonly string[]>;

const hata = (message: string): ParsedJournalCommand => ({ cmd: "error", message });

/** Aktör bayrakları her YAZAN komutta ortaktır (11.7: kayıt aktörsüz olmaz) */
const ORTAK = ["package", "actor-kind", "actor-id", "actor-role"] as const;

interface Okuyucu {
  /** tek değerli, opsiyonel */
  metin(key: string): string | null;
  /** tek değerli, zorunlu — yoksa sorun kaydeder */
  zorunlu(key: string): string;
  /** tekrarlanabilir liste; boş üye sorun sayılır */
  liste(key: string): string[];
  /** kapalı sözlükten seçim */
  secim<T extends string>(key: string, izin: readonly T[], zorunluMu: boolean): T | null;
  /** tam sayı */
  sayi(key: string, zorunluMu: boolean): number | null;
  /** bayrak VERİLDİ Mİ (değeri okunmadan) — kilit denetimleri için */
  var(key: string): boolean;
  sorun(mesaj: string): void;
  bitir(): string | null;
}

function okuyucu(flags: Flags): Okuyucu {
  const sorunlar: string[] = [];
  const sorun = (m: string): void => {
    sorunlar.push(m);
  };

  const tek = (key: string): string | null => {
    const v = flags.get(key);
    if (v === undefined) return null;
    if (v.length > 1) {
      sorun(`--${key} birden çok kez verildi; tek değer bekleniyor`);
      return null;
    }
    return v[0];
  };

  return {
    metin: (key) => {
      const v = tek(key);
      if (v !== null && v.trim().length === 0) {
        sorun(`--${key} boş verilemez`);
        return null;
      }
      return v;
    },
    zorunlu: (key) => {
      const v = tek(key);
      if (v === null || v.trim().length === 0) {
        sorun(`--${key} ZORUNLUDUR`);
        return "";
      }
      return v;
    },
    liste: (key) => {
      const v = flags.get(key);
      if (v === undefined) return [];
      const out: string[] = [];
      for (const x of v) {
        if (x.trim().length === 0) sorun(`--${key} boş üye taşıyamaz`);
        else out.push(x);
      }
      return out;
    },
    secim: <T extends string>(key: string, izin: readonly T[], zorunluMu: boolean): T | null => {
      const v = tek(key);
      if (v === null) {
        if (zorunluMu) sorun(`--${key} ZORUNLUDUR (geçerli: ${izin.join("|")})`);
        return null;
      }
      if (!(izin as readonly string[]).includes(v)) {
        sorun(`--${key} bilinmiyor: "${v}" (geçerli: ${izin.join("|")})`);
        return null;
      }
      return v as T;
    },
    sayi: (key, zorunluMu) => {
      const v = tek(key);
      if (v === null) {
        if (zorunluMu) sorun(`--${key} ZORUNLUDUR`);
        return null;
      }
      if (!/^-?\d+$/.test(v.trim())) {
        sorun(`--${key} tam sayı olmalı: "${v}"`);
        return null;
      }
      return Number.parseInt(v.trim(), 10);
    },
    var: (key) => flags.has(key),
    sorun,
    bitir: () => (sorunlar.length === 0 ? null : sorunlar.join(" · ")),
  };
}

/** `--anahtar deger` ve `--anahtar=deger`. Konumsal argüman KABUL EDİLMEZ:
    "journal gate PKG typecheck" gibi sırayla anlam taşıyan bir yüzey, sonradan
    araya bayrak sokulunca sessizce başka bir şey ölçer. */
function ayikla(rest: readonly string[]): { ok: true; flags: Flags } | { ok: false; message: string } {
  const flags = new Map<string, string[]>();
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i];
    if (!tok.startsWith("--")) {
      return { ok: false, message: `konumsal argüman kabul edilmiyor: "${tok}" (her değer --bayrak ile verilir)` };
    }
    const eq = tok.indexOf("=");
    let key: string;
    let value: string;
    if (eq >= 0) {
      key = tok.slice(2, eq);
      value = tok.slice(eq + 1);
    } else {
      key = tok.slice(2);
      const next = rest[i + 1];
      /* "--evidence --actor-id X" gibi bir yazım, kanıt olarak "--actor-id"
         kaydetmek yerine PATLAR. */
      if (next === undefined || next.startsWith("--")) {
        return { ok: false, message: `--${key} bayrağı değersiz bırakıldı` };
      }
      value = next;
      i++;
    }
    if (key.length === 0) return { ok: false, message: `bayrak adı boş: "${tok}"` };
    const cur = flags.get(key);
    if (cur) cur.push(value);
    else flags.set(key, [value]);
  }
  return { ok: true, flags };
}

/** Sessizce yok sayılan bayrak yoktur — ilk tanınmayan bayrak komutu düşürür */
function taninmayan(flags: Flags, izinli: readonly string[]): string | null {
  for (const k of flags.keys()) {
    if (!izinli.includes(k)) return k;
  }
  return null;
}

function aktorOku(r: Okuyucu): JournalActor {
  const kind = r.secim("actor-kind", ["human", "agent"] as const, true);
  const id = r.zorunlu("actor-id");
  const role = r.secim("actor-role", JOURNAL_ACTOR_ROLES, true);
  /* Aşağıdaki yedek değerler YALNIZ sorun kaydedilmişken görünür; o durumda
     komut zaten { cmd:"error" } döner ve bu nesne çağırana ulaşmaz. */
  return { kind: kind ?? "agent", id, role: role ?? "otomasyon" };
}

/* ── Giriş noktası ────────────────────────────────────────────────────── */

export function parseJournalArgv(argv: readonly string[]): ParsedJournalCommand {
  if (argv.length === 0) {
    return hata(`alt komut verilmedi (geçerli: ${JOURNAL_SUBCOMMANDS.join("|")})`);
  }
  const sub = argv[0];
  if (!(JOURNAL_SUBCOMMANDS as readonly string[]).includes(sub)) {
    return hata(`bilinmeyen alt komut: "${sub}" (geçerli: ${JOURNAL_SUBCOMMANDS.join("|")})`);
  }

  const t = ayikla(argv.slice(1));
  if (!t.ok) return hata(t.message);
  const flags = t.flags;

  switch (sub) {
    case "verify":
      return verifyKomutu(flags);
    case "show":
      return showKomutu(flags);
    case "declare":
      return declareKomutu(flags);
    case "stage":
      return stageKomutu(flags);
    case "gate":
      return gateKomutu(flags);
    case "git":
      return gitKomutu(flags);
    case "agent":
      return agentKomutu(flags);
    case "verifier":
      return verifierKomutu(flags);
    case "risk":
      return riskKomutu(flags);
    case "note":
      return noteKomutu(flags);
    default:
      return hata(`bilinmeyen alt komut: "${sub}"`);
  }
}

/* ── Okuyan komutlar (aktör istemez) ──────────────────────────────────── */

function verifyKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, []);
  if (bilinmez !== null) {
    return hata(`verify hiçbir bayrak almaz; tanınmayan bayrak: --${bilinmez}`);
  }
  return { cmd: "verify" };
}

function showKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, ["package"]);
  if (bilinmez !== null) return hata(`show için tanınmayan bayrak: --${bilinmez}`);
  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const s = r.bitir();
  return s !== null ? hata(`show: ${s}`) : { cmd: "show", packageId };
}

/* ── Yazan komutlar ───────────────────────────────────────────────────── */

function declareKomutu(flags: Flags): ParsedJournalCommand {
  const izinli = [
    ...ORTAK,
    "name",
    "purpose",
    "canonical-version",
    "canonical-section",
    "adr",
    "module",
    "contract",
    "scope-in",
    "scope-out",
    "risk-class",
  ];
  const bilinmez = taninmayan(flags, izinli);
  if (bilinmez !== null) return hata(`declare için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  const canonicalSections = r.liste("canonical-section");
  /* 11.3 Canonical Traceability: bölüm referansı olmayan bir paket kaydı,
     "canonical-kaydi" aşamasının ölçeceği hiçbir şey bırakmaz. */
  if (canonicalSections.length === 0) {
    r.sorun("--canonical-section en az bir kez ZORUNLUDUR (Canonical izlenebilirlik)");
  }

  const payload: JournalPackageDeclared = {
    name: r.zorunlu("name"),
    purpose: r.zorunlu("purpose"),
    canonical_version: r.zorunlu("canonical-version"),
    canonical_sections: canonicalSections,
    adr_tdr: r.liste("adr"),
    modules: r.liste("module"),
    contracts: r.liste("contract"),
    scope_in: r.liste("scope-in"),
    scope_out: r.liste("scope-out"),
    risk_class: r.secim("risk-class", ["dusuk", "orta", "yuksek"] as const, true) ?? "orta",
  };

  const s = r.bitir();
  return s !== null ? hata(`declare: ${s}`) : { cmd: "declare", packageId, payload, actor };
}

function stageKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, [...ORTAK, "to"]);
  if (bilinmez !== null) return hata(`stage için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  /* --from BİLEREK YOKTUR: geçişin kaynağı olay akışından TÜRETİLİR (11.3).
     Elle yazılabilseydi, aşama sessizce ileri atlatılabilirdi. */
  const to = r.secim("to", JOURNAL_STAGES, true);
  const s = r.bitir();
  if (s !== null) return hata(`stage: ${s}`);
  return { cmd: "stage", packageId, to: to as JournalStage, actor };
}

function gateKomutu(flags: Flags): ParsedJournalCommand {
  /* command/exit-code/outcome/evidence/reason izin listesinde DURUR — ama
     yalnız kendilerine özgü KİLİT MESAJINI verebilmek için. Listede olmasalardı
     kullanıcı "tanınmayan bayrak" görür, kuralın kendisini öğrenemezdi. */
  const bilinmez = taninmayan(flags, [
    ...ORTAK,
    "gate",
    "outcome",
    "evidence",
    "reason",
    "command",
    "exit-code",
  ]);
  if (bilinmez !== null) return hata(`gate için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);

  const gateAdi = r.zorunlu("gate");
  if (!isJournalGateName(gateAdi)) {
    return hata(`bilinmeyen kapı: "${gateAdi}" (geçerli: ${JOURNAL_GATE_NAMES.join("|")})`);
  }
  const gate: JournalGateName = gateAdi;
  const spec = JOURNAL_GATES[gate];

  /* ── KİLİT 1: exit code ve komut ASLA yazılmaz ── */
  if (r.var("exit-code")) {
    return hata(
      `--exit-code bayrağı yoktur: exit code ölçülür, yazılmaz (Canonical 11.3 ölçüm dürüstlüğü).`
    );
  }
  if (r.var("command")) {
    return hata(
      spec.human
        ? `"${gate}" bir İNSAN kapısıdır: --command yoktur — insan turu gereken kapı otomatikleştirilemez (Canonical 11.6/3).`
        : `"${gate}" bir MAKİNE kapısıdır: --command yoktur — komut kapı kütüğünde sabittir (Canonical 11.3 kaynak dürüstlüğü).`
    );
  }

  if (!spec.human) {
    /* ── KİLİT 2: makine kapısında elle sonucun SÖZDİZİMİ yok ── */
    if (r.var("outcome")) {
      return hata(
        `"${gate}" bir MAKİNE kapısıdır: --outcome bayrağı yoktur. Sonuç yalnız gerçek koşumun exit code'undan doğar (Canonical 11.3).`
      );
    }
    if (r.var("evidence")) {
      return hata(`"${gate}" bir MAKİNE kapısıdır: --evidence yoktur — kanıt koşumun kendisidir.`);
    }
    if (r.var("reason")) {
      return hata(
        `"${gate}" bir MAKİNE kapısıdır: --reason yoktur — atlanma/ölçülememe gerekçesini koşum üretir.`
      );
    }
    const s = r.bitir();
    if (s !== null) return hata(`gate: ${s}`);
    return { cmd: "gate", packageId, gate, actor, human: null };
  }

  /* ── KİLİT 3: insan kapısı — kanıt zorunlu, sonucu ajan imzalayamaz ── */
  const outcome = r.secim("outcome", JOURNAL_GATE_OUTCOMES, true);
  const evidenceVar = r.var("evidence");
  const evidence = r.metin("evidence");
  if (!evidenceVar || evidence === null) {
    r.sorun(
      `"${gate}" bir İNSAN kapısıdır: --evidence ZORUNLUDUR — sözlü onay yetmez, kanıt kaydedilir (Canonical 11.6/3).`
    );
  }
  const olculdu = outcome === "gecti" || outcome === "kaldi";
  const reason = r.metin("reason");
  if (!olculdu && outcome !== null && reason === null) {
    r.sorun(
      `outcome='${outcome}' için --reason ZORUNLUDUR (Canonical 11.3: koşulmayan kapı gerekçesiz kayda geçmez).`
    );
  }
  /* shared/checkGateActor ile AYNI koşul, bir adım erken: ölçülmüş bir insan
     kapısını ajan imzalayamaz. Erken red, yanlış satırın hiç yazılmamasıdır. */
  if (olculdu && flags.get("actor-kind")?.[0] !== "human") {
    r.sorun("insan turu gereken kapıyı ajan imzalayamaz (Canonical 11.6/3).");
  }

  const s = r.bitir();
  if (s !== null) return hata(`gate: ${s}`);
  return {
    cmd: "gate",
    packageId,
    gate,
    actor,
    human: {
      outcome: outcome as JournalGateOutcome,
      evidence: evidence as string,
      reason: olculdu ? null : reason,
    },
  };
}

function gitKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, [...ORTAK, "kind", "value", "subject"]);
  if (bilinmez !== null) return hata(`git için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  const kind = r.secim("kind", ["base", "branch", "commit", "merge"] as const, true);
  const value = r.zorunlu("value");
  const subject = r.metin("subject");
  const s = r.bitir();
  if (s !== null) return hata(`git: ${s}`);
  return { cmd: "git", packageId, kind: kind as "base" | "branch" | "commit" | "merge", value, subject, actor };
}

function agentKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, [...ORTAK, "phase", "label", "task", "result", "summary"]);
  if (bilinmez !== null) return hata(`agent için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  const phase = r.secim("phase", ["started", "finished"] as const, true);
  const agentLabel = r.zorunlu("label");

  if (phase === "started") {
    const task = r.zorunlu("task");
    const s = r.bitir();
    if (s !== null) return hata(`agent: ${s}`);
    return { cmd: "agent", packageId, phase: "started", agentLabel, task, actor };
  }
  const result = r.secim("result", ["ok", "hata", "atlandi"] as const, phase === "finished");
  const summary = r.zorunlu("summary");
  const s = r.bitir();
  if (s !== null) return hata(`agent: ${s}`);
  return {
    cmd: "agent",
    packageId,
    phase: "finished",
    agentLabel,
    result: result as "ok" | "hata" | "atlandi",
    summary,
    actor,
  };
}

function verifierKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, [
    ...ORTAK,
    "finding-id",
    "severity",
    "file",
    "decision",
    "findings-open",
    "findings-closed",
    "summary",
  ]);
  if (bilinmez !== null) return hata(`verifier için tanınmayan bayrak: --${bilinmez}`);

  const bulguMu = flags.has("finding-id");
  const kararMi = flags.has("decision");
  if (bulguMu && kararMi) {
    return hata("verifier: --finding-id ile --decision birlikte verilemez (bulgu mu karar mı belirsiz)");
  }
  if (!bulguMu && !kararMi) {
    return hata("verifier: --finding-id (bulgu) veya --decision (karar) verilmelidir");
  }

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  const summary = r.zorunlu("summary");

  if (bulguMu) {
    const findingId = r.zorunlu("finding-id");
    const severity = r.secim("severity", ["blocker", "ciddi", "kucuk"] as const, true);
    const file = r.metin("file");
    const s = r.bitir();
    if (s !== null) return hata(`verifier: ${s}`);
    return {
      cmd: "verifier",
      packageId,
      kind: "finding",
      findingId,
      severity: severity as "blocker" | "ciddi" | "kucuk",
      summary,
      file,
      actor,
    };
  }

  const decision = r.secim("decision", ["onay", "bulgu"] as const, true);
  const findingsOpen = r.sayi("findings-open", true);
  const findingsClosed = r.sayi("findings-closed", true);
  if (findingsOpen !== null && findingsOpen < 0) r.sorun("--findings-open negatif olamaz");
  if (findingsClosed !== null && findingsClosed < 0) r.sorun("--findings-closed negatif olamaz");
  /* 11.6/1: açık bulgu varken "onay" kararı, kapıyı yeşil göstermenin
     sessiz yoludur — kapı atlanamaz. */
  if (decision === "onay" && (findingsOpen ?? 0) > 0) {
    r.sorun("açık bulgu varken karar 'onay' olamaz (Canonical 11.6/1: kapı atlanamaz)");
  }
  const s = r.bitir();
  if (s !== null) return hata(`verifier: ${s}`);
  return {
    cmd: "verifier",
    packageId,
    kind: "verdict",
    decision: decision as "onay" | "bulgu",
    findingsOpen: findingsOpen as number,
    findingsClosed: findingsClosed as number,
    summary,
    actor,
  };
}

function riskKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, [...ORTAK, "risk-id", "status", "summary"]);
  if (bilinmez !== null) return hata(`risk için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  const riskId = r.zorunlu("risk-id");
  const status = r.secim("status", ["acik", "kapali"] as const, true);
  const summary = r.zorunlu("summary");
  const s = r.bitir();
  if (s !== null) return hata(`risk: ${s}`);
  return { cmd: "risk", packageId, riskId, status: status as "acik" | "kapali", summary, actor };
}

function noteKomutu(flags: Flags): ParsedJournalCommand {
  const bilinmez = taninmayan(flags, [...ORTAK, "text"]);
  if (bilinmez !== null) return hata(`note için tanınmayan bayrak: --${bilinmez}`);

  const r = okuyucu(flags);
  const packageId = r.zorunlu("package");
  const actor = aktorOku(r);
  const text = r.zorunlu("text");
  const s = r.bitir();
  if (s !== null) return hata(`note: ${s}`);
  return { cmd: "note", packageId, text, actor };
}
