"use client";

import { Package } from "lucide-react";
import { TEMPLATE_TYPES } from "@/types";
import type { ComponentCostResult } from "@/types";

interface Props {
  result: ComponentCostResult;
}

const COST_ROWS = [
  { key: "materials", label: "Materials (กระดาษ+เพลท)", color: "#3b82f6" },
  { key: "print_press", label: "Print (พิมพ์+หมึก)", color: "#8b5cf6" },
  { key: "after_press", label: "After Press", color: "#f59e0b" },
  { key: "packing", label: "Packing", color: "#10b981" },
] as const;

export default function ComponentCostCard({ result }: Props) {
  const { cost } = result;
  const templateName = result.template_type
    ? TEMPLATE_TYPES[result.template_type as keyof typeof TEMPLATE_TYPES]
    : null;

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4" style={{ color: "#6366f1" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {result.component_name}
        </span>
        {templateName && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
            {templateName}
          </span>
        )}
      </div>

      {cost.error ? (
        <p className="text-xs text-amber-600">{cost.error}</p>
      ) : (
        <>
          {/* Cost rows */}
          <div className="space-y-1.5">
            {COST_ROWS.map((row) => {
              const val = cost[row.key] as number;
              return (
                <div key={row.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                    <span style={{ color: "var(--color-text-sub)" }}>{row.label}</span>
                  </div>
                  <span className="font-mono font-medium" style={{ color: "var(--color-text)" }}>
                    {val.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Subtotal */}
          <div className="pt-2 flex items-center justify-between" style={{ borderTop: "1px solid var(--color-border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-sub)" }}>รวม</span>
            <span className="text-sm font-bold" style={{ color: "#6366f1" }}>
              {cost.subtotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
            </span>
          </div>
          <div className="text-[10px] text-right" style={{ color: "var(--color-text-dim)" }}>
            ต่อชิ้น: {cost.unit_cost.toLocaleString("th-TH", { minimumFractionDigits: 4 })} ฿
          </div>
        </>
      )}
    </div>
  );
}
