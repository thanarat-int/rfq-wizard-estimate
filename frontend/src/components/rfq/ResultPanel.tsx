"use client";

import { FileDown, Sparkles } from "lucide-react";
import type { ParsedSpec, CalculationResult } from "@/types";

interface Props {
  result: CalculationResult;
  spec: ParsedSpec | null;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {children}
    </div>
  );
}

export default function ResultPanel({ result, spec }: Props) {
  const fmt = (n?: number) => n?.toLocaleString("th-TH", { minimumFractionDigits: 2 }) ?? "0.00";

  return (
    <Panel className="p-5 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-dim)" }}>
          ผลการคำนวณ
        </p>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-1 text-[13px]">
        {([
          ["ค่ากระดาษ", result.paper_cost],
          ["ค่าแม่พิมพ์", result.plate_cost],
          ["ค่าหมึก", result.ink_cost],
          ["ค่าพิมพ์", result.print_cost],
          ["ค่า Finishing", result.finishing_cost],
        ] as [string, number][]).map(([label, val]) => (
          <div key={label} className="flex justify-between py-1">
            <span style={{ color: "var(--color-text-dim)" }}>{label}</span>
            <span className="tabular-nums font-medium" style={{ color: "var(--color-text)" }}>{fmt(val)} ฿</span>
          </div>
        ))}
      </div>

      <div className="my-3 h-px" style={{ background: "var(--color-border)" }} />

      {/* Breakdown details */}
      {!!result.breakdown?.paper && (
        <div className="mb-3 text-[11px] space-y-0.5" style={{ color: "var(--color-text-dim)" }}>
          <p>กระดาษ: {String((result.breakdown.paper as Record<string, unknown>).paper_name ?? "")}</p>
          {!!result.breakdown.machine && (
            <p>เครื่อง: {String((result.breakdown.machine as Record<string, unknown>).machine_name ?? "")}</p>
          )}
          <p>Ups/แผ่น: {String((result.breakdown.paper as Record<string, unknown>).ups ?? "")} | แผ่นสุทธิ: {String((result.breakdown.paper as Record<string, unknown>).paper_net ?? "")}</p>
        </div>
      )}

      {/* Total */}
      <div className="p-4 rounded-lg" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>ราคารวม</span>
          <span className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{fmt(result.total_cost)} ฿</span>
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>
          <span>ราคาต่อชิ้น</span>
          <span className="tabular-nums">{fmt(result.unit_cost)} ฿</span>
        </div>
        {spec && (
          <div className="flex justify-between text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>
            <span>จำนวน</span>
            <span className="tabular-nums">{spec.quantity?.toLocaleString()} ชิ้น</span>
          </div>
        )}
      </div>

      {/* Export button */}
      <button
        className="w-full mt-3 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
      >
        <FileDown className="w-4 h-4" /> สร้างใบเสนอราคา
      </button>
    </Panel>
  );
}
