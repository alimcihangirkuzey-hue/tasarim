/* Sipariş Defteri kuralları — FAZ2-GOREV §2.2 zorunlu alan matrisi.
   Saf fonksiyonlar: kırmızı rozetlerin ve durum kapısının TEK kaynağı.

   FİYATLANDIRMA GİRDİLERİ İLANI (Canonical 7.2 "Sipariş alma şeması
   (zorunlu/koşullu/opsiyonel)" + "Fiyatlandırma girdileri"; 4.5 "kurallar
   koda gömülmez; bildirimsel kural setleri olarak yaşar" + kural türü
   "fiyat ve adet girdileri"): matris önceden missingFields İÇİNDE switch
   PROSEDÜRÜYDÜ ve ProjectsPanel form görünürlüğü aynı bilgiyi 4 ayrı
   tür-koşuluyla TEKRARLIYORDU (drift riski). Artık İLAN aşağıdaki tabloda
   yaşar; missingFields jenerik okuyucudur, form uygulanabilirlik kümesini
   buradan okur. Bu alanların tamamı fiyatı belirleyen üretim girdileridir
   (adet/tiraj · ölçü-m² · yüz/mod · teknik · format · beden dağılımı).
   v1 düzeyleri: zorunlu + opsiyonel; "koşullu" düzey bugün alansız (v2,
   journal şerhi). Davranış değişmedi: eski switch'in referans kopyasıyla
   TAM kombinasyon taraması diferansiyeli orders.test.ts'te. */

import type { OrderDetails, OrderStatus, ProductType } from "./schemas.js";

export interface OrderItemLike {
  product_type: ProductType;
  qty: number;
  width_cm: number | null;
  height_cm: number | null;
  details: OrderDetails;
}

/** Sipariş girdi alanlarının kapalı sözlüğü (yazım hatası derlenemez) */
export const PRICING_INPUT_FIELDS = [
  "qty",
  "width_cm",
  "height_cm",
  "side",
  "mode",
  "technique",
  "sizes",
  "format",
] as const;
export type PricingInputField = (typeof PRICING_INPUT_FIELDS)[number];

export interface PricingInputDecl {
  alan: PricingInputField;
  /** true = eksikse kalem olcu_bekliyor'dan çıkamaz; false = opsiyonel (formda görünür, kapıya girmez) */
  zorunlu: boolean;
}

const Z = (alan: PricingInputField): PricingInputDecl => ({ alan, zorunlu: true });
const O = (alan: PricingInputField): PricingInputDecl => ({ alan, zorunlu: false });

/* Ürün türü → girdi İLANI — EXHAUSTIVE Record (yeni ürün türü buraya ilan
   yazmadan derlenemez; 7.2 "yeni sektör = yeni profil" bu satıra kalem
   eklemektir). SIRA SÖZLEŞMEDİR: missingFields çıktı sırası = tablo sırası
   (mevcut testler sırayı pinler). */
export const PRICING_INPUTS: Record<ProductType, readonly PricingInputDecl[]> = {
  menu: [Z("format")],
  flyer: [Z("format")],
  trifold: [Z("format")],
  fidelite: [Z("format")],
  vitrophanie: [Z("width_cm"), Z("height_cm"), Z("side"), Z("mode")],
  tabela: [Z("width_cm"), Z("height_cm")],
  tisort: [Z("qty"), Z("technique"), O("sizes")],
  onluk: [Z("qty"), Z("technique"), O("sizes")],
  diger: [],
};

/** Ürün türünün girdi ilanı — form uygulanabilirliği bunu okur */
export function pricingInputsOf(t: ProductType): readonly PricingInputDecl[] {
  return PRICING_INPUTS[t];
}

/* Alan → doluluk yüklemi: eski switch'teki denetimlerin birebir taşınmışı
   (qty: `!item.qty || item.qty < 1` değilse; ölçüler truthy sayı; details
   alanları truthy). Tek yerde yaşar — tür başına tekrarlanmaz. */
const DOLU_MU: Record<PricingInputField, (item: OrderItemLike) => boolean> = {
  qty: (it) => !!it.qty && it.qty >= 1,
  width_cm: (it) => !!it.width_cm,
  height_cm: (it) => !!it.height_cm,
  side: (it) => !!(it.details ?? {}).side,
  mode: (it) => !!(it.details ?? {}).mode,
  technique: (it) => !!(it.details ?? {}).technique,
  sizes: (it) => !!(it.details ?? {}).sizes,
  format: (it) => !!(it.details ?? {}).format,
};

/**
 * Tipe göre eksik ZORUNLU alanların listesi (alan anahtarları) — ilanın
 * jenerik okuyucusu. Boş liste ⇒ kalem "tam"; dolu ⇒ kırmızı rozet +
 * olcu_bekliyor'dan çıkamaz. Opsiyonel ilanlar (sizes) buraya girmez.
 */
export function missingFields(item: OrderItemLike): string[] {
  return PRICING_INPUTS[item.product_type]
    .filter((g) => g.zorunlu && !DOLU_MU[g.alan](item))
    .map((g) => g.alan);
}

/** olcu_bekliyor'dan çıkış yalnız zorunlu alanlar tamamsa (FAZ2-GOREV §2.2) */
export function canTransition(
  item: OrderItemLike,
  from: OrderStatus,
  to: OrderStatus
): { ok: boolean; missing: string[] } {
  if (to === "iptal" || to === from) return { ok: true, missing: [] };
  if (from === "olcu_bekliyor" && to !== "olcu_bekliyor") {
    const missing = missingFields(item);
    return { ok: missing.length === 0, missing };
  }
  return { ok: true, missing: [] };
}

/** İçeriden (intérieur) uygulanan vitrophanie ⇒ miroir uyarısı (FAZ2-GOREV §2.2) */
export function needsMiroirWarning(item: OrderItemLike): boolean {
  return item.product_type === "vitrophanie" && item.details?.side === "interieur";
}

/** Termin vurgusu: geçtiyse "red", ≤3 gün "yellow", yoksa/uzaksa "none" (§2.3) */
export function dueLevel(due_date: string | null, today: string): "none" | "yellow" | "red" {
  if (!due_date) return "none";
  const due = Date.parse(due_date);
  const now = Date.parse(today);
  if (Number.isNaN(due) || Number.isNaN(now)) return "none";
  const days = Math.floor((due - now) / 86_400_000);
  if (days < 0) return "red";
  if (days <= 3) return "yellow";
  return "none";
}

/* ------------------------------------------------------------------ */
/* Paket presetleri — FAZ4-GOREV §11 (kod içi sabit; arayüz Faz S)      */
/* ------------------------------------------------------------------ */

export interface PresetItem {
  product_type: ProductType;
  details?: Record<string, unknown>;
}

/** "Açılış Takımı": menü A3 + flyer 21x21 + sadakat kartı + vitrophanie (ölçü bekler) */
export const OPENING_KIT: { name_tr: string; items: PresetItem[] } = {
  name_tr: "Açılış Takımı",
  items: [
    { product_type: "menu", details: { format: "a3" } },
    { product_type: "flyer", details: { format: "21x21" } },
    { product_type: "fidelite" },
    { product_type: "vitrophanie" }, /* ölçüsüz → olcu_bekliyor kırmızı rozet */
  ],
};
