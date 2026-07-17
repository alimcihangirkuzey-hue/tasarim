/* F8-D — mockup profesyonelleştirme sabitleri (ADR-005: mockup ≠ baskı provası).

   MOCKUP_MAX_W: anti-kaçış çözünürlük TAVANI — ekran/sunum için yeter, baskı
   için bilerek YETMEZ. Canlı önizleme (MockupPage) ve JPG üretimi (server
   mockup rotası) AYNI sabiti kullanır (dedupe).

   F8-E (ADR-005 tadili): yüksek-çöz koruması "yolun yokluğu"ndan "KAPILI YOL"a
   evrildi — ayrı uç (POST /api/documents/:id/mockup-hires) + zorunlu re-onay
   literal'i (MOCKUP_HIRES_CONFIRM, şemada z.literal) + koşulsuz damga + ayrı
   export kind (mockup_hires) + MOCKUP_HIRES_MAX_W tavanı. Varsayılan mockup
   yolu MOCKUP_MAX_W=1600 tavanıyla AYNEN korunur.

   MOCKUP_WATERMARK: damga metni, sardığı mockup'ın ÇIKTI dilini izler.
   de = CH-Almancası, ß'siz (M9/DE-CH). "MOCKUP" çekirdeği dil-nötr sabit. */

import { z } from "zod";
import type { MenuLanguage, SceneKind, SurfaceKind } from "./schemas.js";

export const MOCKUP_MAX_W = 1600;

/** F8-E: yüksek-çöz (EKRAN) tavanı — baskı-sınıfı değildir; damga koşulsuz kalır. */
export const MOCKUP_HIRES_MAX_W = 3200;

/** F8-E: re-onay literal'i — hires isteği bu metni AYNEN taşımak zorundadır. */
export const MOCKUP_HIRES_CONFIRM = "baskı için değildir";

/* Literal şemada: yanlış/eksik confirm → ZodError → global işleyici 400 basar
   (sunucuda ayrı if'e gerek kalmaz; sözleşme tek yerde yaşar). */
export const MockupHiresRequestSchema = z.object({
  scene_id: z.string().min(1),
  confirm: z.literal(MOCKUP_HIRES_CONFIRM),
});
export type MockupHiresRequest = z.infer<typeof MockupHiresRequestSchema>;

/* F8-E/H4: sunum mockup modu — "last" = bugünkü davranış (belge başına en son
   1 mockup, PresentPage FAZ3 §3.4); "per_scene_kind" = sahne-TÜRÜ başına en
   son mockup (çok-yüzey kurumsal sunum). Sunucu PresentSchema'da .default("last"). */
export const PresentMockupModeSchema = z.enum(["last", "per_scene_kind"]);
export type PresentMockupMode = z.infer<typeof PresentMockupModeSchema>;

/* SurfaceKind (F8-A müşteri yüzey profili) → SceneKind (mockup sahnesi) —
   schemas.ts'teki "eşleme F8-D işi" borcu burada kapanır (F8-E). */
export function surfaceToSceneKind(kind: SurfaceKind): SceneKind {
  switch (kind) {
    case "vitrine":
      return "vitrine";
    case "tabela":
      return "facade";
    case "garment":
      return "garment";
    case "diger":
      return "generic";
  }
}

/* Sahnesi silinmiş/bozuk mockup kaydı sunumdan SESSİZCE DÜŞMEZ (M8) — bilinmeyen
   tür "generic" sayılır ve sayfası basılır. */
export function classifySceneKind(kind: string | null | undefined): SceneKind {
  return kind === "vitrine" || kind === "facade" || kind === "garment" ? kind : "generic";
}

/** Sunum sayfa sırası sahne-türüne göre DETERMİNİSTİK (kararlı PDF çıktısı). */
export const SCENE_KIND_ORDER: readonly SceneKind[] = ["vitrine", "facade", "garment", "generic"];

/* Çok-yüzey sunum seçimi (H4 çekirdeği, SAF): sahne-türü başına EN SON kayıt.
   version, belge+kind başına tekil artar (export rotaları MAX+1); eşitlikte ilk
   gelen kalır (> karşılaştırması — deterministik). Dönüş SCENE_KIND_ORDER sıralı. */
export interface PresentMockupCandidate {
  scene_kind: SceneKind;
  version: number;
}
export function pickLatestMockupPerSceneKind<T extends PresentMockupCandidate>(records: T[]): T[] {
  const best = new Map<SceneKind, T>();
  for (const r of records) {
    const cur = best.get(r.scene_kind);
    if (!cur || r.version > cur.version) best.set(r.scene_kind, r);
  }
  return SCENE_KIND_ORDER.filter((k) => best.has(k)).map((k) => best.get(k) as T);
}

export const MOCKUP_WATERMARK: Record<MenuLanguage, string> = {
  fr: "ne pas utiliser pour l'impression",
  de: "nicht zum Drucken verwenden",
  tr: "baskı provası değildir",
};

/** Damga tam metni — bilinmeyen/bozuk dil güvenli fr'ye düşer. */
export function mockupWatermarkText(lang: MenuLanguage): string {
  return `MOCKUP — ${MOCKUP_WATERMARK[lang] ?? MOCKUP_WATERMARK.fr}`;
}
