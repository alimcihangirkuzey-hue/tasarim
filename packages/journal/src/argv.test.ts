/* CLI KİLİTLERİ — argv ayrıştırıcı testleri (Canonical 11.3 / 11.6).

   Bu dosyanın konusu ayrıştırma kolaylığı değil, KİLİTLERDİR. Her kilit için
   iki senaryo vardır ve ikisi de şart:
     · RED   — yasak bayrak/eksik kanıt komutu düşürüyor mu?
     · GEÇEN — aynı komut yasak bayrak ÇIKARILINCA geçiyor mu?
   Yalnız RED yazmak sahte-yeşildir: komut başka bir sebepten de düşüyor
   olabilirdi ve test bunu ayırt edemezdi. */

import { describe, expect, it } from "vitest";
import { JOURNAL_ACTOR_ROLES, JOURNAL_GATE_NAMES } from "@tezgah/shared";
import { parseJournalArgv, type ParsedJournalCommand } from "./argv.js";

const AJAN = ["--actor-kind", "agent", "--actor-id", "ajan-5", "--actor-role", "uygulayici"];
const INSAN = ["--actor-kind", "human", "--actor-id", "urun-sahibi-1", "--actor-role", "urun-sahibi"];
const PKG = ["--package", "PKG-JOURNAL-01"];

const parse = (...argv: string[]): ParsedJournalCommand => parseJournalArgv(argv);

/** Hata bekleyen iddialar için: hata değilse mesaj yerine AÇIKLAYICI metin
    döner, böylece regex eşleşmez ve test doğru sebeple kalır. */
function hataMesaji(r: ParsedJournalCommand): string {
  return r.cmd === "error" ? r.message : `HATA BEKLENİYORDU ama cmd="${r.cmd}" döndü`;
}

/** Bayrağı ve değerini argv'den çıkarır (tüm tekrarlarıyla). "Yasak bayrak
    ÇIKARILINCA geçiyor mu" senaryolarının kurulumu budur. */
function bayragiCikar(argv: readonly string[], bayrak: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === bayrak) {
      i++; // değerini de at
      continue;
    }
    out.push(argv[i]);
  }
  return out;
}

const MAKINE_KAPILARI = ["typecheck", "lint", "test", "build", "bundle"] as const;
const INSAN_KAPILARI = ["gt", "smoke"] as const;

describe("kapı kütüğü — testin varsaydığı ikili ayrım", () => {
  it("makine ve insan kapıları kütüğün tamamını kaplar", () => {
    /* Kapı eklenirse bu test kalır ve kilitlerin yeni kapıyı kapsamadığını
       söyler — sessizce kapsam dışı kalan kapı olmaz. */
    expect([...MAKINE_KAPILARI, ...INSAN_KAPILARI].sort()).toEqual([...JOURNAL_GATE_NAMES].sort());
  });
});

/* ── KİLİT 1: makine kapısında elle sonuç yazılamaz ───────────────────── */

describe("KİLİT — makine kapısında --outcome yoktur", () => {
  it.each(MAKINE_KAPILARI)("%s: --outcome REDDEDİLİR", (gate) => {
    const r = parse("gate", ...PKG, "--gate", gate, "--outcome", "gecti", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/MAKİNE kapısıdır: --outcome bayrağı yoktur/);
  });

  it.each(MAKINE_KAPILARI)("%s: --outcome OLMADAN geçer ve human=null döner", (gate) => {
    const r = parse("gate", ...PKG, "--gate", gate, ...AJAN);
    expect(r.cmd).toBe("gate");
    if (r.cmd !== "gate") return;
    expect(r.gate).toBe(gate);
    /* human null → tip düzeyinde elle sonuç taşıyacak yer YOK; sonucu
       yalnız cli.ts'in runGate() çağrısı doldurabilir. */
    expect(r.human).toBeNull();
    expect(r.packageId).toBe("PKG-JOURNAL-01");
  });

  it("makine kapısında --outcome kaldi da REDDEDİLİR (yön fark etmez)", () => {
    const r = parse("gate", ...PKG, "--gate", "test", "--outcome", "kaldi", ...AJAN);
    expect(r.cmd).toBe("error");
  });

  it("makine kapısında --exit-code REDDEDİLİR — exit code ölçülür, yazılmaz", () => {
    const r = parse("gate", ...PKG, "--gate", "test", "--exit-code", "0", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--exit-code bayrağı yoktur/);
  });

  it("makine kapısında --command REDDEDİLİR — komut kütükte sabittir", () => {
    const r = parse("gate", ...PKG, "--gate", "lint", "--command", "echo 0 ihlal", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--command yoktur/);
  });

  it("makine kapısında --evidence REDDEDİLİR — kanıt koşumun kendisidir", () => {
    const r = parse("gate", ...PKG, "--gate", "build", "--evidence", "gozumle-gordum", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--evidence yoktur/);
  });

  it("makine kapısında --reason REDDEDİLİR — gerekçeyi koşum üretir", () => {
    const r = parse("gate", ...PKG, "--gate", "bundle", "--reason", "zaman yoktu", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--reason yoktur/);
  });
});

/* ── KİLİT 2: insan kapısı otomatikleştirilemez ───────────────────────── */

describe("KİLİT — insan kapısında --command ve --exit-code yoktur", () => {
  it.each(INSAN_KAPILARI)("%s: --command REDDEDİLİR (11.6/3)", (gate) => {
    const r = parse(
      "gate", ...PKG, "--gate", gate, "--outcome", "gecti",
      "--evidence", "docs/journal/evidence/x/gt.txt", "--command", "npm test", ...INSAN
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/İNSAN kapısıdır: --command yoktur/);
  });

  it.each(INSAN_KAPILARI)("%s: --exit-code REDDEDİLİR", (gate) => {
    const r = parse(
      "gate", ...PKG, "--gate", gate, "--outcome", "gecti",
      "--evidence", "docs/journal/evidence/x/gt.txt", "--exit-code", "0", ...INSAN
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--exit-code bayrağı yoktur/);
  });

  it("aynı komut --command/--exit-code ÇIKARILINCA geçer", () => {
    const r = parse(
      "gate", ...PKG, "--gate", "gt", "--outcome", "gecti",
      "--evidence", "docs/journal/evidence/x/gt.txt", ...INSAN
    );
    expect(r.cmd).toBe("gate");
    if (r.cmd !== "gate") return;
    expect(r.human).toEqual({
      outcome: "gecti",
      evidence: "docs/journal/evidence/x/gt.txt",
      reason: null,
    });
  });
});

describe("KİLİT — insan kapısında --evidence ZORUNLUDUR", () => {
  it.each(INSAN_KAPILARI)("%s: kanıtsız 'gecti' REDDEDİLİR", (gate) => {
    const r = parse("gate", ...PKG, "--gate", gate, "--outcome", "gecti", ...INSAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--evidence ZORUNLUDUR/);
  });

  it("boş --evidence de REDDEDİLİR (sözlü onayın yazılı kılığı)", () => {
    const r = parse("gate", ...PKG, "--gate", "smoke", "--outcome", "gecti", "--evidence=", ...INSAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/evidence/);
  });

  it("kanıt EKLENİNCE aynı komut geçer", () => {
    const r = parse(
      "gate", ...PKG, "--gate", "smoke", "--outcome", "gecti",
      "--evidence", "docs/journal/evidence/PKG/smoke-11.txt", ...INSAN
    );
    expect(r.cmd).toBe("gate");
    if (r.cmd !== "gate") return;
    expect(r.human?.evidence).toBe("docs/journal/evidence/PKG/smoke-11.txt");
  });

  it("insan kapısında --outcome ZORUNLUDUR", () => {
    const r = parse("gate", ...PKG, "--gate", "gt", "--evidence", "docs/x.txt", ...INSAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--outcome ZORUNLUDUR/);
  });

  it("bilinmeyen --outcome değeri REDDEDİLİR", () => {
    const r = parse("gate", ...PKG, "--gate", "gt", "--outcome", "yesil", "--evidence", "docs/x.txt", ...INSAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--outcome bilinmiyor/);
  });
});

describe("KİLİT — ölçülmüş insan kapısını ajan imzalayamaz (11.6/3)", () => {
  it.each(["gecti", "kaldi"] as const)("outcome=%s ajan tarafından imzalanamaz", (outcome) => {
    const r = parse("gate", ...PKG, "--gate", "gt", "--outcome", outcome, "--evidence", "docs/x.txt", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/ajan imzalayamaz/);
  });

  it("aynı komutu İNSAN imzalarsa geçer", () => {
    const r = parse("gate", ...PKG, "--gate", "gt", "--outcome", "gecti", "--evidence", "docs/x.txt", ...INSAN);
    expect(r.cmd).toBe("gate");
  });

  it("ölçülmemiş sonucu (atlandi) ajan gerekçesiyle kaydedebilir", () => {
    /* checkGateActor ile aynı sınır: yasak olan ölçülmüş sonucu imzalamak;
       atlandığını kaydetmek bir ölçüm iddiası değildir. */
    const r = parse(
      "gate", ...PKG, "--gate", "gt", "--outcome", "atlandi",
      "--evidence", "docs/x.txt", "--reason", "insan turu bu pakette koşulmadı", ...AJAN
    );
    expect(r.cmd).toBe("gate");
    if (r.cmd !== "gate") return;
    expect(r.human).toEqual({
      outcome: "atlandi",
      evidence: "docs/x.txt",
      reason: "insan turu bu pakette koşulmadı",
    });
  });
});

describe("KİLİT — koşulmayan kapı gerekçesiz kayda geçmez (11.3)", () => {
  it.each(["atlandi", "olculemedi"] as const)("outcome=%s gerekçesiz REDDEDİLİR", (outcome) => {
    const r = parse("gate", ...PKG, "--gate", "gt", "--outcome", outcome, "--evidence", "docs/x.txt", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--reason ZORUNLUDUR/);
  });

  it("gerekçe eklenince geçer", () => {
    const r = parse(
      "gate", ...PKG, "--gate", "gt", "--outcome", "olculemedi",
      "--evidence", "docs/x.txt", "--reason", "sunucu ayağa kalkmadı", ...AJAN
    );
    expect(r.cmd).toBe("gate");
  });

  it("gecti sonucunda --reason taşınmaz (null'a düşer)", () => {
    const r = parse(
      "gate", ...PKG, "--gate", "gt", "--outcome", "gecti",
      "--evidence", "docs/x.txt", "--reason", "gereksiz", ...INSAN
    );
    expect(r.cmd).toBe("gate");
    if (r.cmd !== "gate") return;
    expect(r.human?.reason).toBeNull();
  });
});

/* ── KİLİT 3: bilinmeyen kapı / alt komut ─────────────────────────────── */

describe("KİLİT — bilinmeyen kapı ve alt komut", () => {
  it("bilinmeyen kapı adı REDDEDİLİR", () => {
    const r = parse("gate", ...PKG, "--gate", "typechek", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/bilinmeyen kapı: "typechek"/);
  });

  it("kapı adı büyük harfle yazılırsa REDDEDİLİR (kapalı sözlük)", () => {
    const r = parse("gate", ...PKG, "--gate", "Test", ...AJAN);
    expect(r.cmd).toBe("error");
  });

  it("doğru yazım geçer", () => {
    expect(parse("gate", ...PKG, "--gate", "typecheck", ...AJAN).cmd).toBe("gate");
  });

  it("bilinmeyen alt komut REDDEDİLİR", () => {
    const r = parse("publish", ...PKG, ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/bilinmeyen alt komut: "publish"/);
  });

  it("alt komut hiç verilmezse REDDEDİLİR", () => {
    const r = parseJournalArgv([]);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/alt komut verilmedi/);
  });
});

/* ── KİLİT 4: aktör zorunlu, rol kapalı listede ───────────────────────── */

describe("KİLİT — aktör alanları (11.7)", () => {
  it.each(["--actor-kind", "--actor-id", "--actor-role"])("%s eksikse REDDEDİLİR", (eksik) => {
    const r = parseJournalArgv(bayragiCikar(["note", ...PKG, "--text", "deneme", ...AJAN], eksik));
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(new RegExp(`${eksik} ZORUNLUDUR`));
  });

  it("üçü de verilince geçer", () => {
    const r = parse("note", ...PKG, "--text", "deneme", ...AJAN);
    expect(r.cmd).toBe("note");
    if (r.cmd !== "note") return;
    expect(r.actor).toEqual({ kind: "agent", id: "ajan-5", role: "uygulayici" });
  });

  it("kapalı liste dışındaki rol REDDEDİLİR", () => {
    const r = parse(
      "note", ...PKG, "--text", "deneme",
      "--actor-kind", "human", "--actor-id", "x", "--actor-role", "patron"
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--actor-role bilinmiyor: "patron"/);
  });

  it.each(JOURNAL_ACTOR_ROLES)("kapalı listedeki rol geçer: %s", (role) => {
    const r = parse(
      "note", ...PKG, "--text", "deneme",
      "--actor-kind", "human", "--actor-id", "x", "--actor-role", role
    );
    expect(r.cmd).toBe("note");
    if (r.cmd !== "note") return;
    expect(r.actor.role).toBe(role);
  });

  it("actor-kind human|agent dışında olamaz", () => {
    const r = parse(
      "note", ...PKG, "--text", "deneme",
      "--actor-kind", "sistem", "--actor-id", "x", "--actor-role", "otomasyon"
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--actor-kind bilinmiyor/);
  });

  it("boş actor-id REDDEDİLİR (aktör ASLA null değildir)", () => {
    const r = parse(
      "note", ...PKG, "--text", "deneme",
      "--actor-kind", "agent", "--actor-id=", "--actor-role", "otomasyon"
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--actor-id ZORUNLUDUR/);
  });
});

/* ── KİLİT 5: kaçış bayrağı yok ───────────────────────────────────────── */

describe("KİLİT — kaçış bayrağı yok, tanınmayan bayrak sessizce yok sayılmaz", () => {
  it.each(["--skip", "--force", "--no-verify", "--yes"])("%s REDDEDİLİR", (bayrak) => {
    const r = parse("gate", ...PKG, "--gate", "test", bayrak, "1", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/tanınmayan bayrak/);
  });

  it("kaçış bayrağı çıkarılınca aynı komut geçer", () => {
    expect(parse("gate", ...PKG, "--gate", "test", ...AJAN).cmd).toBe("gate");
  });

  it("stage --from REDDEDİLİR — geçişin kaynağı türetilir, yazılmaz", () => {
    const r = parse("stage", ...PKG, "--to", "test", "--from", "gelistirme", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/tanınmayan bayrak: --from/);
  });

  it("verify hiçbir bayrak almaz", () => {
    const r = parse("verify", "--package", "PKG-1");
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/verify hiçbir bayrak almaz/);
  });

  it("çıplak verify geçer", () => {
    expect(parse("verify")).toEqual({ cmd: "verify" });
  });
});

/* ── Ayrıştırma mekaniği ──────────────────────────────────────────────── */

describe("bayrak ayrıştırma", () => {
  it("--anahtar=deger biçimi çalışır", () => {
    const r = parse("note", "--package=PKG-1", "--text=merhaba", ...AJAN);
    expect(r.cmd).toBe("note");
    if (r.cmd !== "note") return;
    expect(r.packageId).toBe("PKG-1");
    expect(r.text).toBe("merhaba");
  });

  it("değersiz bayrak REDDEDİLİR — sonraki bayrağı değer sanmaz", () => {
    const r = parse("note", ...PKG, "--text", "--actor-kind", "agent");
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--text bayrağı değersiz bırakıldı/);
  });

  it("konumsal argüman REDDEDİLİR", () => {
    const r = parse("gate", "PKG-1", "--gate", "test", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/konumsal argüman kabul edilmiyor/);
  });

  it("tek değerli bayrak tekrarlanırsa REDDEDİLİR", () => {
    const r = parse("note", ...PKG, "--text", "bir", "--text", "iki", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--text birden çok kez verildi/);
  });

  it("boşluk taşıyan değer korunur", () => {
    const r = parse("note", ...PKG, "--text", "iki kelime · üç", ...AJAN);
    expect(r.cmd).toBe("note");
    if (r.cmd !== "note") return;
    expect(r.text).toBe("iki kelime · üç");
  });
});

/* ── declare ──────────────────────────────────────────────────────────── */

describe("declare", () => {
  const TAM = [
    "declare", ...PKG,
    "--name", "Package Journal",
    "--purpose", "geliştirme sürecinin ölçüm kaydı",
    "--canonical-version", "4.1.0",
    "--canonical-section", "11.3",
    "--canonical-section", "11.5",
    "--adr", "TDR-001",
    "--module", "packages/journal",
    "--contract", "JournalLine v1",
    "--scope-in", "olay kaydı",
    "--scope-out", "cockpit ekranı",
    "--risk-class", "orta",
    ...AJAN,
  ];

  it("tam bildirim geçer ve listeler birikir", () => {
    const r = parseJournalArgv(TAM);
    expect(r.cmd).toBe("declare");
    if (r.cmd !== "declare") return;
    expect(r.payload.canonical_sections).toEqual(["11.3", "11.5"]);
    expect(r.payload.risk_class).toBe("orta");
    expect(r.payload.scope_out).toEqual(["cockpit ekranı"]);
    expect(r.payload.name).toBe("Package Journal");
  });

  it("--canonical-section olmadan REDDEDİLİR (izlenebilirlik)", () => {
    const r = parseJournalArgv(bayragiCikar(TAM, "--canonical-section"));
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--canonical-section en az bir kez ZORUNLUDUR/);
  });

  it("kapalı liste dışı risk sınıfı REDDEDİLİR", () => {
    const r = parseJournalArgv(TAM.map((x) => (x === "orta" ? "belki" : x)));
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--risk-class bilinmiyor/);
  });

  it("--purpose eksikse REDDEDİLİR", () => {
    const i = TAM.indexOf("--purpose");
    const r = parseJournalArgv([...TAM.slice(0, i), ...TAM.slice(i + 2)]);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--purpose ZORUNLUDUR/);
  });
});

/* ── stage ────────────────────────────────────────────────────────────── */

describe("stage", () => {
  it("geçerli aşama geçer", () => {
    const r = parse("stage", ...PKG, "--to", "ikinci-dogrulayici", ...AJAN);
    expect(r.cmd).toBe("stage");
    if (r.cmd !== "stage") return;
    expect(r.to).toBe("ikinci-dogrulayici");
  });

  it("kapalı liste dışı aşama REDDEDİLİR", () => {
    const r = parse("stage", ...PKG, "--to", "neredeyse-bitti", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--to bilinmiyor/);
  });
});

/* ── git · agent · verifier · risk · show ─────────────────────────────── */

describe("diğer olay komutları", () => {
  it("git kaydı geçer", () => {
    const r = parse("git", ...PKG, "--kind", "commit", "--value", "d46b877", "--subject", "B: motor", ...AJAN);
    expect(r.cmd).toBe("git");
    if (r.cmd !== "git") return;
    expect(r).toMatchObject({ kind: "commit", value: "d46b877", subject: "B: motor" });
  });

  it("git --kind kapalı listede değilse REDDEDİLİR", () => {
    const r = parse("git", ...PKG, "--kind", "tag", "--value", "v1", ...AJAN);
    expect(r.cmd).toBe("error");
  });

  it("agent started geçer", () => {
    const r = parse("agent", ...PKG, "--phase", "started", "--label", "AJAN-5", "--task", "kilit turu", ...AJAN);
    expect(r.cmd).toBe("agent");
    if (r.cmd !== "agent" || r.phase !== "started") return;
    expect(r.task).toBe("kilit turu");
  });

  it("agent finished --result ister (--outcome DEĞİL — o ad kapı yargısına ayrılmıştır)", () => {
    const yanlis = parse(
      "agent", ...PKG, "--phase", "finished", "--label", "AJAN-5",
      "--outcome", "ok", "--summary", "bitti", ...AJAN
    );
    expect(yanlis.cmd).toBe("error");
    expect(hataMesaji(yanlis)).toMatch(/tanınmayan bayrak: --outcome/);

    const dogru = parse(
      "agent", ...PKG, "--phase", "finished", "--label", "AJAN-5",
      "--result", "ok", "--summary", "bitti", ...AJAN
    );
    expect(dogru.cmd).toBe("agent");
    if (dogru.cmd !== "agent" || dogru.phase !== "finished") return;
    expect(dogru.result).toBe("ok");
  });

  it("verifier bulgusu geçer", () => {
    const r = parse(
      "verifier", ...PKG, "--finding-id", "B-1", "--severity", "blocker",
      "--summary", "zincir denetimi atlanıyor", "--file", "src/verify.ts", ...AJAN
    );
    expect(r.cmd).toBe("verifier");
    if (r.cmd !== "verifier" || r.kind !== "finding") return;
    expect(r.severity).toBe("blocker");
    expect(r.file).toBe("src/verify.ts");
  });

  it("verifier kararı geçer", () => {
    const r = parse(
      "verifier", ...PKG, "--decision", "onay", "--findings-open", "0",
      "--findings-closed", "10", "--summary", "temiz", ...AJAN
    );
    expect(r.cmd).toBe("verifier");
    if (r.cmd !== "verifier" || r.kind !== "verdict") return;
    expect(r.findingsClosed).toBe(10);
  });

  it("KİLİT — açık bulgu varken 'onay' REDDEDİLİR (11.6/1)", () => {
    const r = parse(
      "verifier", ...PKG, "--decision", "onay", "--findings-open", "2",
      "--findings-closed", "8", "--summary", "sonra bakarız", ...AJAN
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/açık bulgu varken karar 'onay' olamaz/);
  });

  it("açık bulgu varken 'bulgu' kararı geçer", () => {
    const r = parse(
      "verifier", ...PKG, "--decision", "bulgu", "--findings-open", "2",
      "--findings-closed", "8", "--summary", "iki açık", ...AJAN
    );
    expect(r.cmd).toBe("verifier");
  });

  it("verifier: bulgu ve karar birlikte verilemez", () => {
    const r = parse(
      "verifier", ...PKG, "--finding-id", "B-1", "--severity", "kucuk",
      "--decision", "onay", "--findings-open", "0", "--findings-closed", "1",
      "--summary", "belirsiz", ...AJAN
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/birlikte verilemez/);
  });

  it("verifier: ikisi de yoksa REDDEDİLİR", () => {
    const r = parse("verifier", ...PKG, "--summary", "hiçbiri", ...AJAN);
    expect(r.cmd).toBe("error");
  });

  it("findings sayısı tam sayı olmalı", () => {
    const r = parse(
      "verifier", ...PKG, "--decision", "bulgu", "--findings-open", "iki",
      "--findings-closed", "0", "--summary", "x", ...AJAN
    );
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--findings-open tam sayı olmalı/);
  });

  it("risk kaydı geçer", () => {
    const r = parse("risk", ...PKG, "--risk-id", "R-1", "--status", "acik", "--summary", "kilit yok", ...AJAN);
    expect(r.cmd).toBe("risk");
    if (r.cmd !== "risk") return;
    expect(r.status).toBe("acik");
  });

  it("show aktör istemez, fazladan aktör bayrağı REDDEDİLİR", () => {
    expect(parse("show", ...PKG)).toEqual({ cmd: "show", packageId: "PKG-JOURNAL-01" });
    const r = parse("show", ...PKG, ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/show için tanınmayan bayrak/);
  });

  it("--package her yazan komutta zorunludur", () => {
    const r = parse("note", "--text", "paketsiz", ...AJAN);
    expect(r.cmd).toBe("error");
    expect(hataMesaji(r)).toMatch(/--package ZORUNLUDUR/);
  });
});
