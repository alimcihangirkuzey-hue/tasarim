/* KURULUM İLANLARININ AÇILIŞTA DOĞRULANMASI (K-1/C).

   ÖLÇÜLEN YARA (komutla, bu turda): `is-kollari.ts` başlığı "tanınmayan iş
   kolu adı ... uygulama ayağa kalkmaz" diyordu ama doğrulama yalnız okuyucu
   fonksiyonun içindeydi ve okuyucu YALNIZ istek anında çağrılıyordu.
   `TEZGAH_IS_KOLLARI=tabelacii` ile ölçüm: boot BAŞARILI · /api/is-kollari her
   istekte 500 · /api/health 200 (bozuk kurulum sağlıklı görünüyor). Zincirin
   sonu tam da önlenmek isteneni üretiyordu: arayüz sorgusu düşünce süzgeç
   `undefined` alır ve DARALTMA HİÇ UYGULANMAZ — tek harflik hata kiracıya
   BÜTÜN iş kollarını açar.

   BU DOSYA İKİ ŞEYİ ÖLÇER:
   1. Bozuk ilanla buildApp FIRLATIR (güvence artık kodda).
   2. NÖBETÇİ: ortam değişkeniyle yapılandırılan HER ilan açılış denetimine
      dahildir. Üçüncü bir ilan doğduğu gün denetime eklenmezse, o ilan aynı
      sessiz-genişleme yarasını yeniden açardı. */

process.env.TEZGAH_DB_PATH = ":memory:";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const { buildApp } = await import("./app.js");
const { migrate } = await import("./db.js");
const { KURULUM_ILANLARI, kurulumuDogrula } = await import("./kurulum-dogrulama.js");
const { IS_KOLLARI_ENV } = await import("./is-kollari.js");
const { SEKTORLER } = await import("@tezgah/templates/identity");
/** Gerçek bir iş kolu adı — ilandan okunur, elle yazılmaz. */
const GECERLI_KOL = SEKTORLER[0]!;
const { KUNYE_ENV, KUNYE_AZAMI } = await import("./kurulum-kunyesi.js");
const { VERI_DIZINI_ENV } = await import("./veri-dizini.js");
const { ACILIS_TAKIMI_ENV } = await import("./acilis-takimi.js");

const SERVER_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

migrate();

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  delete process.env[KUNYE_ENV];
  delete process.env[VERI_DIZINI_ENV];
  delete process.env[ACILIS_TAKIMI_ENV];
});

describe("açılışta kurulum doğrulaması", () => {
  it("ÖN-KOŞUL: geçerli/boş yapılandırmada sunucu normal ayağa kalkar", async () => {
    /* Bu satır olmadan aşağıdaki "fırlatıyor" testleri, her koşulda fırlatan
       bozuk bir denetimle de yeşil kalırdı. */
    const app = await buildApp({ logger: false });
    await app.ready();
    await app.close();
  });

  it("GEÇERLİ iş kolu listesiyle de ayağa kalkar", async () => {
    process.env[IS_KOLLARI_ENV] = GECERLI_KOL;
    const app = await buildApp({ logger: false });
    await app.ready();
    await app.close();
  });

  it("YANLIŞ YAZILMIŞ iş kolu: sunucu AYAĞA KALKMAZ", async () => {
    process.env[IS_KOLLARI_ENV] = `${GECERLI_KOL}i`; // fazladan bir harf
    await expect(buildApp({ logger: false })).rejects.toThrow(/kurulum ilanı geçersiz \(is-kollari\)/);
  });

  it("SIĞMAYAN künye: sunucu AYAĞA KALKMAZ", async () => {
    process.env[KUNYE_ENV] = "x".repeat(KUNYE_AZAMI + 1);
    await expect(buildApp({ logger: false })).rejects.toThrow(
      /kurulum ilanı geçersiz \(kurulum-kunyesi\)/,
    );
  });

  it("GÖRELİ veri dizini: sunucu AYAĞA KALKMAZ", async () => {
    /* Ölçülen yaranın kapatılabilen yarısı: göreli yol, aynı kurulumun
       başlatıldığı dizine göre FARKLI veriyi açmasına yol açar. */
    process.env[VERI_DIZINI_ENV] = "veri";
    await expect(buildApp({ logger: false })).rejects.toThrow(
      /kurulum ilanı geçersiz \(veri-dizini\)/,
    );
  });

  it("İLAN EDİLMİŞ AMA BOŞ veri dizini: sunucu AYAĞA KALKMAZ", async () => {
    /* `?? varsayilan` boş dizeyi nullish saymaz: bugünkü yolda DATA_DIR=""
       olur ve veritabanı sürecin çalışma dizinine düşerdi. */
    process.env[VERI_DIZINI_ENV] = "";
    await expect(buildApp({ logger: false })).rejects.toThrow(
      /kurulum ilanı geçersiz \(veri-dizini\)/,
    );
  });

  it("GEÇERLİ MUTLAK veri diziniyle ayağa kalkar", async () => {
    process.env[VERI_DIZINI_ENV] = path.join(SERVER_SRC, "..", "..", "..", "data");
    const app = await buildApp({ logger: false });
    await app.ready();
    await app.close();
  });

  it("TANINMAYAN açılış takımı kalemi: sunucu AYAĞA KALKMAZ", async () => {
    /* GEREKÇE DE ÖLÇÜLÜR, yalnız "fırlattı" değil. Bu bir negatif kontrolün
       ürünü: tanınmayan-tür kapısı kapatıldığında bu test YEŞİL KALIYORDU —
       çünkü "tabelaa" bir sonraki kapıya (tasarlanamaz) düşüp yine
       fırlatıyordu. Yani iddia "ilan reddedildi"ydi, "BU sebeple reddedildi"
       değil; iki kapıdan hangisinin çalıştığı ölçülmüyordu. */
    process.env[ACILIS_TAKIMI_ENV] = "tabelaa";
    await expect(buildApp({ logger: false })).rejects.toThrow(
      /kurulum ilanı geçersiz \(acilis-takimi\).*tanınmayan ürün türü/,
    );
  });

  it("TASARLANAMAZ açılış takımı kalemi: sunucu AYAĞA KALKMAZ — AYRI gerekçeyle", async () => {
    /* Kardeş kapı ayrıca ölçülür: geçerli ama şablonsuz bir tür yazan
       kurulumcu, "yanlış mı yazdım" diye aramamalıdır. */
    process.env[ACILIS_TAKIMI_ENV] = "diger";
    await expect(buildApp({ logger: false })).rejects.toThrow(
      /kurulum ilanı geçersiz \(acilis-takimi\).*tasarlanamaz/,
    );
  });

  it("İŞ KOLUYLA ÇELİŞEN takım: sunucu AYAĞA KALKMAZ", async () => {
    /* Çelişki açılışta söylenmezse süzgeç kalemi SESSİZCE düşürür: kurulumcu
       iki kalem yazar, birini alır ve bunu söyleyen hiçbir şey olmaz. */
    process.env[IS_KOLLARI_ENV] = "tabelaci";
    process.env[ACILIS_TAKIMI_ENV] = "tabela,menu";
    await expect(buildApp({ logger: false })).rejects.toThrow(
      /kurulum ilanı geçersiz \(acilis-takimi\)/,
    );
  });

  it("TUTARLI takım + iş kolu ile AYAĞA KALKAR", async () => {
    /* Ön-koşulun kardeşi: her takım ilanında fırlatan bozuk bir denetim
       yukarıdaki iki testte de yeşil kalırdı. */
    process.env[IS_KOLLARI_ENV] = "tabelaci";
    process.env[ACILIS_TAKIMI_ENV] = "tabela";
    const app = await buildApp({ logger: false });
    await app.ready();
    await app.close();
  });

  it("HATA MESAJI hangi ilanın bozuk olduğunu SÖYLER", () => {
    /* Yığın izine bakmak zorunda kalan kurulumcu, mesajı okuyamayan kurulumcudur. */
    expect(() =>
      kurulumuDogrula([
        {
          ad: "sahte-ilan",
          oku: () => {
            throw new Error("örnek gerekçe");
          },
        },
      ]),
    ).toThrow(/sahte-ilan.*örnek gerekçe/);
  });

  it("DEĞER DONDURULMAZ — denetim yalnız doğrular", () => {
    /* Dondurmak, ortam değişkenini değiştiren kurulumu yeniden başlatmaya
       zorlardı; iki uç testi (is-kollari, kurulum-kunyesi) bunun tersini
       çiviliyor. Denetimden sonra okuyucular hâlâ taze değeri görmeli. */
    const [ilkIlan] = KURULUM_ILANLARI;
    process.env[IS_KOLLARI_ENV] = GECERLI_KOL;
    kurulumuDogrula();
    const once = JSON.stringify(ilkIlan!.oku());
    delete process.env[IS_KOLLARI_ENV];
    expect(JSON.stringify(ilkIlan!.oku())).not.toBe(once);
  });
});

describe("nöbetçi — ortamla yapılandırılan her ilan denetime dahil", () => {
  /* NÖBETÇİNİN KENDİ KÖR NOKTASI (bu turda ÖLÇÜLDÜ ve kapatıldı).

     Eski tarama iki varsayım taşıyordu ve ikisi de sessizce yanlıştı:
       (1) yalnız `apps/server/src` KÖKÜ okunuyordu (readdirSync, özyinelemesiz)
           → `routes/` altına konan bir ilan görünmezdi;
       (2) ilan olmanın işareti `export const *_ENV` YAZIM ÂDETİ sayılıyordu
           → âdete uymayan okuma görünmezdi.
     Ölçüm (komutla): eski tarama {is-kollari, kurulum-kunyesi} buluyordu;
     gerçekte ortam okuyan dosyalar {is-kollari, kurulum-kunyesi, db, paths}.
     Yani `TEZGAH_DATA_DIR` — kiracının BÜTÜN verisinin yerini belirleyen ilan —
     nöbetçinin hiç bakmadığı yerdeydi.

     Yeni tarama İŞARETİ değil OLAYI arar: `process.env.TEZGAH_*` okuyan her
     dosya, her derinlikte. Âdete uymayan bir ilan artık saklanamaz. */

  /** Denetime GİRMEYEN ilanlar — her biri gerekçesiyle, tek tek. */
  const ISTISNALAR: ReadonlyArray<{ env: string; neden: string }> = [
    {
      env: "TEZGAH_DB_PATH",
      neden:
        "kurulum ilanı DEĞİL, test koşum-takımının bağlantı enjeksiyon seam'i " +
        "(db.ts: ':memory:' / geçici dosya). Üretim kurulumu bunu ilan etmez; " +
        "veri KONUMU kararı TEZGAH_DATA_DIR'dedir ve o denetlenir.",
    },
  ];

  /* TARAYICININ KENDİ KÖR NOKTASI — ilk yazımda ölçüldü ve düzeltildi:
     yalnız `process.env.TEZGAH_X` (noktalı) aranıyordu; oysa bu repodaki
     İLANLARIN TAMAMI sabit üzerinden okur (`process.env[IS_KOLLARI_ENV]`).
     Sonuç: tarayıcı, denetlenen üç ilanın HİÇBİRİNİ görmüyordu ve yalnız
     db.ts'i buluyordu. Ölçüm aracının körlüğü, ölçtüğü kusurdan tehlikelidir:
     "kaçan yok" diyerek yeşil kalırdı. Artık İKİ biçim de aranır. */

  /** `process.env` okuyan her kaynak dosya → dosyada geçen TEZGAH_* adları. */
  function ortamOkumalari(): Map<string, string[]> {
    const bulunan = new Map<string, string[]>();
    const gez = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) gez(p);
        else if (/\.ts$/.test(e.name) && !e.name.includes(".test.")) {
          const kaynak = readFileSync(p, "utf8");
          if (!kaynak.includes("process.env")) continue;
          const adlar = [
            /* noktalı okuma: process.env.TEZGAH_X */
            ...[...kaynak.matchAll(/process\.env\.(TEZGAH_[A-Z_]+)/g)].map((m) => m[1]!),
            /* sabit üzerinden okuma: export const X_ENV = "TEZGAH_X" */
            ...[...kaynak.matchAll(/["'](TEZGAH_[A-Z_]+)["']/g)].map((m) => m[1]!),
          ];
          if (adlar.length) bulunan.set(path.relative(SERVER_SRC, p), [...new Set(adlar)]);
        }
      }
    };
    gez(SERVER_SRC);
    return bulunan;
  }

  it("NÖBETÇİNİN KENDİSİ çalışıyor (ön-koşul: bilinen ilanlar bulundu)", () => {
    /* Ön-koşul olmadan aşağıdaki "eksik yok" iddiası, hiçbir şey bulamayan
       bozuk bir tarayıcıyla da yeşil kalırdı. */
    const okunan = new Set([...ortamOkumalari().values()].flat());
    expect(okunan).toContain(IS_KOLLARI_ENV);
    expect(okunan).toContain(KUNYE_ENV);
    expect(okunan, "veri dizini ilanı taramada görünmüyor").toContain(VERI_DIZINI_ENV);
  });

  it("ÖZYİNELEMELİ tarıyor — alt dizindeki ilan da görünür", () => {
    /* Eski taramanın birinci kör noktası. `routes/` altında ortam okuyan bir
       dosya bugün yok; tarayıcının oraya BAKTIĞINI dosya sayısıyla çiviliyoruz
       (kök dosya sayısı, ağacın tamamından küçüktür). */
    const koktekiTs = readdirSync(SERVER_SRC, { withFileTypes: true }).filter(
      (e) => e.isFile() && /\.ts$/.test(e.name),
    ).length;
    let taranan = 0;
    const say = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) say(path.join(dir, e.name));
        else if (/\.ts$/.test(e.name)) taranan += 1;
      }
    };
    say(SERVER_SRC);
    expect(taranan).toBeGreaterThan(koktekiTs);
  });

  it("HER ortam ilanı ya DENETİMDE ya da GEREKÇELİ İSTİSNADA", () => {
    /* KAPSAM ARTIK İLANIN KENDİ BEYANI (2026-08-06 düzeltmesi). Burada eskiden
       ad → env eşlemesi ELLE yazılıydı; yani nöbetçinin kapsamı testin içinde
       İKİNCİ KEZ beyan ediliyordu. Dördüncü ilan (dogus-varsayilanlari)
       eklendiğinde bu satır tam da öngörüldüğü gibi kırmızıya döndü — ama
       doğru düzeltme switch'e bir dal eklemek DEĞİL, ikinci beyanı kaldırmaktı:
       eşleme unutulabilir, `env` alanı unutulamaz (tip zorunlu kılar). */
    const denetlenen = new Set(KURULUM_ILANLARI.flatMap((i) => i.env));
    const bagisik = new Set(ISTISNALAR.map((i) => i.env));
    const kacan = [...ortamOkumalari().entries()].flatMap(([dosya, adlar]) =>
      adlar.filter((a) => !denetlenen.has(a) && !bagisik.has(a)).map((a) => `${a} (${dosya})`),
    );
    expect(
      kacan,
      "Ortamla yapılandırılan bu ilan(lar) açılışta doğrulanmıyor: yanlış " +
        "yapılandırma boot'u geçer ve kurulum SAĞLIKLI görünürken yanlış " +
        "davranır (ölçülmüş iki biçimi: uç 500 + daraltmasız arayüz; ya da " +
        "sessizce boş veri dizini). KURULUM_ILANLARI'na ekleyin ya da " +
        "ISTISNALAR'a GEREKÇESİYLE yazın.",
    ).toEqual([]);
  });

  it("İSTİSNA TABLOSU ölü değil — yazılı her istisna gerçekten okunuyor", () => {
    /* Gerekçesi kalmamış bir istisna, gelecekteki gerçek bir ilanı sessizce
       bağışlar. Tablo, koda karşı canlı tutulur. */
    const okunan = new Set([...ortamOkumalari().values()].flat());
    for (const i of ISTISNALAR) {
      expect(okunan, `${i.env}: istisna yazılı ama kodda okunmuyor`).toContain(i.env);
      expect(i.neden.length, `${i.env}: gerekçe yazılmamış`).toBeGreaterThan(40);
    }
  });
});
