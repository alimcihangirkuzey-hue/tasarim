/* T1b/FIX-3 — tekrar-intake kategori birleşmesi. F1 kök nedeni: intake APPEND-only
   idi (aynı-etiket kategori için birleşme yolu YOK) → tekrar-intake mükerrer
   kategori açıyordu ("mükerrer yapısal imkânsız" anayasasının ihlali).

   Kural: projeksiyondan gelen kategori, mevcut katalogda foldTr(name_fr)
   eşleşmesi buluyorsa YENİ KATEGORİ AÇILMAZ — yeni ürünler MEVCUT kategoriye
   append edilir. ŞERH-1/M5 KORUNUR: mevcut kategori satırı (id · name_fr ·
   note_fr) ve mevcut ürün satırları AYNEN; yalnız ekleme. Kategori order'ları
   sona-ekleme sonrası 1..N yeniden numaralanır (F7-C onaylı mevcut davranış);
   eklenen ürünler mevcut ürünlerin ardından devam eden order alır.

   Projeksiyon-İÇİ aynı-fold iki kategori de tek hedefe birleşir (yeni açılan
   kategori haritaya girer). Birleşen kategorinin projeksiyon notu (note_fr)
   hedefe YAZILMAZ (mevcut satır mutasyonu olurdu) — sessiz düşmesin diye
   raporda `note_dropped` olarak döner (denetim izi intake_records'ta zaten tam). */

import { foldTr } from "./parse.js";
import type { Category } from "./schemas.js";

export interface IntakeMergeInfo {
  /** Hedef (mevcut) kategori */
  category_id: string;
  label: string;
  /** Bu commit'te hedefe eklenen ürün sayısı */
  items: number;
  /** Projeksiyon kategori notu hedefe yazılmadıysa (görünürlük, M8) */
  note_dropped?: string;
}

export interface IntakeMergeResult {
  categories: Category[];
  /** Mevcut kategorilere birleşenler (boş = hepsi yeni) */
  mergedInto: IntakeMergeInfo[];
  /** Gerçekten YENİ açılan kategori sayısı */
  addedCategories: number;
}

/**
 * Mevcut katalog kategorileri + projeksiyon kategorileri → birleşik liste.
 * SAF, deterministik; girdileri MUTASYONLAMAZ (yeni diziler döner).
 */
export function appendIntakeCategories(
  current: Category[],
  projected: Category[]
): IntakeMergeResult {
  /* Mevcutlar kopyalanır: kategori nesnesi yüzeysel kopya + items dizisi kopya
     (append edebilmek için) — mevcut ürün NESNELERİ aynen paylaşılır (satır
     içerikleri değişmez). */
  const categories: Category[] = current.map((c) => ({ ...c, items: [...c.items] }));
  const byFold = new Map<string, number>();
  categories.forEach((c, i) => byFold.set(foldTr(c.name_fr), i));

  const mergedInto: IntakeMergeInfo[] = [];
  let addedCategories = 0;

  for (const proj of projected) {
    const fold = foldTr(proj.name_fr);
    const hitIdx = byFold.get(fold);
    if (hitIdx === undefined) {
      /* Yeni kategori — eski davranış (sona ekle); haritaya girer ki projeksiyon-içi
         aynı-fold ikinci kategori de buna birleşsin. */
      categories.push({ ...proj, items: [...proj.items] });
      byFold.set(fold, categories.length - 1);
      addedCategories++;
      continue;
    }
    /* FIX-3: mevcut kategoriye ürün-append (mevcut satırlar dokunulmaz). */
    const target = categories[hitIdx];
    const base = target.items.length;
    const appended = proj.items.map((it, j) => ({ ...it, order: base + j + 1 }));
    target.items = [...target.items, ...appended];
    mergedInto.push({
      category_id: target.id,
      label: target.name_fr,
      items: appended.length,
      ...(proj.note_fr && proj.note_fr !== target.note_fr ? { note_dropped: proj.note_fr } : {}),
    });
  }

  /* Kategori order'ları yeniden numaralanır (F7-C onaylı davranışın aynısı) */
  return {
    categories: categories.map((c, i) => ({ ...c, order: i + 1 })),
    mergedInto,
    addedCategories,
  };
}
