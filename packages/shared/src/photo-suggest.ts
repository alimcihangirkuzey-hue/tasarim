/* Foto önerisi motoru — FAZ4-GOREV §9. SAF: yalnız öneri üretir, hiçbir şeyi
   bağlamaz (otomatik bağlama YOK — bağlama UI'da tek tık onayla yapılır).
   Eşleşme: normalize ürün adı kelimeleri ↔ normalize varlık etiketi
   (çok kelimeli etiketler bitişik kelime dizisi olarak aranır). */

import { foldTr } from "./parse.js";

export interface SuggestAsset {
  id: string;
  tags: string; // virgüllü ham dize (assets.tags)
  kind: string;
}

/** TR katlama (foldTr) + FR aksanları (NFD ayrıştır, birleşik imleri at) */
function fold(s: string): string {
  return foldTr(s.normalize("NFD").replace(/[̀-ͯ]/g, ""));
}

export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => fold(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeName(name: string): string {
  return " " + fold(name).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() + " ";
}

/** Ürün adına uyan varlıklar; uzun (daha özgül) etiket önce, eşitlikte id sırası. */
export function suggestPhotosForName(name_fr: string, assets: SuggestAsset[]): string[] {
  const hay = normalizeName(name_fr);
  const scored: Array<{ id: string; len: number }> = [];
  for (const a of assets) {
    if (a.kind === "logo") continue; // logo asla yemek fotosu önerisi değildir
    let best = 0;
    for (const tag of parseTags(a.tags)) {
      if (hay.includes(" " + tag + " ")) best = Math.max(best, tag.length);
    }
    if (best > 0) scored.push({ id: a.id, len: best });
  }
  scored.sort((x, y) => y.len - x.len || (x.id < y.id ? -1 : 1));
  return scored.map((s) => s.id);
}

/** Yalnız FOTOĞRAFSIZ ürünler için öneri haritası (fotolu ürüne dokunulmaz). */
export function suggestPhotos(
  items: Array<{ id: string; name_fr: string; photo: string | null }>,
  assets: SuggestAsset[]
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const it of items) {
    if (it.photo) continue;
    const s = suggestPhotosForName(it.name_fr, assets);
    if (s.length > 0) out.set(it.id, s);
  }
  return out;
}
