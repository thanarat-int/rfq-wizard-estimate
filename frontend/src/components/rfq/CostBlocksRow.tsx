"use client";

import type { ProjectCalcResult } from "@/types";

interface Props {
  result: ProjectCalcResult;
}

const BLOCKS = [
  { key: "materials_total", label: "Materials", sub: "กระดาษ+เพลท", color: "#3b82f6" },
  { key: "print_total", label: "Print", sub: "เครื่อง+หมึก", color: "#8b5cf6" },
  { key: "after_press_total", label: "After Press", sub: "ตกแต่ง", color: "#f59e0b" },
  { key: "packing_total", label: "Packing", sub: "บรรจุ", color: "#10b981" },
  { key: "logistics_total", label: "Logistics", sub: "จัดส่ง", color: "#06b6d4" },
] as const;

export default function CostBlocksRow({ result }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {BLOCKS.map((block) => {
        const val = (result[block.key] as number) ?? 0;
        return (
          <div
            key={block.key}
            className="rounded-2xl p-5 text-center transition-all hover:scale-[1.02]"
            style={{
              background: `${block.color}08`,
              border: `1px solid ${block.color}20`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: `${block.color}15` }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: block.color }} />
            </div>
            <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: block.color }}>
              {block.label}
            </div>
            <div className="text-xs mb-2" style={{ color: "var(--color-text-dim)" }}>
              {block.sub}
            </div>
            <div className="text-lg font-black font-mono" style={{ color: "var(--color-text)" }}>
              {val.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
