/* GİRİŞ NOKTASININ KENDİSİ — GERÇEK SÜREÇLE ÖLÇÜLÜYOR (K-1/C).

   ÖNCEKİ PAKETİN AÇIK BULGUSU (`K1C-SIRA-1`) BUYDU: `acilis.ts` test edilebilir
   ve ölçülüyor, ama `index.ts`'in ONU çağırdığı — araya kendi sırasını
   yazmadığı — hiçbir şey tarafından denetlenmiyordu. Dosya import edildiği an
   dinlemeye başladığı için in-process test edilemez; o turda "kaynak tarayan
   bir nöbetçi yazılabilirdi ama yazım âdetine dayanır" diye ayrı dilime
   bırakılmıştı.

   BU DOSYA ÂDETE DEĞİL SÜRECE BAKIYOR: `tsx src/index.ts` GERÇEKTEN çalıştırılır
   (deponun kendi `start` betiği), bozuk ve geçerli yapılandırmayla iki kez, ve
   diske ne olduğu ÖLÇÜLÜR. Kaynağın nasıl yazıldığı önemsizdir; ölçülen şey
   sürecin davranışıdır.

   İKİNCİ BULGU DA BURADA (`K1C-SIRA-2`): yan etki hâlâ MODÜL YÜKLEME anındadır
   (`db.ts` yüklenirken `ensureDirs()` + `new Database`). Önceki nöbetçi yalnız
   `kurulum-dogrulama` ve `acilis` grafiklerini ölçüyordu — yani boot yoluna
   sonradan eklenen bir dosya db'yi statik çekerse yara kendi yolundan geri
   gelirdi. Buradaki statik-kapanış nöbetçisi artık GERÇEK GİRİŞ NOKTASINDAN
   başlıyor, yani boot yolunun tamamını kapsıyor.

   NİYE `PORT=0`: geçerli koşum gerçekten dinler. Sabit bir port, paralel
   koşumda ya da makinede açık bir sunucu varken çakışırdı; 0 çekirdekten boş
   port ister. Süreç ölçüm bitince SIGKILL ile kapatılır.

   ZAMAN AŞIMLARI AÇIKÇA YAZILI: süreç başlatmak vitest'in 5000 ms varsayılanına
   yakın koşabilir ve bu deponun bir kez ödediği hatadır (R-FLAKY-TEST-01:
   `journal:verify` 3,6 sn ölçülüp 5 sn tavana takılmıştı). Ölçülen süreler
   burada ~1,5 sn (red) ve ~3 sn (açılış); tavan cömert bırakıldı. */

import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const SERVER_SRC = path.dirname(fileURLToPath(import.meta.url));
const DEPO_KOKU = path.resolve(SERVER_SRC, "..", "..", "..");
const TSX = path.join(DEPO_KOKU, "node_modules", ".bin", "tsx");
const GIRIS = path.join(SERVER_SRC, "index.ts");

/* Ölçülen süreler ~1,5 sn / ~3 sn; tavan bilerek cömert (bkz. dosya başlığı). */
const RED_TAVANI_MS = 30_000;
const ACILIS_TAVANI_MS = 45_000;

const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "tezgah-giris-"));
const cocuklar: ChildProcess[] = [];

afterAll(() => {
  for (const c of cocuklar) c.kill("SIGKILL");
  fs.rmSync(gecici, { recursive: true, force: true });
});

interface Kosum {
  cikisKodu: number | null;
  ciktilar: string;
}

/** Gerçek giriş noktasını çalıştırır ve ÖLÜMÜNÜ bekler (bozuk yapılandırma). */
function kosVeBekle(ortam: Record<string, string>): Promise<Kosum> {
  const c = spawn(TSX, [GIRIS], {
    cwd: path.join(DEPO_KOKU, "apps", "server"),
    env: { ...process.env, ...ortam, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  cocuklar.push(c);
  let ciktilar = "";
  c.stdout.on("data", (d) => (ciktilar += String(d)));
  c.stderr.on("data", (d) => (ciktilar += String(d)));
  return new Promise((resolve) => {
    c.on("exit", (kod) => resolve({ cikisKodu: kod, ciktilar }));
  });
}

/** Gerçek giriş noktasını çalıştırır ve DİNLEMEYE geçmesini bekler. */
function kosVeDinlemeyiBekle(ortam: Record<string, string>): Promise<ChildProcess> {
  const c = spawn(TSX, [GIRIS], {
    cwd: path.join(DEPO_KOKU, "apps", "server"),
    env: { ...process.env, ...ortam, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  cocuklar.push(c);
  return new Promise((resolve, reject) => {
    let ciktilar = "";
    const bak = (d: unknown): void => {
      ciktilar += String(d);
      /* İMZA GİRİŞ NOKTASININ KENDİ SATIRI: "dinlemeye geçti"yi bir zamanlayıcıyla
         tahmin etmek, yavaş bir makinede sahte kırık üretirdi. */
      if (ciktilar.includes("TEZGAH server ->")) resolve(c);
    };
    c.stdout.on("data", bak);
    c.stderr.on("data", bak);
    c.on("exit", (kod) =>
      reject(new Error(`giriş noktası dinlemeden çıktı (kod ${kod}):\n${ciktilar}`)),
    );
  });
}

describe("GERÇEK giriş noktası: reddedilen açılış diske yazmaz", () => {
  /* İKİ KOŞUM AYNI DİZİNİ kullanır ve bu bilinçli bir kontroldür: tek değişen
     yapılandırmadır. (1) bozuk → dizin oluşmaz, (2) geçerli → aynı dizin oluşur. */
  const kiraciDizini = path.join(gecici, "kiraci-verisi");

  it("ÖN-KOŞUL: deney dizini henüz YOK", () => {
    expect(fs.existsSync(kiraciDizini)).toBe(false);
  });

  it(
    "BOZUK İLANDA süreç ÖLÜR, gerekçeyi SÖYLER ve dizin OLUŞMAZ",
    async () => {
      const r = await kosVeBekle({
        TEZGAH_DATA_DIR: kiraciDizini,
        TEZGAH_IS_KOLLARI: "tabelacii", // tek harf fazla
      });
      expect(r.cikisKodu, "bozuk yapılandırmayla süreç yaşamaya devam etti").not.toBe(0);
      /* Gerekçe ÇİVİLİ: "öldü" yetmez — hangi kapının konuştuğu ölçülür
         (kurulum kapıları paketinin dersi). */
      expect(r.ciktilar).toMatch(/kurulum ilanı geçersiz \(is-kollari\)/);
      expect(
        fs.existsSync(kiraciDizini),
        "reddedilen açılış kiracının veri ağacını yazdı",
      ).toBe(false);
    },
    RED_TAVANI_MS,
  );

  it(
    "GEÇERLİ İLANDA süreç DİNLER ve aynı dizin veri ağacıyla OLUŞUR",
    async () => {
      /* POZİTİF KONTROL — birincinin boş iddia olmadığının kanıtı: hiç ayağa
         kalkmayan bozuk bir giriş noktası da "dizin oluşmadı" derdi. */
      const c = await kosVeDinlemeyiBekle({ TEZGAH_DATA_DIR: kiraciDizini });
      try {
        expect(fs.existsSync(kiraciDizini)).toBe(true);
        const icerik = fs.readdirSync(kiraciDizini);
        expect(icerik).toContain("app.db");
        expect(icerik).toEqual(expect.arrayContaining(["assets", "exports", "fonts"]));

        /* GÖÇ GERÇEKTEN KOŞTU MU — dosyanın VARLIĞI bunu SÖYLEMEZ. Bu, kardeş
           dosyada (acilis-sirasi.test.ts) bir negatif kontrolle ölçülmüş
           derstir: `app.db` göçle değil `db.ts` yüklenirken doğar, yani BOŞ bir
           veritabanı da "app.db var" iddiasını karşılar. Giriş noktası
           ölçülürken aynı tuzağa düşmemek için şema AYRICA okunur — ve bu, ayrı
           bir süreçte yazılmış dosyanın dışarıdan okunmasıdır. */
        const { default: Database } = await import("better-sqlite3");
        const okuma = new Database(path.join(kiraciDizini, "app.db"), { readonly: true });
        try {
          const tablolar = (
            okuma.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{
              name: string;
            }>
          ).map((r) => r.name);
          expect(tablolar, "veritabanı BOŞ — göç koşmadı").toContain("clients");
        } finally {
          okuma.close();
        }
      } finally {
        c.kill("SIGKILL");
      }
    },
    ACILIS_TAVANI_MS,
  );
});

describe("NÖBETÇİ: BOOT YOLUNUN TAMAMI yan etkili modüle statik değmez", () => {
  /* ÖNCEKİ NÖBETÇİ YALNIZ İKİ DOSYAYI ÖLÇÜYORDU (`kurulum-dogrulama`, `acilis`)
     ve bu kayıtlı bir bulguydu (`K1C-SIRA-2`): boot yoluna sonradan eklenen bir
     dosya `db.js`'i STATİK çekerse, o modül doğrulamadan ÖNCE yüklenir,
     `ensureDirs()` + `new Database` yine çalışır ve yara kendi yolundan geri
     gelir. Tarama artık GERÇEK GİRİŞ NOKTASINDAN başlıyor: index.ts'in statik
     kapanışı = süreç ilk satırını çalıştırmadan önce YÜKLENEN her şey.

     ARAÇ: esbuild metafile'ın `kind` alanı (`import-statement` /
     `dynamic-import`). Bu ayrım olmadan graf dinamik dalları da içerir ve
     sorulan soruyu hiç ölçmez — önceki turda ölçüldü. */

  interface Graf {
    /** Süreç gövdeye girmeden ÖNCE yüklenen her şey. */
    statik: string[];
    /** Dinamik dallar dahil. */
    tumu: string[];
    /** BOOT YOLUNUN kendi dinamik kenarları: statik kapanıştaki dosyaların
        `dynamic-import` hedefleri. "Boot yolu onu dinamik yüklüyor mu"
        sorusunun tek doğru cevabı — graf geneli DEĞİL. */
    bootDinamikleri: string[];
  }

  async function graf(giris: string): Promise<Graf> {
    const esbuild = await import("esbuild");
    const sonuc = await esbuild.build({
      entryPoints: [path.join(SERVER_SRC, giris)],
      bundle: true,
      write: false,
      platform: "node",
      format: "esm",
      metafile: true,
      logLevel: "silent",
      packages: "external",
    });
    const girdiler = sonuc.metafile.inputs;
    const kok = Object.keys(girdiler).find((f) => f.endsWith(`/${giris}`))!;
    const gorulen = new Set([kok]);
    const kuyruk = [kok];
    while (kuyruk.length > 0) {
      const dosya = kuyruk.shift()!;
      for (const kenar of girdiler[dosya]?.imports ?? []) {
        if (kenar.kind !== "import-statement" || kenar.external) continue;
        if (!gorulen.has(kenar.path)) {
          gorulen.add(kenar.path);
          kuyruk.push(kenar.path);
        }
      }
    }
    const bootDinamikleri = [...gorulen].flatMap((f) =>
      (girdiler[f]?.imports ?? [])
        .filter((k) => k.kind === "dynamic-import" && !k.external)
        .map((k) => k.path),
    );
    return { statik: [...gorulen], tumu: Object.keys(girdiler), bootDinamikleri };
  }

  const dbVar = (dosyalar: readonly string[]): boolean =>
    dosyalar.some((f) => /(^|\/)db\.ts$/.test(f));

  it("ÖN-KOŞUL: giriş noktasının statik kapanışı GERÇEKTEN yürüyor", async () => {
    /* Kökte duran bir kapanışla "db yok" iddiası bedava yeşil kalırdı. */
    const g = await graf("index.ts");
    expect(g.statik.length).toBeGreaterThan(3);
    expect(g.statik.some((f) => f.endsWith("acilis.ts")), "index acilis'i çağırmıyor").toBe(true);
    expect(g.statik.some((f) => f.endsWith("kurulum-dogrulama.ts"))).toBe(true);
  });

  it("index.ts STATİK kapanışında db.ts YOKTUR — boot yolunun tamamı temiz", async () => {
    const g = await graf("index.ts");
    expect(
      dbVar(g.statik),
      "boot yolundaki bir dosya db'yi STATİK import ediyor: doğrulama " +
        "çağrılmadan ÖNCE ensureDirs() + veritabanı açılışı çalışır ve " +
        "reddedilen açılış kiracının diskine yine yazar",
    ).toBe(false);
  });

  it("BOOT YOLU db'ye DİNAMİK kenarla ulaşır — dal silinmedi", async () => {
    /* İLK YAZIMDA BU TEST `tumu`YA BAKIYORDU VE AYIRT ETMİYORDU: bir negatif
       kontrolde `migrate()` çağrısı açılış sırasından tamamen silindi ve test
       YEŞİL KALDI — çünkü `app.ts` db'yi zaten statik import ediyor ve tam graf
       onun üzerinden db'yi yine içeriyordu. Yani iddia "boot yolu onu dinamik
       yüklüyor"du, ölçülen "graf bir yerlerde db içeriyor"du. Aynı sınıf kardeş
       dosyada da çıkmıştı; ölçü artık BOOT YOLUNUN KENDİ dinamik kenarları. */
    const g = await graf("index.ts");
    expect(
      dbVar(g.bootDinamikleri),
      "boot yolu db'yi hiç yüklemiyor — göç koşmaz",
    ).toBe(true);
  });
});
