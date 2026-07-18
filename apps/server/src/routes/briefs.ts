/* F1 pilot P4 — BRIEF YAŞAM DÖNGÜSÜ uçları (ilk kez).

   Durum değişimi TEK KAPIDAN geçer: shared/f1-state.ts canTransitionF1.
   Guard-atlamalı yol YOKTUR — PATCH durum yazamaz, yalnız /transition ucu
   yazar ve o da guard'a sorar.

   P7'YE KİLİTLİ KENARLAR: DESIGN_IN_PROGRESS→READY_FOR_PRODUCTION_REVIEW ve
   →PRODUCTION_READY bu pakette AÇILMAZ; uç `not_yet_available` döner (guard
   zaten geçse bile). Üretim kapısının arkası (Pack mühür · üretim işi ·
   operatör kuyruğu) P7'nin işi.

   idempotency_key: elle açılan brief'te SUNUCU üretir (UNIQUE hazır); dışarıdan
   gelen anahtarın anlamı (SWISS tekrar-gönderimi) P6'da bağlanır. */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  canTransitionF1,
  isF1State,
  newId,
  nowISO,
  toF1Readiness,
  type F1State,
} from "@tezgah/shared";
import { db } from "../db.js";
import { briefCompleteness, briefExtras, type BriefRow } from "../brief-view.js";

/** P4'te canlı kenarlar; kalanlar P7 kutusuna kilitli */
const LIVE_TARGETS: readonly F1State[] = ["INCOMPLETE", "READY_FOR_DESIGN", "DESIGN_IN_PROGRESS"];
const LOCKED_TARGETS: readonly F1State[] = ["READY_FOR_PRODUCTION_REVIEW", "PRODUCTION_READY"];

const CreateSchema = z.object({
  request_type: z.enum(["menu", "garment"]).default("menu"),
  source_system: z.string().trim().min(1).max(120).default("tezgah_manual"),
  source_tenant_ref: z.string().trim().max(120).optional(),
  source_request_ref: z.string().trim().max(120).optional(),
  customer_ref: z.string().trim().max(60).optional(),
  brand_ref: z.string().trim().max(120).optional(),
  requested_publications: z.array(z.string().trim().min(1)).default([]),
  content_reference: z.string().trim().max(400).optional(),
  language_requirements: z.array(z.string().trim().min(1).max(10)).default([]),
  delivery_deadline: z.string().trim().max(40).optional(),
  requester_notes: z.string().max(4000).default(""),
  callback_reference: z.string().trim().max(400).optional(),
  /** dışarıdan gelirse kullanılır (P6 zemini); yoksa sunucu üretir */
  idempotency_key: z.string().trim().min(1).max(200).optional(),
  spec_values: z.record(z.unknown()).default({}),
});

const PatchSchema = z.object({
  customer_ref: z.string().trim().max(60).nullable().optional(),
  brand_ref: z.string().trim().max(120).nullable().optional(),
  requested_publications: z.array(z.string().trim().min(1)).optional(),
  content_reference: z.string().trim().max(400).nullable().optional(),
  language_requirements: z.array(z.string().trim().min(1).max(10)).optional(),
  delivery_deadline: z.string().trim().max(40).nullable().optional(),
  requester_notes: z.string().max(4000).optional(),
  /** spec alanları BİRLEŞTİRİLİR (yalnız verilen anahtarlar değişir) */
  spec_values: z.record(z.unknown()).optional(),
});

const TransitionSchema = z.object({
  to: z.string().trim().min(1),
  reason: z.string().trim().max(2000).optional(),
  recordedBy: z.string().trim().max(120).optional(),
});

function findBrief(id: string): BriefRow | null {
  return (db.prepare("SELECT * FROM briefs WHERE id = ?").get(id) as BriefRow | undefined) ?? null;
}

function writeAudit(input: {
  brief_id: string;
  event_type: string;
  reason?: string | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  payload?: unknown;
}): void {
  db.prepare(
    `INSERT INTO brief_audit (id, brief_id, event_type, warning_code, acknowledged_by,
       acknowledged_at, reason, source_file_version, payload_json, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?)`
  ).run(
    newId("aud"),
    input.brief_id,
    input.event_type,
    input.acknowledged_by ?? null,
    input.acknowledged_at ?? null,
    input.reason ?? null,
    JSON.stringify(input.payload ?? {}),
    nowISO()
  );
}

/** Uçların TEK yanıt biçimi: brief + eksiksizlik + izinli sonraki adımlar */
export function briefView(brief: BriefRow): Record<string, unknown> {
  const completeness = briefCompleteness(db, brief);
  const readiness = toF1Readiness(completeness);
  const state = brief.status as F1State;
  const next = LIVE_TARGETS.filter((to) => {
    if (to === state) return false;
    return canTransitionF1({ from: state, to, readiness }).ok;
  });
  return {
    brief: {
      ...brief,
      requested_publications: JSON.parse(brief.requested_publications_json || "[]"),
      language_requirements: JSON.parse(brief.language_requirements_json || "[]"),
      spec_values: JSON.parse(brief.spec_values_json || "{}"),
    },
    completeness,
    /** F1.1/F1.2: neden listesi İSİMLİ ve kalıcı */
    missing: completeness.missing,
    next_states: next,
    locked_states: LOCKED_TARGETS,
    ...briefExtras(db, brief),
  };
}

export function briefRoutes(app: FastifyInstance): void {
  /* Oluştur — DRAFT doğar */
  app.post("/api/briefs", async (req, reply) => {
    const body = CreateSchema.parse(req.body ?? {});
    if (body.customer_ref) {
      const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(body.customer_ref);
      if (!client) return reply.code(404).send({ error: "client_not_found" });
    }
    const now = nowISO();
    const row: BriefRow = {
      id: newId("brf"),
      source_system: body.source_system,
      source_tenant_ref: body.source_tenant_ref ?? null,
      source_request_ref: body.source_request_ref ?? null,
      customer_ref: body.customer_ref ?? null,
      brand_ref: body.brand_ref ?? null,
      request_type: body.request_type,
      requested_publications_json: JSON.stringify(body.requested_publications),
      content_reference: body.content_reference ?? null,
      language_requirements_json: JSON.stringify(body.language_requirements),
      delivery_deadline: body.delivery_deadline ?? null,
      requester_notes: body.requester_notes,
      callback_reference: body.callback_reference ?? null,
      idempotency_key: body.idempotency_key ?? `manual:${newId("idm")}`,
      status: "DRAFT",
      spec_values_json: JSON.stringify(body.spec_values),
      created_at: now,
      updated_at: now,
    };
    try {
      db.prepare(
        `INSERT INTO briefs (id, source_system, source_tenant_ref, source_request_ref, customer_ref,
           brand_ref, request_type, requested_publications_json, content_reference,
           language_requirements_json, delivery_deadline, requester_notes, callback_reference,
           idempotency_key, status, spec_values_json, created_at, updated_at)
         VALUES (@id, @source_system, @source_tenant_ref, @source_request_ref, @customer_ref,
           @brand_ref, @request_type, @requested_publications_json, @content_reference,
           @language_requirements_json, @delivery_deadline, @requester_notes, @callback_reference,
           @idempotency_key, @status, @spec_values_json, @created_at, @updated_at)`
      ).run(row);
    } catch (err) {
      /* F1.6: aynı idempotency_key ikinci kez → MEVCUT brief döner, yenisi doğmaz */
      if (String(err).includes("UNIQUE")) {
        const existing = db
          .prepare("SELECT * FROM briefs WHERE idempotency_key = ?")
          .get(row.idempotency_key) as BriefRow | undefined;
        if (existing) {
          reply.code(200);
          return { ...briefView(existing), idempotent_hit: true };
        }
      }
      throw err;
    }
    writeAudit({
      brief_id: row.id,
      event_type: "brief_created",
      payload: { request_type: row.request_type, source_system: row.source_system },
    });
    reply.code(201);
    return briefView(row);
  });

  /* Tek brief — durum + eksiksizlik + isimli eksikler */
  app.get<{ Params: { id: string } }>("/api/briefs/:id", async (req, reply) => {
    const brief = findBrief(req.params.id);
    if (!brief) return reply.code(404).send({ error: "brief_not_found" });
    return briefView(brief);
  });

  /* Alan güncelleme — DURUM YAZILAMAZ (yalnız /transition) */
  app.patch<{ Params: { id: string } }>("/api/briefs/:id", async (req, reply) => {
    const brief = findBrief(req.params.id);
    if (!brief) return reply.code(404).send({ error: "brief_not_found" });
    const patch = PatchSchema.parse(req.body ?? {});

    if (patch.customer_ref) {
      const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(patch.customer_ref);
      if (!client) return reply.code(404).send({ error: "client_not_found" });
    }

    const specNext = {
      ...(JSON.parse(brief.spec_values_json || "{}") as Record<string, unknown>),
      ...(patch.spec_values ?? {}),
    };
    const next: BriefRow = {
      ...brief,
      customer_ref: patch.customer_ref === undefined ? brief.customer_ref : patch.customer_ref,
      brand_ref: patch.brand_ref === undefined ? brief.brand_ref : patch.brand_ref,
      requested_publications_json:
        patch.requested_publications === undefined
          ? brief.requested_publications_json
          : JSON.stringify(patch.requested_publications),
      content_reference:
        patch.content_reference === undefined ? brief.content_reference : patch.content_reference,
      language_requirements_json:
        patch.language_requirements === undefined
          ? brief.language_requirements_json
          : JSON.stringify(patch.language_requirements),
      delivery_deadline:
        patch.delivery_deadline === undefined ? brief.delivery_deadline : patch.delivery_deadline,
      requester_notes: patch.requester_notes ?? brief.requester_notes,
      spec_values_json: JSON.stringify(specNext),
      updated_at: nowISO(),
    };
    db.prepare(
      `UPDATE briefs SET customer_ref=@customer_ref, brand_ref=@brand_ref,
         requested_publications_json=@requested_publications_json,
         content_reference=@content_reference,
         language_requirements_json=@language_requirements_json,
         delivery_deadline=@delivery_deadline, requester_notes=@requester_notes,
         spec_values_json=@spec_values_json, updated_at=@updated_at
       WHERE id=@id`
    ).run(next);

    writeAudit({
      brief_id: brief.id,
      event_type: "brief_updated",
      payload: { fields: Object.keys(patch) },
    });
    return briefView(next);
  });

  /* Durum geçişi — guard'dan GEÇEREK; kilitli hedefler 501 not_yet_available */
  app.post<{ Params: { id: string } }>("/api/briefs/:id/transition", async (req, reply) => {
    const brief = findBrief(req.params.id);
    if (!brief) return reply.code(404).send({ error: "brief_not_found" });
    const body = TransitionSchema.parse(req.body ?? {});

    if (!isF1State(body.to)) {
      return reply.code(400).send({ error: "unknown_state", detail: body.to });
    }
    if (LOCKED_TARGETS.includes(body.to)) {
      return reply.code(501).send({
        error: "not_yet_available",
        detail: `${body.to} P7 kutusunda açılır (üretim incelemesi/onay kapısı)`,
      });
    }

    const completeness = briefCompleteness(db, brief);
    const verdict = canTransitionF1({
      from: brief.status as F1State,
      to: body.to,
      readiness: toF1Readiness(completeness),
      regression:
        body.reason && body.recordedBy
          ? { reason: body.reason, recordedBy: body.recordedBy }
          : null,
    });
    if (!verdict.ok) {
      return reply.code(409).send({
        error: "transition_blocked",
        code: verdict.code,
        detail: verdict.detail,
        missing: completeness.missing,
      });
    }

    const now = nowISO();
    db.prepare("UPDATE briefs SET status = ?, updated_at = ? WHERE id = ?").run(body.to, now, brief.id);
    writeAudit({
      brief_id: brief.id,
      event_type: "state_changed",
      reason: body.reason ?? null,
      acknowledged_by: body.recordedBy ?? null,
      acknowledged_at: body.recordedBy ? now : null,
      payload: {
        from: brief.status,
        to: body.to,
        direction: verdict.direction,
        production_completeness: completeness.productionCompleteness,
      },
    });
    return briefView({ ...brief, status: body.to, updated_at: now });
  });
}
