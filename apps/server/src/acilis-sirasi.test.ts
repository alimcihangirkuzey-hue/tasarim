/* AÇILIŞ SIRASI: DOĞRULAMA YAN ETKİDEN ÖNCE Mİ (K-1/C).

   ÖLÇÜLEN YARA (komutla, bu turda — tahmin değil): kurulum ilanları
   doğrulanıyor ve bozuk yapılandırmada sunucu ayağa kalkmıyordu, AMA reddedilen
   boot kiracının veri ağacını çoktan yazmış oluyordu:

     önce dizin var mı → HAYIR
     sonuç             → RED ("kurulum ilanı geçersiz (is-kollari)")
     sonra dizin var mı→ EVET · app.db · app.db-shm · app.db-wal · assets ·
                          exports · fonts

   Sebep sıradaydı: `index.ts` `./db.js`'i STATİK import ediyordu ve `db.ts`
   MODÜL YÜKLENİRKEN `ensureDirs()` çağırıp veritabanını açıyor. Statik
   import'lar gövdeden önce koşar, yani doğrulamayı gövdenin ilk satırına
   koymak bunu değiştirmezdi.

   BU DOSYA NİYE KENDİ BAŞINA: iddiası "db.ts HİÇ YÜKLENMEDİ"dir. Aynı dosyada
   önce `db.js` yükleyen bir test koşsaydı modül önbelleği yüzünden iddia
   ölçülemez hâle gelirdi. Bu yüzden burada `TEZGAH_DB_PATH` DE ayarlanmaz —
   diğer sunucu testlerinin aksine gerçek `DATA_DIR` yolu kullanılır, çünkü
   ölçülen şey tam olarak o yolun oluşup oluşmadığıdır.

   DENEY KURGUSU — AYNI DİZİN, YALNIZ YAPILANDIRMA DEĞİŞİYOR: `paths.ts` yükleme
   anında `DATA_DIR`'i dondurur, yani iki koşum aynı dizini kullanmak
   ZORUNDADIR. Bu bir kısıt değil, daha iyi bir kontrol: tek fark
   yapılandırmadır. (1) bozuk ilan → reddedilir ve dizin OLUŞMAZ, (2) geçerli
   ilan → aynı dizin OLUŞUR. İkincisi olmadan birincisi boş bir iddia olurdu:
   hiçbir şey yapmayan bozuk bir açılış da "dizin oluşmadı" derdi. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/* Deney dizini: SÜREÇTE İLK kez burada belirlenir ve `paths.ts` onu dondurur. */
const KIRACI_DIZINI = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "tezgah-acilis-")),
  "kiraci-verisi",
);
process.env.TEZGAH_DATA_DIR = KIRACI_DIZINI;

const { acilisSirasi } = await import("./acilis.js");
const { IS_KOLLARI_ENV } = await import("./is-kollari.js");

afterAll(() => {
  delete process.env[IS_KOLLARI_ENV];
  fs.rmSync(path.dirname(KIRACI_DIZINI), { recursive: true, force: true });
});

describe("reddedilen açılış kiracının diskine YAZMAZ", () => {
  it("ÖN-KOŞUL: deney dizini henüz YOK", () => {
    /* Bu satır olmadan aşağıdaki "oluşmadı" iddiası, dizin zaten silinmiş ya da
       hiç kurulmamış bir düzende de yeşil kalırdı. */
    expect(fs.existsSync(KIRACI_DIZINI)).toBe(false);
  });

  it("BOZUK İLANDA reddedilir VE dizin OLUŞMAZ", async () => {
    /* Yaranın kendisi. Eski sırada burada app.db + WAL + üç alt dizin
       oluşuyordu; ret geliyordu ama GEÇ geliyordu. */
    process.env[IS_KOLLARI_ENV] = "tabelacii"; // tek harf fazla
    await expect(acilisSirasi()).rejects.toThrow(/kurulum ilanı geçersiz \(is-kollari\)/);
    expect(
      fs.existsSync(KIRACI_DIZINI),
      "reddedilen açılış kiracının veri ağacını yazdı",
    ).toBe(false);
  });

  it("GEÇERLİ İLANDA açılış koşar VE aynı dizin OLUŞUR", async () => {
    /* POZİTİF KONTROL — birincinin boş iddia olmadığının kanıtı: hiçbir şey
       yapmayan bozuk bir açılış da "dizin oluşmadı" derdi. Tek fark
       yapılandırma; dizin aynı. */
    delete process.env[IS_KOLLARI_ENV];
    const app = await acilisSirasi();
    try {
      expect(fs.existsSync(KIRACI_DIZINI)).toBe(true);
      /* Veri ağacının GERÇEKTEN kurulduğu ölçülür — yalnız boş bir klasör
         değil; birinci testin engellediği şey tam olarak budur. */
      const icerik = fs.readdirSync(KIRACI_DIZINI);
      expect(icerik).toContain("app.db");
      expect(icerik).toEqual(expect.arrayContaining(["assets", "exports", "fonts"]));

      /* GÖÇ GERÇEKTEN KOŞTU MU — dosyanın VARLIĞI bunu SÖYLEMEZ ve bu bir
         negatif kontrolle ölçüldü: `migrate()` çağrısı açılış sırasından
         tamamen silindiğinde bu dosya 7/7 YEŞİL kalıyordu. Sebep, `app.db`nin
         göçle değil `db.ts` yüklenirken (`new Database(...)`) doğmasıdır —
         yani boş bir veritabanı da "app.db var" iddiasını karşılıyordu.
         Açılış sırasının ASIL işi ölçülmemişti. */
      const { db } = await import("./db.js");
      const tablolar = (
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{
          name: string;
        }>
      ).map((r) => r.name);
      expect(tablolar, "veritabanı BOŞ — göç koşmadı").toContain("clients");
    } finally {
      await app.close();
    }
  });
});

describe("NÖBETÇİ: doğrulama YÜKLENİRKEN yan etkili modül DEĞMEZ", () => {
  /* SIRA YETMEZ, GRAF DA GEREKİR: doğrulama önce koşsa bile, `kurulum-dogrulama`
     bir gün (doğrudan ya da dolaylı) `db.js`'i STATİK import ederse o modül
     doğrulama çağrısından ÖNCE yüklenir ve `ensureDirs()` yine çalışır — sıra
     doğru kalırken güvence sessizce kaybolur. Bu nöbetçi olmadan yukarıdaki iki
     test yeşil kalmaya devam ederdi (bugünkü grafla ölçülüyorlar), yani yarayı
     geri getiren değişikliği HİÇBİR ŞEY yakalamazdı.

     ÖLÇÜM ARACININ KENDİ KÖR NOKTASI — ÖNCE BU ÖLÇÜLDÜ, SONRA ARAÇ DÜZELTİLDİ:
     ilk yazımda "esbuild metafile grafında db.ts var mı" soruluyordu ve test
     KIRMIZI döndü — çünkü `bundle` grafı DİNAMİK import'ları da içerir. Yani
     araç, sorulan soruyu (hangi modül YÜKLEME ANINDA değiyor) hiç ölçmüyordu;
     ölçseydi bu dosyanın bütün iddiası yanlış temele oturacaktı. Doğru ayrım
     metafile'ın kendi verisinde duruyor: her kenarın bir `kind` alanı var
     (`import-statement` / `dynamic-import`). Nöbetçi artık yalnız STATİK
     kenarları izleyip KAPANIŞI çıkarıyor.
     Ölçülen: acilis.ts statik kapanışı 8 dosya (db.ts YOK) · tam graf 53 dosya
     (db.ts VAR) — yani modül gerçekten dinamik, kayıp değil.

     ARAÇ SEÇİMİ KAYITLI: metafile bu deponun kendi tekniğidir (C-P2 identity
     alt-yolu, journal `2026-07-23-c-p2-identity-subpath`) — orada elle
     koşulmuştu, burada TESTE bağlanıyor. */

  const KAYNAK = path.resolve(path.dirname(new URL(import.meta.url).pathname));

  interface Graf {
    /** Yükleme anında DEĞEN dosyalar: yalnız `import-statement` kenarlarının kapanışı. */
    statik: string[];
    /** Dinamik dallar dahil her şey. */
    tumu: string[];
    /** GİRİŞ DOSYASININ KENDİ dinamik kenarları — "bu dosya onu dinamik
        yüklüyor mu" sorusunun tek doğru cevabı (graf geneli değil). */
    dinamikKenarlar: string[];
  }

  async function graf(giris: string): Promise<Graf> {
    const esbuild = await import("esbuild");
    const sonuc = await esbuild.build({
      entryPoints: [path.join(KAYNAK, giris)],
      bundle: true,
      write: false,
      platform: "node",
      format: "esm",
      metafile: true,
      logLevel: "silent",
      /* Paket bağımlılıkları dışarıda: ölçülen şey BU DEPONUN modül grafiği. */
      packages: "external",
    });
    const girdiler = sonuc.metafile.inputs;
    const kok = Object.keys(girdiler).find((f) => f.endsWith(`/${giris}`))!;
    const gorulen = new Set([kok]);
    const kuyruk = [kok];
    while (kuyruk.length > 0) {
      const dosya = kuyruk.shift()!;
      for (const kenar of girdiler[dosya]?.imports ?? []) {
        /* SORUNUN TAMAMI BU SATIRDA: dinamik kenar YÜKLEME ANINDA geçilmez. */
        if (kenar.kind !== "import-statement" || kenar.external) continue;
        if (!gorulen.has(kenar.path)) {
          gorulen.add(kenar.path);
          kuyruk.push(kenar.path);
        }
      }
    }
    const dinamikKenarlar = (girdiler[kok]?.imports ?? [])
      .filter((k) => k.kind === "dynamic-import" && !k.external)
      .map((k) => k.path);
    return { statik: [...gorulen], tumu: Object.keys(girdiler), dinamikKenarlar };
  }

  const dbVar = (dosyalar: readonly string[]): boolean =>
    dosyalar.some((f) => /(^|\/)db\.ts$/.test(f));

  it("ÖN-KOŞUL: statik kapanış GERÇEKTEN yürüyor (tek dosyada kalmıyor)", async () => {
    /* Boş ya da kökte duran bir kapanışla "db yok" iddiası bedava yeşil kalırdı
       — hiçbir kenar izlenmese de db bulunmazdı. */
    const g = await graf("kurulum-dogrulama.ts");
    expect(g.statik.length).toBeGreaterThan(3);
    expect(g.statik.some((f) => f.endsWith("is-kollari.ts"))).toBe(true);
  });

  it("kurulum-dogrulama STATİK kapanışında db.ts YOKTUR", async () => {
    const g = await graf("kurulum-dogrulama.ts");
    expect(
      dbVar(g.statik),
      "doğrulama katmanı yan etkili modülü STATİK import ediyor: doğrulama " +
        "çağrılmadan ÖNCE ensureDirs() + veritabanı açılışı çalışır ve " +
        "reddedilen açılış yine kiracının diskine yazar (sıra doğru kalsa bile)",
    ).toBe(false);
  });

  it("acilis db'ye DOĞRUDAN DİNAMİK kenarla bağlı — statik kapanışında YOK", async () => {
    /* İKİ YÖNLÜ VE HER İKİSİ DE ACILIS'IN KENDİ KENARLARINDAN. İlk yazımda
       ikinci yön "db.ts TAM grafta var mı" diye soruluyordu ve bir negatif
       kontrol onu düşürdü: `db.js` çağrısı acilis'ten tamamen SİLİNDİĞİNDE
       test YEŞİL KALDI — çünkü `app.ts` db'yi zaten statik import ediyor ve
       tam graf onun üzerinden yine db'yi içeriyordu. Yani iddia "acilis onu
       dinamik yüklüyor"du ama ölçülen şey "graf bir yerlerde db içeriyor"du. */
    const g = await graf("acilis.ts");
    expect(dbVar(g.statik), "db statik import edilmiş — doğrulama geç kalır").toBe(false);
    expect(
      g.dinamikKenarlar.some((f) => /(^|\/)db\.ts$/.test(f)),
      "acilis db'yi hiç yüklemiyor — göç koşmaz",
    ).toBe(true);
  });

  it("KARŞITLIK: app.ts STATİK kapanışında db.ts VARDIR — tarama ayırt ediyor", async () => {
    /* Bu satır olmadan üstteki iddialar, hiçbir şey bulamayan bozuk bir desenle
       de yeşil kalırdı. `app.ts` db'yi gerçekten statik kullanır. */
    const g = await graf("app.ts");
    expect(dbVar(g.statik)).toBe(true);
  });
});
