/* Kimlik-yalnız alt-yol (C-P2; C-P1 backlog, TODO.md) — @tezgah/templates'in
   "./identity" giriş noktası. Yalnız manifest.ts modüllerini import eder;
   HİÇBİR index.tsx/Template.tsx'e (dolayısıyla react/jsx-runtime'a) dokunmaz.
   Sunucu bugün materyal türünden BAŞKA hiçbir şey istemiyor (routes/vector.ts,
   surfaces.ts — bkz. apps/server/src/material-routing.ts); bu yüzden yüzey
   yalnız o ihtiyacı karşılar (materialTypeOfOrNull), tam sorgu API'sini
   (materialTypeOf/listTemplatesByType/registeredMaterialTypes) TEKRARLAMAZ —
   ihtiyaç doğarsa eklenir (YAGNI; genişletmek her zaman additive'dir).

   TEK KAYNAK: aşağıdaki manifest'ler ana kayıt defterinin (../index.ts)
   AYNI manifest.ts dosyalarından gelir — ESM modül önbelleği aynı nesne
   referansını verir (index.test.ts "referans-eşitliği" testiyle kanıtlı);
   iki kayıt defteri arasında ayrı bir senkron invaryantı YAZILMAZ, gerek yok.

   KAPSAM SINIRI (bilinçli, journal'da kayıtlı): fabrika üretimi (generated/)
   BURADA YOK. Fabrika HEP type:"menu" beyan eder (C-P0 karar C-B-1); bu iki
   yönlendirme yardımcısı zaten "menu" türünü null'a çözüyor — kayıtlı/kayıtsız
   fark etmez (bkz. apps/server/src/material-routing.test.ts altın eşdeğerlik).
   Bu varsayım index.test.ts'teki YÜKSEK SESLİ nöbetçiyle kilitlidir: fabrika
   emit'i bir gün "menu" dışı tür yayarsa (ürün sahibi yetkisi ister, C-B-1
   emsali) o test PATLAR — sessizce eskimez. */

import { birlestirVeDogrula } from "../registry-core.js";
import type { MaterialType, TemplateManifest } from "../types.js";

/* Şiddet katmanı re-export'u (blocker-enforcement paketi): severity.ts yalnız
   TYPE-ONLY import taşır (silinir) — alt-yolun react'sız grafiği bozulmaz
   (esbuild metafile kanıtı paket kapanışında yeniden ölçüldü). Sunucunun
   export backstop'u isBlockerType'ı buradan okur. */
export { isBlockerType, severityOf, blockersOf, WARNING_SEVERITIES } from "../engine/severity.js";

import { manifest as menuGridCellsManifest } from "../menu-grid-cells/manifest.js";
import { manifest as menuListePremiumManifest } from "../menu-liste-premium/manifest.js";
import { manifest as menuTrifoldManifest } from "../menu-trifold/manifest.js";
import { manifest as flyerManifest } from "../flyer/manifest.js";
import { manifest as carteFideliteManifest } from "../carte-fidelite/manifest.js";
import {
  VITRO_BANDEAU_MANIFEST,
  VITRO_CENTRE_MANIFEST,
  VITRO_COLONNE_MANIFEST,
} from "../vitrophanie/manifest.js";
import { manifest as enseigneManifest } from "../enseigne/manifest.js";
import { manifest as garmentManifest } from "../garment/manifest.js";

const EL_YAZIMI: readonly TemplateManifest[] = [
  menuGridCellsManifest,
  menuListePremiumManifest,
  menuTrifoldManifest,
  flyerManifest,
  carteFideliteManifest,
  VITRO_BANDEAU_MANIFEST,
  VITRO_CENTRE_MANIFEST,
  VITRO_COLONNE_MANIFEST,
  enseigneManifest,
  garmentManifest,
];

/** Kimlik-yalnız kayıt defteri — generated/ BİLEREK yok (yukarıdaki kapsam notu) */
export const MANIFESTS: Record<string, TemplateManifest> = birlestirVeDogrula(
  {},
  EL_YAZIMI,
  (m) => m
);

/** Kayıtsız id için null döner, FIRLATMAZ — ana registry'deki materialTypeOfOrNull
    ile aynı sözleşme (Object.hasOwn: prototip zinciri kimlik değildir). */
export function materialTypeOfOrNull(id: string): MaterialType | null {
  return Object.hasOwn(MANIFESTS, id) ? MANIFESTS[id].type : null;
}
