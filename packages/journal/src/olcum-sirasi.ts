/* ÖLÇÜM SIRASI — "kapı koştuktan SONRA dosya değiştirme" kapısı.

   ÖLÇÜLEN ZARAR (uydurma değil, bu deponun kendi turu): bir tur kapıları
   koştu, SONRA `TODO.md`'yi düzenledi ve commit etti. Düzenleme başka bir
   nöbetçiyi (`defter-acik-is.test.ts`) kırmızıya düşürüyordu; kapı kaydı
   "gecti" diyordu ama o kayıt COMMIT EDİLEN AĞACI TARİF ETMİYORDU. Kırmızı
   bir sonraki turda yakalandı — yani defter bir tur boyunca yanlış söyledi.
   Bulgu `K-SIRA-1` olarak kayıtlı ve tek "ciddi" şiddetli olan oydu.

   SINIF: doküman/defter düzenlemesi de KAPI KONUSUDUR. `TODO.md`'yi
   değiştirmek `apps/server/src/*.ts`'i değiştirmekle aynı sınıftadır —
   ikisini de kapı ölçer, ikisi de ölçümden ÖNCE bitmiş olmalıdır.

   NİYE MTIME (ve sınırı açıkça): ölçüm anında ağacın parmak izini kaydetmek
   daha güçlü olurdu ama `JournalGateRun` şemasına alan eklemeyi ve geçmiş
   kayıtların hepsini "alansız" hâliyle taşımayı gerektirirdi. Elimizde ZATEN
   iki ölçülmüş değer var: kapının `measured_at`'i ve dosyanın disk üzerindeki
   değiştirilme zamanı. Kaba ama yeterli — ve kabalığı GÜVENLİ YÖNDEDİR:
   checkout/rebase gibi işlemler mtime'ı ileri atar, yani nöbetçi FAZLA
   konuşur, az değil.

   NE KAPSAR: `git status --porcelain` ile bildirilen (değişmiş ya da izlenmeyen)
   dosyalar. NE KAPSAMAZ: HEAD ile aynı olan dosyalar (zaten ölçülmüş sayılır)
   ve defterin KENDİ olay dosyaları — onları bu sürecin kendisi yazar, kendi
   yazdığı satır yüzünden durmak anlamsız olurdu. */

/** Kapının ölçüm anı ile karşılaştırılacak tek dosya. */
export interface DegisenDosya {
  /** Repo köküne göre yol (git status çıktısındaki hâli). */
  yol: string;
  /** Dosyanın son değiştirilme anı — ms. Dosya silinmişse `null`. */
  mtimeMs: number | null;
}

/** Defterin kendi yazdığı yollar — ölçümden sonra değişmeleri BEKLENİR. */
export function defterinKendiYolu(yol: string): boolean {
  return (
    yol.startsWith("docs/journal/") ||
    yol.startsWith("docs/pano/") ||
    yol.includes("/.lock/")
  );
}

/**
 * Ölçümden SONRA değişmiş dosyalar.
 *
 * @param olcumIso kapının `measured_at` değeri (ISO 8601)
 * @param dosyalar `git status --porcelain` ile bildirilen dosyalar
 *
 * Silinmiş dosya (`mtimeMs === null`) SAYILMAZ: silme zamanı ölçülemez ve
 * uydurmak, olmayan bir kanıt üretmek olurdu. Bu bilinçli bir boşluktur ve
 * nöbetçinin kapsam notunda yazılıdır.
 */
export function olcumdenSonraDegisenler(
  olcumIso: string,
  dosyalar: readonly DegisenDosya[]
): string[] {
  const olcumMs = Date.parse(olcumIso);
  if (Number.isNaN(olcumMs)) {
    throw new Error(`olcum-sirasi: ölçüm anı okunamadı: ${olcumIso}`);
  }
  return dosyalar
    .filter((d) => !defterinKendiYolu(d.yol))
    .filter((d) => d.mtimeMs !== null && d.mtimeMs > olcumMs)
    .map((d) => d.yol)
    .sort();
}
