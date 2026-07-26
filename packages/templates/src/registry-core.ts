/* Kayıt defteri çekirdeği — kimlik yük-zamanı invaryantının TEK kaynağı
   (Canonical 7.2 #1; C-P0 kilit taşı). Bilerek react'sız: hem tam kayıt
   defteri (index.ts, react-bağımlı) hem manifest-yalnız kayıt defteri
   (identity/index.ts, C-P1 backlog — react-sız) BURADAN türer; invaryant
   iki yerde AYRI yazılıp sürüklenmez. */

import { dogrulaSeverityOverrides } from "./engine/severity.js";
import {
  MATERIAL_TYPES,
  PRODUCTION_CHANNELS,
  isMaterialType,
  type TemplateManifest,
} from "./types.js";

function dogrulaManifest(key: string, m: TemplateManifest): void {
  if (!isMaterialType(m.type)) {
    throw new Error(
      `Şablon "${key}": bilinmeyen materyal türü "${String(m.type)}" (izinli: ${MATERIAL_TYPES.join(", ")})`
    );
  }
  if (!Number.isInteger(m.profile_version) || m.profile_version < 1) {
    throw new Error(
      `Şablon "${key}": profile_version pozitif tamsayı olmalı (bulunan: ${String(m.profile_version)})`
    );
  }
  /* Harita anahtarı ile manifest.id ayrışamaz: ayrışırsa aynı anahtarla
     erişim başka bir manifest'in kimliğiyle cevap verir. */
  if (m.id !== key) {
    throw new Error(`Şablon "${key}": manifest.id "${m.id}" harita anahtarıyla uyuşmuyor`);
  }
  /* Profil şiddet katmanı yalnız sıkılaştırabilir; bozuk tablo yüklenemez */
  dogrulaSeverityOverrides(`Şablon "${key}"`, m.severity_overrides);
  /* Üretim kanalı ilanı (7.2/8.5): çıktısız profil olmaz, tekrar ve
     bilinmeyen kanal sessizce giremez — uçlar bu ilana güvenir */
  if (!Array.isArray(m.production_channels) || m.production_channels.length === 0) {
    throw new Error(
      `Şablon "${key}": production_channels boş olamaz — kanal bildirmeyen profil, çıktısı bilinmeyen profildir (izinli: ${PRODUCTION_CHANNELS.join(", ")})`
    );
  }
  for (const kanal of m.production_channels) {
    if (!(PRODUCTION_CHANNELS as readonly string[]).includes(kanal)) {
      throw new Error(
        `Şablon "${key}": bilinmeyen üretim kanalı "${String(kanal)}" (izinli: ${PRODUCTION_CHANNELS.join(", ")})`
      );
    }
  }
  if (new Set(m.production_channels).size !== m.production_channels.length) {
    throw new Error(`Şablon "${key}": production_channels tekrarlı kanal içeriyor`);
  }
}

/**
 * Kayıt defterini KURAR ve YÜKLENİRKEN doğrular — tek geçiş, jenerik T
 * (TemplateEntry ya da salt TemplateManifest). `generated` üzerine el yazımı
 * yazılır (kasıtlı). El yazımı KÜME İÇİ çift-id REDDEDİLİR.
 */
export function birlestirVeDogrula<T>(
  generated: Record<string, T>,
  elYazimi: readonly T[],
  manifestOf: (item: T) => TemplateManifest
): Record<string, T> {
  const defter: Record<string, T> = { ...generated };
  const gorulen = new Set<string>();
  for (const item of elYazimi) {
    const id = manifestOf(item).id;
    if (gorulen.has(id)) {
      throw new Error(`Şablon id çakışması: "${id}" iki kez kayıtlı (el yazımı)`);
    }
    gorulen.add(id);
    defter[id] = item; /* GENERATED'i ezmesi kasıtlı — yerleşik kimlik kazanır */
  }
  for (const [key, item] of Object.entries(defter)) {
    dogrulaManifest(key, manifestOf(item));
  }
  return defter;
}
