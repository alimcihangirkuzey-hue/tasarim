/* BASKI YAKALAMA BEKLEYİCİSİ — hazır ya da GEREKÇELİ düşüş (K-1/B).

   ÖLÇÜLEN YARA: yakalama siteleri `window.__PRINT_READY__ === true` bekliyordu
   ve sayfa hazır olamadığında (belge 404 · müşteri isteği 500 · şablon
   kayıtsız · render fırlattı) bayrak HİÇ atanmadığı için 30-45 SANİYE bekleyip
   zaman aşımına düşüyordu; çağırana giden `{error:"internal"}` — ne gerekçe
   ne hız. Repo bu zinciri zaten yazmıştı (exports.ts:122 şerhi) ama yalnız TEK
   sebebini (bozuk params) erken kapıyla kapatmıştı.

   NE DEĞİŞTİ: sayfa artık `window.__PRINT_ERROR__` yazabiliyor (web tarafı:
   lib/baskiSinyali.ts). Bekleyici İKİSİNİ BİRDEN gözler; hata gelirse anında
   ve SEBEBİYLE fırlar.

   TEK TUR: iki ayrı waitForFunction yarıştırmak yerine tek ifade iki bayrağı
   da okur — ikinci bir bekleyici, kaybeden tarafta zaman aşımına kadar asılı
   kalır ve tarayıcı bağlamında sızıntı bırakırdı.

   ZAMAN AŞIMI DEĞERLERİ ÇAĞIRANDA KALIR: her sitenin bugünkü süresi aynen
   geçirilir. Bu paket SÜREYİ değil, süreyi BEKLEMEDEN düşebilmeyi ekler —
   davranış farkı yalnız "sayfa hata bildirdi" dalında doğar. */

/** Puppeteer `Page`in bu dosyanın kullandığı yüzeyi (test sahtesi için dar). */
export interface BeklenebilirSayfa {
  waitForFunction(
    fn: string,
    opts: { timeout: number }
  ): Promise<{ jsonValue(): Promise<unknown> }>;
}

/* Tarayıcı bağlamında koşar. `false` → beklemeye devam.

   DIŞA VERİLİR ki test onu SAHTE SAYFAYLA DEĞİL, gerçekten ÇALIŞTIRARAK
   ölçebilsin: sahte sayfa `{hata:…}` döndürdüğü için ifadenin mantığını
   atlar — ifade bozulsa bile o testler yeşil kalırdı (ölçüm aracının kör
   noktası, ölçtüğü kusurdan tehlikelidir). */
export const IFADE = `(() => {
  if (typeof window.__PRINT_ERROR__ === "string") return { hata: window.__PRINT_ERROR__ };
  if (window.__PRINT_READY__ === true) return { hata: null };
  return false;
})()`;

/**
 * Sayfa hazır olana kadar bekler; sayfa hata bildirirse SEBEBİYLE fırlar.
 *
 * @throws sayfa hata bildirdiğinde (hızlı) ya da zaman aşımında (puppeteer'ın
 *   kendi hatası — mevcut davranış birebir korunur)
 */
export async function baskiyaHazirBekle(
  page: BeklenebilirSayfa,
  timeout: number
): Promise<void> {
  const tutamac = await page.waitForFunction(IFADE, { timeout });
  const sonuc = (await tutamac.jsonValue()) as { hata: string | null } | null;
  /* `null`/beklenmedik biçim SESSİZCE başarı sayılmaz: bekleyici çözüldüyse
     ifade bir nesne döndürmüştür; döndürmediyse sözleşme bozulmuştur ve bunu
     yutmak, tam da kapatmaya çalıştığımız sessiz hâli geri getirirdi. */
  if (!sonuc || typeof sonuc !== "object") {
    throw new Error("baskı sinyali okunamadı (sayfa sözleşmesi bozuk)");
  }
  if (sonuc.hata !== null) {
    throw new Error(`sayfa hazır olamadı: ${sonuc.hata}`);
  }
}
