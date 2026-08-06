/* BASKI YAKALAMA SİNYALİ — sayfanın başsız tarayıcıya "hazırım" ya da
   "olmadı, sebebi bu" demesi (K-1/B).

   ÖLÇÜLEN YARA: dört baskı yüzeyi (print · present · mockup · fiche) sunucu
   tarafından `window.__PRINT_READY__ === true` beklenerek PDF/PNG'ye çevrilir.
   Sayfa herhangi bir sebeple hazır olamazsa (belge 404, müşteri isteği 500,
   şablon kayıtsız, render fırlattı) bayrak HİÇ ATANMAZ ve yakalama 30-45
   SANİYE bekleyip zaman aşımına düşer; çağırana giden şey `{error:"internal"}`
   — yani ne gerekçe var ne de hız.

   REPO BUNU ZATEN ÖLÇMÜŞTÜ: exports.ts:122 şerhi aynı zinciri yazıyor ("bozuk
   params → __PRINT_READY__ hiç atanmaz → 30-45 sn timeout → 500 internal") ve
   O TEK SEBEBİ erken kapıyla kapatmıştı. Bu dosya kalan bütün sebepleri
   kapsayan genel yolu açar: sayfa artık SUSMAK yerine KONUŞUR.

   K-1/B BAĞI: dört kalemlik bir işte toplu üretim sırasında bir sayfa
   düşerse bugün 45 saniye × düşen kalem kadar ölü bekleme var. Gerekçeyle
   hızlı düşmek, "çoklu proje hızı"nın doğrudan karşılığıdır.

   NİYE AYRI DOSYA: dört sayfa da aynı sözleşmeyi kullanır ve sunucu tarafı da
   aynı adı okur; ad tek yerde yaşamazsa iki tarafın sürüklenmesi sessiz olur
   (bayrağın yazımı bozulunca sayfa yine 45 sn sessiz kalırdı). */

declare global {
  interface Window {
    /** Sayfa hazır — mevcut sözleşme, DEĞİŞMEDİ */
    __PRINT_READY__?: boolean;
    __PAGE_SIZE__?: { w: number; h: number; pages: number };
    /** Sayfa hazır OLAMADI; değer kullanıcıya gösterilebilir gerekçedir */
    __PRINT_ERROR__?: string;
  }
}

/**
 * Yakalayana "hazır olamadım" der ve sebebi bırakır.
 *
 * BAYRAK BİR KEZ YAZILIR: ilk sebep korunur. Sonraki sorguların da düşmesi
 * tipiktir (aynı sunucu erişilemiyordur) ve sonuncuyu yazmak, ilk ve gerçek
 * sebebi silerdi.
 */
export function baskiHatasiBildir(mesaj: string): void {
  if (typeof window === "undefined") return;
  if (window.__PRINT_ERROR__ !== undefined) return;
  window.__PRINT_ERROR__ = mesaj;
}

/** Sorgu hatalarından okunur tek satır üretir (mesaj UYDURULMAZ, taşınır). */
export function baskiHatasiMetni(hatalar: ReadonlyArray<unknown>): string {
  const ilk = hatalar.find((h) => h !== null && h !== undefined);
  return ilk instanceof Error && ilk.message ? ilk.message : "sayfa verisi yüklenemedi";
}
