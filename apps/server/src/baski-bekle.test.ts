/* BASKI YAKALAMA BEKLEYİCİSİ testleri (K-1/B).

   ÖLÇÜLEN YARA: yakalama siteleri yalnız `__PRINT_READY__` bekliyordu; sayfa
   hazır olamadığında bayrak HİÇ atanmıyor ve 30-45 SANİYE beklenip zaman
   aşımına düşülüyordu — çağırana giden `{error:"internal"}`, ne gerekçe ne
   hız. Repo bu zinciri exports.ts:122'de zaten yazmış ama yalnız TEK sebebini
   (bozuk params) kapatmıştı.

   SAHTE SAYFA KULLANILIR, gerçek Chromium değil: ölçülen şey tarayıcı değil
   SÖZLEŞMEDİR — hangi sinyalde ne yapıldığı. Gerçek tarayıcı bu iddiaya bir
   şey katmaz, yalnız testi yavaşlatır ve kırılgan yapardı. */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { IFADE, baskiyaHazirBekle, type BeklenebilirSayfa } from "./baski-bekle.js";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
/** Sarmalayıcının KENDİSİ — ham çağrının yaşaması GEREKEN tek yer. */
const SARMALAYICI = "baski-bekle.ts";

/** Verilen değeri döndüren sahte sayfa; çağrı argümanlarını kaydeder. */
function sahteSayfa(deger: unknown): BeklenebilirSayfa & { cagri: ReturnType<typeof vi.fn> } {
  const cagri = vi.fn(async () => ({ jsonValue: async () => deger }));
  return { waitForFunction: cagri, cagri };
}

describe("baskıya hazır bekleyici", () => {
  it("HAZIR sinyalinde sessizce döner", async () => {
    await expect(baskiyaHazirBekle(sahteSayfa({ hata: null }), 30_000)).resolves.toBeUndefined();
  });

  it("HATA sinyalinde GEREKÇESİYLE fırlar", async () => {
    await expect(baskiyaHazirBekle(sahteSayfa({ hata: "belge bulunamadı (404)" }), 30_000)).rejects
      .toThrow(/sayfa hazır olamadı: belge bulunamadı \(404\)/);
  });

  it("ZAMAN AŞIMI çağıranın verdiği süredir — paket süreyi DEĞİŞTİRMEZ", async () => {
    /* Bu paket "daha kısa bekle" demiyor; "beklemeden düşebil" diyor. Süreyi
       sessizce kısaltmak, yavaş ama sağlıklı bir sayfayı düşürürdü. */
    const s = sahteSayfa({ hata: null });
    await baskiyaHazirBekle(s, 45_000);
    expect(s.cagri).toHaveBeenCalledWith(expect.any(String), { timeout: 45_000 });
  });

  it("İFADE İKİ BAYRAĞI DA okur (ön-koşul: sözleşme sayfa tarafıyla aynı ad)", async () => {
    const s = sahteSayfa({ hata: null });
    await baskiyaHazirBekle(s, 30_000);
    const ifade = s.cagri.mock.calls[0]![0] as string;
    expect(ifade).toContain("__PRINT_ERROR__");
    expect(ifade).toContain("__PRINT_READY__");
  });

  it("BOZUK SÖZLEŞME sessizce BAŞARI sayılmaz", async () => {
    /* Bekleyici çözüldüyse ifade bir nesne döndürmüştür. Döndürmediyse
       sözleşme bozuktur ve bunu yutmak, kapatmaya çalıştığımız sessiz hâli
       geri getirirdi (boş PDF üretip "oldu" demek). */
    await expect(baskiyaHazirBekle(sahteSayfa(null), 30_000)).rejects.toThrow(/sözleşmesi bozuk/);
    await expect(baskiyaHazirBekle(sahteSayfa(true), 30_000)).rejects.toThrow(/sözleşmesi bozuk/);
  });

  it("ZAMAN AŞIMI HATASI olduğu gibi yukarı çıkar (mevcut davranış korunur)", async () => {
    const dusen: BeklenebilirSayfa = {
      waitForFunction: async () => {
        throw new Error("Waiting failed: 30000ms exceeded");
      },
    };
    await expect(baskiyaHazirBekle(dusen, 30_000)).rejects.toThrow(/30000ms exceeded/);
  });
});

describe("nöbetçi — atölye yakalama siteleri bekleyiciyi KULLANIR", () => {
  /* Tek seferlik değişim yetmez: yeni bir yakalama sitesi eski deseni
     kopyalarsa o site sessizce 45 sn'ye geri döner ve kimse fark etmez. */

  /** İSTİSNA İLANI — her satır GEREKÇE taşır, boş bırakılamaz. */
  const HAM_BEKLEYEN: Record<string, string> = {
    "routes/render.ts":
      "Makine kanalı (Render Contract v1) — ADR-005 gereği contract işlerinde " +
      "DOKUNULMAZ. Sayfa sinyali eklemek davranışını değiştirmez (yalnız yeni " +
      "bir window alanı doğar) ama bekleyiciyi değiştirmek imzalı yolun " +
      "başarısızlık biçimini değiştirirdi; o karar iki tarafta eşzamanlı goal ister.",
  };

  function kaynaklar(): Array<[string, string]> {
    const cikti: Array<[string, string]> = [];
    const gez = (d: string): void => {
      for (const g of readdirSync(d, { withFileTypes: true })) {
        const tam = path.join(d, g.name);
        if (g.isDirectory()) gez(tam);
        else if (/\.ts$/.test(g.name) && !g.name.includes(".test."))
          cikti.push([path.relative(SRC, tam).split(path.sep).join("/"), readFileSync(tam, "utf8")]);
      }
    };
    gez(SRC);
    return cikti;
  }

  it("NÖBETÇİNİN KENDİSİ çalışıyor (ön-koşul: siteler bulundu)", () => {
    const kullanan = kaynaklar().filter(([, s]) => s.includes("baskiyaHazirBekle("));
    /* Bekleyicinin kendisi + 5 rota dosyası */
    expect(kullanan.length).toBeGreaterThanOrEqual(6);
    expect(kullanan.map(([f]) => f)).toContain("routes/mockup.ts");
  });

  it("İSTİSNA DIŞINDA hiçbir dosya HAM waitForFunction çağırmaz", () => {
    const hamlar = kaynaklar()
      .filter(([, s]) => /page\.waitForFunction\(/.test(s))
      .map(([f]) => f)
      .filter((f) => f !== SARMALAYICI && !(f in HAM_BEKLEYEN));
    expect(
      hamlar,
      "Bu siteler __PRINT_READY__'yi ham bekliyor: sayfa düşerse 30-45 sn " +
        "beklenir ve gerekçe kaybolur. baskiyaHazirBekle() kullanın ya da " +
        "HAM_BEKLEYEN tablosuna GEREKÇESİYLE yazın.",
    ).toEqual([]);
  });

  it("İSTİSNA TABLOSU BAYATLAMAZ — yazılı her dosya hâlâ var ve hâlâ ham", () => {
    const harita = new Map(kaynaklar());
    for (const [dosya, gerekce] of Object.entries(HAM_BEKLEYEN)) {
      expect(gerekce.trim().length, `${dosya}: gerekçe boş`).toBeGreaterThan(40);
      expect(harita.has(dosya), `${dosya}: ilanda var ama dosya YOK`).toBe(true);
      expect(
        /page\.waitForFunction\(/.test(harita.get(dosya)!),
        `${dosya}: artık ham beklemiyor — satırı HAM_BEKLEYEN'den kaldır`,
      ).toBe(true);
    }
  });
});

describe("bekleme İFADESİ — sahte sayfayla değil, ÇALIŞTIRILARAK ölçülür", () => {
  /* Sahte sayfa `{hata:…}` döndürür ve ifadenin mantığını ATLAR: ifade bozulsa
     bile yukarıdaki testler yeşil kalırdı. Burada ifade gerçekten koşturulur. */
  const calistir = (w: Record<string, unknown>): unknown =>
    new Function("window", `return ${IFADE};`)(w);

  it("İKİ BAYRAK DA yokken BEKLEMEYE DEVAM (false)", () => {
    expect(calistir({})).toBe(false);
    expect(calistir({ __PRINT_READY__: false })).toBe(false);
  });

  it("HAZIR bayrağı hata YOKken başarı verir", () => {
    expect(calistir({ __PRINT_READY__: true })).toEqual({ hata: null });
  });

  it("HATA bayrağı gerekçeyi verir", () => {
    expect(calistir({ __PRINT_ERROR__: "belge yok" })).toEqual({ hata: "belge yok" });
  });

  it("HATA, HAZIR'dan ÖNCE gelir — yarışta sessiz başarı kazanmaz", () => {
    /* Sayfa önce hata bildirip sonra (kısmi veriyle) hazır derse, PDF eksik
       çıkardı. Sıralama bu yüzden ifade içinde sabitlenir. */
    expect(calistir({ __PRINT_READY__: true, __PRINT_ERROR__: "künye gelmedi" })).toEqual({
      hata: "künye gelmedi",
    });
  });

  it("HATA yalnız DİZE ise sayılır (boş/yanlış tip beklemeyi bozmaz)", () => {
    expect(calistir({ __PRINT_ERROR__: undefined })).toBe(false);
    expect(calistir({ __PRINT_ERROR__: 0 })).toBe(false);
  });
});
