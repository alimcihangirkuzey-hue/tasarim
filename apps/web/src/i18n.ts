import tr from "./i18n/tr.json";

/* M9: arayüz metinleri tek dosyada; t("client.save") gibi kullanılır */
export function t(key: string): string {
  const val = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], tr);
  return typeof val === "string" ? val : key;
}
