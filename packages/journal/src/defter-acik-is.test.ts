/* BORÇ DEFTERİNİN "AÇIK İŞ" YÜZEYİ DÜRÜST MÜ (borç defteri denetimi, 2. dilim).

   ÖNCEKİ TURUN AÇIK BULGUSU: defter bir uygulayıcıyı ZATEN VAR OLAN bir
   testi ("`params.test.ts` YOKTUR") yazmaya gönderdi ve turun yarısı bunu
   keşfetmekle geçti. O turda üç kapanmış iş elle düzeltildi; kalan soru
   şuydu: bu sınıf mekanik olarak yakalanabilir mi?

   YAKALANABİLEN İKİ SINIF — VE İKİSİ DE ÖLÇÜLDÜ:

   1. VAR OLAN DOSYANIN "YOK" DİYE İLAN EDİLMESİ. Açık bir madde "X YOKTUR"
      derken X depoda duruyorsa, o madde okuyucuyu var olan işi yapmaya
      gönderir. Bu, geçen turun zararının TAM MEKANİZMASIDIR.
   2. TARİHSEL KAYDIN "AÇIK İŞ" GİBİ SAYILMASI. Kendini "Eski kayıt
      (referans)" diye tanıtan satırlar onay kutusu taşıyordu; ölçüldü:
      88 açık maddenin 4'ü buydu. Açık iş sayısı, sıralamayı besleyen ilk
      sayıdır — içinde tarihçe varsa yanlış besler.

   YAKALANAMAYAN — AÇIKÇA: düzyazının kendisi. "Bu iş yapıldı mı" sorusunu
   makine soramaz; ölçmek gerekir ve o iş elle yapılır. Bu dosya yalnız iki
   mekanik sınıfı kapatır ve daha fazlasını iddia ETMEZ.

   İSTİSNA TABLOSU GEREKLİ ÇÜNKÜ TARAMA KABA: bir maddede "YOK" kelimesi
   geçmesi, o maddedeki HER dosya adının yokluk iddiası olduğu anlamına
   gelmez (ölçüldü: "emitter `analyze.ts`'i yalnız prototipli dalda üretir"
   cümlesinde dosya vardır ve iddia da onun yokluğu değildir). Gerekçesiz
   istisna eklenemez. */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_DIR } from "./paths.js";

const DEFTER = "TODO.md";

function satirlar(): string[] {
  return fs.readFileSync(path.join(ROOT_DIR, DEFTER), "utf8").split("\n");
}

/** Yapılacak iş satırı — onay kutusu AÇIK olanlar. */
const acikMaddeler = (): Array<{ no: number; metin: string }> =>
  satirlar()
    .map((metin, i) => ({ no: i + 1, metin }))
    .filter((x) => x.metin.startsWith("- [ ]"));

/* Kendini tarihçe/referans diye tanıtan satırlar. Bu işaretler DEFTERİN
   KENDİ dilidir — uydurulmadı, mevcut satırlardan okundu. */
const TARIHSEL = /\bEski kayıt\b|\bEski madde\b|\(referans\)|\btarihsel\b|\(tarihsel/i;

/* Yokluk iddiası taşıyan cümle işaretleri. */
const YOKLUK = /\bYOK\b|YOKTUR|\bsıfır\b/;

/** Ters tırnak içindeki kaynak dosya adı. */
const DOSYA = /`([A-Za-z0-9_\-/.]+\.(?:ts|tsx|mts|json))`/g;

/* İSTİSNALAR — kaba taramanın yanlış okuduğu, GEREKÇESİ YAZILI durumlar. */
const ISTISNALAR: Readonly<Record<string, string>> = {
  "analyze.ts":
    "madde 'emitter analyze.ts'i yalnız prototipli dalda üretir' diyor — " +
    "dosyanın yokluğunu değil, ÜRETİLDİĞİ DALI tarif ediyor",
  "Template.tsx":
    "madde 'Template.tsx'lerde `canvas` geçen sıfır satır' diyor — yokluk " +
    "iddiası DOSYA için değil, dosyanın İÇİNDEKİ bir dize için. İddia bu " +
    "turda ayrıca ÖLÇÜLDÜ ve hâlâ doğru: templates/src'te (test dışı) " +
    "`canvas` geçen sıfır üretim dosyası var",
  "render-channel.test.ts":
    "madde `decoupe`/`png` değerlerinin contract enum'unda olmadığını " +
    "söylüyor; dosya adı yalnızca kanıt bağı olarak geçiyor, yokluk " +
    "iddiasının öznesi DEĞİL",
  "EditorPage.test.tsx":
    "madde (sahte zaman altında yokluk iddiası sayımı) dosyayı TEK VAKANIN " +
    "YERİ olarak gösteriyor — 'burada var' diyor, 'yok' değil. Maddedeki " +
    "yokluk sözcüklerinin öznesi başka: yazılmayan ORTAK YARDIMCI ve " +
    "sağlamlığı tutan NÖBETÇİ. `render-channel.test.ts` emsalinin aynısı: " +
    "dosya adı kanıt bağıdır, yokluk iddiasının öznesi değil",
};

describe("ön-koşul — denetim GERÇEKTEN okuyor", () => {
  it("DEFTER var ve açık madde TAŞIYOR", () => {
    /* Bu satır olmadan aşağıdaki iddialar, hiçbir madde bulamayan bozuk bir
       desenle de yeşil kalırdı — bu deponun defalarca ödediği kör nokta. */
    expect(acikMaddeler().length).toBeGreaterThan(10);
  });

  it("YOKLUK iddiası taşıyan madde GERÇEKTEN var — tarama konusuz değil", () => {
    const iddiali = acikMaddeler().filter((m) => YOKLUK.test(m.metin));
    expect(iddiali.length, "hiç yokluk iddiası bulunamadı — desen bozuk olabilir").toBeGreaterThan(0);
  });
});

describe("VAR OLAN dosya 'YOK' diye ilan edilemez", () => {
  it("açık maddelerin yokluk iddiaları depoyla ÇELİŞMİYOR", () => {
    /* GEÇEN TURUN ZARARININ MEKANİZMASI: "params.test.ts YOKTUR" diyen bir
       madde, dosya dururken uygulayıcıyı o testi yazmaya gönderdi. */
    const celisen: string[] = [];
    for (const m of acikMaddeler()) {
      if (!YOKLUK.test(m.metin)) continue;
      for (const eslesme of m.metin.matchAll(DOSYA)) {
        const dosya = eslesme[1]!;
        const ad = path.basename(dosya);
        if (ad in ISTISNALAR) continue;
        if (aramaVar(ad)) celisen.push(`satır ${m.no}: \`${dosya}\` VAR ama madde yokluk iddia ediyor`);
      }
    }
    expect(
      celisen,
      "defter, var olan bir şeyi yok sayıyor — okuyucuyu yapılmış işe gönderir",
    ).toEqual([]);
  });
});

/** Depoda bu ada sahip bir dosya var mı (git izlenen ağaçta). */
function aramaVar(ad: string): boolean {
  const kokler = ["apps", "packages", "scripts", "docs"];
  const bak = (dizin: string): boolean => {
    let girdiler: fs.Dirent[];
    try {
      girdiler = fs.readdirSync(dizin, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const g of girdiler) {
      if (g.name === "node_modules" || g.name === "dist") continue;
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) {
        if (bak(tam)) return true;
      } else if (g.name === ad) return true;
    }
    return false;
  };
  return kokler.some((k) => bak(path.join(ROOT_DIR, k)));
}

describe("TARİHSEL kayıt 'açık iş' sayılmaz", () => {
  it("hiçbir açık madde kendini 'eski kayıt / referans / tarihsel' diye tanıtmıyor", () => {
    /* Açık iş sayısı, sıralamayı besleyen İLK sayıdır. İçinde tarihçe varsa
       yanlış besler: ölçüldü — 88 açık maddenin 4'ü tarihsel kayıttı.
       Tarihçe silinmez, yalnız onay kutusundan çıkarılır (🕮 işareti). */
    const kutulu = acikMaddeler()
      .filter((m) => TARIHSEL.test(m.metin))
      .map((m) => `satır ${m.no}: ${m.metin.slice(0, 70)}`);
    expect(kutulu, "tarihsel kayıt onay kutusu taşıyor — açık iş gibi sayılır").toEqual([]);
  });
});

describe("istisna tablosu — gerekçesiz istisna olamaz", () => {
  it("HER İSTİSNA bir gerekçe taşır", () => {
    for (const [ad, gerekce] of Object.entries(ISTISNALAR)) {
      expect(gerekce.length, `${ad}: gerekçe çok kısa`).toBeGreaterThan(30);
    }
  });
});
