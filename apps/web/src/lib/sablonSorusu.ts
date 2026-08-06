/* ŞABLON ADI — KAYIT DEFTERİNDEN OKUNUR (K-1/A, tek tık akışı).

   ÖLÇÜLEN YARA (`2026-08-06-sablon-secim-sorusu`): seçim sorusunun metni
   i18n'de ELLE yazılıydı — "Tamam = Resimli Izgara, İptal = Premium Liste" —
   ve sistemde "Premium Liste" diye bir ad YOKTU (gerçek ad "Premium Yazılı
   Menü"). Elle tutulan kopya ilandan çoktan ayrışmıştı. Ad artık tek
   kaynaktan, kayıt defterinden gelir.

   İKİLİ SORU KALDIRILDI (2026-08-06, N-seçenekli seçici paketi): bu dosya bir
   zamanlar `window.confirm` için "Tamam = X, İptal = Y" metnini ve onay→kimlik
   çevirisini de taşıyordu. İkisi de artık YOK, çünkü tüketicisi yok:
   `components/SablonSecici.tsx` her seçeneği kendi düğmesi olarak çizer ve
   "Vazgeç" gerçekten vazgeçer. Ölü sözleşme bırakmak bu deponun tekrar tekrar
   ödediği bedeldir — kaldırıldı, taşınmadı. */

import { TEMPLATES } from "@tezgah/templates";

/**
 * Şablon kimliğinin operatöre görünen adı.
 *
 * Kayıtsız kimlik (fabrika/generated) için kimliğin kendisi döner — uydurma
 * ad üretmek, olmayan bir şablonu varmış gibi göstermek olurdu.
 */
export function sablonAdi(tid: string): string {
  return TEMPLATES[tid]?.manifest.name_tr ?? tid;
}
