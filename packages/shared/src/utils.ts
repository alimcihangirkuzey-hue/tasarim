/* Tekil yardımcılar — CONSTITUTION §10 */

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** 7.5 -> "7,50 €" (FR yereli, M9) */
export function formatPrice(value: number): string {
  return fmt.format(value).replace(/\u00a0/g, " ");
}

/** Türkçe karakterleri de düzgün çeviren slug üretici */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
    é: "e", è: "e", ê: "e", à: "a", â: "a", î: "i", ô: "o", û: "u", œ: "oe",
  };
  return input
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "musteri";
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Prefiksli benzersiz kimlik: cli_, ast_, prj_, doc_ ... */
export function newId(prefix: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}
