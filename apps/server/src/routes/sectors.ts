/* Sektör paketi servisi — F7-B1. Kod kayıt defterini (SECTOR_PACKS) servis eder;
   içerik F7-B2 ile geldi (5 paket / 39 kategori / 140 item — "şu an []" notu
   bayattı, journal 2026-07-28-taslak-yarasi-f7-defter). intake UI (F7-C) tüketir. */

import type { FastifyInstance } from "fastify";
import { SECTOR_PACKS } from "@tezgah/shared";

export function sectorRoutes(app: FastifyInstance): void {
  app.get("/api/sectors", async () => SECTOR_PACKS);
}
