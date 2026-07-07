/* Küçük SVG yardımcıları — her iki şablon kullanır */

import type { CSSProperties, ReactNode } from "react";

/** letterSpacing yardımcısı — mimar kararı #10.
    Girdi mm, çıktı birimsiz kullanıcı birimi (viewBox mm olduğundan sayısal 1:1;
    CSS'e px yazılır çünkü SVG'de 1 px = 1 kullanıcı birimidir). fs() tarzı
    min-font kıskacı letterSpacing'e BİLEREK uygulanmaz. Eski "CSS mm" çağının
    yazar değerleri 3,7795 ile çarpılarak taşındı — görünüm birebir. */
export const ls = (mm: number): number => mm;

/** Sarılmış satırları <text>/<tspan> olarak çizer (SVG otomatik kırmaz) */
export function TextLines(props: {
  lines: string[];
  x: number;
  y: number; // ilk satırın taban çizgisi
  lineH: number;
  font: string; // CSS var: var(--f-item)
  size: number; // mm
  fill: string; // CSS var
  weight?: number;
  anchor?: "start" | "middle" | "end";
  /** kullanıcı birimi (= mm); px olarak yazılır (mimar #10) */
  letterSpacing?: number;
  uppercase?: boolean;
  opacity?: number;
}): ReactNode {
  const {
    lines, x, y, lineH, font, size, fill,
    weight = 400, anchor = "start", letterSpacing, uppercase, opacity,
  } = props;
  if (lines.length === 0) return null;
  const style: CSSProperties = {
    fontFamily: font,
    fontWeight: weight,
    fill,
    ...(letterSpacing !== undefined ? { letterSpacing: `${letterSpacing}px` } : {}),
  };
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} style={style} opacity={opacity}>
      {lines.map((ln, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineH}>
          {uppercase ? ln.toLocaleUpperCase("fr-FR") : ln}
        </tspan>
      ))}
    </text>
  );
}

/** Edit modunda slotu tıklanabilir yapan sarmalayıcı (M3: print'te düz render) */
export function Slot(props: {
  id: string;
  mode: "edit" | "print";
  selected?: boolean;
  onSlotClick?: (slotId: string) => void;
  /** Seçim çerçevesi için kapsayan kutu */
  box?: { x: number; y: number; w: number; h: number };
  detached?: boolean;
  children: ReactNode;
}): ReactNode {
  const { id, mode, selected, onSlotClick, box, detached, children } = props;
  if (mode === "print") return <>{children}</>;
  return (
    <g
      data-slot={id}
      onClick={(e) => {
        e.stopPropagation();
        onSlotClick?.(id);
      }}
      style={{ cursor: "pointer" }}
    >
      {/* Hit alanı ÇOCUKLARIN ALTINDA kalmalı: içteki slotlar (ör. foto yer tutucu)
          kendi tıklamasını alabilsin (SVG boya sırası = tıklama önceliği) */}
      {box && (
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          fill="transparent"
          pointerEvents="all"
        />
      )}
      {children}
      {box && selected && (
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          fill="rgba(59,130,246,0.08)"
          stroke="#3B82F6"
          strokeWidth={0.4}
          pointerEvents="none"
        />
      )}
      {detached && box && (
        /* override işareti: bağlantı kopuk (M5) */
        <g transform={`translate(${box.x + box.w - 3.5}, ${box.y + 0.8})`}>
          <circle cx={1.4} cy={1.4} r={2.2} fill="#B45309" />
          <text x={1.4} y={2.4} fontSize={2.6} textAnchor="middle" fill="#fff">
            ⛓
          </text>
        </g>
      )}
    </g>
  );
}

/** Bleed + güvenli alan kılavuzları (edit) — CONSTITUTION §5.2 */
export function Guides(props: { w: number; h: number; bleed: number; safe: number }): ReactNode {
  const { w, h, bleed, safe } = props;
  return (
    <g pointerEvents="none">
      {/* trim çizgisi */}
      <rect x={bleed} y={bleed} width={w} height={h} fill="none" stroke="#E11D48" strokeWidth={0.25} />
      {/* güvenli alan */}
      <rect
        x={bleed + safe}
        y={bleed + safe}
        width={w - 2 * safe}
        height={h - 2 * safe}
        fill="none"
        stroke="#0891B2"
        strokeWidth={0.25}
        strokeDasharray="2 1.5"
      />
    </g>
  );
}

/** Crop marks — print varyantı (§9.1) */
export function CropMarks(props: { w: number; h: number; bleed: number }): ReactNode {
  const { w, h, bleed } = props;
  const L = 5; // işaret boyu
  const off = 1; // trim köşesinden boşluk
  const s = { stroke: "#000", strokeWidth: 0.25 } as const;
  const x0 = bleed, y0 = bleed, x1 = bleed + w, y1 = bleed + h;
  return (
    <g pointerEvents="none">
      {/* sol üst */}
      <line x1={x0 - off - L} y1={y0} x2={x0 - off} y2={y0} {...s} />
      <line x1={x0} y1={y0 - off - L} x2={x0} y2={y0 - off} {...s} />
      {/* sağ üst */}
      <line x1={x1 + off} y1={y0} x2={x1 + off + L} y2={y0} {...s} />
      <line x1={x1} y1={y0 - off - L} x2={x1} y2={y0 - off} {...s} />
      {/* sol alt */}
      <line x1={x0 - off - L} y1={y1} x2={x0 - off} y2={y1} {...s} />
      <line x1={x0} y1={y1 + off} x2={x0} y2={y1 + off + L} {...s} />
      {/* sağ alt */}
      <line x1={x1 + off} y1={y1} x2={x1 + off + L} y2={y1} {...s} />
      <line x1={x1} y1={y1 + off} x2={x1} y2={y1 + off + L} {...s} />
    </g>
  );
}
