/* Şablon sözleşmeleri — CONSTITUTION §5 alan adlarıyla birebir (§14.1/3) */

import type { ComponentType } from "react";
import type { ClientDTO, DocumentState } from "@tezgah/shared";

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

export interface SlotDef {
  id: string;
  kind: SlotKind;
  /** Veri yolu: "brand.contact.phone", "catalog.footnote_fr", "item.name_fr"; null = serbest metin */
  bind: string | null;
  default_fr?: string;
  font_mm?: FontRangeMM;
  maxLines?: number;
  optional?: boolean;
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
}
