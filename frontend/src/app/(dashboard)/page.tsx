"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Upload,
  ArrowRight,
  Zap,
  Brain,
  FileCheck,
  Sparkles,
  FileSpreadsheet,
  ImageIcon,
  FileTextIcon,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function DashboardPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen">
      {/* Minimal top bar for dashboard */}
      <header
        className="fixed top-0 left-0 right-0 z-50 glass"
        style={{
          background: theme === "dark" ? "rgba(14,14,18,0.8)" : "rgba(255,255,255,0.75)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>RFQ Wizard</span>
          </Link>
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--color-text-dim)", background: "var(--color-bg-hover)" }}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="pt-14 max-w-5xl mx-auto px-6 py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl px-10 py-14 mb-8"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed)" }}
        >
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/70 text-sm font-medium">AI-Powered Estimation</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">RFQ Wizard</h1>
            <p className="text-white/70 text-base max-w-md">
              โยนข้อมูลงานพิมพ์ให้ AI — ได้ราคาประเมินทันที ไม่ต้องกรอกฟอร์ม
            </p>
            <Link
              href="/rfq/new"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white text-indigo-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              เริ่มใช้งาน <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Quick Start */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {[
            {
              href: "/rfq/new",
              icon: MessageSquare,
              title: "Chat กับ AI",
              desc: "พิมพ์หรือวางข้อมูลอะไรก็ได้ — AI วิเคราะห์ให้ทันที",
              color: "indigo",
              cta: "เริ่มเลย",
            },
            {
              href: "/rfq/new?mode=upload",
              icon: Upload,
              title: "Upload ไฟล์",
              desc: "โยนไฟล์ PDF, Excel, Word, รูปภาพ — AI อ่านให้อัตโนมัติ",
              color: "amber",
              cta: "Upload เลย",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link href={card.href} className="group block">
                  <div
                    className="rounded-xl p-5 transition-all duration-200 hover:shadow-md"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: card.color === "indigo" ? "rgba(99,102,241,0.1)" : "rgba(245,158,11,0.1)",
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: card.color === "indigo" ? "#6366f1" : "#f59e0b" }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>{card.title}</h3>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-sub)" }}>{card.desc}</p>
                        <span
                          className="text-xs font-medium group-hover:underline inline-flex items-center gap-1"
                          style={{ color: card.color === "indigo" ? "#6366f1" : "#f59e0b" }}
                        >
                          {card.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Info sections */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-5 gap-4"
        >
          <div className="md:col-span-2 rounded-xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-dim)" }}>
              รองรับทุกรูปแบบ
            </p>
            <div className="space-y-3">
              {[
                { icon: FileTextIcon, label: "PDF", desc: "Spec sheet, ใบเสนอราคา", color: "#ef4444" },
                { icon: FileSpreadsheet, label: "Excel", desc: "ตาราง spec, ราคา", color: "#10b981" },
                { icon: FileTextIcon, label: "Word", desc: "เอกสาร RFQ, TOR", color: "#3b82f6" },
                { icon: ImageIcon, label: "รูปภาพ", desc: "ถ่ายรูป, Screenshot", color: "#8b5cf6" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.color}15` }}>
                    <f.icon className="w-4 h-4" style={{ color: f.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{f.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-3 rounded-xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-dim)" }}>
              วิธีทำงาน
            </p>
            <div className="space-y-4">
              {[
                { n: 1, icon: Zap, label: "โยนข้อมูล", desc: "พิมพ์ วาง หรือ upload ไฟล์อะไรก็ได้", color: "#6366f1" },
                { n: 2, icon: Brain, label: "AI วิเคราะห์", desc: "Claude AI แยก spec แล้วจับคู่กับข้อมูลบริษัท", color: "#f59e0b" },
                { n: 3, icon: FileCheck, label: "ได้ผลลัพธ์", desc: "Cost breakdown + ใบเสนอราคาพร้อมใช้", color: "#10b981" },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                      <span className="mr-1.5" style={{ color: "var(--color-text-dim)" }}>{s.n}.</span>
                      {s.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-dim)" }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
