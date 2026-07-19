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

import { describe, expect, it, vi } from "vitest";

import {
  BOS_KAYNAK_SATIRI,
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
