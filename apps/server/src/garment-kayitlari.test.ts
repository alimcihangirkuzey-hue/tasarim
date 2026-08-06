/* TEKSTİL EXPORT KAYITLARININ ŞEKLİ (K-1/B — operatörün tıkladığı şey doğru
   dosya olmalı) + ÖLÜ İLAN NÖBETÇİSİ.

   ÖLÇÜLEN İKİ YARA (ilan taramasıyla, bu turda):
   1. `ExportRecordDTO["kind"]` on iki değer ilan eder; yazan siteler tarandı,
      on biri yazılıyor, `broderie_fiche` HİÇBİR YERDE yazılmıyordu — bu depoda
      kayıtlı yasak: "ölü sözleşme". Üstelik `docs/export-kinds.md` onu
      üretiliyor gibi tarif ediyor ve arayüzde etiketi bile var.
   2. Fiş PDF'i GERÇEKTEN üretiliyordu ama kendi kaydı olmadığından tek satırın
      `filepath`ine düşüyordu (`files[files.length - 1]` ve broderie yolunda en
      son eklenen dosya FİŞTİR). Operatör "Nakış" çıktısına tıklayınca nakış
      TASARIMINI değil FİŞİ açıyordu. */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { garmentKayitlari } from "./garment-kayitlari.js";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const TASARIM = ["/x/kit_sirt.svg", "/x/kit_gogus.svg"];
const FIS = "/x/kit_broderie-fiche.pdf";

describe("tekstil export kayıtları", () => {
  it("BASKI (impression): tek kayıt, bugünkü davranış BİREBİR", () => {
    const k = garmentKayitlari("impression", { tasarim: TASARIM, fis: null });
    expect(k).toHaveLength(1);
    expect(k[0]!.kind).toBe("png");
    expect(k[0]!.dosya).toBe("/x/kit_gogus.svg"); // son tasarım dosyası
  });

  it("NAKIŞ: İKİ kayıt — tasarım ve fiş AYRI", () => {
    const k = garmentKayitlari("broderie", { tasarim: TASARIM, fis: FIS });
    expect(k.map((x) => x.kind)).toEqual(["broderie", "broderie_fiche"]);
  });

  it("NAKIŞ kaydının dosyası TASARIMDIR — fiş onu GASP ETMEZ", () => {
    /* Yaranın kendisi: eskiden `files[files.length-1]` fişti ve tek satırın
       filepath'i oydu; operatör tasarım yerine fişi açıyordu. */
    const k = garmentKayitlari("broderie", { tasarim: TASARIM, fis: FIS });
    const tasarimKaydi = k.find((x) => x.kind === "broderie")!;
    expect(tasarimKaydi.dosya).toBe("/x/kit_gogus.svg");
    expect(tasarimKaydi.dosya).not.toBe(FIS);
  });

  it("FİŞ kaydı fişin KENDİSİNİ gösterir", () => {
    const k = garmentKayitlari("broderie", { tasarim: TASARIM, fis: FIS });
    expect(k.find((x) => x.kind === "broderie_fiche")!.dosya).toBe(FIS);
  });

  it("FİŞ YOKSA (nakış ama fiş üretilmemiş) ikinci kayıt DA yok", () => {
    const k = garmentKayitlari("broderie", { tasarim: TASARIM, fis: null });
    expect(k.map((x) => x.kind)).toEqual(["broderie"]);
  });

  it("FİŞ kaydı KANAL NİTELİĞİ İDDİA ETMEZ (null) — tasarım kaydı eder", () => {
    /* `broderie_fiche` bir ÜRETİM KANALI değildir; üretim kanalı ilanı v1 onu
       açıkça kapsam dışı bıraktı ("broderie'nin eki"). Nitelik uydurmak,
       denetim izine olmayan bir iddia yazmak olurdu. */
    const k = garmentKayitlari("broderie", { tasarim: TASARIM, fis: FIS });
    expect(k.find((x) => x.kind === "broderie_fiche")!.nitelikler).toBeNull();
    expect(k.find((x) => x.kind === "broderie")!.nitelikler).not.toBeNull();
  });

  it("TASARIM DOSYASI YOKSA fırlatır — sessiz `undefined` filepath YOK", () => {
    /* Eski hâlde `files[files.length-1]` undefined olur ve dosyası olmayan bir
       export kaydı diske yazılırdı: olmayan çıktıyı var göstermek. */
    expect(() => garmentKayitlari("broderie", { tasarim: [], fis: FIS })).toThrow(
      /tasarım dosyası üretilmedi/,
    );
  });
});

describe("nöbetçi — ilan edilen her export türünün YAZANI var", () => {
  /* Tek seferlik düzeltme yetmez: on ikinci tür bir gün yine üreticisiz
     kalabilir. `kind` sözlüğü, modülü dışarıya verilebilir kılan sözleşmenin
     parçasıdır (K-1/C) — sessiz bir üye, modülü tüketen için yalan ilandır. */

  /** ÜRETİCİSİ OLMAYAN ama BİLEREK duran türler — her satır GEREKÇE taşır. */
  const URETICISIZ: Record<string, string> = {};

  function ilanEdilenTurler(): string[] {
    const semalar = readFileSync(
      path.resolve(SRC, "../../../packages/shared/src/schemas.ts"),
      "utf8",
    );
    const m = /kind: ("[a-z_]+"(?: \| "[a-z_]+")+);/.exec(semalar);
    if (!m) throw new Error("kind ilanı bulunamadı — nöbetçi deseni bayatlamış");
    return [...m[1]!.matchAll(/"([a-z_]+)"/g)].map((x) => x[1]!);
  }

  /* YAZAN KAYNAK = export_records'a INSERT eden dosyalar + kayıt ŞEKLİNE karar
     veren saf katman. "Herhangi bir yerde geçiyor mu" DEĞİL: bir yorumda ya da
     ilgisiz bir dosyada geçen ad, üretici değildir.

     NÖBETÇİNİN SINIRI (bilerek yazılı): bu tarama ERİŞİLEBİLİRLİK KANITLAMAZ.
     Yazan dosyada ulaşılamayan bir dalda duran ad da geçerli sayılır — ölçüldü:
     fiş kaydı `if (false)` ardına alındığında bu test YEŞİL kaldı (davranış
     testleri kırmızıya döndü, yara oradan yakalanır). Ölçtüğü şey şudur:
     sözlükte, hiçbir export yazıcısının ADINI BİLE ANMADIĞI bir üye var mı —
     `broderie_fiche`'in bu paketten önceki hâli tam olarak buydu (apps/server
     genelinde sıfır geçiş). */
  function yazanKaynak(): string {
    const parcalar: string[] = [];
    const gez = (d: string): void => {
      for (const g of readdirSync(d, { withFileTypes: true })) {
        const tam = path.join(d, g.name);
        if (g.isDirectory()) gez(tam);
        else if (/\.ts$/.test(g.name) && !g.name.includes(".test.")) {
          const metin = readFileSync(tam, "utf8");
          if (metin.includes("INSERT INTO export_records") || tam.endsWith("garment-kayitlari.ts"))
            parcalar.push(metin);
        }
      }
    };
    gez(SRC);
    return parcalar.join("\n");
  }

  it("NÖBETÇİNİN KENDİSİ çalışıyor (ön-koşul: ilan ve yazan kaynak okundu)", () => {
    const turler = ilanEdilenTurler();
    expect(turler.length).toBeGreaterThanOrEqual(12);
    expect(turler).toContain("broderie_fiche");
    expect(turler).toContain("print");
    /* Tarama gerçekten yazıcıları buldu mu — boş kaynakla test hiçbir şey
       ölçmeden yeşil kalırdı. */
    expect(yazanKaynak()).toContain("INSERT INTO export_records");
  });

  it("HER ilan edilen tür sunucuda BİR YERDE yazılıyor", () => {
    const kaynak = yazanKaynak();
    /* Değişken üzerinden yazılan türler (`kind = teknik === … ? "broderie" :
       "png"`) de bu taramaya düşer: aranan şey, türün adının üretim kodunda
       DİZE olarak geçmesidir. */
    const sessiz = ilanEdilenTurler().filter(
      (t) => !(t in URETICISIZ) && !new RegExp(`"${t}"`).test(kaynak),
    );
    expect(
      sessiz.sort(),
      `Üreticisiz ilan: ${sessiz.join(", ")} — ya bir uç onu ÜRETSİN ya da ` +
        "URETICISIZ tablosuna GEREKÇESİYLE yazılsın. Modülü tüketen için " +
        "sessiz bir sözlük üyesi YALAN İLANDIR (K-1/C).",
    ).toEqual([]);
  });
});
