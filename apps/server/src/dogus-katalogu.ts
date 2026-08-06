/* YENİ MÜŞTERİNİN DOĞUŞ KATALOĞU (K-1/D — sektörsüz dil).

   ÖLÇÜLEN YARA (bu turda komutla, üstelik kanıt ekran görüntüsünde de görünür):
   `CatalogSchema.footnote_fr` bir Zod `.default()` taşır —

     "Prix nets en euros — Liste des allergènes disponible sur demande."

   Yani bu cümleyi kimse YAZMAZ; katalog alanı boş bırakılan HER müşteriye
   kendiliğinden gelir ve `catalog_json`'a yazılır. Üç varsayımı birden ilan
   eder: dil FRANSIZCA · para birimi EURO · iş RESTORAN (alerjen listesi).

   NEREYE ULAŞIR (ilandan sayıldı, tahmin değil): dipnot slotu dört yerde
   bağlıdır — `parts/chrome-slots.ts` (menu-grid-cells + menu-liste-premium),
   `menu-trifold`, `flyer` ve fabrika şablonu. **flyer bir MATBAA ürünüdür**
   (SIPARIS_MATERYALI × HEDEF_SEKTOR); yani yara menü ailesinin dışına çıkar:
   bir matbaacının bastığı flyer'ın altında Fransızca alerjen satırı durur.
   K-2 kanıt turunda aynı cümle Türk bir tabelacı müşterinin A4 yüzeyinde
   ölçülmüştü (TL fiyat, `menu_language=tr`, iş kolu tabela).

   BU KATMAN NE YAPAR: doğuş anındaki dipnotu KURULUM İLANINA bağlar.
   · yapılandırma YOK (`kaynak: "varsayilan"`) → bugünkü metin BİREBİR
   · `menu-uretici` etkin → bugünkü metin BİREBİR
   · menü üretmeyen kurulum → dipnot BOŞ doğar

   NE YAPMAZ — VE BU BİLİNÇLİ: bir tabelacının/matbaacının dipnotunda NE
   YAZMASI GEREKTİĞİ bir İÇERİK KARARIDIR ve ürün sahibindedir (K-1'de açıkça
   açık bırakıldı). Bu katman yeni cümle UYDURMAZ; yalnız sistemin kimsenin
   yazmadığı bir cümleyi müşteri adına İDDİA ETMESİNİ durdurur. Yokluk bir
   içerik kararı değildir; yanlış cümle ise kararın ta kendisidir.

   MEVCUT MÜŞTERİLERE DOKUNMAZ: dipnot doğuşta `catalog_json`'a yazılır ve
   orada yaşar. Bu katman yalnız DOĞUŞU değiştirir — hiçbir kayıt geriye
   dönük düzenlenmez (geri döndürülemez veri ürün sahibinin kararıdır).
   Operatör dipnotu katalog ekranından her zaman yazabilir; boş doğmak,
   yazılamaz demek değildir.

   SLOT ZORUNLU DEĞİL (ölçüldü): `chrome-slots.ts`'te dipnotun `gereklilik`
   ilanı YOKTUR — boş dipnot `empty-required` blocker'ı DOĞURMAZ ve üretim
   kapısını kapatmaz. Zorunlu olsaydı bu paket, tabelacı kurulumunda export'u
   kilitleyen bir regresyon olurdu. */

import { defaultCatalog, type Catalog } from "@tezgah/shared";
import type { IsKollariIlani } from "./is-kollari.js";

/** Dipnot varsayılanının menü üreticisine bağlı olduğu iş kolu. */
export const DIPNOT_IS_KOLU = "menu-uretici";

/**
 * Yeni müşterinin başlangıç kataloğu.
 *
 * @param ilan kurulumun iş kolu ilanı (`isKollariIlani()`)
 * @param temel enjekte edilebilir taban — testler ilanın kendisini değil,
 *   BU KATMANIN kuralını ölçebilsin diye (şema varsayılanı değişirse kural
 *   testleri sessizce anlamsızlaşmasın)
 */
export function dogusKatalogu(ilan: IsKollariIlani, temel: Catalog = defaultCatalog()): Catalog {
  /* Yapılandırılmamış kurulum: tek operatörlü yerel kurulum hiçbir şey
     yapmadan bugünkü davranışı görmeye devam eder. */
  if (ilan.kaynak === "varsayilan") return temel;
  if ((ilan.aktif as readonly string[]).includes(DIPNOT_IS_KOLU)) return temel;
  return { ...temel, footnote_fr: "" };
}
