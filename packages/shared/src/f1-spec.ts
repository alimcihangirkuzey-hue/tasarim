/* F1 pilot P2 — SPEC-REFERANS modeli (D-59/61). VERİ katmanı; DB tablosu YOK.

   SpecRef = template_id + format → mevcut TemplateManifest'e REFERANStır.
   Geometri (bleed_mm · safe_mm · formats · slots) ORADAN okunur, buraya
   KOPYALANMAZ — tek kaynak manifest kalır. shared paketi @tezgah/templates'i
   import ETMEZ (templates zaten shared'a bağlı; döngü olurdu) → çözüm
   tüketicide (server/web) yapılır, burada yalnız kimlik taşınır.

   Üstüne F1 katmanı: required_fields (İKİ KATMANLI) · conditional_rules
   (tetikleyici → alan) · allowed_techniques · file_requirements
   (brief_files.role ile birebir hizalı).

   KEŞİF DÜZELTMESİ (F3 envanteri, bölüm E): `decoupe` VİTRO ailesine özgüdür,
   garment tekniği DEĞİLDİR → garment listesinde YOK. DTF ise hiçbir katmanda
   uygulanmamıştır → seçilirse REDDEDİLMEZ, YALNIZ BİLGİLENDİRİLİR (alfa-PNG
   teslim edilir). */

export const F1_FAMILIES = ["menu", "garment"] as const;
export type F1Family = (typeof F1_FAMILIES)[number];

export const F1_LAYERS = ["design_pre", "production_pre"] as const;
export type F1Layer = (typeof F1_LAYERS)[number];

/** Talep edilebilir çıktılar (requested_publications) */
export const F1_PUBLICATIONS = [
  "a4_print",
  "trifold",
  "qr_image",
  "digital_menu",
  "mockup",
] as const;
export type F1Publication = (typeof F1_PUBLICATIONS)[number];

/** BASILI çıktılar — adet/malzeme koşulunu tetikler */
export const F1_PRINTED_PUBLICATIONS: readonly F1Publication[] = ["a4_print", "trifold"];

/** Şablon+format kimliği (manifest'e referans) */
export interface F1SpecRef {
  template_id: string;
  format: string;
}

/** Koşullu alan tetikleyicileri — payda YALNIZ tetiklendiğinde büyür */
export type F1Trigger =
  | { kind: "always" }
  | { kind: "publication"; publication: F1Publication }
  | { kind: "any_printed_publication" }
  | { kind: "format_free_choice" }
  | { kind: "brand_ref_missing" }
  | { kind: "has_placements" };

export interface F1FieldRule {
  id: string;
  label_tr: string;
  layer: F1Layer;
  trigger: F1Trigger;
  /** REDDET sınıfı: kayıtlı istisnayla KARŞILANAMAZ (F1.5) */
  reject_class?: boolean;
}

/** Dosya şartı — role brief_files.role ile BİREBİR aynı dizedir */
export interface F1FileRequirement {
  role: string;
  label_tr: string;
  layer: F1Layer;
  /** Dosya eksikliği/geçersizliği spec'te REDDET sınıfıdır */
  reject_class: true;
}

export interface F1Spec {
  family: F1Family;
  /** İzinli şablon+format kümesi (keşif-kanıtlı; DL YOK) */
  allowed_specs: readonly F1SpecRef[];
  fields: readonly F1FieldRule[];
  file_requirements: readonly F1FileRequirement[];
  allowed_techniques: readonly string[];
  /** Seçilebilir ama YALNIZ BİLGİLENDİRME üreten teknikler: kod → mesaj */
  info_techniques: Readonly<Record<string, string>>;
  /** Eksiksizlik hesabına HİÇ girmeyen alanlar (kayıt için listelenir) */
  optional_fields: readonly string[];
}

/* ------------------------------------------------------------------ */
/* MENÜ ailesi                                                         */
/* ------------------------------------------------------------------ */

export const F1_MENU_SPEC: F1Spec = {
  family: "menu",
  /* Keşif-kanıtlı format envanteri: A4P (tek/çok sayfa), A4L trifold, A3P grid.
     DL YOK — manifest'lerde tanımlı değil, uydurulmaz. */
  allowed_specs: [
    { template_id: "menu-liste-premium", format: "a4-portrait" },
    { template_id: "menu-grid-cells", format: "a4-portrait" },
    { template_id: "menu-grid-cells", format: "a4-landscape" },
    { template_id: "menu-grid-cells", format: "a3-portrait" },
    { template_id: "menu-trifold", format: "a4-landscape" },
  ],
  fields: [
    /* --- design_pre: eksikse iş TASARIMA GİREMEZ --- */
    { id: "format", label_tr: "Format", layer: "design_pre", trigger: { kind: "always" }, reject_class: true },
    { id: "languages", label_tr: "Dil listesi (≥1)", layer: "design_pre", trigger: { kind: "always" } },
    { id: "content_skeleton", label_tr: "İçerik iskeleti", layer: "design_pre", trigger: { kind: "always" } },
    {
      id: "requested_publications",
      label_tr: "Talep edilen çıktılar",
      layer: "design_pre",
      trigger: { kind: "always" },
    },
    /* koşullu(design): yön — yalnız serbest format seçiminde sorulur */
    {
      id: "orientation",
      label_tr: "Yön (serbest format seçiminde)",
      layer: "design_pre",
      trigger: { kind: "format_free_choice" },
      reject_class: true,
    },
    /* --- production_pre: tasarımı engellemez, ÜRETİM kapısını kapatır --- */
    { id: "prices", label_tr: "Fiyatlar (tüm listelenen ürünlerde)", layer: "production_pre", trigger: { kind: "always" } },
    { id: "delivery_deadline", label_tr: "Teslim tarihi", layer: "production_pre", trigger: { kind: "always" } },
    {
      id: "qr_target_url",
      label_tr: "QR hedef adresi",
      layer: "production_pre",
      trigger: { kind: "publication", publication: "qr_image" },
    },
    {
      id: "print_quantity",
      label_tr: "Baskı adedi",
      layer: "production_pre",
      trigger: { kind: "any_printed_publication" },
    },
    {
      id: "print_material",
      label_tr: "Baskı malzemesi",
      layer: "production_pre",
      trigger: { kind: "any_printed_publication" },
    },
    {
      id: "color_font_choice",
      label_tr: "Renk/font açık seçimi (Brand referansı yoksa)",
      layer: "production_pre",
      trigger: { kind: "brand_ref_missing" },
    },
  ],
  file_requirements: [
    { role: "logo", label_tr: "Logo dosyası", layer: "production_pre", reject_class: true },
  ],
  allowed_techniques: [],
  info_techniques: {},
  optional_fields: ["allergens", "icons", "campaign", "notes"],
};

/* ------------------------------------------------------------------ */
/* GARMENT / tekstil ailesi                                            */
/* ------------------------------------------------------------------ */

export const F1_GARMENT_TECHNIQUES = ["broderie", "genel_baski"] as const;

export const F1_GARMENT_SPEC: F1Spec = {
  family: "garment",
  allowed_specs: [{ template_id: "garment", format: "libre" }],
  fields: [
    /* --- design_pre --- */
    {
      id: "garment_type",
      label_tr: "Ürün tipi (tenant kataloğu)",
      layer: "design_pre",
      trigger: { kind: "always" },
      reject_class: true,
    },
    {
      id: "placements",
      label_tr: "Baskı yeri/yerleri (≥1)",
      layer: "design_pre",
      trigger: { kind: "always" },
      reject_class: true,
    },
    /* --- production_pre --- */
    { id: "fabric_color", label_tr: "Ürün rengi", layer: "production_pre", trigger: { kind: "always" } },
    {
      id: "size_quantity",
      label_tr: "Beden×adet dağılımı",
      layer: "production_pre",
      trigger: { kind: "always" },
    },
    { id: "technique", label_tr: "Baskı tekniği", layer: "production_pre", trigger: { kind: "always" } },
    { id: "delivery_deadline", label_tr: "Teslim tarihi", layer: "production_pre", trigger: { kind: "always" } },
    /* koşullu(production): yer başına boyut/konum — varsayılan Spec'ten gelir */
    {
      id: "print_size_position",
      label_tr: "Baskı boyutu/konumu (yer başına)",
      layer: "production_pre",
      trigger: { kind: "has_placements" },
    },
  ],
  file_requirements: [
    { role: "tasarim", label_tr: "Tasarım/logo dosyası", layer: "production_pre", reject_class: true },
  ],
  allowed_techniques: F1_GARMENT_TECHNIQUES,
  info_techniques: {
    /* Keşif bulgusu: DTF hattı YOK; en yakın gerçek çıktı 300dpi alfa PNG */
    dtf: "DTF-özel çıktı yok; alfa-PNG teslim edilir",
  },
  optional_fields: ["mockup_publication", "notes"],
};

export const F1_SPECS: Readonly<Record<F1Family, F1Spec>> = {
  menu: F1_MENU_SPEC,
  garment: F1_GARMENT_SPEC,
};

export function f1SpecFor(family: F1Family): F1Spec {
  return F1_SPECS[family];
}

/** Toplam adet HESAPLANAN değerdir (beden×adet dağılımından) — ayrı alan değil */
export function f1TotalQuantity(distribution: Record<string, number> | null | undefined): number {
  if (!distribution) return 0;
  return Object.values(distribution).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}

/** SpecRef izinli mi? (manifest'te olmayan format uydurulmaz) */
export function isAllowedSpecRef(family: F1Family, ref: F1SpecRef | null | undefined): boolean {
  if (!ref) return false;
  return F1_SPECS[family].allowed_specs.some(
    (s) => s.template_id === ref.template_id && s.format === ref.format
  );
}
