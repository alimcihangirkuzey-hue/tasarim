/* TEST KAPISININ KAPSAM NÖBETÇİSİ — journal 2026-07-27-web-test-altyapisi

   NE ÖLÇER: gates.ts'teki TEST_WORKSPACES İLANI ile diskteki GERÇEĞİN
   (`scripts.test` tanımlı workspace kümesi) aynı olduğunu. Tek bir eşitlik:
   ilan == gerçek.

   NEDEN VAR: gates.ts'in test kapısı kapsamını SABİT KODLU bir listeden alır
   (o kararın gerekçesi TEST_WORKSPACES'in üstünde yazılıdır: kapının kapsamı
   bir İLANDIR, dosya sistemi taraması değil). Sabit kodlu ilanın bedeli,
   ilanın gerçekten sapabilmesidir. Sapma iki yöne gider ve İKİSİ AYNI DEĞİL —
   ölçülmüş asimetri:

     · ÇIKARMA yönü (listede var, diskte `scripts.test` yok) FAIL-SAFE'tir:
       kapının koştuğu `npm test -w X` komutu --if-present TAŞIMAZ, npm exit≠0
       verir, kapı "kaldi" der. Gürültülü hata; kimse kaçırmaz.
     · EKLEME yönü (diskte `scripts.test` var, listede yok) FAIL-SILENT'tır:
       kapı o workspace'i HİÇ koşmaz. O workspace'in testleri kıpkırmızı olsa
       bile kapı "gecti" der ve passed/failed/total sayıları sessizce eksik
       kalır — üstelik bu eksik sayılar append-only denetim defterine yazılır
       ve geçmişe dönük düzeltilemez.

   Bu nöbetçi, ASIL OLARAK o sessiz yönü kapatmak için vardır. Fail-safe yönü
   de ölçülür — ama orada nöbetçinin katkısı hatayı ERKEN (kapı koşumundan
   önce, test aşamasında) ve GEREKÇELİ göstermektir.

   NEDEN KÖK package.json KÜMEYE GİRMEZ: kökün de bir `test` script'i vardır
   (`npm run test -ws --if-present`) ama o KENDİ testi değil, FAN-OUT'tur —
   alt workspace'lerin testlerini çağıran bir yönlendiricidir. Kümeye
   alsaydık, kapıdan `npm test -w .` benzeri bir çağrı beklenirdi ve kapı her
   workspace'i bir kez tek tek, bir kez de fan-out üzerinden koşardı: sayılar
   ikiye katlanırdı. Küme "kendi testi olan workspace"leri sayar; kök bir
   workspace değildir, workspaces glob'larının içinde de yer almaz. */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { TEST_WORKSPACES } from "./gates.js";
/* ROOT_DIR gates.ts'ten DEĞİL paths.ts'ten gelir — deponun tek kök tanımı
   orasıdır (bkz. gates.ts'in ROOT_DIR şerhi: iki ayrı türetim barrel'da
   TS2308 verirdi). Nöbetçi de ölçtüğü kodla AYNI kökü kullanmalı, yoksa
   "ilan ile gerçek" karşılaştırması iki farklı ağaç üzerinden yapılırdı. */
import { ROOT_DIR } from "./paths.js";

/** package.json'ın bizi ilgilendiren kadarı — geri kalanı okunmaz. */
type PackageJsonLike = { workspaces?: unknown; scripts?: Record<string, unknown> };

function readPackageJson(file: string): PackageJsonLike {
  return JSON.parse(readFileSync(file, "utf8")) as PackageJsonLike;
}

/**
 * Kökteki `workspaces` glob'larını diskten tarar ve `scripts.test` TANIMLI
 * olan workspace'lerin repo-göreli yollarını (posix ayraçlı) döndürür.
 *
 * Desteklenen glob biçimi YALNIZ `<dizin>/*`'tır — deponun bugün kullandığı
 * biçim budur (`apps/*`, `packages/*`). Başka bir biçim görürsek SESSİZCE
 * ATLAMAK yerine PATLARIZ: sessizce atlamak, nöbetçinin ölçtüğü kümeyi
 * habersizce küçültürdü ve nöbetçi yeşil kalırken kapsam boşluğu açılırdı —
 * yani nöbetçinin kapatmak için var olduğu hatanın ta kendisi.
 */
function diskteTestScriptiOlanWorkspaceler(): string[] {
  const root = readPackageJson(path.join(ROOT_DIR, "package.json"));
  const globs = root.workspaces;
  if (!Array.isArray(globs) || globs.length === 0) {
    throw new Error("kök package.json'da `workspaces` dizisi yok — nöbetçi ölçüm yapamaz");
  }

  const bulunan: string[] = [];
  for (const glob of globs) {
    if (typeof glob !== "string" || !glob.endsWith("/*")) {
      throw new Error(
        `desteklenmeyen workspaces glob'u: ${JSON.stringify(glob)} — ` +
          "nöbetçi yalnız `<dizin>/*` biçimini tarayabilir; bu nöbetçiyi de güncelle"
      );
    }
    const dizin = glob.slice(0, -2);
    const mutlak = path.join(ROOT_DIR, dizin);
    if (!existsSync(mutlak)) {
      throw new Error(`workspaces glob'u var olmayan dizini gösteriyor: ${glob}`);
    }
    for (const girdi of readdirSync(mutlak, { withFileTypes: true })) {
      if (!girdi.isDirectory()) continue;
      const pkg = path.join(mutlak, girdi.name, "package.json");
      /* package.json'ı olmayan dizin bir workspace değildir (npm de öyle
         görür); bu ATLAMA sessiz değil, tanım gereğidir. */
      if (!existsSync(pkg)) continue;
      const test = readPackageJson(pkg).scripts?.test;
      /* Boş dize bir script değildir: `npm test -w X` onu koşar, hiçbir şey
         ölçmez ve exit 0 verir — kapıya "yeşil" diye görünürdü. */
      if (typeof test === "string" && test.trim().length > 0) {
        bulunan.push(`${dizin}/${girdi.name}`);
      }
    }
  }
  return bulunan.sort();
}

/* Kırmızıya düşen kişiye asimetriyi ANLATIR. Nöbetçinin ürünü sayı değil,
   bu metindir: "listeye eklemeyi unuttum" hatası tek başına hiçbir yerde iz
   bırakmaz, o yüzden gerekçe hatanın yanına yazılır. */
function ogreticiMesaj(ilan: readonly string[], diskte: readonly string[]): string {
  const eksik = diskte.filter((w) => !ilan.includes(w)); // diskte var, ilanda yok
  const fazla = ilan.filter((w) => !diskte.includes(w)); // ilanda var, diskte yok
  return [
    "gates.ts:TEST_WORKSPACES ilanı ile diskteki `scripts.test` kümesi AYRIŞTI.",
    eksik.length > 0
      ? `İLANDA EKSİK (SESSİZ BOŞLUK — asıl tehlike): ${eksik.join(", ")}. ` +
        "Test script'i olan bir workspace listeye girmezse kapı onu HİÇ koşmaz: " +
        "testler yeşil görünür ama kapı onları hiç koşmamıştır, kapı 'gecti' der ve " +
        "passed/failed/total sayıları sessizce eksik hâlde denetim defterine yazılır. " +
        "Çözüm: bu workspace'i gates.ts'teki TEST_WORKSPACES listesine EKLE."
      : "",
    fazla.length > 0
      ? `İLANDA FAZLA (fail-safe): ${fazla.join(", ")}. ` +
        "Listede olup `scripts.test`i olmayan workspace'te `npm test -w X` " +
        "(--if-present YOK) exit≠0 verir ve kapı 'kaldi' der — bu yön gürültülüdür, " +
        "sessiz değildir. Çözüm: ya script'i geri koy ya da listeden çıkar."
      : "",
    "journal 2026-07-27-web-test-altyapisi",
  ]
    .filter((satir) => satir.length > 0)
    .join("\n");
}

describe("test kapısının kapsamı (nöbetçi)", () => {
  it("TEST_WORKSPACES ilanı == `scripts.test` tanımlı workspace kümesi", () => {
    const diskte = diskteTestScriptiOlanWorkspaceler();
    const ilan = [...TEST_WORKSPACES].sort();

    /* Küme karşılaştırması SIRALI DİZİ üzerinden yapılır: toEqual sırayı
       önemser, kapsam ise bir KÜMEdir — sıra kapının davranışını değiştirmez
       (gates.ts listeyi baştan sona dolaşır, hangi sırayla olduğu sayıları
       etkilemez). İki tarafı da sıralayarak sırayı ölçümün dışına çıkarırız;
       böylece nöbetçi yalnız GERÇEK ayrışmada kırmızıya döner. */
    expect(ilan, ogreticiMesaj(ilan, diskte)).toEqual(diskte);
  });

  it("ölçüm boş kümeye düşerse nöbetçi kendini yeşil sanmaz", () => {
    /* Nöbetçinin en sinsi arıza biçimi: tarama hiçbir şey bulamaz, iki taraf
       da boşalır ve eşitlik "geçer". O yüzden taramanın DOLU döndüğü ayrıca
       ölçülür — bu depoda en az bir workspace'in testi vardır (bu dosya
       koşuyorsa packages/journal zaten öyledir). */
    const diskte = diskteTestScriptiOlanWorkspaceler();
    expect(diskte.length).toBeGreaterThan(0);
    expect(diskte).toContain("packages/journal");
  });
});
