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

/** theme_id → Theme; bilinmeyen kimlik marka temasına düşer (deterministik, sessiz kırılma yok) */
export function resolveTheme(themeId: string, kit: BrandKit): Theme {
  if (themeId === "brand") return brandTheme(kit);
  return PRESET_THEMES[themeId] ?? brandTheme(kit);
}

/** SVG kök elemanına verilecek inline stil nesnesi */
export function themeStyle(theme: Theme): Record<string, string> {
  return { ...theme.vars };
}
