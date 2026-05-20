"use client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute rounded-full opacity-[0.07] blur-[100px]"
          style={{
            width: 600,
            height: 600,
            top: "-10%",
            right: "-5%",
            background: "var(--gradient-1)",
            animation: "meshFloat1 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full opacity-[0.05] blur-[120px]"
          style={{
            width: 500,
            height: 500,
            bottom: "10%",
            left: "-5%",
            background: "var(--gradient-2)",
            animation: "meshFloat2 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full opacity-[0.04] blur-[80px]"
          style={{
            width: 400,
            height: 400,
            top: "40%",
            left: "40%",
            background: "var(--gradient-3)",
            animation: "meshFloat3 18s ease-in-out infinite",
          }}
        />
      </div>
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
