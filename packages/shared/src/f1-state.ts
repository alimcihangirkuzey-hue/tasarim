/* F1 pilot — Brief durum makinesi (P1, D-59/60/61). SAF çekirdek: I/O yok,
   route yok, DB yok. Tüketiciler sonraki paketlerde (P2+); tıpkı canvasReduce
   gibi TEK KAPI — durum değişimi başka hiçbir yerde hesaplanmaz.

   Durum zinciri (F1-SPEC v1):
     DRAFT → INCOMPLETE → READY_FOR_DESIGN → DESIGN_IN_PROGRESS
           → READY_FOR_PRODUCTION_REVIEW → PRODUCTION_READY

   İKİ-KATMAN KURALI (spec §4) — eşikler karıştırılmamalı:
   · design_readiness = TASARIM-ÖNKOŞULU (design_pre) katmanı. Eksikse iş
     TASARIMA GİREMEZ. K4 "eksik brief'le tasarım başlar" YALNIZ ÜRETİM-katmanı
     eksikleri içindir — bu yüzden K4 bir KISAYOL KENARI değil, INCOMPLETE→
     READY_FOR_DESIGN geçişinin guard'ıdır.
   · production_completeness = ÜRETİM-önkoşulu katmanı; %100 + AÇIK REDDET YOK
     olmadan üretim İNCELEMESİNE geçilmez (§7).
   · PRODUCTION_READY'nin şartı İNSAN ONAYIDIR (§7 son adım); Pack mühürleme ·
     üretime-hazır işaretleme · üretim işi · operatör kuyruğu bunun arkasındadır.

   GERİLEME (ileriden geriye) YALNIZ meşru + KAYITLI sebeple olur (F1.7: dosya
   geçersizleşince durum geriler) — sebep + kaydeden zorunlu, çağıran audit satırı
   yazar.

   §7 HİZALAMA (P2): geçiş haritası spec §7 metnine karşı DOĞRULANDI ve üç sapma
   düzeltildi — (1) INCOMPLETE→DESIGN_IN_PROGRESS kısayolu KALDIRILDI, (2) DRAFT→
   READY_FOR_DESIGN kısayolu KALDIRILDI (zincir doğrusal), (3) %100 guard'ı
   PRODUCTION_READY'den READY_FOR_PRODUCTION_REVIEW girişine TAŞINDI + "açık
   REDDET yok" ve "insan onayı" şartları eklendi. Kural tablosu VERİ olarak
   aşağıdadır; değişiklik = tabloyu düzenlemek. */

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

/** İzinli İLERİ geçişler — spec §7 kanonik zinciri BİREBİR (P2'de hizalandı).
    Zincir DOĞRUSALDIR: kısayol/atlama YOK. K4 ("eksik brief'le tasarım başlar")
    bir KENAR değil, INCOMPLETE→READY_FOR_DESIGN'ın design_readiness guard'ıdır:
    üretim-katmanı eksikleri tasarımı engellemez, tasarım-katmanı eksikleri
    engeller (İKİ-KATMAN KURALI, spec §4). */
export const F1_FORWARD: Readonly<Record<F1State, readonly F1State[]>> = {
  DRAFT: ["INCOMPLETE"],
  INCOMPLETE: ["READY_FOR_DESIGN"],
  READY_FOR_DESIGN: ["DESIGN_IN_PROGRESS"],
  DESIGN_IN_PROGRESS: ["READY_FOR_PRODUCTION_REVIEW"],
  READY_FOR_PRODUCTION_REVIEW: ["PRODUCTION_READY"],
  PRODUCTION_READY: [],
};

/** Tasarım eşiği isteyen durumlar (design_readiness kapısı — §4 iki-katman) */
export const F1_DESIGN_GATED: readonly F1State[] = ["READY_FOR_DESIGN", "DESIGN_IN_PROGRESS"];

/** Üretim tamlığı %100 + açık REDDET yok isteyen durum (§7: üretim İNCELEMESİ girişi) */
export const F1_PRODUCTION_GATED: readonly F1State[] = ["READY_FOR_PRODUCTION_REVIEW"];

/** İnsan onayı isteyen durum (§7: son adım) */
export const F1_APPROVAL_GATED: readonly F1State[] = ["PRODUCTION_READY"];

export interface F1Readiness {
  /** Tasarımın başlayabilmesi için asgari bilgi tamam mı? (design_pre katmanı) */
  designReady: boolean;
  /** Üretim tamlığı yüzdesi (0-100) — completeness engine üretir */
  productionCompleteness: number;
  /** Açık REDDET-sınıfı kalem sayısı; üretim incelemesine geçiş için 0 ŞART */
  openRejects: number;
}

/** İnsan onayı kaydı (§7: READY_FOR_PRODUCTION_REVIEW → PRODUCTION_READY) */
export interface F1Approval {
  approvedBy: string;
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
  | "open_rejects"
  | "approval_required"
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
  /** PRODUCTION_READY'ye geçişte ZORUNLU (insan onayı) */
  approval?: F1Approval | null;
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
  const { from, to, readiness, regression, approval } = input;

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

  if (F1_PRODUCTION_GATED.includes(to)) {
    if (readiness.productionCompleteness < 100) {
      return {
        ok: false,
        code: "production_incomplete",
        detail: `Üretim tamlığı %${readiness.productionCompleteness} — %100 şart`,
      };
    }
    /* §7: "production_completeness=100 + açık REDDET yok". REDDET-sınıfı kalem
       istisnayla kapatılamaz (F1.5) → tamlık %100 olsa bile kapı kapalıdır. */
    if (readiness.openRejects > 0) {
      return {
        ok: false,
        code: "open_rejects",
        detail: `${readiness.openRejects} açık REDDET-sınıfı kalem var — istisnayla kapatılamaz`,
      };
    }
  }

  if (F1_APPROVAL_GATED.includes(to) && (approval?.approvedBy?.trim() ?? "") === "") {
    return {
      ok: false,
      code: "approval_required",
      detail: "PRODUCTION_READY yalnız İNSAN ONAYIYLA: approvedBy zorunlu",
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
