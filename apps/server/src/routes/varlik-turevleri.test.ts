/* VARLIK TÜREV HATTI — sharp'ın ÖLÇÜLEN davranışı (K-1/C güvenlik turu).

   NİYE VAR: `sharp` 0.33.5'te libvips CVE'leri taşıyor (YÜKSEK) ve düzeltme
   0.35.x — majör atlama. Sharp, operatörün yüklediği HER görselin geçtiği
   yerdir: metadata · rotate · resize · flatten · jpeg. Bir güvenlik
   yükseltmesi burada sessizce davranış değiştirirse, sonucu "varlıklar
   bozuldu" olur ve kimse yükseltmeyle ilişkilendirmez.

   BU DOSYA ÖNCE YAZILDI, SONRA YÜKSELTİLDİ: aşağıdaki sayılar 0.33.5
   (libvips 8.15.3) üzerinde GERÇEKTEN ÖLÇÜLDÜ. Yükseltmeden sonra kırmızıya
   dönen her satır, değişen şeyi ADIYLA söyler — "her şey yolunda görünüyor"
   demek zorunda kalmayız.

   SAYILAR NEYE BAĞLI: boyutlar (width/height) hattın SÖZLEŞMESİDİR ve
   değişmemelidir. Bayt boyutları kodlayıcıya bağlıdır ve libvips sürümüyle
   makul ölçüde oynayabilir; o yüzden bayt için EŞİTLİK değil, VARLIK ve
   makul aralık ölçülür — yanlış bir kesinlik, testi ilk yükseltmede
   gürültüye çevirirdi. */

import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processUpload as turevler } from "./assets.js";

/* ÜRETİM KODU ÖLÇÜLÜR, KOPYASI DEĞİL: hat `assets.ts`ten import edilir.
   İlk yazımda buraya hattın bir kopyası konmuştu — o hâlde assets.ts değişse
   test hiçbir şey söylemezdi; ölçtüğü şey kendi kopyası olurdu. */
const png = (w: number, h: number, alpha = false) =>
  sharp({
    create: {
      width: w,
      height: h,
      channels: alpha ? 4 : 3,
      background: alpha ? { r: 200, g: 30, b: 40, alpha: 0.5 } : { r: 11, g: 79, b: 138 },
    },
  })
    .png()
    .toBuffer();

const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="300" height="150" fill="#0B4F8A"/></svg>',
);

describe("ön-koşul — sharp gerçekten çalışıyor", () => {
  it("libvips YÜKLÜ ve sürümü OKUNABİLİR", async () => {
    /* Bu satır olmadan aşağıdaki iddialar, sharp hiç çalışmadığında da
       (her çağrı atarken) anlamsız biçimde kırmızı/yeşil olabilirdi. */
    const v = (sharp as unknown as { versions?: Record<string, string> }).versions;
    expect(typeof v?.vips).toBe("string");
  });

  it("SENTETİK görsel gerçekten üretiliyor", async () => {
    const b = await png(10, 10);
    expect(b.length).toBeGreaterThan(0);
    expect((await sharp(b).metadata()).width).toBe(10);
  });
});

describe("türev hattı — ölçülen boyut sözleşmesi", () => {
  it("BÜYÜK görsel 4000'e SIĞDIRILIR, oran korunur", async () => {
    /* 5000×2500 → 4000×2000: `fit: inside` oranı korur. Bu, baskı yolunun
       dayandığı sözleşmedir; bozulursa master dosyalar yanlış ölçüde olur. */
    const t = await turevler(await png(5000, 2500), false);
    expect({ width: t.width, height: t.height }).toEqual({ width: 4000, height: 2000 });
  });

  it("KÜÇÜK görsel BÜYÜTÜLMEZ (withoutEnlargement)", async () => {
    const t = await turevler(await png(120, 90), false);
    expect({ width: t.width, height: t.height }).toEqual({ width: 120, height: 90 });
  });

  it("SVG density 150 ile RASTERLENİR — 300×150 → 625×313", async () => {
    /* SVG'de master ham dosyadır; ölçü metadata'dan gelir ve density'ye
       bağlıdır (150/72 ≈ 2.08). Bu sayı libvips'in SVG işlemesine bağlıdır
       ve bir sürüm atlamasında kayabilir — o yüzden çivili. */
    const t = await turevler(SVG, true);
    expect({ width: t.width, height: t.height }).toEqual({ width: 625, height: 313 });
    expect(t.master).toBe(SVG);
  });
});

describe("türev hattı — küçük resim (thumb)", () => {
  it("400'e SIĞAR ve JPEG'dir", async () => {
    const t = await turevler(await png(5000, 2500), false);
    const m = await sharp(t.thumb).metadata();
    expect(m.format).toBe("jpeg");
    expect(m.width).toBeLessThanOrEqual(400);
    expect(m.height).toBeLessThanOrEqual(400);
    expect(m.width).toBe(400);
  });

  it("ALFA DÜZLEŞTİRİLİR — saydamlık beyaza oturur", async () => {
    /* JPEG alfa taşıyamaz; flatten olmasaydı saydam alanlar SİYAH çıkardı. */
    const t = await turevler(await png(120, 90, true), false);
    const m = await sharp(t.thumb).metadata();
    expect(m.format).toBe("jpeg");
    expect(m.hasAlpha ?? false).toBe(false);
    const orta = await sharp(t.thumb).extract({ left: 60, top: 45, width: 1, height: 1 }).raw().toBuffer();
    /* Yarı saydam kırmızı beyaza oturunca AÇILIR — siyaha değil. */
    expect(orta[0]!).toBeGreaterThan(orta[2]!);
    expect(orta[1]!).toBeGreaterThan(60);
  });

  it("BAYT ÜRETİLİR ve makul aralıkta — kesin eşitlik ÇİVİLENMEZ", async () => {
    /* Bayt boyutu kodlayıcıya bağlıdır ve sürümle makul ölçüde oynar; kesin
       eşitlik, testi ilk yükseltmede gürültüye çevirirdi. Ölçülen taban
       (0.33.5): 756 bayt. */
    const t = await turevler(await png(5000, 2500), false);
    expect(t.thumb.length).toBeGreaterThan(200);
    expect(t.thumb.length).toBeLessThan(20_000);
  });
});
