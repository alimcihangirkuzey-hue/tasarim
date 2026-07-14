/* T3 PART-B adım-1 — Render Contract v1 (B↔C) şim çekirdeği. SAF/testlenebilir
   (db/fastify yok). Spec: MULTI_REPO v1.2 §2 — "POST /render {doc, variant,
   watermark, target} → {file, meta}; HMAC imza; iki tarafta contract test".

   v1 alan semantiği (C-tarafı, şim):
   - doc: TEZGAH belge id'si (C'de yaşayan document — styva FLYER M7 render'ı
     bu kapıdan çağırır).
   - variant: "print" | "preview" (mevcut /print rotası varyantları — engine
     davranışı birebir; yeni render yolu AÇILMAZ, M3).
   - watermark: v1 şiminde KABUL edilir ama UYGULANMAZ (engine'de taslak-filigran
     yok; mockup damgası ayrı kanal, ADR-005) — yanıt meta'sında
     watermark_applied:false + not olarak GÖRÜNÜR (M8, sessiz düşme yok).
   - target: v1'de yalnız "pdf" (başkası 400 — fail-loud).

   HMAC v1: imza = HMAC-SHA256(canonicalRenderString(req), secret), hex;
   header `x-render-signature`. Kanonik dize alan-sıralı ve belgelidir — iki
   taraf aynı kanonikleştirmeyi uygular (gövde-bayt bağımsız, JSON anahtar
   sırası tuzağı yok). */

import crypto from "node:crypto";
import { z } from "zod";

export const RENDER_CONTRACT_V = 1;

export const RenderRequestV1Schema = z.object({
  doc: z.string().min(1),
  variant: z.enum(["print", "preview"]),
  watermark: z.boolean().default(false),
  target: z.enum(["pdf"]).default("pdf"),
});
export type RenderRequestV1 = z.infer<typeof RenderRequestV1Schema>;

/** Kanonik imza dizesi — deterministik, alan-sıralı (contract v1 tanımı). */
export function canonicalRenderString(req: RenderRequestV1): string {
  return `render.v${RENDER_CONTRACT_V}|doc=${req.doc}|variant=${req.variant}|watermark=${req.watermark}|target=${req.target}`;
}

export function signRender(req: RenderRequestV1, secret: string): string {
  return crypto.createHmac("sha256", secret).update(canonicalRenderString(req), "utf8").digest("hex");
}

/** Zamanlama-güvenli doğrulama; biçimsiz/boş imza → false (fırlatmaz). */
export function verifyRender(req: RenderRequestV1, signature: string | undefined, secret: string): boolean {
  if (!signature || typeof signature !== "string") return false;
  const expected = signRender(req, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
