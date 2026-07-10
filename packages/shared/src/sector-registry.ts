/* Sektör paketi kayıt defteri — F7-B1. GET /api/sectors bunu servis eder.
   ŞU AN BOŞ: gerçek paketler (kebap/pizza/lokanta/café/pastane) F7-B2'de saf veri
   olarak eklenir (kullanıcı onayı bekliyor). Schema dosyası (sector.ts) kirlenmez;
   içerik yalnız buraya düşer. */

import { SectorPackSchema, type SectorPack } from "./sector.js";

export const SECTOR_PACKS: SectorPack[] = [];

/* Yük-zamanı koruması: F7-B2 içeriği eklendiğinde her paket şemadan geçmeli
   (bozuk paket import'ta patlar — sessiz kabul yok). Boşken no-op. */
for (const pack of SECTOR_PACKS) SectorPackSchema.parse(pack);
