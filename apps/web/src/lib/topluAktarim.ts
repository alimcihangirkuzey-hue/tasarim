/* TOPLU DIŞA AKTARIM — TEK GÖVDE + GEREKÇELİ SONUÇ (K-1/B, çoklu proje hızı).

   ÖLÇÜLEN YARA — İKİ PARÇA:

   (1) GÖVDE TEST EDİLEBİLİR DEĞİLDİ. Kardeşi `topluTasarim.ts` bir kütüphanedir
       ve `topluTasarim.test.ts` ile ölçülür; toplu AKTARIM ise ProjectsPanel'in
       içinde ~40 satırlık bir `mutationFn` gövdesiydi ve TEK BİR TESTİ YOKTU
       (bu turda arandı: `topluAktar`/`bulk_export` geçen sıfır test dosyası).
       Aynı başlığın iki yarısından biri ölçülüyor, diğeri ölçülmüyordu.

   (2) SONUÇ SAYI VERİYOR, GEREKÇE VERMİYORDU. Toast şuydu:
         "5 üretildi · 0 engelli (atlandı) · 3 düştü"
       HANGİ üç kalem? NEDEN? `catch { dusen += 1 }` gerekçeyi tamamen yutuyordu;
       engelli kalemin hangi blocker'dan takıldığı da kayboluyordu (tekil yolda
       export modalı o listeyi GÖSTERİR — toplu yol tekilden daha az şey söylüyordu).
       K-1/B'nin tezi "çoklu proje HIZI"dır: bir şey düştüğünde operatör N belgeyi
       tek tek açıp hangisinin neden düştüğünü aramak zorundaysa, toplu yol
       kazandırdığı zamanı geri alır.

   BU KATMAN NE YAPMAZ: sıra ve hata semantiği DEĞİŞMEDİ — sırayla koşar (paralel
   değil), düşen kalem turu durdurmaz, blocker kapısı atlatılmaz. Değişen tek şey,
   her kalemin SONUCUNUN adıyla ve gerekçesiyle geri dönmesi.

   BLOCKER KAPISI: `analyzeDoc` çağrısı ÇAĞIRANDAN gelir (enjekte). Sunucunun
   blocker backstop'u İSTEMCİNİN bildirdiği uyarılara bakar; boş uyarı dizisiyle
   çağırmak bekçiyi sessizce devre dışı bırakırdı (`disaAktar.ts` şerhi). Bu
   yüzden analiz burada da gerçekten koşar ve testte sahtelenebilir olması,
   bekçinin ATLANDIĞI anlamına gelmez — testler tam da atlanmadığını ölçer. */

import type { OrderItemDTO } from "@tezgah/shared";

/** Bir kalemin toplu aktarım sonucu. */
export type AktarimDurumu = "aktarildi" | "bloklu" | "dusen";

export interface AktarimSonucu {
  item: OrderItemDTO;
  durum: AktarimDurumu;
  /** Operatöre gösterilecek gerekçe; "aktarildi"de null. */
  gerekce: string | null;
}

export interface TopluAktarimOzeti {
  aktarilan: number;
  bloklu: number;
  dusen: number;
  /** Sırasıyla her kalemin sonucu — gerekçeler burada yaşar. */
  satirlar: AktarimSonucu[];
}

/** Bir belgeyi üretime veren adımlar — çağıran enjekte eder (test edilebilirlik). */
export interface AktarimAdimlari {
  /** Belgeyi çeker; şablonu kayıtlı değilse `null` entry döner. */
  hazirla: (documentId: string) => Promise<{
    /** Kayıtsız şablon → null: kanal ilanı okunamayan belge üretime verilemez. */
    kayitli: boolean;
    /** Bu belgeyi engelleyen blocker kodları (boşsa engel yok). */
    blockerlar: readonly string[];
  }>;
  /** Gerçek dışa aktarım (blocker yoksa çağrılır). */
  aktar: (documentId: string) => Promise<unknown>;
}

/** Gerekçe metinlerini çağıran verir (i18n bu katmana girmez). */
export interface AktarimMetinleri {
  kayitsizSablon: string;
  /** Blocker kodlarından okunabilir gerekçe üretir. */
  bloklu: (kodlar: readonly string[]) => string;
  /** Yakalanan hatadan okunabilir gerekçe üretir. */
  hata: (e: unknown) => string;
}

/**
 * Projedeki BELGELİ kalemleri sırayla üretime verir.
 *
 * SIRAYLA koşar, paralel değil: her kalem çekme + analiz + aktarım üçlüsüdür ve
 * paralel gönderim aynı projeye eşzamanlı yazma yaratırdı (topluBaslat ile aynı
 * gerekçe, aynı semantik).
 *
 * Belgesi OLMAYAN kalem bu turun konusu DEĞİLDİR ve sayıma girmez — düğme
 * zaten belgeli kalem sayısını yazar (`{n} belgeyi üret`), yani kapsam
 * operatöre önceden bildirilmiştir.
 */
export async function topluAktar(
  items: readonly OrderItemDTO[],
  adimlar: AktarimAdimlari,
  metin: AktarimMetinleri,
): Promise<TopluAktarimOzeti> {
  const satirlar: AktarimSonucu[] = [];

  for (const item of items) {
    if (!item.document_id) continue;
    try {
      const hazir = await adimlar.hazirla(item.document_id);
      if (!hazir.kayitli) {
        satirlar.push({ item, durum: "dusen", gerekce: metin.kayitsizSablon });
        continue;
      }
      if (hazir.blockerlar.length > 0) {
        satirlar.push({ item, durum: "bloklu", gerekce: metin.bloklu(hazir.blockerlar) });
        continue;
      }
      await adimlar.aktar(item.document_id);
      satirlar.push({ item, durum: "aktarildi", gerekce: null });
    } catch (e) {
      /* Gerekçe artık YUTULMUYOR — kalem düzeyinde tutulur ve operatöre gider. */
      satirlar.push({ item, durum: "dusen", gerekce: metin.hata(e) });
    }
  }

  return {
    aktarilan: satirlar.filter((s) => s.durum === "aktarildi").length,
    bloklu: satirlar.filter((s) => s.durum === "bloklu").length,
    dusen: satirlar.filter((s) => s.durum === "dusen").length,
    satirlar,
  };
}

/**
 * Özetten operatöre gidecek metin.
 *
 * BAŞARILI KALEMLER SAYIYLA, BAŞARISIZLAR ADIYLA: "hepsi oldu" bilgisi bir
 * sayıdır; "olmadı" bilgisi bir ADRESTİR. Sorunlu kalemler tek tek sayılmazsa
 * operatör N belgeyi açıp aramak zorunda kalır.
 */
export function aktarimOzetMetni(
  ozet: TopluAktarimOzeti,
  bas: (o: { aktarilan: number; bloklu: number; dusen: number }) => string,
  kalemAdi: (item: OrderItemDTO) => string,
): string {
  const satir = bas({ aktarilan: ozet.aktarilan, bloklu: ozet.bloklu, dusen: ozet.dusen });
  const sorunlu = ozet.satirlar.filter((s) => s.durum !== "aktarildi");
  if (sorunlu.length === 0) return satir;
  return [satir, ...sorunlu.map((s) => `• ${kalemAdi(s.item)}: ${s.gerekce ?? ""}`)].join("\n");
}
