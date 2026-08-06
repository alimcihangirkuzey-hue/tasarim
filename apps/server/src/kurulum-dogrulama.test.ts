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

const SERVER_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

migrate();

afterEach(() => {
  delete process.env[IS_KOLLARI_ENV];
  delete process.env[KUNYE_ENV];
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
  /** `*_ENV` sabiti dışa veren modüller = ortamla yapılandırılan ilanlar. */
  function ilanModulleri(): string[] {
    return readdirSync(SERVER_SRC)
      .filter((f) => /\.ts$/.test(f) && !f.includes(".test."))
      .filter((f) => /^export const [A-Z_]*_ENV\b/m.test(readFileSync(path.join(SERVER_SRC, f), "utf8")))
      .map((f) => f.replace(/\.ts$/, ""));
  }

  it("NÖBETÇİNİN KENDİSİ çalışıyor (ön-koşul: bilinen ilanlar bulundu)", () => {
    const moduller = ilanModulleri();
    expect(moduller).toContain("is-kollari");
    expect(moduller).toContain("kurulum-kunyesi");
  });

  it("HER ilan modülü açılış denetiminde YAZILI", () => {
    const kapsanan = new Set(KURULUM_ILANLARI.map((i) => i.ad));
    const eksik = ilanModulleri().filter((m) => !kapsanan.has(m));
    expect(
      eksik,
      "Ortamla yapılandırılan bu ilan(lar) açılışta doğrulanmıyor: yanlış " +
        "yapılandırma boot'u geçer, uç 500 döner ve arayüz sessizce " +
        "DARALTMASIZ çalışır (sessiz genişleme). KURULUM_ILANLARI'na ekleyin.",
    ).toEqual([]);
  });
});
