/* TUR-FIX-2: menü chrome başlığı dil-duyarlı — TR menüde "NOTRE CARTE" basma
   bug'ı. Kullanıcı override'ı (detached) HER ZAMAN kazanır (dil-nötr tercih);
   override yoksa başlık ÇIKTI diline göre seçilir. de = CH-Almancası, ß'siz.
   (footnote_fr dil-duyarlılığı aynı ailenin TODO'daki kardeşi — ayrı iş.) */

import type { MenuLanguage } from "@tezgah/shared";

export const TITLE_BY_LANG: Record<MenuLanguage, string> = {
  fr: "NOTRE CARTE",
  de: "SPEISEKARTE",
  tr: "MENÜ",
};

/** PageChrome title slotu → basılacak dize. detached=true (kullanıcı override)
    ise slot değeri aynen; değilse dil varsayılanı (bilinmeyen dil → fr). */
export function resolveChromeTitle(
  title: { str: string; detached: boolean },
  lang: MenuLanguage
): string {
  if (title.detached) return title.str;
  return TITLE_BY_LANG[lang] ?? TITLE_BY_LANG.fr;
}
