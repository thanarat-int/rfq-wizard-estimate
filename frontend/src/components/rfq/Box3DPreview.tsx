"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import type { ComponentSpec } from "@/types";
import { TEMPLATE_TYPES } from "@/types";

interface Props {
  comp: ComponentSpec;
}

/* ================================================================
   CSS-3D box renderer — real perspective faces with dynamic
   directional lighting, material shading, soft shadow and
   drag-to-rotate. Replaces the old flat SVG projection.
   ================================================================ */

type V3 = [number, number, number];

const rotY = ([x, y, z]: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
};
const rotX = ([x, y, z]: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
};
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Direction TO the light source (upper-left, slightly toward viewer). CSS axes: x→right, y→down, z→viewer.
const LIGHT: V3 = (() => {
  const v: V3 = [-0.5, -0.62, 0.6];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

/* ── Paper material base colour ── */
function paperBase(comp: ComponentSpec): string {
  const code = (comp.paper?.code || "").toUpperCase();
  const type = (comp.paper?.type || "").toLowerCase();
  if (type.includes("kraft") || ["KB", "KI", "KP", "KS", "KT", "FSC KS"].includes(code)) return "#d3b88f";
  if (code.startsWith("GR") || type.includes("green")) return "#c4ccb4";
  if (code === "WF" || type.includes("woodfree") || type.includes("ปอนด์")) return "#f4f0e8";
  if (code === "GA" || type.includes("gloss")) return "#f5f2ec";
  if (code === "MA" || type.includes("matt")) return "#efece5";
  return "#f1ede4"; // default coated art-card — clean warm white
}

interface Face {
  id: string;
  w: number;
  h: number;
  tf: string;
  n: V3;
  inner?: boolean;
}

function buildFaces(dw: number, dh: number, dd: number, shape: "box" | "tray" | "sleeve"): Face[] {
  const hx = dw / 2, hy = dh / 2, hz = dd / 2;
  const front: Face = { id: "front", w: dw, h: dh, tf: `translateZ(${hz}px)`, n: [0, 0, 1] };
  const back: Face = { id: "back", w: dw, h: dh, tf: `rotateY(180deg) translateZ(${hz}px)`, n: [0, 0, -1] };
  const right: Face = { id: "right", w: dd, h: dh, tf: `rotateY(90deg) translateZ(${hx}px)`, n: [1, 0, 0] };
  const left: Face = { id: "left", w: dd, h: dh, tf: `rotateY(-90deg) translateZ(${hx}px)`, n: [-1, 0, 0] };
  const top: Face = { id: "top", w: dw, h: dd, tf: `rotateX(90deg) translateZ(${hy}px)`, n: [0, -1, 0] };
  const bottom: Face = { id: "bottom", w: dw, h: dd, tf: `rotateX(-90deg) translateZ(${hy}px)`, n: [0, 1, 0] };

  if (shape === "sleeve") {
    // open tube — no front/back
    return [top, bottom, left, right];
  }
  if (shape === "tray") {
    // open top — 4 walls + outer bottom + recessed inner floor
    const innerFloor: Face = {
      id: "inner-floor",
      w: dw - 6,
      h: dd - 6,
      tf: `rotateX(90deg) translateZ(${-hy + 4}px)`,
      n: [0, -1, 0],
      inner: true,
    };
    return [bottom, left, right, front, back, innerFloor];
  }
  return [front, back, left, right, top, bottom];
}

/* ── The interactive 3D box ── */
function Box3D({ comp, maxPx, big = false }: { comp: ComponentSpec; maxPx: number; big?: boolean }) {
  const rot = useRef({ x: -24, y: -34 });
  const drag = useRef<{ on: boolean; px: number; py: number }>({ on: false, px: 0, py: 0 });
  const raf = useRef(0);
  const [, tick] = useState(0);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      if (!drag.current.on) rot.current.y += 0.32 * dt; // gentle auto-spin
      tick((t) => (t + 1) % 1_000_000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const onDown = useCallback((e: React.PointerEvent) => {
    drag.current = { on: true, px: e.clientX, py: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);
  const onMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.on) return;
    rot.current.y += (e.clientX - drag.current.px) * 0.55;
    rot.current.x = clamp(rot.current.x - (e.clientY - drag.current.py) * 0.5, -82, 82);
    drag.current.px = e.clientX;
    drag.current.py = e.clientY;
  }, []);
  const onUp = useCallback(() => {
    drag.current.on = false;
  }, []);

  /* ── dimensions → display sizes ── */
  const d = comp.dimensions;
  const W = Math.max(d?.width || 10, 0.1);
  const H = Math.max(d?.height || 15, 0.1);
  const D = Math.max(d?.depth || 5, 0.1);
  const scale = maxPx / Math.max(W, H, D);

  const t = comp.template_type;
  const shape: "box" | "tray" | "sleeve" =
    t === 9 ? "sleeve" : (t === 5 || t === 6 || t === 7) ? "tray" : "box";

  let dw = Math.max(W * scale, 30);
  let dh = Math.max(H * scale, 30);
  let dd = Math.max(D * scale, 16);
  if (shape === "tray") dh = Math.max(dh * 0.52, 20);
  if (shape === "sleeve") dh = Math.max(dh * 0.7, 24);

  const base = paperBase(comp);
  const coating = (comp.after_press?.coating || "").toLowerCase();
  const glossy = /เงา|gloss|uv|วาว/.test(coating);

  const faces = buildFaces(dw, dh, dd, shape);

  const rxr = (rot.current.x * Math.PI) / 180;
  const ryr = (rot.current.y * Math.PI) / 180;

  const litFace = (f: Face) => {
    const wn = rotX(rotY(f.n, ryr), rxr);
    const diff = Math.max(0, wn[0] * LIGHT[0] + wn[1] * LIGHT[1] + wn[2] * LIGHT[2]);
    let bright = 0.56 + 0.66 * diff;
    if (f.inner) bright *= 0.72;
    bright = clamp(bright, 0.42, glossy ? 1.3 : 1.18);
    const spec = Math.pow(diff, glossy ? 16 : 34) * (glossy ? 0.55 : 0.16);
    return { bright, spec };
  };

  const stageH = big ? maxPx * 1.85 : maxPx * 1.55;
  const persp = big ? maxPx * 4.4 : maxPx * 4;

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        width: "100%",
        height: stageH,
        perspective: `${persp}px`,
        perspectiveOrigin: "50% 42%",
        position: "relative",
        cursor: drag.current.on ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      {/* soft contact shadow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: dw * 1.35,
          height: dd * 1.15,
          marginLeft: -(dw * 1.35) / 2,
          marginTop: dh * 0.32,
          background: "radial-gradient(ellipse at center, rgba(46,26,86,0.34), rgba(46,26,86,0) 70%)",
          filter: "blur(9px)",
          borderRadius: "50%",
          transform: `rotateX(72deg) scale(${0.9 + 0.25 * Math.abs(Math.cos(ryr))})`,
        }}
      />

      {/* the box */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.current.x}deg) rotateY(${rot.current.y}deg)`,
        }}
      >
        {faces.map((f) => {
          const { bright, spec } = litFace(f);
          return (
            <div
              key={f.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: f.w,
                height: f.h,
                marginLeft: -f.w / 2,
                marginTop: -f.h / 2,
                transform: f.tf,
                backfaceVisibility: shape === "box" ? "hidden" : "visible",
                borderRadius: 3,
                background: `linear-gradient(152deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 44%, rgba(35,20,60,0.07) 100%), ${base}`,
                filter: `brightness(${bright.toFixed(3)}) saturate(1.03)`,
                boxShadow:
                  "inset 1px 1px 0 rgba(255,255,255,0.4), inset -1.5px -1.5px 4px rgba(40,25,70,0.13)",
                overflow: "hidden",
              }}
            >
              {/* specular glint */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9), rgba(255,255,255,0) 58%)",
                  opacity: spec,
                  pointerEvents: "none",
                }}
              />
              {/* inner-floor occlusion */}
              {f.inner && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(160deg, rgba(30,18,55,0.32), rgba(30,18,55,0.05) 55%)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function Box3DPreview({ comp }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  const raw = comp.dimensions || { width: 10, height: 15, depth: 5 };
  const unit = comp.dimensions?.unit || "cm";
  const hasPrint = typeof comp.outside === "object" && comp.outside.print_type !== "no_print";
  const colorCount = hasPrint && typeof comp.outside === "object" ? comp.outside.color_count : 0;
  const templateName = comp.template_type
    ? TEMPLATE_TYPES[comp.template_type as keyof typeof TEMPLATE_TYPES] || null
    : null;

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  return (
    <>
      {/* ── Inline Preview ── */}
      <div
        onDoubleClick={openFullscreen}
        style={{
          position: "relative",
          background: "linear-gradient(160deg, #f9f7ff 0%, #ece5ff 45%, #f1ecff 100%)",
          borderRadius: 16,
          overflow: "hidden",
          padding: "12px 16px 14px",
          userSelect: "none",
        }}
      >
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse at 50% 45%, black 35%, transparent 82%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 35%, transparent 82%)",
        }} />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 2, position: "relative", zIndex: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#7c3aed",
              boxShadow: "0 0 6px rgba(124,58,237,0.4)",
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
              color: "#7c3aed", textTransform: "uppercase", opacity: 0.7,
            }}>
              3D Preview
            </span>
          </div>
          {templateName && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#7c3aed",
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.15)",
              padding: "2px 8px", borderRadius: 6,
            }}>
              {templateName}
            </span>
          )}
        </div>

        {/* 3D Scene */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <Box3D comp={comp} maxPx={120} />
        </div>

        {/* Dimension badges */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 8,
          position: "relative", zIndex: 2, marginTop: -2,
        }}>
          <DimBadge label="W" value={raw.width || 0} unit={unit} />
          <DimBadge label="H" value={raw.height || 0} unit={unit} />
          <DimBadge label="D" value={raw.depth || 0} unit={unit} />
        </div>

        {/* Info */}
        <div style={{ textAlign: "center", marginTop: 6, position: "relative", zIndex: 2 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
            {raw.width || 0} x {raw.height || 0}{raw.depth ? ` x ${raw.depth}` : ""} {unit}
          </p>
          {comp.paper && (
            <p style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginTop: 2 }}>
              {comp.paper.code || comp.paper.type} {comp.paper.gsm}g
              {colorCount > 0 && ` · ${colorCount} สี`}
            </p>
          )}
        </div>

        {/* Hint */}
        <div style={{
          position: "absolute", bottom: 6, right: 12,
          fontSize: 9, fontWeight: 500, color: "rgba(124,58,237,0.4)",
        }}>
          ลากเพื่อหมุน · ดับเบิลคลิกเพื่อขยาย
        </div>
      </div>

      {/* ── Fullscreen Modal ── */}
      {fullscreen && (
        <div
          onClick={closeFullscreen}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "linear-gradient(160deg, #faf8ff 0%, #ece5ff 45%, #f3efff 100%)",
              borderRadius: 24,
              padding: "32px 40px 36px",
              maxWidth: 640, width: "92vw",
              boxShadow: "0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(124,58,237,0.08)",
            }}
          >
            <button
              onClick={closeFullscreen}
              style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 36, borderRadius: 12,
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#7c3aed", zIndex: 5,
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>

            <div style={{ marginBottom: 8 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
                {comp.component_name || "3D Preview"}
              </h3>
              {templateName && (
                <p style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed", marginTop: 4 }}>
                  {templateName}
                </p>
              )}
            </div>

            <Box3D comp={comp} maxPx={210} big />

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 4 }}>
              <DimBadge label="W" value={raw.width || 0} unit={unit} large />
              <DimBadge label="H" value={raw.height || 0} unit={unit} large />
              <DimBadge label="D" value={raw.depth || 0} unit={unit} large />
            </div>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>
                {raw.width || 0} x {raw.height || 0}{raw.depth ? ` x ${raw.depth}` : ""} {unit}
              </p>
              {comp.paper && (
                <p style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginTop: 4 }}>
                  {comp.paper.code || comp.paper.type} {comp.paper.gsm}g
                  {colorCount > 0 && ` · ${colorCount} สี`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Dim Badge ─── */
function DimBadge({ label, value, unit, large }: { label: string; value: number; unit: string; large?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: large ? 6 : 4,
      background: "rgba(124,58,237,0.06)",
      border: "1px solid rgba(124,58,237,0.12)",
      borderRadius: large ? 10 : 8,
      padding: large ? "4px 14px" : "3px 10px",
    }}>
      <span style={{ fontSize: large ? 12 : 10, fontWeight: 800, color: "#7c3aed" }}>{label}</span>
      <span style={{ fontSize: large ? 14 : 12, fontWeight: 600, color: "#1e1b4b" }}>
        {value}{unit}
      </span>
    </div>
  );
}
