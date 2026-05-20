"use client";

import { useMemo } from "react";
import type { ComponentSpec } from "@/types";

interface Props {
  comp: ComponentSpec;
}

/* ================================================================
   Die-cut flat layout SVG — shows the "open" pattern for template 1-11
   Each template draws proportional panels with dimension labels.
   ================================================================ */

// Colors
const FILL_MAIN = "rgba(124,58,237,0.08)";
const FILL_FLAP = "rgba(124,58,237,0.04)";
const STROKE = "rgba(124,58,237,0.35)";
const STROKE_FOLD = "rgba(124,58,237,0.18)";
const LABEL_COLOR = "#7c3aed";
const DIM_COLOR = "#6b7280";

// Clean architectural-style dimension line: thin line + small end ticks
// (no arrowhead markers). Everything divides by `scale` so it stays a
// constant visual size regardless of the auto-fit group scale.
function DimLine({
  x1, y1, x2, y2, label, scale, horizontal = true,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; scale: number; horizontal?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  if (len < 8) return null;

  const fs = 8.5 / scale;
  const sw = 0.9 / scale;
  const tick = 3.5 / scale;

  return (
    <g stroke={DIM_COLOR} strokeWidth={sw} strokeLinecap="round" opacity={0.6}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {horizontal ? (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
        </>
      ) : (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
        </>
      )}
      <text
        x={horizontal ? mx : mx - 5 / scale}
        y={horizontal ? my + fs * 1.5 : my}
        textAnchor={horizontal ? "middle" : "end"}
        dominantBaseline="middle"
        fontSize={fs}
        fontWeight="700"
        fill={DIM_COLOR}
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}

// Panel rectangle. `scale` keeps label text + strokes visually constant.
function Panel({
  x, y, w, h, dashed, light, label, scale, labelSize = 8,
}: {
  x: number; y: number; w: number; h: number;
  dashed?: boolean; light?: boolean; label?: string; scale: number; labelSize?: number;
}) {
  if (w <= 0 || h <= 0) return null;
  const fs = labelSize / scale;
  // Hide label if it clearly won't fit inside the panel
  const showLabel = label && w * scale > 14 && h * scale > 9;
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        fill={light ? FILL_FLAP : FILL_MAIN}
        stroke={dashed ? STROKE_FOLD : STROKE}
        strokeWidth={(dashed ? 0.6 : 1) / scale}
        strokeDasharray={dashed ? `${3 / scale},${2 / scale}` : undefined}
        rx={1 / scale}
      />
      {showLabel && (
        <text
          x={x + w / 2} y={y + h / 2 + fs / 3}
          textAnchor="middle" fontSize={fs} fontWeight="500"
          fill={LABEL_COLOR} opacity={0.65}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/* ================================================================
   Template Renderers
   All work in "mm" coordinates, then get scaled to fit the SVG.
   Returns { elements, totalW, totalH } in mm units.
   ================================================================ */

function getTemplatePanels(templateType: number, d: ComponentSpec["dimensions"]) {
  const w = d?.width || 50;   // box width (mm)
  const h = d?.height || 70;  // box length/height (mm)
  const depth = d?.depth || 30; // box depth (mm)

  // Common flap sizes (proportional)
  const dust = Math.min(depth * 0.5, 15);
  const tuck = Math.min(w * 0.5, 15);
  const glue = Math.min(depth * 0.4, 12);
  const b = 3; // bleed

  switch (templateType) {
    case 1: // Reverse Tuck End
    case 2: { // Straight Tuck End
      // W side: G | LENGTH(d) | WIDTH(w) | LENGTH(d) | WIDTH(w) | W(glue)
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      let cx = 0;
      const totalH_mm = h + dust * 2 + tuck * 2;
      const y0 = tuck + dust;

      // Glue flap
      panels.push({ x: cx, y: y0, w: glue, h: h, label: "G", light: true, dashed: true });
      cx += glue;

      // Repeat: LENGTH, WIDTH
      for (let i = 0; i < 2; i++) {
        // LENGTH (depth)
        panels.push({ x: cx, y: y0, w: depth, h: h, label: `d=${depth}` });
        // Top dust flap
        panels.push({ x: cx, y: y0 - dust, w: depth, h: dust, label: "dust", light: true, dashed: true });
        // Bottom dust flap
        panels.push({ x: cx, y: y0 + h, w: depth, h: dust, label: "dust", light: true, dashed: true });
        cx += depth;

        // WIDTH
        panels.push({ x: cx, y: y0, w: w, h: h, label: `w=${w}` });
        // Top tuck flap
        panels.push({ x: cx, y: y0 - dust - tuck, w: w, h: tuck, label: "tuck", light: true, dashed: true });
        // Top dust connector
        panels.push({ x: cx, y: y0 - dust, w: w, h: dust, label: "", light: true, dashed: true });
        // Bottom tuck
        panels.push({ x: cx, y: y0 + h + dust, w: w, h: tuck, label: "tuck", light: true, dashed: true });
        // Bottom dust connector
        panels.push({ x: cx, y: y0 + h, w: w, h: dust, label: "", light: true, dashed: true });
        cx += w;
      }

      // Small glue tab
      panels.push({ x: cx, y: y0, w: glue * 0.6, h: h, label: "W", light: true, dashed: true });
      cx += glue * 0.6;

      return { panels, totalW: cx, totalH: totalH_mm, dims: { w, h, depth, dust, tuck, glue } };
    }

    case 3: // TTSLB
    case 4: { // TTAB
      // Similar to 1/2 but bottom has snap-lock or auto-bottom with OL
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      let cx = 0;
      const ol = Math.min(w * 0.4, 12);
      const totalH_mm = h + dust * 2 + tuck + ol;
      const y0 = tuck + dust;

      // Glue flap
      panels.push({ x: cx, y: y0, w: glue, h: h, label: "G", light: true, dashed: true });
      cx += glue;

      for (let i = 0; i < 2; i++) {
        // LENGTH (depth)
        panels.push({ x: cx, y: y0, w: depth, h: h, label: `d=${depth}` });
        panels.push({ x: cx, y: y0 - dust, w: depth, h: dust, label: "dust", light: true, dashed: true });
        panels.push({ x: cx, y: y0 + h, w: depth, h: dust, label: "dust", light: true, dashed: true });
        cx += depth;

        // WIDTH
        panels.push({ x: cx, y: y0, w: w, h: h, label: `w=${w}` });
        // Top: tuck flap
        panels.push({ x: cx, y: y0 - dust - tuck, w: w, h: tuck, label: "tuck", light: true, dashed: true });
        panels.push({ x: cx, y: y0 - dust, w: w, h: dust, label: "", light: true, dashed: true });
        // Bottom: OL (snap-lock / auto-bottom)
        panels.push({ x: cx, y: y0 + h, w: w, h: dust, label: "", light: true, dashed: true });
        panels.push({ x: cx, y: y0 + h + dust, w: w, h: ol, label: templateType === 3 ? "OL" : "Auto", light: true, dashed: true });
        cx += w;
      }

      panels.push({ x: cx, y: y0, w: glue * 0.6, h: h, label: "W", light: true, dashed: true });
      cx += glue * 0.6;

      return { panels, totalW: cx, totalH: totalH_mm, dims: { w, h, depth, dust, tuck, glue, ol } };
    }

    case 5: { // Simplex Tray
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      // W side: depth | width | depth (doubled walls)
      const totalW_mm = w + 4 * depth;
      const totalH_mm = h + 4 * depth + 2 * dust;
      const x0 = 0;
      const y0 = depth * 2 + dust;

      // Top flaps
      panels.push({ x: x0 + depth * 2, y: 0, w: w, h: dust, label: "dust", light: true, dashed: true });
      panels.push({ x: x0 + depth * 2, y: dust, w: w, h: depth, label: `d`, light: true, dashed: true });
      panels.push({ x: x0 + depth, y: dust, w: depth, h: depth, label: "", light: true, dashed: true });
      panels.push({ x: x0 + depth * 2 + w, y: dust, w: depth, h: depth, label: "", light: true, dashed: true });

      // Side walls left
      panels.push({ x: x0, y: y0, w: depth, h: h, label: `d`, light: true, dashed: true });
      panels.push({ x: x0 + depth, y: y0, w: depth, h: h, label: `d` });

      // Main face
      panels.push({ x: x0 + depth * 2, y: y0, w: w, h: h, label: `w=${w}` });

      // Side walls right
      panels.push({ x: x0 + depth * 2 + w, y: y0, w: depth, h: h, label: `d` });
      panels.push({ x: x0 + depth * 2 + w + depth, y: y0, w: depth, h: h, label: `d`, light: true, dashed: true });

      // Bottom flaps
      panels.push({ x: x0 + depth * 2, y: y0 + h, w: w, h: depth, label: `d`, light: true, dashed: true });
      panels.push({ x: x0 + depth * 2, y: y0 + h + depth, w: w, h: dust, label: "dust", light: true, dashed: true });

      return { panels, totalW: totalW_mm, totalH: totalH_mm, dims: { w, h, depth, dust } };
    }

    case 6: { // Frame-Vue Tray
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      const ol = Math.min(depth * 0.6, 10); // frame overlap
      const totalW_mm = w + 4 * depth + 2 * ol + 2 * dust;
      const totalH_mm = h + 4 * depth + 2 * dust + 2 * ol;
      const x0 = dust + ol;
      const y0 = dust + ol + depth * 2;

      // Main face
      panels.push({ x: x0 + depth * 2, y: y0, w: w, h: h, label: `w=${w}` });

      // Side walls
      panels.push({ x: x0, y: y0, w: depth, h: h, label: `d`, light: true, dashed: true });
      panels.push({ x: x0 + depth, y: y0, w: depth, h: h, label: `d` });
      panels.push({ x: x0 + depth * 2 + w, y: y0, w: depth, h: h, label: `d` });
      panels.push({ x: x0 + depth * 2 + w + depth, y: y0, w: depth, h: h, label: `d`, light: true, dashed: true });

      // Top/bottom walls
      panels.push({ x: x0 + depth * 2, y: y0 - depth, w: w, h: depth, label: `d`, dashed: true });
      panels.push({ x: x0 + depth * 2, y: y0 - depth * 2, w: w, h: depth, label: `d`, light: true, dashed: true });
      panels.push({ x: x0 + depth * 2, y: y0 + h, w: w, h: depth, label: `d`, dashed: true });
      panels.push({ x: x0 + depth * 2, y: y0 + h + depth, w: w, h: depth, label: `d`, light: true, dashed: true });

      // Frame flaps (ol)
      panels.push({ x: x0 - ol, y: y0, w: ol, h: h, label: "ol", light: true, dashed: true });
      panels.push({ x: x0 + depth * 2 + w + depth * 2, y: y0, w: ol, h: h, label: "ol", light: true, dashed: true });

      return { panels, totalW: totalW_mm, totalH: totalH_mm, dims: { w, h, depth, ol, dust } };
    }

    case 7: { // Four Corner Beers Tray
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      const totalW_mm = w + 2 * (h + dust);
      const totalH_mm = h + 2 * depth;
      const x0 = h + dust;
      const y0 = depth;

      // Main bottom
      panels.push({ x: x0, y: y0, w: w, h: h, label: `w=${w}` });

      // Side walls
      panels.push({ x: x0, y: 0, w: w, h: depth, label: `d`, dashed: true });
      panels.push({ x: x0, y: y0 + h, w: w, h: depth, label: `d`, dashed: true });

      // Left wing
      panels.push({ x: 0, y: y0, w: h, h: h, label: `l=${h}` });
      panels.push({ x: h, y: y0, w: dust, h: h, label: "dust", light: true, dashed: true });

      // Right wing
      panels.push({ x: x0 + w, y: y0, w: dust, h: h, label: "dust", light: true, dashed: true });
      panels.push({ x: x0 + w + dust, y: y0, w: h, h: h, label: `l=${h}` });

      // Corner glue flaps
      panels.push({ x: 0, y: 0, w: h, h: depth, label: "glue", light: true, dashed: true });
      panels.push({ x: 0, y: y0 + h, w: h, h: depth, label: "glue", light: true, dashed: true });
      panels.push({ x: x0 + w + dust, y: 0, w: h, h: depth, label: "glue", light: true, dashed: true });
      panels.push({ x: x0 + w + dust, y: y0 + h, w: h, h: depth, label: "glue", light: true, dashed: true });

      return { panels, totalW: totalW_mm, totalH: totalH_mm, dims: { w, h, depth, dust } };
    }

    case 8: { // Gable Top
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      const ol = Math.min(w * 0.3, 10);
      const totalH_mm = h + dust * 2 + tuck;
      let cx = 0;
      const y0 = tuck;

      // Repeat: LENGTH, WIDTH (similar to 1/2 but with gable top)
      for (let i = 0; i < 2; i++) {
        panels.push({ x: cx, y: y0, w: depth, h: h, label: `d=${depth}` });
        // Top gable
        panels.push({ x: cx, y: 0, w: depth, h: tuck, label: "gable", light: true, dashed: true });
        cx += depth;

        panels.push({ x: cx, y: y0, w: w, h: h, label: `w=${w}` });
        panels.push({ x: cx, y: 0, w: w, h: tuck, label: "tuck", light: true, dashed: true });
        cx += w;
      }

      // Bottom OL
      const y_bottom = y0 + h;
      panels.push({ x: 0, y: y_bottom, w: depth, h: ol, label: "OL", light: true, dashed: true });
      panels.push({ x: depth, y: y_bottom, w: w, h: dust, label: "dust", light: true, dashed: true });
      panels.push({ x: depth + w, y: y_bottom, w: depth, h: ol, label: "OL", light: true, dashed: true });
      panels.push({ x: depth + w + depth, y: y_bottom, w: w, h: dust, label: "dust", light: true, dashed: true });

      const totalW_mm = cx;
      return { panels, totalW: totalW_mm, totalH: totalH_mm + ol, dims: { w, h, depth, dust, tuck, ol } };
    }

    case 9: { // Sleeve
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      // Sleeve: G | LENGTH(h) | WIDTH(w) | LENGTH(h) | WIDTH(w) | glue tab
      let cx = 0;
      const totalH_mm = depth;

      panels.push({ x: cx, y: 0, w: glue, h: depth, label: "G", light: true, dashed: true });
      cx += glue;

      for (let i = 0; i < 2; i++) {
        panels.push({ x: cx, y: 0, w: h, h: depth, label: `l=${h}` });
        cx += h;
        panels.push({ x: cx, y: 0, w: w, h: depth, label: `w=${w}` });
        cx += w;
      }

      panels.push({ x: cx, y: 0, w: glue * 0.5, h: depth, label: "W", light: true, dashed: true });
      cx += glue * 0.5;

      return { panels, totalW: cx, totalH: totalH_mm, dims: { w, h: depth, depth: h } };
    }

    case 10: { // Pillow Box
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      const totalW_mm = h + depth;
      const totalH_mm = w * 2 + 2 * b + glue;

      // Two main faces
      panels.push({ x: 0, y: glue, w: h, h: w, label: `l=${h}` });
      panels.push({ x: h, y: glue, w: depth, h: w, label: `d=${depth}` });
      panels.push({ x: 0, y: glue + w, w: h, h: w, label: `l=${h}` });
      panels.push({ x: h, y: glue + w, w: depth, h: w, label: `d=${depth}` });

      // Glue flap
      panels.push({ x: 0, y: 0, w: h, h: glue, label: "G", light: true, dashed: true });

      return { panels, totalW: totalW_mm, totalH: totalH_mm, dims: { w, h, depth } };
    }

    case 11: { // Seal End
      const panels: { x: number; y: number; w: number; h: number; label: string; light?: boolean; dashed?: boolean }[] = [];
      let cx = 0;
      const totalH_mm = h + tuck * 2 + dust * 2;
      const y0 = tuck + dust;

      // G | LENGTH(d) | WIDTH(w) | LENGTH(d) | WIDTH(w) | dust flap
      panels.push({ x: cx, y: y0, w: glue, h: h, label: "G", light: true, dashed: true });
      cx += glue;

      for (let i = 0; i < 2; i++) {
        panels.push({ x: cx, y: y0, w: depth, h: h, label: `d=${depth}` });
        panels.push({ x: cx, y: y0 - dust, w: depth, h: dust, label: "dust", light: true, dashed: true });
        panels.push({ x: cx, y: y0 + h, w: depth, h: dust, label: "dust", light: true, dashed: true });
        cx += depth;

        panels.push({ x: cx, y: y0, w: w, h: h, label: `w=${w}` });
        // Seal end flaps (top/bottom)
        panels.push({ x: cx, y: y0 - dust, w: w, h: dust, label: "seal", light: true, dashed: true });
        panels.push({ x: cx, y: y0 - dust - tuck, w: w, h: tuck, label: "seal", light: true, dashed: true });
        panels.push({ x: cx, y: y0 + h, w: w, h: dust, label: "seal", light: true, dashed: true });
        panels.push({ x: cx, y: y0 + h + dust, w: w, h: tuck, label: "seal", light: true, dashed: true });
        cx += w;
      }

      return { panels, totalW: cx, totalH: totalH_mm, dims: { w, h, depth, dust, tuck } };
    }

    default:
      return null;
  }
}

/* ================================================================
   Main Component
   ================================================================ */
export default function TemplateLayoutSVG({ comp }: Props) {
  const templateType = comp.template_type;

  const result = useMemo(() => {
    if (!templateType || templateType < 1 || templateType > 11) return null;
    return getTemplatePanels(templateType, comp.dimensions);
  }, [templateType, comp.dimensions]);

  if (!result) {
    if (templateType === 12) {
      return (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-text-dim)" }}>
            Custom Template - ไม่มี Layout มาตรฐาน
          </p>
        </div>
      );
    }
    return null;
  }

  const { panels, totalW, totalH, dims } = result;

  // Scale to fit in SVG viewport
  const SVG_W = 320;
  const SVG_H = 280;
  const PADDING = 30;
  const scaleX = (SVG_W - PADDING * 2) / totalW;
  const scaleY = (SVG_H - PADDING * 2) / totalH;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (SVG_W - totalW * scale) / 2;
  const offsetY = (SVG_H - totalH * scale) / 2;

  const TEMPLATE_NAMES: Record<number, string> = {
    1: "Reverse Tuck End",
    2: "Straight Tuck End",
    3: "TTSLB",
    4: "TTAB",
    5: "Simplex Tray",
    6: "Frame-Vue Tray",
    7: "Four Corner Beers",
    8: "Gable Top",
    9: "Sleeve",
    10: "Pillow Box",
    11: "Seal End",
  };

  const d = comp.dimensions;
  const unit = d?.unit || "mm";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: LABEL_COLOR, boxShadow: `0 0 6px ${LABEL_COLOR}40` }}
          />
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: LABEL_COLOR, opacity: 0.7 }}>
            Die-cut Layout
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-md"
          style={{ background: `${LABEL_COLOR}12`, color: LABEL_COLOR, border: `1px solid ${LABEL_COLOR}20` }}
        >
          {TEMPLATE_NAMES[templateType!] || ""}
        </span>
      </div>

      {/* SVG */}
      <div className="px-3 py-2">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${SVG_W} / ${SVG_H}` }}
        >
          <g transform={`translate(${offsetX},${offsetY}) scale(${scale})`}>
            {/* Panels */}
            {panels.map((p, i) => (
              <Panel
                key={i}
                x={p.x} y={p.y} w={p.w} h={p.h}
                label={p.label}
                light={p.light}
                dashed={p.dashed}
                scale={scale}
              />
            ))}

            {/* Grain direction arrow */}
            <g>
              <text x={totalW / 2} y={-7 / scale} textAnchor="middle" fontSize={9 / scale} fontWeight="600" fill={DIM_COLOR} opacity={0.5}>
                GRAIN {"\u2192"}
              </text>
            </g>

            {/* Overall dimension lines */}
            {/* W side (horizontal) */}
            <DimLine
              x1={0} y1={totalH + 12 / scale}
              x2={totalW} y2={totalH + 12 / scale}
              label={`W side`}
              scale={scale}
              horizontal
            />
            {/* L side (vertical) */}
            <DimLine
              x1={-12 / scale} y1={0}
              x2={-12 / scale} y2={totalH}
              label={`L side`}
              scale={scale}
              horizontal={false}
            />
          </g>
        </svg>
      </div>

      {/* Dimension info */}
      <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
        {d?.width && (
          <span className="text-xs px-2 py-1 rounded-md font-medium"
            style={{ background: `${LABEL_COLOR}08`, color: DIM_COLOR, border: `1px solid ${LABEL_COLOR}10` }}>
            W={d.width}{unit}
          </span>
        )}
        {d?.height && (
          <span className="text-xs px-2 py-1 rounded-md font-medium"
            style={{ background: `${LABEL_COLOR}08`, color: DIM_COLOR, border: `1px solid ${LABEL_COLOR}10` }}>
            L={d.height}{unit}
          </span>
        )}
        {d?.depth && (
          <span className="text-xs px-2 py-1 rounded-md font-medium"
            style={{ background: `${LABEL_COLOR}08`, color: DIM_COLOR, border: `1px solid ${LABEL_COLOR}10` }}>
            D={d.depth}{unit}
          </span>
        )}
      </div>
    </div>
  );
}
