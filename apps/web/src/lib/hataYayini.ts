/* SESSİZ DÜŞEN YAZMA İŞLEMLERİ İÇİN HATA YAYINI.

   ÖLÇÜLEN YARA (bu turda sayıldı): apps/web'de 50 `useMutation` var ve
   39'unun `onError`'ı YOK. React Query bir mutation reddini KENDİ İÇİNDE
   yakalar — `mutate()` fırlatmaz, hata yalnız okunmayan `mutation.error`
   alanında kalır. Ve QueryClient'ta genel bir yakalayıcı da yoktu (main.tsx:
   `defaultOptions` yalnız `queries` taşıyordu, `MutationCache` hiç yok).

   YANİ: kaydet · sil · yükle · yeniden adlandır · kataloğa yaz · font sil …
   düştüğünde EKRANDA HİÇBİR ŞEY OLMUYORDU. Operatör kaydete basıyor, hiçbir
   şey görmüyor ve kaydedildiğini sanıyor. Bu, aynı sınıfın daha önce tek tek
   kapatılmış üç örneğinin (asset silme ham fetch'i · startDesign 400'ü ·
   açılış takımı 409'u) genel hâlidir — tek tek kapatmak yetmiyor.

   NİYE YAYIN (bileşen state'i değil): hatayı yakalayan yer QueryClient'tır ve
   o, React ağacının DIŞINDADIR. Yayın, ağacın dışındaki yakalayıcıyla ağacın
   içindeki bandı birleştiren en küçük köprüdür.

   KAPSAM: bu dosya yalnız TAŞIR. Neyin yayınlanacağı kararı sorguIstemcisi'nde
   (kendi `onError`'ı olan mutation'lar yayınlamaz — çift bildirim olmaz). */

export interface Hata {
  /** Kullanıcıya gösterilecek gerekçe — http()'nin ürettiği okunur mesaj */
  mesaj: string;
  /** Aynı mesajın art arda tekrarını ayırt etmek için artan sayaç */
  no: number;
}

type Dinleyici = (h: Hata | null) => void;

const dinleyiciler = new Set<Dinleyici>();
let sonuncu: Hata | null = null;
let sayac = 0;

/** Bandın kurulumdan önce olan bir hatayı kaçırmaması için son değer saklanır. */
export function sonHata(): Hata | null {
  return sonuncu;
}

export function hataDinle(d: Dinleyici): () => void {
  dinleyiciler.add(d);
  return () => void dinleyiciler.delete(d);
}

export function hataYayinla(mesaj: string): void {
  sayac += 1;
  sonuncu = { mesaj, no: sayac };
  for (const d of dinleyiciler) d(sonuncu);
}

/** Kullanıcı bandı kapattığında */
export function hatayiTemizle(): void {
  sonuncu = null;
  for (const d of dinleyiciler) d(null);
}

/** Testlerin yalıtımı için — üretimde çağrılmaz */
export function hataYayiniSifirla(): void {
  dinleyiciler.clear();
  sonuncu = null;
  sayac = 0;
}
