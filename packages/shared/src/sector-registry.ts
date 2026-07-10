/* Sektör paketi kayıt defteri — GET /api/sectors bunu servis eder. İçerik F7-B2
   tohum verisinden gelir (sector-seed.ts); veri↔kayıt ayrı. COMMON_QUESTIONS da
   buradan re-export edilir (tek kaynak). */

import { SectorPackSchema, type SectorPack } from "./sector.js";
import { SECTOR_PACKS_DATA, COMMON_QUESTIONS } from "./sector-seed.js";

export const SECTOR_PACKS: SectorPack[] = SECTOR_PACKS_DATA;
export { COMMON_QUESTIONS };

/* Yük-zamanı koruması: her paket şemadan geçmeli (bozuk paket import'ta patlar —
   sessiz kabul yok, kabul #1). */
for (const pack of SECTOR_PACKS) SectorPackSchema.parse(pack);
