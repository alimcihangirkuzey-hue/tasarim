/* F1 pilot P3 — BRIEF SINIRI: dosya kabul + istisna-audit uçları (spec §5).

   Genel /api/assets ucundan FARKI (bilinçli, rapora yazıldı): burada spec v1
   tür listesi uygulanır (PNG · JPG · SVG · PDF) → webp burada REDDEDİLİR;
   genel uçta serbest kalır (mevcut tüketiciler kırılmasın). Her karar
   brief_audit'e satır yazar — denetim izi brief sınırındadır.

   PDF: YALNIZ-SAKLA yolu. v1'de sharp türevi üretilmez; bozukluk kontrolü
   %PDF imzası + boyut>0 ile yapılır, derin doğrulama YOK → açık BİLGİ notu
   (sessiz yokluk yasak — F3 keşif bulgusu G).

   APPEND-ONLY: bu modül brief_audit'e YALNIZ INSERT yapar; UPDATE/DELETE yolu
   yoktur (migrations.test.ts'teki repo taraması bunu korur).

   KAPSAM DIŞI (sonraki paketler): Brief OLUŞTURMA ucu (P4/P6) · dosya
   geçersizleşince DURUM GERİLEMESİ çağrısı (F1.7 tüketicisi) · UI. */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  canTransitionF1,
  classifyF1File,
  f1PolicyClassOf,
  f1UploadTypeFromMime,
  isF1Acknowledgeable,
  newId,
  nowISO,
  toF1Readiness,
  type F1PolicyVerdict,
  type F1State,
} from "@tezgah/shared";
import { db } from "../db.js";
import { ASSETS_DIR } from "../paths.js";
import { briefCompleteness, type BriefRow } from "../brief-view.js";
type BriefFileRow = {
  id: string;
  brief_id: string;
  asset_id: string;
  role: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
};

/** brief_files.role — spec dosya şartlarıyla (f1-spec.ts) birebir */
const RoleSchema = z.enum(["logo", "tasarim"]);

const AckSchema = z.object({
  acknowledged_by: z.string().trim().min(1, "acknowledged_by boş olamaz").max(120),
  reason: z.string().trim().min(1, "reason boş olamaz").max(2000),
  /** dosya sürümü bilinmiyorsa (dosyaya bağlı olmayan uyarı) verilmeyebilir */
  source_file_version: z.number().int().positive().optional(),
});

const InvalidateSchema = z.object({
  reason: z.string().trim().min(1, "reason boş olamaz").max(2000),
  recordedBy: z.string().trim().min(1, "recordedBy boş olamaz").max(120),
});

interface AuditInput {
  brief_id: string;
  event_type: string;
  warning_code?: string | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  reason?: string | null;
  source_file_version?: number | null;
  payload?: unknown;
}

/** brief_audit'e TEK yazma kapısı — yalnız INSERT (append-only sözleşmesi) */
function writeAudit(input: AuditInput): string {
  const id = newId("aud");
  db.prepare(
    `INSERT INTO brief_audit (id, brief_id, event_type, warning_code, acknowledged_by,
       acknowledged_at, reason, source_file_version, payload_json, created_at)
     VALUES (@id, @brief_id, @event_type, @warning_code, @acknowledged_by,
       @acknowledged_at, @reason, @source_file_version, @payload_json, @created_at)`
  ).run({
    id,
    brief_id: input.brief_id,
    event_type: input.event_type,
    warning_code: input.warning_code ?? null,
    acknowledged_by: input.acknowledged_by ?? null,
    acknowledged_at: input.acknowledged_at ?? null,
    reason: input.reason ?? null,
    source_file_version: input.source_file_version ?? null,
    payload_json: JSON.stringify(input.payload ?? {}),
    created_at: nowISO(),
  });
  return id;
}

function findBrief(id: string): BriefRow | null {
  return (db.prepare("SELECT * FROM briefs WHERE id = ?").get(id) as BriefRow | undefined) ?? null;
}

const notesOf = (v: F1PolicyVerdict) => ({
  rejects: v.rejects,
  warnings: v.warnings,
  infos: v.infos,
});

export function briefFileRoutes(app: FastifyInstance): void {
  /* Dosya yükleme — politika kapısı + brief_files + audit */
  app.post<{ Params: { id: string } }>("/api/briefs/:id/files", async (req, reply) => {
    const brief = findBrief(req.params.id);
    if (!brief) return reply.code(404).send({ error: "brief_not_found" });

    const mp = await req.file();
    if (!mp) return reply.code(400).send({ error: "file_missing" });

    const rawRole = mp.fields?.["role"] as { value?: unknown } | Array<{ value?: unknown }> | undefined;
    const roleValue = Array.isArray(rawRole) ? rawRole[0]?.value : rawRole?.value;
    const role = RoleSchema.safeParse(roleValue);
    if (!role.success) {
      return reply.code(400).send({ error: "invalid_role", detail: "role: logo | tasarim" });
    }

    const buf = await mp.toBuffer();
    const type = f1UploadTypeFromMime(mp.mimetype);

    /* Bulgu toplama — karar SAF katmanda (shared/file-policy.ts) verilir */
    let parsed = false;
    let width = 0;
    let height = 0;
    let deepValidation: boolean | undefined;
    if (type === "pdf") {
      parsed = buf.length > 4 && buf.subarray(0, 5).toString("latin1") === "%PDF-";
      deepValidation = false; /* v1: içerik derin doğrulanmaz → BİLGİ notu */
    } else if (type) {
      try {
        const meta = await (type === "svg" ? sharp(buf, { density: 150 }) : sharp(buf).rotate())
          .metadata();
        parsed = true;
        width = meta.width ?? 0;
        height = meta.height ?? 0;
      } catch {
        parsed = false;
      }
    }

    const verdict = classifyF1File({
      mime: mp.mimetype,
      size_bytes: buf.length,
      parsed,
      width_px: width,
      height_px: height,
      deep_validation_available: deepValidation,
      /* Renk profili hiçbir yükleme yolunda doğrulanmıyor → baskıya giden
         türlerde açık not (SVG'de gömülü profil kavramı yok → not üretilmez) */
      color_profile_verifiable: type && type !== "svg" ? false : undefined,
    });

    if (verdict.decision === "reject") {
      const primary = verdict.rejects[0];
      writeAudit({
        brief_id: brief.id,
        event_type: "file_rejected",
        warning_code: primary.code,
        reason: verdict.rejects.map((r) => r.detail_tr).join(" · "),
        payload: { role: role.data, filename: mp.filename, mime: mp.mimetype, ...notesOf(verdict) },
      });
      return reply
        .code(400)
        .send({ error: "policy_reject", code: primary.code, ...notesOf(verdict) });
    }

    /* Kabul: varlık kaydı + dosya. Brief dosyaları GALERİ TÜREVİ üretmez
       (thumb yok; orig+master aynı bayt) — üretim girdisidir. kind=logo olsa
       bile marka kitine BAĞLANMAZ: brief bir taleptir, marka kararı değil. */
    const assetId = newId("ast");
    const filename = `${assetId}.${type}`;
    await fs.writeFile(path.join(ASSETS_DIR, "orig", filename), buf);
    await fs.writeFile(path.join(ASSETS_DIR, "master", filename), buf);

    const now = nowISO();
    db.prepare(
      `INSERT INTO assets (id, client_id, kind, filename, width_px, height_px, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(assetId, brief.customer_ref, role.data === "logo" ? "logo" : "other", filename, width, height, now);

    const prev = db
      .prepare("SELECT MAX(version) AS v FROM brief_files WHERE brief_id = ? AND role = ?")
      .get(brief.id, role.data) as { v: number | null };
    const version = (prev.v ?? 0) + 1;

    const fileRow: BriefFileRow = {
      id: newId("bfl"),
      brief_id: brief.id,
      asset_id: assetId,
      role: role.data,
      version,
      status: "valid",
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      `INSERT INTO brief_files (id, brief_id, asset_id, role, version, status, created_at, updated_at)
       VALUES (@id, @brief_id, @asset_id, @role, @version, @status, @created_at, @updated_at)`
    ).run(fileRow);

    writeAudit({
      brief_id: brief.id,
      event_type: "file_accepted",
      source_file_version: version,
      payload: {
        role: role.data,
        asset_id: assetId,
        mime: mp.mimetype,
        type: verdict.type,
        ...notesOf(verdict),
      },
    });

    reply.code(201);
    return { file: fileRow, warnings: verdict.warnings, infos: verdict.infos };
  });

  /* Uyarı onayı — audit BEŞLİSİ tam dolu satır (K2) */
  app.post<{ Params: { id: string; code: string } }>(
    "/api/briefs/:id/warnings/:code/ack",
    async (req, reply) => {
      const brief = findBrief(req.params.id);
      if (!brief) return reply.code(404).send({ error: "brief_not_found" });

      const cls = f1PolicyClassOf(req.params.code);
      if (!cls) return reply.code(400).send({ error: "unknown_warning_code", code: req.params.code });
      if (!isF1Acknowledgeable(req.params.code)) {
        /* F1.5 rota düzeyi: REDDET istisnalanamaz; BİLGİ notu onay istemez */
        return reply.code(400).send({
          error: cls === "reject" ? "reject_not_acknowledgeable" : "info_not_acknowledgeable",
          code: req.params.code,
          detail:
            cls === "reject"
              ? "REDDET sınıfı kalem kayıtlı istisnayla kapatılamaz"
              : "Bilgilendirme notu onay gerektirmez",
        });
      }

      const body = AckSchema.parse(req.body ?? {});
      const auditId = writeAudit({
        brief_id: brief.id,
        event_type: "warning_acknowledged",
        warning_code: req.params.code,
        acknowledged_by: body.acknowledged_by,
        acknowledged_at: nowISO(),
        reason: body.reason,
        source_file_version: body.source_file_version ?? null,
        payload: { class: cls },
      });

      reply.code(201);
      return db.prepare("SELECT * FROM brief_audit WHERE id = ?").get(auditId);
    }
  );

  /* Dosya geçersizleştirme — F1.7 zemini (durum gerilemesi tüketici pakette) */
  app.patch<{ Params: { id: string; fileId: string } }>(
    "/api/briefs/:id/files/:fileId/invalidate",
    async (req, reply) => {
      const brief = findBrief(req.params.id);
      if (!brief) return reply.code(404).send({ error: "brief_not_found" });

      const file = db
        .prepare("SELECT * FROM brief_files WHERE id = ? AND brief_id = ?")
        .get(req.params.fileId, brief.id) as BriefFileRow | undefined;
      if (!file) return reply.code(404).send({ error: "file_not_found" });

      const body = InvalidateSchema.parse(req.body ?? {});
      const now = nowISO();
      db.prepare("UPDATE brief_files SET status = 'invalid', updated_at = ? WHERE id = ?").run(
        now,
        file.id
      );
      writeAudit({
        brief_id: brief.id,
        event_type: "file_invalidated",
        warning_code: "zorunlu_dosya_eksik",
        acknowledged_by: body.recordedBy,
        acknowledged_at: now,
        reason: body.reason,
        source_file_version: file.version,
        payload: { file_id: file.id, role: file.role, previous_status: file.status },
      });

      /* F1.7 BAĞI (P4 — P3'ün açık ucu): dosya geçersizleşince iş GERİ DÜŞER.
         Guard'dan GEÇEREK (kayıtlı gerileme: sebep + kaydeden); zaten DRAFT/
         INCOMPLETE ise ya da açık REDDET doğmadıysa durum değişmez. */
      const completeness = briefCompleteness(db, brief);
      const from = brief.status as F1State;
      let regressedTo: F1State | null = null;
      if (from !== "DRAFT" && from !== "INCOMPLETE" && completeness.openRejects > 0) {
        const verdict = canTransitionF1({
          from,
          to: "INCOMPLETE",
          readiness: toF1Readiness(completeness),
          regression: {
            reason: `dosya geçersizleşti (${file.role} v${file.version}): ${body.reason}`,
            recordedBy: body.recordedBy,
          },
        });
        if (verdict.ok) {
          db.prepare("UPDATE briefs SET status = 'INCOMPLETE', updated_at = ? WHERE id = ?").run(
            now,
            brief.id
          );
          writeAudit({
            brief_id: brief.id,
            event_type: "state_changed",
            acknowledged_by: body.recordedBy,
            acknowledged_at: now,
            reason: `dosya geçersizleşti (${file.role} v${file.version}): ${body.reason}`,
            payload: { from, to: "INCOMPLETE", direction: "backward", trigger: "file_invalidated" },
          });
          regressedTo = "INCOMPLETE";
        }
      }

      return { file: { ...file, status: "invalid", updated_at: now }, regressed_to: regressedTo };
    }
  );
}
