"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Sparkles, Loader2, AlertCircle, ArrowRight, Type, Upload, Trash2,
  FileText, FileSpreadsheet, CheckCircle2, Zap, Brain, ReceiptText,
} from "lucide-react";
import { parseInput, parseFile } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ProjectSpec, ComponentSpec, BlockingQuestion } from "@/types";
import { DEFAULT_COMPONENT } from "@/types";

/* ─── Ready-made example specs (click to fill) ─── */
const EXAMPLES: { label: string; hint: string; spec: string }[] = [
  {
    label: "กล่อง Tuck End",
    hint: "Reverse Tuck · ฟอยล์ทอง",
    spec: `ลูกค้า: ชัยยุติ
กล่อง Reverse Tuck End 10x15x5 cm
กระดาษ AC C1s 300g
พิมพ์ 4 สี นอก, ไม่พิมพ์ใน
เคลือบ OPP ด้าน + ปั๊มฟอยล์ทอง
จำนวน 5,000 ใบ`,
  },
  {
    label: "ปลอก Sleeve",
    hint: "Sleeve · UV เฉพาะจุด",
    spec: `ลูกค้า: ชัยยุติ
Sleeve 9x14x3 cm
กระดาษ อาร์ตการ์ด 300 แกรม
พิมพ์ 4 สี
เคลือบ UV เฉพาะจุด
จำนวน 3,000 ชิ้น`,
  },
  {
    label: "ถาด Tray",
    hint: "Simplex Tray · OPP เงา",
    spec: `ลูกค้า: ชัยยุติ
ถาด Simplex Tray 12x18x4 cm
กระดาษ AC C1s 350g
พิมพ์ 4 สี 2 หน้า
เคลือบ OPP เงา
จำนวน 8,000 ใบ`,
  },
];

const STEPS = [
  { icon: Zap, label: "วางข้อมูล", desc: "ข้อความหรือไฟล์" },
  { icon: Brain, label: "AI วิเคราะห์", desc: "แยก Spec อัตโนมัติ" },
  { icon: ReceiptText, label: "ได้ราคา", desc: "พร้อมวิธีคิด" },
];

export default function InputView() {
  const { setProject, setBlockingQuestions, setView, setProjectCalcResult, setCalcError } = useAppStore();

  const [mode, setMode] = useState<"text" | "upload">("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ─── Apply a parse result → store → next view ─── */
  const applyResult = useCallback((data: Record<string, unknown>): boolean => {
    let project: ProjectSpec | null = null;
    let blockingQs: BlockingQuestion[] = [];

    const dataProject = data.project as Record<string, unknown> | undefined;
    const dataItems = data.items as Record<string, unknown>[] | undefined;

    if (dataProject) {
      const p = dataProject;
      const components: ComponentSpec[] = ((p.components as Partial<ComponentSpec>[]) || []).map((c) => ({
        ...DEFAULT_COMPONENT,
        ...c,
        outside: c.outside || DEFAULT_COMPONENT.outside,
        inside: c.inside || DEFAULT_COMPONENT.inside,
        after_press: c.after_press
          ? { ...DEFAULT_COMPONENT.after_press, ...c.after_press }
          : DEFAULT_COMPONENT.after_press,
        finishing: c.finishing || [],
        quantity: c.quantity || 0,
      }));

      blockingQs = ((p.blocking_questions as BlockingQuestion[]) || []).map((bq) => ({
        field: bq.field || "",
        component_name: bq.component_name || null,
        question_th: bq.question_th || "",
        options: bq.options || [],
        priority: bq.priority || 5,
      }));

      project = {
        project_name: (p.project_name as string) || null,
        customer: (p.customer as string) || null,
        brand: (p.brand as string) || null,
        reference_no: (p.reference_no as string) || null,
        job_category: (p.job_category as string) || "packaging",
        incoterm: (p.incoterm as string) || null,
        destination: (p.destination as string) || null,
        currency: (p.currency as string) || "THB",
        components,
        blocking_questions: blockingQs,
      };
    } else if (dataItems) {
      const item = dataItems[0];
      project = {
        job_category: (item.job_category as string) || "packaging",
        components: [{
          ...DEFAULT_COMPONENT,
          component_name: (item.product_name as string) || (item.product_type as string) || "ชิ้นงาน 1",
          job_category: (item.job_category as string) || "packaging",
          dimensions: item.dimensions as ComponentSpec["dimensions"],
          paper: item.paper as ComponentSpec["paper"],
          finishing: (item.finishing as string[]) || [],
          quantity: (item.quantity as number) || 0,
          extra_fields: (item.extra_fields as ComponentSpec["extra_fields"]) || [],
        }],
        blocking_questions: [],
      };
    }

    if (project && project.components.length > 0) {
      setProject(project);
      setBlockingQuestions(blockingQs);
      setProjectCalcResult(null);
      setCalcError(null);
      setTimeout(() => setView("spec"), 220);
      return true;
    }
    return false;
  }, [setProject, setBlockingQuestions, setView, setProjectCalcResult, setCalcError]);

  /* ─── Text parse ─── */
  const handleParse = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await parseInput(input.trim());
      if (!applyResult(data)) {
        setError("ไม่สามารถแยก Spec ได้ — กรุณาใส่ข้อมูลให้ละเอียดขึ้น (ขนาด, กระดาษ, จำนวน)");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  /* ─── File parse ─── */
  const handleFile = async (file: File) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const { data } = await parseFile(file);
      if (data?.error) {
        setError(String(data.error));
      } else if (!applyResult(data)) {
        setError("อ่านไฟล์ได้ แต่แยก Spec ไม่สำเร็จ — ลองวางเป็นข้อความแทน");
      }
    } catch {
      setError("อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFile(files[0]),
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: loading,
  });

  const lineCount = input ? input.split("\n").length : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 md:px-8 pt-10 pb-12">
      {/* ── Aurora backdrop ── */}
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}
      >
        {/* hero spotlight */}
        <div style={{
          position: "absolute", top: "-22%", left: "50%", transform: "translateX(-50%)",
          width: 1000, height: 560,
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.22), rgba(139,92,246,0) 70%)",
          filter: "blur(50px)",
        }} />
        {/* violet — top right */}
        <div style={{
          position: "absolute", top: "-10%", right: "-8%", width: 540, height: 540, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.26), rgba(124,58,237,0) 70%)",
          filter: "blur(90px)", animation: "meshFloat1 24s ease-in-out infinite",
        }} />
        {/* indigo — bottom left */}
        <div style={{
          position: "absolute", bottom: "0%", left: "-10%", width: 580, height: 580, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.22), rgba(79,70,229,0) 70%)",
          filter: "blur(100px)", animation: "meshFloat2 30s ease-in-out infinite",
        }} />
        {/* sky accent — mid right */}
        <div style={{
          position: "absolute", top: "42%", right: "4%", width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.16), rgba(56,189,248,0) 70%)",
          filter: "blur(90px)", animation: "meshFloat3 22s ease-in-out infinite",
        }} />
        {/* pink accent — bottom center */}
        <div style={{
          position: "absolute", bottom: "-8%", left: "36%", width: 440, height: 340, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.13), rgba(236,72,153,0) 70%)",
          filter: "blur(100px)", animation: "meshFloat1 34s ease-in-out infinite",
        }} />
      </div>

      <div className="w-full max-w-3xl mx-auto" style={{ position: "relative", zIndex: 1 }}>
        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-7"
        >
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3.5"
            style={{
              background: "var(--color-primary-light)",
              border: "1px solid var(--color-primary-border)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: "var(--color-primary)" }}>
              ระบบประเมินราคาด้วย AI
            </span>
          </div>
          <h1 className="text-3xl md:text-[34px] font-black leading-tight tracking-tight" style={{ color: "var(--color-text)" }}>
            วาง Spec งานพิมพ์ <span className="gradient-text">ได้ราคาทันที</span>
          </h1>
          <p className="text-sm md:text-[15px] mt-2" style={{ color: "var(--color-text-sub)" }}>
            AI แยก Spec อัตโนมัติ → เติมฟอร์มให้ → คำนวณราคาตามสูตรจริงพร้อมแสดงวิธีคิด
          </p>
        </motion.div>

        {/* ── Mode toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex justify-center mb-5"
        >
          <div
            className="inline-flex p-1 rounded-xl gap-1"
            style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)" }}
          >
            {([
              { key: "text", label: "วาง Spec", icon: Type },
              { key: "upload", label: "อัปโหลดไฟล์", icon: Upload },
            ] as const).map((m) => {
              const active = mode === m.key;
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => { setMode(m.key); setError(null); }}
                  className="relative px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                  style={{ color: active ? "#fff" : "var(--color-text-dim)" }}
                >
                  {active && (
                    <motion.div
                      layoutId="modeTab"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "var(--color-dark)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Main card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {mode === "text" ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="rounded-2xl overflow-hidden shadow-lg"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                {/* Card header */}
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                    <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                      รายละเอียดงานพิมพ์
                    </span>
                  </div>
                  {input.trim() && (
                    <button
                      onClick={() => { setInput(""); setError(null); textareaRef.current?.focus(); }}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors"
                      style={{ color: "var(--color-text-dim)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-dim)"; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ล้าง
                    </button>
                  )}
                </div>

                {/* Textarea */}
                <div className="px-5 pt-4">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleParse(); }
                    }}
                    placeholder={`วาง Spec งานพิมพ์ที่นี่ เช่น:

กล่อง Reverse Tuck End 10x15x5 cm
กระดาษ AC C1s 300g
พิมพ์ 4 สี นอก, ไม่พิมพ์ใน
เคลือบ OPP ด้าน + ปั๊มฟอยล์ทอง
จำนวน 5,000 ใบ

หรือ copy/paste จาก email ลูกค้าได้เลย...`}
                    disabled={loading}
                    spellCheck={false}
                    className="w-full px-4 py-3.5 rounded-xl text-[15px] leading-relaxed resize-none transition-all"
                    style={{
                      background: "var(--color-bg-sub)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                      height: 300,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-ring)";
                      e.currentTarget.style.borderColor = "var(--color-primary)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  />
                </div>

                {/* Example chips */}
                <div className="px-5 pt-3 pb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--color-text-dim)" }}>
                    เริ่มจากตัวอย่าง:
                  </span>
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => { setInput(ex.spec); setError(null); textareaRef.current?.focus(); }}
                      className="group flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03]"
                      style={{
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        border: "1px solid var(--color-primary-border)",
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {ex.label}
                      <span className="font-normal opacity-60 hidden sm:inline">· {ex.hint}</span>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div
                  className="mt-3 px-5 py-3.5 flex items-center justify-between gap-3"
                  style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg-sub)" }}
                >
                  <span className="text-xs flex items-center gap-2" style={{ color: "var(--color-text-dim)" }}>
                    <kbd
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-sans font-semibold"
                      style={{ background: "var(--color-bg-hover)", border: "1px solid var(--color-border)" }}
                    >
                      Ctrl+Enter
                    </kbd>
                    <span className="hidden sm:inline">เพื่อวิเคราะห์</span>
                    {lineCount > 0 && <span className="opacity-70">· {lineCount} บรรทัด</span>}
                  </span>
                  <button
                    onClick={handleParse}
                    disabled={loading || !input.trim()}
                    className="px-7 py-3 rounded-xl text-white font-bold text-sm flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] shimmer-btn-primary"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        กำลังวิเคราะห์...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        วิเคราะห์ Spec
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div
                  {...getRootProps()}
                  className="rounded-2xl px-6 py-14 text-center cursor-pointer transition-all duration-200 shadow-lg"
                  style={{
                    background: isDragActive ? "var(--color-primary-light)" : "var(--color-surface)",
                    border: `2px dashed ${isDragActive ? "var(--color-primary)" : "var(--color-border)"}`,
                  }}
                >
                  <input {...getInputProps()} />
                  {loading ? (
                    <>
                      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: "var(--color-primary)" }} />
                      <p className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                        กำลังอ่านและวิเคราะห์ไฟล์...
                      </p>
                      {fileName && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--color-text-dim)" }}>{fileName}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div
                        className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                        style={{ background: "var(--color-primary-light)", border: "1px solid var(--color-primary-border)" }}
                      >
                        <Upload className="w-7 h-7" style={{ color: "var(--color-primary)" }} />
                      </div>
                      <p className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                        {isDragActive ? "วางไฟล์เพื่ออัปโหลด" : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"}
                      </p>
                      <p className="text-sm mt-1" style={{ color: "var(--color-text-sub)" }}>
                        AI จะอ่านเอกสารและแยก Spec ให้อัตโนมัติ
                      </p>
                      <div className="flex justify-center flex-wrap gap-2 mt-4">
                        {[
                          { t: "PDF", icon: FileText },
                          { t: "Excel", icon: FileSpreadsheet },
                          { t: "Word", icon: FileText },
                          { t: "Text", icon: FileText },
                        ].map((f) => (
                          <span
                            key={f.t}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md"
                            style={{ background: "var(--color-bg-hover)", color: "var(--color-text-dim)" }}
                          >
                            <f.icon className="w-3 h-3" />
                            {f.t}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] mt-3" style={{ color: "var(--color-text-dim)" }}>
                        ขนาดสูงสุด 50MB
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── How it works strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-8 flex items-center justify-center gap-2 sm:gap-4"
        >
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <s.icon className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold leading-tight" style={{ color: "var(--color-text)" }}>
                    {s.label}
                  </p>
                  <p className="text-[11px] leading-tight" style={{ color: "var(--color-text-dim)" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-text-dim)", opacity: 0.5 }} />
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Footer note ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32 }}
          className="text-center text-[11px] mt-6 flex items-center justify-center gap-1.5"
          style={{ color: "var(--color-text-dim)" }}
        >
          <CheckCircle2 className="w-3 h-3" style={{ color: "#10b981" }} />
          คำนวณตามสูตรจริงของ Deep Estimate — ราคากระดาษ เครื่องจักร และค่าหลังพิมพ์จากฐานข้อมูลบริษัท
        </motion.p>
      </div>
    </div>
  );
}
