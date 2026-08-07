/* BORÇ DEFTERİNİN ATIFLARI GERÇEK Mİ (borç defteri denetimi).

   NEDEN BU DOSYA VAR — ÖLÇÜLEN ZARAR: `TODO.md` bu turda repo gerçeğine
   karşı denetlendi ve ÜÇ KAPANMIŞ iş hâlâ AÇIK görünüyordu. Biri şuydu:

     "…ve `params.test.ts` YOKTUR — yani dejenerasyonu pinleyen test de,
      düzeltmeyi koruyacak nöbetçi de yok. Paket bu tanımı + testi birlikte
      getirmeli."

   Dosya VARDI (2026-07-27 paketinin kendi ifadesiyle "paketin ASIL ürünü").
   Yani defter, uygulayıcıyı ZATEN VAR OLAN bir işi yapmaya gönderdi. Zarar
   soyut değil: bir tur bunu keşfetmekle geçti. Deponun kendi kaydı da aynı
   şeyi söylüyordu — "defter, kapanmış borcu açık gösterdiği sürece
   sıralamayı yanlış besler".

   BU NÖBETÇİ NEYİ KAPATIR — VE NEYİ KAPATMAZ, AÇIKÇA: düzyazı iddiaları
   ("X yoktur", "sıfır test") makine okuyamaz; onları denetlemenin yolu
   ölçmektir ve o iş bu turda ELLE yapıldı. Makineye verilebilen tek parça
   KANIT BAĞLARIDIR: defterlerdeki `2026-…-paket-adi` atıfları. Var olmayan
   bir pakete atıf, okuyanı kanıt diye boşluğa gönderir.

   BUGÜN ÖLÇÜLDÜ: TODO.md 43 atıf · KARARLAR 3 atıf · kayıp SIFIR. Yani bu
   nöbetçi ÖNLEYİCİDİR ve öyle olduğu yazılıdır — "yara buldum" demiyorum.

   ── İKİNCİ KATMAN: DOSYA ATIFLARI (2026-08-07) ──────────────────────────
   Yukarıdaki "makineye verilebilen tek parça kanıt bağlarıdır" cümlesi FAZLA
   DARDI ve bu turda ölçümle düzeldi. Düzyazı iddiası ("X yoktur") gerçekten
   okunamaz; ama o iddianın İÇİNDEKİ DOSYA ADI okunabilir — ve defterin en
   pahalı sapması tam olarak bir dosya adıydı: "`params.test.ts` YOKTUR"
   derken dosya VARDI ve bir tur o keşifle geçti. Adın varlığı, iddianın
   doğruluğunu kanıtlamaz; ama adın YOKLUĞU sapmanın en ucuz ve en objektif
   işaretidir.

   ARAÇ ÖLÇÜMLE SEÇİLDİ (bu depoda kayıtlı yöntem — i18n kapsam nöbetçisi iki
   turda aracını böyle seçmişti): ters tırnak içindeki dosya-benzeri belirteç
   `git ls-files` çıktısına karşı çözülür. Üç tarif ölçüldü:
     · TAM YOL eşitliği   → 62 adayın 14'ü "kayıp" — hepsi yanlış alarm
       (defter `routes/clone.ts` yazar, gerçek yol `apps/server/src/routes/
       clone.ts`; kısaltılmış atıf meşrudur).
     · SONEK eşleşmesi     → 62 adayın 1'i kayıp. SEÇİLEN TARİF.
     · SEGMENT SIRASI      → daha gevşek; `shared/canvas.ts` gibi araya
       segment atlayan atıfları da yutar, yani gerçek sapmayı da yutardı.
   Tek kayıp `shared/canvas.ts`ti ve GERÇEK BİR SAPMA DEĞİLDİ: dosya
   `packages/shared/src/canvas.ts` olarak duruyor, atıf araya `src/` segmentini
   atlıyordu. İSTİSNA TABLOSU YAZMAK YERİNE ATIF DÜZELTİLDİ ve gerekçesi şu:
   bu nöbetçinin işi okuyucuyu gerçek bir yere göndermektir; kısaltılmış bir
   yol okuyucuya daha az yarar sağlar, yani düzeltme testi memnun etmek için
   değil OKUYUCU İÇİN yapıldı. Sonuç: sıfır istisna. */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ROOT_DIR } from "./paths.js";
import { listPackageIds } from "./store.js";

/** Denetlenen defterler — kanıt bağı taşıyan dosyalar. */
const DEFTERLER = ["TODO.md", "docs/URUN_SAHIBI_KARARLARI.md"] as const;

/** Ters tırnak içinde geçen paket kimliği: `2026-08-06-paket-adi` */
const ATIF = /`(20\d\d-\d\d-\d\d-[a-z0-9-]+)`/g;

/** Ters tırnak içinde geçen dosya-benzeri belirteç: `routes/clone.ts` */
const DOSYA_ATFI = /`([A-Za-z0-9_./@-]+\.(?:ts|tsx|md|json|mts|html|bat))`/g;

function govdeOku(dosya: string): string {
  return fs.readFileSync(path.join(ROOT_DIR, dosya), "utf8");
}

function atiflar(dosya: string): string[] {
  return [...new Set([...govdeOku(dosya).matchAll(ATIF)].map((m) => m[1]!))];
}

function dosyaAtiflari(dosya: string): string[] {
  return [...new Set([...govdeOku(dosya).matchAll(DOSYA_ATFI)].map((m) => m[1]!))];
}

/** Deponun İZLENEN dosyaları — çalışma ağacındaki artıklar sayılmaz. */
function izlenenDosyalar(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: ROOT_DIR, encoding: "utf8" })
    .split("\n")
    .filter((s) => s.length > 0);
}

/** Atıf, izlenen bir yolun SONEKİ ise çözülür (kısaltılmış atıf meşrudur). */
function cozulur(atif: string, izlenen: readonly string[]): boolean {
  return izlenen.some((f) => f === atif || f.endsWith("/" + atif));
}

describe("ön-koşul — denetim GERÇEKTEN bir şey okuyor", () => {
  it("DEFTERLER var ve atıf TAŞIYOR", () => {
    /* Bu satır olmadan aşağıdaki "kayıp yok" iddiası, hiçbir atıf bulamayan
       bozuk bir desenle de yeşil kalırdı — bu deponun defalarca ödediği kör
       nokta (kurulum ilanı tarayıcısı, i18n kapsam taraması). */
    for (const d of DEFTERLER) {
      expect(atiflar(d).length, `${d}: hiç paket atfı bulunamadı`).toBeGreaterThan(0);
    }
  });

  it("PAKET LİSTESİ boş DEĞİL", () => {
    expect(listPackageIds().length).toBeGreaterThan(0);
  });

  it("DOSYA ATFI deseni GERÇEKTEN eşleşiyor ve defterler dosya adlandırıyor", () => {
    /* İkinci katmanın ön-koşulu. "Kayıp yok" iddiası, hiçbir dosya adı
       bulamayan bozuk bir desenle de yeşil kalırdı. */
    for (const d of DEFTERLER) {
      expect(dosyaAtiflari(d).length, `${d}: hiç dosya atfı bulunamadı`).toBeGreaterThan(0);
    }
    expect(izlenenDosyalar().length, "git ls-files boş — çözümleme konusuz").toBeGreaterThan(100);
  });

  it("ÇÖZÜMLEME AYIRT EDİCİ: uydurma bir ad çözülMEZ, gerçek bir ad çözülür", () => {
    /* Kuralın kalbi. Sonek eşleşmesi fazla gevşek olsaydı (ör. yalnız uzantıya
       bakan bir kural) her ad çözülür ve nöbetçi hiçbir şey korumazdı. */
    const izlenen = izlenenDosyalar();
    expect(cozulur("routes/clone.ts", izlenen), "kısaltılmış gerçek atıf çözülmüyor").toBe(true);
    expect(cozulur("packages/journal/src/store.ts", izlenen), "tam yol çözülmüyor").toBe(true);
    expect(cozulur("hicboyle/bir-dosya-yok.ts", izlenen), "uydurma ad çözülüyor").toBe(false);
    /* SEGMENT ATLAYAN atıf da çözülMEZ — tarif bilerek dar (bkz. başlık). */
    expect(cozulur("shared/canvas.ts", izlenen), "segment atlayan atıf çözülüyor").toBe(false);
  });
});

describe("kanıt bağları — atıf edilen her paket GERÇEKTEN var", () => {
  it.each(DEFTERLER)("%s", (dosya) => {
    /* Var olmayan bir pakete atıf, okuyanı kanıt diye boşluğa gönderir:
       "journal X'e bak" der, X yoktur, ve iddia doğrulanamaz hâle gelir. */
    const kayitli = new Set(listPackageIds());
    const kayip = atiflar(dosya).filter((a) => !kayitli.has(a));
    expect(
      kayip,
      `${dosya}: bu paket(ler)e atıf var ama defterde YOK — kanıt bağı kopuk`,
    ).toEqual([]);
  });
});

describe("dosya bağları — atıf edilen her dosya GERÇEKTEN var", () => {
  it.each(DEFTERLER)("%s", (dosya) => {
    /* Defterin en pahalı sapması bir dosya adıydı ("`params.test.ts` YOKTUR"
       — dosya vardı, bir tur o keşifle geçti). Adın VARLIĞI iddianın
       doğruluğunu kanıtlamaz; ama adın YOKLUĞU sapmanın en ucuz ve en
       objektif işaretidir — ve artık makine bakıyor. */
    const izlenen = izlenenDosyalar();
    const kayip = dosyaAtiflari(dosya).filter((a) => !cozulur(a, izlenen));
    expect(
      kayip,
      `${dosya}: bu dosya(lar)a atıf var ama depoda YOK — okuyucu boşluğa gönderiliyor`,
    ).toEqual([]);
  });
});
