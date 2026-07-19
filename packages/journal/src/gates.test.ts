/* Kapı koşucusu testleri.

   İKİ AYRI ŞEY sınanır ve karıştırılmaz:
   · SAF yardımcılar — sabit girdiyle, ölçüm ayrıştırmasının asıl değeri burada
   · runGate'in DÜRÜSTLÜK sözleşmesi — çıktı checkGateHonesty'den geçmek ZORUNDA

   TAM KOŞUM YAPILMAZ: build/test/lint kapıları dakikalar sürer ve
   runGate("test") packages/journal'ı da koşacağı için bu dosyayı İÇİNDEN
   yeniden çalıştırırdı. Gerçekten koşulan tek kapı typecheck'tir.

   SAHTE YEŞİL SAVUNMASI: her olumlu iddianın yanında bir NEGATİF KONTROL var —
   checkGateHonesty'nin gerçekten iş yaptığı, elle bozulmuş kayıtları REDDEDEREK
   kanıtlanır. Aksi hâlde "honesty ok" iddiası her zaman geçen boş bir iddia olurdu. */

import { describe, expect, it } from "vitest";
import { checkGateActor, checkGateHonesty, type JournalActor, type JournalGateRun } from "@tezgah/shared";

import {
  firstLine,
  parseToolVersion,
  roundKb,
  runGate,
  runnerPlatform,
  summarizeBundleSizes,
  summarizeEslintJson,
  summarizeVitestReports,
} from "./gates.js";
/* ROOT_DIR gates.ts'ten DEĞİL paths.ts'ten gelir — tek tanım, barrel'da
   TS2308 çakışması yok. cwd'nin o ortak kökle aynı olduğunu doğrularız. */
import { ROOT_DIR } from "./paths.js";

const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SEMVER = /^\d+\.\d+\.\d+/;

/* ── İnsan kapıları: runGate ASLA "gecti" üretmez ─────────────────────── */

describe("runGate — insan kapıları", () => {
  for (const gate of ["gt", "smoke"] as const) {
    it(`${gate}: koşulmaz, gerekçeli "olculemedi" döner`, () => {
      const run = runGate(gate);

      expect(run.gate).toBe(gate);
      expect(run.outcome).toBe("olculemedi");
      expect(run.origin).toBe("turetilmis");
      expect(run.reason).toBe("insan turu gerektirir; runGate koşamaz");

      /* 11.6/3: insan kapısı komuta bağlanamaz, exit code taşıyamaz */
      expect(run.command).toBeNull();
      expect(run.exit_code).toBeNull();
      expect(run.tool).toBeNull();
      expect(run.values).toBeNull();
      expect(run.evidence).toBeNull();
      expect(run.raw_evidence).toBeNull();
      expect(run.raw_sha256).toBeNull();

      expect(checkGateHonesty(run)).toEqual({ ok: true });
    });
  }

  it("insan kapısının ölçülemediğini AJAN kaydedebilir (ölçüm değil, ölçülemedi kaydı)", () => {
    const agent: JournalActor = { kind: "agent", id: "kapi-kosucusu", role: "otomasyon" };
    expect(checkGateActor(runGate("gt"), agent)).toEqual({ ok: true });
  });

  /* NEGATİF KONTROL — yukarıdaki "ok" iddiasının boş olmadığını kanıtlar */
  it("aynı kayıt elle 'gecti'ye çevrilirse dürüstlük denetimi REDDEDER", () => {
    const forged: JournalGateRun = { ...runGate("gt"), outcome: "gecti" };
    const check = checkGateHonesty(forged);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.issues.some((i) => i.includes("kanıt"))).toBe(true);
    }
  });

  it("insan kapısına komut iliştirilirse dürüstlük denetimi REDDEDER", () => {
    const forged: JournalGateRun = { ...runGate("smoke"), command: "npm run smoke" };
    const check = checkGateHonesty(forged);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.issues).toContain("insan kapısı komuta bağlanamaz");
    }
  });
});

/* ── Gerçek koşum: typecheck ──────────────────────────────────────────── */

describe("runGate — typecheck (GERÇEKTEN koşar)", () => {
  it(
    "exit code'dan sonuç üretir, araç sürümünü ölçer, SAYI UYDURMAZ",
    () => {
      const run = runGate("typecheck");

      expect(checkGateHonesty(run)).toEqual({ ok: true });

      /* Sonuç yalnız exit code'dan doğar — koşucunun asıl sözleşmesi budur */
      expect(typeof run.exit_code).toBe("number");
      expect(run.outcome).toBe(run.exit_code === 0 ? "gecti" : "kaldi");
      expect(run.origin).toBe("olculdu");

      /* Başarı SESSİZDİR: ayrıştırılacak sayı yok → values null (0 DEĞİL) */
      expect(run.values).toBeNull();

      /* Araç sürümü gerçekten ölçüldü */
      expect(run.tool).not.toBeNull();
      expect(run.tool?.name).toBe("typescript");
      expect(run.tool?.version).toMatch(SEMVER);

      expect(run.command).toBe("npm run typecheck");
      expect(run.cwd).toBe(ROOT_DIR);
      expect(run.runner_platform).toBe(runnerPlatform());
      expect(run.measured_at).toMatch(ISO_UTC_MS);
      expect(typeof run.duration_ms).toBe("number");
      expect(run.duration_ms ?? -1).toBeGreaterThan(0);
    },
    300_000
  );
});

/* ── Koşucu kimliği ───────────────────────────────────────────────────── */

describe("runnerPlatform", () => {
  it("platform ve node sürümünü taşır", () => {
    const rp = runnerPlatform();
    expect(rp.length).toBeGreaterThan(0);
    expect(rp.startsWith(`${process.platform}/node${process.versions.node}`)).toBe(true);
    expect(rp).toContain("/node");
  });
});

/* ── Saf yardımcılar ──────────────────────────────────────────────────── */

describe("parseToolVersion — dört araç DÖRT biçimde yazar", () => {
  it("ölçülmüş gerçek çıktıları ayrıştırır", () => {
    expect(parseToolVersion("vitest/3.2.7 win32-x64 node-v24.15.0")).toBe("3.2.7");
    expect(parseToolVersion("Version 5.9.3")).toBe("5.9.3");
    expect(parseToolVersion("v9.39.5")).toBe("9.39.5");
    expect(parseToolVersion("vite/5.4.21 win32-x64 node-v24.15.0")).toBe("5.4.21");
    expect(parseToolVersion("11.12.1\n")).toBe("11.12.1");
  });

  it("ön-sürüm etiketini korur", () => {
    expect(parseToolVersion("Version 5.9.0-beta")).toBe("5.9.0-beta");
  });

  it("sürüm yoksa null döner — uydurmaz", () => {
    expect(parseToolVersion("")).toBeNull();
    expect(parseToolVersion("command not found")).toBeNull();
    expect(parseToolVersion("v9")).toBeNull();
  });
});

describe("roundKb", () => {
  it("1000'e böler ve 2 basamağa yuvarlar", () => {
    expect(roundKb(191130)).toBe(191.13);
    expect(roundKb(93290)).toBe(93.29);
    expect(roundKb(1234)).toBe(1.23);
    expect(roundKb(1236)).toBe(1.24);
    expect(roundKb(1500)).toBe(1.5);
    expect(roundKb(0)).toBe(0);
  });

  it("sonlu olmayan bayt SESSİZCE 0 olmaz, PATLAR", () => {
    expect(() => roundKb(Number.NaN)).toThrow(/sonlu olmayan/);
    expect(() => roundKb(Number.POSITIVE_INFINITY)).toThrow(/sonlu olmayan/);
  });
});

describe("summarizeVitestReports", () => {
  const report = (passed: number, failed: number, total: number, files: number) => ({
    numTotalTestSuites: 999, // TUZAK: bu describe bloklarını sayar, dosyayı DEĞİL
    numPassedTests: passed,
    numFailedTests: failed,
    numTotalTests: total,
    testResults: Array.from({ length: files }, () => ({ status: "passed" })),
  });

  it("4 workspace'i tek toplamda birleştirir", () => {
    const t = summarizeVitestReports([
      report(357, 0, 357, 25),
      report(120, 2, 122, 8),
      report(96, 0, 96, 11),
      report(14, 0, 14, 1),
    ]);
    expect(t).toEqual({ passed: 587, failed: 2, total: 589, files: 45 });
  });

  it("files sayısı testResults'tan gelir — numTotalTestSuites'ten DEĞİL", () => {
    expect(summarizeVitestReports([report(1, 0, 1, 3)]).files).toBe(3);
  });

  it("boş rapor listesi PATLAR — sıfır 'yeşil' gibi görünmesin", () => {
    expect(() => summarizeVitestReports([])).toThrow(/hiç rapor okunamadı/);
  });

  it("eksik alan sessizce 0 sayılmaz", () => {
    expect(() => summarizeVitestReports([{ numPassedTests: 3 }])).toThrow(/numFailedTests/);
    expect(() =>
      summarizeVitestReports([{ numPassedTests: 1, numFailedTests: 0, numTotalTests: 1 }])
    ).toThrow(/testResults dizi değil/);
  });
});

describe("summarizeEslintJson", () => {
  const entry = (errorCount: number, warningCount: number) => ({
    filePath: "x.ts",
    errorCount,
    warningCount,
    messages: [],
  });

  it("dosya başına errorCount/warningCount toplar", () => {
    const t = summarizeEslintJson([entry(0, 0), entry(2, 1), entry(0, 4)]);
    expect(t).toEqual({ errors: 2, warnings: 5, files: 3 });
  });

  it("files = DENETLENEN dosya sayısı (temiz dosyalar dahil)", () => {
    expect(summarizeEslintJson([entry(0, 0), entry(0, 0)]).files).toBe(2);
  });

  it("dizi olmayan rapor PATLAR", () => {
    expect(() => summarizeEslintJson({ errorCount: 0 })).toThrow(/dizi değil/);
    expect(() => summarizeEslintJson([{ filePath: "x.ts" }])).toThrow(/errorCount/);
  });
});

describe("summarizeBundleSizes", () => {
  it("en büyük js ana bundle, chunk_max KALANLARIN en büyüğü", () => {
    const t = summarizeBundleSizes([
      { name: "AtolyePage-DHPf4ga-.js", gzipBytes: 93290 },
      { name: "index-BOBR3001.js", gzipBytes: 191130 },
      { name: "tiny.js", gzipBytes: 10 },
    ]);
    expect(t).toEqual({ main_kb: 191.13, chunk_max_kb: 93.29, files: 3 });
  });

  it("tek dosyada chunk_max 0'dır — ana bundle kendi tavanı sayılmaz", () => {
    expect(summarizeBundleSizes([{ name: "index.js", gzipBytes: 191130 }])).toEqual({
      main_kb: 191.13,
      chunk_max_kb: 0,
      files: 1,
    });
  });

  it("girdiyi DEĞİŞTİRMEZ (sıralama kopya üzerinde)", () => {
    const input = [
      { name: "a.js", gzipBytes: 1 },
      { name: "b.js", gzipBytes: 2 },
    ];
    summarizeBundleSizes(input);
    expect(input.map((e) => e.name)).toEqual(["a.js", "b.js"]);
  });

  it("js yoksa PATLAR — 0 kB sahte ölçüm olurdu", () => {
    expect(() => summarizeBundleSizes([])).toThrow(/\.js yok/);
  });
});

describe("firstLine", () => {
  it("ilk ANLAMLI satırı verir (baştaki boşlar atlanır)", () => {
    expect(firstLine("hata: dosya yok\nikinci satır")).toBe("hata: dosya yok");
    expect(firstLine("\n\n  npm ERR! kod 2  \nsonra")).toBe("npm ERR! kod 2");
  });

  it("CRLF'te satır sonu kalıntısı bırakmaz", () => {
    expect(firstLine("hata\r\nikinci")).toBe("hata");
  });

  it("tamamen boş metinde boş dize döner", () => {
    expect(firstLine("")).toBe("");
    expect(firstLine("   \n\t\n")).toBe("");
  });
});
