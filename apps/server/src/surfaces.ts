/* F8-A — müşteri yüzey profili yardımcıları. db-ENJEKTE EDİLEBİLİR (birim-test:
   :memory: db geçirilir; server route-harness'ı yok deseni bu şekilde aşılır).
   extractSurfaces SAF (db yok); upsertClientSurfaces db alır. */

import type { Database } from "better-sqlite3";
import {
  ChecklistSurfacesSchema,
  foldTr,
  newId,
  type ClientSurfaceDTO,
  type IntakeSurface,
} from "@tezgah/shared";

export interface ClientSurfaceRow {
  id: string;
  client_id: string;
  kind: string;
  label: string;
  w_cm: number | null;
  h_cm: number | null;
  note: string;
  source_intake_id: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToSurfaceDTO(r: ClientSurfaceRow): ClientSurfaceDTO {
  return {
    id: r.id,
    client_id: r.client_id,
    kind: r.kind as ClientSurfaceDTO["kind"],
    label: r.label,
    w_cm: r.w_cm,
    h_cm: r.h_cm,
    note: r.note,
    source_intake_id: r.source_intake_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/* checklist içinden yapısal yüzeyleri çıkar + DOĞRULA. surfaces anahtarı YOKsa
   boş (eski intake_records geriye uyumu); VARSA ChecklistSurfacesSchema.parse —
   bozuksa ZodError FIRLAR (çağıran route 400'e çevirir, transaction'dan ÖNCE →
   atomiklik: hiçbir şey yazılmaz). */
export function extractSurfaces(checklist: unknown): IntakeSurface[] {
  const raw =
    checklist && typeof checklist === "object"
      ? (checklist as Record<string, unknown>)["surfaces"]
      : undefined;
  if (raw === undefined) return [];
  return ChecklistSurfacesSchema.parse(raw);
}

/* UPSERT (client_id + foldTr(label)): aynı etiket yeniden ölçülürse mevcut satır
   güncellenir (w/h/note + updated_at + son source_intake_id; id/created_at
   korunur — "bir kez gir, hep kullan" çift kayıt üretmez). Aynı commit'te iki
   kez aynı label → ikincisi ilkini günceller (byFold'a insert sonrası eklenir).
   Çağıran transaction İÇİNDE çalıştırır (atomik). */
export function upsertClientSurfaces(
  db: Database,
  clientId: string,
  surfaces: IntakeSurface[],
  sourceIntakeId: string | null,
  now: string
): { inserted: number; updated: number; total: number } {
  const existing = db
    .prepare("SELECT id, label FROM client_surfaces WHERE client_id = ?")
    .all(clientId) as Array<{ id: string; label: string }>;
  const byFold = new Map(existing.map((r) => [foldTr(r.label), r.id]));

  const upd = db.prepare(
    `UPDATE client_surfaces SET kind=@kind, label=@label, w_cm=@w_cm, h_cm=@h_cm,
       note=@note, source_intake_id=@sid, updated_at=@now WHERE id=@id`
  );
  const ins = db.prepare(
    `INSERT INTO client_surfaces (id, client_id, kind, label, w_cm, h_cm, note, source_intake_id, created_at, updated_at)
     VALUES (@id, @client_id, @kind, @label, @w_cm, @h_cm, @note, @sid, @now, @now)`
  );

  let inserted = 0;
  let updated = 0;
  for (const s of surfaces) {
    const fold = foldTr(s.label);
    const base = {
      kind: s.kind,
      label: s.label,
      w_cm: s.w_cm ?? null,
      h_cm: s.h_cm ?? null,
      note: s.note,
      sid: sourceIntakeId,
      now,
    };
    const existingId = byFold.get(fold);
    if (existingId) {
      upd.run({ ...base, id: existingId });
      updated++;
    } else {
      const id = newId("srf");
      ins.run({ ...base, id, client_id: clientId });
      byFold.set(fold, id); // aynı commit'te tekrar aynı label → UPDATE (çift satır yok)
      inserted++;
    }
  }
  return { inserted, updated, total: surfaces.length };
}
