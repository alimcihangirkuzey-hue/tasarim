/* MOCKUP SAHNE TERCİHİ — Canonical 7.2 "Önizleme türleri" bildirimi (journal
   2026-07-26-onizleme-turleri). Mockup modalında hangi sahnenin önce
   önerileceği önceden EditorPage'de template_id==="garment" SERT KODUYLA
   yaşıyordu (garment: garment-sahnesi 2 puan + fabric_color eşleşmesi 1 puan;
   diğerleri: vitrine|facade 1 puan) — C-P1'de temizlenen id-sniff deseninin
   önizleme katmanındaki kaçağı. Karar artık manifest'in mockup_tercihi
   İLANINDAN okunur ve TEK yerde yaşar; eski satır-içi skorlamayla birebir
   eşdeğerlik referans-kopya testiyle çivilidir (mockup-tercihi.test.ts —
   exportRouteOf/channels.ts emsali).

   Bilerek SAF ve react'sız: yalnız type-only import taşır — okuyucu bugün
   yalnız web (EditorPage) olsa da grafiği büyütmemek channels.ts disipliniyle
   aynıdır. */

import type { MockupTercihi } from "../types.js";

/** Çekirdek tercih — ilan taşımayan profilin aldığı davranış (severity
    çekirdek sözlüğü emsali): vitrin/cephe sahneleri 1 puanla öne gelir,
    kumaş eşleşmesi YOK. Eski skorlamanın garment-dışı dalının birebir
    taşınmışıdır. */
export const CEKIRDEK_TERCIH: MockupTercihi = {
  sahne_turleri: ["vitrine", "facade"],
  sahne_puani: 1,
};

/** Sahnenin sıralama puanı — mockup modalının TEK sıralama kaynağı.
    `tercih` manifest'in mockup_tercihi alanıdır; undefined = çekirdek tercih
    (bilinçli "ilan yok" beyanı, severityOf sözleşmesiyle aynı). Kumaş
    eşleşmesi eski davranışla birebir: sahnenin fabric_color'ı truthy VE
    belgenin eslesme_parami paramına (String(...) ?? "") eşitse +1 — tür
    eşleşmesinden BAĞIMSIZ eklenir (eski kod da öyleydi; golden kanıtlar). */
export function sahneSkoru(
  tercih: MockupTercihi | undefined,
  sahne: { kind: string; fabric_color?: string },
  docParams: Record<string, unknown>
): number {
  const etkin = tercih ?? CEKIRDEK_TERCIH;
  let puan = (etkin.sahne_turleri as readonly string[]).includes(sahne.kind)
    ? etkin.sahne_puani
    : 0;
  if (
    etkin.eslesme_parami !== undefined &&
    sahne.fabric_color &&
    sahne.fabric_color === String(docParams[etkin.eslesme_parami] ?? "")
  ) {
    puan += 1;
  }
  return puan;
}
