"use client";

import { Scissors } from "lucide-react";
import type { AfterPressDetail, DiecutStatus, InspectionLevel, FoilSpec } from "@/types";

interface Props {
  value: AfterPressDetail;
  onChange: (val: AfterPressDetail) => void;
}

const COATING_OPTIONS = [
  { value: "", label: "ไม่เคลือบ" },
  { value: "เคลือบ OPP เงา", label: "OPP เงา" },
  { value: "เคลือบ OPP ด้าน", label: "OPP ด้าน" },
  { value: "เคลือบ UV เฉพาะจุด", label: "UV Spot" },
  { value: "เคลือบ UV เต็มแผ่น", label: "UV Full" },
  { value: "Aqueous", label: "Aqueous" },
];

export default function AfterPressSection({ value, onChange }: Props) {
  // Ensure sub-objects have defaults (AI-parsed data may omit them)
  const safeValue: AfterPressDetail = {
    ...value,
    diecut: value.diecut ?? { status: "none" as DiecutStatus, reference: "" },
    assembly: value.assembly ?? { has_glue: false, glue_spots: 0 },
    inspection: value.inspection ?? "normal",
    coating: value.coating ?? null,
    foil: value.foil ?? null,
    emboss: value.emboss ?? false,
    deboss: value.deboss ?? false,
  };
  const update = (patch: Partial<AfterPressDetail>) => onChange({ ...safeValue, ...patch });

  // Normalize foil to FoilSpec (backward compat with string)
  const foilSpec: FoilSpec | null = safeValue.foil
    ? typeof safeValue.foil === "string"
      ? { enabled: true, color: (safeValue.foil as string).includes("ทอง") ? "gold" : (safeValue.foil as string).includes("เงิน") ? "silver" : safeValue.foil as string, area_est: null, position_ref: null }
      : safeValue.foil as FoilSpec
    : null;
  const foilColor = foilSpec?.color || "";

  return (
    <div className="space-y-3">
      <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-sub)" }}>
        <Scissors className="w-4 h-4" /> After Press
      </label>

      <div className="space-y-3 pl-1">
        {/* Diecut */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>ไดคัท</label>
          <div className="flex gap-2">
            {([
              { key: "new" as DiecutStatus, label: "ทำใหม่" },
              { key: "existing" as DiecutStatus, label: "ใช้เดิม" },
              { key: "none" as DiecutStatus, label: "ไม่มี" },
            ]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => update({ diecut: { ...safeValue.diecut, status: opt.key } })}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={{
                  background: safeValue.diecut.status === opt.key ? "var(--color-primary-light)" : "var(--color-bg-sub)",
                  color: safeValue.diecut.status === opt.key ? "var(--color-primary)" : "var(--color-text-sub)",
                  borderColor: safeValue.diecut.status === opt.key ? "var(--color-primary)" : "transparent",
                  boxShadow: safeValue.diecut.status === opt.key ? "0 0 0 1px var(--color-primary-border)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {safeValue.diecut.status === "existing" && (
            <input
              value={safeValue.diecut.reference || ""}
              onChange={(e) => update({ diecut: { ...safeValue.diecut, reference: e.target.value } })}
              placeholder="รหัส/reference ไดคัทเดิม"
              className="mt-2 w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            />
          )}
        </div>

        {/* Assembly */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-sub)" }}>
            <input
              type="checkbox"
              checked={safeValue.assembly.has_glue}
              onChange={(e) => update({
                assembly: {
                  ...safeValue.assembly,
                  has_glue: e.target.checked,
                  glue_spots: e.target.checked ? (safeValue.assembly.glue_spots || 2) : 0,
                },
              })}
              className="rounded"
            />
            ติดกาว (Assembly)
          </label>
          {safeValue.assembly.has_glue && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-dim)" }}>จุดกาว:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={safeValue.assembly.glue_spots}
                onChange={(e) => update({ assembly: { ...safeValue.assembly, glue_spots: Number(e.target.value) } })}
                className="w-16 px-3 py-1.5 rounded-lg text-sm text-center"
                style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          )}
        </div>

        {/* Inspection */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>Inspection (ตรวจงาน)</label>
          <div className="flex gap-2">
            {([
              { key: "normal" as InspectionLevel, label: "ปกติ" },
              { key: "strict" as InspectionLevel, label: "เข้มงวด" },
              { key: "aql" as InspectionLevel, label: "AQL" },
              { key: "100" as InspectionLevel, label: "100%" },
            ]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => update({ inspection: opt.key })}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={{
                  background: safeValue.inspection === opt.key ? "var(--color-primary-light)" : "var(--color-bg-sub)",
                  color: safeValue.inspection === opt.key ? "var(--color-primary)" : "var(--color-text-sub)",
                  borderColor: safeValue.inspection === opt.key ? "var(--color-primary)" : "transparent",
                  boxShadow: safeValue.inspection === opt.key ? "0 0 0 1px var(--color-primary-border)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coating + Foil */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>Coating (เคลือบ)</label>
            <select
              value={safeValue.coating || ""}
              onChange={(e) => update({ coating: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            >
              {COATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>Foil (ปั๊มฟอยล์)</label>
            <select
              value={foilColor}
              onChange={(e) => {
                const color = e.target.value;
                if (!color) {
                  update({ foil: null });
                } else {
                  update({ foil: { enabled: true, color, area_est: foilSpec?.area_est || null, position_ref: foilSpec?.position_ref || null } });
                }
              }}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            >
              <option value="">ไม่มี</option>
              <option value="gold">ฟอยล์ทอง</option>
              <option value="silver">ฟอยล์เงิน</option>
              <option value="rose_gold">ฟอยล์ Rose Gold</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
        </div>

        {/* Foil detail fields */}
        {foilSpec?.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>พื้นที่ฟอยล์ (ประมาณ)</label>
              <input
                value={foilSpec.area_est || ""}
                onChange={(e) => update({ foil: { ...foilSpec, area_est: e.target.value || null } })}
                placeholder="เช่น 30x10mm"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-dim)" }}>ตำแหน่ง/อ้างอิง</label>
              <input
                value={foilSpec.position_ref || ""}
                onChange={(e) => update({ foil: { ...foilSpec, position_ref: e.target.value || null } })}
                placeholder="เช่น layer:FOIL, ปกหน้า"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>
        )}

        {/* Emboss / Deboss */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-sub)" }}>
            <input type="checkbox" checked={safeValue.emboss} onChange={(e) => update({ emboss: e.target.checked })} className="rounded" />
            ปั๊มนูน (Emboss)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-sub)" }}>
            <input type="checkbox" checked={safeValue.deboss} onChange={(e) => update({ deboss: e.target.checked })} className="rounded" />
            ปั๊มลึก (Deboss)
          </label>
        </div>
      </div>
    </div>
  );
}
