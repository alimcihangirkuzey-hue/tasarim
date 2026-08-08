/* KURULUM İLANLARININ AÇILIŞTA DOĞRULANMASI (K-1/C).

   ÖLÇÜLEN YARA (komutla, bu turda): `is-kollari.ts` başlığı "tanınmayan iş
   kolu adı ... uygulama ayağa kalkmaz" diyordu ama doğrulama yalnız okuyucu
   fonksiyonun içindeydi ve okuyucu YALNIZ istek anında çağrılıyordu.
   `TEZGAH_IS_KOLLARI=tabelacii` ile ölçüm: boot BAŞARILI · /api/is-kollari her
   istekte 500 · /api/health 200 (bozuk kurulum sağlıklı görünüyor). Zincirin
   sonu tam da önlenmek isteneni üretiyordu: arayüz sorgusu düşünce süzgeç
   `undefined` alır ve DARALTMA HİÇ UYGULANMAZ — tek harflik hata kiracıya
   BÜTÜN iş kollarını açar.

   BU DOSYA ÜÇ ŞEYİ ÖLÇER:
   1. Geçerli yapılandırmayla sunucu AYAĞA KALKAR (red testlerinin ön-koşulu).
   2. HER RED YOLU tek tek koşar ve GEREKÇESİ çivilenir (aşağıdaki KAPILAR
      tablosu) — artı bir NÖBETÇİ, tabloda karşılığı olmayan bir red yolunu
      yakalar.
   3. NÖBETÇİ: ortam değişkeniyle yapılandırılan HER ilan açılış denetimine
      dahildir. Üçüncü bir ilan doğduğu gün denetime eklenmezse, o ilan aynı
      sessiz-genişleme yarasını yeniden açardı.

   (2) NİYE BU TURDA DOĞDU (2026-08-07, önceki paketin AÇIK bulgusu K1A-TAKIM-3):
   red testleri tek tek elle yazılıydı ve hepsi yalnız `kurulum ilanı geçersiz
   (X)` eşliyordu — yani "ilan REDDEDİLDİ"yi ölçüyor, "BU SEBEPLE reddedildi"yi
   ölçmüyorlardı. Bir negatif kontrol bunun bedelini gösterdi: `acilis-takimi`nin
   "tanınmayan tür" kapısı KAPATILDIĞINDA test YEŞİL KALDI, çünkü aynı değer bir
   sonraki kapıya (tasarlanamaz) düşüp yine fırlatıyordu. İki kapı üst üste
   durduğunda üstteki sessizce kaybolabilirdi.
   ÖLÇÜLDÜ (bu turda, komutla): beş ilanın 13 red yolu var ve altısının açılış
   testi HİÇ YOKTU; `dogus-varsayilanlari` ilanının açılış kapsamı SIFIRDI —
   listede olduğu için nöbetçi onu "denetimde" sayıyordu, ama boot'un gerçekten
   durduğu hiç koşulmamıştı. Altısı da tek tek koşuldu ve ALTISI DA reddediyor:
   mekanizma doğruydu, ÖLÇÜLMEMİŞTİ. */

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
const { PARA_BIRIMI_ENV, CIKTI_DILI_ENV } = await import("./dogus-varsayilanlari.js");

const SERVER_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

migrate();

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  delete process.env[KUNYE_ENV];
  delete process.env[VERI_DIZINI_ENV];
  delete process.env[ACILIS_TAKIMI_ENV];
  delete process.env[PARA_BIRIMI_ENV];
  delete process.env[CIKTI_DILI_ENV];
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

  it("GEÇERLİ MUTLAK veri diziniyle ayağa kalkar", async () => {
    process.env[VERI_DIZINI_ENV] = path.join(SERVER_SRC, "..", "..", "..", "data");
    const app = await buildApp({ logger: false });
    await app.ready();
    await app.close();
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

describe("HER RED YOLU tek tek: hangi kapının çalıştığı ÇİVİLİ", () => {
  /* NİYE GEREKÇE DE ÖLÇÜLÜYOR (dosya başlığındaki (2)): yalnız "reddedildi"
     eşleyen bir test, üst üste duran iki kapıdan üstteki kapatıldığında YEŞİL
     KALIR — alttaki aynı değeri yine reddeder ve fark görünmez. Bu bir negatif
     kontrolle ÖLÇÜLDÜ, varsayılmadı.

     TABLO NİYE TEK KAYNAK: her red yolu daha önce ayrı bir `it` bloğuydu ve
     ilanlar büyüdükçe o bloklar unutuluyordu (ölçüldü: 13 red yolunun 6'sının
     testi HİÇ YOKTU, bir ilanın açılış kapsamı SIFIRDI). Tablo hem koşulur hem
     de aşağıdaki nöbetçi tarafından KAYNAĞA KARŞI sayılır. */

  interface Kapi {
    /** KURULUM_ILANLARI'ndaki ad — hata mesajının parantezi bununla eşleşmeli. */
    ilan: string;
    ortam: Readonly<Record<string, string>>;
    /** Bu kapının KENDİ gerekçesi; başka bir kapı bunu üretemez. */
    gerekce: RegExp;
  }

  const KAPILAR: readonly Kapi[] = [
    /* is-kollari — 2 kapı */
    { ilan: "is-kollari", ortam: { [IS_KOLLARI_ENV]: `${GECERLI_KOL}i` },
      gerekce: /tanınmayan iş kolu/ },
    { ilan: "is-kollari", ortam: { [IS_KOLLARI_ENV]: ",," },
      gerekce: /hiçbir iş kolu içermiyor/ },

    /* kurulum-kunyesi — 2 kapı */
    { ilan: "kurulum-kunyesi", ortam: { [KUNYE_ENV]: "üst satır\nalt satır" },
      gerekce: /TEK SATIR olmalıdır/ },
    { ilan: "kurulum-kunyesi", ortam: { [KUNYE_ENV]: "x".repeat(KUNYE_AZAMI + 1) },
      gerekce: /tavan/ },

    /* veri-dizini — 3 kapı */
    { ilan: "veri-dizini", ortam: { [VERI_DIZINI_ENV]: "" },
      gerekce: /ilan edilmiş ama boş/ },
    { ilan: "veri-dizini", ortam: { [VERI_DIZINI_ENV]: "/tmp/veri\nyol" },
      gerekce: /satır sonu taşıyor/ },
    { ilan: "veri-dizini", ortam: { [VERI_DIZINI_ENV]: "veri" },
      gerekce: /mutlak yol olmalı/ },

    /* dogus-varsayilanlari — 2 kapı, İKİ değişkende de koşuluyor. Bu ilanın
       açılış kapsamı bu turdan önce SIFIRDI: listede olduğu için nöbetçi onu
       "denetimde" sayıyordu ama boot'un gerçekten durduğu hiç ölçülmemişti. */
    { ilan: "dogus-varsayilanlari", ortam: { [PARA_BIRIMI_ENV]: "" },
      gerekce: /ilan edilmiş ama boş/ },
    { ilan: "dogus-varsayilanlari", ortam: { [PARA_BIRIMI_ENV]: "XXX" },
      gerekce: /tanınmayan değer/ },
    { ilan: "dogus-varsayilanlari", ortam: { [CIKTI_DILI_ENV]: "" },
      gerekce: /ilan edilmiş ama boş/ },
    { ilan: "dogus-varsayilanlari", ortam: { [CIKTI_DILI_ENV]: "zz" },
      gerekce: /tanınmayan değer/ },

    /* acilis-takimi — 4 kapı (çelişki kapısı İKİ ilanı birlikte okur) */
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: ",," },
      gerekce: /hiçbir kalem içermiyor/ },
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: "tabelaa" },
      gerekce: /tanınmayan ürün türü/ },
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: "diger" },
      gerekce: /tasarlanamaz/ },
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: "menu", [IS_KOLLARI_ENV]: "tabelaci" },
      gerekce: /iş kollarında değil/ },
    /* BİÇİM SÖZDİZİMİNİN ÜÇ KAPISI (2026-08-07, açılış takımı biçimi paketi).
       Bu satırlar NÖBETÇİNİN ÜRÜNÜDÜR: üç kapı kaynağa eklenip tabloya
       yazılmayınca "kaynakta 7 red yolu, tabloda 4 ayrık gerekçe" diye
       kırmızıya döndü — yani kapsam beyanı değil ÖLÇÜM. */
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: "menu:a3:x" },
      gerekce: /iki noktadan fazlasını/ },
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: "menu:" },
      gerekce: /biçim taşımıyor/ },
    { ilan: "acilis-takimi", ortam: { [ACILIS_TAKIMI_ENV]: "tabela:a3" },
      gerekce: /BİÇİM TAŞIMAZ/ },
  ];

  it("ÖN-KOŞUL: tablo BOŞ DEĞİL ve her satır GERÇEK bir ilana bağlı", () => {
    /* Bu satır olmadan aşağıdaki nöbetçi, hiçbir şey koşmayan boş bir tabloyla
       da yeşil kalabilirdi (0 === 0 tuzağı aşağıda ayrıca kapatılıyor). */
    expect(KAPILAR.length).toBeGreaterThan(10);
    const adlar = new Set(KURULUM_ILANLARI.map((i) => i.ad));
    for (const k of KAPILAR) expect(adlar, `${k.ilan}: KURULUM_ILANLARI'nda yok`).toContain(k.ilan);
  });

  /* Koşulan her kapının GERÇEK mesajı — aşağıdaki ayırt-etme testi bunu okur.
     Mesajları elle yazmak, tam da ölçülmek istenen şeyi (kapının gerçekte ne
     dediğini) ikinci kez beyan etmek olurdu. */
  const MESAJLAR = new Map<Kapi, string>();

  it.each(KAPILAR.map((k) => [`${k.ilan} · ${JSON.stringify(k.ortam)}`, k] as const))(
    "%s → sunucu AYAĞA KALKMAZ, gerekçe ÇİVİLİ",
    async (_ad, k) => {
      for (const [env, deger] of Object.entries(k.ortam)) process.env[env] = deger;
      const hata = await buildApp({ logger: false }).then(
        (app) => app.close().then(() => null),
        (e: Error) => e,
      );
      expect(hata, "bozuk yapılandırmayla sunucu AYAĞA KALKTI").not.toBeNull();
      expect(hata!.message).toMatch(new RegExp(`kurulum ilanı geçersiz \\(${k.ilan}\\)`));
      expect(hata!.message, "başka bir kapı çalışmış olabilir").toMatch(k.gerekce);
      MESAJLAR.set(k, hata!.message);
    },
  );

  it("GEREKÇELER AYIRT EDİCİ — bir desen KOMŞU kapının mesajını eşleyemez", () => {
    /* BU TESTİN NEDEN VAR OLDUĞU ÖLÇÜLDÜ, VARSAYILMADI. Bir negatif kontrolde
       tek bir satırın deseni `/./` yapıldı — yani her mesajı eşleyen tembel bir
       desen — ve 27/27 YEŞİL KALDI. Sebep: aşağıdaki nöbetçi desenlerin AYRIK
       olmasını sayar (metin olarak farklı mı), AYIRT EDİCİ olmasını değil.
       Tembel bir desenle, paketin kapatmak için yazıldığı yara aynen geri
       gelirdi: üstteki kapı sessizce kaldırılır, alttaki mesajı yine desene
       uyar ve test farkı göremez.

       ÖN-KOŞUL: her satırın mesajı toplanmış olmalı — eksik toplama, kontrolü
       sessizce daraltırdı. */
    expect(MESAJLAR.size, "kapı mesajları toplanmadı").toBe(KAPILAR.length);

    const cakisan: string[] = [];
    for (const k of KAPILAR) {
      const komsular = KAPILAR.filter(
        (o) => o.ilan === k.ilan && o.gerekce.source !== k.gerekce.source,
      );
      for (const o of komsular) {
        if (k.gerekce.test(MESAJLAR.get(o)!)) {
          cakisan.push(`${k.ilan}: ${k.gerekce} deseni, komşu kapının mesajını da eşliyor (${o.gerekce})`);
        }
      }
    }
    expect(
      cakisan,
      "Desen kendi kapısını AYIRT ETMİYOR: kapı kaldırılsa bile komşusunun " +
        "mesajı deseni geçer ve test yeşil kalır — paketin kapattığı yaranın " +
        "ta kendisi. Deseni o kapıya ÖZGÜ bir ifadeye daraltın.",
    ).toEqual([]);
  });

  it("NÖBETÇİ: kaynaktaki HER red yolunun tabloda KENDİ gerekçesi var", () => {
    /* Sayım İLANIN KENDİ BEYANINDAN (`kaynak`) gider — ad→dosya eşlemesini
       burada kurmak, `env` alanının kaldırdığı hatayı geri getirirdi.

       KURAL: bir ilanın kaynağındaki `throw` sayısı, o ilan için tabloda
       yazılı AYRIK gerekçe sayısına EŞİT olmalıdır. Aynı gerekçenin ikinci
       değişkende tekrar koşulması serbesttir (dogus-varsayilanlari); yeni bir
       KAPI eklenip tabloya yazılmazsa sayı tutmaz ve burası kırmızıya döner. */
    const eksik: string[] = [];
    for (const ilan of KURULUM_ILANLARI) {
      const kaynak = readFileSync(path.join(SERVER_SRC, ilan.kaynak), "utf8");
      const redYolu = [...kaynak.matchAll(/throw new Error\(/g)].length;
      const gerekceler = new Set(
        KAPILAR.filter((k) => k.ilan === ilan.ad).map((k) => k.gerekce.source),
      );
      /* ÖN-KOŞUL SATIR İÇİNDE: red yolu olmayan bir ilan, sayımın bozuk
         olduğunun işaretidir — sessizce "0 === 0" ile geçemez. */
      if (redYolu === 0) eksik.push(`${ilan.ad}: kaynakta hiç red yolu bulunamadı (${ilan.kaynak})`);
      else if (gerekceler.size !== redYolu) {
        eksik.push(`${ilan.ad}: kaynakta ${redYolu} red yolu, tabloda ${gerekceler.size} ayrık gerekçe`);
      }
    }
    expect(
      eksik,
      "Bir red yolunun açılış testi yok ya da gerekçesi başka bir kapıyla aynı: " +
        "üst üste duran kapılardan üstteki kapatılsa bile alttaki aynı sonucu " +
        "üretir ve test farkı GÖREMEZ (ölçülmüş yara). KAPILAR tablosuna " +
        "kendi gerekçesiyle bir satır ekleyin.",
    ).toEqual([]);
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
