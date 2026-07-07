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

export const PriceVariantSchema = z.object({
  label: z.string().default("seul"), // "seul" | "menu" | "S" | "M" ...
  value: z.number().nonnegative(),
});
export type PriceVariant = z.infer<typeof PriceVariantSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  name_fr: z.string().min(1),
  desc_fr: z.string().default(""),
  photo: z.string().nullable().default(null), // asset id
  prices: z.array(PriceVariantSchema).default([]),
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
});
export type Selection = z.infer<typeof SelectionSchema>;

export const OverrideSchema = z.object({
  value: z.unknown(),
  detached: z.boolean().default(true),
});

export const DocumentStateSchema = z.object({
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
  document_id: string;
  kind: "print" | "preview";
  filepath: string;
  version: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* API veri sözleşmeleri                                               */
/* ------------------------------------------------------------------ */

export const AssetKindSchema = z.enum(["logo", "photo", "other"]);
export type AssetKind = z.infer<typeof AssetKindSchema>;

export interface AssetDTO {
  id: string;
  client_id: string | null;
  kind: AssetKind;
  filename: string; // master dosya adı: {id}.{ext}
  width_px: number;
  height_px: number;
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
  brandkit: BrandKit;
  catalog: Catalog;
  assets: AssetDTO[];
  created_at: string;
  updated_at: string;
}

export const ClientCreateSchema = z.object({
  name: z.string().min(1, "İsim boş olamaz").max(120),
  notes: z.string().max(4000).default(""),
});

export const ClientUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(4000).optional(),
  currency: CurrencySchema.optional(),
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

/* Varsayılan üreticiler */
export const defaultBrandKit = (): BrandKit => BrandKitSchema.parse({});
export const defaultCatalog = (): Catalog => CatalogSchema.parse({});
