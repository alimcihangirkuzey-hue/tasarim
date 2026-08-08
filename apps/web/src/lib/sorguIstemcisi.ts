/* UYGULAMANIN QueryClient KURULUMU — TEK KAYNAK.

   NİYE FABRİKA (main.tsx'te satır içi değil): kurulumun kendisi artık DAVRANIŞ
   taşıyor (sessiz düşen mutation'ları yayınlıyor). Satır içi kalsaydı test,
   uygulamanın kullandığı istemciyi değil KOPYASINI ölçerdi — ve kopya doğru
   olduğu hâlde uygulama yanlış kalabilirdi.

   ÖLÇÜLEN YARA: 50 mutation'ın 39'unda `onError` yok ve genel bir yakalayıcı
   da yoktu; React Query reddi kendi içinde yutuyor. Sonuç: kaydet/sil/yükle
   düştüğünde ekranda hiçbir şey olmuyordu (hataYayini.ts başlığı).

   KENDİ `onError`'I OLAN MUTATION YAYINLAMAZ: React Query genel yakalayıcıyı
   yerel `onError` ile BİRLİKTE çağırır. Ayrım yapılmasaydı, gerekçesini zaten
   kendi diliyle söyleyen 11 mutation (ör. açılış takımının iş-kolu 409'u) aynı
   hatayı İKİ KEZ gösterirdi — biri kendi bağlamında, biri genel bandda. */

import { MutationCache, QueryClient } from "@tanstack/react-query";
import { hataYayinla } from "./hataYayini";

/** Uygulamanın (ve testlerin) kullandığı istemci. */
export function istemciKur(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
    mutationCache: new MutationCache({
      onError: (hata, _degiskenler, _baglam, mutation) => {
        /* Yerel handler VARSA sus: gerekçeyi o, kendi bağlamında söyleyecek. */
        if (mutation.options.onError) return;
        /* Mesaj UYDURULMAZ: http() zaten sunucunun gerekçesinden okunur bir
           Türkçe mesaj üretiyor (apiErrorMessage). Burada yalnız taşınır. */
        hataYayinla((hata as Error).message);
      },
    }),
  });
}
