/* Sayfa iskeleti geometrisi — iki menü şablonu aynı sabit slot bantlarını kullanır
   (FAZ1-GOREV §5: "Sabit slotlar: grid şablonuyla aynı set").
   Tüm birimler mm; koordinatlar NET sayfa uzayında (bleed offset'i şablon ekler, §5.2). */

export interface PageGeometry {
  w: number;
  h: number;
  margin: number;
  /** Üst bant: logo + başlık + halal rozeti */
  header: { y: number; h: number; logo: { x: number; y: number; w: number; h: number } };
  /** Telefon şeridi (accent bant) */
  phoneStrip: { y: number; h: number };
  /** Adres + saat satırı */
  addressLine: { y: number; h: number };
  /** Repeater içerik alanı */
  content: { x: number; y: number; w: number; h: number };
  /** Dipnot satırı taban çizgisi */
  footnoteBaseline: number;
}

export function pageGeometry(w: number, h: number): PageGeometry {
  const margin = 10;
  const headerY = margin;
  const headerH = 26;
  const phoneY = headerY + headerH + 2; // 38
  const phoneH = 8;
  const addrY = phoneY + phoneH + 1; // 47
  const addrH = 5;
  const contentY = addrY + addrH + 3; // 55
  const footnoteBaseline = h - 7;
  const contentH = footnoteBaseline - 4 - contentY;

  return {
    w,
    h,
    margin,
    header: {
      y: headerY,
      h: headerH,
      logo: { x: margin, y: headerY, w: 42, h: headerH },
    },
    phoneStrip: { y: phoneY, h: phoneH },
    addressLine: { y: addrY, h: addrH },
    content: { x: margin, y: contentY, w: w - 2 * margin, h: contentH },
    footnoteBaseline,
  };
}

/** Hücre satır yüksekliği: genişlikten türetilir ama 62 mm'yi aşmaz —
    yoksa a4-landscape 4 kolonda tek satır kalır (görsel QA bulgusu) */
export function gridRowHeight(cellW: number): number {
  const ideal = Math.round(cellW * 1.02 * 2) / 2; // 0.5 mm ızgarası
  return Math.min(62, Math.max(48, ideal));
}

export const GRID_GAP = 4;
export const CAT_STRIP_H = 12;
