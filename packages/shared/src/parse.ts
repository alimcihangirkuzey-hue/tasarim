/* Yapıştır-Parse motoru — FAZ2-GOREV §2.4.
   İlke: hata toleranslı, VERİ KAYBETMEZ. Tanınmayan her satır notes'a düşer;
   Detay satırının ham metni de (çıkarım yapılsa bile) notes'ta saklanır. */

import {
  OrderDetailsSchema,
  type OrderDetails,
  type ProductType,
} from "./schemas.js";
import { slugify } from "./utils.js";

/* TR karakter katlama: anahtar ve sözlük eşleşmeleri aksansız küçük harfle yapılır */
const FOLD: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};
export function foldTr(s: string): string {
  return s
    .split("")
    .map((ch) => FOLD[ch] ?? ch)
    .join("")
    .toLowerCase();
}

export interface ParsedOrderItem {
  product_type: ProductType;
  qty: number;
  width_cm: number | null;
  height_cm: number | null;
  details: OrderDetails;
  notes: string;
}

export interface ParsedOrder {
  isletme: string | null;
  sehir: string | null;
  tel: string | null;
  termin_raw: string | null;
  /** ISO (YYYY-MM-DD) çevrilebildiyse; yoksa null (ham hali termin_raw'da durur) */
  due_date: string | null;
  header_notes: string;
  items: ParsedOrderItem[];
}

const KEY_ALIASES: Record<string, string[]> = {
  isletme: ["isletme"],
  sehir: ["sehir", "ville"],
  tel: ["tel", "telefon", "gsm"],
  termin: ["termin", "teslim"],
  urun: ["urun", "produit"],
  olcu: ["olcu", "olculer", "boyut"],
  adet: ["adet", "quantite", "qty"],
  format: ["format"],
  detay: ["detay", "detail", "not"],
};

function keyOf(rawKey: string): string | null {
  const k = foldTr(rawKey).trim();
  for (const [canon, aliases] of Object.entries(KEY_ALIASES)) {
    if (aliases.includes(k)) return canon;
  }
  return null;
}

/* Ürün tipi eş anlamlı sözlüğü (§2.4) — özgülden genele sıralı */
const PRODUCT_DICT: Array<[ProductType, string[]]> = [
  ["vitrophanie", ["cam giydirme", "vitrophanie", "folyo", "cam"]],
  ["tabela", ["tabela", "enseigne"]],
  ["trifold", ["trifold", "katlamali"]],
  ["flyer", ["el ilani", "flyer", "brosur"]],
  ["tisort", ["tisort", "tshirt", "t-shirt"]],
  ["onluk", ["onluk", "tablier"]],
  ["menu", ["menu"]],
  ["fidelite", ["sadakat", "fidelite", "kart"]],
];

/** FAZ4 §10: DB eş-anlamlıları (parse_synonyms) çekirdek sözlükle birleşir;
    kullanıcı kaydı daha özgül sayılır ve ÖNCE denenir (uzun kelime önce). */
export function matchProductType(
  raw: string,
  extraDict: Record<string, ProductType> = {}
): ProductType {
  const f = foldTr(raw);
  const extra = Object.entries(extraDict)
    .map(([w, t]) => [foldTr(w).trim(), t] as const)
    .filter(([w]) => w.length > 0)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [w, t] of extra) {
    if (f.includes(w)) return t;
  }
  for (const [type, words] of PRODUCT_DICT) {
    if (words.some((w) => f.includes(w))) return type;
  }
  return "diger";
}

/* Detay anahtar kelime çıkarımı (§2.4) */
function extractDetails(raw: string, details: OrderDetails): void {
  const f = foldTr(raw);
  if (f.includes("distan")) details.side = "exterieur";
  if (f.includes("icten")) details.side = "interieur";
  if (f.includes("kesim") || f.includes("decoupe")) details.mode = "decoupe";
  if (f.includes("baski")) details.mode = "impression";
  if (f.includes("nakis")) details.technique = "broderie";
}

/* Ölçü: "180 x 120", "180x120", "180*120" (cm varsayılır; virgül ondalık kabul) */
const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i;
export function parseSize(raw: string): { w: number; h: number } | null {
  const m = SIZE_RE.exec(raw);
  if (!m) return null;
  const num = (s: string) => parseFloat(s.replace(",", "."));
  return { w: num(m[1]), h: num(m[2]) };
}

/* Termin: "20 Temmuz", "20 temmuz 2027", "20.07", "20/07/2026", "2026-07-20" */
const TR_MONTHS = [
  "ocak", "subat", "mart", "nisan", "mayis", "haziran",
  "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik",
];
export function parseDueDate(raw: string, todayISO: string): string | null {
  const f = foldTr(raw).trim();
  const year = Number(todayISO.slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, "0");

  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = /^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/.exec(f);
  if (m) {
    const mi = TR_MONTHS.indexOf(m[2]);
    if (mi >= 0) return `${m[3] ?? year}-${pad(mi + 1)}-${pad(Number(m[1]))}`;
  }

  m = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?$/.exec(f);
  if (m) return `${m[3] ?? year}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;

  return null;
}

function newItem(): ParsedOrderItem {
  return {
    product_type: "diger",
    qty: 1,
    width_cm: null,
    height_cm: null,
    details: OrderDetailsSchema.parse({}),
    notes: "",
  };
}

function appendNote(target: { notes: string }, line: string): void {
  const t = line.trim();
  if (!t) return;
  target.notes = target.notes ? `${target.notes}\n${t}` : t;
}

/**
 * Satırı "Anahtar: değer" segmentlerine böler; `/` yalnız yeni bir "anahtar:" başlatıyorsa
 * ayraçtır (değer içindeki / korunur — veri kaybetmeme).
 */
function splitSegments(line: string): string[] {
  const parts = line.split("/");
  const segments: string[] = [];
  for (const part of parts) {
    const looksLikeField = /^\s*[^:/]{1,24}:\s*/.test(part) && keyOf(part.split(":")[0]) !== null;
    if (looksLikeField || segments.length === 0) segments.push(part);
    else segments[segments.length - 1] += "/" + part;
  }
  return segments;
}

export function parseOrderText(
  text: string,
  opts: { today?: string; extraDict?: Record<string, ProductType> } = {}
): ParsedOrder {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const order: ParsedOrder = {
    isletme: null,
    sehir: null,
    tel: null,
    termin_raw: null,
    due_date: null,
    header_notes: "",
    items: [],
  };

  let current: ParsedOrderItem | null = null;
  const headerBucket = { get notes() { return order.header_notes; }, set notes(v: string) { order.header_notes = v; } };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const folded = foldTr(line);
    if (/^=+\s*siparis\s*=+$/.test(folded.replace(/\s+/g, " "))) continue; // başlık işareti
    if (/^-{2,}\s*kalem\s*-{2,}$/.test(folded.replace(/\s+/g, " "))) {
      current = newItem();
      order.items.push(current);
      continue;
    }

    let recognizedAny = false;
    for (const segment of splitSegments(line)) {
      const ci = segment.indexOf(":");
      if (ci < 0) continue;
      const canon = keyOf(segment.slice(0, ci));
      if (!canon) continue;
      const value = segment.slice(ci + 1).trim();
      if (!value) continue;
      recognizedAny = true;

      switch (canon) {
        case "isletme": order.isletme = value; break;
        case "sehir": order.sehir = value; break;
        case "tel": order.tel = value; break;
        case "termin":
          order.termin_raw = value;
          order.due_date = parseDueDate(value, today);
          break;
        case "urun":
          if (!current) { current = newItem(); order.items.push(current); }
          current.product_type = matchProductType(value, opts.extraDict ?? {});
          if (current.product_type === "diger") appendNote(current, `Ürün: ${value}`);
          break;
        case "olcu": {
          if (!current) { current = newItem(); order.items.push(current); }
          const size = parseSize(value);
          if (size) { current.width_cm = size.w; current.height_cm = size.h; }
          else appendNote(current, segment.trim());
          break;
        }
        case "adet": {
          if (!current) { current = newItem(); order.items.push(current); }
          const q = parseInt(value, 10);
          if (Number.isFinite(q) && q > 0) current.qty = q;
          else appendNote(current, segment.trim());
          break;
        }
        case "format":
          if (!current) { current = newItem(); order.items.push(current); }
          current.details.format = foldTr(value).replace(/\s+/g, "");
          break;
        case "detay":
          if (!current) { current = newItem(); order.items.push(current); }
          extractDetails(value, current.details);
          appendNote(current, value); // ham detay daima saklanır
          break;
      }
    }

    /* hiçbir alan tanınmadıysa satır aynen nota düşer (çöpe bilgi gitmez) */
    if (!recognizedAny) appendNote(current ?? headerBucket, line);
  }

  return order;
}

/* Müşteri yaklaşık eşleşmesi (§2.4): slug bazlı — tam eşleşme ya da kapsama */
export function matchClient<T extends { id: string; name: string; slug: string }>(
  isletme: string,
  clients: T[]
): T | null {
  const target = slugify(isletme);
  if (!target || target === "musteri") return null;
  const exact = clients.find((c) => c.slug === target);
  if (exact) return exact;
  return (
    clients.find(
      (c) =>
        (target.length >= 4 && c.slug.includes(target)) ||
        (c.slug.length >= 4 && target.includes(c.slug))
    ) ?? null
  );
}
