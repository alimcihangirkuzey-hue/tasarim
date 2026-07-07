/* Binding çözümleyici — CONSTITUTION §5 (sistemin kalbi), M1/M5.
   Saf fonksiyonlar: DOM yok, yan etki yok; Vitest ile birebir test edilir (§12). */

import type {
  AssetDTO,
  BrandKit,
  Catalog,
  Category,
  ClientDTO,
  DocumentState,
  Item,
  Selection,
} from "@tezgah/shared";
import type { SlotDef } from "../types.js";

/** Bind yollarının kökleri: brand.* → marka kiti, catalog.* → katalog, item.* → repeater öğesi */
export interface BindScope {
  brand: BrandKit;
  catalog: Catalog;
  item?: Item;
}

/**
 * "brand.contact.phone" gibi bir yolu güvenle yürür.
 * Eksik anahtar / eksik item → null (asla throw etmez; şablon boş slot uyarısı üretir, M4).
 */
export function resolvePath(path: string, scope: BindScope): unknown {
  const [root, ...rest] = path.split(".");
  let cur: unknown;
  if (root === "brand") cur = scope.brand;
  else if (root === "catalog") cur = scope.catalog;
  else if (root === "item") cur = scope.item;
  else return null;

  for (const key of rest) {
    if (cur === null || cur === undefined || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur === undefined ? null : cur;
}

export interface SelectedCategory {
  category: Category;
  items: Item[];
}

/**
 * Katalog + selection → bu belgeye akacak kategori/ürün dizisi (CONSTITUTION §4.5).
 * - category_order boşsa: tüm kategoriler kendi `order` alanına göre.
 * - category_order doluysa: yalnız listelenenler, o sırayla (bilinmeyen id sessizce atlanır*).
 *   *Atlama "içerik kırpma" değildir: kaynak katalogda olmayan bir referanstır.
 * - visible:false ürünler hiçbir belgeye akmaz (§4.4); excluded_items belge bazında düşer.
 * - Ürünler `order` alanına göre sıralanır (eşitlikte katalog sırası korunur — stable sort).
 */
export function resolveSelection(catalog: Catalog, selection: Selection): SelectedCategory[] {
  const byId = new Map(catalog.categories.map((c) => [c.id, c]));
  const ordered: Category[] =
    selection.category_order.length > 0
      ? selection.category_order.flatMap((id) => {
          const c = byId.get(id);
          return c ? [c] : [];
        })
      : [...catalog.categories].sort((a, b) => a.order - b.order);

  const excluded = new Set(selection.excluded_items);
  return ordered
    .map((category) => ({
      category,
      items: category.items
        .filter((it) => it.visible && !excluded.has(it.id))
        .sort((a, b) => a.order - b.order),
    }))
    .filter((sc) => sc.items.length > 0);
}

/** Repeater akışı: kategori ayracı + ürün sırası (grid/liste aynı diziyi tüketir) */
export type FlowEntry =
  | { kind: "category"; category: Category }
  | { kind: "item"; item: Item; category: Category };

export function selectionFlow(selected: SelectedCategory[]): FlowEntry[] {
  const out: FlowEntry[] = [];
  for (const sc of selected) {
    out.push({ kind: "category", category: sc.category });
    for (const item of sc.items) out.push({ kind: "item", item, category: sc.category });
  }
  return out;
}

export interface SlotValue {
  value: unknown;
  /** true → override edilmiş, ⛓️‍💥 işareti taşır ve "veriye geri bağla" sunulur (M5) */
  detached: boolean;
}

/**
 * Slot değeri önceliği: override (detached) > bind çözümü > default_fr > null.
 * Boş string bind sonucu "değer yok" sayılır ve default_fr'a düşer (boş telefon gibi).
 */
export function resolveSlotValue(
  slot: SlotDef,
  overrides: DocumentState["overrides"],
  scope: BindScope
): SlotValue {
  const ov = overrides[slot.id];
  if (ov && ov.detached) return { value: ov.value, detached: true };

  if (slot.bind) {
    const bound = resolvePath(slot.bind, scope);
    if (bound !== null && bound !== "") return { value: bound, detached: false };
  }
  return { value: slot.default_fr ?? null, detached: false };
}

/** Asset kimliği → DTO (yoksa null; şablon yer tutucu/uyarı üretir) */
export function assetById(client: ClientDTO, assetId: unknown): AssetDTO | null {
  if (typeof assetId !== "string" || !assetId) return null;
  return client.assets.find((a) => a.id === assetId) ?? null;
}

/** Belgenin seçimindeki fotoğrafsız ürünler — Eksik Görsel Akışı §8.2 */
export function missingPhotoItems(selected: SelectedCategory[]): Array<{ item: Item; category: Category }> {
  const out: Array<{ item: Item; category: Category }> = [];
  for (const sc of selected) {
    for (const item of sc.items) {
      if (!item.photo) out.push({ item, category: sc.category });
    }
  }
  return out;
}
