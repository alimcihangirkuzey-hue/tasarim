/* MOCKUP SAHNE TERCİHİ — Canonical 7.2 "Önizleme türleri" bildirimi (journal
   2026-07-26-onizleme-turleri). Mockup modalında hangi sahnenin önce
   önerileceği önceden EditorPage'de template_id==="garment" SERT KODUYLA
   yaşıyordu (garment: garment-sahnesi 2 puan + fabric_color eşleşmesi 1 puan;
   diğerleri: vitrine|facade 1 puan) — C-P1'de temizlenen id-sniff deseninin
   önizleme katmanındaki kaçağı. Karar artık manifest'in mockup_tercihi
   İLANINDAN okunur ve TEK yerde yaşar.

   ESKİYLE BİREBİRLİK ARTIK İDDİA EDİLMİYOR (journal
   2026-07-27-kumas-rengi-birligi): eski golden, sökülen satır-içi ifadenin
   HAM `===` kumaş karşılaştırmasını pinliyordu. Ölçüm o pinin ÖLÜ bir yolu
   çivilediğini gösterdi — sahne tarafı İSİM yazar (ScenesPanel select:
   white|black|red|blue), belge tarafı HEX yazar (<input type="color"> →
   küçük harf #rrggbb); isim === hex hiç tutmaz, hex === hex bile harf
   büyüklüğünden kaçar. Yani manifest'in eslesme_parami ilanı UI yolunda hiç
   işlemiyordu. Karşılaştırma artık @tezgah/shared kumaş-rengi BİRLİĞİNE
   (kumasRengiEsit) bağlıdır: ilanın CANLANMASI bilinçli davranış
   değişikliğidir, referans-kopya testi de YENİ sözleşmeyi pinler
   (mockup-tercihi.test.ts).

   React'sız kalır; "yalnız type-only import" iddiası bilerek düştü: birlik
   runtime fonksiyondur ve yerinde regex/sözlük kopyalamak birliğin varlık
   sebebini bozar (params.ts'in HexColor kararıyla aynı ölçüm — @tezgah/shared
   zaten bu paketin bağımlılığı, grafik büyümedi). */

import { kumasRengiEsit } from "@tezgah/shared";

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
    eşleşmesi kumaş-rengi BİRLİĞİ üzerinden: sahnenin fabric_color'ı ile
    belgenin eslesme_parami paramı (String(...) ?? "") kumasRengiEsit'e göre
    aynı renge çözülüyorsa +1 — tür eşleşmesinden BAĞIMSIZ eklenir (eski kod
    da öyleydi; bu eksen değişmedi, golden kanıtlar).

    Eski ham `===` bilerek terk edildi (journal 2026-07-27-kumas-rengi-birligi):
    isim↔hex ve harf-büyüklüğü farkları eşleşmeyi UI yolunda tamamen
    öldürüyordu. Birliğin "çözülemeyen taraf eşleşmeyi düşürür" kuralı da
    bilinçli DARALMADIR: "#111" gibi 3 haneli hex eskiden ham === ile kendine
    eşleşirdi, artık eşleşmez (birlikte 3 hane yok; genişletme ayrı karar).

    `sahne.fabric_color` truthy ön-kontrolü KALDI: kumasRengiEsit(""/undefined)
    zaten false döndürür, yani davranışa etkisi yok (ölçüldü — golden gridde
    ""/undefined kumaşlar iki yolda da 0). Ama ön-kontrol "sahne kumaş
    bildirmemişse eşleşme sorusu hiç doğmaz" niyetini tipte ve okumada açık
    tutar ve undefined'ı String'e zorlamadan kısa devre eder. */
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
    kumasRengiEsit(sahne.fabric_color, String(docParams[etkin.eslesme_parami] ?? ""))
  ) {
    puan += 1;
  }
  return puan;
}
