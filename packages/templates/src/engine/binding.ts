/* Binding çözümleyici — CONSTITUTION §5 (sistemin kalbi), M1/M5.
   Saf fonksiyonlar: DOM yok, yan etki yok; Vitest ile birebir test edilir (§12). */

import type {
  AssetDTO,
  AssetKind,
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
    .map((category) => {
      const visible = category.items.filter((it) => it.visible && !excluded.has(it.id));
      /* FAZ5 §5/§6: belge item_order varsa REORDER-HİNT — listelenenler önce
         (o sırayla), listelenmeyenler katalog order'ıyla sonra (M1: yeni ürün akar) */
      const ord = selection.item_order?.[category.id];
      const items =
        ord && ord.length > 0
          ? [...visible].sort((a, b) => {
              const pa = ord.indexOf(a.id);
              const pb = ord.indexOf(b.id);
              const ka = pa === -1 ? Number.POSITIVE_INFINITY : pa;
              const kb = pb === -1 ? Number.POSITIVE_INFINITY : pb;
              return ka !== kb ? ka - kb : a.order - b.order;
            })
          : [...visible].sort((a, b) => a.order - b.order);
      return { category, items };
    })
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

/**
 * Dosya gereksinimleri motoru (Canonical 7.2/502; journal
 * 2026-07-26-dosya-gereklilik-ilani). SAF — react yok, yan etki yok.
 *
 * empty-required uyarısı elle yazılmış if satırlarından değil SlotDef.gereklilik
 * İLANINDAN üretilir (ilan = davranış). v1 kapsamı BİLEREK dar:
 * - yalnız gereklilik === "zorunlu" && kind === "image" slotlar (dosya
 *   gereksinimi; metin/rozet alan eksikliği bu ilanın dışı),
 * - çözüm mevcut bind zinciriyle birebir: resolveSlotValue (override > bind >
 *   default) → assetById (chrome/brand logo deseni — grid/liste'nin
 *   chromeSlotValue'lu, trifold/flyer/carte/enseigne'nin resolveSlotValue'lu
 *   elle if'leriyle aynı çözümleme),
 * - QR empty-required'ları DOSYA değil brandkit ALAN gereksinimidir (boş
 *   instagram/tel kaynağı) — bu motora bağlanmaz, elle üretim sürer.
 * Çıktı slot sırasıyla döner (deterministik).
 */
export function eksikZorunluVarliklar(
  slots: readonly SlotDef[],
  client: ClientDTO,
  doc: DocumentState
): Array<{ type: "empty-required"; slotId: string }> {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const out: Array<{ type: "empty-required"; slotId: string }> = [];
  for (const slot of slots) {
    if (slot.gereklilik !== "zorunlu" || slot.kind !== "image") continue;
    if (!assetById(client, resolveSlotValue(slot, doc.overrides, scope).value)) {
      out.push({ type: "empty-required", slotId: slot.id });
    }
  }
  return out;
}

/* ── Dosya ROLLERİ (7.2/502 "Dosya gereksinimleri ve ROLLERİ" ikinci yarısı;
   journal 2026-07-26-dosya-rolleri-ilani) ────────────────────────────────────
   Bind deseni → kabul edilen varlık türleri. Rolün BİRİNCİL kaynağı budur:
   canlı kayıt defterindeki 22 image slotunun 18'i (%81,8) bu üç desenden
   birine düşer (brand.logo_primary ×11, brand.logo_mono ×4, item.photo ×3).
   ŞERH: item.photo "photo|other" kabul eder, yalnız "photo" değil — "other"
   ürün fotoğrafı olarak yüklenmiş ama sınıflandırılmamış varlıkları içeride
   tutar (AssetKindSchema.catch("other") deseni: yükleyici tür bilmiyorsa
   "other" yazar; o varlıkları elemek bugünkü davranışı DARALTIRDI). Logo
   kümesi bilinçli TEKİL: marka logosu yerine keyfi fotoğraf bağlanması bu
   ilanın önlemek için var olduğu yaradır. */
const BIND_ROLLERI: Readonly<Record<string, readonly AssetKind[]>> = {
  "brand.logo_primary": ["logo"],
  "brand.logo_mono": ["logo"],
  "item.photo": ["photo", "other"],
};

/**
 * Slotun KABUL ETTİĞİ varlık türleri (Canonical 7.2/502; journal
 * 2026-07-26-dosya-rolleri-ilani). SAF — react yok, DOM yok, yan etki yok;
 * varlık seçicilerin filtresi BU sorgudan okunur, sert kodlu tür listesinden
 * değil (ilan ile davranış ayrışamaz).
 *
 * TÜRETİM BİRİNCİLDİR — bu sıranın sebebi ölçümdür: 22 image slotunun 18'inde
 * rol zaten bind deseninde YAZILIDIR. O 18 slota el yazımı bir rol alanı
 * yazmak türetilebileni kopyalayan İKİNCİ KAYNAK olurdu ve sürüklenirdi
 * (ilan bir şey der, filtre başkasını uygular — entegrasyon-sınırı kararının
 * (a) gerekçesi). Bu yüzden sıra: bind deseni → (bind yoksa) slot.kabul
 * ilanı → null.
 *
 * null "ROL YOK" DEĞİL "KISITSIZ" demektir: çağıran hiçbir türü elemez, tüm
 * galeriyi gösterir (bugünkü filtresiz davranışın birebir korunması). Üç yol
 * null döner: (a) kind !== "image" — dosya rolü yalnız GÖRSEL slotların
 * boyutudur (metin/fiyat/QR/rozet bu eksende yaşamaz), (b) tabloda karşılığı
 * olmayan bir bind (yeni bind deseni sessizce kısıtsız kalır — kısıtlamak
 * ürün kararıdır, tabloya kalem eklemek ister), (c) ilansız bind'sız image
 * slotu.
 */
export function kabulEdilenTurler(slot: SlotDef): readonly AssetKind[] | null {
  if (slot.kind !== "image") return null;
  if (slot.bind) {
    /* Object.hasOwn: prototip zinciri rol değildir — "toString" gibi bir bind
       miras alınmış fonksiyonu rol kümesi sanmamalı (materialTypeOfOrNull emsali) */
    return Object.hasOwn(BIND_ROLLERI, slot.bind) ? BIND_ROLLERI[slot.bind] : null;
  }
  return slot.kabul ?? null;
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
