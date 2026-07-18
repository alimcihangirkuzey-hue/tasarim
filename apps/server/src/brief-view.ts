/* F1 pilot P4 — BRIEF GÖRÜNÜMÜ: DB satırları → completeness motorunun girdisi.
   Tek yer: alan değerlerinin nereden geldiği burada tanımlıdır (dağınık okuma
   yasak). Motor saf kalır; DB okuması burada.

   DEĞER KAYNAKLARI (v13 sonrası):
   · spec_values_json      → format · orientation · qr_target_url ·
                             print_quantity · print_material · color_font_choice
   · language_requirements_json → languages
   · requested_publications_json → requested_publications (tetikleyiciler)
   · delivery_deadline     → teslim tarihi
   · content_reference     → içerik iskeleti işaretçisi (dolu = iskelet var)
   · prices                → TÜRETİLİR: müşterinin catalog_json'undan okunur
                             (14e — override'a YAZILMAZ, katalog tek kaynak)
   · files                 → brief_files (rol + geçerlilik)
   · exceptions            → P4'te BOŞ: ack uçları uyarı-kodu temelli (P3
                             sözleşmesi), ALAN waiver'ı henüz açılmadı; ack'ler
                             görünür ama tamlığı DEĞİŞTİRMEZ (dürüst sınır). */

import type Database from "better-sqlite3";
import {
  CatalogSchema,
  computeF1Completeness,
  type F1BriefInput,
  type F1CompletenessResult,
  type F1FileView,
} from "@tezgah/shared";

export interface BriefRow {
  id: string;
  source_system: string;
  source_tenant_ref: string | null;
  source_request_ref: string | null;
  customer_ref: string | null;
  brand_ref: string | null;
  request_type: string;
  requested_publications_json: string;
  content_reference: string | null;
  language_requirements_json: string;
  delivery_deadline: string | null;
  requester_notes: string;
  callback_reference: string | null;
  idempotency_key: string;
  status: string;
  spec_values_json: string;
  created_at: string;
  updated_at: string;
}

export interface PriceCoverage {
  /** katalogda görünür ürün sayısı */
  items: number;
  /** fiyatı olmayan görünür ürün sayısı (0 = eksiksiz) */
  missing: number;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 14e: fiyat eksiksizliği KATALOGDAN okunur (brief'e kopyalanmaz) */
export function priceCoverage(db: Database.Database, clientId: string | null): PriceCoverage | null {
  if (!clientId) return null;
  const row = db.prepare("SELECT catalog_json FROM clients WHERE id = ?").get(clientId) as
    | { catalog_json: string }
    | undefined;
  if (!row) return null;
  const parsed = CatalogSchema.safeParse(parseJson<unknown>(row.catalog_json, {}));
  if (!parsed.success) return { items: 0, missing: 0 };
  let items = 0;
  let missing = 0;
  for (const cat of parsed.data.categories) {
    for (const item of cat.items) {
      if (!item.visible) continue;
      items += 1;
      if (item.prices.length === 0) missing += 1;
    }
  }
  return { items, missing };
}

export function briefFiles(db: Database.Database, briefId: string): F1FileView[] {
  const rows = db
    .prepare("SELECT role, status, version FROM brief_files WHERE brief_id = ? ORDER BY role, version")
    .all(briefId) as Array<{ role: string; status: string; version: number }>;
  /* Rol başına EN SON sürüm geçerlidir (eski sürümler tarihçe olarak durur) */
  const latest = new Map<string, F1FileView>();
  for (const r of rows) {
    latest.set(r.role, { role: r.role, status: r.status === "valid" ? "valid" : "invalid", version: r.version });
  }
  return [...latest.values()];
}

/** Brief satırı → motor girdisi (aile şimdilik request_type'tan: menu | garment) */
export function toBriefInput(db: Database.Database, brief: BriefRow): F1BriefInput {
  const spec = parseJson<Record<string, unknown>>(brief.spec_values_json, {});
  const languages = parseJson<string[]>(brief.language_requirements_json, []);
  const publications = parseJson<string[]>(brief.requested_publications_json, []);
  const coverage = priceCoverage(db, brief.customer_ref);

  const values: Record<string, unknown> = {
    ...spec,
    languages,
    requested_publications: publications,
    content_skeleton: brief.content_reference ?? undefined,
    delivery_deadline: brief.delivery_deadline ?? undefined,
  };
  /* Fiyatlar: yalnız katalog EKSİKSİZSE dolu sayılır (0 ürün = dolu değil) */
  if (coverage && coverage.items > 0 && coverage.missing === 0) {
    values.prices = { source: "catalog", items: coverage.items };
  }

  return {
    family: brief.request_type === "garment" ? "garment" : "menu",
    values,
    files: briefFiles(db, brief.id),
    exceptions: [],
    context: {
      has_brand_ref: (brief.brand_ref ?? "").trim() !== "",
      format_free_choice: spec["format_free_choice"] === true,
    },
  };
}

export interface BriefViewExtras {
  price_coverage: PriceCoverage | null;
  /** kayıtlı uyarı onayları (görünür; tamlığı değiştirmez — bkz. dosya başlığı) */
  acknowledged: Array<{ warning_code: string; acknowledged_by: string; acknowledged_at: string; reason: string }>;
}

export function briefExtras(db: Database.Database, brief: BriefRow): BriefViewExtras {
  const acknowledged = db
    .prepare(
      `SELECT warning_code, acknowledged_by, acknowledged_at, reason FROM brief_audit
       WHERE brief_id = ? AND event_type = 'warning_acknowledged' ORDER BY created_at`
    )
    .all(brief.id) as BriefViewExtras["acknowledged"];
  return { price_coverage: priceCoverage(db, brief.customer_ref), acknowledged };
}

export function briefCompleteness(db: Database.Database, brief: BriefRow): F1CompletenessResult {
  return computeF1Completeness(toBriefInput(db, brief));
}
