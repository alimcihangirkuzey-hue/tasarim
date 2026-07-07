import tr from "./i18n/tr.json";

/* M9: arayüz metinleri tek dosyada; t("client.save") gibi kullanılır */
export function t(key: string): string {
  const val = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], tr);
  return typeof val === "string" ? val : key;
}

/** Yer tutuculu çeviri: tf("editor.export_done", { n: 2 }) → "Export tamam — v2" */
export function tf(key: string, vars: Record<string, string | number>): string {
  let s = t(key);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
