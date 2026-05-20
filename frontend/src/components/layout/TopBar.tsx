"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Sun, Moon, Menu, X, FileText, Database, Receipt, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { useAppStore, type ViewStep } from "@/lib/store";

const STEPS: { key: ViewStep; label: string; num: number }[] = [
  { key: "input", label: "ป้อนข้อมูล", num: 1 },
  { key: "spec", label: "ตรวจสอบ Spec", num: 2 },
  { key: "results", label: "ผลลัพธ์", num: 3 },
];

const NAV_LINKS = [
  { href: "/rfq/new", label: "สร้าง RFQ", icon: PlusCircle },
  { href: "/rfq", label: "รายการ RFQ", icon: FileText },
  { href: "/quotations", label: "ใบเสนอราคา", icon: Receipt },
  { href: "/master-data", label: "Master Data", icon: Database },
];

export default function TopBar() {
  const { theme, toggle } = useTheme();
  const { currentView, setView, project, projectCalcResult } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const canGoTo = (step: ViewStep) => {
    if (step === "input") return true;
    if (step === "spec") return !!project;
    if (step === "results") return !!projectCalcResult;
    return false;
  };

  const currentIdx = STEPS.findIndex((s) => s.key === currentView);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 glass"
      style={{
        background: theme === "dark" ? "rgba(15,10,30,0.92)" : "rgba(255,255,255,0.92)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand with Logo */}
        <Link href="/rfq/new" className="flex items-center gap-2.5 shrink-0">
          <Logo size={36} />
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-base tracking-tight" style={{ color: "var(--color-text)" }}>
              RFQ Wizard
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-primary)" }}>
              Deep Estimate
            </span>
          </div>
        </Link>

        {/* Step Indicator */}
        <div className="hidden md:flex items-center gap-1">
          {STEPS.map((step, i) => {
            const isActive = step.key === currentView;
            const isPast = i < currentIdx;
            const clickable = canGoTo(step.key);

            return (
              <div key={step.key} className="flex items-center">
                {i > 0 && (
                  <div
                    className="w-10 h-[2px] mx-1 rounded-full"
                    style={{ background: isPast ? "var(--color-primary)" : "var(--color-border)" }}
                  />
                )}
                <button
                  onClick={() => clickable && setView(step.key)}
                  disabled={!clickable}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all relative"
                  style={{
                    color: isActive ? "#fff" : isPast ? "var(--color-primary)" : "var(--color-text-dim)",
                    cursor: clickable ? "pointer" : "default",
                    opacity: clickable ? 1 : 0.4,
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeStep"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "var(--color-dark)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isActive ? "rgba(167,139,250,0.3)" : isPast ? "var(--color-primary-light)" : "var(--color-bg-hover)",
                        color: isActive ? "#fff" : isPast ? "var(--color-primary)" : "var(--color-text-dim)",
                      }}
                    >
                      {isPast ? "✓" : step.num}
                    </span>
                    {step.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: "var(--color-text-dim)", background: "var(--color-bg-hover)" }}
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: "var(--color-text-dim)", background: "var(--color-bg-hover)" }}
          >
            {menuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-6 top-16 mt-1 rounded-2xl p-2 glass"
            style={{
              background: theme === "dark" ? "rgba(26,19,50,0.95)" : "rgba(255,255,255,0.95)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
              minWidth: 200,
            }}
          >
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: "var(--color-text-sub)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-sub)"; }}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {link.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
