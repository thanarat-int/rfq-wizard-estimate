"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileDown, Pencil, Sparkles, TrendingUp, ChevronRight, FileText, Layers, Info, BookOpen, Calculator } from "lucide-react";
import CostBlocksRow from "@/components/rfq/CostBlocksRow";
import QuotationModal from "@/components/rfq/QuotationModal";
import { useAppStore } from "@/lib/store";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { TEMPLATE_TYPES } from "@/types";
import type { ComponentCostResult } from "@/types";

const fmt = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
const fmtN = (n: number, d = 2) => n.toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });

/* ─── Component Cost Card (2-col layout) ─── */
function ComponentCostCard({ result }: { result: ComponentCostResult }) {
  const { cost } = result;
  const templateName = result.template_type
    ? TEMPLATE_TYPES[result.template_type as keyof typeof TEMPLATE_TYPES] : null;

  const ROWS = [
    { key: "materials", label: "Materials", sub: "กระดาษ+เพลท", color: "#3b82f6" },
    { key: "print_press", label: "Print", sub: "พิมพ์+หมึก", color: "#8b5cf6" },
    { key: "after_press", label: "After Press", sub: "ตกแต่ง", color: "#f59e0b" },
    { key: "packing", label: "Packing", sub: "แพ็ค", color: "#10b981" },
    { key: "logistics", label: "Logistics", sub: "จัดส่ง", color: "#06b6d4" },
  ] as const;

  const total = cost.subtotal || 1;
  const bd = cost.breakdown as Record<string, Record<string, unknown>> | undefined;
  const machineName = bd?.machine?.machine_name as string || "-";
  const paperName = bd?.paper?.paper_name as string || "-";
  const ups = bd?.paper?.ups as number || 0;
  const paperNet = bd?.paper?.paper_net as number || 0;

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-dark)" }}>
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base" style={{ color: "var(--color-text)" }}>{result.component_name}</p>
          {templateName && <p className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>{templateName}</p>}
        </div>
      </div>

      {cost.error ? (
        <p className="text-sm text-amber-600 font-medium">{cost.error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
          {/* Left: Cost rows */}
          <div className="space-y-4">
            <div className="space-y-2">
              {ROWS.map((row) => {
                const val = (cost[row.key] as number) ?? 0;
                const pct = total > 0 ? (val / total) * 100 : 0;
                return (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{row.label}</span>
                        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>{row.sub}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: "var(--color-text-dim)" }}>{pct.toFixed(0)}%</span>
                        <span className="font-mono font-bold text-sm" style={{ color: "var(--color-text)" }}>
                          {fmtN(val)}
                        </span>
                      </div>
                    </div>
                    {/* Proportion bar */}
                    <div className="h-1.5 rounded-full overflow-hidden ml-5" style={{ background: "var(--color-bg-hover)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pct, 1)}%`, background: row.color, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-3 space-y-1" style={{ borderTop: "2px solid var(--color-border)" }}>
              <div className="flex justify-between">
                <span className="text-sm font-bold" style={{ color: "var(--color-text-sub)" }}>รวม</span>
                <span className="text-lg font-black" style={{ color: "var(--color-primary)" }}>{fmt(cost.subtotal)} ฿</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>ต่อชิ้น</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--color-text-sub)" }}>{cost.unit_cost.toFixed(4)} ฿</span>
              </div>
            </div>
          </div>

          {/* Right: Quick stats */}
          <div className="hidden md:flex flex-col gap-3 min-w-[160px] pl-5" style={{ borderLeft: "1px solid var(--color-border)" }}>
            <QuickStat label="เครื่องพิมพ์" value={machineName} />
            <QuickStat label="กระดาษ" value={paperName} />
            <QuickStat label="จำนวนพิมพ์" value={`${paperNet.toLocaleString()} แผ่น`} />
            <QuickStat label="Ups" value={`${ups} ชิ้น/แผ่น`} />
            <QuickStat label="จำนวนสั่ง" value={`${result.quantity?.toLocaleString()} ชิ้น`} />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "var(--color-text-dim)" }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-text)" }}>{value}</p>
    </div>
  );
}

/* ─── Breakdown with inline refs ─── */
function BreakdownCard({ result }: { result: ComponentCostResult }) {
  const [expanded, setExpanded] = useState(false);
  const bd = result.cost.breakdown as Record<string, Record<string, unknown>> | undefined;
  if (!bd) return null;

  const paper = bd.paper as Record<string, unknown> | undefined;
  const machine = bd.machine as Record<string, unknown> | undefined;
  const plate = bd.plate as Record<string, unknown> | undefined;
  const ink = bd.ink as Record<string, unknown> | undefined;
  const finishing = bd.finishing as Record<string, unknown> | undefined;
  const greyboard = bd.greyboard as Record<string, unknown> | undefined;
  const logistics = bd.logistics as Record<string, unknown> | undefined;
  const qty = result.quantity || 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:opacity-80 transition-all">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>วิธีคิดราคา — {result.component_name}</span>
        </div>
        <ChevronRight className="w-5 h-5 transition-transform"
          style={{ color: "var(--color-text-dim)", transform: expanded ? "rotate(90deg)" : "none" }} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 text-sm" style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* ─── Paper ─── */}
          {paper && (
            <Section color="#3b82f6" title="Materials — กระดาษ"
              source="Deep Estimate" sourceFile="Paper Price (MI2).xlsx">
              <Row label="กระดาษ" value={`${paper.paper_name} ${paper.gsm}g`}
                desc={`ดึงจากฐานข้อมูล Paper Price (MI2).xlsx ราคา ${paper.price_per_kg ? fmtN(paper.price_per_kg as number) + ' THB/kg' : '-'}`} />
              <Row label="แผ่นวัตถุดิบ" value={`${paper.sheet_size_mm} mm`}
                desc="ขนาดกระดาษมาตรฐาน full sheet (ถ้าไม่ระบุ ใช้ 790×1090)" />
              <Row label="Lay Size" value={`${paper.lay_size_mm} mm`}
                desc="สูตร: (ชิ้นงาน_กว้าง + color bar 8mm + gripper 12mm) × (ชิ้นงาน_สูง + ขอบ 4mm × 2)" />
              <Row label="ups/แผ่น" value={`${paper.ups}`}
                desc={`จำนวนชิ้นต่อแผ่น = floor(กระดาษ_กว้าง ÷ lay_กว้าง) × floor(กระดาษ_สูง ÷ lay_สูง)`} />
              <Row label="Split" value={`${paper.split}`}
                desc="= ups (จำนวนชิ้นที่ตัดได้จากกระดาษ 1 แผ่น)" />
              <Row label="หลัง ups" value={`${paper.after_ups}`}
                desc={`= ceil(จำนวนสั่ง ${qty.toLocaleString()} ÷ ups ${paper.ups}) = ${paper.after_ups} แผ่น`} />
              <Row label="Waste" value={`+${paper.waste_sheets} แผ่น`}
                desc="จาก WasteTable (สูตร Estimate บริษัท) — คำนวณตามจำนวน + ประเภทงาน + finishing" />
              <Row label="กระดาษจริง" value={`${paper.paper_qty} แผ่น`}
                desc={`= ceil((หลัง ups ${paper.after_ups} + waste ${paper.waste_sheets}) ÷ split ${paper.split})`} />
              <Row label="สุทธิ (ปัดร้อย)" value={`${paper.paper_net} แผ่น`} bold
                desc={`ปัดขึ้นเป็นหลักร้อย (สั่งกระดาษเป็นรีม) = roundup100(${paper.paper_qty}) = ${paper.paper_net}`} />
              <Row label="ค่ากระดาษ" value={`${fmtN(paper.paper_cost as number)} ฿`} bold
                desc={`${paper.cost_mode === 'B (per sheet)' ? `= ${paper.paper_net} แผ่น × ราคา/แผ่น` : `น้ำหนัก = ${paper.paper_net}×${paper.gsm}g×กว้าง(นิ้ว)×สูง(นิ้ว) ÷ 1,550,000 → × ${paper.price_per_kg ? fmtN(paper.price_per_kg as number) : '-'} THB/kg`}`} />
            </Section>
          )}

          {/* ─── Machine ─── */}
          {machine && (
            <Section color="#8b5cf6" title="Print — เครื่องพิมพ์"
              source="Deep Estimate" sourceFile="all spec machine.xls">
              <Row label="เครื่อง" value={`${machine.machine_name}`}
                desc="เลือกอัตโนมัติ: เครื่องเร็วสุดที่รับกระดาษขนาดนี้ได้ + รองรับจำนวนสีที่ต้องการ" />
              <Row label="ความเร็ว" value={`${(machine.speed_per_hr as number)?.toLocaleString()} แผ่น/ชม.`}
                desc="ข้อมูลจาก all spec machine.xls (sheet: Sheet/Web/Digital)" />
              <Row label="ค่าเครื่อง/ชม." value={`${fmtN(machine.cost_per_hr as number)} ฿`}
                desc="BHR (Budgeted Hourly Rate) คงที่ 2,500 THB/hr ทุกเครื่อง — นโยบายบริษัท" />
              <Row label="Passes" value={`${machine.passes}`}
                desc={`= 1 (หน้า)${(machine.passes as number) > 1 ? ' + 1 (หลัง) = พิมพ์ 2 ด้าน' : ' — พิมพ์ด้านเดียว'}`} />
              <Row label="Impressions" value={`${(machine.total_impressions as number)?.toLocaleString()}`}
                desc={`= กระดาษสุทธิ ${paper?.paper_net || '-'} × passes ${machine.passes}`} />
              <Row label="ชั่วโมงพิมพ์" value={`${fmtN(machine.print_hours as number)} ชม.`}
                desc={`= impressions ${(machine.total_impressions as number)?.toLocaleString()} ÷ ความเร็ว ${(machine.speed_per_hr as number)?.toLocaleString()}`} />
              <Row label="Setup" value={`${fmtN(machine.setup_cost as number)} ฿`}
                desc="ค่าตั้งเครื่อง (เตรียมหมึก ปรับเพลท ลงกระดาษ)" />
              <Row label="ค่าพิมพ์รวม" value={`${fmtN(machine.print_cost as number)} ฿`} bold
                desc={`= (ชม.พิมพ์ × BHR 2,500) + setup ${fmtN(machine.setup_cost as number)}`} />
            </Section>
          )}

          {/* ─── Plate ─── */}
          {plate && (
            <Section color="#3b82f6" title="Materials — เพลท"
              source="Kodak/Fujifilm Thailand 2024">
              <Row label="งานซ้ำ?" value={plate.is_repeat_job ? "ใช่ (ไม่คิดเพลท)" : "ไม่ (ทำเพลทใหม่)"}
                desc="ถ้าเป็นงานซ้ำ ใช้เพลทเดิม ไม่คิดค่าทำเพลท" />
              {plate.total_plates != null && (
                <Row label="จำนวนเพลท" value={`${plate.total_plates} เพลท`}
                  desc={`= สีหน้า + สีหลัง`} />
              )}
              {plate.price_per_plate != null && (
                <Row label="ราคา/เพลท" value={`${fmtN(plate.price_per_plate as number)} ฿`}
                  desc={`CTP Plate ขนาด ${(paper && ((paper.sheet_size_mm as string)?.includes('1090') || (paper.sheet_size_mm as string)?.includes('900'))) ? 'B1 (~1030×800mm)' : 'B2 (~650×550mm)'} — Kodak Sonora / Fujifilm Brillia`} />
              )}
              <Row label="ค่าเพลท" value={`${fmtN(plate.plate_cost as number)} ฿`} bold
                desc={plate.is_repeat_job ? "งานซ้ำ — ไม่คิดค่าเพลท" : `= ${plate.total_plates || '-'} เพลท × ${plate.price_per_plate ? fmtN(plate.price_per_plate as number) : '-'} THB`} />
            </Section>
          )}

          {/* ─── Greyboard (Board Book) ─── */}
          {greyboard && (
            <Section color="#3b82f6" title="Materials — Greyboard"
              source={(greyboard.ref as Record<string, string>)?.source}>
              <Row label="จำนวนแผ่น/เล่ม" value={`${greyboard.boards_per_book} แผ่น`}
                desc="แต่ละ spread ใช้ greyboard 1 แผ่น (1.5mm)" />
              <Row label="ราคา/แผ่น" value={`${fmtN(greyboard.price_per_sheet as number)} ฿`}
                desc="Greyboard 1.5mm ขนาด ~A3 — ราคาซัพพลายเออร์ไทย 2024" />
              <Row label="ค่า Greyboard" value={`${fmtN(greyboard.cost as number)} ฿`} bold
                desc={`= ${qty.toLocaleString()} เล่ม × ${greyboard.boards_per_book} แผ่น × ${fmtN(greyboard.price_per_sheet as number)} THB`} />
            </Section>
          )}

          {/* ─── Ink ─── */}
          {ink && (
            <Section color="#8b5cf6" title="Print — หมึก"
              source="Hubergroup/DIC Thailand 2024">
              <Row label="ปริมาณหมึก" value={`${(ink.total_ink_kg as number)?.toFixed(3)} kg`}
                desc={`สูตร: พื้นที่กระดาษ(sqm) × จำนวนแผ่น × จำนวนสี × ink coverage 30% ÷ ${ink.ink_coverage_sqm_per_kg || 35} sqm/kg`} />
              <Row label="ราคาหมึก/kg" value={`${fmtN(ink.ink_price_per_kg as number)} ฿`}
                desc="CMYK Offset Standard — Hubergroup Rapida/DIC Thailand price list 2024 (ตลาด 380-420 THB/kg)" />
              <Row label="ค่าหมึกรวม" value={`${fmtN(ink.ink_cost as number)} ฿`} bold
                desc={`= ${(ink.total_ink_kg as number)?.toFixed(3)} kg × ${fmtN(ink.ink_price_per_kg as number)} THB/kg`} />
            </Section>
          )}

          {/* ─── Finishing ─── */}
          {finishing && (
            <Section color="#f59e0b" title="After Press — Finishing"
              source="TPIA / Thai subcontractors 2024-2025">
              {Array.isArray(finishing.details) && finishing.details.map((d: Record<string, unknown>, i: number) => (
                <Row key={i} label={d.name as string} value={`${fmtN(d.cost as number)} ฿`}
                  desc={`${d.price_per_unit ? `ราคา ${d.price_per_unit} THB/${d.unit || 'unit'}` : ''} — ราคาเฉลี่ยจากผู้รับเหมา 4-5 ราย`} />
              ))}
              <Row label="รวม Finishing" value={`${fmtN(finishing.finishing_cost as number)} ฿`} bold />
            </Section>
          )}

          {/* ─── Logistics ─── */}
          {logistics && (
            <Section color="#06b6d4" title="Logistics — ค่าจัดส่ง"
              source="อัตราค่าขนส่งงานพิมพ์ เขตกรุงเทพฯ–ปริมณฑล 2024">
              {Array.isArray(logistics.details) && (logistics.details as Record<string, unknown>[]).map((d, i) => (
                <Row key={i} label={d.name as string} value={`${fmtN(d.cost as number)} ฿`}
                  desc={(d.ref as Record<string, string>)?.note} />
              ))}
              <Row label="รวมค่าจัดส่ง" value={`${fmtN(logistics.logistics_cost as number)} ฿`} bold />
            </Section>
          )}

          {/* ─── Total ─── */}
          <div className="pt-3 space-y-1.5" style={{ borderTop: "2px solid var(--color-border)" }}>
            <div className="flex justify-between font-bold text-base" style={{ color: "var(--color-text)" }}>
              <span>รวมต้นทุน</span>
              <span style={{ color: "var(--color-primary)" }}>{fmt(result.cost.subtotal)} ฿</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--color-text-dim)" }}>
              <span>จำนวน {result.quantity?.toLocaleString()} ชิ้น</span>
              <span className="font-bold">ต่อชิ้น {result.cost.unit_cost.toFixed(4)} ฿</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ color, title, children, source, sourceFile }: {
  color: string; title: string; children: React.ReactNode;
  source?: string; sourceFile?: string;
}) {
  return (
    <div className="pt-4 space-y-2 first:pt-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-bold flex items-center gap-2" style={{ color }}>
          <span className="w-3 h-3 rounded-full" style={{ background: color }} /> {title}
        </div>
        {source && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
            style={{ background: "var(--color-bg-hover)", color: "var(--color-text-dim)" }}>
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium">{source}</span>
            {sourceFile && <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-bg)" }}>{sourceFile}</span>}
          </div>
        )}
      </div>
      <div className="pl-5 space-y-0.5" style={{ color: "var(--color-text-sub)" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, bold, desc }: { label: string; value: string; bold?: boolean; desc?: string }) {
  return (
    <div className="py-1.5">
      <div className={`flex justify-between text-sm ${bold ? "font-bold" : ""}`}>
        <span>{label}</span>
        <span className="font-mono" style={bold ? { color: "var(--color-text)" } : undefined}>{value}</span>
      </div>
      {desc && (
        <p className="text-xs leading-relaxed mt-1 pl-0.5 flex items-start gap-1.5" style={{ color: "var(--color-text-dim)" }}>
          <Calculator className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{desc}</span>
        </p>
      )}
    </div>
  );
}

/* ─── Confetti ─── */
function ConfettiBurst() {
  const particles = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const distance = 40 + Math.random() * 60;
      const tx = Math.cos((angle * Math.PI) / 180) * distance;
      const ty = Math.sin((angle * Math.PI) / 180) * distance - 20;
      const colors = ["#28bee3", "#f59e0b", "#10b981", "#3b82f6", "#f43f5e", "#8b5cf6"];
      return { tx, ty, color: colors[i % colors.length], size: 4 + Math.random() * 4, delay: Math.random() * 0.3 };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: "50%", top: "50%", width: p.size, height: p.size, background: p.color,
          "--tx": `${p.tx}px`, "--ty": `${p.ty}px`,
          animation: `confettiBurst 0.8s ${p.delay}s cubic-bezier(0.16, 1, 0.3, 1) forwards`, opacity: 0,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

/* ─── Markup/Markdown Adjuster ─── */
function PriceAdjuster({ baseCost, quantity, mode, pct, setMode, setPct }: {
  baseCost: number; quantity: number;
  mode: "markup" | "markdown"; pct: number;
  setMode: (m: "markup" | "markdown") => void; setPct: (p: number) => void;
}) {

  const adjusted = mode === "markup"
    ? baseCost * (1 + pct / 100)
    : baseCost * (1 - pct / 100);
  const unitPrice = quantity > 0 ? adjusted / quantity : 0;
  const diff = adjusted - baseCost;

  if (pct === 0) return (
    <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>ปรับราคาขาย</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>เพิ่ม Markup หรือลด Markdown จากต้นทุน</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            <button
              onClick={() => setMode("markup")}
              className="px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: mode === "markup" ? "var(--color-primary)" : "transparent",
                color: mode === "markup" ? "#fff" : "var(--color-text-dim)",
              }}
            >Markup</button>
            <button
              onClick={() => setMode("markdown")}
              className="px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: mode === "markdown" ? "#f59e0b" : "transparent",
                color: mode === "markdown" ? "#fff" : "var(--color-text-dim)",
              }}
            >Markdown</button>
          </div>
          <input
            type="number" min={0} max={100} step={1}
            value={pct || ""}
            placeholder="0"
            onChange={(e) => setPct(Math.max(0, Math.min(100, +e.target.value || 0)))}
            className="w-16 text-center text-sm font-bold rounded-lg py-1.5"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          <span className="text-sm font-bold" style={{ color: "var(--color-text-dim)" }}>%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{
      background: mode === "markup" ? "rgba(99,102,241,0.04)" : "rgba(245,158,11,0.04)",
      border: `1px solid ${mode === "markup" ? "var(--color-primary)" : "#f59e0b"}`,
    }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>ปรับราคาขาย</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>เพิ่ม Markup หรือลด Markdown จากต้นทุน</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            <button
              onClick={() => setMode("markup")}
              className="px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: mode === "markup" ? "var(--color-primary)" : "transparent",
                color: mode === "markup" ? "#fff" : "var(--color-text-dim)",
              }}
            >Markup</button>
            <button
              onClick={() => setMode("markdown")}
              className="px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: mode === "markdown" ? "#f59e0b" : "transparent",
                color: mode === "markdown" ? "#fff" : "var(--color-text-dim)",
              }}
            >Markdown</button>
          </div>
          <input
            type="number" min={0} max={100} step={1}
            value={pct || ""}
            placeholder="0"
            onChange={(e) => setPct(Math.max(0, Math.min(100, +e.target.value || 0)))}
            className="w-16 text-center text-sm font-bold rounded-lg py-1.5"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          <span className="text-sm font-bold" style={{ color: "var(--color-text-dim)" }}>%</span>
        </div>
      </div>

      <div className="flex items-end justify-between pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-text-sub)" }}>
            <span>ต้นทุน</span>
            <span className="font-mono font-bold">{fmt(baseCost)} ฿</span>
          </div>
          <div className="flex items-center gap-3 text-sm" style={{ color: mode === "markup" ? "var(--color-primary)" : "#f59e0b" }}>
            <span>{mode === "markup" ? "+" : "-"}{pct}%</span>
            <span className="font-mono font-bold">{mode === "markup" ? "+" : "-"}{fmt(Math.abs(diff))} ฿</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>ราคาขาย</p>
          <p className="text-2xl font-black font-mono" style={{ color: mode === "markup" ? "var(--color-primary)" : "#f59e0b" }}>
            {fmt(adjusted)} <span className="text-sm">฿</span>
          </p>
          <p className="text-xs font-bold font-mono" style={{ color: "var(--color-text-dim)" }}>
            ต่อชิ้น {unitPrice.toFixed(4)} ฿
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function ResultsView() {
  const { project, projectCalcResult, setView } = useAppStore();
  if (!projectCalcResult || !project) return null;

  const totalAnimated = useCountUp(projectCalcResult.grand_total, 1200, 800);
  const unitAnimated = useCountUp(projectCalcResult.unit_cost, 1000, 1000);

  const [sellMode, setSellMode] = useState<"markup" | "markdown">("markup");
  const [sellPct, setSellPct] = useState(0);
  const [showQuote, setShowQuote] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 md:px-8 py-8">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setView("spec")}
        className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ color: "var(--color-text-dim)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-dim)"; e.currentTarget.style.background = "transparent"; }}
      >
        <ArrowLeft className="w-4 h-4" /> แก้ไข Spec
      </motion.button>

      <div className="max-w-5xl mx-auto">
        {/* Grand Total Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="rounded-3xl p-10 relative overflow-hidden mb-8 text-center"
          style={{
            background: "var(--color-dark)",
            border: "1px solid var(--color-dark-hover)",
          }}
        >
          <ConfettiBurst />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <Sparkles className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              <span className="text-base font-bold text-white/70">ราคารวมทั้งโปรเจ็กต์</span>
            </div>

            <div className="dramatic-reveal flex items-baseline justify-center">
              <p
                className="text-5xl md:text-7xl font-black tabular-nums"
                style={{
                  backgroundImage: "linear-gradient(180deg, #ffffff 0%, #dcd3ff 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 6px 34px rgba(167,139,250,0.55))",
                }}
              >
                {fmt(totalAnimated)}
              </p>
              <span className="text-2xl md:text-3xl ml-2 font-black" style={{ color: "rgba(255,255,255,0.55)" }}>
                ฿
              </span>
            </div>

            <div className="mt-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-white/50">ต่อชุด</p>
                <p className="text-xl font-black tabular-nums text-white">{fmt(unitAnimated)} ฿</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-sm text-white/50">จำนวน</p>
                <p className="text-xl font-black tabular-nums text-white">{projectCalcResult.quantity?.toLocaleString()} ชุด</p>
              </div>
              {project.components.length > 1 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center">
                    <p className="text-sm text-white/50">ชิ้นงาน</p>
                    <p className="text-xl font-black text-white">{project.components.length} ชิ้น</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Markup / Markdown Adjuster */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <PriceAdjuster
            baseCost={projectCalcResult.grand_total}
            quantity={projectCalcResult.quantity}
            mode={sellMode}
            pct={sellPct}
            setMode={setSellMode}
            setPct={setSellPct}
          />
        </motion.div>

        {/* 4 Cost Blocks */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-dim)" }}>สรุปต้นทุน 5 ก้อน</p>
          <CostBlocksRow result={projectCalcResult} />
        </motion.div>

        {/* Per-component */}
        {projectCalcResult.components.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-text-dim)" }}>ต้นทุนรายชิ้นงาน</p>
            </div>
            <div className={`grid gap-4 ${
              projectCalcResult.components.length === 1 ? "grid-cols-1 max-w-2xl" :
              projectCalcResult.components.length === 2 ? "grid-cols-1 md:grid-cols-2" :
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}>
              {projectCalcResult.components.map((comp, i) => <ComponentCostCard key={i} result={comp} />)}
            </div>
          </motion.div>
        )}

        {/* Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8 space-y-4">
          <div className="flex items-center gap-2.5 mb-2">
            <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-text-dim)" }}>รายละเอียดวิธีคิดราคา</p>
          </div>
          {projectCalcResult.components.map((comp, i) => <BreakdownCard key={i} result={comp} />)}
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex gap-4 max-w-lg mx-auto">
          <button
            onClick={() => setShowQuote(true)}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 transition-all hover:scale-[1.01] shimmer-btn-primary"
          >
            <FileDown className="w-5 h-5" /> สร้างใบเสนอราคา
          </button>
          <button onClick={() => setView("spec")}
            className="flex-1 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
            style={{ color: "var(--color-text-sub)", background: "var(--color-bg-hover)", border: "1px solid var(--color-border)" }}>
            <Pencil className="w-4 h-4" /> แก้ไข Spec
          </button>
        </motion.div>
      </div>

      {showQuote && (
        <QuotationModal
          project={project}
          calc={projectCalcResult}
          sellMode={sellMode}
          sellPct={sellPct}
          onClose={() => setShowQuote(false)}
        />
      )}
    </div>
  );
}
