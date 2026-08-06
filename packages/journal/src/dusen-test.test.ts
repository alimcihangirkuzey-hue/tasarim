/* DÜŞEN TESTİN ADI DEFTERE YAZILIR (R-FLAKY-TEST-01).

   ÖLÇÜLEN YARA (2026-08-06): `npm run pano` test kapısını bir kez kırmızı
   ölçtü — kırılım satırı yalnız `journal 501/502` diyordu. Aynı ağaçta 7
   koşumda tekrarlanmadı ve DÜŞEN TESTİN ADI ÇIKARILAMADI. Defterdeki kalıcı
   iz de sessizdi: kapı olayı `values: { failed: 1 }` yazıyor, HANGİSİ
   olduğunu yazmıyordu.

   OYSA AD ZATEN ELDEYDİ: kapı koşucusu vitest'i `--reporter=json` ile
   çalıştırıyor ve o raporu okuyup sayıları katlıyor. Ölçüldü (gerçek koşum,
   packages/journal/src/argv.test.ts): rapor `testResults[].assertionResults[]`
   taşıyor ve her girdide `status · title · fullName · ancestorTitles` var,
   dosya adı da `testResults[].name`te. Yani sayıyı ürettiğimiz kaynak, adı da
   taşıyordu; biz onu okumadan atıyorduk.

   NİYE ÖNEMLİ: append-only bir denetim defterinde "bir şey kırıldı ama ne
   olduğu kayıtlı değil", en pahalı boşluktur — çıktı silindiği an iz kaybolur
   ve kararsızlık kovalanamaz hâle gelir. */

import { describe, expect, it } from "vitest";
import {
  DUSEN_TEST_AZAMI,
  dusenTestGerekcesi,
  dusenTestler,
  summarizeVitestReports,
} from "./gates.js";

/** Gerçek vitest json raporunun ölçülmüş biçimi (alanlar birebir). */
function rapor(dosyalar: Array<{ ad: string; testler: Array<[string, string]> }>): unknown {
  return {
    numPassedTests: 0,
    numFailedTests: dosyalar.flatMap((d) => d.testler).filter(([s]) => s === "failed").length,
    numTotalTests: dosyalar.flatMap((d) => d.testler).length,
    testResults: dosyalar.map((d) => ({
      name: d.ad,
      status: d.testler.some(([s]) => s === "failed") ? "failed" : "passed",
      assertionResults: d.testler.map(([status, fullName]) => ({
        status,
        title: fullName.split(" > ").pop(),
        fullName,
        ancestorTitles: [],
      })),
    })),
  };
}

describe("ön-koşul — ölçülen rapor biçimi", () => {
  it("SAYIM YOLU aynı raporu okuyabiliyor (tek kaynak)", () => {
    /* Bu satır olmadan, ad çıkarma başka bir biçime bakıyor olabilir ve iki
       ölçüm yolu sessizce ayrışırdı. */
    const r = rapor([{ ad: "/a/x.test.ts", testler: [["failed", "A > B"], ["passed", "A > C"]] }]);
    expect(summarizeVitestReports([r]).failed).toBe(1);
  });
});

describe("düşen testlerin adı", () => {
  it("DÜŞEN test DOSYASI ve TAM ADIYLA çıkar", () => {
    const r = rapor([{ ad: "/repo/src/kilit.test.ts", testler: [["failed", "kilit > meşgulse patlar"]] }]);
    expect(dusenTestler([r])).toEqual([
      { dosya: "/repo/src/kilit.test.ts", ad: "kilit > meşgulse patlar" },
    ]);
  });

  it("GEÇEN testler listeye GİRMEZ", () => {
    const r = rapor([
      { ad: "/a.test.ts", testler: [["passed", "X"], ["failed", "Y"], ["passed", "Z"]] },
    ]);
    expect(dusenTestler([r]).map((d) => d.ad)).toEqual(["Y"]);
  });

  it("ÇOK RAPOR (workspace başına) katlanır", () => {
    const a = rapor([{ ad: "/w1/a.test.ts", testler: [["failed", "A"]] }]);
    const b = rapor([{ ad: "/w2/b.test.ts", testler: [["failed", "B"]] }]);
    expect(dusenTestler([a, b]).map((d) => d.ad)).toEqual(["A", "B"]);
  });

  it("HEPSİ GEÇTİYSE boş liste — gürültü yok", () => {
    expect(dusenTestler([rapor([{ ad: "/a.test.ts", testler: [["passed", "A"]] }])])).toEqual([]);
  });

  it("ALAN YOKSA atlanır, BOZUKSA PATLAR — sessiz boşluk yok", () => {
    /* Alanı hiç olmayan (eski/kısıtlı) rapor atlanabilir; DİZİ OLMAYAN bir
       alan ise bozukluktur ve "düşen yok" diyen sahte bir sessizlik üretirdi. */
    expect(dusenTestler([{ testResults: [{ name: "/a.test.ts" }] }])).toEqual([]);
    expect(() =>
      dusenTestler([{ testResults: [{ name: "/a.test.ts", assertionResults: "bozuk" }] }]),
    ).toThrow(/assertionResults dizi değil/);
    expect(() => dusenTestler([{ testResults: "bozuk" }])).toThrow(/testResults dizi değil/);
  });

  it("ADSIZ düşen test bile KAYITSIZ kalmaz", () => {
    const r = { testResults: [{ name: "/a.test.ts", assertionResults: [{ status: "failed" }] }] };
    expect(dusenTestler([r])).toEqual([{ dosya: "/a.test.ts", ad: "(adsız test)" }]);
  });
});

describe("gerekçe metni", () => {
  const uret = (n: number) =>
    rapor([{ ad: "/repo/src/a.test.ts", testler: Array.from({ length: n }, (_, i) => ["failed", `T${i + 1}`] as [string, string]) }]);

  it("DÜŞEN YOKSA null — başarıda gerekçe yazılmaz", () => {
    expect(dusenTestGerekcesi([])).toBeNull();
  });

  it("SAYIYI ve ADLARI birlikte söyler", () => {
    const g = dusenTestGerekcesi(dusenTestler([uret(2)]))!;
    expect(g).toContain("düşen test (2)");
    expect(g).toContain("a.test.ts > T1");
    expect(g).toContain("T2");
  });

  it("DOSYA YOLU kısaltılır — mutlak yol deftere girmez", () => {
    /* Mutlak yol (`/home/user/...`) klonda anlamsızdır; kanıt yolu deseniyle
       aynı gerekçe (gates.ts: "DEPO-GÖRELİ yol yazılır, mutlak değil"). */
    const g = dusenTestGerekcesi(dusenTestler([uret(1)]))!;
    expect(g).not.toContain("/repo/src/");
    expect(g).toContain("a.test.ts");
  });

  it("UZUN LİSTE kırpılır ve KIRPMA GÖRÜNÜR", () => {
    const g = dusenTestGerekcesi(dusenTestler([uret(DUSEN_TEST_AZAMI + 3)]))!;
    expect(g).toContain(`düşen test (${DUSEN_TEST_AZAMI + 3})`);
    expect(g).toContain("… +3");
    /* Sessiz kesme "hepsi bu" dedirtirdi. */
    expect(g.split(" · ").length).toBeLessThanOrEqual(DUSEN_TEST_AZAMI);
  });
});
