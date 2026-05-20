"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, CheckCircle2, Package } from "lucide-react";
import { chatMessage } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ChatMessage, ProjectSpec, BlockingQuestion } from "@/types";

interface Props {
  onSpecParsed: (project: ProjectSpec) => void;
}

/* ─── Simple markdown renderer for AI responses ─── */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="text-[13px] leading-relaxed space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        const isHeader = /^(\*\*.*\*\*|[📋📝📊💡🔍✅❓⚠️].*\*\*.+\*\*)$/.test(trimmed) ||
                         /^#{1,3}\s/.test(trimmed);

        let html = trimmed
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded text-[11px]" style="background:var(--color-bg-hover)">$1</code>');

        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="shrink-0 text-[12px] font-mono" style={{ color: "var(--color-text-dim)" }}>
                {trimmed.match(/^\d+/)?.[0]}.
              </span>
              <span dangerouslySetInnerHTML={{ __html: html.replace(/^\d+\.\s*/, '') }} />
            </div>
          );
        }

        if (/^[•\-]\s/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-1.5 pl-2">
              <span className="shrink-0" style={{ color: "var(--color-text-dim)" }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: html.replace(/^[•\-]\s*/, '') }} />
            </div>
          );
        }

        if (isHeader) {
          return (
            <div key={i} className="font-semibold mt-2 first:mt-0" style={{ color: "var(--color-text)" }}
              dangerouslySetInnerHTML={{ __html: html.replace(/^#{1,3}\s*/, '') }} />
          );
        }

        return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

/* ─── Blocking Question Cards ─── */
function BlockingQuestionCards({
  questions,
  onAnswer,
}: {
  questions: BlockingQuestion[];
  onAnswer: (answer: string) => void;
}) {
  if (!questions.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {questions.map((q, i) => (
        <div
          key={i}
          className="p-3 rounded-xl text-xs"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <p className="font-medium mb-2" style={{ color: "var(--color-text)" }}>
            ❓ {q.question_th}
          </p>
          {q.options && q.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((opt, j) => (
                <button
                  key={j}
                  onClick={() => onAnswer(opt)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:opacity-80"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    color: "#6366f1",
                    border: "1px solid rgba(99,102,241,0.2)",
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

/* ─── Project Spec Preview Card ─── */
function ProjectPreviewCard({ project }: { project: ProjectSpec }) {
  return (
    <div
      className="mt-3 p-3 rounded-xl text-xs"
      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
    >
      <p className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> Spec พร้อมตรวจสอบ
        {project.components.length > 1 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
            {project.components.length} ชิ้นงาน
          </span>
        )}
      </p>
      <div className="space-y-1.5" style={{ color: "var(--color-text-sub)" }}>
        {project.project_name && <p className="font-medium">{project.project_name}</p>}
        {project.components.map((comp, i) => (
          <div key={i} className="flex items-start gap-2">
            <Package className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#6366f1" }} />
            <div>
              <span className="font-medium">{comp.component_name || `ชิ้นงาน ${i + 1}`}</span>
              {comp.dimensions && (
                <span className="ml-1">
                  {comp.dimensions.width}x{comp.dimensions.height}
                  {comp.dimensions.depth && `x${comp.dimensions.depth}`} {comp.dimensions.unit}
                </span>
              )}
              {comp.paper && <span className="ml-1">| {comp.paper.code} {comp.paper.gsm}g</span>}
              {!comp.quantity && (
                <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">⚠ ยังไม่ระบุจำนวน</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatInput({ onSpecParsed }: Props) {
  const { setProject, setBlockingQuestions } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "สวัสดีครับ! ผม RFQ Wizard ช่วยประเมินราคางานพิมพ์ได้ครับ\n\nวาง spec หรือบอกรายละเอียดงานพิมพ์ได้เลย เช่น:\n• \"กล่อง 10x15x5 ซม. กระดาษ 300 แกรม พิมพ์ 4 สี 5,000 ใบ\"\n• \"Tray + Sleeve 212x271x30 E-Flute DP250\"\n• Copy/Paste spec จากอีเมลลูกค้ามาได้เลย\n\nผมจะ**สรุป spec + ชี้จุดที่ขาด + แนะนำแนวทางประเมิน**ให้ครับ",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const ctx = messages.map((m) => ({ role: m.role, content: m.content }));
      const { data } = await chatMessage(text, ctx);

      const newMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        project_spec: data.project_spec || undefined,
        blocking_questions: data.blocking_questions || undefined,
      };

      // Backward compat: if only parsed_spec returned (no project_spec)
      if (!data.project_spec && data.parsed_spec) {
        newMsg.parsed_spec = data.parsed_spec;
      }

      setMessages((p) => [...p, newMsg]);

      // Store project + blocking questions
      if (data.project_spec) {
        setProject(data.project_spec);
        setBlockingQuestions(data.blocking_questions || []);

        if (!data.needs_more_info) {
          onSpecParsed(data.project_spec);
        }
      } else if (data.parsed_spec && !data.needs_more_info) {
        // Legacy: convert parsed_spec to simple project
        const legacyProject: ProjectSpec = {
          job_category: data.parsed_spec.job_category || "packaging",
          components: [{
            component_name: data.parsed_spec.product_name || data.parsed_spec.product_type,
            job_category: data.parsed_spec.job_category || "packaging",
            dimensions: data.parsed_spec.dimensions,
            paper: data.parsed_spec.paper,
            outside: {
              print_type: "offset",
              colors: data.parsed_spec.colors_front === 4 ? "cmyk" : "special",
              color_count: data.parsed_spec.colors_front,
              color_limit: "standard",
              special_inks: [],
            },
            inside: data.parsed_spec.colors_back > 0 ? {
              print_type: "offset",
              colors: "cmyk",
              color_count: data.parsed_spec.colors_back,
              color_limit: "standard",
              special_inks: [],
            } : "no_print",
            after_press: {
              diecut: { status: "none" },
              assembly: { has_glue: false, glue_spots: 0 },
              inspection: "normal",
              coating: null,
              foil: null,
              emboss: false,
              deboss: false,
            },
            finishing: data.parsed_spec.finishing || [],
            quantity: data.parsed_spec.quantity || 0,
            extra_fields: data.parsed_spec.extra_fields,
            confidence: data.parsed_spec.confidence,
          }],
          blocking_questions: [],
        };
        setProject(legacyProject);
        onSpecParsed(legacyProject);
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    sendMessage(answer);
  };

  return (
    <div className="flex flex-col h-[560px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white"
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
              }}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 ${msg.role === "assistant" && msg.content.includes("📋") ? "max-w-[90%]" : ""}`}
              style={{
                background: msg.role === "user" ? "#6366f1" : "var(--color-bg-hover)",
                color: msg.role === "user" ? "#fff" : "var(--color-text)",
              }}
            >
              {msg.role === "assistant" ? (
                <RichText text={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
              )}

              {/* Project spec preview */}
              {msg.project_spec && <ProjectPreviewCard project={msg.project_spec} />}

              {/* Legacy parsed spec preview */}
              {!msg.project_spec && msg.parsed_spec && (
                <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
                  <p className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Spec พร้อมตรวจสอบ
                  </p>
                  <div className="space-y-0.5" style={{ color: "var(--color-text-sub)" }}>
                    <p>ประเภท: {msg.parsed_spec.product_type} ({msg.parsed_spec.job_category})</p>
                    {msg.parsed_spec.dimensions && (
                      <p>ขนาด: {msg.parsed_spec.dimensions.width}x{msg.parsed_spec.dimensions.height}
                        {msg.parsed_spec.dimensions.depth && `x${msg.parsed_spec.dimensions.depth}`} {msg.parsed_spec.dimensions.unit}</p>
                    )}
                    {msg.parsed_spec.paper && <p>กระดาษ: {msg.parsed_spec.paper.code} {msg.parsed_spec.paper.gsm}g</p>}
                  </div>
                </div>
              )}

              {/* Blocking questions */}
              {msg.blocking_questions && msg.blocking_questions.length > 0 && (
                <BlockingQuestionCards questions={msg.blocking_questions} onAnswer={handleAnswer} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 chat-bubble">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: "var(--color-bg-hover)" }}>
              <div className="flex gap-1.5 items-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--color-text-dim)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>กำลังวิเคราะห์ spec...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="วาง spec หรือพิมพ์รายละเอียดงานพิมพ์... (Shift+Enter ขึ้นบรรทัดใหม่)"
            disabled={loading}
            rows={2}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-shadow resize-none"
            style={{
              background: "var(--color-bg-sub)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-ring)"; e.currentTarget.style.borderColor = "#6366f1"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 rounded-lg text-white font-medium text-sm disabled:opacity-40 transition-all hover:opacity-90 self-end h-10"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
