/* Sektör paketi servisi — F7-B1. Kod kayıt defterini (SECTOR_PACKS) servis eder;
   içerik F7-B2'de düşer (şu an []). intake UI (F7-C) bunu tüketir. */

import type { FastifyInstance } from "fastify";
import { SECTOR_PACKS } from "@tezgah/shared";

export function sectorRoutes(app: FastifyInstance): void {
  app.get("/api/sectors", async () => SECTOR_PACKS);
}
