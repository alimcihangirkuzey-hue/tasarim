/* Şablon sözleşmeleri — CONSTITUTION §5 alan adlarıyla birebir (§14.1/3) */

import type { ComponentType } from "react";
import type { ClientDTO, DocumentState } from "@tezgah/shared";

export type RenderMode = "edit" | "print";

export type SlotKind = "text" | "image" | "color" | "price" | "qr" | "badge";

export type OverflowRule = "shrink-then-flow" | "shrink-then-warn";

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
  type: "choice" | "toggle";
  options?: ParamValue[];
  /** Format'a göre değişen seçenekler (ör. cols: a4-portrait 2|3, a3 4|5|6) */
  optionsByFormat?: Record<string, ParamValue[]>;
  default: ParamValue;
  defaultByFormat?: Record<string, ParamValue>;
  label_tr: string;
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

export interface TemplateManifest {
  id: string;
  type: "menu";
  name_tr: string;
  bleed_mm: number;
  safe_mm: number;
  formats: Record<string, FormatDef>;
  defaultFormat: string;
  params: ParamDef[];
  slots: SlotDef[];
  repeater: RepeaterDef;
  /** Önerilen hazır temalar (brand her zaman ilk seçenek) */
  themes: string[];
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
}
