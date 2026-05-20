"use client";

import { useState } from "react";
import { Calculator, Plus, X, ChevronDown, Pencil, AlertTriangle } from "lucide-react";
import type { ProjectSpec, ComponentSpec, JobCategory, ExtraField, PrintColorDetail } from "@/types";
import { useAppStore } from "@/lib/store";
import ComponentTabBar from "./ComponentTabBar";
import TemplateTypeSelector from "./TemplateTypeSelector";
import PrintColorSection from "./PrintColorSection";
import AfterPressSection from "./AfterPressSection";

interface Props {
  onCalculate: (project: ProjectSpec) => void;
  loading?: boolean;
}

const JOB_CATEGORIES: { value: JobCategory; label: string; description: string; color: string }[] = [
  { value: "packaging", label: "Packaging", description: "กล่อง, ฉลาก, ถุง, ซอง, บรรจุภัณฑ์", color: "#f59e0b" },
  { value: "book_commercial", label: "Book / Commercial", description: "โบรชัวร์, หนังสือ, โปสเตอร์, นามบัตร", color: "#7c3aed" },
];

const PAPER_CODES = [
  { code: "GA", label: "Gloss Art (อาร์ตมัน)" },
  { code: "MA", label: "Matt Art (อาร์ตด้าน)" },
  { code: "WF", label: "Woodfree (ปอนด์)" },
  { code: "AC C1s", label: "Art Card C1S" },
  { code: "AC C2s", label: "Art Card C2S" },
  { code: "IV", label: "Ivory Board" },
  { code: "FBB", label: "Folding Box Board" },
  { code: "Kraft", label: "Kraft" },
  { code: "BC", label: "Bristol Card" },
  { code: "GR", label: "Greenread" },
  { code: "Sticker", label: "Sticker" },
];

const FINISHING_OPTIONS = [
  "เคลือบเงา", "เคลือบด้าน", "เคลือบ UV เฉพาะจุด", "เคลือบ UV เต็มแผ่น",
  "ปั๊มฟอยล์ทอง", "ปั๊มฟอยล์เงิน", "ปั๊มนูน", "ปั๊มลึก",
  "ไดคัท", "พับ", "ประกบ/ติดลิ้นกาว", "แกะ",
  "เย็บมุงหลังคา", "ไสสันทากาว", "Wire-O", "เจาะรู",
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={{ color: "var(--color-text-sub)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl text-base font-medium transition-shadow outline-none";
const inputStyle = {
  background: "var(--color-bg-sub)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
};

export default function SpecForm({ onCalculate, loading }: Props) {
  const {
    project, setProject,
    activeComponentIndex, setActiveComponentIndex,
    addComponent, updateComponent, removeComponent, duplicateComponent,
  } = useAppStore();

  const [showQtyAlert, setShowQtyAlert] = useState(false);
  const [newFinishing, setNewFinishing] = useState("");
  const [showFinishingDropdown, setShowFinishingDropdown] = useState(false);

  if (!project) return null;

  const comp = project.components[activeComponentIndex];
  if (!comp) return null;

  const updateComp = (patch: Partial<ComponentSpec>) => {
    updateComponent(activeComponentIndex, { ...comp, ...patch });
  };

  const updateDim = (key: string, val: number | string | null) => {
    updateComp({ dimensions: { ...comp.dimensions!, [key]: val } });
  };

  const updatePaper = (key: string, val: string | number | null) => {
    updateComp({ paper: { ...comp.paper!, [key]: val } });
  };

  // Normalize packing to get method string (backward compat: string | PackingSpec | null)
  const packingMethod = typeof comp.packing === "string" ? comp.packing : comp.packing?.method || "";
  const updatePackingMethod = (method: string) => {
    if (!method) { updateComp({ packing: null }); return; }
    if (typeof comp.packing === "object" && comp.packing) {
      updateComp({ packing: { ...comp.packing, method } });
    } else {
      updateComp({ packing: { method } });
    }
  };

  const addFinishing = (f: string) => {
    if (!f.trim() || comp.finishing.includes(f.trim())) return;
    updateComp({ finishing: [...comp.finishing, f.trim()] });
    setNewFinishing("");
    setShowFinishingDropdown(false);
  };

  const removeFinishing = (f: string) => {
    updateComp({ finishing: comp.finishing.filter((x) => x !== f) });
  };

  const updateExtraField = (index: number, value: string) => {
    const fields = [...(comp.extra_fields || [])];
    fields[index] = { ...fields[index], value };
    updateComp({ extra_fields: fields });
  };

  const removeExtraField = (index: number) => {
    updateComp({ extra_fields: (comp.extra_fields || []).filter((_, i) => i !== index) });
  };

  const addExtraField = () => {
    updateComp({
      extra_fields: [...(comp.extra_fields || []), { label: "ข้อมูลเพิ่มเติม", value: "", field_type: "text" as const }],
    });
  };

  const updateExtraFieldLabel = (index: number, label: string) => {
    const fields = [...(comp.extra_fields || [])];
    fields[index] = { ...fields[index], label };
    updateComp({ extra_fields: fields });
  };

  // Check any component has no qty
  const anyMissingQty = project.components.some((c) => !c.quantity || c.quantity <= 0);

  const handleCalculate = () => {
    if (anyMissingQty) {
      setShowQtyAlert(true);
      return;
    }
    onCalculate(project);
  };

  const hasDimensions = !!comp.dimensions;
  const hasDepth = hasDimensions && comp.dimensions!.depth !== undefined;
  const hasPaper = !!comp.paper;
  const isPackaging = project.job_category === "packaging";
  const availableFinishing = FINISHING_OPTIONS.filter((f) => !comp.finishing.includes(f));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Pencil className="w-5 h-5" style={{ color: "var(--gradient-1)" }} />
        <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
          ตรวจสอบ & แก้ไข Spec
        </p>
        {project.project_name && (
          <span className="text-sm px-3 py-1 rounded-xl ml-auto font-semibold" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
            {project.project_name}
          </span>
        )}
      </div>

      {/* Job Category */}
      <div>
        <label className="block text-sm font-semibold mb-3" style={{ color: "var(--color-text-sub)" }}>
          ประเภทการผลิต
        </label>
        <div className="grid grid-cols-2 gap-3">
          {JOB_CATEGORIES.map((cat) => {
            const active = project.job_category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setProject({ ...project, job_category: cat.value })}
                className="p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                style={{
                  background: active ? `${cat.color}12` : "var(--color-bg-sub)",
                  border: `2px solid ${active ? cat.color : "var(--color-border)"}`,
                }}
              >
                <p className="text-sm font-bold" style={{ color: active ? cat.color : "var(--color-text)" }}>
                  {cat.label}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Header: Incoterm / Destination / Currency */}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Incoterm">
          <div className="relative">
            <select
              value={project.incoterm || ""}
              onChange={(e) => setProject({ ...project, incoterm: e.target.value || null })}
              className={inputCls + " appearance-none pr-8"}
              style={inputStyle}
            >
              <option value="">ไม่ระบุ</option>
              <option value="EXW">EXW</option>
              <option value="FOB">FOB</option>
              <option value="CIF">CIF</option>
              <option value="DDP">DDP</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-dim)" }} />
          </div>
        </Field>
        <Field label="ปลายทาง">
          <input
            value={project.destination || ""}
            onChange={(e) => setProject({ ...project, destination: e.target.value || null })}
            placeholder="เช่น Hong Kong"
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="สกุลเงิน">
          <div className="relative">
            <select
              value={project.currency || "THB"}
              onChange={(e) => setProject({ ...project, currency: e.target.value })}
              className={inputCls + " appearance-none pr-8"}
              style={inputStyle}
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
              <option value="HKD">HKD</option>
              <option value="EUR">EUR</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-dim)" }} />
          </div>
        </Field>
      </div>

      {/* Component Tab Bar */}
      <ComponentTabBar
        components={project.components}
        activeIndex={activeComponentIndex}
        onSelect={setActiveComponentIndex}
        onAdd={() => addComponent()}
        onRemove={removeComponent}
        onDuplicate={duplicateComponent}
      />

      {/* ─── Component Form ─── */}
      <div className="space-y-5 p-5 rounded-2xl" style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)" }}>
        {/* Component Name */}
        <Field label="ชื่อชิ้นงาน">
          <input
            value={comp.component_name}
            onChange={(e) => updateComp({ component_name: e.target.value })}
            placeholder="เช่น Tray, Sleeve, กล่อง"
            className={inputCls}
            style={inputStyle}
          />
        </Field>

        {/* Template Type (packaging only) */}
        {isPackaging && (
          <div data-field="template_type">
            <TemplateTypeSelector
              value={comp.template_type}
              onChange={(val) => updateComp({ template_type: val })}
            />
          </div>
        )}

        {/* Pages / Binding (book_commercial only) */}
        {!isPackaging && (
          <div className="grid grid-cols-2 gap-3" data-field="pages">
            <Field label="จำนวนหน้า (Pages)">
              <input
                type="number"
                min={1}
                value={comp.pages || ""}
                onChange={(e) => updateComp({ pages: +e.target.value || null })}
                placeholder="เช่น 28"
                className={inputCls}
                style={inputStyle}
              />
              {comp.pages_text && (
                <span className="text-xs mt-0.5 block" style={{ color: "var(--color-text-dim)" }}>
                  {comp.pages_text}
                </span>
              )}
            </Field>
            <Field label="Binding (เข้าเล่ม)">
              <div className="relative">
                <select
                  value={comp.binding || ""}
                  onChange={(e) => updateComp({ binding: e.target.value || null })}
                  className={inputCls + " appearance-none pr-8"}
                  style={inputStyle}
                >
                  <option value="">ไม่ระบุ</option>
                  <option value="Board book binding">Board book binding</option>
                  <option value="Perfect binding">Perfect binding (ไสสันทากาว)</option>
                  <option value="Saddle stitch">Saddle stitch (เย็บมุงหลังคา)</option>
                  <option value="Case bound">Case bound (ปกแข็ง)</option>
                  <option value="Wire-O">Wire-O</option>
                  <option value="Spiral">Spiral</option>
                  <option value="Section sewn">Section sewn (เย็บกี่)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-dim)" }} />
              </div>
            </Field>
          </div>
        )}

        {/* Dimensions */}
        {hasDimensions && (
          <div className="space-y-2" data-field="dimensions">
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--color-text-sub)" }}>
              ขนาด ({comp.dimensions!.unit})
            </label>
            <div className={`grid gap-2 ${hasDepth ? "grid-cols-3" : "grid-cols-2"}`}>
              <div>
                <input
                  type="number"
                  value={comp.dimensions!.width || ""}
                  onChange={(e) => updateDim("width", +e.target.value)}
                  placeholder="กว้าง"
                  className={inputCls}
                  style={inputStyle}
                />
                <span className="text-sm mt-0.5 block" style={{ color: "var(--color-text-dim)" }}>กว้าง</span>
              </div>
              <div>
                <input
                  type="number"
                  value={comp.dimensions!.height || ""}
                  onChange={(e) => updateDim("height", +e.target.value)}
                  placeholder="ยาว"
                  className={inputCls}
                  style={inputStyle}
                />
                <span className="text-sm mt-0.5 block" style={{ color: "var(--color-text-dim)" }}>ยาว</span>
              </div>
              {hasDepth && (
                <div>
                  <input
                    type="number"
                    value={comp.dimensions!.depth || ""}
                    onChange={(e) => updateDim("depth", +e.target.value)}
                    placeholder="สูง"
                    className={inputCls}
                    style={inputStyle}
                  />
                  <span className="text-sm mt-0.5 block" style={{ color: "var(--color-text-dim)" }}>สูง</span>
                </div>
              )}
            </div>
            {/* Dimension Reference + Orientation */}
            <div className="grid grid-cols-5 gap-2">
              {(["ID", "OD", "Score"] as const).map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => updateDim("reference", comp.dimensions?.reference === ref ? null : ref)}
                  className="px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={{
                    background: comp.dimensions?.reference === ref ? "var(--color-primary-light)" : "var(--color-bg-sub)",
                    color: comp.dimensions?.reference === ref ? "var(--color-primary)" : "var(--color-text-sub)",
                    borderColor: comp.dimensions?.reference === ref ? "var(--color-primary)" : "transparent",
                    boxShadow: comp.dimensions?.reference === ref ? "0 0 0 1px var(--color-primary-border)" : "none",
                  }}
                >
                  {ref === "ID" ? "ID" : ref === "OD" ? "OD" : "Score"}
                </button>
              ))}
              {([
                { key: "portrait" as const, label: "Portrait" },
                { key: "landscape" as const, label: "Landscape" },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => updateDim("orientation", comp.dimensions?.orientation === o.key ? null : o.key)}
                  className="px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={{
                    background: comp.dimensions?.orientation === o.key ? "var(--color-primary-light)" : "var(--color-bg-sub)",
                    color: comp.dimensions?.orientation === o.key ? "var(--color-primary)" : "var(--color-text-sub)",
                    borderColor: comp.dimensions?.orientation === o.key ? "var(--color-primary)" : "transparent",
                    boxShadow: comp.dimensions?.orientation === o.key ? "0 0 0 1px var(--color-primary-border)" : "none",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paper / Material */}
        {hasPaper && (
          <div className="space-y-2" data-field="paper">
            {/* Material Family */}
            <div>
              <label className="text-sm mb-1.5 block font-medium" style={{ color: "var(--color-text-dim)" }}>ประเภทวัสดุ</label>
              <div className="flex gap-2">
                {([
                  { key: "paperboard", label: "Paperboard" },
                  { key: "corrugated", label: "ลูกฟูก (Corrugated)" },
                  { key: "other", label: "อื่นๆ" },
                ] as const).map((fam) => (
                  <button
                    key={fam.key}
                    type="button"
                    onClick={() => updatePaper("family", fam.key)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      background: comp.paper?.family === fam.key ? "var(--color-primary-light)" : "var(--color-bg-sub)",
                      color: comp.paper?.family === fam.key ? "var(--color-primary)" : "var(--color-text-sub)",
                      borderColor: comp.paper?.family === fam.key ? "var(--color-primary)" : "transparent",
                      boxShadow: comp.paper?.family === fam.key ? "0 0 0 1px var(--color-primary-border)" : "none",
                    }}
                  >
                    {fam.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="กระดาษ">
                <div className="relative">
                  <select
                    value={comp.paper!.code || comp.paper!.type}
                    onChange={(e) => {
                      const selected = PAPER_CODES.find((p) => p.code === e.target.value);
                      if (selected) {
                        updateComp({ paper: { ...comp.paper!, code: selected.code, type: selected.label } });
                      }
                    }}
                    className={inputCls + " appearance-none pr-8"}
                    style={inputStyle}
                  >
                    {PAPER_CODES.map((p) => (
                      <option key={p.code} value={p.code}>{p.code} - {p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-dim)" }} />
                </div>
              </Field>
              <Field label="แกรม (gsm)">
                <input
                  type="number"
                  value={comp.paper!.gsm || ""}
                  onChange={(e) => updatePaper("gsm", +e.target.value)}
                  placeholder="เช่น 300"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <Field label="ยี่ห้อกระดาษ">
                <input
                  value={comp.paper!.brand || ""}
                  onChange={(e) => updatePaper("brand", e.target.value || null)}
                  placeholder="เช่น Apollopape"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
            </div>

            {/* Corrugated: Flute + Grade */}
            {comp.paper?.family === "corrugated" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Flute">
                  <div className="relative">
                    <select
                      value={comp.paper?.flute || ""}
                      onChange={(e) => updatePaper("flute", e.target.value || null)}
                      className={inputCls + " appearance-none pr-8"}
                      style={inputStyle}
                    >
                      <option value="">ไม่ระบุ</option>
                      <option value="E">E-Flute</option>
                      <option value="B">B-Flute</option>
                      <option value="C">C-Flute</option>
                      <option value="BC">BC-Flute</option>
                      <option value="EB">EB-Flute</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-dim)" }} />
                  </div>
                </Field>
                <Field label="Grade">
                  <input
                    value={comp.paper?.grade || ""}
                    onChange={(e) => updatePaper("grade", e.target.value || null)}
                    placeholder="เช่น DP250/CA105/CA125"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* Print & Color — Outside */}
        <div data-field="outside">
          <PrintColorSection
            label="พิมพ์ & สี (ด้านนอก)"
            value={comp.outside}
            onChange={(val) => updateComp({ outside: val as PrintColorDetail })}
          />
        </div>

        {/* Print & Color — Inside */}
        <div data-field="inside">
          <PrintColorSection
            label="พิมพ์ & สี (ด้านใน)"
            value={comp.inside}
            onChange={(val) => updateComp({ inside: val })}
            showNoPrint
          />
        </div>

        {/* After Press */}
        <AfterPressSection
          value={comp.after_press}
          onChange={(val) => updateComp({ after_press: val })}
        />

        {/* Finishing chips */}
        <div data-field="finishing">
          <label className="block text-sm font-bold mb-2" style={{ color: "var(--color-text-sub)" }}>
            Finishing (เพิ่มเติม)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {comp.finishing.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)" }}
              >
                {f}
                <button onClick={() => removeFinishing(f)} className="hover:opacity-60">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="flex gap-2">
              <input
                value={newFinishing}
                onChange={(e) => setNewFinishing(e.target.value)}
                onFocus={() => setShowFinishingDropdown(true)}
                onBlur={() => setTimeout(() => setShowFinishingDropdown(false), 200)}
                onKeyDown={(e) => { if (e.key === "Enter" && newFinishing.trim()) addFinishing(newFinishing); }}
                placeholder="เพิ่ม finishing..."
                className={inputCls + " flex-1"}
                style={inputStyle}
              />
              <button
                onClick={() => newFinishing.trim() && addFinishing(newFinishing)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: "var(--color-bg-hover)", color: "var(--color-text-dim)", border: "1px solid var(--color-border)" }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {showFinishingDropdown && availableFinishing.length > 0 && (
              <div
                className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg shadow-lg py-1"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                {availableFinishing
                  .filter((f) => !newFinishing || f.includes(newFinishing))
                  .map((f) => (
                    <button
                      key={f}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addFinishing(f)}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                      style={{ color: "var(--color-text)" }}
                    >
                      {f}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Quantity + Packing */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="จำนวน (ชิ้น)">
            <input
              data-field="quantity"
              type="number"
              min={1}
              value={comp.quantity || ""}
              onChange={(e) => updateComp({ quantity: +e.target.value })}
              placeholder="กรุณาระบุ"
              className={inputCls + (!comp.quantity ? " ring-2 ring-amber-400/60 animate-pulse" : "")}
              style={{
                ...inputStyle,
                ...(!comp.quantity ? { border: "1px solid #f59e0b", background: "rgba(245,158,11,0.06)" } : {}),
              }}
            />
            {!comp.quantity && (
              <span className="text-xs mt-1 flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3 h-3" /> จำเป็นต้องระบุ
              </span>
            )}
          </Field>
          <Field label="Packing (วิธีแพ็ค)">
            <div className="relative">
              <select
                value={packingMethod}
                onChange={(e) => updatePackingMethod(e.target.value)}
                className={inputCls + " appearance-none pr-8"}
                style={inputStyle}
              >
                <option value="">ไม่ระบุ</option>
                <option value="carton">Carton</option>
                <option value="pallet">Pallet</option>
                <option value="shrink">Shrink wrap</option>
                <option value="kraft">Kraft wrap</option>
                <option value="paper_band">Paper band</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-dim)" }} />
            </div>
            {/* Pallet checkbox */}
            {packingMethod && (
              <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer" style={{ color: "var(--color-text-sub)" }}>
                <input
                  type="checkbox"
                  checked={typeof comp.packing === "object" && !!comp.packing?.pallet_req}
                  onChange={(e) => {
                    const packing = typeof comp.packing === "object" && comp.packing ? comp.packing : { method: packingMethod };
                    updateComp({ packing: { ...packing, pallet_req: e.target.checked || null } });
                  }}
                  className="rounded"
                />
                Palletised (วางพาเลท)
              </label>
            )}
          </Field>
        </div>

        {/* Extra Fields */}
        {comp.extra_fields && comp.extra_fields.length > 0 && (
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--color-text-sub)" }}>
              ข้อมูลเพิ่มเติม
            </label>
            <div className="grid grid-cols-1 gap-2">
              {comp.extra_fields.map((field: ExtraField, idx: number) => (
                <div key={idx} className="flex gap-1.5 items-start">
                  <input
                    value={field.label}
                    onChange={(e) => updateExtraFieldLabel(idx, e.target.value)}
                    className="w-[120px] shrink-0 px-2 py-2 rounded-lg text-[11px] font-medium outline-none"
                    style={{ background: "var(--color-bg-hover)", border: "1px solid var(--color-border)", color: "var(--color-text-dim)" }}
                  />
                  <input
                    value={field.value}
                    onChange={(e) => updateExtraField(idx, e.target.value)}
                    className={inputCls + " flex-1 !text-xs"}
                    style={inputStyle}
                  />
                  <button onClick={() => removeExtraField(idx)} className="shrink-0 p-2 rounded-lg hover:opacity-60" style={{ color: "var(--color-text-dim)" }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={addExtraField}
          className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
          style={{ color: "var(--color-text-dim)", border: "1px dashed var(--color-border)" }}
        >
          <Plus className="w-3 h-3" /> เพิ่มข้อมูล
        </button>
      </div>

      {/* Quantity Alert Modal */}
      {showQtyAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>กรุณาระบุจำนวน</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>ต้องกรอกจำนวนทุกชิ้นงานก่อนคำนวณราคา</p>
              </div>
            </div>
            {/* Show qty inputs for each component missing qty */}
            <div className="space-y-2 mb-4">
              {project.components.map((c, i) => (
                (!c.quantity || c.quantity <= 0) && (
                  <div key={i}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-dim)" }}>
                      {c.component_name || `ชิ้นงาน ${i + 1}`}
                    </label>
                    <input
                      type="number"
                      min={1}
                      autoFocus={i === 0}
                      autoComplete="off"
                      className={inputCls + " text-center font-bold"}
                      style={{ ...inputStyle, borderColor: "var(--color-primary)" }}
                      onChange={(e) => {
                        const val = +e.target.value;
                        if (val > 0) updateComponent(i, { ...project.components[i], quantity: val });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const allFilled = project.components.every((c2) => c2.quantity > 0);
                          if (allFilled) {
                            setShowQtyAlert(false);
                            setTimeout(() => onCalculate(project), 100);
                          }
                        }
                      }}
                    />
                  </div>
                )
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQtyAlert(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: "var(--color-text-sub)", background: "var(--color-bg-hover)", border: "1px solid var(--color-border)" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const allFilled = project.components.every((c) => c.quantity > 0);
                  if (allFilled) { setShowQtyAlert(false); onCalculate(project); }
                }}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--color-dark)" }}
              >
                <Calculator className="w-4 h-4" /> คำนวณ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 shimmer-btn"
      >
        <Calculator className="w-5 h-5" />
        {loading ? "กำลังคำนวณ..." : `คำนวณราคา (${project.components.length} ชิ้นงาน)`}
      </button>
    </div>
  );
}