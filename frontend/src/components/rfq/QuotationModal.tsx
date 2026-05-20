"use client";

import { useMemo } from "react";
import { X, Printer } from "lucide-react";
import Logo from "@/components/Logo";
import { TEMPLATE_TYPES } from "@/types";
import type { ProjectSpec, ProjectCalcResult } from "@/types";

interface Props {
  project: ProjectSpec;
  calc: ProjectCalcResult;
  sellMode: "markup" | "markdown";
  sellPct: number;
  onClose: () => void;
}

const baht = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function QuotationModal({ project, calc, sellMode, sellPct, onClose }: Props) {
  const factor = sellMode === "markdown" ? 1 - sellPct / 100 : 1 + sellPct / 100;

  const meta = useMemo(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (dt: Date) =>
      dt.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    return {
      no: `QT${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(100 + Math.random() * 900)}`,
      date: fmtDate(d),
      valid: fmtDate(new Date(d.getTime() + 30 * 86400000)),
    };
  }, []);

  const items = calc.components.map((c, i) => {
    const spec = project.components[i];
    const tpl = c.template_type ? TEMPLATE_TYPES[c.template_type as keyof typeof TEMPLATE_TYPES] : null;
    const dim = spec?.dimensions;
    const dimStr = dim ? `${dim.width}×${dim.height}${dim.depth ? `×${dim.depth}` : ""} ${dim.unit}` : "";
    const paper = spec?.paper;
    const paperStr = paper ? `${paper.code || paper.type || ""} ${paper.gsm ? paper.gsm + "g" : ""}`.trim() : "";
    const colors = spec && typeof spec.outside === "object" ? `${spec.outside.color_count} สี` : "";
    const fin = spec?.finishing?.length ? spec.finishing.join(", ") : "";
    const specLine = [tpl, dimStr, paperStr, colors, fin].filter(Boolean).join("  ·  ");

    const work = ((c.cost?.subtotal || 0) - (c.cost?.logistics || 0)) * factor;
    const qty = c.quantity || spec?.quantity || 0;
    return {
      name: c.component_name || `ชิ้นงาน ${i + 1}`,
      specLine,
      qty,
      unit: qty > 0 ? work / qty : 0,
      amount: work,
      error: c.cost?.error,
    };
  });

  const workSubtotal = items.reduce((s, it) => s + it.amount, 0);
  const shipping = calc.components.reduce((s, c) => s + (c.cost?.logistics || 0), 0);
  const subtotal = workSubtotal + shipping;
  const vat = subtotal * 0.07;
  const total = subtotal + vat;

  const ACCENT = "#7c3aed";
  const INK = "#1f1937";
  const MUTE = "#6b6580";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(15,10,30,0.6)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto", padding: "32px 16px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 780 }}>
        {/* Action bar */}
        <div
          className="no-print"
          style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 14 }}
        >
          <button
            onClick={() => window.print()}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
              fontWeight: 700, fontSize: 14,
            }}
          >
            <Printer style={{ width: 17, height: 17 }} /> พิมพ์ / บันทึก PDF
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 42, height: 42, borderRadius: 12, cursor: "pointer",
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* ── Quotation document ── */}
        <div
          id="quotation-print"
          style={{
            background: "#fff", color: INK, borderRadius: 14, overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
            fontFamily: "inherit",
          }}
        >
          {/* accent strip */}
          <div style={{ height: 6, background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)" }} />

          <div style={{ padding: "40px 44px 44px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
              <div style={{ display: "flex", gap: 13 }}>
                <Logo size={48} />
                <div>
                  <p style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.3 }}>Deep Estimate</p>
                  <p style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>AI-Powered RFQ &amp; Estimation</p>
                  <p style={{ fontSize: 11, color: MUTE, marginTop: 6, lineHeight: 1.6 }}>
                    123 ถนนการพิมพ์ เขตอุตสาหกรรม กรุงเทพฯ 10260<br />
                    โทร 02-000-0000 · estimate@deepestimate.co
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>ใบเสนอราคา</p>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: MUTE, marginTop: 3 }}>
                  QUOTATION
                </p>
                <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.9 }}>
                  <div><span style={{ color: MUTE }}>เลขที่ </span><b>{meta.no}</b></div>
                  <div><span style={{ color: MUTE }}>วันที่ </span>{meta.date}</div>
                  <div><span style={{ color: MUTE }}>ยืนราคาถึง </span>{meta.valid}</div>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div
              style={{
                marginTop: 22, padding: "14px 16px", borderRadius: 10,
                background: "#f6f4fb", border: "1px solid #ece8f6",
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: MUTE, textTransform: "uppercase" }}>
                เรียน / ลูกค้า
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>
                {project.customer || "— ไม่ระบุชื่อลูกค้า —"}
              </p>
              {(project.brand || project.project_name) && (
                <p style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>
                  {[project.project_name, project.brand].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Items table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: ACCENT, color: "#fff" }}>
                  <th style={{ padding: "9px 10px", textAlign: "center", width: 34, borderRadius: "6px 0 0 0" }}>#</th>
                  <th style={{ padding: "9px 10px", textAlign: "left" }}>รายการ</th>
                  <th style={{ padding: "9px 10px", textAlign: "right", width: 86 }}>จำนวน</th>
                  <th style={{ padding: "9px 10px", textAlign: "right", width: 100 }}>ราคา/หน่วย</th>
                  <th style={{ padding: "9px 12px", textAlign: "right", width: 110, borderRadius: "0 6px 0 0" }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #ede9f5" }}>
                    <td style={{ padding: "11px 10px", textAlign: "center", color: MUTE }}>{i + 1}</td>
                    <td style={{ padding: "11px 10px" }}>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      {it.specLine && (
                        <div style={{ fontSize: 11, color: MUTE, marginTop: 2, lineHeight: 1.5 }}>{it.specLine}</div>
                      )}
                    </td>
                    <td style={{ padding: "11px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {it.qty.toLocaleString()}
                    </td>
                    <td style={{ padding: "11px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {baht(it.unit)}
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {baht(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <div style={{ width: 290, fontSize: 13 }}>
                <Line label="รวมค่างานพิมพ์" value={baht(workSubtotal)} mute={MUTE} />
                <Line label="ค่าจัดส่ง (กทม.-ปริมณฑล)" value={baht(shipping)} mute={MUTE} />
                <Line label="รวมเป็นเงิน" value={baht(subtotal)} mute={MUTE} />
                <Line label="ภาษีมูลค่าเพิ่ม 7%" value={baht(vat)} mute={MUTE} />
                <div
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginTop: 8, padding: "12px 14px", borderRadius: 10,
                    background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#fff",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>รวมทั้งสิ้น</span>
                  <span style={{ fontSize: 20, fontWeight: 800 }}>
                    {baht(total)} <span style={{ fontSize: 12, opacity: 0.7 }}>บาท</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div style={{ marginTop: 26, fontSize: 11, color: MUTE, lineHeight: 1.85 }}>
              <p style={{ fontWeight: 700, color: INK, fontSize: 12, marginBottom: 3 }}>เงื่อนไข</p>
              1. ราคานี้ยืนราคา 30 วันนับจากวันที่เสนอราคา<br />
              2. ราคารวมภาษีมูลค่าเพิ่ม 7% แล้ว · ยังไม่รวมค่าขนส่ง (ถ้ามี)<br />
              3. ชำระเงินมัดจำ 50% เมื่อยืนยันสั่งผลิต · ส่วนที่เหลือก่อนส่งมอบ<br />
              4. ระยะเวลาผลิตประมาณ 7-14 วันทำการ หลังอนุมัติแบบ
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", gap: 40, marginTop: 38 }}>
              {["ผู้เสนอราคา", "ผู้อนุมัติสั่งซื้อ"].map((role) => (
                <div key={role} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ borderTop: "1px dashed #c9c2da", paddingTop: 7 }}>
                    <p style={{ fontSize: 12, color: MUTE }}>{role}</p>
                    <p style={{ fontSize: 10, color: "#a39bb8", marginTop: 2 }}>วันที่ ____ / ____ / ____</p>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ textAlign: "center", fontSize: 10, color: "#b3acc4", marginTop: 26 }}>
              เอกสารนี้สร้างโดยระบบ Deep Estimate — คำนวณตามสูตรจริงของโรงพิมพ์
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, mute }: { label: string; value: string; mute: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 14px" }}>
      <span style={{ color: mute }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
