/* BASILACAK ALANLAR — TEK KARAR NOKTASI (tekstil çıktısı).

   ÖLÇÜLEN YARA: "hangi alanlar basılacak" kuralı İKİ YERDE birebir
   kopyalanmıştı — çizici (`garment/index.tsx`, sayfaları üretir) ve dışa
   aktarım (`routes/garment.ts`, alan başına 300 dpi dosya yazar). İkisi
   bugün aynıydı, o yüzden hiçbir kapı kırmızı değildi.

   AYRIŞMANIN BEDELİ KAĞITTA GÖRÜLÜR: dışa aktarım i'nci alan için çiziciden
   `?page=i` ister ve o sayfayı `GARMENT_AREAS[i]` ölçüsüyle basar. İki liste
   farklı SIRA ya da farklı UZUNLUK üretirse, bir alanın görseli BAŞKA bir
   alanın ölçüsüyle üretime gider. Testte görünmez, tişörtte görünür.

   BU DOSYA KURALI ÖLÇER, ÇİVİLER VE İKİNCİ BİR KOPYAYI ENGELLER. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GARMENT_AREAS, areasForKind, basilacakAlanlar } from "./schemas.js";
import type { GarmentAreaId } from "./schemas.js";

describe("ön-koşul — kayıt defteri ölçümü taşıyor", () => {
  it("her tür EN AZ bir alan ilan eder (boş-küme geri düşüşü tanımlı)", () => {
    /* Bu satır olmadan aşağıdaki geri düşüş iddiası, `valid[0]` undefined
       olan bir kayıt defteriyle sessizce çöker ya da yanlış yeşil verir. */
    for (const kind of ["tshirt", "apron_bavette", "apron_taille"] as const) {
      expect(areasForKind(kind).length, `${kind}: alan ilanı yok`).toBeGreaterThan(0);
    }
  });

  it("türler ayrık alanlar taşıyor — süzme GERÇEKTEN ayırt edici", () => {
    /* Bütün alanlar her türde geçerli olsaydı, "geçersizi ele" kuralı
       bugünkü veriyle ölçülemezdi. */
    const tshirt = areasForKind("tshirt");
    const onluk = areasForKind("apron_bavette");
    expect(tshirt.some((a) => !onluk.includes(a)), "türler arasında fark yok").toBe(true);
  });
});

describe("KURAL — süzme, sıra, geri düşüş", () => {
  it("türe UYMAYAN alan elenir, uyanlar KALIR", () => {
    expect(basilacakAlanlar("tshirt", ["chest_left", "front", "back_full"])).toEqual([
      "chest_left",
      "back_full",
    ]);
  });

  it("SIRA OPERATÖRÜN SIRASIDIR — kayıt defterinin değil", () => {
    /* Dışa aktarımın `?page=i` eşlemesi bu sıraya dayanır. Kural sırayı
       kendi kafasına göre değiştirirse, sayfa↔alan eşleşmesi kayar. */
    expect(basilacakAlanlar("tshirt", ["back_full", "chest_left"])).toEqual([
      "back_full",
      "chest_left",
    ]);
  });

  it("HİÇBİRİ GEÇERLİ DEĞİLSE türün İLK alanına düşer (bugünkü davranış)", () => {
    /* KAYITLI ÜRÜN KARARI DEĞİL, KAYITLI DAVRANIŞ: operatör seçmediği bir
       alan için dosya alır ve bu sessizdir. Doğrusunun ne olduğu ürün
       kararıdır; burada yalnız bugünkü hâl çivilidir. */
    const ilk = areasForKind("apron_bavette")[0]!;
    expect(basilacakAlanlar("apron_bavette", ["back_full", "sleeve"])).toEqual([ilk]);
    expect(basilacakAlanlar("apron_bavette", [])).toEqual([ilk]);
  });

  it("GİRDİYİ DEĞİŞTİRMEZ — çağıran dizisi bozulmaz", () => {
    const girdi: GarmentAreaId[] = ["chest_left", "front"];
    basilacakAlanlar("tshirt", girdi);
    expect(girdi, "kural çağıranın dizisini yerinde değiştirdi").toEqual([
      "chest_left",
      "front",
    ]);
  });

  it("SONUÇ HER ZAMAN o türde GEÇERLİ — hiçbir yol geçersiz alan sızdırmaz", () => {
    for (const kind of ["tshirt", "apron_bavette", "apron_taille"] as const) {
      const gecerli = areasForKind(kind);
      const tumAlanlar = Object.keys(GARMENT_AREAS) as GarmentAreaId[];
      for (const cikan of basilacakAlanlar(kind, tumAlanlar)) {
        expect(gecerli, `${kind}: geçersiz alan sızdı (${cikan})`).toContain(cikan);
      }
      expect(basilacakAlanlar(kind, []).every((a) => gecerli.includes(a))).toBe(true);
    }
  });
});

describe("NÖBETÇİ — ikinci bir kopya doğamaz", () => {
  const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  /* Kopyanın imzası: geçerli alan listesine karşı `filter(... includes ...)`
     ve ardından boş-küme geri düşüşü. İkisi bir arada kuralın yeniden
     yazıldığını gösterir. */
  const ELDE_SUZME = /\.areas\.filter\(/;
  const ELDE_GERI_DUSUS = /areaIds\.length === 0/;

  function kaynaklar(): Array<{ ad: string; govde: string }> {
    const bulunan: Array<{ ad: string; govde: string }> = [];
    const gez = (dizin: string): void => {
      for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
        if (g.name === "node_modules" || g.name === "dist" || g.name.startsWith(".")) continue;
        const tam = path.join(dizin, g.name);
        if (g.isDirectory()) gez(tam);
        else if (/\.tsx?$/.test(g.name) && !/\.test\.tsx?$/.test(g.name)) {
          bulunan.push({ ad: path.relative(KOK, tam), govde: fs.readFileSync(tam, "utf8") });
        }
      }
    };
    for (const w of ["apps/server/src", "apps/web/src", "packages/templates/src", "packages/shared/src"]) {
      gez(path.join(KOK, w));
    }
    return bulunan;
  }

  it("ön koşul: tarama gerçekten kaynak okuyor", () => {
    expect(kaynaklar().length, "tarama hiçbir dosya bulamadı").toBeGreaterThan(100);
  });

  it("DESENLER eski biçime GERÇEKTEN uyuyor — örnek metinle sınanır", () => {
    /* Pozitif kontrol bir ÖRNEK olmak zorunda: dosyaya bakan bir kontrol,
       kopya kaldırıldığı için hiçbir şeye uymaz ve sessizce yeşil kalırdı. */
    const ONCEKI = [
      "  const valid = areasForKind(params.garment_kind);",
      "  let areaIds = params.areas.filter((a) => valid.includes(a));",
      "  if (areaIds.length === 0) areaIds = [valid[0]];",
    ].join("\n");
    expect(ELDE_SUZME.test(ONCEKI), "süzme deseni eski biçime uymuyor").toBe(true);
    expect(ELDE_GERI_DUSUS.test(ONCEKI), "geri düşüş deseni eski biçime uymuyor").toBe(true);
  });

  it("HİÇBİR ÜRETİM DOSYASI kuralı yeniden yazmıyor", () => {
    const ihlal = kaynaklar()
      .filter((d) => ELDE_SUZME.test(d.govde) && ELDE_GERI_DUSUS.test(d.govde))
      .map((d) => d.ad);
    expect(
      ihlal,
      "alan çözümü ikinci kez yazılmış — `basilacakAlanlar` kullanın (yanlış sayfa↔alan eşleşmesi riski)"
    ).toEqual([]);
  });
});
