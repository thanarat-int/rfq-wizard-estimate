"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calculator, Loader2, MessageCircleQuestion, Send, Bot,
  Package, Ruler, FileText as PaperIcon, Palette, Layers, BookOpen, Droplets, Truck,
} from "lucide-react";
import SpecForm from "@/components/rfq/SpecForm";
import Box3DPreview from "@/components/rfq/Box3DPreview";
import TemplateLayoutSVG from "@/components/rfq/TemplateLayoutSVG";
import { useAppStore } from "@/lib/store";
import { calculateProject, chatMessage } from "@/lib/api";
import type { ProjectSpec, BlockingQuestion, ComponentSpec } from "@/types";
import { TEMPLATE_TYPES } from "@/types";

/* ─── Field map: blocking question field → form element data-field ─── */
const FIELD_TO_SELECTOR: Record<string, string> = {
  quantity: '[data-field="quantity"]',
  template_type: '[data-field="template_type"]',
  "dimensions.width": '[data-field="dimensions"]',
  "dimensions.height": '[data-field="dimensions"]',
  "dimensions.depth": '[data-field="dimensions"]',
  dimensions: '[data-field="dimensions"]',
  paper: '[data-field="paper"]',
  "paper.type": '[data-field="paper"]',
  "paper.gsm": '[data-field="paper"]',
  outside: '[data-field="outside"]',
  inside: '[data-field="inside"]',
  finishing: '[data-field="finishing"]',
};

/* ─── Spec Summary Card ─── */
function SpecSummaryCard({ comp, index }: { comp: ComponentSpec; index: number }) {
  const templateName = comp.template_type
    ? TEMPLATE_TYPES[comp.template_type as keyof typeof TEMPLATE_TYPES]
    : null;

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-dark)" }}
        >
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-base" style={{ color: "var(--color-text)" }}>
            {comp.component_name || `ชิ้นงาน ${index + 1}`}
          </p>
          {templateName && (
            <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{templateName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {comp.dimensions && (
          <SummaryRow icon={Ruler} label="ขนาด" value={
            `${comp.dimensions.width} x ${comp.dimensions.height}${comp.dimensions.depth ? ` x ${comp.dimensions.depth}` : ""} ${comp.dimensions.unit}`
          } />
        )}
        {comp.paper && (
          <SummaryRow icon={PaperIcon} label="กระดาษ" value={
            `${comp.paper.code || comp.paper.type} ${comp.paper.gsm}g${comp.paper.brand ? ` (${comp.paper.brand})` : ""}`
          } />
        )}
        <SummaryRow icon={Palette} label="พิมพ์" value={
          typeof comp.outside === "object" && comp.outside.print_type !== "no_print"
            ? `${comp.outside.color_count} สี (${comp.outside.print_type})`
            : "ไม่พิมพ์"
        } />
        {comp.after_press?.coating && (
          <SummaryRow icon={Droplets} label="เคลือบ" value={comp.after_press.coating} />
        )}
        {comp.finishing.length > 0 && (
          <SummaryRow icon={Layers} label="Finishing" value={comp.finishing.join(", ")} />
        )}
        {comp.pages && (
          <SummaryRow icon={BookOpen} label="จำนวนหน้า" value={
            `${comp.pages} หน้า${comp.pages_text ? ` (${comp.pages_text})` : ""}`
          } />
        )}
        {comp.binding && (
          <SummaryRow icon={BookOpen} label="เข้าเล่ม" value={comp.binding} />
        )}
        {typeof comp.packing === "object" && comp.packing?.pallet_req && (
          <SummaryRow icon={Truck} label="Pallet" value="Palletised" />
        )}
        <div className="pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-sub)" }}>จำนวน</span>
            <span className="text-lg font-black" style={{ color: comp.quantity ? "var(--color-primary)" : "#ef4444" }}>
              {comp.quantity ? comp.quantity.toLocaleString() : "ยังไม่ระบุ"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-1 shrink-0" style={{ color: "var(--color-text-dim)" }} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium" style={{ color: "var(--color-text-dim)" }}>{label}</span>
        <p className="text-base font-semibold truncate" style={{ color: "var(--color-text)" }}>{value}</p>
      </div>
    </div>
  );
}

/* ─── Blocking Questions ─── */
function BlockingQuestionsPanel({
  questions,
  onAnswer,
}: {
  questions: BlockingQuestion[];
  onAnswer: (question: BlockingQuestion, answer: string) => void;
}) {
  if (!questions.length) return null;

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(245,158,11,0.05)",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <MessageCircleQuestion className="w-5 h-5 text-amber-500" />
        <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>AI ต้องการข้อมูลเพิ่ม</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold">
          {questions.length}
        </span>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="space-y-2.5">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {i + 1}. {q.question_th}
            {q.component_name && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                {q.component_name}
              </span>
            )}
          </p>
          {q.options && q.options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, j) => (
                <button
                  key={j}
                  onClick={() => onAnswer(q, opt)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary-border)",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── AI Chat Mini ─── */
function AIChatMini({
  onProjectUpdate,
}: {
  onProjectUpdate: (project: ProjectSpec, questions: BlockingQuestion[]) => void;
}) {
  const { project } = useAppStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      const context = [{ role: "assistant", content: "Spec ปัจจุบัน: " + JSON.stringify(project) }];
      const { data } = await chatMessage(input, context);
      setLastReply(data.reply);
      if (data.project_spec) onProjectUpdate(data.project_spec, data.blocking_questions || []);
    } catch {
      setLastReply("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="px-5 py-3 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Bot className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
        <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>ถาม AI เพิ่มเติม</span>
      </div>

      {lastReply && (
        <div className="px-5 py-3 text-sm leading-relaxed max-h-[320px] overflow-y-auto"
          style={{ color: "var(--color-text-sub)", borderBottom: "1px solid var(--color-border)" }}>
          {lastReply}
        </div>
      )}

      <div className="px-4 py-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="ถามหรือเพิ่มข้อมูล..."
          disabled={loading}
          rows={3}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium resize-none"
          style={{ background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl text-white disabled:opacity-40 transition-all shrink-0"
          style={{ background: "var(--color-dark)" }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Main View ─── */
export default function SpecReviewView() {
  const {
    project, setProject, setView,
    setProjectCalcResult, setCalcLoading, setCalcError,
    calcLoading, calcError, activeComponentIndex,
    blockingQuestions, setBlockingQuestions,
    updateComponent,
  } = useAppStore();

  if (!project || !project.components.length) return null;

  const activeComp = project.components[activeComponentIndex];

  const handleCalculate = async (proj: ProjectSpec) => {
    setCalcLoading(true);
    setCalcError(null);
    try {
      const { data } = await calculateProject(proj as unknown as Record<string, unknown>);
      setProjectCalcResult(data);
      setTimeout(() => setView("results"), 200);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: unknown } } })?.response?.data;
      let msg = "คำนวณไม่สำเร็จ กรุณาลองใหม่";
      if (resp?.detail) {
        if (typeof resp.detail === "string") {
          msg = resp.detail;
        } else if (Array.isArray(resp.detail)) {
          msg = resp.detail.map((e: { msg?: string; loc?: unknown[] }) => {
            const loc = e.loc ? e.loc.join(" → ") : "";
            return loc ? `${loc}: ${e.msg}` : (e.msg || JSON.stringify(e));
          }).join(", ");
        }
      }
      setCalcError(msg);
    } finally {
      setCalcLoading(false);
    }
  };

  const autoFillField = (field: string, answer: string) => {
    if (!project) return;
    const comp = { ...project.components[activeComponentIndex] };
    let filled = false;

    if (field === "quantity") {
      const num = parseInt(answer.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > 0) {
        comp.quantity = num;
        filled = true;
      }
    } else if (field === "template_type") {
      const num = parseInt(answer.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        comp.template_type = num;
        filled = true;
      }
    }

    if (filled) {
      updateComponent(activeComponentIndex, comp);
      // Auto-scroll to the filled field
      const selector = FIELD_TO_SELECTOR[field];
      if (selector) {
        setTimeout(() => {
          const el = document.querySelector(selector);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // Flash highlight
            (el as HTMLElement).style.transition = "box-shadow 0.3s";
            (el as HTMLElement).style.boxShadow = "0 0 0 3px var(--color-primary-border)";
            setTimeout(() => {
              (el as HTMLElement).style.boxShadow = "none";
            }, 1500);
          }
        }, 200);
      }
    }
  };

  const handleBlockingAnswer = async (question: BlockingQuestion, answer: string) => {
    // Immediately auto-fill if possible
    if (question.field) {
      autoFillField(question.field, answer);
    }

    try {
      const context = [{ role: "assistant", content: "Spec ปัจจุบัน: " + JSON.stringify(project) }];
      const { data } = await chatMessage(`${question.question_th}: ${answer}`, context);
      if (data.project_spec) {
        setProject(data.project_spec);
        setBlockingQuestions(data.blocking_questions || []);
      } else {
        setBlockingQuestions(blockingQuestions.filter((q) => q.question_th !== question.question_th));
      }
    } catch {
      setBlockingQuestions(blockingQuestions.filter((q) => q.question_th !== question.question_th));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 md:px-8 py-8">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setView("input")}
        className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ color: "var(--color-text-dim)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-dim)"; e.currentTarget.style.background = "transparent"; }}
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปวาง Spec ใหม่
      </motion.button>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 25 }}
          className="lg:col-span-7"
        >
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <SpecForm onCalculate={handleCalculate} loading={calcLoading} />
          </div>
          {calcError && (
            <div className="mt-3 rounded-xl px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {calcError}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 25 }}
          className="lg:col-span-5"
        >
          <div className="sticky top-20 space-y-4">
            {blockingQuestions.length > 0 && (
              <BlockingQuestionsPanel questions={blockingQuestions} onAnswer={handleBlockingAnswer} />
            )}

            {/* 3D Preview */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <Box3DPreview comp={activeComp} />
            </div>

            {/* Die-cut Layout (packaging only) */}
            {activeComp.template_type && activeComp.template_type >= 1 && activeComp.template_type <= 12 && (
              <TemplateLayoutSVG comp={activeComp} />
            )}

            <SpecSummaryCard comp={activeComp} index={activeComponentIndex} />
            <AIChatMini onProjectUpdate={(p, q) => { setProject(p); setBlockingQuestions(q); }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
