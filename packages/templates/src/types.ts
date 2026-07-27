/* Şablon sözleşmeleri — CONSTITUTION §5 alan adlarıyla birebir (§14.1/3) */

import type { ComponentType } from "react";
import type { AssetKind, ClientDTO, DocumentState, ExportRecordDTO, SceneKind } from "@tezgah/shared";
import type { LayoutWarning } from "./engine/layout.js";
import type { SeverityOverrides } from "./engine/severity.js";

/* ── Üretim kanalı taksonomisi (Canonical 8.5; 7.2 "Üretim çıktıları") ────
   Her çıktı türü adlandırılmış bir KANALDIR. v1 İLAN sözlüğü yalnız üretim
   kanallarını kapsar; türev/sunum kanalları (print_cmyk print'ten türer,
   mockup/presentation üretim dosyası YERİNE GEÇMEZ — 8.5, snapshot güvenlik
   kaydı, digital_menu müşteri-düzeyli, broderie_fiche broderie'nin eki)
   bilinçli ilan dışı — journal şerhi. ALT-KÜME KİLİDİ: buradaki her değer
   kayıt sözlüğünde (ExportRecordDTO["kind"]) OLMAK ZORUNDA — satisfies,
   uydurma kanal adını derlemede yakalar. */
export const PRODUCTION_CHANNELS = [
  "print",
  "preview",
  "decoupe",
  "broderie",
  "png",
] as const satisfies readonly ExportRecordDTO["kind"][];
export type ProductionChannel = (typeof PRODUCTION_CHANNELS)[number];

/* ── DIŞA AÇIK KANAL kümesi (Canonical 7.2/507 "Diğer modüllerle entegrasyon
   sınırları"; 7.4/524 bağlayıcı katmanı; journal
   2026-07-26-entegrasyon-siniri-karari) ──────────────────────────────────────
   İmzalı MAKİNE KANALINDAN (POST /render — B→C sözleşmesi, styva FLYER M7)
   istenebilecek üretim kanalları. Kümenin DIŞINDA kalanlar (decoupe, broderie,
   png) atölye içidir: yalnız oturum açmış kullanıcının kendi export uçlarından
   üretilir. Entegrasyon sınırı budur — "profil ne üretir" (production_channels)
   ile "dış sistem ne isteyebilir" AYRI iki sorudur.

   7.2/507 RED KARARI — profil manifest'ine ayrı bir entegrasyon/dış-kanal
   alanı BİLEREK EKLENMEDİ. Ölçülmüş DÖRT gerekçe:
   (a) TÜRETİLEBİLİR: dışa açık küme = production_channels ∩ render contract
       enum'u (aşağıdaki DIS_KANALLAR). El yazımı İKİNCİ KAYNAK türetilebileni
       kopyalar ve sürüklenir — ilan bir şey der, bekçi başkasını uygular.
   (b) FARKLILAŞMIYOR: print/preview ilan eden 9 kayıtlı ailenin HİÇBİRİ
       "print ilan ederim ama dışa kapalı olsun" demiyor; per-manifest alan
       bugün bilgi taşımaz — ölü sözleşme yazılmaz.
   (c) KANONİK BEYAN BAŞKA KATMANLARDA: protokol entegrasyon bildirimini
       eklenti manifestine (7.3/516: yetenek beyanı · gerekli izinler · gerekli
       entitlement) ve bağlayıcı bildirimine (7.4/524: kimlik doğrulama yöntemi ·
       sözleşme sürümü · hız sınırı · denetim kaydı) VERMİŞTİR. EK-D sözlüğü
       üretim profilini "geometri, kural, teknik ve çıktı sözleşmesi" diye
       tanımlar — tanımda entegrasyon YOKTUR.
   (d) YETKİ PLATFORM KATMANININDIR: 9.5/696 erişimi entitlement'a bağlar
       ("kod içinde sabit premium kontrolü yapılmaz") ve 9.5/699 kontrol
       noktaları arasında "profil kullanımı"nı sayar; hangi tenant'ın hangi
       ucu çağırabileceği profilin işi değildir. Profilin cevapladığı tek soru
       ÇIKTI sözleşmesidir ve o zaten ilanlıdır.
   EMSAL ZİNCİRİ: preview_types (aşağıdaki MockupTercihi şerhi) ve 7.2/495'in
   "hedef kullanıcı" yarısı (aşağıdaki HEDEF_SEKTOR şerhi) aynı ölçüyle ilan
   dışı kaldı — bu ÜÇÜNCÜSÜDÜR. Bir profil ilanlı kanalını dışa kapatmak
   istediği gün farklılaşma doğar ve alan eklenir; karar journal ister.

   NEDEN LİTERAL (türetme değil): contract enum (RenderRequestV1Schema.variant)
   apps/server'da yaşar ve templates→server bağı YOKTUR — bağımlılık ters yönde
   akar (server templates'i okur; identity alt-yolu bunun için var). Bu yüzden
   küme burada elle yazılır, enum ile EŞ-KÜMELİK server tarafında testle
   çivilenir: MOCKUP_SAHNE_TURLERI ≡ SceneKindSchema.options emsali (bilinçli
   literal — sürüklenme sessiz kalamaz, test yüksek sesle patlar).
   ALT-KÜME KİLİDİ: `satisfies` PRODUCTION_CHANNELS dışı bir adı derlemede
   yakalar — dışa açık kanal, önce ÜRETİM KANALI olmak zorundadır. */
export const DIS_KANALLAR = ["print", "preview"] as const satisfies readonly ProductionChannel[];
export type DisKanal = (typeof DIS_KANALLAR)[number];

/* ── İzinli üretim teknikleri (7.2; 4.5 "hangi teknik hangi malzemede") ───
   Kapalı sözlük: baskı (impression) · nakış (broderie) · kesim (decoupe).
   Teknik ile ÇIKTI KANALI zorunlu ilişkilidir (garment.ts kanalı teknikten
   seçer; kesim SVG'si decoupe tekniğinin çıktısıdır) — KANAL_GEREKTIRIR
   eşlemesi bu ilişkinin İLANIDIR ve registry-core çift yönlü bağı yük
   zamanında doğrular: tekniği ilansız kanal üretilemez, kanalı ilansız
   teknik ölü ilandır. */
export const PRODUCTION_TECHNIQUES = ["impression", "broderie", "decoupe"] as const;
export type ProductionTechnique = (typeof PRODUCTION_TECHNIQUES)[number];

/** Kanal → onu üreten teknik (çift yönlü bağın tek kaynağı) */
export const KANAL_GEREKTIRIR: Record<ProductionChannel, ProductionTechnique> = {
  print: "impression",
  preview: "impression",
  png: "impression",
  decoupe: "decoupe",
  broderie: "broderie",
};

/* ── İzinli üretim substratları (7.2/501 "İzinli üretim teknikleri ve
   malzemeler" maddesinin MALZEME yarısı; 4.5/327 "teknik uygunluk (hangi
   teknik hangi malzemede)"; 8.5/643 "teknik–malzeme uyumu") ───────────────
   Kapalı sözlük: kâğıt (kagit) · karton (karton) · vinil (vinil) · panel
   (panel) · kumaş (kumas). Substrat FİZİKSEL TAŞIYICIDIR ve teknikle zorunlu
   ilişkilidir: her teknik her taşıyıcıda uygulanamaz (kâğıda nakış atılmaz,
   kartona kesim kanalı açılmaz) — SUBSTRAT_TEKNIKLERI bu ilişkinin İLANIDIR
   (KANAL_GEREKTIRIR emsali) ve registry-core çapraz bağı yük zamanında
   doğrular: substratın taşıyamadığı teknik ilan edilemez. */
export const PRODUCTION_SUBSTRATES = ["kagit", "karton", "vinil", "panel", "kumas"] as const;
export type ProductionSubstrate = (typeof PRODUCTION_SUBSTRATES)[number];

/** Substrat → üzerinde uygulanabilir teknikler (teknik–malzeme bağının tek kaynağı) */
export const SUBSTRAT_TEKNIKLERI: Record<ProductionSubstrate, readonly ProductionTechnique[]> = {
  kagit: ["impression"],
  karton: ["impression"],
  vinil: ["impression", "decoupe"],
  panel: ["impression"],
  kumas: ["impression", "broderie"],
};

/* ── Mockup sahne tercihi İLANI (Canonical 7.2 "Önizleme türleri") ────────
   Önizleme TÜRLERİ bugün tür-bağımsız ölçüldü: dört sunum rotası (mockup/
   mockup_hires/presentation/digital_menu) şablon/materyal bekçisiz çalışır
   ve profil-başına tür listesi FARKLILAŞMADIĞINDAN bir preview_types alanı
   bilgi taşımazdı — ölü sözleşme eklenmedi; farklılaşma doğunca alan eklenir
   (journal şerhi: 2026-07-26-onizleme-turleri). Profil-başına farklılaşan
   TEK önizleme boyutu MOCKUP SAHNE TERCİHİDİR ve o da EditorPage'de
   template_id==="garment" SERT KODUYLA yaşıyordu — C-P1'de temizlenen
   id-sniff deseninin önizleme katmanındaki kaçağı. Bu alan o kararı İLAN
   eder; tek okuyucusu sahneSkoru'dur (engine/mockup-tercihi.ts) ve eski
   satır-içi skorlamayla birebir eşdeğerlik referans-kopya golden'la çivilidir
   (mockup-tercihi.test.ts). */
export interface MockupTercihi {
  /** Tercih edilen sahne türleri — sahne bu listedeyse sahne_puani kazanır */
  sahne_turleri: readonly SceneKind[];
  /** Tercihli sahne türünün sıralama puanı (pozitif sonlu; registry doğrular) */
  sahne_puani: number;
  /** Tanımlıysa: sahnenin fabric_color'ı belgenin BU id'li paramıyla eşleşince
      +1 (koyu/renkli kumaş sahne eşleşmesi). Param manifest'te OLMALI —
      olmayan parama bağlanan eşleşme ölü ilandır (registry reddeder). */
  eslesme_parami?: string;
}

export type RenderMode = "edit" | "print";

export type SlotKind = "text" | "image" | "color" | "price" | "qr" | "badge";

/* Taşma sözlüğü TEK kaynaktan gelir: kompozisyon motoru. Burada ayrı bir liste
   tutulursa manifest'in ilan EDEBİLDİĞİ ile motorun UYGULADIĞI ayrışır — nitekim
   ayrışmıştı: burası 2 değer sayıyordu, motor 4 tanıyor; "flow" ve
   "truncate-with-warning" hiçbir manifestte ilan edilemiyordu. */
import type { OverflowStrategy } from "./engine/composition.js";
export type OverflowRule = OverflowStrategy;

/** mm cinsinden izinli font aralığı (M8: shrink bu aralıkta çalışır) */
export interface FontRangeMM {
  min: number;
  max: number;
}

/* ── Slot koşul dili v2 (Canonical 7.2/496 "koşullu" alan sınıfı; 4.5 "kural
   bildirimsel, deterministik ve test edilebilir olmalı"; journal
   2026-07-26-kosullu-gereklilik-v2) ──────────────────────────────────────────

   KAPALI ETİKETLİ BİRLEŞİM — F1Trigger emsali (shared/f1-spec.ts:44-50): tam
   olarak aynı mekanizma (kapalı union + tüketicide exhaustive switch), çünkü
   bu deponun koşullu-tetikleyici sorusuna verilmiş KANITLANMIŞ cevabı odur.

   ÖLÇÜM (kararın dayanağı; koşullu zorunluluk taşıyan canlı aileler taranarak):
   2 aile · 4 manifest · 7 koşul örneği · 5 AYRIK biçim. "param == değer"
   biçimi örnek uzayının yalnız %28,6'sını (biçimlerin %20'sini) kapsar ve bu
   kapsama aile aile TAMAMEN AYRIŞIR:
     · vitrophanie %100 — tek `mode` paramı, kapalı iki değerli küme, iki dal
       örnek uzayını TAM BÖLER (impression→logo, decoupe→logo_mono; üç
       kompozisyon bandeau/centre/colonne TEK SLOT_DEFS paylaşır → tek ilan
       noktası üç manifesti birden kapatır),
     · garment %0 — beş biçimin HİÇBİRİ eşitlik değil: override eşitliği,
       luminance-türevi boolean, kardeş slot varlığı, iki param bileşimi +
       boş-küme fallback, slot-id şablonu.

   NEDEN JENERİK İFADE DİLİ YAZILMADI (üç ölçülmüş gerekçe):
   (a) DEPODA EMSALİ SIFIR: serbest-ifade taraması (jsonlogic / new Function /
       eval / ifade ayrıştırıcısı) 0 isabet verdi. Bu depo koşulu HER YERDE
       kapalı union + exhaustive switch ile çözer (F1Trigger; KANAL_GEREKTIRIR;
       SUBSTRAT_TEKNIKLERI). Yeni bir paradigma tek bir aile için açılmaz.
   (b) KANONİK DİL TARİF ETMEZ: 4.5 kuralın "bildirimsel, deterministik ve test
       edilebilir" olmasını ister — bir İFADE DİLİ tarif etmez; 7.2/496 yalnızca
       alanların "koşullu" SINIFINI anar, koşulun nasıl yazılacağını değil.
       Kapalı union üç şartı da sağlar; jenerik dil determinizmi ve test
       edilebilirliği ZAYIFLATIRDI (sonsuz ifade uzayı nöbetçiyle çivilenemez).
   (c) SPEKÜLATİF GENİŞLİK YAZILMAZ: AND/OR birleşimi, sayısal karşılaştırma ve
       iç içe yol yürüme ölçümde ÖRNEĞİ OLMAYAN yeteneklerdir — bu paketin
       kendi red ölçütü (türetilebilir/tüketicisiz/örneksiz ilan yazılmaz,
       DIS_KANALLAR şerhi (b) gerekçesi) burada da geçerlidir.

   `kind` ETİKETİ GENİŞLEME KAPISIDIR — tek üyeli bir union'ın etiket taşıması
   bugün gereksiz görünür, YARIN'IN GÜVENLİĞİDİR: ikinci biçim (ör.
   `param_iceriyor`, `slot_dolu`) eklendiği anda değerlendiricinin exhaustive
   switch'i DERLEMEDE patlar ve o biçimi ele almayı zorunlu kılar. Etiketsiz
   yazılsaydı (düz `{param, deger}`) genişleme sessiz bir tip gevşemesi olurdu.

   GARMENT NEDEN BU PAKETTE DEĞİL — engeli koşul dili DEĞİL, ÜÇ ÖN KOŞUL borcu:
   (1) `areas` paramı manifest.params'ta YOK (EditorPage sert-kodlu panelden
       yazar) — koşul bağlanacak param ilanlı değil;
   (2) `area:*:logo` slotları manifest.slots'ta YOK — motor manifest üzerinden
       gezerken garment'ın gerçek slotlarını ADLANDIRAMAZ;
   (3) `paramValue()` (engine/params.ts) color/number paramlarında DEJENERE:
       `options` boş olduğunda belge değerini ATLAR ve HER ZAMAN varsayılanı
       döner → fabric_color'ı siyah olan belgede bile "#FFFFFF" çözer, yani
       fabricDark koşulu asla ateşlenmezdi.
   Bu üçü kapanmadan garment koşulu bildirimsel ifade edilse bile DOĞRULANAMAZ;
   ayrı paket(ler)dir. (3) ayrıca bağımsız bir BUG ADAYIDIR — düzeltilmesi
   davranış değişikliği riski taşır, ölçülmeden dokunulmaz.

   SİPARİŞ KATMANI NEDEN AYRI KALIR: "sipariş şemasının koşullu düzeyi bu v2
   ailesiyle birlikte ele alınır" beklentisi ÖLÇÜMLE YANLIŞLANDI —
   PRICING_INPUTS'ta 20 ilan var, KOŞULLU örneği SIFIR; üçüncü düzey bugün
   örneği olmayan ilan (ölü sözleşme) olurdu. Üstelik özne evrenleri
   kesişmiyor (slot koşulu: doc.params + overrides + assets; sipariş:
   OrderItemLike), çıktılar ayrı (BLOCKER empty-required ↔ missingFields/409)
   ve paket yönü tek yönlü (shared, templates'i import ETMEZ). İlk gerçek
   örnek doğduğunda açılır. */
export type SlotKosulu = { kind: "param_esittir"; param: string; deger: string };

/**
 * Slot zorunluluğu: KOŞULSUZ ya da KOŞULA BAĞLI.
 * · `"zorunlu"`   → v1 davranışı BİREBİR (koşulsuz zorunlu),
 * · `{ kosul }`   → koşul DOĞRUYSA zorunlu; değilse slot atlanır (uyarı yok).
 * v1 değeri aynen geçerli kalır: genişleme additive'dir, mevcut ilanların
 * hiçbiri yeniden yazılmaz.
 */
export type SlotGereklilik = "zorunlu" | { kosul: SlotKosulu };

export interface SlotDef {
  id: string;
  kind: SlotKind;
  /** Veri yolu: "brand.contact.phone", "catalog.footnote_fr", "item.name_fr"; null = serbest metin */
  bind: string | null;
  default_fr?: string;
  font_mm?: FontRangeMM;
  maxLines?: number;
  /**
   * Dosya gereksinimi İLANI (Canonical 7.2/502 "dosya gereksinimleri";
   * journal 2026-07-26-dosya-gereklilik-ilani). "zorunlu" = bu slotun varlığı
   * olmadan belge ÜRETİME çıkamaz; yokluk = slot boş kalabilir. 276 modeli:
   * eksik dosya TASARIMI tutmaz, ÜRETİM KAPISINI tutar — empty-required
   * çekirdek BLOCKER'dır (6.2/426 kalite kapıları zinciri aynen), editör
   * çizmeye devam eder. Tek okuyucu jenerik motor eksikZorunluVarliklar'dır
   * (engine/binding.ts): uyarı elle if satırından değil BU ilandan üretilir —
   * ilan ile davranış ayrışamaz.
   *
   * KOŞULLU GENİŞLEME (v2): alan artık SlotGereklilik taşır — `"zorunlu"`
   * koşulsuz zorunluluktur (v1 davranışı BİREBİR korunur), `{ kosul }` ise
   * koşul DOĞRUYKEN zorunlu, yanlışken slot atlanır. Koşul dilinin kapalı
   * union oluşunun gerekçesi ve ölçüm sayıları SlotKosulu şerhindedir
   * (yukarıda). Değerlendirme tek noktadadır: eksikZorunluVarliklar
   * (engine/binding.ts) — koşul da elle if'ten değil BU ilandan okunur.
   *
   * ŞERH (kapsam): v2 yalnız VİTROPHANIE'yi kapatır (mode paramı: impression→
   * logo, decoupe→logo_mono). GARMENT koşullu ilanı hâlâ YAZAMAZ ve elle
   * if'leri AYNEN yaşar — engeli koşul dili değil, üç ön koşul borcudur
   * (areas paramı ilansız · area:*:logo slotları ilansız · paramValue()
   * dejenerasyonu); ayrıntı SlotKosulu şerhinde.
   *
   * ŞERH (rol ilanı): "slot hangi asset türünü kabul eder" (AssetPicker
   * filtresi) AYRI bir ilan boyutudur — bu alan onu TAŞIMAZ; aşağıdaki
   * `kabul` alanı + kabulEdilenTurler sorgusu taşır (7.2/502'nin ikinci
   * yarısı; journal 2026-07-26-dosya-rolleri-ilani).
   *
   * NOT: eski `optional?: boolean` alanı KALDIRILDI — süs alandı (0 tüketici
   * ölçüldü; fabrika emitter'i basıyor ama kimse okumuyordu). Tek eksen kaldı:
   * gereklilik var/yok.
   */
  gereklilik?: SlotGereklilik;
  /**
   * Dosya ROLÜ İLANI — "bu slot hangi VARLIK TÜRÜNÜ kabul eder" (Canonical
   * 7.2/502 "Dosya gereksinimleri ve ROLLERİ" maddesinin İKİNCİ yarısı;
   * gereklilik birinci yarısıydı. Journal 2026-07-26-dosya-rolleri-ilani).
   * Varlık seçicilerin (AssetPicker) filtresi bu boyuttan okunur — filtre
   * ÖNLEYİCİDİR: yanlış türü kaynakta eler, sonradan uyarı üretmez.
   *
   * ÖNCELİK KURALI — ROL ÖNCE BİND'DAN GELİR. Bind'ı olan bir slotun rolü
   * zaten bind DESENİNDE yazılıdır (brand.logo_primary / brand.logo_mono →
   * logo; item.photo → fotoğraf) ve tek okunma yolu kabulEdilenTurler'dir
   * (engine/binding.ts). Bu alan YALNIZ bind'ı OLMAYAN (bind:null) image
   * slotları içindir; bind varsa alan YAZILAMAZ — registry-core yük zamanında
   * reddeder (çift kaynak kapısı).
   *
   * ÖLÇÜM (kararın dayanağı; canlı kayıt defteri, 22 image slotu):
   * 18/22 (%81,8) rol bind'dan DOĞRU türetilir — brand.logo_primary ×11,
   * brand.logo_mono ×4, item.photo ×3. 4/22 (%18,2) TÜRETİLEMEZ:
   * menu-liste-premium deco1/deco2/deco3 (dekoratif dekupe) ve menu-trifold
   * cover_photo (kapak fotoğrafı) — hepsi bind:null. Alan o 18 slota BİLEREK
   * YAZILMADI: türetilebileni kopyalayan el yazımı alan İKİNCİ KAYNAKTIR ve
   * sürüklenir — ilan bir şey der, filtre başkasını uygular
   * (entegrasyon-sınırı kararının (a) gerekçesinin birebir tekrarı, bkz.
   * DIS_KANALLAR şerhi yukarıda). Rol bu yüzden TÜRETEN SAF SORGUDAN okunur
   * (disaAcikKanallar / SUBSTRAT_TEKNIKLERI deseni) ve alan yalnız türetimin
   * BİTTİĞİ yerde — o 4 slotta — yazılır.
   *
   * EMSAL FARKI (neden bu ilan meşru, öteki üç red değildi): preview_types,
   * 7.2/495'in "hedef kullanıcı" yarısı ve entegrasyon sınırı redleri
   * PROFİL-düzeyi alanlardı ve profil-BAŞINA farklılaşmadıkları için düştü
   * (farklılaşmayan boyutun alanı bilgi taşımaz). Rol SLOT-düzeyi bir alandır
   * — gereklilik ile AYNI katman — ve AYNI manifest İÇİNDE farklılaşır:
   * menu-liste-premium'da logo slotu "logo", deco1-3 "photo|other" kabul
   * eder. Farklılaşan boyutun alanı bilgi TAŞIR; ölü sözleşme değildir.
   *
   * Yokluk = KISITSIZ (mockup_tercihi emsali): çağıran hiçbir türü elemez.
   */
  kabul?: readonly AssetKind[];
}

export type ParamValue = string | number | boolean;

export interface ParamDef {
  id: string;
  type: "choice" | "toggle" | "number" | "color";
  options?: ParamValue[];
  /** Format'a göre değişen seçenekler (ör. cols: a4-portrait 2|3, a3 4|5|6) */
  optionsByFormat?: Record<string, ParamValue[]>;
  default: ParamValue;
  defaultByFormat?: Record<string, ParamValue>;
  label_tr: string;
  /** number tipi için */
  min?: number;
  max?: number;
  step?: number;
}

export interface FormatDef {
  w_mm: number;
  h_mm: number;
  label_tr: string;
}

export interface RepeaterDef {
  id: string;
  bind: "selection.items";
  overflow: OverflowRule;
  itemSlots: SlotDef[];
}

/** Fabrika şablon künyesi (provenance) — FAZ6-GOREV §4, mimar kararı #20 (revize:
    DB tablosu değil, üretilen manifest içinde yaşar; mimar #12 ile tutarlı). */
export interface TemplateProvenance {
  /** İçe alınan SVG dosyasının adı */
  source_filename: string;
  /** Kullanıcının girdiği kaynak yol/not (ör. Dropbox/arşiv yolu) — opsiyonel */
  source_note: string;
  /** SVG'de tespit edilen font aileleri */
  fonts: string[];
  /** Gömülü (data:) raster sayısı */
  embedded_assets: number;
  /** Render'a girmeyen harici/eksik varlık referansları */
  missing_assets: string[];
  /** İçe alınan (temizlenmiş) SVG'nin sha256'sı — "aynı dosya mı" kanıtı */
  svg_sha256: string;
  /** İçe alma tarihi (ISO) — sunucu damgalar */
  imported_at: string;
}

/* ── Üretim Profili Kimlik Katmanı (C-P0; Canonical 7.2 kalem #1) ─────────

   MATERYAL TÜRÜ. Önceki sözleşme `type: "menu"` LİTERALİYDİ: tip sistemi
   tabelaya, tişörte ve cam kaplamaya da "menu" demeyi ZORLUYORDU — aileler
   yanlış beyan etmeyi seçmemişti, başka seçenekleri yoktu. Malzeme türü
   manifest'ten OKUNAMAZDI; ayrım vector.ts'te `id.startsWith("vitro-")` gibi
   sabit-kodlu sniff'le yaşıyordu.

   Kapalı union: 7.2 "yeni sektör = yeni profil" der; yeni tür eklemek bu
   listeye kalem eklemektir ve derleyici o türe dokunan her switch'i bulur.
   Serbest string olsaydı "tabela" ile "sign" iki ayrı tür sanılırdı. */
export const MATERIAL_TYPES = [
  "menu",
  "flyer",
  "kart",
  "tabela",
  "tekstil",
  "cam",
] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export function isMaterialType(x: string): x is MaterialType {
  return (MATERIAL_TYPES as readonly string[]).includes(x);
}

/* ── Hedef sektör İLANI (Canonical 7.2/495 "Hedef kullanıcı ve sektör"
   maddesinin SEKTÖR yarısı; 7.1/481 "kullanıcı yalnızca yaptığı işi görür") ──
   Kapalı sözlük: menü üreticisi · matbaa · tabelacı · tekstil baskı · cam
   giydirme. Web'in şablon seçicileri grup başlıklarını BU ilandan okur —
   sert kodlu grup listesi yazılamaz; ilan ile gruplama ayrışamaz.

   ŞERH 1 — İLAN MATERIALTYPE DÜZEYİNDEDİR, manifest'e alan BİLEREK eklenmedi:
   sektör bugün MaterialType'ın FONKSİYONU ölçüldü (altı türün her biri tek
   sektöre düşer); per-manifest bir alan türden TÜRETİLEBİLİR olurdu =
   ölü ilan (preview_types emsali, yukarıda). Aynı materyalden farklı sektörlü
   profil doğduğu gün karar yeniden değerlendirilir.

   ŞERH 2 — 7.2/495 maddesinin "Hedef kullanıcı" yarısı İLAN DIŞI: 1.3/95 rol
   listesi (pazarlamacı/operatör/tasarımcı...) profil-başına FARKLILAŞMIYOR —
   farklılaşmayan boyutun alanı bilgi taşımaz (preview_types emsali).

   ŞERH 3 — shared'daki SECTOR_PACKS MÜŞTERİ işletmesinin gastronomi
   kataloğudur (kebap/pizza/café...), TEZGÂH kullanıcısının İŞ KOLU sektörü
   DEĞİL; bu küme ondan bağımsızdır — ad benzerliği iki boyutu tek boyut
   sanmaya yol açmasın ("kumas"/"tekstil" ayrımı emsali, aşağıda).

   Ürün kararı: flyer + kart → "matbaa" (kanonik 1.1/70 iş kolu listesi:
   matbaa tek kalemdir, ayrı bir "kartvizitçi" iş kolu yoktur). */
export const SEKTORLER = [
  "menu-uretici",
  "matbaa",
  "tabelaci",
  "tekstil-baski",
  "cam-giydirme",
] as const;
export type Sektor = (typeof SEKTORLER)[number];

/** Materyal türü → hedef sektör (exhaustive Record: yeni MaterialType
    sektörünü beyan etmeden derlenemez — iş kolu ataması ürün kararıdır) */
export const HEDEF_SEKTOR: Record<MaterialType, Sektor> = {
  menu: "menu-uretici",
  flyer: "matbaa",
  kart: "matbaa",
  tabela: "tabelaci",
  tekstil: "tekstil-baski",
  cam: "cam-giydirme",
};

export interface TemplateManifest {
  id: string;
  /** Materyal türü — profil kimliğinin çekirdeği. Artık literal "menu" değil. */
  type: MaterialType;
  /**
   * Profil sözleşme sürümü (Canonical 7.2 #1 "kimlik ve sürüm"; 7.3 eklenti
   * manifesti de sürüm ister). ZORUNLU — ürün sahibi kararı (C-B-1): sürümsüz
   * manifest, hangi sözleşmeyle yazıldığı bilinmeyen manifesttir. Bugün tek
   * geçerli değer 1'dir; alan gelecekteki şema evrimi için rezervdir.
   */
  profile_version: number;
  name_tr: string;
  bleed_mm: number;
  safe_mm: number;
  formats: Record<string, FormatDef>;
  defaultFormat: string;
  params: ParamDef[];
  slots: SlotDef[];
  /** Katalog akışı kullanmayan şablonlarda (ör. carte-fidelite) yoktur */
  repeater?: RepeaterDef;
  /** Önerilen hazır temalar (brand her zaman ilk seçenek) */
  themes: string[];
  /**
   * Profil-katmanı şiddet override'ları (Canonical 4.5 "çekirdek → profil";
   * 7.2 "Kalite kapıları kümesi" bildirimi). Yalnız SIKILAŞTIRABİLİR —
   * yük-zamanı doğrulanır (registry-core → dogrulaSeverityOverrides), bozuk
   * tablo uygulamayı ayağa kaldırmaz. Yokluk = çekirdek sözlük aynen geçerli.
   */
  severity_overrides?: SeverityOverrides;
  /**
   * Mockup sahne tercihi İLANI (7.2 "Önizleme türleri" bildirimi). OPSİYONEL —
   * severity_overrides emsali: yokluk = çekirdek tercih (vitrine/facade,
   * engine/mockup-tercihi.ts → CEKIRDEK_TERCIH) aynen geçerli. Yük-zamanı
   * doğrulanır (registry-core): boş liste, bilinmeyen sahne türü, pozitif
   * olmayan puan ve params'ta karşılığı olmayan eslesme_parami YÜKLENEMEZ.
   * Editörün sahne sıralaması (sahneSkoru) BU ilanı okur — ilan ile davranış
   * ayrışamaz.
   */
  mockup_tercihi?: MockupTercihi;
  /**
   * Üretim kanalları İLANI (7.2 "Üretim çıktıları ve teslim biçimleri";
   * 8.5 kanal taksonomisi). ZORUNLU — C-B-1 emsali: kanal bildirmeyen profil,
   * çıktısı bilinmeyen profildir. Boş liste, tekrar ve bilinmeyen kanal
   * registry kurulumunda reddedilir. Üretim uçları (export/export-svg/
   * export-garment) ve web yönlendirmesi (exportRouteOf) BU ilanı okur —
   * ilan ile davranış ayrışamaz.
   */
  production_channels: readonly ProductionChannel[];
  /**
   * İzinli üretim teknikleri İLANI (7.2; 4.5 teknik uygunluk). ZORUNLU —
   * tekniksiz profil üretimsiz profildir. Registry çift yönlü bağı doğrular:
   * her ilanlı kanalın gerektirdiği teknik ilanlı olmalı VE her ilanlı
   * tekniğin onu üreten en az bir kanalı ilanlı olmalı; technique/mode
   * paramlarının seçenekleri bu kümenin alt kümesi olmalı.
   */
  production_techniques: readonly ProductionTechnique[];
  /**
   * Üretim substratı İLANI (7.2/501 "İzinli üretim teknikleri ve malzemeler"
   * maddesinin MALZEME yarısı; 4.5/327 "hangi teknik hangi malzemede";
   * 8.5/643 "teknik–malzeme uyumu"). ZORUNLU ve TEKİL — taşıyıcısını
   * bildirmeyen profil, fiziği bilinmeyen profildir. Registry bilinmeyen
   * üyeyi reddeder ve çapraz bağı doğrular: her ilanlı teknik
   * SUBSTRAT_TEKNIKLERI[substrat] içinde olmalı — ilan ile fizik ayrışamaz.
   * ŞERH: "kumas" adı bilinçlidir — MaterialType."tekstil" ürün-ailesi
   * kimliğidir, substrat fiziksel taşıyıcıdır; ad çakışması iki boyutu tek
   * boyut sanmaya yol açardı.
   */
  production_substrate: ProductionSubstrate;
  /** Fabrika üretimi şablonlarda içe alma künyesi (mimar #20); el yazımıda yoktur */
  provenance?: TemplateProvenance;
}

/** Tek render kaynağı (M3): editör mode:"edit", PDF sayfası mode:"print" ile aynı bileşeni çizer */
export interface TemplateProps {
  client: ClientDTO;
  doc: DocumentState;
  mode: RenderMode;
  /** Çok sayfalı akışta (shrink-then-flow) çizilecek sayfa; grid'de hep 0 */
  pageIndex?: number;
  /** edit: bleed/safe kılavuz katmanı aç/kapa */
  showGuides?: boolean;
  /** print varyantı: crop marks katmanı */
  cropMarks?: boolean;
  selectedSlot?: string | null;
  onSlotClick?: (slotId: string) => void;
  /** Edit moduna özgü arayüz metinleri — web tr.json'dan geçirir (M9) */
  editLabels?: { photoWaiting?: string };
}

export interface TemplateEntry {
  manifest: TemplateManifest;
  Component: ComponentType<TemplateProps>;
  /** Akışlı şablonlarda toplam sayfa sayısı (yoksa 1 kabul edilir) */
  pageCount?: (client: ClientDTO, doc: DocumentState) => number;
  /**
   * cm-bazlı serbest boyutlu tipler (vitro/tabela/garment): gerçek sayfa ölçüsü
   * paramlardan gelir; print/mockup/sunum sayfaları manifest.formats yerine bunu okur.
   */
  pageSizeMM?: (client: ClientDTO, doc: DocumentState) => { w_mm: number; h_mm: number; bleed_mm: number };
  /** Sayfa başına DEĞİŞKEN boyut (garment alanları); yoksa pageSizeMM/format geçerli */
  pageSizeMMAt?: (client: ClientDTO, doc: DocumentState, pageIndex: number) => { w_mm: number; h_mm: number; bleed_mm: number };
  /** true → print sayfası zemini şeffaf (garment alfa PNG exportu) */
  transparentBg?: boolean;
  /**
   * Editör uyarı paneli için analiz köprüsü (CE bağlaması — fabrika şablonları).
   * El yazımı aileler analiz fonksiyonlarını ADLA dışa verir ve analyzeDoc
   * onları doğrudan çağırır; fabrika şablonları dinamik üretildiğinden adla
   * import edilemez — uyarı üretimi entry üzerinden taşınır. Alan yoksa
   * analyzeDoc'un eski davranışı geçerlidir (davranış donuk).
   */
  warnings?: (client: ClientDTO, doc: DocumentState) => LayoutWarning[];
}
