/* TOPLU CMYK — TEK GÖVDE + GEREKÇELİ SONUÇ (K-1/B, çoklu proje hızı).

   ÜÇÜNCÜ KARDEŞ. Aynı başlığın üç turu var ve ikisi zaten kütüphane:
   `topluAktar` (2026-08-06-toplu-aktarim-gerekcesi) ve `topluBaslat`
   (2026-08-06-baslatma-gerekcesi). Bu üçüncüsü hâlâ ProjectsPanel'in içinde
   ~20 satırlık bir `mutationFn` gövdesiydi, TEK BİR TESTİ YOKTU ve aynı
   yarayı taşıyordu:

     catch { dusen += 1 }

   Yani operatör "3 CMYK üretildi · 1 düştü" görüyor, HANGİSİ ve NİYE
   sorusunun cevabını hiçbir yerde bulamıyordu. Bir sınıfı iki hatta
   kapatmak, üçüncünün ölçüldüğü anlamına gelmiyor — bu depoda daha önce de
   ölçülmüş bir ders (menu-grid-cells `pages` sabiti: bir dalda kapatılan
   ayrışma kardeş dalda canlı kalmıştı).

   İKİ ÖLÇÜLMÜŞ KISIT DEĞİŞMEDİ (ikisi de sunucudan okunmuştu, varsayılmadı):
   (1) Ghostscript şart (cmyk.ts → yoksa 503); düğme yalnız `available` iken
       çizilir ve bu kural ÇAĞIRANDA kalır, bu katmanda değil.
   (2) Kaynak, belgenin SON `print` çıktısıdır (cmyk.ts → yoksa 400
       no_print_export). Tekstil/kesim yoluna giden belgelerin print çıktısı
       HİÇ olmaz; onlar HATA DEĞİL, ATLANANDIR.

   BU TURDA BULUNAN AYRIM — "atlandı" iki AYRI şeyi örtüyordu:
   · kanal ilanı print taşımıyor  → gerçekten atlanır, sorun DEĞİL
   · şablon KAYITLI DEĞİL         → ilan hiç OKUNAMADI, sorun EVET
   Eski kod ikisini de `atlanan += 1` yapıyordu. `topluAktar` aynı durumu
   ("kayıtsız şablon") gerekçeli bir SATIR olarak bildiriyor; burada sessizce
   yutuluyordu. SAYI KORUNUR (ikisi de `atlanan`dır — üretilmediler), AYRIM
   SATIRDA doğar: kayıtsız şablon panelde ADIYLA ve gerekçesiyle görünür. */

import type { OrderItemDTO } from "@tezgah/shared";
import { exportRouteOf, siparisSablonlari } from "@tezgah/templates/identity";
import { TEMPLATES } from "@tezgah/templates";
import type { TurSatirDurumu, TurSonucuVerisi } from "../components/TurSonucu";

/* ── KAPSAM: TUR BAŞLAMADAN ÖNCE, İLANDAN ────────────────────────────────────

   ÖLÇÜLEN YARA (bu turda, kayıt defterinden komutla okundu):

     tisort · onluk  → garment[png+broderie] → exportRouteOf = "garment" (mode
                       ne olursa olsun) → CMYK kaynağı olan `print` çıktısı
                       HİÇ doğmaz
     vitrophanie     → mode="decoupe" iken "svg" → yine print YOK
     diğer türler    → "pdf"

   Yani TEKSTİL-ONLY bir projede "🎨 CMYK üret" düğmesi çiziliyordu ve
   üretebileceği hiçbir şey yoktu: operatör basıyor, tur N belgeyi tek tek
   çekiyor, sonuç "0 üretildi · N atlandı" oluyor ve panelin listesi BOŞ
   (`yol-yok` LİSTELENMEZ — doğru karar, ama o zaman düğmenin hiç çizilmemesi
   gerekirdi). Kardeş düğmelerin ikisi de kapsamlarını SAYIYLA ilan ediyor
   ("{n} kalemi tasarıma başlat", "{n} belgeyi üret"); CMYK düğmesi hiçbir sayı
   taşımıyordu. ProjectsPanel'in KENDİ yazılı kuralı da bunu söylüyordu:
   "'0 kalem' yazan bir düğme operatöre yapılacak iş varmış gibi görünürdü."

   BU KATMAN BİR İLANDIR, TURUN YERİNE GEÇMEZ: kalemden yalnız ürün TÜRÜ ve
   `details.mode` bilinir; belgenin GERÇEK şablonu ancak turda okunur. Bu yüzden
   kural tek yönlü ve SAĞLAM tarafta kurulur — "kesinlikle üretemez" ancak
   türün BÜTÜN şablon seçenekleri print dışına çıkıyorsa söylenir. Seçenekler
   ayrışıyorsa kalem KAPSAMDA sayılır (kuşkuda görünür taraf; kardeş
   süzgeçlerle aynı sözleşme). Böylece kapsam turu ASLA olduğundan dar
   göstermez; tur kendi çalışma-zamanı denetimini korur. */

/** Kalemin türü, ilana göre CMYK üretebilir mi (kuşkuda EVET). */
export function cmykUretebilir(item: OrderItemDTO): boolean {
  const secenekler = siparisSablonlari(item.product_type);
  /* Şablonsuz tür (tasarlanamaz) zaten belgesizdir; buraya belgeli kalem
     gelirse ilan okunamıyor demektir — gizlemeyiz. */
  if (secenekler.length === 0) return true;
  return secenekler.some((id) => {
    const entry = TEMPLATES[id];
    /* Kayıtsız şablon: ilan OKUNAMADI. Turda gerekçeli bir satır olarak
       görünür; burada saklamak onu görünmez kılardı. */
    if (!entry) return true;
    return exportRouteOf(entry.manifest.production_channels, item.details?.mode) === "pdf";
  });
}

/**
 * Turun DOKUNACAĞI kalemler — belgeli VE ilana göre CMYK üretebilir olanlar.
 *
 * Düğme bu sayıyı yazar ve sayı 0 ise HİÇ ÇİZİLMEZ. Sayının turla aynı
 * kaynaktan gelmesi bilinçli: elle tutulan ikinci bir sayaç, bu deponun tekrar
 * tekrar ödediği sınıftır (yapıştır önizlemesi, toplu başlatma sayıları).
 */
export function cmykKapsami(items: readonly OrderItemDTO[]): OrderItemDTO[] {
  return items.filter((i) => i.document_id !== null && cmykUretebilir(i));
}

/** Bir kalemin toplu CMYK sonucu. */
export type CmykDurumu = "uretildi" | "yol-yok" | "kayitsiz" | "dusen";

export interface CmykSonucu {
  item: OrderItemDTO;
  durum: CmykDurumu;
  /** Operatöre gösterilecek gerekçe; "uretildi"de null. */
  gerekce: string | null;
}

export interface TopluCmykOzeti {
  uretilen: number;
  /** Üretilmeyen ama HATA olmayanlar: yol yok + kayıtsız şablon. */
  atlanan: number;
  dusen: number;
  satirlar: CmykSonucu[];
}

/** CMYK üretiminin adımları — çağıran enjekte eder (test edilebilirlik). */
export interface CmykAdimlari {
  /** Belgeyi çeker ve CMYK kaynağının doğup doğmadığını söyler. */
  hazirla: (documentId: string) => Promise<{
    /** Şablon kayıt defterinde var mı — yoksa kanal ilanı OKUNAMAZ. */
    kayitli: boolean;
    /** Kanal ilanı `pdf` (print) yoluna çıkıyor mu. */
    baskiYolu: boolean;
    /** Gerçek belge kimliği (kalemdeki id ile aynı olmalı — sunucu doğrular). */
    documentId: string;
  }>;
  /** Gerçek CMYK üretimi (yalnız kayıtlı + baskı yolunda çağrılır). */
  uret: (documentId: string) => Promise<unknown>;
}

/** Gerekçe metinlerini çağıran verir (i18n bu katmana girmez). */
export interface CmykMetinleri {
  kayitsizSablon: string;
  /** Yakalanan hatadan okunabilir gerekçe üretir. */
  hata: (e: unknown) => string;
}

/* SAYILAR SATIRLARDAN TÜRER — iki kaynak tutulmaz (kardeş hatlarla aynı
   karar: elle tutulan ikinci kopya sessizce ayrışır). */
function sayilar(satirlar: readonly CmykSonucu[]): Omit<TopluCmykOzeti, "satirlar"> {
  const n = (d: CmykDurumu) => satirlar.filter((s) => s.durum === d).length;
  return {
    uretilen: n("uretildi"),
    /* "Üretilmedi ama hata değil" kovası: yol yok VE kayıtsız. Sayı eski
       davranışla birebir aynı kalır; ayrım satırda görünür. */
    atlanan: n("yol-yok") + n("kayitsiz"),
    dusen: n("dusen"),
  };
}

/**
 * Projedeki BELGELİ kalemlerin CMYK'sini sırayla üretir.
 *
 * SIRAYLA koşar, paralel değil: kardeş turlarla aynı gerekçe — eşzamanlı
 * üretim sunucuda aynı projeye paralel yazma yaratır ve bir kalemin hatası
 * diğerininkiyle karışır.
 *
 * Düşen kalem turu DURDURMAZ ama GEREKÇESİYLE sayılır.
 *
 * BELGESİZ KALEM HİÇ GİRMEZ: satır bile üretilmez — o kalemin CMYK'si diye
 * bir şey yoktur ve "atlandı" demek, olmayan bir işi raporlamak olurdu.
 */
export async function topluCmyk(
  items: readonly OrderItemDTO[],
  adimlar: CmykAdimlari,
  metin: CmykMetinleri,
): Promise<TopluCmykOzeti> {
  const satirlar: CmykSonucu[] = [];
  for (const item of items) {
    if (!item.document_id) continue;
    try {
      const h = await adimlar.hazirla(item.document_id);
      if (!h.kayitli) {
        satirlar.push({ item, durum: "kayitsiz", gerekce: metin.kayitsizSablon });
        continue;
      }
      if (!h.baskiYolu) {
        /* Gerekçe YOK ve bu bilinçli: tekstil/kesim belgesinin CMYK'si
           olmaması bir kusur değildir; panelde de listelenmez. */
        satirlar.push({ item, durum: "yol-yok", gerekce: null });
        continue;
      }
      await adimlar.uret(h.documentId);
      satirlar.push({ item, durum: "uretildi", gerekce: null });
    } catch (e) {
      /* GEREKÇE ARTIK YUTULMUYOR — eskiden burada `catch { dusen += 1 }`
         vardı ve "1 düştü" tek bilgiydi. */
      satirlar.push({ item, durum: "dusen", gerekce: metin.hata(e) });
    }
  }
  return { ...sayilar(satirlar), satirlar };
}

/* CMYK durumu → panel durumu. TAM tablo: yeni bir durum doğduğu gün
   DERLENMEZ ve sessizce yanlış rozete düşmez.
   `yol-yok` "atlandi"dır ve LİSTELENMEZ: tekstil belgesinin CMYK'si
   olmaması bir sorun değildir ve her turda listelemek gerçek sorunları
   gömerdi (LISTELENEN ilanı, baslatma-gerekcesi paketi). */
const PANEL_DURUMU: Record<CmykDurumu, TurSatirDurumu> = {
  uretildi: "tamam",
  "yol-yok": "atlandi",
  kayitsiz: "engelli",
  dusen: "dusen",
};

/**
 * Tur özetinden SONUÇ PANELİNİN verisi.
 *
 * Kardeş hatlarla aynı desen ve aynı gerekçe: sonuç dize olarak
 * BİRLEŞTİRİLMEZ — satırların ayrı görünmesi bir CSS kuralına değil, ayrı
 * DOM elemanlarına bağlıdır (tur-sonucu-paneli paketinin ölçtüğü yara).
 */
export function cmykSonucVerisi(
  ozet: TopluCmykOzeti,
  bas: (o: { uretilen: number; atlanan: number; dusen: number }) => string,
  kalemAdi: (item: OrderItemDTO) => string,
): TurSonucuVerisi {
  return {
    baslik: bas({ uretilen: ozet.uretilen, atlanan: ozet.atlanan, dusen: ozet.dusen }),
    satirlar: ozet.satirlar.map((s) => ({
      ad: kalemAdi(s.item),
      durum: PANEL_DURUMU[s.durum],
      gerekce: s.gerekce,
    })),
  };
}
