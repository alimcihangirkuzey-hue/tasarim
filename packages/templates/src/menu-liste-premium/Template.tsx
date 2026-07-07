/* menu-liste-premium bileşeni — leader dots deterministik çizilir (elle nokta yok) */

import type { ReactNode } from "react";
import { estimateWidth } from "../engine/layout.js";
import { themeStyle } from "../themes.js";
import type { TemplateProps } from "../types.js";
import { CropMarks, Guides, Slot, TextLines } from "../parts/svg.js";
import { PageChrome } from "../parts/PageChrome.js";
import { analyzeList, type ListRow } from "./analyze.js";
import { manifest } from "./manifest.js";

const PRICE_COL_W = 16;

function Row(props: {
  row: ListRow;
  colW: number;
  theme: ReturnType<typeof analyzeList>["theme"];
  mode: "edit" | "print";
  selectedSlot?: string | null;
  onSlotClick?: (id: string) => void;
}): ReactNode {
  const { row, colW, theme, mode, selectedSlot, onSlotClick } = props;

  if (row.kind === "category") {
    return (
      <g>
        {theme.categoryStyle === "ribbon" ? (
          <>
            <rect x={0} y={1} width={Math.min(colW * 0.7, 96)} height={8} rx={1.3} fill="url(#mlp-ribbon)" />
            <text x={4} y={7} fontSize={5} fill="var(--c-heading)" style={{ fontFamily: "var(--f-script)" }}>
              {row.name}
            </text>
          </>
        ) : (
          <>
            <text
              x={0}
              y={6.6}
              fontSize={6}
              fill="var(--c-heading)"
              style={{
                fontFamily: "var(--f-heading)",
                fontWeight: theme.weights.heading,
                letterSpacing: "1.2094px",
              }}
            >
              {theme.uppercaseHeading ? row.name.toLocaleUpperCase("fr-FR") : row.name}
            </text>
            <rect x={0.2} y={8.6} width={22} height={1.1} fill="var(--c-accent)" />
          </>
        )}
        {row.note && (
          <text
            x={0}
            y={CAT_NOTE_Y(row)}
            fontSize={2.7}
            fill="var(--c-desc)"
            style={{ fontFamily: "var(--f-body)" }}
          >
            {row.note}
          </text>
        )}
        {/* columns düzeni: varyant kolon başlıkları (SEUL | MENU ...) */}
        {row.colHeaders.map((label, i) => {
          const x = colX(colW, row.colHeaders.length, i);
          return (
            <text
              key={label + i}
              x={x}
              y={6.6}
              fontSize={3}
              textAnchor="end"
              fill="var(--c-accent)"
              style={{ fontFamily: "var(--f-item)", fontWeight: 600, letterSpacing: "0.9449px" }}
            >
              {label.toLocaleUpperCase("fr-FR")}
            </text>
          );
        })}
      </g>
    );
  }

  const { item } = row;
  const baseline = row.nameFont * 1.05;
  const nameEndW = estimateWidth(row.nameLines[0] ?? "", row.nameFont, theme.ratios.item);

  /* fiyat başlangıcı: inline → metin genişliği; columns → ilk kolonun solu */
  const priceStartX =
    row.priceMode === "columns"
      ? colX(colW, Math.max(row.priceTexts.length, 1), 0) - PRICE_COL_W + 2
      : colW - estimateWidth(row.priceTexts[0] ?? "", row.nameFont * 0.92, theme.ratios.item) - 2;

  const dotsX1 = Math.min(nameEndW + 2.5, colW - 4);
  const dotsX2 = Math.max(priceStartX - 2.5, dotsX1);

  return (
    <Slot
      id={`item:${item.id}`}
      mode={mode}
      selected={selectedSlot === `item:${item.id}`}
      onSlotClick={onSlotClick}
      box={{ x: -1.5, y: -0.5, w: colW + 3, h: row.h }}
    >
      <TextLines
        lines={row.nameLines}
        x={0}
        y={baseline}
        lineH={row.nameFont * 1.25}
        font="var(--f-item)"
        size={row.nameFont}
        fill="var(--c-item)"
        weight={theme.weights.item}
        letterSpacing={0.2268}
      />

      {/* leader dots — yalnız ilk ad satırında */}
      {dotsX2 - dotsX1 > 3 && (
        <line
          x1={dotsX1}
          y1={baseline - row.nameFont * 0.18}
          x2={dotsX2}
          y2={baseline - row.nameFont * 0.18}
          stroke="var(--c-line)"
          strokeWidth={0.5}
          strokeDasharray="0.01 1.5"
          strokeLinecap="round"
        />
      )}

      {/* fiyatlar */}
      {row.priceMode === "columns"
        ? row.priceTexts.map((t, i) => (
            <text
              key={i}
              x={colX(colW, row.priceTexts.length, i)}
              y={baseline}
              fontSize={row.nameFont * 0.95}
              textAnchor="end"
              fill="var(--c-price)"
              style={{ fontFamily: "var(--f-item)", fontWeight: theme.weights.item }}
            >
              {t}
            </text>
          ))
        : row.priceTexts[0] && (
            <text
              x={colW}
              y={baseline}
              fontSize={row.nameFont * 0.92}
              textAnchor="end"
              fill="var(--c-price)"
              style={{ fontFamily: "var(--f-item)", fontWeight: theme.weights.item }}
            >
              {row.priceTexts[0]}
            </text>
          )}

      {/* açıklama */}
      {row.descLines.length > 0 && (
        <TextLines
          lines={row.descLines}
          x={0}
          y={row.nameLines.length * row.nameFont * 1.25 + row.descFont * 0.75}
          lineH={row.descFont * 1.3}
          font="var(--f-body)"
          size={row.descFont}
          fill="var(--c-desc)"
        />
      )}
    </Slot>
  );
}

function CAT_NOTE_Y(row: { h: number }): number {
  return row.h - 2.6;
}

/** i. fiyat kolonunun sağ kenarı (sağdan sola dizilir) */
function colX(colW: number, count: number, i: number): number {
  return colW - (count - 1 - i) * PRICE_COL_W;
}

export function MenuListePremiumTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, pageIndex = 0, showGuides, cropMarks, selectedSlot, onSlotClick } = props;
  const a = analyzeList(client, doc);
  const B = manifest.bleed_mm;
  const W = a.formatDef.w_mm + 2 * B;
  const H = a.formatDef.h_mm + 2 * B;
  const page = a.pages[Math.min(pageIndex, a.pages.length - 1)] ?? { columns: [] };
  const isFirst = pageIndex === 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={`${W}mm`}
      height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ ...themeStyle(a.theme), display: "block" }}
    >
      <defs>
        <linearGradient id="mlp-ribbon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--c-panel)" />
          <stop offset="0.82" stopColor="var(--c-panel)" stopOpacity={0.65} />
          <stop offset="1" stopColor="var(--c-panel)" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="mlp-glow" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.05} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="var(--c-bg)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#mlp-glow)" />

      <g transform={`translate(${B}, ${B})`}>
        <PageChrome
          geo={a.geo}
          theme={a.theme}
          client={client}
          doc={doc}
          scope={a.scope}
          mode={mode}
          selectedSlot={selectedSlot}
          onSlotClick={onSlotClick}
          compact={!isFirst}
          qr={isFirst ? a.qr : null}
        />

        <g transform={`translate(${a.geo.content.x}, ${a.geo.content.y})`}>
          {page.columns.map((col, ci) => (
            <g key={ci} transform={`translate(${ci * (a.colW + a.colGap)}, 0)`}>
              {ci > 0 && (
                <line
                  x1={-a.colGap / 2}
                  y1={2}
                  x2={-a.colGap / 2}
                  y2={a.geo.content.h - a.decorBandH - 2}
                  stroke="var(--c-line)"
                  strokeWidth={0.3}
                  opacity={0.6}
                />
              )}
              {col.map(({ row, y }, ri) => (
                <g key={ri} transform={`translate(0, ${y})`}>
                  <Row
                    row={row}
                    colW={a.colW}
                    theme={a.theme}
                    mode={mode}
                    selectedSlot={selectedSlot}
                    onSlotClick={onSlotClick}
                  />
                </g>
              ))}
            </g>
          ))}

          {/* dekor bandı — yalnız ilk sayfa altı; dekupe PNG'ler */}
          {isFirst && a.decor.length > 0 && (
            <g transform={`translate(0, ${a.geo.content.h - a.decorBandH + 2})`}>
              {a.decor.map((d, i) => {
                const w = (a.geo.content.w - (a.decor.length - 1) * 6) / a.decor.length;
                return (
                  <Slot
                    key={d.slotId}
                    id={d.slotId}
                    mode={mode}
                    selected={selectedSlot === d.slotId}
                    onSlotClick={onSlotClick}
                    detached={d.detached}
                    box={{ x: i * (w + 6), y: 0, w, h: 22 }}
                  >
                    <image
                      href={d.url}
                      x={i * (w + 6)}
                      y={0}
                      width={w}
                      height={22}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </Slot>
                );
              })}
            </g>
          )}
        </g>
      </g>

      {mode === "edit" && showGuides && (
        <Guides w={a.formatDef.w_mm} h={a.formatDef.h_mm} bleed={B} safe={manifest.safe_mm} />
      )}
      {mode === "print" && cropMarks && (
        <CropMarks w={a.formatDef.w_mm} h={a.formatDef.h_mm} bleed={B} />
      )}
    </svg>
  );
}
