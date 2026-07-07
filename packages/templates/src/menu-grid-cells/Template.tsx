/* menu-grid-cells bileşeni — tek render kaynağı (M3): editör "edit", PDF "print" */

import type { ReactNode } from "react";
import { estimateWidth } from "../engine/layout.js";
import { themeStyle } from "../themes.js";
import type { TemplateProps } from "../types.js";
import { CropMarks, Guides, Slot, TextLines } from "../parts/svg.js";
import { PageChrome } from "../parts/PageChrome.js";
import { analyzeGrid, type CellLayout } from "./analyze.js";
import { manifest } from "./manifest.js";

const PAD = 4;

function Cell(props: {
  cell: CellLayout;
  w: number;
  h: number;
  priceStyle: "arrow" | "plain";
  weights: { heading: number; item: number };
  priceRatio: number;
  mode: "edit" | "print";
  selectedSlot?: string | null;
  onSlotClick?: (id: string) => void;
  photoWaiting: string;
}): ReactNode {
  const { cell, w, h, priceStyle, weights, priceRatio, mode, selectedSlot, onSlotClick, photoWaiting } = props;
  const { item } = cell;
  const innerW = w - 2 * PAD;

  const nameLineH = cell.name.font_mm * 1.15;
  const nameY = PAD + cell.name.font_mm * 0.9;
  const descY = nameY + cell.name.lines.length * nameLineH * 0.92 + (cell.desc ? 1.6 : 0);

  const priceSize = cell.prices.length > 1 || (cell.prices[0]?.text.length ?? 0) > 12 ? 3.2 : cell.priceFont;
  const priceLineH = priceSize * 1.25;
  const firstPriceY = h - PAD - (cell.prices.length - 1) * priceLineH - 1;

  return (
    <Slot
      id={`item:${item.id}`}
      mode={mode}
      selected={selectedSlot === `item:${item.id}`}
      onSlotClick={onSlotClick}
      box={{ x: 0, y: 0, w, h }}
    >
      {/* kesikli hücre çerçevesi */}
      <rect
        x={0.25}
        y={0.25}
        width={w - 0.5}
        height={h - 0.5}
        rx={2}
        fill="none"
        stroke="var(--c-line)"
        strokeWidth={0.5}
        strokeDasharray="1.8 1.3"
      />

      {/* ürün adı */}
      <TextLines
        lines={cell.name.lines}
        x={PAD}
        y={nameY}
        lineH={nameLineH}
        font="var(--f-item)"
        size={cell.name.font_mm}
        fill="var(--c-item)"
        weight={weights.item}
        letterSpacing={0.3024}
      />

      {/* açıklama */}
      {cell.desc && (
        <TextLines
          lines={cell.desc.lines}
          x={PAD}
          y={descY + cell.desc.font_mm * 0.9}
          lineH={cell.desc.font_mm * 1.25}
          font="var(--f-body)"
          size={cell.desc.font_mm}
          fill="var(--c-desc)"
        />
      )}

      {/* fotoğraf / yer tutucu (§8.1); cover override'ında odak noktalı kırpma (§5.5) */}
      {cell.photoBox && cell.photoUrl && (
        <>
          {cell.photoDraw ? (
            <>
              <clipPath id={`mgc-clip-${item.id}`}>
                <rect
                  x={cell.photoBox.x}
                  y={cell.photoBox.y}
                  width={cell.photoBox.w}
                  height={cell.photoBox.h}
                  rx={1.5}
                />
              </clipPath>
              <g clipPath={`url(#mgc-clip-${item.id})`}>
                <image
                  href={cell.photoUrl}
                  x={cell.photoDraw.x}
                  y={cell.photoDraw.y}
                  width={cell.photoDraw.w}
                  height={cell.photoDraw.h}
                  preserveAspectRatio="none"
                />
              </g>
            </>
          ) : (
            <image
              href={cell.photoUrl}
              x={cell.photoBox.x}
              y={cell.photoBox.y}
              width={cell.photoBox.w}
              height={cell.photoBox.h}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
          {mode === "edit" && cell.dpi && cell.dpi.level !== "ok" && (
            <circle
              cx={cell.photoBox.x + cell.photoBox.w - 2.4}
              cy={cell.photoBox.y + 2.4}
              r={1.8}
              fill={cell.dpi.level === "red" ? "#DC2626" : "#F59E0B"}
              stroke="#fff"
              strokeWidth={0.35}
            />
          )}
        </>
      )}
      {cell.photoBox && !cell.photoUrl && mode === "edit" && (
        <Slot
          id={`item:${item.id}:photo`}
          mode={mode}
          selected={selectedSlot === `item:${item.id}:photo`}
          onSlotClick={onSlotClick}
          box={cell.photoBox}
        >
          <g opacity={0.75}>
            <rect
              x={cell.photoBox.x}
              y={cell.photoBox.y}
              width={cell.photoBox.w}
              height={cell.photoBox.h}
              rx={1.5}
              fill="none"
              stroke="var(--c-desc)"
              strokeWidth={0.35}
              strokeDasharray="1.5 1.2"
            />
            {/* kamera ikonu */}
            <g
              transform={`translate(${cell.photoBox.x + cell.photoBox.w / 2}, ${
                cell.photoBox.y + cell.photoBox.h / 2 - 2
              })`}
              stroke="var(--c-desc)"
              strokeWidth={0.4}
              fill="none"
            >
              <rect x={-3.6} y={-2.2} width={7.2} height={5} rx={0.8} />
              <circle cx={0} cy={0.3} r={1.5} />
              <rect x={-1.2} y={-3.1} width={2.4} height={1} rx={0.3} />
            </g>
            <text
              x={cell.photoBox.x + cell.photoBox.w / 2}
              y={cell.photoBox.y + cell.photoBox.h / 2 + 4.4}
              fontSize={2.6}
              textAnchor="middle"
              fill="var(--c-desc)"
              style={{ fontFamily: "var(--f-body)" }}
            >
              {photoWaiting}
            </text>
          </g>
        </Slot>
      )}

      {/* fiyat bloğu — alt sağ */}
      {cell.prices.map((pl, i) => {
        const y = firstPriceY + i * priceLineH;
        const textW = estimateWidth(pl.text, priceSize, priceRatio);
        return (
          <g key={i}>
            {priceStyle === "arrow" && i === cell.prices.length - 1 && (
              <path
                d={`M ${w - PAD - textW - priceSize * 0.75 - 1.2} ${y - priceSize * 0.62} l ${priceSize * 0.55} ${priceSize * 0.38} l ${-priceSize * 0.55} ${priceSize * 0.38} z`}
                fill="var(--c-accent)"
              />
            )}
            <text
              x={w - PAD}
              y={y}
              fontSize={priceSize}
              textAnchor="end"
              fill="var(--c-price)"
              style={{ fontFamily: "var(--f-item)", fontWeight: weights.item }}
            >
              {pl.text}
            </text>
          </g>
        );
      })}
    </Slot>
  );
}

export function MenuGridCellsTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, showGuides, cropMarks, selectedSlot, onSlotClick, editLabels } = props;
  const a = analyzeGrid(client, doc, props.pageIndex ?? 0);
  const B = manifest.bleed_mm;
  const W = a.formatDef.w_mm + 2 * B;
  const H = a.formatDef.h_mm + 2 * B;
  const photoWaiting = editLabels?.photoWaiting ?? "Fotoğraf bekleniyor";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={`${W}mm`}
      height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ ...themeStyle(a.theme), display: "block" }}
    >
      <defs>
        <linearGradient id="mgc-ribbon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--c-panel)" />
          <stop offset="0.82" stopColor="var(--c-panel)" stopOpacity={0.65} />
          <stop offset="1" stopColor="var(--c-panel)" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="mgc-glow" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.05} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* zemin: bleed dahil */}
      <rect x={0} y={0} width={W} height={H} fill="var(--c-bg)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#mgc-glow)" />

      <g transform={`translate(${B}, ${B})`}>
        {a.contBand ? (
          /* FAZ4 §8: devam sayfası ince bandı — logo + başlık + sayfa no (FR) */
          <g>
            {a.contBand.logoUrl && (
              <image
                href={a.contBand.logoUrl}
                x={a.geo.margin}
                y={a.contBand.y}
                width={26}
                height={a.contBand.h}
                preserveAspectRatio="xMinYMid meet"
              />
            )}
            <text
              x={a.contBand.logoUrl ? a.geo.margin + 30 : a.geo.margin}
              y={a.contBand.y + a.contBand.h * 0.68}
              fontSize={7}
              fill="var(--c-heading)"
              style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "0.7559px" }}
            >
              {a.theme.uppercaseHeading ? a.contBand.title.toLocaleUpperCase("fr-FR") : a.contBand.title}
            </text>
            <text
              x={a.formatDef.w_mm - a.geo.margin}
              y={a.contBand.y + a.contBand.h * 0.68}
              fontSize={3.4}
              textAnchor="end"
              fill="var(--c-desc)"
              style={{ fontFamily: "var(--f-body)" }}
            >
              {a.contBand.pageLabel}
            </text>
            <rect
              x={a.geo.margin}
              y={a.contBand.y + a.contBand.h + 1}
              width={a.formatDef.w_mm - 2 * a.geo.margin}
              height={0.6}
              fill="var(--c-accent)"
            />
            {/* dipnot her sayfada (yasal not) */}
            <text
              x={a.formatDef.w_mm / 2}
              y={a.geo.footnoteBaseline}
              fontSize={2.6}
              textAnchor="middle"
              fill="var(--c-desc)"
              style={{ fontFamily: "var(--f-body)" }}
            >
              {client.catalog.footnote_fr}
            </text>
          </g>
        ) : (
          <PageChrome
            geo={a.geo}
            theme={a.theme}
            client={client}
            doc={doc}
            scope={a.scope}
            mode={mode}
            selectedSlot={selectedSlot}
            onSlotClick={onSlotClick}
            qr={a.qr}
          />
        )}

        {/* repeater içerik alanı */}
        <g transform={`translate(${a.geo.content.x}, ${a.geo.content.y})`}>
          {a.layout.placed.map((p, idx) => {
            if (p.kind === "category") {
              const note = p.category.note_fr;
              if (a.theme.categoryStyle === "ribbon") {
                const bandW = Math.min(p.w * 0.64, 118);
                return (
                  <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                    <rect x={0} y={0.6} width={bandW} height={8.2} rx={1.4} fill="url(#mgc-ribbon)" />
                    <path d={`M 1.2 8.8 l 2.6 2.3 l 0 -2.3 z`} fill="var(--c-accent)" />
                    <text
                      x={5}
                      y={6.7}
                      fontSize={5.2}
                      fill="var(--c-heading)"
                      style={{ fontFamily: "var(--f-script)" }}
                    >
                      {p.category.name_fr}
                    </text>
                    {note && (
                      <text
                        x={bandW + 4}
                        y={6.4}
                        fontSize={2.7}
                        fill="var(--c-desc)"
                        style={{ fontFamily: "var(--f-body)" }}
                      >
                        {note}
                      </text>
                    )}
                  </g>
                );
              }
              return (
                <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                  <text
                    x={0}
                    y={7}
                    fontSize={6.4}
                    fill="var(--c-heading)"
                    style={{
                      fontFamily: "var(--f-heading)",
                      fontWeight: a.theme.weights.heading,
                      letterSpacing: "1.3228px",
                    }}
                  >
                    {a.theme.uppercaseHeading
                      ? p.category.name_fr.toLocaleUpperCase("fr-FR")
                      : p.category.name_fr}
                  </text>
                  <rect x={0.2} y={9.2} width={24} height={1.15} fill="var(--c-accent)" />
                  {note && (
                    <text
                      x={p.w}
                      y={7}
                      fontSize={2.7}
                      textAnchor="end"
                      fill="var(--c-desc)"
                      style={{ fontFamily: "var(--f-body)" }}
                    >
                      {note}
                    </text>
                  )}
                </g>
              );
            }
            const cell = a.cells.get(p.item.id);
            if (!cell) return null;
            return (
              <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                <Cell
                  cell={cell}
                  w={p.w}
                  h={p.h}
                  priceStyle={a.priceStyle}
                  weights={a.theme.weights}
                  priceRatio={a.theme.ratios.item}
                  mode={mode}
                  selectedSlot={selectedSlot}
                  onSlotClick={onSlotClick}
                  photoWaiting={photoWaiting}
                />
              </g>
            );
          })}
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
