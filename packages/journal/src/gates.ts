/* Cockpit modül fazı 0 — PACKAGE JOURNAL, KAPI KOŞUCUSU (Canonical 11.3).

   shared/journal.ts ŞEMADIR ve I/O yapmaz. Bu dosya onun karşı kutbudur:
   BÜTÜN I/O burada yaşar (spawnSync · fs · zlib · crypto · process) ve tek
   ürünü checkGateHonesty'den GEÇEN bir JournalGateRun'dır.

   TEK YÖN: ölçüm → kayıt. Ters yön yoktur; runGate hiçbir koşulda
   "gecti" UYDURMAZ. Sonuç yalnız üç kaynaktan doğar —
     · gerçek exit code            → "gecti" / "kaldi"
     · komutun hiç koşamaması      → "olculemedi" + gerekçe
     · kapının insan kapısı olması → "olculemedi" + gerekçe
   Dördüncü bir yol bilinçli olarak BIRAKILMADI.

   ÖLÇÜLMÜŞ TUZAKLAR (bu dosya bunların üstüne yazıldı):
   · Windows'ta npm bir .cmd'dir → spawnSync("npm",[...]) ENOENT verir.
     DAİMA tek komut DİZESİ + shell:true. argv dizisi + shell:true birlikte
     DEP0190 uyarısı üretir; ikisi asla birlikte kullanılmaz.
   · typecheck başarısı SESSİZDİR — ayrıştırılacak sayı yoktur, values null.
   · kök `npm test` fan-out'u apps/web'i SESSİZCE atlar (web'in test script'i
     yok) → 4 workspace AYRI koşulur, her biri KENDİ outputFile'ına yazar.
     Ortak dosya adı ardışık koşumda birbirini ezerdi.
   · vite'ın stdout özet satırı AYRIŞTIRILMAZ (U+2502 ayracı, binlik virgülü,
     TTY'ye göre değişen sütunlar, gzip sütununun kaybolabilmesi). Boyut
     diskten okunur: gzipSync(dist/assets/*.js).
   · kökte build script'i YOK — build yalnız `-w apps/web` ile koşar. */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";

import { JOURNAL_GATES, type JournalGateName, type JournalGateRun } from "@tezgah/shared";

/* ROOT_DIR ve evidenceDir BURADA TANIMLANMAZ, paths.ts'ten ALINIR.
   İkisini de kendi başına türetmek index.ts'in `export *` barrel'ında
   TS2308 (aynı ad iki modülden) verir — ölçüldü. Daha ağırı: kanıt o zaman
   data/ altına düşerdi ve data/ .gitignore'dadır → raw_evidence klonda
   BULUNMAYAN bir dosyayı gösterir, raw_sha256 doğrulanamazdı. paths.ts'in
   evidenceDir'i docs/journal/evidence'tır: git'e girer, hash klonda tutar.
   sha256 de hash.ts'ten alınır — yazma ile doğrulama aynı işlevi kullansın. */
import { ROOT_DIR, evidenceDir } from "./paths.js";
import { sha256 } from "./hash.js";

/* ── Saf yardımcılar — asıl değer burada, sabit girdiyle test edilir ──── */

/**
 * stderr'in ilk ANLAMLI satırı. Baştaki boş satırlar atlanır: bir spawn
 * hatasının gerekçesi "" olursa kayıt gerekçesiz kalır ve checkGateHonesty
 * kural 3'ü ihlal ederdi.
 */
export function firstLine(text: string): string {
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

/**
 * Araç sürümü. Dört araç DÖRT AYRI biçimde yazar (ölçüldü):
 *   vitest → "vitest/3.2.7 win32-x64 node-v24.15.0"
 *   tsc    → "Version 5.9.3"
 *   eslint → "v9.39.5"
 *   vite   → "vite/5.4.21 win32-x64 node-v24.15.0"
 * Ortak nokta yalnız semver çekirdeğidir; onu çekeriz. Bulunamazsa null —
 * çağıran bunu tool:null + outcome "olculemedi"ye çevirir, UYDURMAZ.
 */
export function parseToolVersion(raw: string): string | null {
  const m = /(\d+\.\d+\.\d+[0-9A-Za-z.\-+]*)/.exec(raw);
  return m === null ? null : m[1];
}

/**
 * Bayt → kB, 2 basamak. 1000'e böler (1024'e DEĞİL): KK-4 tarihçesindeki
 * sayılarla aynı ölçek olsun diye — ölçüldü, chunk 93.29 birebir üretiliyor.
 * Sonlu olmayan girdi ATILMAZ, PATLAR: NaN sessizce yuvarlanırsa values'a
 * "0" gibi sahte bir ölçüm sızardı ve JSON'da null'a dönüşürdü.
 */
export function roundKb(bytes: number): number {
  if (!Number.isFinite(bytes)) throw new Error(`roundKb: sonlu olmayan bayt (${String(bytes)})`);
  return Math.round((bytes / 1000) * 100) / 100;
}

function numField(source: string, holder: unknown, key: string): number {
  if (typeof holder !== "object" || holder === null) {
    throw new Error(`${source}: nesne bekleniyordu`);
  }
  const v = (holder as Record<string, unknown>)[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`${source}: ${key} sonlu sayı değil`);
  }
  return v;
}

export interface VitestTotals {
  passed: number;
  failed: number;
  total: number;
  files: number;
}

/**
 * 4 workspace'in json raporunu TEK toplama indirger.
 * files = testResults.length (DOSYA sayısı). numTotalTestSuites KULLANILMAZ:
 * ölçüldü ki o describe bloklarını sayıyor (shared: 25 dosya, 127 "suite") —
 * "files" adı altında 127 yazmak sayıyı kapsamı kadar dürüst olmaktan çıkarır.
 * Eksik/bozuk alan sessizce 0 sayılmaz, PATLAR: eksik toplam "az ama yeşil"
 * görünen sahte bir ölçüm olurdu.
 */
export function summarizeVitestReports(reports: unknown[]): VitestTotals {
  if (reports.length === 0) throw new Error("vitest: hiç rapor okunamadı");
  const totals: VitestTotals = { passed: 0, failed: 0, total: 0, files: 0 };
  for (const r of reports) {
    totals.passed += numField("vitest raporu", r, "numPassedTests");
    totals.failed += numField("vitest raporu", r, "numFailedTests");
    totals.total += numField("vitest raporu", r, "numTotalTests");
    const tr = (r as Record<string, unknown>).testResults;
    if (!Array.isArray(tr)) throw new Error("vitest raporu: testResults dizi değil");
    totals.files += tr.length;
  }
  return totals;
}

export interface EslintTotals {
  errors: number;
  warnings: number;
  files: number;
}

/** eslint --format json → dosya başına errorCount/warningCount toplanır. */
export function summarizeEslintJson(raw: unknown): EslintTotals {
  if (!Array.isArray(raw)) throw new Error("eslint raporu: dizi değil");
  const totals: EslintTotals = { errors: 0, warnings: 0, files: raw.length };
  for (const entry of raw) {
    totals.errors += numField("eslint raporu", entry, "errorCount");
    totals.warnings += numField("eslint raporu", entry, "warningCount");
  }
  return totals;
}

export interface BundleEntry {
  name: string;
  gzipBytes: number;
}

export interface BundleTotals {
  main_kb: number;
  chunk_max_kb: number;
  files: number;
}

/**
 * En büyük js = ana bundle. chunk_max = KALANLARIN en büyüğü — ana bundle'ı
 * kendi "chunk" tavanı saymak KK-4'ün iki eşiğini tek sayıya çökertirdi.
 * Tek dosya varsa chunk_max 0'dır (ölçülen gerçek: chunk yok).
 */
export function summarizeBundleSizes(entries: BundleEntry[]): BundleTotals {
  if (entries.length === 0) throw new Error("bundle: dist/assets içinde .js yok");
  const sorted = [...entries].sort((a, b) => b.gzipBytes - a.gzipBytes);
  return {
    main_kb: roundKb(sorted[0].gzipBytes),
    chunk_max_kb: sorted.length > 1 ? roundKb(sorted[1].gzipBytes) : 0,
    files: entries.length,
  };
}

/* ── Komut koşumu ─────────────────────────────────────────────────────── */

interface ExecResult {
  command: string;
  /** Sinyalle öldürüldüyse null — ölçüm YOKTUR, "kaldi" sayılamaz */
  status: number | null;
  stdout: string;
  stderr: string;
  spawned: boolean;
  spawnError: string | null;
  duration_ms: number;
}

/**
 * TEK STRING + shell:true. argv dizisi geçilmez (DEP0190), npm .cmd olduğu
 * için kabuk şart. Kapılar kökten koşar; stdout büyük olabildiğinden
 * maxBuffer yükseltilir (rapor dosyaya yazılsa da build çıktısı akar).
 */
function exec(command: string): ExecResult {
  const t0 = Date.now();

  /* ÖLÇEN SÜRECİN NODE_ENV'İ ÇOCUĞA SIZAMAZ.
     Ölçüldü ve doğrulandı: kapı koşucusu vitest içinden çağrıldığında
     NODE_ENV=test miras kalıyor, vite React'in DEVELOPMENT yapısını derliyor ve
     bundle 191.13 yerine 271.19 gzip kB ölçülüyor (%42 sapma, aynı commit).
     Journal bunu "ölçülmüş" diye kaydederdi — modülün önlemek için var olduğu
     hatanın ta kendisi. Değişkeni SİLİYORUZ (production'a sabitlemiyoruz): her
     araç kendi varsayılanını uygular, yani ölçüm temiz bir kabuktan koşulmuş
     gibi olur ve `spec.command`'ı elle çalıştıran insanla AYNI sayıyı üretir. */
  const env = { ...process.env };
  delete env.NODE_ENV;

  const r = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    cwd: ROOT_DIR,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    env,
  });
  const duration_ms = Date.now() - t0;
  const stdout = typeof r.stdout === "string" ? r.stdout : "";
  const stderr = typeof r.stderr === "string" ? r.stderr : "";
  const spawnError = r.error instanceof Error ? r.error.message : null;
  return {
    command,
    status: typeof r.status === "number" ? r.status : null,
    stdout,
    stderr,
    spawned: spawnError === null && typeof r.status === "number",
    spawnError,
    duration_ms,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ── Koşucu kimliği ───────────────────────────────────────────────────── */

let npmVersionCache: string | null | undefined;

function npmVersion(): string | null {
  if (npmVersionCache === undefined) {
    const r = exec("npm -v");
    npmVersionCache = r.spawned && r.status === 0 ? parseToolVersion(r.stdout) : null;
  }
  return npmVersionCache;
}

/**
 * ör. "win32/node24.15.0/npm11.12.1".
 * duration_ms makineye bağlıdır; hangi makinede ölçüldüğü kayıtta olmazsa
 * süreler karşılaştırılamaz. npm sürümü ölçülemezse o parça DÜŞER — uydurma
 * yerine eksik bırakılır.
 */
export function runnerPlatform(): string {
  const npm = npmVersion();
  const base = `${process.platform}/node${process.versions.node}`;
  return npm === null ? base : `${base}/npm${npm}`;
}

/* ── Araç sürümü ölçümü ───────────────────────────────────────────────── */

interface ToolProbe {
  name: string;
  command: string;
}

/** Kapının GERÇEK aracı. build/bundle aynı vite'ı kullanır. */
const TOOL_PROBES: Record<string, ToolProbe> = {
  typecheck: { name: "typescript", command: "npx tsc -v" },
  lint: { name: "eslint", command: "npx eslint --version" },
  test: { name: "vitest", command: "npx vitest --version" },
  build: { name: "vite", command: "npx vite --version" },
  bundle: { name: "vite", command: "npx vite --version" },
};

function measureTool(gate: JournalGateName): { name: string; version: string } | null {
  const probe = TOOL_PROBES[gate];
  if (probe === undefined) return null;
  const r = exec(probe.command);
  if (!r.spawned || r.status !== 0) return null;
  const version = parseToolVersion(`${r.stdout}\n${r.stderr}`);
  return version === null ? null : { name: probe.name, version };
}

/* ── Ham kanıt ────────────────────────────────────────────────────────── */

/**
 * YALNIZ outcome="kaldi" iken çağrılır.
 * Uzantı .txt — .log DEĞİL: .gitignore'da `*.log` kuralı var, kanıt git'e hiç
 * girmez ve raw_sha256 klonda BULUNMAYAN bir dosyayı işaret ederdi.
 * fs.writeFileSync bilinçli KULLANILMAZ (kaynak taraması yasaklıyor) —
 * appendFileSync ile yazılır. Hash yazılan gövdeden değil DOSYADAN alınır:
 * dosya beklenmedik şekilde önceden varsa hash yine artefaktı gösterir.
 */
function writeEvidence(gate: JournalGateName, body: string): { path: string; sha256: string } | null {
  try {
    const dir = evidenceDir();
    mkdirSync(dir, { recursive: true });
    const stamp = nowIso().replace(/[:.]/g, "-");
    const file = path.join(dir, `${gate}-${stamp}-${process.pid}.txt`);
    appendFileSync(file, body, "utf8");
    const onDisk = readFileSync(file, "utf8");
    return { path: file, sha256: sha256(onDisk) };
  } catch {
    /* Kanıt yazılamadı: ÖLÇÜM yine de geçerlidir, yalnız işaretçi düşer.
       Uydurma yol yazmaktansa null bırakılır. */
    return null;
  }
}

function evidenceBody(gate: JournalGateName, runs: ExecResult[]): string {
  const parts = [`gate: ${gate}`, `runner: ${runnerPlatform()}`, `cwd: ${ROOT_DIR}`, ""];
  for (const r of runs) {
    parts.push(
      `$ ${r.command}`,
      `exit: ${String(r.status)}  duration_ms: ${r.duration_ms}`,
      "--- stdout ---",
      r.stdout,
      "--- stderr ---",
      r.stderr,
      ""
    );
  }
  return parts.join("\n");
}

/* ── Kayıt iskeleti ───────────────────────────────────────────────────── */

function baseRun(gate: JournalGateName): JournalGateRun {
  return {
    gate,
    outcome: "olculemedi",
    origin: "turetilmis",
    command: null,
    cwd: ROOT_DIR,
    tool: null,
    runner_platform: runnerPlatform(),
    exit_code: null,
    measured_at: nowIso(),
    duration_ms: null,
    values: null,
    method: null,
    evidence: null,
    reason: null,
    raw_evidence: null,
    raw_sha256: null,
  };
}

interface Extraction {
  values: Record<string, number> | null;
  method: string | null;
}

interface MachineGateOptions {
  /** Kapının tek ürünü sayıysa (bundle) ayrıştırma çökünce sonuç ölçülememiştir.
      exit code kendi başına bir yargıysa (typecheck/lint/test/build) sonuç durur. */
  numbersAreTheVerdict: boolean;
  /** Ölçüm komutları — ilki sonucu belirler; kanıt hepsini içerir */
  extract: (runs: ExecResult[]) => Extraction;
}

/**
 * Makine kapısı ortak gövdesi. Sonuç DAİMA exit code'dan doğar.
 * spawn edilemeyen komut "kaldi" DEĞİL "olculemedi"dir: çalışmayan bir ölçüm
 * aracı, kapının kaldığına dair kanıt üretmez.
 */
function machineGate(
  gate: JournalGateName,
  runs: ExecResult[],
  commandLabel: string,
  opts: MachineGateOptions
): JournalGateRun {
  const run = baseRun(gate);
  run.command = commandLabel;
  run.duration_ms = runs.reduce((a, r) => a + r.duration_ms, 0);

  const broken = runs.find((r) => !r.spawned);
  if (broken !== undefined) {
    run.reason =
      firstLine(broken.stderr) ||
      broken.spawnError ||
      `komut koşulamadı: ${broken.command}`;
    return run;
  }

  const tool = measureTool(gate);
  if (tool === null) {
    run.reason = `araç sürümü ölçülemedi (${TOOL_PROBES[gate]?.command ?? "sonda yok"})`;
    return run;
  }

  const failed = runs.find((r) => r.status !== 0);
  const exitCode = failed === undefined ? 0 : (failed.status ?? 1);

  run.tool = tool;
  run.exit_code = exitCode;
  run.origin = "olculdu";
  run.outcome = exitCode === 0 ? "gecti" : "kaldi";

  try {
    const got = opts.extract(runs);
    run.values = got.values;
    run.method = got.method;
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    run.values = null;
    run.method = null;
    if (opts.numbersAreTheVerdict) {
      /* Komut koştu ama kapının ÖLÇTÜĞÜ şey elde edilemedi. exit code burada
         bir yargı değil (build 0 dönebilir, boyut yine bilinmez). */
      run.outcome = "olculemedi";
      run.origin = "turetilmis";
      run.reason = why;
      run.raw_evidence = null;
      run.raw_sha256 = null;
      return run;
    }
    /* exit code kendi başına yargıdır: sonuç durur, eksik sayının gerekçesi
       yanına yazılır — sayısız "gecti" sessizce yeşil görünmesin. */
    run.reason = why;
  }

  if (run.outcome === "kaldi") {
    const ev = writeEvidence(gate, evidenceBody(gate, runs));
    if (ev !== null) {
      run.raw_evidence = ev.path;
      run.raw_sha256 = ev.sha256;
    }
  }
  return run;
}

/* ── Kapılar ──────────────────────────────────────────────────────────── */

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tezgah-gate-"));
}

/** vitest/eslint outputFile: Windows'ta ters bölü kaçış sorunu çıkarmasın */
function shellPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** apps/web'in test script'i YOK; kök -ws fan-out'u onu SESSİZCE atlar. */
const TEST_WORKSPACES = [
  "apps/server",
  "packages/shared",
  "packages/templates",
  "packages/journal",
] as const;

function gateTypecheck(): JournalGateRun {
  const command = "npm run typecheck";
  return machineGate("typecheck", [exec(command)], command, {
    numbersAreTheVerdict: false,
    /* Başarı SESSİZDİR: ayrıştırılacak sayı yok. Uydurma sayı yerine null. */
    extract: () => ({ values: null, method: null }),
  });
}

function gateLint(): JournalGateRun {
  const out = path.join(tmpDir(), "eslint.json");
  const command = `npx eslint . --format json -o "${shellPath(out)}"`;
  return machineGate("lint", [exec(command)], command, {
    numbersAreTheVerdict: false,
    extract: () => {
      if (!existsSync(out)) throw new Error(`eslint raporu yazılmadı: ${out}`);
      const totals = summarizeEslintJson(JSON.parse(readFileSync(out, "utf8")) as unknown);
      return {
        values: { errors: totals.errors, warnings: totals.warnings, files: totals.files },
        method: "eslint --format json -o <tmp>; errorCount/warningCount dosya başına toplandı",
      };
    },
  });
}

function gateTest(): JournalGateRun {
  const dir = tmpDir();
  const outputs = new Map<string, string>();
  const runs: ExecResult[] = [];
  for (const ws of TEST_WORKSPACES) {
    /* Her workspace KENDİ dosyasına yazar — ortak ad ardışık koşumda ezilirdi */
    const out = path.join(dir, `vitest-${ws.replace(/[\\/]/g, "-")}.json`);
    outputs.set(ws, out);
    runs.push(exec(`npm test -w ${ws} -- --reporter=json --outputFile="${shellPath(out)}"`));
  }
  const label = `npm test -w <ws> -- --reporter=json --outputFile=<tmp>  (${TEST_WORKSPACES.join(", ")})`;
  return machineGate("test", runs, label, {
    numbersAreTheVerdict: false,
    extract: () => {
      const reports: unknown[] = [];
      for (const [ws, out] of outputs) {
        if (!existsSync(out)) throw new Error(`vitest raporu yazılmadı: ${ws}`);
        reports.push(JSON.parse(readFileSync(out, "utf8")) as unknown);
      }
      const t = summarizeVitestReports(reports);
      return {
        values: { passed: t.passed, failed: t.failed, total: t.total, files: t.files },
        method: "vitest --reporter=json, 4 workspace ayrı koşuldu, apps/web HARİÇ",
      };
    },
  });
}

function gateBuild(): JournalGateRun {
  /* Kökte build script'i TANIMLI DEĞİL — ölçüldü. */
  const command = "npm run build -w apps/web";
  return machineGate("build", [exec(command)], command, {
    numbersAreTheVerdict: false,
    extract: () => ({ values: null, method: null }),
  });
}

function readDistGzipSizes(): BundleEntry[] {
  const assets = path.join(ROOT_DIR, "apps", "web", "dist", "assets");
  if (!existsSync(assets)) throw new Error(`build çıktısı yok: ${assets}`);
  return readdirSync(assets)
    .filter((f) => f.endsWith(".js"))
    .map((f) => ({ name: f, gzipBytes: gzipSync(readFileSync(path.join(assets, f))).length }));
}

function gateBundle(): JournalGateRun {
  const command = "npm run build -w apps/web";
  return machineGate("bundle", [exec(command)], command, {
    /* Boyut ölçülemezse exit 0 hiçbir şey söylemez → "olculemedi" */
    numbersAreTheVerdict: true,
    extract: (runs) => {
      /* Build kaldıysa disktekiler BAYAT olabilir; bayat boyutu taze ölçüm
         gibi sunmak 11.3'ün yasakladığı şeydir. */
      if (runs.some((r) => r.status !== 0)) {
        throw new Error("build kaldı: dist bayat olabilir, boyut ölçülmedi");
      }
      const totals = summarizeBundleSizes(readDistGzipSizes());
      return {
        values: {
          main_kb: totals.main_kb,
          chunk_max_kb: totals.chunk_max_kb,
          files: totals.files,
        },
        method:
          "zlib.gzipSync(varsayılan) <- apps/web/dist/assets/*.js; vite stdout AYRIŞTIRILMADI",
      };
    },
  });
}

/**
 * İnsan kapısı. 11.6/3: yeşil testle İKAME EDİLEMEZ.
 * runGate onu KOŞMAZ ve "gecti" ÜRETEMEZ — command null kalır (kural 6:
 * insan kapısı komuta bağlanamaz), exit_code null kalır (kural 2).
 * Kaydı yalnız bir insan, kanıtla, kendi eliyle tamamlayabilir.
 */
function gateHuman(gate: JournalGateName): JournalGateRun {
  const run = baseRun(gate);
  run.duration_ms = 0;
  run.reason = "insan turu gerektirir; runGate koşamaz";
  return run;
}

/**
 * Kapıyı koşar ve makine-okunur ölçümü JournalGateRun'a çevirir.
 * Çıktı her yolda checkGateHonesty'den GEÇER (gates.test.ts bunu doğrular).
 */
export function runGate(gate: JournalGateName): JournalGateRun {
  if (JOURNAL_GATES[gate].human) return gateHuman(gate);
  switch (gate) {
    case "typecheck":
      return gateTypecheck();
    case "lint":
      return gateLint();
    case "test":
      return gateTest();
    case "build":
      return gateBuild();
    case "bundle":
      return gateBundle();
    default: {
      /* Kütüğe makine kapısı eklenip burası unutulursa SESSİZ "gecti" değil,
         gerekçeli "olculemedi" döner. */
      const run = baseRun(gate);
      run.reason = `kapı koşucusu tanımlı değil: ${String(gate)}`;
      return run;
    }
  }
}
