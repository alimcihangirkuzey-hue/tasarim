/* TOPLU CMYK KÜTÜPHANESİ testleri (K-1/B, üçüncü kardeş).

   NEDEN BU DOSYA VAR: `topluAktar` ve `topluBaslat` kütüphaneydi ve
   ölçülüyordu; toplu CMYK ProjectsPanel'in içinde ~20 satırlık bir
   `mutationFn` gövdesiydi ve TEK BİR TESTİ YOKTU (bu turda arandı:
   `topluCmyk`/`exportCmyk` geçen sıfır test dosyası). Aynı başlığın üç
   turundan ikisi ölçülüyor, üçüncüsü ölçülmüyordu.

   ÖLÇÜLEN YARA: `catch { dusen += 1 }` — kardeşlerinde kapatılan sınıf
   burada CANLI kalmıştı. Operatör "1 düştü" görüyor, hangisi ve niye
   sorusunun cevabını hiçbir yerde bulamıyordu.

   BU TURDA BULUNAN İKİNCİ YARA: eski kod `!entry` (şablon KAYITLI DEĞİL) ile
   "kanal ilanı print taşımıyor"u AYNI kovaya (`atlanan`) koyuyordu. İlki
   ilanın hiç okunamadığı anlamına gelir ve `topluAktar` onu gerekçeli bir
   satır olarak bildirir; burada sessizce yutuluyordu. */

import { describe, expect, it, vi } from "vitest";
import type { OrderItemDTO } from "@tezgah/shared";
import { SIPARIS_SABLONLARI, exportRouteOf } from "@tezgah/templates/identity";
import { TEMPLATES } from "@tezgah/templates";
import {
  cmykKapsami,
  cmykSonucVerisi,
  cmykUretebilir,
  topluCmyk,
  type CmykAdimlari,
  type CmykMetinleri,
} from "./topluCmyk";

function kalem(id: string, document_id: string | null): OrderItemDTO {
  return {
    id,
    project_id: "prj_1",
    product_type: "tabela",
    qty: 1,
    width_cm: 100,
    height_cm: 50,
    details: {},
    status: "tasarimda",
    document_id,
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as unknown as OrderItemDTO;
}

const METIN: CmykMetinleri = {
  kayitsizSablon: "KAYITSIZ",
  hata: (e) => `HATA:${(e as Error).message}`,
};

/** Her belgeyi kayıtlı + baskı yolunda sayan adımlar (aksi belirtilmedikçe). */
function adimlar(over: Partial<CmykAdimlari> = {}): CmykAdimlari {
  return {
    hazirla: vi.fn(async (documentId: string) => ({ kayitli: true, baskiYolu: true, documentId })),
    uret: vi.fn(async () => undefined),
    ...over,
  };
}

describe("toplu CMYK turu", () => {
  it("ÖN-KOŞUL: temiz kurulumda HER belgeli kalem üretilir", async () => {
    /* Bu satır olmadan aşağıdaki "üretilmedi" iddiaları, hiçbir şey
       üretmeyen bozuk bir turda da yeşil kalırdı. */
    const a = adimlar();
    const o = await topluCmyk([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    expect(o.uretilen).toBe(2);
    expect(a.uret).toHaveBeenCalledTimes(2);
    expect(o.satirlar.every((s) => s.durum === "uretildi")).toBe(true);
  });

  it("BELGESİZ KALEM hiç satır ÜRETMEZ — olmayan iş raporlanmaz", async () => {
    const a = adimlar();
    const o = await topluCmyk([kalem("a", "doc_a"), kalem("b", null)], a, METIN);
    expect(o.satirlar.map((s) => s.item.id)).toEqual(["a"]);
    expect(a.hazirla).toHaveBeenCalledTimes(1);
  });

  it("BASKI YOLU YOKSA atlanır — ÜRETİM ÇAĞRILMAZ ve gerekçe YAZILMAZ", async () => {
    /* Tekstil/kesim belgesinin CMYK'si olmaması bir kusur DEĞİLDİR; gerekçe
       yazmak operatöre olmayan bir sorun bildirirdi. */
    const a = adimlar({
      hazirla: vi.fn(async (documentId: string) => ({
        kayitli: true,
        baskiYolu: documentId !== "doc_b",
        documentId,
      })),
    });
    const o = await topluCmyk([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    expect(o.satirlar.map((s) => [s.item.id, s.durum, s.gerekce])).toEqual([
      ["a", "uretildi", null],
      ["b", "yol-yok", null],
    ]);
    expect(a.uret).toHaveBeenCalledTimes(1);
  });

  it("KAYITSIZ ŞABLON, 'yol yok'tan AYRI — gerekçesiyle bildirilir", async () => {
    /* ESKİ KOD İKİSİNİ AYNI KOVAYA KOYUYORDU (`atlanan += 1`). Kayıtsız
       şablon, kanal ilanının HİÇ OKUNAMADIĞI anlamına gelir — kardeş hat
       (`topluAktar`) onu gerekçeli bir satır olarak bildiriyordu. */
    const a = adimlar({
      hazirla: vi.fn(async (documentId: string) => ({
        kayitli: documentId !== "doc_b",
        baskiYolu: true,
        documentId,
      })),
    });
    const o = await topluCmyk([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    expect(o.satirlar[1]).toEqual({ item: expect.anything(), durum: "kayitsiz", gerekce: "KAYITSIZ" });
    /* Kayıtsız şablonda ÜRETİM DENENMEZ: kanal ilanı okunamadan üretime
       vermek, doğru ucun bilinmediği bir belgeyi basmak olurdu. */
    expect(a.uret).toHaveBeenCalledTimes(1);
  });

  it("DÜŞEN KALEMİN GEREKÇESİ SATIRDA durur — tur DURMAZ", async () => {
    const a = adimlar({
      uret: vi.fn(async (documentId: string) => {
        if (documentId === "doc_a") throw new Error("503 ghostscript");
        return undefined;
      }),
    });
    const o = await topluCmyk([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    expect(o.satirlar.map((s) => [s.item.id, s.durum, s.gerekce])).toEqual([
      ["a", "dusen", "HATA:503 ghostscript"],
      ["b", "uretildi", null],
    ]);
    expect(o.uretilen).toBe(1);
  });

  it("SIRAYLA koşar — paralel değil", async () => {
    const sira: string[] = [];
    const a = adimlar({
      hazirla: vi.fn(async (documentId: string) => {
        sira.push(`hazir:${documentId}`);
        return { kayitli: true, baskiYolu: true, documentId };
      }),
      uret: vi.fn(async (documentId: string) => {
        sira.push(`uret:${documentId}`);
      }),
    });
    await topluCmyk([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    expect(sira).toEqual(["hazir:doc_a", "uret:doc_a", "hazir:doc_b", "uret:doc_b"]);
  });
});

describe("sayılar", () => {
  it("SATIRLARDAN TÜRER — iki kaynak ayrışamaz", async () => {
    const a = adimlar({
      hazirla: vi.fn(async (documentId: string) => ({
        kayitli: documentId !== "doc_c",
        baskiYolu: documentId !== "doc_b",
        documentId,
      })),
      uret: vi.fn(async (documentId: string) => {
        if (documentId === "doc_d") throw new Error("500");
      }),
    });
    const o = await topluCmyk(
      [kalem("a", "doc_a"), kalem("b", "doc_b"), kalem("c", "doc_c"), kalem("d", "doc_d")],
      a,
      METIN,
    );
    const say = (d: string) => o.satirlar.filter((s) => s.durum === d).length;
    expect({ uretilen: o.uretilen, atlanan: o.atlanan, dusen: o.dusen }).toEqual({
      uretilen: say("uretildi"),
      /* SAYI ESKİ DAVRANIŞLA BİREBİR: "üretilmedi ama hata değil" kovası
         hem yol-yok'u hem kayıtsızı taşır; AYRIM SATIRDA doğar. */
      atlanan: say("yol-yok") + say("kayitsiz"),
      dusen: say("dusen"),
    });
    expect(o.atlanan).toBe(2);
  });
});

describe("cmykSonucVerisi — panel verisi", () => {
  const bas = (o: { uretilen: number; atlanan: number; dusen: number }) =>
    `${o.uretilen} üretildi · ${o.atlanan} atlandı · ${o.dusen} düştü`;
  const ad = (it: OrderItemDTO) => `Kalem ${it.id}`;

  it("DURUM ÇEVİRİSİ TAM — yol-yok 'atlandi', kayıtsız 'engelli'", async () => {
    const a = adimlar({
      hazirla: vi.fn(async (documentId: string) => ({
        kayitli: documentId !== "doc_c",
        baskiYolu: documentId !== "doc_b",
        documentId,
      })),
    });
    const o = await topluCmyk([kalem("a", "doc_a"), kalem("b", "doc_b"), kalem("c", "doc_c")], a, METIN);
    expect(cmykSonucVerisi(o, bas, ad).satirlar).toEqual([
      { ad: "Kalem a", durum: "tamam", gerekce: null },
      { ad: "Kalem b", durum: "atlandi", gerekce: null },
      { ad: "Kalem c", durum: "engelli", gerekce: "KAYITSIZ" },
    ]);
  });

  it("BAŞLIK sayıları taşır", async () => {
    const o = await topluCmyk([kalem("a", "doc_a")], adimlar(), METIN);
    expect(cmykSonucVerisi(o, bas, ad).baslik).toBe("1 üretildi · 0 atlandı · 0 düştü");
  });
});

describe("KAPSAM — düğme neyi vaat ediyor (K-1/B, cmyk kapsamı)", () => {
  /* ÖLÇÜLEN YARA: düğme "🎨 CMYK üret" diyordu, hiçbir sayı taşımıyordu ve
     koşulu "belgeli kalem var mı"ydı. Kayıt defterinden okunan gerçek:

       tisort · onluk  → garment[png+broderie] → exportRouteOf = "garment"
       vitrophanie     → mode="decoupe" iken "svg"
       diğer türler    → "pdf"

     Yani TEKSTİL-ONLY bir projede düğme çiziliyor, tur N belgeyi tek tek
     çekiyor, sonuç "0 üretildi · N atlandı" oluyor ve panel listesi BOŞ
     kalıyordu (`yol-yok` LİSTELENMEZ — doğru karar, ama o zaman düğmenin hiç
     çizilmemesi gerekirdi). Kardeş düğmelerin ikisi de kapsamını SAYIYLA
     ilan ediyor. */

  const tur = (id: string, product_type: OrderItemDTO["product_type"], details = {}): OrderItemDTO =>
    ({ ...kalem(id, `doc_${id}`), product_type, details }) as OrderItemDTO;

  describe("ön-koşul — türetim GERÇEKTEN kayıt defterinden okuyor", () => {
    it("EN AZ BİR tür print DIŞINA çıkar, EN AZ BİRİ pdf'e çıkar", () => {
      /* Bu satır olmadan aşağıdaki bütün iddialar, hiçbir şeyi ayırt etmeyen
         bozuk bir türetimle de yeşil kalırdı: ya hepsi kapsamda ya hiçbiri. */
      const rotalar = Object.entries(SIPARIS_SABLONLARI).flatMap(([, ids]) =>
        (ids as readonly string[]).map((id) =>
          exportRouteOf(TEMPLATES[id]?.manifest.production_channels ?? [], undefined),
        ),
      );
      expect(rotalar).toContain("pdf");
      expect(rotalar.some((r) => r !== "pdf"), "print dışına çıkan tür yok").toBe(true);
    });
  });

  it("TEKSTİL türleri kapsam DIŞI — kanal ilanı garment", () => {
    expect(cmykUretebilir(tur("a", "tisort"))).toBe(false);
    expect(cmykUretebilir(tur("b", "onluk"))).toBe(false);
  });

  it("BASKI türleri kapsam İÇİ", () => {
    for (const t of ["menu", "flyer", "fidelite", "tabela"] as const) {
      expect(cmykUretebilir(tur("x", t)), t).toBe(true);
    }
  });

  it("MOD KALEMDEN OKUNUR: vitrophanie decoupe modunda kapsam DIŞI", () => {
    /* Aynı tür, aynı şablon — tek fark kalemin kendi `details.mode`'u. Bu,
       kapsamın türden değil KALEMDEN türediğini ölçer. */
    expect(cmykUretebilir(tur("v1", "vitrophanie"))).toBe(true);
    expect(cmykUretebilir(tur("v2", "vitrophanie", { mode: "decoupe" }))).toBe(false);
  });

  it("BELGESİZ kalem kapsamda DEĞİL — turun konusu değil", () => {
    expect(cmykKapsami([kalem("k1", null)])).toEqual([]);
  });

  it("KAPSAM belgeli + üretebilir kalemleri döndürür, SIRAYI korur", () => {
    const items = [tur("a", "tisort"), tur("b", "flyer"), kalem("c", null), tur("d", "menu")];
    expect(cmykKapsami(items).map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("TEKSTİL-ONLY projede kapsam BOŞ — düğme çizilmemeli", () => {
    /* Yaranın kendisi, tek satırda. */
    expect(cmykKapsami([tur("a", "tisort"), tur("b", "onluk")])).toEqual([]);
  });

  it("KUŞKUDA GÖRÜNÜR TARAF: ilanı okunamayan tür kapsamda KALIR", () => {
    /* Şablonsuz tür (`diger`) belgeli görünüyorsa ilan okunamıyor demektir;
       gizlemek onu turun gerekçeli satırından da mahrum bırakırdı. Kardeş
       süzgeçlerle aynı sözleşme. */
    expect(cmykUretebilir(tur("z", "diger"))).toBe(true);
  });
});
