"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquarePlus,
  FileText,
  Database,
  Receipt,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rfq/new", label: "สร้าง RFQ ใหม่", icon: MessageSquarePlus },
  { href: "/rfq", label: "รายการ RFQ", icon: FileText },
  { href: "/quotations", label: "ใบเสนอราคา", icon: Receipt },
  { href: "/master-data", label: "Master Data", icon: Database },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
    >
      {/* Brand */}
      <div
        className="px-5 h-14 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            RFQ Wizard
          </span>
        </div>
        {/* Theme toggle icon */}
        <button
          onClick={toggle}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          style={{ color: "var(--color-text-dim)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                color: active ? "#6366f1" : "var(--color-text-sub)",
                background: active ? "rgba(99,102,241,0.08)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--color-bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = active ? "rgba(99,102,241,0.08)" : "transparent";
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
