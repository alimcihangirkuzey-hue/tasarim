import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Temel tipler — CONSTITUTION §4                                      */
/* ------------------------------------------------------------------ */

export const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Geçerli bir hex renk olmalı (#RRGGBB)");

/* Müşteri bazında para birimi — FAZ1-GOREV §2.1 (İsviçre sınırı müşterileri) */
export const CurrencySchema = z.enum(["EUR", "CHF"]);
export type Currency = z.infer<typeof CurrencySchema>;

/* Menü çıktı dili — Sipariş Modu (F7-A/K2). Client bazında "fr" | "de" | "tr".
   CILA4/EK-1: "tr" eklendi (Türkçe menü) — fallback zinciri tr→fr→de (resolveChip
   / pickML). Şimdilik kalıcı + API-yazılır; desc menü diline göre kurulur (tam
   çok-dilli render TODO, K2). */
export const MenuLanguageSchema = z.enum(["fr", "de", "tr"]).default("fr");
export type MenuLanguage = z.infer<typeof MenuLanguageSchema>;

export const PriceVariantSchema = z.object({
  label: z.string().default("seul"), // "seul" | "menu" | "S" | "M" ...
  value: z.number().nonnegative(),
});
export type PriceVariant = z.infer<typeof PriceVariantSchema>;

/* Sipariş Modu içerik çipi referansı — F7-A (K1/K2, karar D1). INLINE DENORMALIZE:
   baskı için kendine yeter (tr/fr/de gömülü → M1/M3, kütüphaneye join gerekmez);
   chip_id yalnız öğrenme/editleme geri-bağıdır (kütüphane rename ESKİ katalogları
   DEĞİŞTİRMEZ — arşiv sabitliği). Sertleştirme (D1): en az bir dil alanı dolu. */
export const IngredientRefSchema = z
  .object({
    chip_id: z.string().optional(),
    tr: z.string().default(""),
    fr: z.string().default(""),
    de: z.string().default(""),
  })
  .refine(
    (r) => r.tr.trim() !== "" || r.fr.trim() !== "" || r.de.trim() !== "",
    { message: "İçerik çipinde en az bir dil alanı (tr/fr/de) dolu olmalı" }
  );
export type IngredientRef = z.infer<typeof IngredientRefSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  name_fr: z.string().min(1),
  desc_fr: z.string().default(""),
  photo: z.string().nullable().default(null), // asset id
  prices: z.array(PriceVariantSchema).default([]),
  /* Sipariş Modu projeksiyonu içerik çiplerini buraya gömer (F7-A/K1);
     .default([]) → mevcut kataloglar geriye uyumlu. Baskı bugün desc_fr'den
     çalışır; ingredients yapısal kaynaktır (çok-dilli render TODO). */
  ingredients: z.array(IngredientRefSchema).default([]),
  tags: z.array(z.string()).default([]), // "populaire" | "nouveau" | "épicé" | "végé"
  visible: z.boolean().default(true),
  order: z.number().int().default(0),
});
export type Item = z.infer<typeof ItemSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name_fr: z.string().min(1),
  note_fr: z.string().optional(), // başlık altı küçük not — FAZ1-GOREV §2.3
  order: z.number().int().default(0),
  items: z.array(ItemSchema).default([]),
});
export type Category = z.infer<typeof CategorySchema>;

export const CatalogSchema = z.object({
  categories: z.array(CategorySchema).default([]),
  footnote_fr: z
    .string()
    .default("Prix nets en euros — Liste des allergènes disponible sur demande."),
});
export type Catalog = z.infer<typeof CatalogSchema>;

export const ContactSchema = z.object({
  phone: z.string().default(""),
  address: z.string().default(""),
  hours: z.string().default(""),
  /** Teslimat saatleri (flyer çift saat bloğu — FAZ2-GOREV §6.2; boşsa blok gizlenir) */
  delivery_hours: z.string().default(""),
  instagram: z.string().default(""),
  google_review_url: z.string().default(""),
  /** Dijital menü adresi (mimar #16); doluysa QR kaynak listesine "menu" gelir */
  menu_url: z.string().default(""),
  delivery: z
    .array(z.object({ platform: z.string(), url: z.string() }))
    .default([]),
});
export type Contact = z.infer<typeof ContactSchema>;

export const BrandKitSchema = z.object({
  logo_primary: z.string().nullable().default(null), // asset id
  logo_mono: z.string().nullable().default(null),
  colors: z
    .object({
      primary: HexColor.default("#C8102E"),
      secondary: HexColor.default("#1A1A1A"),
      accent: HexColor.default("#F2B705"),
      background: HexColor.default("#FFF8EF"),
      text: HexColor.default("#1A1A1A"),
    })
    .default({}),
  fonts: z
    .object({
      heading: z.string().default("Anton"),
      body: z.string().default("Inter"),
    })
    .default({}),
  contact: ContactSchema.default({}),
  badges: z.object({ halal: z.boolean().default(true) }).default({}),
  slogan_fr: z.string().default(""),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;

/* ------------------------------------------------------------------ */
/* Document — Faz 1'de kullanılacak, şema şimdiden sabit (§4.5)        */
/* ------------------------------------------------------------------ */

export const SelectionSchema = z.object({
  mode: z.enum(["include"]).default("include"),
  category_order: z.array(z.string()).default([]),
  excluded_items: z.array(z.string()).default([]),
  /* FAZ5 §5/§6: belge düzeyinde açık ürün sırası (categoryId → sıralı item id).
     REORDER-HİNT (mimar kararı): listelenenler önce (bu sırayla), listelenmeyen
     kategori ürünleri katalog order'ıyla sonra → yeni katalog ürünleri belgede
     görünmeye devam eder (M1 korunur). Boş {} → eski davranış (katalog order). */
  item_order: z.record(z.string(), z.array(z.string())).default({}),
});
export type Selection = z.infer<typeof SelectionSchema>;

/* FAZ5 §5: belgede ürün takası — SAF. Aynı kategori içinde eski id yeni id ile
   değiştirilir (sıra korunur, tekrar eklenmez); eski id excluded'a, yeni id
   excluded'dan çıkar. Slot override anahtarlarına DOKUNULMAZ (pasifleşir). */
export function swapSelectionItem(
  selection: Selection,
  categoryId: string,
  oldItemId: string,
  newItemId: string,
  currentOrderedIds: string[]
): Selection {
  const replaced = currentOrderedIds.map((id) => (id === oldItemId ? newItemId : id));
  const seen = new Set<string>();
  const order = replaced.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
  const excluded = selection.excluded_items.filter((id) => id !== newItemId);
  if (!excluded.includes(oldItemId)) excluded.push(oldItemId);
  return {
    ...selection,
    excluded_items: excluded,
    item_order: { ...selection.item_order, [categoryId]: order },
  };
}

/* FAZ5 §6: kategori içi ürün sırasını açıkça ayarla (sürükle-bırak sonucu) — SAF */
export function setCategoryItemOrder(
  selection: Selection,
  categoryId: string,
  orderedIds: string[]
): Selection {
  return { ...selection, item_order: { ...selection.item_order, [categoryId]: [...orderedIds] } };
}

/* FAZ5 §6: kategori sırasını açıkça ayarla (sürükle-bırak sonucu) — SAF */
export function setCategoryOrder(selection: Selection, orderedCatIds: string[]): Selection {
  return { ...selection, category_order: [...orderedCatIds] };
}

export const OverrideSchema = z.object({
  value: z.unknown(),
  detached: z.boolean().default(true),
});

/* P1 CAP-CD-01 — Creative Document v1 (D-34/D-35): belge modelinin SÜRÜMLÜ kimliği.
   CD v1 = bugünkü DocumentDTO + cd_version damgası (yeni zorunlu içerik alanı YOK).
   z.literal(1).default(1) → ESKİ belgeler ve ESKİ snapshot'lar parse anında
   default'la dolar; DB kolonu/migration YOK (rowToDocument'ın Zod-default deseni —
   SceneSettings/F8-D emsali). UYUM KURALI: additive-only — alan silme / yeniden
   adlandırma YASAK; CD v2 yalnız kırıcı değişiklikte açılır; bilinmeyen alan
   toleransı (Zod strip) korunur. Ayrıntı + ÇIKAR/ÇIKMAZ sınırı:
   docs/creative-document-v1.md */
export const CD_VERSION = 1;

export const DocumentStateSchema = z.object({
  cd_version: z.literal(CD_VERSION).default(CD_VERSION),
  template_id: z.string(),
  params: z.record(z.unknown()).default({}),
  theme_id: z.string().default("brand"),
  selection: SelectionSchema.default({}),
  overrides: z.record(OverrideSchema).default({}),
  status: z.enum(["draft", "sent", "approved", "printed"]).default("draft"),
});
export type DocumentState = z.infer<typeof DocumentStateSchema>;

/* Belge API sözleşmeleri — Faz 1 */

export const DocumentCreateSchema = z.object({
  template_id: z.string().min(1),
  /** Belge bu projeye açılır (Tasarıma başla — FAZ2-GOREV §2.5); yoksa varsayılan proje */
  project_id: z.string().optional(),
});

/** Kısmi güncelleme: editör otomatik kaydı (2 sn debounce) bu şemayla doğrulanır */
export const DocumentUpdateSchema = DocumentStateSchema.partial();

export interface DocumentDTO extends DocumentState {
  id: string;
  project_id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummaryDTO {
  id: string;
  template_id: string;
  status: DocumentState["status"];
  theme_id: string;
  format: string | null;
  updated_at: string;
}

export interface ExportRecordDTO {
  id: string;
  /** Mimar kararı #3: sunum kayıtlarında null olabilir */
  document_id: string | null;
  project_id: string | null;
  /** Mimar kararı #16 (F5-10): dijital menü müşteri düzeyli — belge/proje null, client_id dolu */
  client_id: string | null;
  /* Mimar kararı #13: snapshot (geri yükleme öncesi güvenlik kaydı, filepath
     boş dize olabilir) ve print_cmyk eklendi; versiyon sayacına katılırlar.
     Mimar kararı #16: digital_menu (tek dosya statik HTML). */
  kind: "print" | "preview" | "presentation" | "mockup" | "mockup_hires" | "decoupe" | "broderie" | "broderie_fiche" | "png" | "snapshot" | "print_cmyk" | "digital_menu";
  filepath: string;
  version: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* API veri sözleşmeleri                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Tema kütüphanesi — FAZ4-GOREV §7                                    */
/* ------------------------------------------------------------------ */

/** 6-8 haneli hex (velours paneli gibi alfa kanallı değerler serbest) */
const ThemeHex = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
/** Font aile adı — CSS font-family yığınına gömülür; tırnak/noktalı virgül/açı gibi
    karakterler engellenir (harf, rakam, boşluk, tire, alt çizgi, kesme işareti). */
export const FontFamilySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[\p{L}\p{N} '_-]+$/u, "Aile adı yalnız harf, rakam, boşluk ve - _ ' içerebilir");
/** Yerleşik repo font anahtarları (packages/templates/fonts) — UI seçicilerinin çekirdeği */
export const PRESET_FONT_KEYS = ["oswald", "anton", "archivo", "inter", "bitter", "pacifico"] as const;
/** Tema font referansı: yerleşik anahtar VEYA yüklenmiş özel aile adı.
    Mimar #18: dışarıdan font kabul edilir ama YALNIZ glif-bekçisinden geçmiş
    (custom_fonts) ailelerdir; bekçi yüklemede uygular. Bilinmeyen anahtar render'da
    genel yığına (Inter fallback) düşer — sessiz kırılma yok (M8). */
export const ThemeFontKeySchema = FontFamilySchema;
export type ThemeFontKey = z.infer<typeof ThemeFontKeySchema>;

export const ThemeTokensSchema = z.object({
  /** kategori ayracı/uppercase gibi davranışlar bu yerleşikten kalıtılır */
  base: z.enum(["or-noir", "aras-orange", "velours-rouge"]).default("or-noir"),
  colors: z.object({
    bg: ThemeHex, panel: ThemeHex, heading: ThemeHex, item: ThemeHex,
    desc: ThemeHex, price: ThemeHex, accent: ThemeHex, line: ThemeHex,
  }),
  fonts: z.object({
    heading: ThemeFontKeySchema, item: ThemeFontKeySchema,
    body: ThemeFontKeySchema, script: ThemeFontKeySchema,
  }),
});
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;

export interface ThemeDTO {
  id: string;
  name: string;
  tokens: ThemeTokens;
  created_at: string;
}

export const AssetKindSchema = z.enum(["logo", "photo", "other"]);
export type AssetKind = z.infer<typeof AssetKindSchema>;

export interface AssetDTO {
  id: string;
  client_id: string | null;
  kind: AssetKind;
  filename: string; // master dosya adı: {id}.{ext}
  width_px: number;
  height_px: number;
  /** virgüllü etiketler (FAZ4 §9 foto önerisi; normalize ederek ara) */
  tags: string;
  created_at: string;
  urls: { orig: string; master: string; thumb: string };
}

export interface ClientSummaryDTO {
  id: string;
  name: string;
  slug: string;
  logo_thumb: string | null;
  updated_at: string;
}

export interface ClientDTO {
  id: string;
  name: string;
  slug: string;
  notes: string;
  currency: Currency;
  /** Menü çıktı dili (F7-A/K2) — kalıcı + API-yazılır; render henüz tüketmez (TODO) */
  menu_language: MenuLanguage;
  brandkit: BrandKit;
  catalog: Catalog;
  assets: AssetDTO[];
  created_at: string;
  updated_at: string;
}

export const ClientCreateSchema = z.object({
  name: z.string().min(1, "İsim boş olamaz").max(120),
  notes: z.string().max(4000).default(""),
  /* Opsiyonel — verilmezse route EUR/fr uygular (currency deseni; F7-A/Adım 6).
     CHF/de müşteride oluşturmadan sonra ikinci-PUT zorunluluğunu kaldırır. */
  currency: CurrencySchema.optional(),
  menu_language: MenuLanguageSchema.optional(),
});

export const ClientUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(4000).optional(),
  currency: CurrencySchema.optional(),
  menu_language: MenuLanguageSchema.optional(),
  brandkit: BrandKitSchema.optional(),
  catalog: CatalogSchema.optional(),
});

/* ------------------------------------------------------------------ */
/* Sipariş Defteri — FAZ2-GOREV §2                                     */
/* ------------------------------------------------------------------ */

export const ProductTypeSchema = z.enum([
  "menu", "flyer", "trifold", "fidelite",
  "vitrophanie", "tabela", "tisort", "onluk", "diger",
]);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const OrderStatusSchema = z.enum([
  "olcu_bekliyor", "tasarimda", "onayda", "uretimde", "teslim", "iptal",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Tipe özgü detay alanları — bilinmeyen anahtarlar korunur (veri kaybetmeme ilkesi) */
export const OrderDetailsSchema = z
  .object({
    side: z.enum(["interieur", "exterieur"]).optional(),
    mode: z.enum(["impression", "decoupe"]).optional(),
    lumineux: z.boolean().optional(),
    technique: z.enum(["impression", "broderie"]).optional(),
    sizes: z.string().optional(),
    areas: z.string().optional(),
    format: z.string().optional(),
    print_qty: z.number().int().positive().optional(),
  })
  .passthrough();
export type OrderDetails = z.infer<typeof OrderDetailsSchema>;

export interface OrderItemDTO {
  id: string;
  project_id: string;
  product_type: ProductType;
  qty: number;
  width_cm: number | null;
  height_cm: number | null;
  details: OrderDetails;
  notes: string;
  status: OrderStatus;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDTO {
  id: string;
  client_id: string;
  name: string;
  status: string;
  due_date: string | null;
  source_text: string | null;
  items: OrderItemDTO[];
  created_at: string;
}

export const OrderItemCreateSchema = z.object({
  product_type: ProductTypeSchema,
  qty: z.number().int().positive().default(1),
  width_cm: z.number().positive().nullable().default(null),
  height_cm: z.number().positive().nullable().default(null),
  details: OrderDetailsSchema.default({}),
  notes: z.string().default(""),
});

export const OrderItemUpdateSchema = z.object({
  product_type: ProductTypeSchema.optional(),
  qty: z.number().int().positive().optional(),
  width_cm: z.number().positive().nullable().optional(),
  height_cm: z.number().positive().nullable().optional(),
  details: OrderDetailsSchema.optional(),
  notes: z.string().optional(),
  status: OrderStatusSchema.optional(),
  document_id: z.string().nullable().optional(),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(160),
  due_date: z.string().nullable().default(null),
  source_text: z.string().nullable().default(null),
  items: z.array(OrderItemCreateSchema).default([]),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  status: z.string().optional(),
  due_date: z.string().nullable().optional(),
});

/* ------------------------------------------------------------------ */
/* Faz 3 — Mockup sahneleri ve yeni belge tipleri (FAZ3-GOREV §2)      */
/* ------------------------------------------------------------------ */

export const SceneKindSchema = z.enum(["vitrine", "facade", "garment", "generic"]);
export type SceneKind = z.infer<typeof SceneKindSchema>;

/* ------------------------------------------------------------------ */
/* F8-A — Yapısal yüzey ölçüsü (intake çeklisti → müşteri yüzey profili) */
/* ------------------------------------------------------------------ */

/* Yüzey türü — intake çeklistinde toplanır (checklist.surfaces), commit'te
   müşteri-düzeyi client_surfaces tablosuna UPSERT edilir ("bir kez gir, hep
   kullan"). SceneKind'a eşleme: surfaceToSceneKind (mockup.ts — F8-E'de kapandı). */
export const SurfaceKindSchema = z.enum(["vitrine", "tabela", "garment", "diger"]);
export type SurfaceKind = z.infer<typeof SurfaceKindSchema>;

/* Tek yapısal yüzey. label 1..80 (trim sonrası; boş/salt-boşluk reddedilir —
   client_surfaces.label NOT NULL ile uyumlu). w/h opsiyonel (ölçü sonra
   alınabilir, M8: eksik bilgi görünür), 0<..≤2000 cm. note ≤300. */
export const IntakeSurfaceSchema = z.object({
  kind: SurfaceKindSchema.default("diger"),
  label: z.string().trim().min(1).max(80),
  w_cm: z.number().positive().max(2000).optional(),
  h_cm: z.number().positive().max(2000).optional(),
  note: z.string().max(300).default(""),
});
export type IntakeSurface = z.infer<typeof IntakeSurfaceSchema>;

/* checklist.surfaces dizisi — sunucu commit'te bununla parse eder (bozuksa 400,
   fail-loud). Eski intake_records'ta surfaces anahtarı YOKtur → çağıran boş
   kabul eder (geriye uyum); bu şema yalnız VAR olan diziyi doğrular. */
export const ChecklistSurfacesSchema = z.array(IntakeSurfaceSchema);

/** Müşteri-düzeyi kalıcı yüzey kaydı (client_surfaces satırı) DTO'su. */
export interface ClientSurfaceDTO {
  id: string;
  client_id: string;
  kind: SurfaceKind;
  label: string;
  w_cm: number | null;
  h_cm: number | null;
  note: string;
  /** Bu yüzeyi en son yazan intake (denetim izi köprüsü); manuel/eski kayıtta null */
  source_intake_id: string | null;
  created_at: string;
  updated_at: string;
}

/* Web intake taslağı v2→v3 additive migrasyonu (F8-A/D4 — SCHEMA_VERSION 2→3):
   checklist'e surfaces:[] ekler, KALAN HER ŞEY AYNEN kalır. Web'de vitest yok —
   bu SAF, şekil-agnostik transform burada test edilir; store migrate() çağırır.
   Daha eski sürümler (v1 vb.) store bekçisiyle atılmaya devam (bu fn yalnız v2→v3). */
export function migrateIntakeDraftV2toV3<T extends { checklist?: Record<string, unknown> }>(persisted: T): T {
  const checklist = (persisted.checklist ?? {}) as Record<string, unknown>;
  if (Array.isArray(checklist["surfaces"])) return persisted; // zaten var → idempotent
  return { ...persisted, checklist: { ...checklist, surfaces: [] } } as T;
}

/** Foto pikseli cinsinden köşe; sıra SABİT: sol-üst, sağ-üst, sağ-alt, sol-alt */
export const QuadPointSchema = z.object({ x: z.number(), y: z.number() });
export const QuadSchema = z.array(QuadPointSchema).length(4);
export type Quad = z.infer<typeof QuadSchema>;

/* F8-D: premium sahne katmanları — ADDITIVE (settings_json JSON kolonu; eski
   sahneler varsayılanla parse olur, migration YOK). opacity=0 → katman kapalı. */
export const SceneShadowSchema = z.object({
  opacity: z.number().min(0).max(1).default(0),
  blur_px: z.number().min(0).max(200).default(24),
  dy_px: z.number().min(-100).max(100).default(12),
});
export type SceneShadow = z.infer<typeof SceneShadowSchema>;

export const SceneOverlaySchema = z.object({
  opacity: z.number().min(0).max(1).default(0),
  color: z.string().default("#000000"),
});
export type SceneOverlay = z.infer<typeof SceneOverlaySchema>;

export const SceneSettingsSchema = z.object({
  blend: z.enum(["normal", "multiply"]).default("normal"),
  opacity: z.number().min(0).max(1).default(0.9),
  fabric_color: z.string().optional(),
  /* F8-D additive: tasarım gölgesi + sahne ışık/vinyet tabakası */
  shadow: SceneShadowSchema.default({}),
  overlay: SceneOverlaySchema.default({}),
});
export type SceneSettings = z.infer<typeof SceneSettingsSchema>;

/* F8-D: adlandırılmış stil preset İSKELETLERİ (altyapı — ScenesPanel UI wiring
   AYRI tur, Δ1). Sahne İÇERİĞİ (gerçek foto) kullanıcı işi. */
export const SCENE_STYLE_PRESETS: Record<
  string,
  { label_tr: string; settings: SceneSettings }
> = {
  soft_shadow: {
    label_tr: "Yumuşak gölge",
    settings: SceneSettingsSchema.parse({
      shadow: { opacity: 0.35, blur_px: 24, dy_px: 12 },
    }),
  },
  vitrine_glare: {
    label_tr: "Vitrin parlaması",
    settings: SceneSettingsSchema.parse({
      blend: "multiply",
      opacity: 0.92,
      shadow: { opacity: 0.2, blur_px: 18, dy_px: 8 },
      overlay: { opacity: 0.12, color: "#ffffff" },
    }),
  },
};

export interface MockupSceneDTO {
  id: string;
  client_id: string | null;
  name: string;
  kind: SceneKind;
  photo_asset_id: string;
  photo_urls: { master: string; thumb: string } | null;
  photo_px: { w: number; h: number } | null;
  quad: Quad;
  settings: SceneSettings;
  created_at: string;
}

export const SceneCreateSchema = z.object({
  name: z.string().min(1).max(120),
  kind: SceneKindSchema.default("generic"),
  photo_asset_id: z.string().min(1),
  quad: QuadSchema,
  settings: SceneSettingsSchema.default({}),
  /** true → ortak havuza (client_id NULL) kaydedilir */
  common: z.boolean().default(false),
});

export const SceneUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  kind: SceneKindSchema.optional(),
  quad: QuadSchema.optional(),
  settings: SceneSettingsSchema.optional(),
});

/* --- Vitrophanie / Tabela / Garment belge paramları --- */

export const VitroModeSchema = z.enum(["impression", "decoupe"]);

export const VitroParamsSchema = z.object({
  w_cm: z.number().positive().max(2000).default(100),
  h_cm: z.number().positive().max(2000).default(100),
  mode: VitroModeSchema.default("impression"),
  miroir: z.boolean().default(false),
  cut_color: HexColor.default("#1A1A1A"),
  bleed_mm: z.union([z.literal(0), z.literal(3), z.literal(5)]).default(0),
});
export type VitroParams = z.infer<typeof VitroParamsSchema>;

export const TabelaParamsSchema = z.object({
  w_cm: z.number().positive().max(2000).default(300),
  h_cm: z.number().positive().max(2000).default(60),
  bleed_mm: z.union([z.literal(0), z.literal(3), z.literal(5)]).default(0),
});
export type TabelaParams = z.infer<typeof TabelaParamsSchema>;

export const GarmentKindSchema = z.enum(["tshirt", "apron_bavette", "apron_taille"]);
export type GarmentKind = z.infer<typeof GarmentKindSchema>;

export const GarmentTechniqueSchema = z.enum(["impression", "broderie"]);
export type GarmentTechnique = z.infer<typeof GarmentTechniqueSchema>;

export const GarmentAreaIdSchema = z.enum([
  "chest_left", "chest_center", "back_full", "sleeve", "chest", "front",
]);
export type GarmentAreaId = z.infer<typeof GarmentAreaIdSchema>;

export const GarmentParamsSchema = z.object({
  garment_kind: GarmentKindSchema.default("tshirt"),
  fabric_color: z.string().default("white"), // white|black|red|blue|#RRGGBB
  technique: GarmentTechniqueSchema.default("impression"),
  areas: z.array(GarmentAreaIdSchema).min(1).default(["chest_center"]),
});
export type GarmentParams = z.infer<typeof GarmentParamsSchema>;

/** Alan preset'leri (cm) — FAZ3-GOREV §6 */
export const GARMENT_AREAS: Record<
  GarmentAreaId,
  { w_cm: number; h_cm: number; label_tr: string; kinds: GarmentKind[] }
> = {
  chest_left: { w_cm: 10, h_cm: 10, label_tr: "Göğüs sol", kinds: ["tshirt"] },
  chest_center: { w_cm: 25, h_cm: 30, label_tr: "Göğüs merkez", kinds: ["tshirt"] },
  back_full: { w_cm: 30, h_cm: 40, label_tr: "Sırt", kinds: ["tshirt"] },
  sleeve: { w_cm: 8, h_cm: 8, label_tr: "Kol", kinds: ["tshirt"] },
  chest: { w_cm: 24, h_cm: 20, label_tr: "Göğüs (önlük)", kinds: ["apron_bavette"] },
  front: { w_cm: 30, h_cm: 20, label_tr: "Ön (bel önlüğü)", kinds: ["apron_taille"] },
};

export function areasForKind(kind: GarmentKind): GarmentAreaId[] {
  return (Object.keys(GARMENT_AREAS) as GarmentAreaId[]).filter((a) =>
    GARMENT_AREAS[a].kinds.includes(kind)
  );
}

/** 300 dpi piksel hesabı: cm × 300 / 2.54, yuvarlanır (FAZ3-GOREV §6 export) */
export function cmToPx300(cm: number): number {
  return Math.round((cm * 300) / 2.54);
}

/* Varsayılan üreticiler */
export const defaultBrandKit = (): BrandKit => BrandKitSchema.parse({});
export const defaultCatalog = (): Catalog => CatalogSchema.parse({});
