"use client";

import { useState } from "react";
import { Plus, X, Palette } from "lucide-react";
import type { PrintColorDetail, SpecialInk, ColorLimitLevel } from "@/types";

interface Props {
  label: string;
  value: PrintColorDetail | "no_print";
  onChange: (val: PrintColorDetail | "no_print") => void;
  showNoPrint?: boolean;
}

const COLOR_LIMITS: { key: ColorLimitLevel; label: string; desc: string; color: string }[] = [
  { key: "light", label: "Light", desc: "สีอ่อน หมึกน้อย", color: "#93c5fd" },
  { key: "standard", label: "Standard", desc: "CMYK มาตรฐาน", color: "#7c3aed" },
  { key: "dark", label: "Dark", desc: "สีเข้ม หมึกหนัก", color: "#312e81" },
];

const defaultPrint: PrintColorDetail = {
  print_type: "offset",
  colors: "cmyk",
  color_count: 4,
  color_limit: "standard",
  special_inks: [],
};

export default function PrintColorSection({ label, value, onChange, showNoPrint = false }: Props) {
  const isNoPrint = value === "no_print";
  const detail: PrintColorDetail = isNoPrint ? defaultPrint : value;

  const update = (patch: Partial<PrintColorDetail>) => {
    if (isNoPrint) return;
    onChange({ ...detail, ...patch });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-sub)" }}>
          <Palette className="w-4 h-4" /> {label}
        </label>
        {showNoPrint && (
          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--color-text-dim)" }}>
            <input
              type="checkbox"
              checked={isNoPrint}
              onChange={(e) => onChange(e.target.checked ? "no_print" : defaultPrint)}
              className="rounded"
            />
            ไม่พิมพ์
          </label>
        )}
      </div>

      {!isNoPrint && (
        <div className="space-y-3 pl-1">
          {/* Print Type + Colors */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-dim)" }}>วิธีพิมพ์</label>
              <select
                value={detail.print_type}
                onChange={(e) => update({ print_type: e.target.value as PrintColorDetail["print_type"] })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                <option value="offset">Offset</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-dim)" }}>ระบบสี</label>
              <select
                value={detail.colors}
                onChange={(e) => {
                  const colors = e.target.value as PrintColorDetail["colors"];
                  const count = colors === "cmyk" ? 4 : colors === "none" ? 0 : detail.color_count;
                  update({ colors, color_count: count });
                }}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                <option value="cmyk">CMYK (4 สี)</option>
                <option value="special">Special Ink</option>
                <option value="mixed">Mixed (CMYK + Special)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-dim)" }}>จำนวนสี</label>
              <input
                type="number"
                min={0}
                max={12}
                value={detail.color_count}
                onChange={(e) => update({ color_count: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>

          {/* Color Limit */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>Color Limit (ระดับความเข้มสี)</label>
            <div className="flex gap-2">
              {COLOR_LIMITS.map((cl) => (
                <button
                  key={cl.key}
                  type="button"
                  onClick={() => update({ color_limit: cl.key })}
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all"
                  style={{
                    background: "var(--color-bg-sub)",
                    borderColor: detail.color_limit === cl.key ? "var(--color-primary)" : "transparent",
                    boxShadow: detail.color_limit === cl.key ? "0 0 0 1px var(--color-primary-border)" : "none",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ background: cl.color }}
                  />
                  <div className="text-left">
                    <div className="font-semibold" style={{ color: detail.color_limit === cl.key ? "var(--color-primary)" : "var(--color-text)" }}>
                      {cl.label}
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-text-dim)" }}>{cl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Special Inks */}
          {(detail.colors === "special" || detail.colors === "mixed") && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>Special Inks (หมึกพิเศษ)</label>
              <div className="space-y-2">
                {(detail.special_inks || []).map((ink, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      value={ink.name}
                      onChange={(e) => {
                        const inks = [...(detail.special_inks || [])];
                        inks[idx] = { ...inks[idx], name: e.target.value };
                        update({ special_inks: inks });
                      }}
                      placeholder="เช่น Pantone 186 C"
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                    />
                    <select
                      value={ink.ink_type}
                      onChange={(e) => {
                        const inks = [...(detail.special_inks || [])];
                        inks[idx] = { ...inks[idx], ink_type: e.target.value as SpecialInk["ink_type"] };
                        update({ special_inks: inks });
                      }}
                      className="px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                    >
                      <option value="pantone">Pantone</option>
                      <option value="metallic">Metallic</option>
                      <option value="fluorescent">Fluorescent</option>
                      <option value="white">White</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const inks = detail.special_inks.filter((_, j) => j !== idx);
                        update({ special_inks: inks });
                      }}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => update({ special_inks: [...(detail.special_inks || []), { name: "", ink_type: "pantone" }] })}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่ม Special Ink
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
