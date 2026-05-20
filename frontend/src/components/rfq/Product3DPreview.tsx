"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Box, BookOpen, FileText, Tag, ShoppingBag } from "lucide-react";
import type { ParsedSpec } from "@/types";

interface Props {
  spec: ParsedSpec;
  size?: "sm" | "md" | "lg";
  autoRotate?: boolean;
  showParticles?: boolean;
  showReflection?: boolean;
  interactive?: boolean;
}

const SIZE_SCALES = { sm: 120, md: 200, lg: 280 };

const TYPE_COLORS: Record<string, { main: string; light: string; dark: string; accent: string }> = {
  box:       { main: "#d97706", light: "#fbbf24", dark: "#92400e", accent: "#fef3c7" },
  tray:      { main: "#d97706", light: "#fbbf24", dark: "#92400e", accent: "#fef3c7" },
  sleeve:    { main: "#d97706", light: "#fbbf24", dark: "#92400e", accent: "#fef3c7" },
  packaging: { main: "#d97706", light: "#fbbf24", dark: "#92400e", accent: "#fef3c7" },
  bag:       { main: "#059669", light: "#34d399", dark: "#065f46", accent: "#d1fae5" },
  label:     { main: "#7c3aed", light: "#a78bfa", dark: "#5b21b6", accent: "#ede9fe" },
  brochure:  { main: "#4f46e5", light: "#818cf8", dark: "#3730a3", accent: "#e0e7ff" },
  poster:    { main: "#4f46e5", light: "#818cf8", dark: "#3730a3", accent: "#e0e7ff" },
  book:      { main: "#4f46e5", light: "#818cf8", dark: "#3730a3", accent: "#e0e7ff" },
  namecard:  { main: "#4f46e5", light: "#818cf8", dark: "#3730a3", accent: "#e0e7ff" },
  envelope:  { main: "#475569", light: "#94a3b8", dark: "#1e293b", accent: "#f1f5f9" },
};

const TYPE_ICONS: Record<string, typeof Box> = {
  box: Box, tray: Box, sleeve: Box, packaging: Box,
  bag: ShoppingBag, label: Tag,
  brochure: FileText, poster: FileText, book: BookOpen,
  namecard: FileText, envelope: FileText,
};

/* ─── Interactive rotation hook ─── */
function useInteractiveRotation(interactive: boolean, initialX = -20, initialY = -30) {
  const [rot, setRot] = useState({ x: initialX, y: initialY });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!interactive) return;
    dragging.current = true;
    const pt = "touches" in e ? e.touches[0] : e;
    lastMouse.current = { x: pt.clientX, y: pt.clientY };
  }, [interactive]);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return;
    const pt = "touches" in e ? e.touches[0] : e;
    const dx = pt.clientX - lastMouse.current.x;
    const dy = pt.clientY - lastMouse.current.y;
    lastMouse.current = { x: pt.clientX, y: pt.clientY };
    setRot((r) => ({
      x: Math.max(-60, Math.min(15, r.x + dy * 0.35)),
      y: r.y + dx * 0.35,
    }));
  }, []);

  const onUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); };
  }, []);

  return { rot, dragging, onDown, onMove, onUp };
}

/* ═══════════════════ 3D BOX ═══════════════════ */
function Box3D({
  w, h, d, colors, scale, autoRotate, interactive, showReflection,
}: {
  w: number; h: number; d: number;
  colors: { main: string; light: string; dark: string; accent: string };
  scale: number; autoRotate: boolean; interactive: boolean; showReflection: boolean;
}) {
  const maxDim = Math.max(w, h, d, 1);
  const s = scale / maxDim;
  const pw = Math.max(Math.round(w * s), 20);
  const ph = Math.max(Math.round(h * s), 20);
  const pd = Math.max(Math.round(d * s), 8);

  const { rot, dragging, onDown, onMove } = useInteractiveRotation(interactive);

  const springTransition = "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)";

  const edgeColor = colors.dark + "60";

  return (
    <div
      style={{ perspective: 900, cursor: interactive ? "grab" : "default" }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onTouchStart={onDown}
      onTouchMove={onMove}
    >
      <div
        className={autoRotate && !dragging.current ? "auto-rotate-3d" : ""}
        style={{
          width: pw,
          height: ph,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: autoRotate && !dragging.current ? undefined : `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging.current ? "none" : "transform 0.4s ease-out",
          margin: "0 auto",
        }}
      >
        {/* ═ FRONT ═ */}
        <div style={{
          position: "absolute", width: pw, height: ph,
          transform: `translateZ(${pd / 2}px)`,
          borderRadius: 3,
          background: `linear-gradient(170deg, ${colors.accent}cc 0%, ${colors.light}aa 30%, ${colors.main}dd 100%)`,
          boxShadow: `inset 0 1px 0 ${colors.accent}80, inset 0 -1px 0 ${colors.dark}30, 0 0 0 0.5px ${edgeColor}`,
          transition: springTransition,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* Subtle print pattern */}
          <div style={{
            position: "absolute", inset: "8%",
            border: `1px dashed ${colors.dark}20`,
            borderRadius: 2,
          }} />
          {/* Brand area */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, zIndex: 1,
          }}>
            <div style={{
              width: pw * 0.35, height: 3,
              background: `${colors.dark}30`, borderRadius: 2,
            }} />
            <span style={{
              color: colors.dark, fontSize: Math.max(9, pw * 0.08),
              fontWeight: 800, opacity: 0.5, letterSpacing: 1,
            }}>
              {w}×{h}×{d}
            </span>
            <div style={{
              width: pw * 0.25, height: 2,
              background: `${colors.dark}20`, borderRadius: 2,
            }} />
          </div>
          {/* Light sheen */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "40%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
            borderRadius: "3px 3px 0 0",
          }} />
        </div>

        {/* ═ BACK ═ */}
        <div style={{
          position: "absolute", width: pw, height: ph,
          transform: `translateZ(${-pd / 2}px) rotateY(180deg)`,
          borderRadius: 3,
          background: `linear-gradient(170deg, ${colors.main}90, ${colors.dark}b0)`,
          boxShadow: `inset 0 1px 0 ${colors.main}40, 0 0 0 0.5px ${edgeColor}`,
          transition: springTransition,
        }} />

        {/* ═ LEFT ═ */}
        <div style={{
          position: "absolute", width: pd, height: ph,
          transform: `rotateY(-90deg) translateZ(${pw / 2}px)`,
          left: (pw - pd) / 2,
          borderRadius: 3,
          background: `linear-gradient(180deg, ${colors.main}c0, ${colors.dark}d0)`,
          boxShadow: `inset 1px 0 0 ${colors.light}30, inset -1px 0 0 ${colors.dark}40, 0 0 0 0.5px ${edgeColor}`,
          transition: springTransition,
        }} />

        {/* ═ RIGHT ═ */}
        <div style={{
          position: "absolute", width: pd, height: ph,
          transform: `rotateY(90deg) translateZ(${pw / 2}px)`,
          left: (pw - pd) / 2,
          borderRadius: 3,
          background: `linear-gradient(180deg, ${colors.light}80, ${colors.main}a0)`,
          boxShadow: `inset 1px 0 0 ${colors.accent}40, inset -1px 0 0 ${colors.main}40, 0 0 0 0.5px ${edgeColor}`,
          transition: springTransition,
        }}>
          {/* Light sheen on right face */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
            borderRadius: 3,
          }} />
        </div>

        {/* ═ TOP ═ */}
        <div style={{
          position: "absolute", width: pw, height: pd,
          transform: `rotateX(90deg) translateZ(${ph / 2}px)`,
          top: (ph - pd) / 2,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${colors.accent}b0, ${colors.light}90, ${colors.main}70)`,
          boxShadow: `inset 0 0 0 0.5px ${edgeColor}`,
          transition: springTransition,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
            borderRadius: 3,
          }} />
        </div>

        {/* ═ BOTTOM ═ */}
        <div style={{
          position: "absolute", width: pw, height: pd,
          transform: `rotateX(-90deg) translateZ(${ph / 2}px)`,
          top: (ph - pd) / 2,
          borderRadius: 3,
          background: `${colors.dark}60`,
          boxShadow: `inset 0 0 0 0.5px ${edgeColor}`,
          transition: springTransition,
        }} />
      </div>

      {/* ═ GROUND SHADOW ═ */}
      <div style={{
        width: pw + pd * 0.5,
        height: pd + 16,
        margin: "12px auto 0",
        background: `radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,0,0,0.14), rgba(0,0,0,0.04) 50%, transparent 70%)`,
        filter: "blur(10px)",
        borderRadius: "50%",
        transition: springTransition,
      }} />

      {/* ═ REFLECTION ═ */}
      {showReflection && (
        <div style={{
          width: pw,
          height: ph * 0.3,
          margin: "-8px auto 0",
          background: `linear-gradient(to bottom, ${colors.main}15, ${colors.main}05, transparent)`,
          borderRadius: "0 0 4px 4px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)",
          transition: springTransition,
        }} />
      )}
    </div>
  );
}

/* ═══════════════════ BOOK / FLAT SHEET ═══════════════════ */
function BookPreview({
  w, h, colors, scale, autoRotate, interactive, showReflection, isBook,
}: {
  w: number; h: number;
  colors: { main: string; light: string; dark: string; accent: string };
  scale: number; autoRotate: boolean; interactive: boolean; showReflection: boolean; isBook: boolean;
}) {
  const maxDim = Math.max(w, h, 1);
  const s = scale / maxDim;
  const pw = Math.max(Math.round(w * s), 30);
  const ph = Math.max(Math.round(h * s), 30);
  // Thin but visible depth for books/brochures
  const pd = isBook ? Math.max(Math.round(Math.min(w, h) * s * 0.08), 8) : 4;

  const { rot, dragging, onDown, onMove } = useInteractiveRotation(interactive, -15, -25);

  const springT = "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)";

  return (
    <div
      style={{ perspective: 900, cursor: interactive ? "grab" : "default" }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onTouchStart={onDown}
      onTouchMove={onMove}
    >
      <div
        className={autoRotate && !dragging.current ? "auto-rotate-3d" : ""}
        style={{
          width: pw, height: ph,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: autoRotate && !dragging.current ? undefined : `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging.current ? "none" : "transform 0.4s ease-out",
          margin: "0 auto",
        }}
      >
        {/* ═ FRONT COVER ═ */}
        <div style={{
          position: "absolute", width: pw, height: ph,
          transform: `translateZ(${pd / 2}px)`,
          borderRadius: "3px 6px 6px 3px",
          background: `linear-gradient(155deg, ${colors.accent}ee 0%, ${colors.light}cc 25%, ${colors.main}ee 70%, ${colors.dark}dd 100%)`,
          boxShadow: `
            inset 0 1px 0 ${colors.accent}60,
            inset -2px 0 4px ${colors.dark}20,
            0 0 0 0.5px ${colors.dark}40
          `,
          transition: springT,
          overflow: "hidden",
        }}>
          {/* Cover design elements */}
          <div style={{ padding: "15% 12%", display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
            {/* Title bar */}
            <div style={{ width: "70%", height: 4, background: `${colors.dark}30`, borderRadius: 2 }} />
            <div style={{ width: "50%", height: 3, background: `${colors.dark}20`, borderRadius: 2 }} />
            {/* Cover image area */}
            <div style={{
              flex: 1, marginTop: 8,
              background: `linear-gradient(135deg, ${colors.main}20, ${colors.light}15)`,
              borderRadius: 4,
              border: `1px solid ${colors.dark}12`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                color: colors.dark, fontSize: Math.max(9, pw * 0.07),
                fontWeight: 800, opacity: 0.35, letterSpacing: 0.5,
              }}>
                {w}×{h}
              </span>
            </div>
            {/* Bottom line */}
            <div style={{ width: "40%", height: 2, background: `${colors.dark}15`, borderRadius: 2 }} />
          </div>
          {/* Light sheen */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)",
            borderRadius: "3px 6px 0 0",
          }} />
        </div>

        {/* ═ BACK COVER ═ */}
        <div style={{
          position: "absolute", width: pw, height: ph,
          transform: `translateZ(${-pd / 2}px) rotateY(180deg)`,
          borderRadius: "6px 3px 3px 6px",
          background: `linear-gradient(170deg, ${colors.main}a0, ${colors.dark}c0)`,
          boxShadow: `inset 0 0 0 0.5px ${colors.dark}40`,
          transition: springT,
        }} />

        {/* ═ SPINE (left) ═ */}
        <div style={{
          position: "absolute", width: pd, height: ph,
          transform: `rotateY(-90deg) translateZ(${pw / 2}px)`,
          left: (pw - pd) / 2,
          borderRadius: "3px 0 0 3px",
          background: `linear-gradient(90deg, ${colors.dark}e0, ${colors.main}d0)`,
          boxShadow: `inset 1px 0 2px ${colors.light}20, inset -1px 0 0 ${colors.dark}50`,
          transition: springT,
        }}>
          {/* Spine ridges for books */}
          {isBook && pd > 10 && (
            <div style={{
              position: "absolute", inset: "15% 20%",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  height: 1, background: `${colors.light}30`, borderRadius: 1,
                }} />
              ))}
            </div>
          )}
        </div>

        {/* ═ RIGHT EDGE (pages) ═ */}
        <div style={{
          position: "absolute", width: pd, height: ph,
          transform: `rotateY(90deg) translateZ(${pw / 2}px)`,
          left: (pw - pd) / 2,
          borderRadius: "0 2px 2px 0",
          background: isBook
            ? `repeating-linear-gradient(180deg, ${colors.accent}d0 0px, ${colors.accent}d0 1px, ${colors.accent}90 1px, ${colors.accent}90 2px)`
            : `${colors.light}70`,
          boxShadow: `inset 0 0 0 0.5px ${colors.dark}20`,
          transition: springT,
        }} />

        {/* ═ TOP ═ */}
        <div style={{
          position: "absolute", width: pw, height: pd,
          transform: `rotateX(90deg) translateZ(${ph / 2}px)`,
          top: (ph - pd) / 2,
          borderRadius: 2,
          background: isBook
            ? `linear-gradient(90deg, ${colors.dark}80 0px, ${colors.dark}80 2px, ${colors.accent}c0 2px, ${colors.accent}c0 100%)`
            : `${colors.light}60`,
          boxShadow: `inset 0 0 0 0.5px ${colors.dark}20`,
          transition: springT,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent)",
            borderRadius: 2,
          }} />
        </div>

        {/* ═ BOTTOM ═ */}
        <div style={{
          position: "absolute", width: pw, height: pd,
          transform: `rotateX(-90deg) translateZ(${ph / 2}px)`,
          top: (ph - pd) / 2,
          borderRadius: 2,
          background: `${colors.dark}50`,
          transition: springT,
        }} />
      </div>

      {/* ═ GROUND SHADOW ═ */}
      <div style={{
        width: pw + 10,
        height: 20,
        margin: "14px auto 0",
        background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,0,0,0.12), transparent 70%)",
        filter: "blur(8px)",
        borderRadius: "50%",
        transition: springT,
      }} />

      {/* ═ REFLECTION ═ */}
      {showReflection && (
        <div style={{
          width: pw * 0.85,
          height: ph * 0.2,
          margin: "-6px auto 0",
          background: `linear-gradient(to bottom, ${colors.main}12, transparent)`,
          borderRadius: "0 0 4px 4px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)",
          transition: springT,
        }} />
      )}
    </div>
  );
}

/* ═══════════════════ SPARKLE PARTICLES ═══════════════════ */
function SparkleParticles({ color, radius }: { color: string; radius: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      size: 1.5 + Math.random() * 3,
      orbitR: radius * 0.5 + Math.random() * radius * 0.6,
      dur: 5 + Math.random() * 6,
      delay: Math.random() * -10,
      opacity: 0.25 + Math.random() * 0.45,
    })),
  [radius]);

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="sparkle-particle"
          style={{
            width: p.size, height: p.size,
            background: i % 4 === 0 ? color : i % 4 === 1 ? "#fff" : i % 4 === 2 ? color + "80" : "#e0e7ff",
            top: "50%", left: "50%",
            "--orbit-r": `${p.orbitR}px`,
            "--orbit-dur": `${p.dur}s`,
            "--orbit-delay": `${p.delay}s`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${color}50`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export default function Product3DPreview({
  spec,
  size = "md",
  autoRotate = true,
  showParticles = false,
  showReflection = true,
  interactive = true,
}: Props) {
  const dims = spec.dimensions;
  const colors = TYPE_COLORS[spec.product_type] || TYPE_COLORS.box;
  const maxScale = SIZE_SCALES[size];

  const is3D = useMemo(() => dims?.depth !== undefined && dims.depth > 0, [dims]);
  const isBook = useMemo(() =>
    ["book", "brochure", "poster", "namecard", "other"].includes(spec.product_type),
  [spec.product_type]);

  const productLabel = useMemo(() => {
    const types: Record<string, string> = {
      box: "กล่อง", tray: "Tray", sleeve: "Sleeve", label: "ฉลาก",
      bag: "ถุง", brochure: "โบรชัวร์", poster: "โปสเตอร์",
      book: "หนังสือ", namecard: "นามบัตร", envelope: "ซอง",
      packaging: "บรรจุภัณฑ์",
    };
    return types[spec.product_type] || spec.product_type;
  }, [spec.product_type]);

  const containerH = size === "lg" ? 360 : size === "md" ? 270 : 170;

  return (
    <div className="flex flex-col items-center relative select-none">
      {/* Preview */}
      <div className="relative flex items-center justify-center" style={{ height: containerH, width: "100%" }}>
        {showParticles && <SparkleParticles color={colors.main} radius={containerH * 0.38} />}

        {dims ? (
          is3D ? (
            <Box3D
              w={dims.width} h={dims.height} d={dims.depth!}
              colors={colors} scale={maxScale}
              autoRotate={autoRotate} interactive={interactive} showReflection={showReflection}
            />
          ) : (
            <BookPreview
              w={dims.width} h={dims.height}
              colors={colors} scale={maxScale}
              autoRotate={autoRotate} interactive={interactive}
              showReflection={showReflection} isBook={isBook}
            />
          )
        ) : (
          <div className="flex items-center justify-center" style={{ height: containerH }}>
            {(() => {
              const Icon = TYPE_ICONS[spec.product_type] || Box;
              return <Icon className="w-20 h-20" style={{ color: `${colors.main}40` }} />;
            })()}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center mt-2">
        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          {spec.product_name || productLabel}
        </p>
        {dims && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--color-text-dim)" }}>
            {dims.width} × {dims.height}{dims.depth ? ` × ${dims.depth}` : ""} {dims.unit}
          </p>
        )}
        {spec.paper && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>
            {spec.paper.code || spec.paper.type} {spec.paper.gsm}g
          </p>
        )}
      </div>
    </div>
  );
}
