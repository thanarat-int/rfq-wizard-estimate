"use client";

import { TEMPLATE_TYPES, TEMPLATE_TYPES_TH } from "@/types";

interface Props {
  value: number | null | undefined;
  onChange: (val: number) => void;
}

const TEMPLATE_ICONS: Record<number, string> = {
  1: "📦", 2: "📦", 3: "🔒", 4: "⚡",
  5: "🍽️", 6: "🖼️", 7: "📐", 8: "🛍️",
  9: "📃", 10: "🎁", 11: "✉️", 12: "⚙️",
};

export default function TemplateTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-text-sub)" }}>
        Template Type (แบบกล่อง)
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {Object.entries(TEMPLATE_TYPES).map(([key, name]) => {
          const num = Number(key);
          const isActive = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[11px] transition-all border"
              style={{
                background: isActive ? "var(--color-primary-light)" : "var(--color-bg-sub)",
                color: isActive ? "var(--color-primary)" : "var(--color-text-sub)",
                borderColor: isActive ? "var(--color-primary)" : "transparent",
                boxShadow: isActive ? "0 0 0 1px var(--color-primary-border)" : "none",
              }}
            >
              <span className="text-base">{TEMPLATE_ICONS[num]}</span>
              <span className="font-medium leading-tight text-center">{name}</span>
              <span className="text-[9px] leading-tight text-center" style={{ color: "var(--color-text-dim)" }}>
                {TEMPLATE_TYPES_TH[num]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
