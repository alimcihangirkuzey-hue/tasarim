/* PRESET KAPSAMI — kurulumun iş kollarına göre açılış takımı (K-1/A × K-1/C).

   ÖLÇÜLEN YARA: "Açılış Takımı" preseti dört SABİT kalem üretir — menü (a3) ·
   flyer (21x21) · sadakat kartı · vitrophanie. Bu dördünün hedef iş kolları
   ilandan okununca (SIPARIS_MATERYALI × HEDEF_SEKTOR) şu çıkıyor:

     menu → menu-uretici · flyer → matbaa · fidelite → matbaa · vitrophanie → cam-giydirme

   Yani `tabelaci` ve `tekstil-baski` iş kollarına DÜŞEN TEK KALEM YOK. Modül
   bir tabelacıya kiralanıp (TEZGAH_IS_KOLLARI=tabelaci) operatör "Açılış
   Takımı"na bastığında, hiç yapmadığı dört işten oluşan bir proje açılıyordu.
   K-1/A'nın "tek tıkla bitir" kaldıracı, o kurulumda tam tersine çalışıyordu:
   tek tıkla dört adet çöp kalem.

   AYNI SINIFIN ÜÇÜNCÜ YERİ: 7.1/481 "kullanıcı yalnızca yaptığı işi görür"
   önce şablon seçicisinde, sonra sipariş türü seçicilerinde uygulanmıştı.
   Preset, seçenek SUNMAYAN ama iş ÜRETEN bir yüzeydir — daha da doğrudan.

   VARSAYILAN DAVRANIŞ BİREBİR: yapılandırma yoksa (kaynak "varsayilan") HİÇBİR
   süzme yapılmaz; bugünkü dört kalem aynen üretilir.

   KAÇIŞ KAPISI AYNI: iş kolundan bağımsız tür (siparisSektoru null — bugün
   `diger`) her kurulumda kalır; gorunurTurler ile aynı sözleşme.

   YENİ PRESET İCAT EDİLMEZ: "bir tabelacının açılış takımında ne olmalı"
   sorusunun cevabı ÜRÜN KARARIDIR (K-1'de takım içerikleri açık bırakılmadı,
   hiç sorulmadı bile). Bu katman yalnız DARALTIR; boş kalan kurulumda uç
   sessizce boş proje açmaz, gerekçesiyle reddeder (rota). */

import { OPENING_KIT, type PresetItem } from "@tezgah/shared";
import { siparisSektoru } from "@tezgah/templates/identity";
import { isKollariIlani, type IsKollariIlani } from "./is-kollari.js";

/**
 * Bu kurulumda üretilecek açılış takımı kalemleri — ilan sırasıyla.
 *
 * @param ilan kurulumun iş kolu ilanı (varsayılan: ortamdan okunur)
 * @param kalemler preset kalemleri (varsayılan: OPENING_KIT) — enjekte
 *   edilebilir olması `isKollariIlani(ham)` ile aynı gerekçedir: kural,
 *   bugünkü takımın içeriğinden BAĞIMSIZ sınanabilmelidir.
 */
export function acilisTakimiKalemleri(
  ilan: IsKollariIlani = isKollariIlani(),
  kalemler: readonly PresetItem[] = OPENING_KIT.items
): PresetItem[] {
  if (ilan.kaynak === "varsayilan") return [...kalemler];
  return kalemler.filter((k) => {
    const s = siparisSektoru(k.product_type);
    return s === null || ilan.aktif.includes(s);
  });
}
