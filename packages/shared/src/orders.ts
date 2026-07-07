/* Sipariş Defteri kuralları — FAZ2-GOREV §2.2 zorunlu alan matrisi.
   Saf fonksiyonlar: kırmızı rozetlerin ve durum kapısının TEK kaynağı. */

import type { OrderDetails, OrderStatus, ProductType } from "./schemas.js";

export interface OrderItemLike {
  product_type: ProductType;
  qty: number;
  width_cm: number | null;
  height_cm: number | null;
  details: OrderDetails;
}

/**
 * Tipe göre eksik zorunlu alanların listesi (alan anahtarları).
 * Boş liste ⇒ kalem "tam"; dolu ⇒ kırmızı rozet + olcu_bekliyor'dan çıkamaz.
 */
export function missingFields(item: OrderItemLike): string[] {
  const out: string[] = [];
  const d = item.details ?? {};
  switch (item.product_type) {
    case "vitrophanie":
      if (!item.width_cm) out.push("width_cm");
      if (!item.height_cm) out.push("height_cm");
      if (!d.side) out.push("side");
      if (!d.mode) out.push("mode");
      break;
    case "tabela":
      if (!item.width_cm) out.push("width_cm");
      if (!item.height_cm) out.push("height_cm");
      break;
    case "tisort":
    case "onluk":
      if (!item.qty || item.qty < 1) out.push("qty");
      if (!d.technique) out.push("technique");
      break;
    case "menu":
    case "trifold":
    case "flyer":
    case "fidelite":
      if (!d.format) out.push("format");
      break;
    case "diger":
      break;
  }
  return out;
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
