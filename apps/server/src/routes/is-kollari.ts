/* Kurulumun iş kolu ilanı ucu (K-1/C modül sınırı) — SALT OKUNUR.
   Arayüz şablon seçicisini bununla daraltır; ayrıntılı gerekçe
   ../is-kollari.ts başlığındadır. */

import type { FastifyInstance } from "fastify";
import { isKollariIlani } from "../is-kollari.js";

export function isKollariRoutes(app: FastifyInstance): void {
  app.get("/api/is-kollari", async () => isKollariIlani());
}
