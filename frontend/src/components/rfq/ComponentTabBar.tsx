"use client";

import { Plus, X, Copy } from "lucide-react";
import type { ComponentSpec } from "@/types";
import { TEMPLATE_TYPES } from "@/types";

interface Props {
  components: ComponentSpec[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
}

export default function ComponentTabBar({ components, activeIndex, onSelect, onAdd, onRemove, onDuplicate }: Props) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
      {components.map((comp, i) => {
        const isActive = i === activeIndex;
        const templateName = comp.template_type ? TEMPLATE_TYPES[comp.template_type as keyof typeof TEMPLATE_TYPES] : null;

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
              isActive ? "" : "hover:opacity-80"
            }`}
            style={{
              background: isActive ? "var(--color-bg)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-text-sub)",
              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
            }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: isActive ? "var(--color-primary)" : "var(--color-text-dim)" }}>
              {i + 1}
            </span>
            <span>{comp.component_name || `ชิ้นงาน ${i + 1}`}</span>
            {templateName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-bg-hover)", color: "var(--color-text-dim)" }}>
                {templateName}
              </span>
            )}

            {/* Actions on hover */}
            {components.length > 1 && (
              <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                <span
                  onClick={(e) => { e.stopPropagation(); onDuplicate(i); }}
                  className="p-0.5 rounded cursor-pointer"
                  style={{ }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary-light)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  title="ทำซ้ำ"
                >
                  <Copy className="w-3 h-3" />
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                  className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer text-red-500"
                  title="ลบ"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            )}
          </button>
        );
      })}

      {/* Add button */}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{ color: "var(--color-text-dim)" }}
      >
        <Plus className="w-3.5 h-3.5" />
        เพิ่มชิ้นงาน
      </button>
    </div>
  );
}
