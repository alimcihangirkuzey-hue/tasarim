/* F1 pilot — Brief durum makinesi (P1, D-59/60/61). SAF çekirdek: I/O yok,
   route yok, DB yok. Tüketiciler sonraki paketlerde (P2+); tıpkı canvasReduce
   gibi TEK KAPI — durum değişimi başka hiçbir yerde hesaplanmaz.

   Durum zinciri (F1-SPEC v1):
     DRAFT → INCOMPLETE → READY_FOR_DESIGN → DESIGN_IN_PROGRESS
           → READY_FOR_PRODUCTION_REVIEW → PRODUCTION_READY

   İKİ AYRI EŞİK (spec'in çekirdeği — karıştırılmamalı):
   · design_readiness = TASARIMIN başlayabilmesi için asgari bilgi (format/ölçü/
     yön belirlenebiliyor). Spec: "Eksik brief ile tasarım BAŞLAYABİLİR" →
     INCOMPLETE bir engel DEĞİLDİR, yalnız eksik-bilgi işaretidir.
   · production_completeness = ÜRETİM kapısının eşiği; PRODUCTION_READY yalnız
     %100'de açılır (Pack mühürleme · üretime-hazır işaretleme · üretim işi ·
     operatör kuyruğu bu kapının arkasında).

   GERİLEME (ileriden geriye) YALNIZ meşru + KAYITLI sebeple olur (F1.7: dosya
   geçersizleşince durum geriler) — sebep + kaydeden zorunlu, çağıran audit satırı
   yazar.

   YORUM ŞERHİ (yönetişim tasdikine): geçiş haritası VERİ olarak aşağıdadır
   (F1_FORWARD) — spec §7 metni pakette birebir gelmediğinden kural tablosu tek
   yerde ve gözden geçirilebilir tutuldu; değişiklik = tabloyu düzenlemek. */

import { z } from "zod";

export const F1_STATES = [
  "DRAFT",
  "INCOMPLETE",
  "READY_FOR_DESIGN",
  "DESIGN_IN_PROGRESS",
  "READY_FOR_PRODUCTION_REVIEW",
  "PRODUCTION_READY",
] as const;

export const F1StateSchema = z.enum(F1_STATES);
export type F1State = z.infer<typeof F1StateSchema>;

/** İzinli İLERİ geçişler (gerileme ayrı kuralla — bkz. canTransitionF1). */
export const F1_FORWARD: Readonly<Record<F1State, readonly F1State[]>> = {
  /* Gelen brief tam da olabilir: INCOMPLETE zorunlu durak DEĞİL */
  DRAFT: ["INCOMPLETE", "READY_FOR_DESIGN"],
  /* Spec: eksik brief ile tasarım başlayabilir → INCOMPLETE'ten doğrudan tasarım */
  INCOMPLETE: ["READY_FOR_DESIGN", "DESIGN_IN_PROGRESS"],
  READY_FOR_DESIGN: ["DESIGN_IN_PROGRESS"],
  DESIGN_IN_PROGRESS: ["READY_FOR_PRODUCTION_REVIEW"],
  READY_FOR_PRODUCTION_REVIEW: ["PRODUCTION_READY"],
  PRODUCTION_READY: [],
};

/** Tasarım eşiği isteyen durumlar (design_readiness kapısı) */
export const F1_DESIGN_GATED: readonly F1State[] = ["READY_FOR_DESIGN", "DESIGN_IN_PROGRESS"];

/** Üretim tamlığı %100 isteyen durum (üretim kapısı) */
export const F1_PRODUCTION_GATED: readonly F1State[] = ["PRODUCTION_READY"];

export interface F1Readiness {
  /** Tasarımın başlayabilmesi için asgari bilgi tamam mı? */
  designReady: boolean;
  /** Üretim tamlığı yüzdesi (0-100); üretim kapısı YALNIZ 100'de açılır */
  productionCompleteness: number;
}

/** Gerileme gerekçesi — meşru VE kayıtlı olmak zorunda (boş metin geçmez) */
export interface F1Regression {
  reason: string;
  recordedBy: string;
}

export type F1BlockCode =
  | "unknown_state"
  | "same_state"
  | "not_allowed"
  | "design_not_ready"
  | "production_incomplete"
  | "regression_unrecorded";

export type F1TransitionResult =
  | { ok: true; from: F1State; to: F1State; direction: "forward" | "backward" }
  | { ok: false; code: F1BlockCode; detail: string };

export interface F1TransitionInput {
  from: F1State;
  to: F1State;
  readiness: F1Readiness;
  /** ileriden geriye geçişte ZORUNLU */
  regression?: F1Regression | null;
}

export function isF1State(value: unknown): value is F1State {
  return typeof value === "string" && (F1_STATES as readonly string[]).includes(value);
}

/** Zincirdeki sıra numarası (yön tayini için) */
export function f1StateIndex(state: F1State): number {
  return F1_STATES.indexOf(state);
}

/**
 * Geçiş kapısı — TEK KAPI. Saf: girdileri değiştirmez, yalnız karar döner.
 * Çağıran, ok:false ise durumu DEĞİŞTİRMEZ; ok:true ise audit satırını yazar.
 */
export function canTransitionF1(input: F1TransitionInput): F1TransitionResult {
  const { from, to, readiness, regression } = input;

  if (!isF1State(from) || !isF1State(to)) {
    return { ok: false, code: "unknown_state", detail: `Bilinmeyen durum: ${String(from)} → ${String(to)}` };
  }
  if (from === to) {
    return { ok: false, code: "same_state", detail: `Durum zaten ${from}` };
  }

  const backward = f1StateIndex(to) < f1StateIndex(from);

  if (backward) {
    /* Gerileme: meşru + KAYITLI (F1.7). Sebep ya da kaydeden boşsa kapı kapalı. */
    const reason = regression?.reason?.trim() ?? "";
    const by = regression?.recordedBy?.trim() ?? "";
    if (reason === "" || by === "") {
      return {
        ok: false,
        code: "regression_unrecorded",
        detail: "Gerileme yalnız meşru ve KAYITLI sebeple: reason + recordedBy zorunlu",
      };
    }
    return { ok: true, from, to, direction: "backward" };
  }

  if (!F1_FORWARD[from].includes(to)) {
    return {
      ok: false,
      code: "not_allowed",
      detail: `${from} → ${to} izinli değil (izinli: ${F1_FORWARD[from].join(", ") || "yok"})`,
    };
  }

  if (F1_DESIGN_GATED.includes(to) && !readiness.designReady) {
    return {
      ok: false,
      code: "design_not_ready",
      detail: "Tasarım eşiği kapalı: format/ölçü/yön asgari bilgisi eksik",
    };
  }

  if (F1_PRODUCTION_GATED.includes(to) && readiness.productionCompleteness < 100) {
    return {
      ok: false,
      code: "production_incomplete",
      detail: `Üretim tamlığı %${readiness.productionCompleteness} — %100 şart`,
    };
  }

  return { ok: true, from, to, direction: "forward" };
}

/**
 * Üretim kapısı: Production Pack mühürleme · nihai artifact'ı üretime-hazır
 * işaretleme · üretim işi oluşturma · operatör kuyruğuna gönderme — DÖRDÜ DE
 * yalnız PRODUCTION_READY'de açıktır (F1.1'in çekirdeği).
 */
export function isF1ProductionGateOpen(state: F1State): boolean {
  return state === "PRODUCTION_READY";
}
