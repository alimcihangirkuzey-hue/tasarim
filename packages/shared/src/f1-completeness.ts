/* F1 pilot P2 — COMPLETENESS ENGINE (D-59/61). SAF fonksiyon: DB'ye DOKUNMAZ,
   I/O yapmaz; tüketici (P3+ rotaları) brief verisini + dosya görünümünü besler.
   Çıktısı P1'in F1Readiness sözleşmesine BİREBİR oturur → durum makinesi
   (f1-state.ts) doğrudan tüketir.

   KURALLAR (spec §4/§7):
   · design_readiness = design_pre katmanının TAMAMI karşılanmış mı (iki-katman
     kuralı: eksikse iş TASARIMA GİREMEZ).
   · production_completeness = karşılanan / gereken. PAYDA = production_pre
     zorunlular + AKTİF koşullular + dosya şartları. Opsiyonel alanlar HİÇ
     girmez; koşullu alan YALNIZ tetikleyicisi aktifken girer.
   · KAYITLI İSTİSNA kalemi karşılanmış sayar ve çıktıda TAŞINIR (Pack kontrol
     listesine akacak) — ama:
   · REDDET-sınıfı kalem istisnayla KARŞILANAMAZ (F1.5) ve istisna YALNIZ
     production_pre katmanında geçerlidir (design önkoşulu waive edilemez —
     §4 iki-katman kuralının korunması).
   · Eksikler İSİMLİ döner (F1.1: "neden" listesi görünür olacak). */

import {
  f1SpecFor,
  type F1Family,
  type F1FieldRule,
  type F1Layer,
  type F1Publication,
  type F1SpecRef,
  type F1Trigger,
  F1_PRINTED_PUBLICATIONS,
} from "./f1-spec.js";
import type { F1Readiness } from "./f1-state.js";

/** brief_files görünümü (DB satırı değil — dar okuma) */
export interface F1FileView {
  role: string;
  status: "valid" | "invalid";
  version?: number;
}

/** Kayıtlı istisna — brief_audit alanlarıyla hizalı */
export interface F1ExceptionFlag {
  /** alan id ya da dosya şartı için `file:<role>` */
  target: string;
  warning_code: string;
  acknowledged_by: string;
  reason: string;
}

export interface F1BriefInput {
  family: F1Family;
  spec_ref?: F1SpecRef | null;
  /** alan id → değer; boş dize/boş dizi/null/undefined = EKSİK */
  values?: Record<string, unknown>;
  files?: readonly F1FileView[];
  exceptions?: readonly F1ExceptionFlag[];
  /** tetikleyici bağlamı */
  context?: { format_free_choice?: boolean; has_brand_ref?: boolean };
}

export interface F1MissingItem {
  id: string;
  label_tr: string;
  layer: F1Layer;
  reject_class: boolean;
}

export interface F1Notice {
  code: string;
  message_tr: string;
}

export interface F1CompletenessResult extends F1Readiness {
  /** İsimli eksik listesi (her iki katman) — F1.1 zemini */
  missing: F1MissingItem[];
  /** İstisnayla karşılanmış kalemler — Pack kontrol listesine akar */
  satisfiedByException: F1ExceptionFlag[];
  /** Açık REDDET-sınıfı kalemler (istisnayla kapatılamaz) */
  openRejectItems: F1MissingItem[];
  /** YALNIZ BİLGİLENDİR sınıfı notlar (ör. DTF) */
  notices: F1Notice[];
  /** Şeffaflık: yüzdenin payı/paydası */
  satisfied: number;
  denominator: number;
}

/** Değer "dolu" mu? (0 ve false anlamlı değerlerdir; boş dize/dizi değildir) */
export function f1HasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function publicationsOf(input: F1BriefInput): F1Publication[] {
  const raw = input.values?.["requested_publications"];
  return Array.isArray(raw) ? (raw as F1Publication[]) : [];
}

/** Koşullu alan bu brief'te AKTİF mi? (payda kararı) */
export function isF1TriggerActive(trigger: F1Trigger, input: F1BriefInput): boolean {
  switch (trigger.kind) {
    case "always":
      return true;
    case "publication":
      return publicationsOf(input).includes(trigger.publication);
    case "any_printed_publication":
      return publicationsOf(input).some((p) => F1_PRINTED_PUBLICATIONS.includes(p));
    case "format_free_choice":
      return input.context?.format_free_choice === true;
    case "brand_ref_missing":
      return input.context?.has_brand_ref !== true;
    case "has_placements":
      return f1HasValue(input.values?.["placements"]);
  }
}

function exceptionFor(
  input: F1BriefInput,
  target: string,
  layer: F1Layer,
  rejectClass: boolean
): F1ExceptionFlag | null {
  /* F1.5: REDDET sınıfı istisnayla kapatılamaz. §4: design önkoşulu waive edilemez. */
  if (rejectClass || layer === "design_pre") return null;
  const found = (input.exceptions ?? []).find(
    (e) =>
      e.target === target &&
      e.acknowledged_by.trim() !== "" &&
      e.reason.trim() !== "" &&
      e.warning_code.trim() !== ""
  );
  return found ?? null;
}

function toMissing(rule: F1FieldRule): F1MissingItem {
  return {
    id: rule.id,
    label_tr: rule.label_tr,
    layer: rule.layer,
    reject_class: rule.reject_class === true,
  };
}

/**
 * Eksiksizlik motoru — TEK KAPI. Saf: girdiyi değiştirmez.
 * Dönen `designReady` / `productionCompleteness` / `openRejects` doğrudan
 * canTransitionF1(readiness) olarak kullanılır.
 */
export function computeF1Completeness(input: F1BriefInput): F1CompletenessResult {
  const spec = f1SpecFor(input.family);
  const values = input.values ?? {};
  const files = input.files ?? [];

  const missing: F1MissingItem[] = [];
  const satisfiedByException: F1ExceptionFlag[] = [];
  const notices: F1Notice[] = [];

  let designMissing = 0;
  let satisfied = 0;
  let denominator = 0;

  for (const rule of spec.fields) {
    if (!isF1TriggerActive(rule.trigger, input)) continue; /* koşul aktif değil → paydaya GİRMEZ */

    const isProduction = rule.layer === "production_pre";
    if (isProduction) denominator += 1;

    /* Alanın kendi doluluk kuralı varsa o geçerlidir (ör. beden dağılımı:
       varlık YETMEZ, TOPLAM>0 şarttır — 0'lar meşru veri olduğu için) */
    const filled = rule.satisfied ? rule.satisfied(values[rule.id]) : f1HasValue(values[rule.id]);
    if (filled) {
      if (isProduction) satisfied += 1;
      continue;
    }

    const waiver = exceptionFor(input, rule.id, rule.layer, rule.reject_class === true);
    if (waiver) {
      satisfiedByException.push(waiver);
      if (isProduction) satisfied += 1;
      continue;
    }

    missing.push(toMissing(rule));
    if (!isProduction) designMissing += 1;
  }

  /* Dosya şartları: rol + GEÇERLİ durum (invalid dosya karşılanmış SAYILMAZ — F1.7) */
  for (const req of spec.file_requirements) {
    if (req.layer === "production_pre") denominator += 1;
    const ok = files.some((f) => f.role === req.role && f.status === "valid");
    if (ok) {
      if (req.layer === "production_pre") satisfied += 1;
      continue;
    }
    /* reject_class:true → istisna denenmez bile */
    missing.push({ id: `file:${req.role}`, label_tr: req.label_tr, layer: req.layer, reject_class: true });
    if (req.layer !== "production_pre") designMissing += 1;
  }

  /* YALNIZ BİLGİLENDİR: teknik seçimi uygulanmış bir çıktı yoluna denk gelmiyorsa */
  const technique = values["technique"];
  if (typeof technique === "string" && technique.trim() !== "") {
    const info = spec.info_techniques[technique];
    if (info) notices.push({ code: `technique_info:${technique}`, message_tr: info });
  }

  const openRejectItems = missing.filter((m) => m.reject_class);
  /* Yüzde AŞAĞI yuvarlanır: "neredeyse tam" ASLA %100 okunmaz (kapı yanlış açılmasın) */
  const productionCompleteness =
    denominator === 0 ? 100 : Math.floor((satisfied / denominator) * 100);

  return {
    designReady: designMissing === 0,
    productionCompleteness,
    openRejects: openRejectItems.length,
    missing,
    satisfiedByException,
    openRejectItems,
    notices,
    satisfied,
    denominator,
  };
}

/** Durum makinesine verilecek dar görünüm (F1Readiness sözleşmesi) */
export function toF1Readiness(result: F1CompletenessResult): F1Readiness {
  return {
    designReady: result.designReady,
    productionCompleteness: result.productionCompleteness,
    openRejects: result.openRejects,
  };
}
