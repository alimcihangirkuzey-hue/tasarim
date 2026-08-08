/* VERİ DİZİNİ KURULUM İLANI (K-1/C modül sınırı).

   ÖLÇÜLEN YARA (bu turda, gerçekten koşturularak): `TEZGAH_DATA_DIR` bir
   KURULUM ilanıdır — kiralanan bir modülde kiracının bütün verisinin nerede
   durduğunu o belirler — ama açılış denetiminin DIŞINDAYDI. Ölçüm, index.ts'in
   gerçek sırasıyla (migrate() → buildApp) yapıldı:

     TEZGAH_DATA_DIR=<bir harf yanlış>
       boot            → BAŞARILI
       /api/health     → 200
       /api/clients    → 200  []          <-- MÜŞTERİ YOK

   `ensureDirs()` yanlış yazılmış yolu SESSİZCE oluşturur, `migrate()` oraya
   boş bir şema kurar ve kurulum kusursuz sağlıklı görünür. Operatörün gördüğü
   tek şey, bütün müşterilerinin kaybolmuş olmasıdır — oysa veri, doğru yazılmış
   dizinde sapasağlam durmaktadır. `is-kollari` yarası hiç değilse ucu 500'lüyordu
   (journal 2026-08-06-kurulum-dogrulama); bu yara TAMAMEN SESSİZ.

   BOŞ DEĞERİN BUGÜNKÜ YOLU DAHA DA KÖTÜ: `process.env.X ?? varsayilan` boş
   dizeyi nullish SAYMAZ. `TEZGAH_DATA_DIR=` (değer verilmemiş) kurulumda
   DATA_DIR="" olur ve `path.join("", "app.db")` = "app.db" — yani veritabanı
   sürecin ÇALIŞMA DİZİNİNE düşer. Aynı kurulum, farklı dizinden başlatıldığında
   farklı veriyi açar.

   BU KATMANIN KURALLARI KARAR İÇERMEZ — üçü de "bu değer bir kurulum hatasıdır"
   diyebildiğimiz, ürün sahibine sorulacak yanı olmayan biçim kurallarıdır:
     · ilan edilmiş ama BOŞ            → hata (yukarıdaki cwd yolu)
     · MUTLAK YOL DEĞİL                → hata (aynı kurulum, farklı veri)
     · SATIR SONU taşıyor              → hata (kopyala-yapıştır kazası)
   İlan edilmemişse bugünkü varsayılan yol BİREBİR korunur.

   KAPATAMADIĞIMIZ YARI, DÜRÜSTÇE: yukarıdaki ölçümdeki asıl senaryo — biçimi
   KUSURSUZ ama YANLIŞ YAZILMIŞ bir mutlak yol — bu kurallarla YAKALANMAZ ve
   yakalanamaz: "boş veri dizini" ile "ilk açılış" birbirinden ancak bir ÜRÜN
   KARARIYLA ayrılır (boş veriyle açılan kurulum durmalı mı, uyarmalı mı?).
   Karar ürün sahibindedir; bulgu açık kaydedilmiştir. Bu dosya yaranın
   kapatılabilen üçte ikisini kapatır, üçte birini GÖRÜNÜR bırakır. */

import path from "node:path";

export const VERI_DIZINI_ENV = "TEZGAH_DATA_DIR";

/**
 * Veri dizini ilanı — ortam her çağrıda yeniden okunur.
 *
 * DEĞER DONDURULMAZ: `kurulum-dogrulama.ts`'in kayıtlı sözleşmesi budur —
 * denetim yalnız doğrular, kurulumu yeniden başlatmaya zorlamaz.
 *
 * @param varsayilan ilan edilmemişken kullanılacak yol (bugünkü üretim yolu)
 * @returns kullanılacak veri dizini — ilan edilmişse HAM değer (normalize
 *   EDİLMEZ: `path.join(DATA_DIR, …)` çağrılarının çıktısı birebir kalsın)
 */
export function veriDiziniIlani(varsayilan: string): string {
  const ham = process.env[VERI_DIZINI_ENV];
  if (ham === undefined) return varsayilan;

  if (ham.trim() === "") {
    throw new Error(
      `${VERI_DIZINI_ENV} ilan edilmiş ama boş — veritabanı çalışma dizinine düşerdi; ` +
        `değeri yazın ya da değişkeni tamamen kaldırın`,
    );
  }
  if (/[\r\n]/.test(ham)) {
    throw new Error(`${VERI_DIZINI_ENV} satır sonu taşıyor`);
  }
  if (!path.isAbsolute(ham)) {
    throw new Error(
      `${VERI_DIZINI_ENV} mutlak yol olmalı (verilen: ${JSON.stringify(ham)}) — ` +
        `göreli yol, aynı kurulumun farklı dizinden başlatıldığında farklı veriyi açmasına yol açar`,
    );
  }
  return ham;
}
