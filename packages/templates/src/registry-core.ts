/* Kayıt defteri çekirdeği — kimlik yük-zamanı invaryantının TEK kaynağı
   (Canonical 7.2 #1; C-P0 kilit taşı). Bilerek react'sız: hem tam kayıt
   defteri (index.ts, react-bağımlı) hem manifest-yalnız kayıt defteri
   (identity/index.ts, C-P1 backlog — react-sız) BURADAN türer; invaryant
   iki yerde AYRI yazılıp sürüklenmez. */

import { dogrulaSeverityOverrides } from "./engine/severity.js";
import {
  KANAL_GEREKTIRIR,
  MATERIAL_TYPES,
  PRODUCTION_CHANNELS,
  PRODUCTION_SUBSTRATES,
  PRODUCTION_TECHNIQUES,
  SUBSTRAT_TEKNIKLERI,
  isMaterialType,
  type ProductionChannel,
  type ProductionTechnique,
  type TemplateManifest,
} from "./types.js";

/* Mockup sahne türü sözlüğü — shared'daki SceneKindSchema ile EŞ KÜME.
   Bilerek LİTERAL: bu dosya @tezgah/shared'a runtime bağ TAŞIMAZ (identity
   alt-yolunun grafiği büyümez); eş-kümelik testte SceneKindSchema.options ile
   çapraz doğrulanır (mockup-tercihi.test.ts — sürüklenme sessiz kalamaz). */
export const MOCKUP_SAHNE_TURLERI = ["vitrine", "facade", "garment", "generic"] as const;

/* Varlık türü sözlüğü — shared'daki AssetKindSchema ile EŞ KÜME.
   MOCKUP_SAHNE_TURLERI emsali ve aynı gerekçe: runtime import bilinçli YOK
   (identity alt-yolunun bağımlılık grafiği büyümez); eş-kümelik testte
   AssetKindSchema.options ile çapraz doğrulanır (dosya-rolleri.test.ts) —
   sürüklenme sessiz kalamaz, test yüksek sesle patlar. */
export const VARLIK_TURLERI = ["logo", "photo", "other"] as const;

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
  /* İzinli üretim teknikleri (7.2/4.5): tekniksiz profil üretimsiz profildir;
     teknik↔kanal ÇİFT YÖNLÜ bağ — ayrışma yüklenemez */
  if (!Array.isArray(m.production_techniques) || m.production_techniques.length === 0) {
    throw new Error(
      `Şablon "${key}": production_techniques boş olamaz (izinli: ${PRODUCTION_TECHNIQUES.join(", ")})`
    );
  }
  for (const teknik of m.production_techniques) {
    if (!(PRODUCTION_TECHNIQUES as readonly string[]).includes(teknik)) {
      throw new Error(
        `Şablon "${key}": bilinmeyen üretim tekniği "${String(teknik)}" (izinli: ${PRODUCTION_TECHNIQUES.join(", ")})`
      );
    }
  }
  if (new Set(m.production_techniques).size !== m.production_techniques.length) {
    throw new Error(`Şablon "${key}": production_techniques tekrarlı teknik içeriyor`);
  }
  /* Array.isArray daraltması any[]'e düşürür — sözleşme tipi geri bildirilir */
  const kanallar = m.production_channels as readonly ProductionChannel[];
  for (const kanal of kanallar) {
    const gereken = KANAL_GEREKTIRIR[kanal];
    if (!m.production_techniques.includes(gereken)) {
      throw new Error(
        `Şablon "${key}": "${kanal}" kanalı "${gereken}" tekniğini gerektirir ama teknik ilan edilmemiş (kanal tekniksiz üretilemez)`
      );
    }
  }
  for (const teknik of m.production_techniques) {
    if (!kanallar.some((k) => KANAL_GEREKTIRIR[k] === teknik)) {
      throw new Error(
        `Şablon "${key}": "${teknik}" tekniği ilanlı ama onu üreten hiçbir kanal ilanlı değil (kanalsız teknik ölü ilandır)`
      );
    }
  }
  /* Üretim substratı (7.2/501 MALZEME yarısı; 4.5/8.5 teknik–malzeme uyumu):
     taşıyıcısını bildirmeyen/bilinmeyen bildiren profil yüklenemez */
  if (!(PRODUCTION_SUBSTRATES as readonly string[]).includes(m.production_substrate)) {
    throw new Error(
      `Şablon "${key}": bilinmeyen substrat "${String(m.production_substrate)}" (izinli: ${PRODUCTION_SUBSTRATES.join(", ")})`
    );
  }
  /* Çapraz bağ: substratın taşıyamadığı teknik ilan edilemez — kâğıda nakış
     atılmaz; ilan ile fizik ayrışırsa yük zamanında patlar, sessiz kalmaz */
  const substratTeknikleri = SUBSTRAT_TEKNIKLERI[m.production_substrate];
  for (const teknik of m.production_techniques) {
    if (!substratTeknikleri.includes(teknik)) {
      throw new Error(
        `Şablon "${key}": teknik "${teknik}" substrat "${m.production_substrate}" üzerinde uygulanamaz (izinli: ${substratTeknikleri.join(", ")})`
      );
    }
  }
  /* technique/mode paramları teknik-değerlidir: seçenekleri ilanın alt kümesi */
  for (const p of m.params) {
    if ((p.id === "technique" || p.id === "mode") && "options" in p && Array.isArray(p.options)) {
      for (const secenek of p.options) {
        if (!m.production_techniques.includes(secenek as ProductionTechnique)) {
          throw new Error(
            `Şablon "${key}": "${p.id}" paramı "${String(secenek)}" seçeneği izinli teknikler dışında (ilan: ${m.production_techniques.join(", ")})`
          );
        }
      }
    }
  }
  /* Mockup sahne tercihi İLANI (7.2 "Önizleme türleri"): OPSİYONEL — yokluk =
     çekirdek tercih (severity_overrides emsali); tanımlıysa bozuk ilan
     YÜKLENEMEZ. eslesme_parami GERÇEK bağ ister: o id'li param manifest'te
     olmalı — olmayan parama bağlanan eşleşme ölü ilandır. */
  if (m.mockup_tercihi !== undefined) {
    const tercih = m.mockup_tercihi;
    if (!Array.isArray(tercih.sahne_turleri) || tercih.sahne_turleri.length === 0) {
      throw new Error(
        `Şablon "${key}": mockup_tercihi.sahne_turleri boş olamaz — türsüz tercih ilan değildir (izinli: ${MOCKUP_SAHNE_TURLERI.join(", ")})`
      );
    }
    for (const tur of tercih.sahne_turleri) {
      if (!(MOCKUP_SAHNE_TURLERI as readonly string[]).includes(tur)) {
        throw new Error(
          `Şablon "${key}": mockup_tercihi bilinmeyen sahne türü "${String(tur)}" içeriyor (izinli: ${MOCKUP_SAHNE_TURLERI.join(", ")})`
        );
      }
    }
    if (typeof tercih.sahne_puani !== "number" || !Number.isFinite(tercih.sahne_puani) || tercih.sahne_puani <= 0) {
      throw new Error(
        `Şablon "${key}": mockup_tercihi.sahne_puani pozitif sonlu sayı olmalı (bulunan: ${String(tercih.sahne_puani)})`
      );
    }
    if (
      tercih.eslesme_parami !== undefined &&
      !m.params.some((p) => p.id === tercih.eslesme_parami)
    ) {
      throw new Error(
        `Şablon "${key}": mockup_tercihi.eslesme_parami "${tercih.eslesme_parami}" manifest params listesinde yok (olmayan parama bağlanan eşleşme ölü ilandır)`
      );
    }
  }
  /* Dosya ROLÜ ilanı (7.2/502 "Dosya gereksinimleri ve ROLLERİ"): OPSİYONEL —
     yokluk = KISITSIZ (mockup_tercihi emsali); tanımlıysa bozuk ilan
     YÜKLENEMEZ. ÇİFT KAYNAK KAPISI: rol önce BİND'DAN türetilir
     (kabulEdilenTurler — 22 image slotunun 18'i orada ölçüldü); bind'ı olan
     slota `kabul` yazmak türetilebileni kopyalayan İKİNCİ KAYNAKTIR ve
     sürüklenir (ilan bir şey der, filtre başkasını uygular) — yük zamanında
     reddedilir. Alan yalnız türetimin BİTTİĞİ yerde (bind:null) yazılır.

     ŞERH (kapsam): denetim manifest.slots üzerindedir; repeater.itemSlots
     GEZİLMEZ — registry-core bugün itemSlots'a hiç bakmıyor (ne gereklilik ne
     bind ne kind için) ve buraya ilk itemSlots gezintisini eklemek AYRI bir
     karardır. Boşluk test katmanında kapatılır: dosya-rolleri.test.ts
     itemSlots dâhil hiçbir bind'lı slotta `kabul` yazılı OLMADIĞINI pinler. */
  for (const slot of m.slots) {
    if (slot.kabul === undefined) continue;
    /* ÖLÜ İLAN KAPISI: kabul yalnız image slotunda ANLAMLIDIR — metin/renk/qr
       slotuna yazılan kabul kümesini hiçbir okuyucu tüketmez (kabulEdilenTurler
       null'a düşer, AssetPicker o slot için hiç açılmaz) ve sessizce ölü kalır.
       Bu paketin kendi doktrini (türetilebilir/tüketicisiz ilan yazılmaz) burada
       da geçerlidir: yanlış katmana yazılmış ilan yük zamanında REDDEDİLİR. */
    if (slot.kind !== "image") {
      throw new Error(
        `Şablon "${key}": slot "${slot.id}" kind "${slot.kind}" olduğu hâlde "kabul" ilan ediyor — varlık türü kabulü YALNIZ image slotunda okunur, başka kind'da ölü ilandır`
      );
    }
    if (slot.bind) {
      throw new Error(
        `Şablon "${key}": slot "${slot.id}" hem "bind" hem "kabul" ilan ediyor — rol bind'dan TÜRETİLİR ("${slot.bind}"), el yazımı "kabul" ikinci kaynaktır ve sürüklenir ("kabul" yalnız bind'sız slotlara yazılır)`
      );
    }
    if (!Array.isArray(slot.kabul) || slot.kabul.length === 0) {
      throw new Error(
        `Şablon "${key}": slot "${slot.id}" kabul listesi boş olamaz — türsüz kabul ilan değildir (izinli: ${VARLIK_TURLERI.join(", ")})`
      );
    }
    for (const tur of slot.kabul) {
      if (!(VARLIK_TURLERI as readonly string[]).includes(tur)) {
        throw new Error(
          `Şablon "${key}": slot "${slot.id}" bilinmeyen varlık türü "${String(tur)}" kabul ediyor (izinli: ${VARLIK_TURLERI.join(", ")})`
        );
      }
    }
    if (new Set(slot.kabul).size !== slot.kabul.length) {
      throw new Error(`Şablon "${key}": slot "${slot.id}" kabul listesi tekrarlı tür içeriyor`);
    }
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
