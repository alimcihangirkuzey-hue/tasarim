/* F1 pilot P4/B — SPECREF ↔ MANIFEST BİRLEŞMESİ (P2 şerhinin evi).

   shared/f1-spec.ts yalnız KİMLİK taşır (template_id + format) çünkü shared,
   templates paketini import EDEMEZ (templates zaten shared'a bağlı — döngü).
   Birleşme bu TEK modülde yaşar; başka yerde dağınık birleştirme YASAK:
   · geometri/etiket → TemplateManifest'ten
   · zorunlu/koşullu alanlar → SpecRef'ten (f1SpecFor)

   KAPASİTE UYARISI (ürün sahibi kararı: kapasite-uyarisi: p4): P4/D ölçümü
   200 üründe grid'in 180, trifold'un 126 ürün DÜŞÜRDÜĞÜNÜ gösterdi (görünür
   overflow uyarısıyla). Format seçimi anında bunu söylemek bu modülün işi —
   hesap mevcut analiz katmanından gelir (yeni analiz mantığı YAZILMAZ). */

import { TEMPLATES } from "@tezgah/templates";
import { DocumentStateSchema, f1SpecFor, type ClientDTO } from "@tezgah/shared";
import { analyzeDoc } from "./analyzeDoc";

export interface MenuFormatOption {
  /** "menu-liste-premium:a4-portrait" */
  key: string;
  template_id: string;
  format: string;
  label_tr: string;
  w_mm: number;
  h_mm: number;
  bleed_mm: number;
  safe_mm: number;
}

/** SpecRef listesi × manifest → seçilebilir format kümesi (DL yok: listede yok) */
export function menuFormatOptions(): MenuFormatOption[] {
  const out: MenuFormatOption[] = [];
  for (const ref of f1SpecFor("menu").allowed_specs) {
    const entry = TEMPLATES[ref.template_id];
    const fmt = entry?.manifest.formats[ref.format];
    if (!entry || !fmt) continue; /* manifest'te yoksa seçenek de yok (uydurma YOK) */
    out.push({
      key: `${ref.template_id}:${ref.format}`,
      template_id: ref.template_id,
      format: ref.format,
      label_tr: `${entry.manifest.name_tr} — ${fmt.label_tr}`,
      w_mm: fmt.w_mm,
      h_mm: fmt.h_mm,
      bleed_mm: entry.manifest.bleed_mm,
      safe_mm: entry.manifest.safe_mm,
    });
  }
  return out;
}

export function parseFormatKey(key: string): { template_id: string; format: string } | null {
  const [template_id, format] = key.split(":");
  if (!template_id || !format) return null;
  return { template_id, format };
}

export interface CapacityEstimate {
  /** katalogdaki görünür ürün sayısı */
  items: number;
  /** bu format seçilirse BASILAMAYACAK ürün sayısı */
  dropped: number;
  pages: number;
  fits: boolean;
}

/**
 * Seçilen formatın müşterinin GERÇEK kataloğunu taşıyıp taşımadığı.
 * Mevcut analiz katmanı kullanılır (analyzeDoc) — belge OLUŞTURULMAZ, geçici
 * bir DocumentState ile hesaplanır.
 */
export function estimateCapacity(
  client: ClientDTO | null | undefined,
  option: MenuFormatOption | null | undefined
): CapacityEstimate | null {
  if (!client || !option) return null;
  const items = client.catalog.categories.reduce(
    (n, c) => n + c.items.filter((i) => i.visible).length,
    0
  );
  const parsed = DocumentStateSchema.safeParse({
    template_id: option.template_id,
    params: { format: option.format },
  });
  if (!parsed.success) return null;
  let analysis;
  try {
    analysis = analyzeDoc(client, parsed.data);
  } catch {
    return null; /* analiz kırılırsa uyarı üretme (sessiz doğru > gürültülü yanlış) */
  }
  const dropped = analysis.warnings.reduce(
    (n, w) => (w.type === "overflow-items" ? n + w.count : n),
    0
  );
  return { items, dropped, pages: analysis.pages, fits: dropped === 0 };
}

export function capacityMessage(cap: CapacityEstimate | null): string | null {
  if (!cap || cap.items === 0) return null;
  if (cap.fits) return `${cap.items} ürün · ${cap.pages} sayfa — hepsi sığıyor`;
  return `⚠ ${cap.items} üründen ${cap.dropped} tanesi bu formata SIĞMIYOR (basılmaz) — ${cap.items - cap.dropped} ürün basılır`;
}
