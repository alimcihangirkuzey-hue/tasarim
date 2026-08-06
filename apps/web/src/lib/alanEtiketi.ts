/* ALAN ETİKETLERİ KURULUMUN İŞ KOLUNA GÖRE (K-1/D — sektörsüz dil).

   ÖLÇÜLEN YARA: `client.menu_language` arayüzde "Menü dili" diye
   etiketleniyor (`i18n/tr.json`) ama alanın kendisi menüye ait DEĞİL. Bu
   turda tüketicileri sayıldı, varsayılmadı:

     · `parts/PageChrome.tsx`  → HER şablonun başlık chrome'u
     · `pages/MockupPage.tsx`  → filigran metni (kendi yorumu: "çıktı dilini izler")
     · `routes/digital-menu.ts`, `routes/intake.ts` → dijital menü + tohumlama

   Yani alan, kurulumun ÇIKTI DİLİDİR ve bir tabelacının tabelasının başlık
   chrome'unu da o belirler. Deponun kendi metinleri de öyle diyor:
   `migrations.ts` "menü ÇIKTI dili", MockupPage "ÇIKTI dilini izler" ve
   kurulum ilanı doğrudan `TEZGAH_CIKTI_DILI` adını taşıyor. Yani doğru ad
   sistemde ZATEN VAR; yalnız operatörün gördüğü etiket eski kalmış.

   NE YAPILMADI — VE BU BİLİNÇLİ: ALAN ADI (`menu_language`) DEĞİŞTİRİLMEDİ.
   Şema adını değiştirmek v13 migration'ı ister ve bu, geri döndürülemez veri
   sınıfına girer — ürün sahibinin kararıdır (TODO'da kayıtlı). Bu katman
   yalnız GÖRÜNEN ETİKETİ kurulumun ilanına bağlar; hiçbir satır taşınmaz.

   MEKANİZMA KİMLİK-BİLGİSİ-KAPILI, DEĞER BOŞ: kaynak `TEZGAH_IS_KOLLARI`
   ilanıdır (`dogusKatalogu` emsali — orada dipnotun DEĞERİ, burada bir
   ETİKET). Yapılandırma yoksa ya da kurulum menü üretiyorsa etiket BUGÜNKÜ
   metnin BİREBİR aynısıdır; menü üretmeyen kurulumda sektörsüz ada döner.
   İKİNCİ BİR TABLO YOK: menü iş kolu `HEDEF_SEKTOR.menu`'dan okunur. */

import { HEDEF_SEKTOR } from "@tezgah/templates/identity";
import type { Sektor } from "@tezgah/templates/identity";
import { t } from "../i18n";

/** Menü üreten iş kolu — ilandan türetilir, elle yazılmaz. */
export const MENU_IS_KOLU: Sektor = HEDEF_SEKTOR.menu;

/**
 * Kurulum menü üretiyor mu?
 *
 * @param aktif undefined → BİLİNMİYOR sayılır ve bugünkü davranış korunur
 *   (yapılandırma yapılmamış kurulum ve uç henüz yanıtlamamışken aynı yol).
 *   Bilinmezlikte sektörsüz ada dönmek, menü işletmesine bir yükleme anı
 *   boyunca yanlış etiket göstermek olurdu.
 */
export function menuUretiyorMu(aktif: readonly Sektor[] | undefined): boolean {
  return aktif === undefined || aktif.includes(MENU_IS_KOLU);
}

/**
 * Çıktı dili alanının operatöre görünen etiketi.
 *
 * Menü üreten kurulumda BUGÜNKÜ metin birebir; üretmeyende sektörsüz ad.
 */
export function ciktiDiliEtiketi(aktif: readonly Sektor[] | undefined): string {
  return menuUretiyorMu(aktif) ? t("intake.menu_lang") : t("intake.output_lang");
}
