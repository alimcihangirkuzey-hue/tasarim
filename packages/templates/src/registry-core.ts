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
  type ParamDef,
  type ProductionChannel,
  type ProductionTechnique,
  type SlotKosulu,
  type TemplateManifest,
} from "./types.js";

/* ── Slot KOŞULU doğrulaması (koşullu gereklilik v2; journal
   2026-07-26-kosullu-gereklilik-v2) ──────────────────────────────────────────
   Geçerliyse null, geçersizse Türkçe gerekçe döner (f1-spec validate deseni).

   NEDEN MESAJ DÖNDÜREN FONKSİYON (fırlatan blok değil): dönüş tipi `string |
   null` olduğu için switch'in HER dalı dönmek ZORUNDADIR — SlotKosulu'na
   ikinci bir `kind` eklendiği gün burası da eksikZorunluVarliklar'ın
   değerlendiricisi gibi DERLEMEDE patlar. `default` dalı yazılsaydı yeni biçim
   sessizce "geçerli" sayılır ve doğrulanmadan yüklenirdi.

   ÜÇ KAPI (hepsi ÖLÜ İLAN kapısıdır — eslesme_parami ve technique/mode
   alt-küme kapılarının birebir emsali):
   (a) param VAR MI      — olmayan parama bağlanan koşul ölü ilandır,
   (b) param SEÇENEKLİ Mİ — seçenek kümesi olmayan paramda koşul KURULAMAZ,
   (c) değer KÜMEDE Mİ   — asla doğru olamayacak koşul ölü ilandır. */
function kosulHatasi(m: TemplateManifest, slotId: string, kosul: SlotKosulu): string | null {
  switch (kosul.kind) {
    case "param_esittir": {
      /* (a) OLMAYAN PARAM: eslesme_parami kapısının birebir emsali — koşul
         gerçek bir parama bağlanmak zorundadır, yoksa hiç değerlendirilemez. */
      const param = m.params.find((p) => p.id === kosul.param);
      if (!param) {
        return `slot "${slotId}" gereklilik koşulu "${kosul.param}" paramına bağlanıyor ama bu param manifest params listesinde yok (olmayan parama bağlanan koşul ölü ilandır)`;
      }
      /* (b) SEÇENEKSİZ PARAM (color/number/toggle): koşul KURULAMAZ. İki
         gerekçe: (1) kapalı bir değer kümesi olmadan koşulun değeri yük
         zamanında DOĞRULANAMAZ — (c) kapısı anlamsızlaşır ve yazım hatası
         sessizce yüklenir; (2) bu paramlar `paramValue()` yolunda DEJENEREDİR
         (engine/params.ts: options boşken belge değerini ATLAR ve hep
         varsayılanı döner — fabric_color'ı siyah olan belgede bile "#FFFFFF"
         çözer), yani koşul o yola bağlandığı an sessizce hep aynı cevabı
         verirdi. Seçeneksiz paramda koşul, doğrulanamaz VE güvenilemez olurdu.
         ŞERH: yalnız `options` okunur; `optionsByFormat` format-bağımlıdır,
         koşul ise format-bağımsız değerlendirilir — sadece optionsByFormat
         taşıyan param bu kapıdan geçemez (bugün örneği yok). */
      const secenekler = param.options;
      if (!Array.isArray(secenekler) || secenekler.length === 0) {
        return `slot "${slotId}" gereklilik koşulu "${kosul.param}" paramına bağlanıyor ama bu param seçenek kümesi ("options") taşımıyor (tip: "${param.type}") — kapalı değer kümesi olmayan paramda koşul kurulamaz: değeri yük zamanında doğrulanamaz ve paramValue() bu paramlarda dejeneredir (options boşken belge değerini atlar, hep varsayılanı döner)`;
      }
      /* (c) KÜME DIŞI DEĞER: technique/mode alt-küme kapısının birebir emsali.
         Karşılaştırma STRICT — seçenekler tipli saklanır (editör
         `opts.find((o) => String(o) === raw) ?? raw` ile TİPLİ yazar), bu
         yüzden sayısal seçenekli bir parama string değerle bağlanan koşul da
         burada yakalanır: belge o paramda hiçbir zaman string tutmaz. */
      if (!secenekler.some((o) => o === kosul.deger)) {
        return `slot "${slotId}" gereklilik koşulu "${kosul.param}" paramının "${kosul.deger}" değerini bekliyor ama bu değer paramın seçenekleri arasında yok (izinli: ${secenekler.map((o) => String(o)).join(", ")}) — asla doğru olamayacak koşul ölü ilandır`;
      }
      return null;
    }
  }
}

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

/* Kanonik hex renk biçimi — shared'daki `HexColor` (packages/shared/src/
   schemas.ts:10, `/^#[0-9a-fA-F]{6}$/`) ile EŞ KÜME.
   Bilerek LİTERAL ve MOCKUP_SAHNE_TURLERI / VARLIK_TURLERI'nin BİREBİR emsali:
   bu dosya @tezgah/shared'a runtime bağ TAŞIMAZ (identity alt-yolunun react'sız
   bağımlılık grafiği büyümez). Eş-küme olduğu testte DAVRANIŞLA çapraz
   doğrulanır (param-ilan-tutarliligi.test.ts: bir sonda kümesinde
   `HexColor.safeParse(s).success === HEX_BICIMI.test(s)` ölçülür) — iki tanım
   ayrışırsa test yüksek sesle patlar, sürüklenme sessiz kalamaz.
   ŞERH: `qr.ts:48` üçüncü ve DAHA GEVŞEK bir hex kabulü taşır (# isteğe bağlı,
   6 haneden fazlasını sessizce kırpar). Üç tanımı birleştirmek AYRI bir karardır
   (journal 2026-07-27-param-gecerli-deger-ilani, scope_out); burada bilinçli
   olarak KANONİK (en sıkı) biçim referans alınır — ilan, uygulamanın kabul
   edeceğinden gevşek olamaz. */
export const HEX_BICIMI = /^#[0-9a-fA-F]{6}$/;

/* ── Param İLAN TUTARLILIĞI doğrulaması (journal
   2026-07-27-param-gecerli-deger-ilani) ───────────────────────────────────────
   Geçerliyse null, geçersizse Türkçe gerekçe döner.

   NEDEN BU KAPI VAR: `ParamDef` üç ilan alanı taşır (`min`/`max`/`step`) ve
   `default`. Bu ilanlar ÖLÜ DEĞİLDİR — EditorPage sayı denetimini HTML
   `min`/`max`/`step` özniteliği olarak DOĞRUDAN bu alanlardan kurar ve
   `paramValue()` varsayılana düşerken `default`u okur. Yani ilan, kullanıcıya
   gösterilen sınırın ve deterministik geri-düşüşün TEK kaynağıdır. Kendi
   içinde tutarsız bir ilan (min > max · aralık dışı default · step ≤ 0 ·
   hex olmayan renk varsayılanı) bu iki tüketiciye de YALAN söyler: HTML
   denetimi hiçbir değeri kabul etmeyen bir aralık gösterir, geri-düşüş ise
   kendi ilan ettiği aralığın DIŞINA düşer. Depodaki diğer kapıların doktrini
   ("türetilebilir/tüketicisiz/ölü ilan yazılmaz") burada bir adım öteye gider:
   ilan TÜKETİLİYOR, o yüzden tutarsızlığı yük zamanında reddedilir.

   NEDEN MESAJ DÖNDÜREN FONKSİYON (fırlatan blok değil): `kosulHatasi()`nin
   BİREBİR emsali ve GEREKÇESİ AYNEN GEÇERLİDİR — hatta buradaki union daha
   sıcaktır. `ParamDef.type` KAPALI bir birleşimdir ("choice"|"toggle"|
   "number"|"color") ve dönüş tipi `string | null` olduğu için switch'in HER
   dalı dönmek ZORUNDADIR. `default` dalı BİLEREK YAZILMADI: beşinci bir param
   tipi eklendiği gün burası DERLEMEDE patlar ve o tipin geçerli-değer ilanının
   ne olduğuna karar vermeye ZORLAR. Fırlatan bir if-bloğu olsaydı yeni tip
   sessizce "denetimsiz geçerli" sayılırdı — tam da bu paketin kapatmaya
   çalıştığı sessiz-kabul deliği.

   choice/toggle dalları BİLEREK BOŞ (ölçüm dolu gerekçe):
   - choice: "default seçenekler arasında olmalı" kapısı DOĞRU görünür ama
     `options` TEK kaynak DEĞİLDİR — `optionsByFormat` (menu-grid-cells `cols`,
     menu-liste-premium `columns`) format başına AYRI küme ilan eder ve o iki
     paramda `options` HİÇ YOKTUR. Doğru kapı format-başına gezinmeli ve
     `defaultByFormat` ile birlikte değerlendirilmelidir; bu AYRI bir karardır
     (bu paketin ölçtüğü ayrışma sayısal aralık ↔ Zod şeması ayrışmasıdır).
   - toggle: `default`un boolean olduğu bugün TİP SİSTEMİNDE zaten gevşektir
     (`ParamValue = string | number | boolean`); runtime kapısı eklemek
     ölçülmemiş bir genişlemedir ve bu paketin ölçtüğü borç değildir. */
function paramIlanHatasi(p: ParamDef): string | null {
  switch (p.type) {
    case "number": {
      const { min, max, step } = p;
      /* (a) BOŞ ARALIK: min > max hiçbir değerin sağlayamadığı bir aralıktır —
         EditorPage bunu HTML min/max olarak yazar ve tarayıcı denetimi her
         girdiyi geçersiz sayar; ilan kullanıcıya kapalı bir kapı gösterir. */
      if (min !== undefined && max !== undefined && !(min <= max)) {
        return `param "${p.id}" (number) min=${String(min)} > max=${String(max)} — boş aralık ilan ediyor, hiçbir değer bu ilanı sağlayamaz`;
      }
      /* (b) SAYI OLMAYAN VARSAYILAN: `default` ParamValue'dur (string|number|
         boolean) — tip sistemi number paramda sayı olmasını ZORLAMAZ. Sayı
         olmayan varsayılan `paramValue()` geri-düşüşünü sayı-olmayan bir
         değerle doldurur ve tüketici (w_cm/h_cm → mm hesabı, designSeed → PRNG)
         NaN üretir. NaN/Infinity de reddedilir: ikisi de aralık ilanının
         DIŞINDADIR ve sessizce yayılır. */
      if (typeof p.default !== "number" || !Number.isFinite(p.default)) {
        return `param "${p.id}" (number) varsayılanı sonlu bir sayı değil (bulunan: ${JSON.stringify(p.default)}) — sayı paramın geri-düşüş değeri sayı olmak ZORUNDADIR, aksi hâlde tüketici NaN üretir`;
      }
      /* (c) ARALIK DIŞI VARSAYILAN: en sinsi tutarsızlık. `paramValue()` geçersiz
         değerde varsayılana düşer; varsayılan ilan edilen aralığın dışındaysa
         "deterministik geri-düşüş" ilanın KENDİSİNİ ihlal eden bir değere
         düşer — kullanıcıya gösterilen sınır ile sistemin ürettiği değer
         ayrışır. Yalnız ilan edilen uçlar denetlenir (min/max opsiyoneldir). */
      if (min !== undefined && p.default < min) {
        return `param "${p.id}" (number) varsayılanı ${String(p.default)} ilan edilen min=${String(min)} altında — geri-düşüş değeri kendi ilanının dışına düşer`;
      }
      if (max !== undefined && p.default > max) {
        return `param "${p.id}" (number) varsayılanı ${String(p.default)} ilan edilen max=${String(max)} üstünde — geri-düşüş değeri kendi ilanının dışına düşer`;
      }
      /* (d) POZİTİF OLMAYAN ADIM: HTML `step` özniteliği 0/negatif değerde
         geçersizdir (tarayıcı denetimi bozulur) ve "izinli değer ızgarası"
         tanımsızlaşır — ızgarasız ızgara ilanı ölü ilandır. */
      if (step !== undefined && (!Number.isFinite(step) || step <= 0)) {
        return `param "${p.id}" (number) step=${String(step)} pozitif sonlu sayı değil — adım ilanı izinli değer ızgarasını tanımlar, sıfır/negatif adım ızgarayı tanımsız bırakır`;
      }
      return null;
    }
    case "color": {
      /* Renk varsayılanı KANONİK biçimde olmalı: `cut_color` doğrudan
         `HexColor`a bağlı bir şema alanına (VitroParamsSchema) akar — biçimsiz
         varsayılan Zod'dan geçemez, yani geri-düşüş değeri ŞEMANIN
         REDDEDECEĞİ bir değer olurdu (ilan ⊆ şema invaryantının en dar hâli).
         `fabric_color`da şema bugün gevşektir (`z.string()`), ama orada da
         ölçülmüş bir çökme vardır: garment `fabricToHex()` düz nesne
         literalinde arama yapar ve hex olmayan değerde varsayılana düşemeyip
         TypeError fırlatabilir (journal ÖLÇÜM 4). İki ailede de biçimsiz
         varsayılan sessiz değil, GÜRÜLTÜLÜ bir arızadır. */
      if (typeof p.default !== "string" || !HEX_BICIMI.test(p.default)) {
        return `param "${p.id}" (color) varsayılanı kanonik hex biçiminde değil (bulunan: ${JSON.stringify(p.default)}, beklenen: ${HEX_BICIMI.source}) — renk paramın geri-düşüş değeri şemanın (HexColor) kabul ettiği biçimde olmak ZORUNDADIR`;
      }
      return null;
    }
    case "choice":
    case "toggle":
      return null;
  }
}

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
  /* Param İLAN TUTARLILIĞI (journal 2026-07-27-param-gecerli-deger-ilani):
     ZORUNLU ve KOŞULSUZ — `kabul`/`mockup_tercihi` gibi "yokluk = kısıtsız"
     DEĞİLDİR, çünkü denetlenen alanların kendisi (`default`) ZORUNLUDUR ve her
     paramda vardır. Kendi içinde tutarsız bir ilan iki canlı tüketiciye birden
     yalan söyler (EditorPage'in HTML min/max/step denetimi · paramValue()
     geri-düşüşü), bu yüzden yük zamanında REDDEDİLİR.
     ÖNCEDEN ÖLÇÜLDÜ: 11 manifestin 11'i de bu kapıdan GEÇER — kapı hiçbir
     mevcut ilanı kırmaz, yalnız gelecekteki tutarsızlığı durdurur. */
  for (const p of m.params) {
    const hata = paramIlanHatasi(p);
    if (hata) throw new Error(`Şablon "${key}": ${hata}`);
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
  /* Slot gereklilik KOŞULU (koşullu gereklilik v2): OPSİYONEL — yokluk ve düz
     "zorunlu" v1 davranışıdır, denetimsiz geçer. Koşul ilan eden slot ise
     GERÇEK bağ ister: bağlandığı param manifest'te olmalı, kapalı bir seçenek
     kümesi taşımalı ve beklenen değer o kümede bulunmalı — üçü de ÖLÜ İLAN
     kapısıdır (gerekçeler kosulHatasi şerhinde). Koşullu gereklilik BLOCKER
     üretir (empty-required çekirdek blocker'dır); asla ateşlenmeyecek ya da
     hiç değerlendirilemeyecek bir koşul, kapıyı sessizce açık bırakırdı.

     ŞERH (kapsam): denetim manifest.slots üzerindedir; repeater.itemSlots
     GEZİLMEZ — `kabul` kapısının birebir emsali ve aynı gerekçe: registry-core
     bugün itemSlots'a hiç bakmıyor, ilk itemSlots gezintisini eklemek AYRI bir
     karardır. Boşluk test katmanında kapatılır (kosullu-gereklilik.test.ts
     itemSlots dâhil koşullu ilanların TAM listesini pinler). */
  for (const slot of m.slots) {
    const gereklilik = slot.gereklilik;
    if (gereklilik === undefined || gereklilik === "zorunlu") continue;
    const hata = kosulHatasi(m, slot.id, gereklilik.kosul);
    if (hata) throw new Error(`Şablon "${key}": ${hata}`);
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
