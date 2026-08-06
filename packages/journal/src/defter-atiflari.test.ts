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
   nöbetçi ÖNLEYİCİDİR ve öyle olduğu yazılıdır — "yara buldum" demiyorum. */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_DIR } from "./paths.js";
import { listPackageIds } from "./store.js";

/** Denetlenen defterler — kanıt bağı taşıyan dosyalar. */
const DEFTERLER = ["TODO.md", "docs/URUN_SAHIBI_KARARLARI.md"] as const;

/** Ters tırnak içinde geçen paket kimliği: `2026-08-06-paket-adi` */
const ATIF = /`(20\d\d-\d\d-\d\d-[a-z0-9-]+)`/g;

function atiflar(dosya: string): string[] {
  const tam = path.join(ROOT_DIR, dosya);
  const govde = fs.readFileSync(tam, "utf8");
  return [...new Set([...govde.matchAll(ATIF)].map((m) => m[1]!))];
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
