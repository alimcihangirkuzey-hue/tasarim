/* Kurulum künyesi ucu (K-1/C modül sınırı) — SALT OKUNUR.
   Basılı yüzeyler altbilgi künyesini bundan okur; ayrıntılı gerekçe ve
   ölçülen tavan aritmetiği ../kurulum-kunyesi.ts başlığındadır. */

import type { FastifyInstance } from "fastify";
import { kurulumKunyesi } from "../kurulum-kunyesi.js";

export function kurulumKunyesiRoutes(app: FastifyInstance): void {
  app.get("/api/kurulum-kunyesi", async () => kurulumKunyesi());
}
