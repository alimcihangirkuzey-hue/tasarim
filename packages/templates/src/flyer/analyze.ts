/* flyer analiz — ön: kampanya + mini grid (format bazlı kapasite);
   arka: iletişim + QR + teslimat bloğu + çift saat (boş bloklar gizlenir). */

import { fiyatMetni, type ClientDTO, type DocumentState } from "@tezgah/shared";
import {
  assetById,
  eksikZorunluVarliklar,
  resolveSelection,
  resolveSlotValue,
  type BindScope,
} from "../engine/binding.js";
import { composeGrid, resolveOverflowStrategy } from "../engine/composition.js";
import type { LayoutWarning } from "../engine/layout.js";
import { currentFormat, paramValue } from "../engine/params.js";
import { seededVariant } from "../engine/seed.js";
import { buildQr, qrSourceUrl, type QrRender, type QrSource } from "../engine/qr.js";
import { resolveTheme, type Theme } from "../themes.js";
import { manifest } from "./manifest.js";

const MARGIN = 10;
/* Bir mini hücrenin okunabilir kaldığı en küçük yükseklik (foto + ad + fiyat).
   Izgara kapasitesi bundan türer — sabit ürün sayısı yerine ölçülebilir sınır. */
const MIN_CELL_H = 34;

/* Canonical 4.4 designSeed — ÇERÇEVE DİLİ varyasyonu. Liste'nin ritim emsali
   (satır aralığı) flyer'da yok: ön yüz sabit kampanya paneli + motor-
   kompozisyonlu mini grid. Grid ölçü/gap varyasyonu BİLEREK reddedildi:
   kapasiteyi değiştirir, shrink-then-warn'da tohum ürün DÜŞÜRÜRDÜ — tohum
   içerik miktarına dokunamaz. Seçilen alan görsel kimliğin çerçevesi:
   kampanya paneli köşe yarıçapı + mini hücre köşe yarıçapı + hücre çizgi
   deseni. TEK karar tüm çerçevelere tutarlı uygulanır (4.3: tek tasarım
   dili); yerleşim/metin/kapasite HİÇ etkilenmez (yalnız-frame-değişir
   invaryantı seed-variation.test.ts'te derin-eşitlikle çivili). */
export interface FlyerFrame {
  campaignRx: number;
  cellRx: number;
  /** null = düz çizgi (strokeDasharray verilmez) */
  cellDash: string | null;
}

/** TABAN = bugünkü sabitler birebir (Template.tsx'ten taşındı — tek kaynak) */
export const CERCEVE_TABAN: FlyerFrame = { campaignRx: 2.5, cellRx: 1.8, cellDash: "1.7 1.2" };

/* KAPALI varyant kümesi (kontrollü benzersizlik ≠ rastgelelik): keskin /
   taban / yumuşak köşeler × kesikli / düz çizgi — her üye baskı güvenli
   (stroke kalınlıkları sabit), taban kümenin üyesidir (RITIM emsali). */
const CERCEVE = [
  { campaignRx: 1.2, cellRx: 0.8, cellDash: "1.1 0.9" },
  CERCEVE_TABAN,
  { campaignRx: 4.0, cellRx: 2.6, cellDash: "1.7 1.2" },
  { campaignRx: 2.5, cellRx: 1.8, cellDash: null },
  { campaignRx: 4.0, cellRx: 2.6, cellDash: null },
] as const satisfies readonly FlyerFrame[];

export interface FlyerMiniItem {
  id: string;
  name: string;
  price: string;
  photoUrl: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlyerAnalysis {
  theme: Theme;
  scope: BindScope;
  warnings: LayoutWarning[];
  pages: 2;
  format: string;
  formatDef: { w_mm: number; h_mm: number };
  logoUrl: string | null;
  campaign: {
    title: { text: string; detached: boolean };
    price: { text: string; detached: boolean };
    sub: { text: string; detached: boolean };
  };
  mini: { items: FlyerMiniItem[]; cols: number };
  frame: FlyerFrame;
  phone: string;
  address: string;
  hours: string;
  deliveryHours: string;
  deliveryNote: { text: string; detached: boolean };
  qr: QrRender | null;
  footnote: string;
}

export function analyzeFlyer(client: ClientDTO, doc: DocumentState): FlyerAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const warnings: LayoutWarning[] = [];
  const format = currentFormat(manifest, doc);
  const formatDef = manifest.formats[format];
  const W = formatDef.w_mm;
  const H = formatDef.h_mm;

  const slotDef = (id: string) => manifest.slots.find((s) => s.id === id)!;
  const sv = (id: string) => resolveSlotValue(slotDef(id), doc.overrides, scope);
  const text = (id: string) => {
    const { value, detached } = sv(id);
    return { text: typeof value === "string" ? value : "", detached };
  };

  const logoAsset = assetById(client, sv("logo").value);
  /* Dosya gereksinimi — İLANDAN (7.2/502): eski elle logo if'i jenerik motora
     döndü; tek zorunlu image slot logodur — çıktı birebir. QR empty-required'ı
     aşağıda ELLE kalır: dosya değil brandkit ALAN gereksinimi (ilan dışı) */
  warnings.push(...eksikZorunluVarliklar(manifest.slots, client, doc));

  const source = String(paramValue(manifest, doc, "qrSource")) as QrSource;
  const url = qrSourceUrl(source, client.brandkit) ?? qrSourceUrl("tel", client.brandkit);
  let qr: QrRender | null = null;
  if (!url) warnings.push({ type: "empty-required", slotId: "qr" });
  else {
    qr = buildQr(url, 18, theme.vars["--c-item"]);
    if (qr.contrastFallback) warnings.push({ type: "qr-contrast", slotId: "qr" });
  }

  /* Mini ızgara — kompozisyon motoru (Canonical 4.1).
     Sütun sayısı formattan gelir; SATIR sayısı artık sabit "2" değil,
     kullanılabilir yükseklikten türetilir.

     ÖLÇÜM (iki formatta da h_mm = 210):
       availableH = (210 - 14) - 96 = 100mm · gap 4 · MIN_CELL_H 34
       satır      = floor((100 + 4) / (34 + 4)) = floor(2,73) = 2
       cellH      = (100 - 4) / 2 = 48mm  → eski sabit hesapla birebir aynı
     Yani bugünkü çıktı değişmedi; fark, yeni bir format/profil geldiğinde
     ızgaranın kendiliğinden uyarlanması ve kapasitenin artık el yazması bir
     sabit olmamasıdır. */
  const cols = format === "21x21" ? 3 : 2;
  const selected = resolveSelection(client.catalog, doc.selection);
  const all = selected.flatMap((s) => s.items);

  const gridTop = 96;
  const gridBottom = H - 14;
  const gap = 4;
  const grid = composeGrid({
    entries: all,
    cols,
    availableH_mm: gridBottom - gridTop,
    minCellH_mm: MIN_CELL_H,
    gap_mm: gap,
    cellW_mm: (W - 2 * MARGIN - (cols - 1) * gap) / cols,
    originX_mm: MARGIN,
    originY_mm: gridTop,
    strategy: resolveOverflowStrategy(manifest.repeater?.overflow, "shrink-then-warn"),
  });
  if (grid.overflow.length > 0) {
    warnings.push({ type: "overflow-items", count: grid.overflow.length });
  }
  /* İlan "ürün düşmez" diyorsa ama düştüyse, motor bunu bildirir ve BURADA
     görünür uyarıya çevrilir. Bugün flyer düşüren bir strateji ilan ettiği
     için bu yol tetiklenmez; ilan değişirse sessiz kalmaz. */
  if (grid.strategyViolation) {
    warnings.push({
      type: "overflow-strategy-violation",
      declared: grid.strategyViolation,
      dropped: grid.overflow.length,
    });
  }

  const items: FlyerMiniItem[] = grid.cells.map((cell) => {
    const it = cell.entry;
    const asset = assetById(client, it.photo);
    return {
      id: it.id,
      name: it.name_fr,
      /* Birim-farkında (journal 2026-07-28-birim-alani): tek-fiyat SEÇİMİ
         (prices[0]) aynı, yalnız metin fiyatMetni'nden — boş birimde birebir. */
      price: it.prices[0] ? fiyatMetni(it.prices[0], client.currency) : "",
      photoUrl: asset?.urls.master ?? null,
      x: cell.x_mm,
      y: cell.y_mm,
      w: cell.w_mm,
      h: cell.h_mm,
    };
  });

  /* designSeed okuma — liste-premium v1 doğrulaması birebir: paramValue
     DEĞİL doğrudan (serbest-sayı paramında paramValue varsayılana düşer);
     seed=0/eksik/geçersiz → TABAN NESNESİ AYNEN (bugünkü çizim birebir). */
  const rawSeed = doc.params["designSeed"];
  const designSeed =
    typeof rawSeed === "number" && Number.isInteger(rawSeed) && rawSeed > 0 ? rawSeed : 0;
  const frame = designSeed === 0 ? CERCEVE_TABAN : seededVariant(designSeed, CERCEVE, "flyer-cerceve");

  return {
    theme,
    scope,
    warnings,
    pages: 2,
    format,
    formatDef,
    logoUrl: logoAsset?.urls.master ?? null,
    campaign: {
      title: text("campaign_title"),
      price: text("campaign_price"),
      sub: text("campaign_sub"),
    },
    mini: { items, cols },
    frame,
    phone: text("phone").text,
    address: text("address").text,
    hours: text("hours").text,
    deliveryHours: client.brandkit.contact.delivery_hours,
    deliveryNote: text("delivery_note"),
    qr,
    footnote: text("footnote").text,
  };
}
