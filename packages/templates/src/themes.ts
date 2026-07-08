/* Tema sistemi — FAZ1-GOREV §3. Şablonlar SADECE bu CSS custom property'leri kullanır
   (CONSTITUTION §5.3); tema değişimi render kodu değişmeden çalışır.
   Şablon, tema KİMLİĞİNE göre dallanamaz; kurdele/başlık ayrımı categoryStyle
   tanımlayıcısından gelir (velours-rouge → ribbon). */

import type { BrandKit } from "@tezgah/shared";

export interface ThemeVars {
  "--c-bg": string;
  "--c-panel": string;
  "--c-heading": string;
  "--c-item": string;
  "--c-desc": string;
  "--c-price": string;
  "--c-accent": string;
  "--c-line": string;
  "--f-heading": string;
  "--f-item": string;
  "--f-body": string;
  "--f-script": string;
}

export interface Theme {
  id: string;
  name_tr: string;
  vars: ThemeVars;
  /** Kategori ayracı biçimi: ribbon = degrade bant + script yazı, underline = büyük başlık + aksan çizgisi */
  categoryStyle: "ribbon" | "underline";
  /** Font ağırlıkları (aynı aile farklı ağırlık kullanan temalar için) */
  weights: { heading: number; item: number };
  /** Başlık/ürün adlarında uppercase kuralı */
  uppercaseHeading: boolean;
  /**
   * Deterministik metin ölçümü için ort. glif genişliği / font boyu oranı
   * (SVG'de otomatik satır kırma yoktur; sarma motoru bu oranla çalışır, M8)
   */
  ratios: { heading: number; item: number; body: number; script: number };
}

const F = {
  oswald: `"Oswald", "Inter", sans-serif`,
  anton: `"Anton", "Inter", sans-serif`,
  archivo: `"Archivo Black", "Inter", sans-serif`,
  inter: `"Inter", sans-serif`,
  bitter: `"Bitter", "Inter", serif`,
  pacifico: `"Pacifico", cursive`,
};

/* Tema 1 — ARAS panel stili: siyah + altın */
const OR_NOIR: Theme = {
  id: "or-noir",
  name_tr: "Altın-Siyah",
  categoryStyle: "underline",
  weights: { heading: 700, item: 600 },
  uppercaseHeading: true,
  ratios: { heading: 0.42, item: 0.42, body: 0.5, script: 0.56 }, // Oswald kondanse
  vars: {
    "--c-bg": "#1D1B1A",
    "--c-panel": "#262321",
    "--c-heading": "#E3A93F",
    "--c-item": "#FFFFFF",
    "--c-desc": "#B7B0A5",
    "--c-price": "#E3A93F",
    "--c-accent": "#E3A93F",
    "--c-line": "#6E675E",
    "--f-heading": F.oswald,
    "--f-item": F.oswald,
    "--f-body": F.inter,
    "--f-script": F.pacifico,
  },
};

/* Tema 2 — ARAS masa menüsü: koyu + turuncu + serif */
const ARAS_ORANGE: Theme = {
  id: "aras-orange",
  name_tr: "Turuncu-Serif",
  categoryStyle: "underline",
  weights: { heading: 400, item: 700 }, // Archivo Black tek ağırlıktır (400 = black çizim)
  uppercaseHeading: true,
  ratios: { heading: 0.64, item: 0.54, body: 0.5, script: 0.56 },
  vars: {
    "--c-bg": "#141110",
    "--c-panel": "#1E1A17",
    "--c-heading": "#F0562B",
    "--c-item": "#F3EBDD",
    "--c-desc": "#A79E92",
    "--c-price": "#F0562B",
    "--c-accent": "#F0562B",
    "--c-line": "#5B534B",
    "--f-heading": F.archivo,
    "--f-item": F.bitter,
    "--f-body": F.inter,
    "--f-script": F.pacifico,
  },
};

/* Tema 3 — MADO'S: kadife bordo + kurdele + kesikli hücreler */
const VELOURS_ROUGE: Theme = {
  id: "velours-rouge",
  name_tr: "Kadife-Bordo",
  categoryStyle: "ribbon",
  weights: { heading: 400, item: 400 }, // Pacifico ve Archivo Black tek ağırlık
  uppercaseHeading: true,
  ratios: { heading: 0.56, item: 0.64, body: 0.5, script: 0.56 },
  vars: {
    "--c-bg": "#5E0F1D",
    "--c-panel": "#000000cc",
    "--c-heading": "#FFFFFF",
    "--c-item": "#FFFFFF",
    "--c-desc": "#E8DAD2",
    "--c-price": "#FFFFFF",
    "--c-accent": "#E63329",
    "--c-line": "#FFFFFFbf",
    "--f-heading": F.pacifico, // kurdele yazısı
    "--f-item": F.archivo,
    "--f-body": F.inter,
    "--f-script": F.pacifico,
  },
};

export const PRESET_THEMES: Record<string, Theme> = {
  [OR_NOIR.id]: OR_NOIR,
  [ARAS_ORANGE.id]: ARAS_ORANGE,
  [VELOURS_ROUGE.id]: VELOURS_ROUGE,
};

/** Marka kiti → varsayılan "brand" teması (M5: kit değişirse tüm belgeler yeni kiti giyer) */
export function brandTheme(kit: BrandKit): Theme {
  return {
    id: "brand",
    name_tr: "Marka",
    categoryStyle: "underline",
    weights: { heading: 400, item: 400 }, // Anton tek ağırlık; kit fontu değişirse de güvenli
    uppercaseHeading: true,
    ratios: { heading: 0.5, item: 0.5, body: 0.5, script: 0.56 }, // kit fontu bilinmez → temkinli

    vars: {
      "--c-bg": kit.colors.background,
      "--c-panel": kit.colors.secondary,
      "--c-heading": kit.colors.primary,
      "--c-item": kit.colors.text,
      "--c-desc": kit.colors.secondary,
      "--c-price": kit.colors.primary,
      "--c-accent": kit.colors.accent,
      "--c-line": kit.colors.secondary,
      "--f-heading": `"${kit.fonts.heading}", "Inter", sans-serif`,
      "--f-item": `"${kit.fonts.heading}", "Inter", sans-serif`,
      "--f-body": `"${kit.fonts.body}", sans-serif`,
      "--f-script": F.pacifico,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Özel temalar — FAZ4-GOREV §7 (DB'de token, burada Theme'e derlenir)  */
/* ------------------------------------------------------------------ */

/** Font anahtarı → yığın, deterministik ölçüm oranı (M8) ve güvenli ağırlık.
    Oranlar yerleşik temalardaki ölçümlerle aynı kaynaktan. */
export const FONT_META: Record<
  string,
  { stack: string; ratio: number; weight: number; label: string }
> = {
  oswald: { stack: F.oswald, ratio: 0.42, weight: 700, label: "Oswald" },
  anton: { stack: F.anton, ratio: 0.5, weight: 400, label: "Anton" },
  archivo: { stack: F.archivo, ratio: 0.64, weight: 400, label: "Archivo Black" },
  inter: { stack: F.inter, ratio: 0.5, weight: 600, label: "Inter" },
  bitter: { stack: F.bitter, ratio: 0.54, weight: 700, label: "Bitter" },
  pacifico: { stack: F.pacifico, ratio: 0.56, weight: 400, label: "Pacifico" },
};

export interface CustomThemeTokens {
  base: "or-noir" | "aras-orange" | "velours-rouge";
  colors: {
    bg: string; panel: string; heading: string; item: string;
    desc: string; price: string; accent: string; line: string;
  };
  fonts: { heading: string; item: string; body: string; script: string };
}

/** Özel (yüklenmiş) font ailesi için metrik: bilinmez genişlik → temkinli oran 0.5,
    güvenli ağırlık 400. Inter fallback ile deterministik yığın (mimar #18, M8). */
function customFontMeta(family: string): { stack: string; ratio: number; weight: number; label: string } {
  return { stack: `"${family}", "Inter", sans-serif`, ratio: 0.5, weight: 400, label: family };
}

/** Token seti → tam Theme: davranış (categoryStyle, uppercase) base'den,
    ağırlık/oranlar seçilen fontların metriklerinden türer. */
export function themeFromTokens(id: string, name: string, tokens: CustomThemeTokens): Theme {
  const base = PRESET_THEMES[tokens.base] ?? OR_NOIR;
  /* yerleşik anahtar → sabit metrik; özel aile adı → temkinli genel yığın; boş → inter */
  const fm = (k: string) => FONT_META[k] ?? (k ? customFontMeta(k) : FONT_META.inter);
  return {
    id,
    name_tr: name,
    categoryStyle: base.categoryStyle,
    uppercaseHeading: base.uppercaseHeading,
    weights: { heading: fm(tokens.fonts.heading).weight, item: fm(tokens.fonts.item).weight },
    ratios: {
      heading: fm(tokens.fonts.heading).ratio,
      item: fm(tokens.fonts.item).ratio,
      body: fm(tokens.fonts.body).ratio,
      script: fm(tokens.fonts.script).ratio,
    },
    vars: {
      "--c-bg": tokens.colors.bg,
      "--c-panel": tokens.colors.panel,
      "--c-heading": tokens.colors.heading,
      "--c-item": tokens.colors.item,
      "--c-desc": tokens.colors.desc,
      "--c-price": tokens.colors.price,
      "--c-accent": tokens.colors.accent,
      "--c-line": tokens.colors.line,
      "--f-heading": fm(tokens.fonts.heading).stack,
      "--f-item": fm(tokens.fonts.item).stack,
      "--f-body": fm(tokens.fonts.body).stack,
      "--f-script": fm(tokens.fonts.script).stack,
    },
  };
}

/* Kayıt defteri: uygulama açılışında API'den doldurulur (web + print AYNI yol → M3) */
const CUSTOM_THEMES = new Map<string, Theme>();
let PREVIEW_THEME: Theme | null = null;

export function registerCustomThemes(
  list: Array<{ id: string; name: string; tokens: CustomThemeTokens }>
): void {
  CUSTOM_THEMES.clear();
  for (const t of list) CUSTOM_THEMES.set(t.id, themeFromTokens(t.id, t.name, t.tokens));
}

export function customThemeList(): Theme[] {
  return [...CUSTOM_THEMES.values()];
}

/** Ayarlar sayfası canlı önizlemesi: kaydedilmemiş token setini geçici tanıtır */
export function setPreviewTheme(theme: Theme | null): void {
  PREVIEW_THEME = theme;
}

/** theme_id → Theme; bilinmeyen kimlik marka temasına düşer (deterministik, sessiz kırılma yok) */
export function resolveTheme(themeId: string, kit: BrandKit): Theme {
  if (PREVIEW_THEME && themeId === PREVIEW_THEME.id) return PREVIEW_THEME;
  if (themeId === "brand") return brandTheme(kit);
  return PRESET_THEMES[themeId] ?? CUSTOM_THEMES.get(themeId) ?? brandTheme(kit);
}

/** SVG kök elemanına verilecek inline stil nesnesi */
export function themeStyle(theme: Theme): Record<string, string> {
  return { ...theme.vars };
}
