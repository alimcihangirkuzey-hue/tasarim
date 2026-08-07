/* SAHTE ZAMAN ALTINDA YOKLUK İDDİASI — SAYIM MEKANİKLEŞTİ (K-1/B borcu).

   NEREDEN GELDİ: `2026-08-07-yokluk-iddiasi` paketinin açık bıraktığı satır
   şöyle diyordu — "Kök çözüm yazılmadı: sahte zamanlayıcı kullanan dosyalarda
   yokluk iddiasını sağlam kuran ortak bir yardımcı (zamanı ilerletip `queryBy`
   ile bakan) yok — ÜÇ DOSYA bunu elle yapıyor."

   O CÜMLE ÖLÇÜLDÜ VE YANLIŞ ÇIKTI. Sahte zamanlayıcı kullanan dosya gerçekten
   üç tane; ama sahte zaman BÖLGESİNDE yokluk iddiası kuran dosya sayısı BİR:

     · `components/SlotPanel.test.tsx`  — sahte zaman `beforeEach`te (dosya
       geneli), yokluk iddiası SIFIR.
     · `lib/sorguIstemcisi.test.tsx`    — üç yokluk iddiası var ama ÜÇÜ DE
       sahte zamanın açıldığı satırdan ÖNCE (gerçek zaman bölgesinde).
     · `pages/EditorPage.test.tsx`      — TEK gerçek vaka.

   VE O TEK VAKA SAĞLAM: zaman ilerletiliyor (`advanceTimersByTimeAsync(2000)`),
   mutasyonun iki kez koştuğu ölçülüyor, `saveState` "saved" ve "Kaydedildi"
   ekranda — yokluk iddiası pozitif olgulara BAĞLI, havada değil.

   O YÜZDEN ORTAK YARDIMCI YAZILMADI, VE BU BİR KARAR: tek çağrı yeri için
   soyutlama yazmak, bu deponun tekrar tekrar reddettiği şeydir ("ölçülen
   sıklığı sıfır olan riske karşılık maliyet" — 33 yokluk iddiasının kalıcı
   çevrilmemesi aynı gerekçeyle yazılı). Bunun yerine SAYIM çivilendi: ikinci
   bir vaka doğduğu gün nöbetçi kırmızıya döner ve "ortak yardımcı" sorusu
   kendiliğinden, TAHMİNLE DEĞİL SAYIYLA geri gelir.

   ARACIN İNCELİĞİ — DOSYA DÜZEYİ SAYIM YANLIŞ CEVAP VERİR: `sorguIstemcisi`
   dosyasında hem sahte zaman hem yokluk iddiası VAR, ama aynı bölgede değil.
   Dosya düzeyinde sayan bir araç 4 der; bölge duyarlı araç 1 der. Doğru cevap
   1'dir ve aradaki fark bir ön-koşulla ölçülüyor (aşağıda). */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const BU_DOSYA = fileURLToPath(import.meta.url);
const WEB_SRC = path.dirname(BU_DOSYA);

/* Desenler parçalardan kuruluyor: kaynak metinde `vi` + nokta + useFakeTimers
   dizisi DÜZ HÂLİYLE geçseydi, bu dosya kendi taramasına yem olurdu (ve
   `yokluk-iddiasi.test.ts` nöbetçisine de). Kendi dosyasını tam yolla
   dışlamak yetmez — kural, metnin hiç doğmamasıdır. */
const SAHTE_ZAMAN = new RegExp(String.raw`\bvi\.` + String.raw`useFakeTimers\s*\(`);
/** Sahte zamanı bir `before*` kancasında açan dosyada bölge = DOSYANIN TAMAMI. */
const SAHTE_KANCA = new RegExp(
  String.raw`before(?:Each|All)\s*\(\s*(?:\(\s*\)\s*=>|async\s*\(\s*\)\s*=>|function\s*\(\s*\))[\s\S]{0,200}?\bvi\.` +
    String.raw`useFakeTimers`
);
/** Anlık yokluk iddiası: `queryBy…` sonucunun boş olduğunu ÖLÇMEDEN bekleme. */
const ANLIK_YOKLUK = /(?:queryBy|queryAllBy)[A-Za-z]*\([\s\S]*?\)\s*\)?\s*\.(?:toBeNull\(\)|toHaveLength\(0\))/g;

interface Dosya {
  ad: string;
  kaynak: string;
}

function testDosyalari(): Dosya[] {
  const bulunan: Dosya[] = [];
  const gez = (dizin: string): void => {
    for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) gez(tam);
      /* KENDİNİ TARAMAZ (`yokluk-iddiasi.test.ts`te ölçülmüş kendini-tarama
         kör noktası): desenler metin olarak burada da yaşıyor. */
      else if (tam !== BU_DOSYA && /\.test\.tsx?$/.test(g.name)) {
        bulunan.push({ ad: path.relative(WEB_SRC, tam), kaynak: fs.readFileSync(tam, "utf8") });
      }
    }
  };
  gez(WEB_SRC);
  return bulunan;
}

/** Sahte zamanın GEÇERLİ OLDUĞU bölgede kaç anlık yokluk iddiası var. */
function bolgedekiYokluk(kaynak: string): number {
  const m = SAHTE_ZAMAN.exec(kaynak);
  if (!m) return 0;
  const bolge = SAHTE_KANCA.test(kaynak) ? kaynak : kaynak.slice(m.index);
  return (bolge.match(ANLIK_YOKLUK) ?? []).length;
}

/**
 * BUGÜNKÜ SAYIM — ölçülerek yazıldı.
 *
 * `bolge` = sahte zaman bölgesindeki anlık yokluk iddiası sayısı. Toplam 1
 * olduğu sürece ortak yardımcı yazmak soyutlama borcudur, çözüm değil.
 */
const SAYIM: Array<{ dosya: string; bolge: number; not: string }> = [
  {
    dosya: "components/SlotPanel.test.tsx",
    bolge: 0,
    not: "sahte zaman `beforeEach`te (dosya geneli) ama yokluk iddiası hiç yok",
  },
  {
    dosya: "lib/sorguIstemcisi.test.tsx",
    bolge: 0,
    not: "üç yokluk iddiası VAR ama üçü de sahte zamandan ÖNCE — gerçek zaman bölgesinde",
  },
  {
    dosya: "pages/EditorPage.test.tsx",
    bolge: 1,
    not: "TEK gerçek vaka ve SAĞLAM: zaman ilerletiliyor, iddia pozitif olgulara bağlı",
  },
];

describe("ÖN KOŞUL — araç gerçekten ölçüyor ve BÖLGE duyarlı", () => {
  it("sahte zaman kullanan dosyalar bulunuyor (tarama konusuz değil)", () => {
    const sahteciler = testDosyalari().filter((d) => SAHTE_ZAMAN.test(d.kaynak));
    expect(sahteciler.length, "hiç sahte zamanlı dosya yok — ölçüm konusuz").toBeGreaterThan(0);
  });

  it("DESENLER GERÇEKTEN EŞLEŞİYOR — örnek metinle sınanır, dosyayla değil", () => {
    /* Pozitif kontrol bir ÖRNEK olmak zorunda: dosyaya bakan bir kontrol,
       dosya yazımı değiştiğinde ölçmek istediğini değil bir yan ürünü ölçer
       (`kurulumDaraltmasi.test.ts`te ölçülmüş hata). */
    const ORNEK_SAHTE = ["vi", ".", "useFakeTimers();"].join("");
    const ORNEK_YOKLUK = 'expect(screen.queryByText(/Kayıt hatası!/)).toBeNull();';
    expect(SAHTE_ZAMAN.test(ORNEK_SAHTE), "sahte zaman deseni örneğe uymuyor").toBe(true);
    expect(ORNEK_YOKLUK.match(ANLIK_YOKLUK)?.length, "yokluk deseni örneğe uymuyor").toBe(1);
  });

  it("BÖLGE KURALI AYIRT EDİCİ: dosya düzeyi sayım BAŞKA cevap verir", () => {
    /* Bu satır aracın kalbini ölçer. `sorguIstemcisi` dosyasında hem sahte
       zaman hem yokluk iddiası vardır ama AYNI BÖLGEDE DEĞİLDİR: dosya
       düzeyinde sayan bir araç onu "sorunlu" gösterir, bölge duyarlı araç
       göstermez. Fark ölçülmezse, kural bugünkü veriyle ayırt edilemez. */
    const d = testDosyalari().find((x) => x.ad === "lib/sorguIstemcisi.test.tsx");
    expect(d, "ön koşul dosyası kayboldu — sayım tablosu güncellenmeli").toBeTruthy();
    const dosyaDuzeyi = (d!.kaynak.match(ANLIK_YOKLUK) ?? []).length;
    expect(dosyaDuzeyi, "dosyada hiç yokluk iddiası yok — ayrım ölçülemez").toBeGreaterThan(0);
    expect(bolgedekiYokluk(d!.kaynak), "bölge kuralı dosya düzeyinden ayrışmıyor").toBe(0);
  });
});

describe("SAYIM ÇİVİLİ — ikinci vaka doğduğu gün konuşur", () => {
  it("SAHTE ZAMANLI dosyaların kümesi İLAN EDİLENLE birebir", () => {
    const sahteciler = testDosyalari()
      .filter((d) => SAHTE_ZAMAN.test(d.kaynak))
      .map((d) => d.ad)
      .sort();
    expect(
      sahteciler,
      "sahte zamanlı dosya kümesi değişti — sayım tablosunu güncelleyin"
    ).toEqual(SAYIM.map((s) => s.dosya).sort());
  });

  it("HER DOSYANIN bölge sayısı İLAN EDİLENLE birebir", () => {
    for (const s of SAYIM) {
      const d = testDosyalari().find((x) => x.ad === s.dosya)!;
      expect(bolgedekiYokluk(d.kaynak), `${s.dosya}: bölge sayısı değişti`).toBe(s.bolge);
    }
  });

  it("TOPLAM BİR — ortak yardımcının müşterisi hâlâ tek", () => {
    /* Kararın kapısı. Toplam 2'ye çıktığı gün burası kırmızıya döner ve
       "sahte zaman altında yokluk iddiasını kuran ortak bir yardımcı yazalım
       mı" sorusu, tahminle değil SAYIYLA önümüze gelir. */
    const toplam = SAYIM.reduce((n, s) => n + s.bolge, 0);
    expect(toplam, "ikinci vaka doğdu — ortak yardımcı sorusu artık ölçülü").toBe(1);
  });
});
