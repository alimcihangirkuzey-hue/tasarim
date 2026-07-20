/* PLAN KATMANI testleri (Canonical 11.4 plan sınıfı).

   İki ayrı şey sınanır ve karıştırılmaz:
   · SAF ayrıştırma — sabit markdown girdisiyle; hangi satırın alındığı ve
     ALINMADIĞI tek tek sabitlenir. Ayrıştırma genişlerse (ör. girintili alt
     maddeler de girerse) burası kırılır.
   · SAF git-çıktısı çözümü — bayatlığın asıl değeri buradadır. Bozuk/boş
     çıktının SAYIYA dönüşmediği, null kaldığı ayrıca sınanır: sessizce 0'a
     düşen bir bayatlık ölçüsü, "plan güncel" diye yalan söylerdi.

   Canlı depoya karşı koşan testler SALT-OKUNURDUR (readFileSync + git log/
   rev-list) ve depoyu kirletmez. */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  BOS_KAYNAK_SATIRI,
  NOT_SHALLOW,
  PLAN_KAYNAKLARI,
  type Bayatlik,
  kaynakBasligi,
  okuPlanlar,
  okunamadiPlani,
  planBasliklari,
  planSatirlari,
  sayiCoz,
  sonCommitCoz,
  tabanRef,
  tabloAyraciMi,
} from "./plan.js";

const SHA = "f2bbaeb4d6effe5f1843365cbff0c6f7d0d70e4f";
const ISO_OFSETLI = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/* Ölçülmüş bir bayatlığın sabit karşılığı (saf testlerin girdisi). */
const BAYAT: Bayatlik = {
  guncellendi: "2026-07-14T03:32:59+03:00",
  geride_commit: 42,
  olcum_notu: "taban refs/heads/main",
  okundu: "2026-07-20T00:00:00.000Z",
};

/* GİT GEÇMİŞİ OLMAYAN ama DAİMA VAR OLAN kaynak: node_modules gitignore'da,
   yani `git log` boş döner; vitest ise bu testi koşabilmek için kurulu olmak
   ZORUNDA. Böylece "sha çözülemedi" yolu, depo kirletilmeden ve ileride
   commit'lenip testi bozacak bir dosyaya bağlanmadan gerçekten koşulur. */
const GECMISSIZ = "node_modules/vitest/package.json";

/* Tek fixture, tüm satır sınıflarını kapsar: başlık · üst düzey madde ·
   numaralı madde · GİRİNTİLİ alt madde · çit içindeki sahte madde · tablo
   satırı · tablo ayracı · düz paragraf · alıntı. */
const MD = [
  "# ROADMAP — TEZGÂH",
  "*(türetilmiş sıra görünümü)*",
  "",
  "## C-hattı sırası",
  "1. **T1 TUR-FIX** ✅ (main `4f84980`)",
  "2. **T3 PART-B** ◀ şimdi",
  "  - girintili alt madde",
  "- üst düzey madde",
  "",
  "```bash",
  "- kod bloğu içindeki sahte madde",
  "```",
  "",
  "| # | Goal | Durum |",
  "|---|---|---|",
  "| T1 | TEZGAH-TUR-FIX | COMPLETED |",
  "",
  "> alıntı satırı",
  "düz paragraf",
  "",
].join("\n");

/* ── planSatirlari ────────────────────────────────────────────────────── */

describe("planSatirlari — DAR ayrıştırma", () => {
  const satirlar = planSatirlari(MD);

  it("başlıkları ve üst düzey maddeleri alır", () => {
    expect(satirlar).toContain("# ROADMAP — TEZGÂH");
    expect(satirlar).toContain("## C-hattı sırası");
    expect(satirlar).toContain("2. **T3 PART-B** ◀ şimdi");
    expect(satirlar).toContain("- üst düzey madde");
  });

  it("GİRİNTİLİ alt maddeyi ALMAZ — ölçüt ham satırın ilk karakteridir", () => {
    expect(satirlar).not.toContain("  - girintili alt madde");
    expect(satirlar.some((s) => s.includes("girintili"))).toBe(false);
  });

  it("çitli kod bloğunun İÇİNDEKİ madde ALINMAZ", () => {
    expect(satirlar.some((s) => s.includes("sahte madde"))).toBe(false);
    expect(satirlar.some((s) => s.startsWith("```"))).toBe(false);
  });

  it("tablo satırını alır, hizalama ayracını ALMAZ", () => {
    expect(satirlar).toContain("| # | Goal | Durum |");
    expect(satirlar).toContain("| T1 | TEZGAH-TUR-FIX | COMPLETED |");
    expect(satirlar).not.toContain("|---|---|---|");
  });

  it("düz paragrafı, alıntıyı ve boş satırı ALMAZ", () => {
    expect(satirlar).not.toContain("düz paragraf");
    expect(satirlar).not.toContain("> alıntı satırı");
    expect(satirlar).not.toContain("");
    expect(satirlar.some((s) => s.startsWith("*(türetilmiş"))).toBe(false);
  });

  it("satır YENİDEN YORUMLANMAZ — işaretleriyle taşınır, sağdan kırpılır", () => {
    expect(planSatirlari("- madde   \n")).toEqual(["- madde"]);
    expect(planSatirlari("#### dördüncü düzey")).toEqual(["#### dördüncü düzey"]);
  });

  it("boş gövde boş dizi verir (sarmalayıcının işi değil, ayrıştırıcının)", () => {
    expect(planSatirlari("")).toEqual([]);
  });
});

describe("tabloAyraciMi", () => {
  it("hizalama satırlarını tanır", () => {
    expect(tabloAyraciMi("|---|---|")).toBe(true);
    expect(tabloAyraciMi("| :--- | ---: | :-: |")).toBe(true);
  });

  it("içerik taşıyan satırı ayraç saymaz", () => {
    expect(tabloAyraciMi("| T1 | COMPLETED |")).toBe(false);
    expect(tabloAyraciMi("| - | tek tire hücre |")).toBe(false);
  });
});

/* ── planBasliklari ───────────────────────────────────────────────────── */

describe("planBasliklari — plan sınıfı sarmalayıcısı", () => {
  it("sinif daima 'plan'dır", () => {
    const p = planBasliklari(MD, "ROADMAP", "docs/ROADMAP.md", BAYAT);
    expect(p.sinif).toBe("plan");
    expect(p.deger.baslik).toBe("ROADMAP");
  });

  it("bayatlığın DÖRT alanını da OLDUĞU GİBİ taşır", () => {
    const p = planBasliklari(MD, "ROADMAP", "docs/ROADMAP.md", BAYAT);
    expect(p.guncellendi).toBe("2026-07-14T03:32:59+03:00");
    expect(p.geride_commit).toBe(42);
    expect(p.olcum_notu).toBe("taban refs/heads/main");
    expect(p.okundu).toBe("2026-07-20T00:00:00.000Z");
  });

  it("`kaynak` YALNIZ yoldur — gerekçe oraya iliştirilmez", () => {
    const p = planBasliklari(MD, "ROADMAP", "docs/ROADMAP.md", {
      ...BAYAT,
      olcum_notu: "main dalı yok, HEAD tabanı kullanıldı",
    });
    expect(p.kaynak).toBe("docs/ROADMAP.md");
    expect(p.kaynak).not.toContain("HEAD");
    expect(p.olcum_notu).toContain("HEAD");
  });

  it("ölçülemeyen bayatlık null KALIR — 0'a ya da 'şimdi'ye düşmez", () => {
    const p = planBasliklari(MD, "ROADMAP", "docs/ROADMAP.md", {
      ...BAYAT,
      guncellendi: null,
      geride_commit: null,
    });
    expect(p.guncellendi).toBeNull();
    expect(p.geride_commit).toBeNull();
  });

  it("olcum_notu null gelirse SESSİZ kalmaz, 'not verilmedi' cümlesine çevrilir", () => {
    /* null bir gerekçe değildir; ekranda hiçbir şey söylemez. */
    const p = planBasliklari(MD, "ROADMAP", "docs/ROADMAP.md", { ...BAYAT, olcum_notu: null });
    expect(p.olcum_notu).not.toBeNull();
    expect(p.olcum_notu).toBe("ölçüm notu verilmedi — bayatlığın tabanı bildirilmedi");
  });

  it("hiç satır çıkmayan kaynak SESSİZ kalmaz, açıklayıcı satır üretir", () => {
    /* Boş dizi ekranda 'plan yok' gibi görünürdü; oysa dosya okundu. */
    const p = planBasliklari("düz metin, başlık yok\n", "BOŞ", "docs/BOS.md", BAYAT);
    expect(p.deger.satirlar).toEqual([BOS_KAYNAK_SATIRI]);
    /* Gövde boş ama bayatlık ÖLÇÜLDÜ — notu ve damgası yerinde kalır. */
    expect(p.olcum_notu).toBe("taban refs/heads/main");
    expect(p.okundu).toBe("2026-07-20T00:00:00.000Z");
  });
});

describe("okunamadiPlani", () => {
  it("okunamadı satırı sebebi taşır ve bayatlık null'dır", () => {
    const p = okunamadiPlani("YOK", "docs/YOK.md", "ENOENT: no such file");
    expect(p.sinif).toBe("plan");
    expect(p.deger.satirlar).toHaveLength(1);
    expect(p.deger.satirlar[0]).toContain("(okunamadı)");
    expect(p.deger.satirlar[0]).toContain("ENOENT");
    expect(p.guncellendi).toBeNull();
    expect(p.geride_commit).toBeNull();
  });

  it("olcum_notu ölçüme HİÇ GİRİLMEDİĞİNİ söyler ve sebebi taşır", () => {
    const p = okunamadiPlani("YOK", "docs/YOK.md", "ENOENT: no such file");
    expect(p.olcum_notu).toContain("kaynak okunamadı");
    expect(p.olcum_notu).toContain("bayatlık ölçülmedi");
    expect(p.olcum_notu).toContain("ENOENT");
  });

  it("okundu ZORUNLU alanı DENEME anıyla doldurulur", () => {
    const p = okunamadiPlani("YOK", "docs/YOK.md", "ENOENT");
    expect(p.okundu).toMatch(ISO_UTC_MS);
  });
});

describe("kaynakBasligi", () => {
  it("repo-göreli yoldan başlık türetir", () => {
    expect(kaynakBasligi("docs/ROADMAP.md")).toBe("ROADMAP");
    expect(kaynakBasligi("docs/GOAL_QUEUE.md")).toBe("GOAL_QUEUE");
    expect(kaynakBasligi("PLAN.md")).toBe("PLAN");
  });
});

/* ── git çıktısı → değer ──────────────────────────────────────────────── */

describe("sonCommitCoz — `git log -1 --format=%H%x09%cI`", () => {
  it("sha ve ISO anı çözer", () => {
    expect(sonCommitCoz(`${SHA}\t2026-07-14T03:32:59+03:00\n`)).toEqual({
      sha: SHA,
      iso: "2026-07-14T03:32:59+03:00",
    });
  });

  it("Z ekli UTC biçimini de kabul eder", () => {
    expect(sonCommitCoz(`${SHA}\t2026-07-14T00:32:59Z`)?.iso).toBe("2026-07-14T00:32:59Z");
  });

  it("BOŞ çıktı null — commit edilmemiş kaynak 'güncel' sayılmaz", () => {
    /* git bu durumda exit 0 + boş gövde döner (ölçüldü); hata gibi görünmez. */
    expect(sonCommitCoz("")).toBeNull();
    expect(sonCommitCoz("\n")).toBeNull();
  });

  it("40 hex olmayan sha null — sonraki rev-list çağrısının ÖN KOŞULU budur", () => {
    expect(sonCommitCoz("f2bbaeb\t2026-07-14T03:32:59+03:00")).toBeNull();
    expect(sonCommitCoz(`\t2026-07-14T03:32:59+03:00`)).toBeNull();
    expect(sonCommitCoz(`${SHA.toUpperCase()}\t2026-07-14T03:32:59+03:00`)).toBeNull();
  });

  it("ISO olmayan tarih null — biçimsiz an ekrana taşınmaz", () => {
    expect(sonCommitCoz(`${SHA}\t14.07.2026`)).toBeNull();
    expect(sonCommitCoz(`${SHA}\t2026-07-14`)).toBeNull();
    expect(sonCommitCoz(SHA)).toBeNull();
  });
});

describe("sayiCoz — `git rev-list --count`", () => {
  it("sayıyı çözer, 0 da geçerli değerdir", () => {
    expect(sayiCoz("42\n")).toBe(42);
    expect(sayiCoz("0\n")).toBe(0);
  });

  it("sayı olmayan çıktı null — NaN ya da 0'a düşmez", () => {
    expect(sayiCoz("")).toBeNull();
    expect(sayiCoz("fatal: bad revision\n")).toBeNull();
    expect(sayiCoz("-1")).toBeNull();
    expect(sayiCoz("4 2")).toBeNull();
    expect(sayiCoz("42abc")).toBeNull();
  });
});

describe("tabanRef", () => {
  it("main varsa refs/heads/main tabanlıdır ve BUNU SÖYLER", () => {
    /* Olağan durumda susmak, okuyanı tabanı VARSAYMAYA bırakırdı. */
    expect(tabanRef(true)).toEqual({ ref: "refs/heads/main", not: "taban refs/heads/main" });
  });

  it("main yoksa HEAD tabanlıdır ve GEREKÇE taşır", () => {
    expect(tabanRef(false)).toEqual({
      ref: "HEAD",
      not: "main dalı yok, HEAD tabanı kullanıldı",
    });
  });

  it("iki tabanın cümlesi BİRBİRİNDEN AYIRT EDİLEBİLİR", () => {
    expect(tabanRef(true).not).not.toBe(tabanRef(false).not);
  });
});

/* ── okuPlanlar (canlı depo, salt-okunur) ─────────────────────────────── */

describe("okuPlanlar — canlı kaynaklar", () => {
  /* TEK okuma, çok iddia. Her `it` kendi turunu koşsaydı kaynak başına üç git
     süreci (log · rev-parse · rev-list) çarpılırdı; ölçüldü: bu dosya tek
     başına 21 süreç açıyordu ve tüm paket koşumunda vitest'in işçi RPC'si
     "Timeout calling onTaskUpdate" ile düşüyordu — testler geçtiği hâlde
     koşum exit 1 dönüyordu. Okuma SALT-OKUNUR olduğu için paylaşmanın
     iddialara maliyeti yok. */
  const once = new Date().toISOString();
  const planlar = okuPlanlar();
  const sonra = new Date().toISOString();

  it("her kaynak için TAM BİR plan döner, sıra korunur", () => {
    expect(planlar).toHaveLength(PLAN_KAYNAKLARI.length);
    expect(planlar.map((p) => p.deger.baslik)).toEqual(PLAN_KAYNAKLARI.map(kaynakBasligi));
    expect(planlar.every((p) => p.sinif === "plan")).toBe(true);
  });

  it("var olmayan kaynak SESSİZCE ATLANMAZ — 'okunamadı' satırı üretir", () => {
    /* Dosya okunamadığı için git'e hiç gidilmez — ek süreç açmaz. */
    const yok = okuPlanlar(["docs/BOYLE_BIR_PLAN_YOK.md"]);
    expect(yok).toHaveLength(1);
    expect(yok[0].deger.satirlar[0]).toContain("(okunamadı)");
    expect(yok[0].guncellendi).toBeNull();
  });

  it("ROADMAP bayatlığı GERÇEKTEN ölçülür (null bırakılmaz)", () => {
    const p = planlar[0];
    expect(p.deger.baslik).toBe("ROADMAP");
    expect(p.guncellendi).toMatch(ISO_OFSETLI);
    expect(typeof p.geride_commit).toBe("number");
    expect(p.geride_commit).toBeGreaterThanOrEqual(0);
  });

  it("kaynak alanı YALNIZ repo-göreli yoldur", () => {
    expect(planlar.map((p) => p.kaynak)).toEqual([...PLAN_KAYNAKLARI]);
  });

  it("GOAL_QUEUE tablo olduğu için içeriği görünür (yalnız H1 değil)", () => {
    /* ŞERH'in ölçülmüş gerekçesi: liste+başlık ayrıştırması bu dosyadan tek
       satır (H1) üretiyordu; tablo satırları alınmasa kuyruk BOŞ görünürdü. */
    const p = planlar[1];
    expect(p.deger.baslik).toBe("GOAL_QUEUE");
    expect(p.deger.satirlar.length).toBeGreaterThan(1);
    expect(p.deger.satirlar.some((s) => s.startsWith("|"))).toBe(true);
    expect(p.deger.satirlar).not.toContain(BOS_KAYNAK_SATIRI);
  });

  it("plan kaynakları yerinde duruyor — hiçbiri okunamadı değil", () => {
    /* Kaynak taşınırsa kokpit sessizce boşalmaz; bu test önce kırılır. */
    for (const p of planlar) {
      expect(p.deger.satirlar[0]).not.toContain("(okunamadı)");
    }
  });

  /* ── olcum_notu: ÜÇ YOL, ÜÇ AYRI GEREKÇE ────────────────────────────── */

  it("YOL 1 — ölçülen kaynak: tabanı söyler", () => {
    for (const p of planlar) {
      expect(p.olcum_notu).toBe("taban refs/heads/main");
      expect(p.geride_commit).not.toBeNull();
    }
  });

  it("YOL 2 — main dalı yoksa gerekçe HEAD tabanını söyler", () => {
    /* Bu dalda main VAR; kararın kendisi saf tabanRef'te sınanır ki gerekçe
       ortamın rastlantısına bırakılmasın. */
    expect(tabanRef(false).not).toBe("main dalı yok, HEAD tabanı kullanıldı");
  });

  it("YOL 3 — git geçmişi olmayan kaynak: sayım YAPILMADIĞINI söyler", () => {
    const p = okuPlanlar([GECMISSIZ])[0];
    expect(p.olcum_notu).toBe("son commit sha çözülemedi, sayım yapılmadı");
    expect(p.guncellendi).toBeNull();
    expect(p.geride_commit).toBeNull();
    /* İçerik de boş çıkar; iki sessizlik birden kapanmış olur. */
    expect(p.deger.satirlar).toEqual([BOS_KAYNAK_SATIRI]);
  });

  it("YOL 4 — okunamayan kaynak: ölçüme HİÇ girilmediğini söyler", () => {
    const p = okuPlanlar(["docs/BOYLE_BIR_PLAN_YOK.md"])[0];
    expect(p.olcum_notu).toContain("kaynak okunamadı");
  });

  it("DÖRT gerekçe BİRBİRİNDEN FARKLI — hepsi 'ölçemedim' demiyor", () => {
    /* Ayrım kaybolursa okuyan, "42 ölçüldü" ile "sayamadım"ı ayırt edemez. */
    const notlar = [
      planlar[0].olcum_notu,
      tabanRef(false).not,
      okuPlanlar([GECMISSIZ])[0].olcum_notu,
      okuPlanlar(["docs/BOYLE_BIR_PLAN_YOK.md"])[0].olcum_notu,
    ];
    expect(new Set(notlar).size).toBe(4);
    expect(notlar.every((n) => n !== null && n.length > 0)).toBe(true);
  });

  /* ── okundu: ölçüm anı ──────────────────────────────────────────────── */

  it("okundu ISO UTC ms desenindedir ve hiçbir planda boş değildir", () => {
    for (const p of planlar) expect(p.okundu).toMatch(ISO_UTC_MS);
  });

  it("okundu ÖLÇÜM TURUNUN İÇİNDE damgalanır — desene uyan sabit yetmez", () => {
    /* Desen denetimi tek başına zayıf: sabit kodlanmış geçerli bir ISO dizgesi
       de deseni geçerdi. Damganın turun penceresine düşmesi bunu kapatır. */
    for (const p of planlar) {
      expect(p.okundu >= once).toBe(true);
      expect(p.okundu <= sonra).toBe(true);
    }
  });

  it("okundu HER ÇAĞRIDA yeniden damgalanır — önbelleklenmez", () => {
    const bir = okuPlanlar(["docs/BOYLE_BIR_PLAN_YOK.md"])[0].okundu;
    const t = Date.now();
    while (Date.now() === t) {
      /* saatin tiklemesini bekle: aynı milisaniyede iki damga eşit çıkabilir
         ve test o zaman kendi kurgusundan ötürü yeşil kalırdı */
    }
    const iki = okuPlanlar(["docs/BOYLE_BIR_PLAN_YOK.md"])[0].okundu;
    expect(iki > bir).toBe(true);
  });

  it("okundu SABİT KODLU DEĞİL — sistem saatinden okunur", () => {
    /* Sahte saat: damganın gerçekten saatten geldiğini tek başına kanıtlar.
       Bu yol git çağırmaz, yani sahte zamanlayıcı alt sürece dokunmaz. */
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2020-01-02T03:04:05.678Z"));
      const a = okunamadiPlani("X", "docs/X.md", "ENOENT");
      expect(a.okundu).toBe("2020-01-02T03:04:05.678Z");

      vi.setSystemTime(new Date("2021-06-07T08:09:10.111Z"));
      const b = okunamadiPlani("X", "docs/X.md", "ENOENT");
      expect(b.okundu).toBe("2021-06-07T08:09:10.111Z");
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ── SHALLOW DEPO BEKÇİSİ — GERÇEK klonla ölçülür ─────────────────────────

   ÖLÇÜLEN KUSURDU: `git clone --depth 1` sonrası `git log -1 -- <yol>` dosyanın
   GERÇEK son commit'ini değil, kesilmiş geçmişin UCUNDAKİ commit'i döndürür.
   O sha geçerli 40 hex olduğu için `sonCommitCoz` muhafızından geçer; ardından
   `rev-list --count <o sha>..main` SIFIR verir ve ekran "ana dalla aynı hizada
   — 0 commit geride" der. Aylarca eski bir yol haritası GÜNCEL görünür: boş-sha
   tuzağıyla aynı sınıf hata — ölçüm hatasının EN İYİMSER cevaba dönüşmesi (11.3).

   SAHTE GİT YOK. Tuzak yalnız gerçek shallow klonda doğar, bu yüzden burada
   gerçek bir depo kurulur, gerçekten klonlanır ve gerçek git ölçer. Tuzağın
   VAR OLDUĞU da ayrıca ölçülür (KANIT testi): bekçi, olmayan bir hataya karşı
   yazılmış olsaydı ne kırılırdı ne de bir şey kanıtlardı.

   İZOLASYON: her şey mkdtemp altında kurulur ve sonunda silinir; GERÇEK depoya
   tek bir yazma yapılmaz.

   ÖLÇÜM DİKİŞİ: `gitCalistir` git'i DAİMA `cwd: ROOT_DIR` ile çağırır (live.ts),
   yani ölçüm noktası gerçek depoya sabitlenmiştir ve enjekte edilemez. Ölçümü
   geçici klona yöneltmek için git'in kendi `GIT_DIR` değişkeni kullanılır:
   GIT_DIR verildiğinde git o depoyu okur, çalışma ağacının tepesi olarak da
   cwd'yi kabul eder — dolayısıyla `-- docs/ROADMAP.md` ve `-- .` yol
   belirteçleri depo-göreli çözülür. Ölçülen KOD YOLU üretimdekinin AYNISIDIR
   (okuPlanlar → bayatlikOlc → gitCalistir); değişen yalnız hangi deponun
   okunduğudur.

   ŞERH — bu kurulumun ölçmediği şey: plan GÖVDESİ yine gerçek depodaki
   `docs/ROADMAP.md`'den okunur (`readFileSync(ROOT_DIR/...)`), çünkü içerik
   okuması GIT_DIR'den etkilenmez. Bu yüzden aşağıda içerik hakkında HİÇBİR
   iddia yoktur; yalnız BAYATLIK ölçülür. */

describe("shallow depo: bayatlık ölçülemez, 'plan güncel' yalanı üretilmez", () => {
  const KAYNAK = "docs/ROADMAP.md";
  let tmpKok = "";
  let shallowGitDir = "";
  let tamGitDir = "";

  /** Doğrudan git — kurulum ve KANIT için; üretim yolundan bağımsız ölçer */
  const git = (args: string[], cwd: string): string =>
    execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] })
      .toString("utf8")
      .trim();

  /**
   * Ölçümü geçici klona yönelten dikiş. Eski değer FINALLY'de birebir geri
   * konur (yoksa silinir): sızan bir GIT_DIR, bu dosyadaki diğer testleri
   * sessizce başka bir depoya bakmaya gönderirdi.
   */
  function gitDiziniyle<T>(gitDir: string, f: () => T): T {
    const eski = process.env.GIT_DIR;
    process.env.GIT_DIR = gitDir;
    try {
      return f();
    } finally {
      if (eski === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = eski;
    }
  }

  beforeAll(() => {
    tmpKok = fs.mkdtempSync(path.join(os.tmpdir(), "tezgah-shallow-"));
    const origin = path.join(tmpKok, "origin");
    fs.mkdirSync(path.join(origin, "docs"), { recursive: true });

    git(["init", "-q", "-b", "main", "."], origin);
    /* Yerel kimlik/imza: koşucunun global git ayarı ne olursa olsun commit atılabilsin */
    git(["config", "user.email", "tezgah@test.local"], origin);
    git(["config", "user.name", "tezgah-test"], origin);
    git(["config", "commit.gpgsign", "false"], origin);

    /* c1 — ölçülecek dosyanın GERÇEK son commit'i */
    fs.writeFileSync(path.join(origin, "docs", KAYNAK.split("/")[1]), "# ROADMAP\n- ilk madde\n", "utf8");
    git(["add", "-A"], origin);
    git(["commit", "-q", "-m", "c1 roadmap"], origin);

    /* c2, c3 — ROADMAP'e DOKUNMAYAN iki commit: doğru cevap "2 commit geride" */
    for (const [i, m] of [["a", "c2"], ["b", "c3"]].entries()) {
      fs.appendFileSync(path.join(origin, "baska.md"), `${m[0]}${i}\n`, "utf8");
      git(["add", "-A"], origin);
      git(["commit", "-q", "-m", m[1]], origin);
    }

    /* file:// ZORUNLU: yerel yolla `--depth` sessizce yok sayılır (git --local
       yolunu seçer) ve kurulum hiç shallow olmazdı — test sahte yeşile düşerdi. */
    const url = `file:///${origin.replace(/\\/g, "/")}`;
    git(["clone", "-q", "--depth", "1", url, "shallow"], tmpKok);
    git(["clone", "-q", url, "tam"], tmpKok);

    shallowGitDir = path.join(tmpKok, "shallow", ".git");
    tamGitDir = path.join(tmpKok, "tam", ".git");
  }, 180_000);

  afterAll(() => {
    if (tmpKok.length > 0) {
      fs.rmSync(tmpKok, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it("KURULUM gerçekten shallow — karşı depo değil", () => {
    /* Bu iddia olmadan aşağıdaki testler, git `--depth`i yok saymış olsa bile
       (yerel yol tuzağı) sessizce yeşil kalabilirdi. */
    expect(git(["rev-parse", "--is-shallow-repository"], path.dirname(shallowGitDir))).toBe("true");
    expect(git(["rev-parse", "--is-shallow-repository"], path.dirname(tamGitDir))).toBe("false");
  }, 60_000);

  it("KANIT: tuzak GERÇEK — shallow klon YANLIŞ commit'i verir, sayım 0 çıkar", () => {
    const shallowDizin = path.dirname(shallowGitDir);
    const tamDizin = path.dirname(tamGitDir);
    const shaShallow = git(["log", "-1", "--format=%H", "--", KAYNAK], shallowDizin);
    const shaTam = git(["log", "-1", "--format=%H", "--", KAYNAK], tamDizin);

    /* Aynı dosya, aynı depo — iki farklı cevap. Kesik geçmiş budur. */
    expect(shaShallow).not.toBe(shaTam);
    /* VE yanlış sha, mevcut muhafızdan GEÇER: 40 hex olduğu için sonCommitCoz
       onu reddetmez — bu yüzden sha muhafızı bu hatayı yakalayamıyordu. */
    expect(sonCommitCoz(`${shaShallow}\t2026-01-01T00:00:00Z`)).not.toBeNull();
    /* Bekçi olmasaydı ekrana çıkacak sayı: 0 = "plan güncel" */
    expect(git(["rev-list", "--count", `${shaShallow}..refs/heads/main`, "--", "."], shallowDizin)).toBe("0");
    /* Doğru cevap tam klonda 2'dir — yani 0 bir ölçüm değil, YANILGIDIR */
    expect(git(["rev-list", "--count", `${shaTam}..refs/heads/main`, "--", "."], tamDizin)).toBe("2");
  }, 60_000);

  it("shallow depoda bayatlık ÖLÇÜLEMEZ: iki değer de null, gerekçe NOT_SHALLOW", () => {
    const p = gitDiziniyle(shallowGitDir, () => okuPlanlar([KAYNAK])[0]);

    expect(p.guncellendi).toBeNull();
    expect(p.geride_commit).toBeNull();
    expect(p.olcum_notu).toBe(NOT_SHALLOW);
    /* ASIL İDDİA: en iyimser cevap ÜRETİLMEZ. `toBeNull` bunu tek başına söyler
       ama açıkça yazılır — kırılan gün ne kaybedildiği okunsun. */
    expect(p.geride_commit).not.toBe(0);
    /* Ölçüm yapılamadı ama DENEME bir andır ve damgalanır */
    expect(p.okundu).toMatch(ISO_UTC_MS);
    /* Sınıf değişmez: ölçülemeyen plan da plan sınıfıdır */
    expect(p.sinif).toBe("plan");
    expect(p.kaynak).toBe(KAYNAK);
  }, 60_000);

  it("KARŞI YÖN: tam klonda GERÇEK sayı ölçülür — bekçi her depoyu kapatmaz", () => {
    /* Koşulsuz "ölçülemez" diyen bir bekçi de en az yanlış sayı kadar kötüdür:
       bayatlık ölçüsü tümüyle kaybolurdu. */
    const p = gitDiziniyle(tamGitDir, () => okuPlanlar([KAYNAK])[0]);

    expect(p.olcum_notu).toBe("taban refs/heads/main");
    expect(p.olcum_notu).not.toBe(NOT_SHALLOW);
    expect(p.guncellendi).toMatch(ISO_OFSETLI);
    /* c1'den sonra ROADMAP'e dokunmayan İKİ commit atıldı */
    expect(p.geride_commit).toBe(2);
  }, 60_000);

  it("NOT_SHALLOW gerekçesi diğerlerinden AYIRT EDİLEBİLİR ve 'ölçülemez' der", () => {
    /* Beşinci gerekçe: "ölçemedim" diyen dört cümleye karışırsa okuyan
       shallow klonu diğer arızalardan ayıramaz. */
    expect(NOT_SHALLOW).toContain("shallow");
    expect(NOT_SHALLOW).toContain("ÖLÇÜLEMEZ");
    const digerleri = [
      tabanRef(true).not,
      tabanRef(false).not,
      "son commit sha çözülemedi, sayım yapılmadı",
      "ölçüm notu verilmedi — bayatlığın tabanı bildirilmedi",
    ];
    expect(digerleri).not.toContain(NOT_SHALLOW);
  });

  it("GERÇEK DEPO KİRLENMEDİ — ölçüm turu depoya yazmadı", () => {
    /* Dikiş `GIT_DIR` ile kurulduğu için sızıntı riski gerçektir: geri
       konmasaydı bu dosyadaki diğer testler başka bir depoyu ölçerdi. */
    expect(process.env.GIT_DIR).toBeUndefined();
    const p = okuPlanlar([KAYNAK])[0];
    expect(p.olcum_notu).toBe("taban refs/heads/main");
    expect(p.geride_commit).toBeGreaterThanOrEqual(0);
  }, 60_000);
});
