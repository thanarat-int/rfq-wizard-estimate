"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Eye } from "lucide-react";
import { listRFQs } from "@/lib/api";
import type { RFQ } from "@/types";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "bg-gray-100 text-gray-700" },
  parsing: { label: "กำลังวิเคราะห์", color: "bg-blue-100 text-blue-700" },
  parsed: { label: "วิเคราะห์แล้ว", color: "bg-indigo-100 text-indigo-700" },
  calculating: { label: "กำลังคำนวณ", color: "bg-yellow-100 text-yellow-700" },
  calculated: { label: "คำนวณแล้ว", color: "bg-green-100 text-green-700" },
  quoted: { label: "เสนอราคาแล้ว", color: "bg-emerald-100 text-emerald-700" },
};

export default function RFQListPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listRFQs().then((res) => setRfqs(res.data)).catch(() => {});
  }, []);

  const filtered = rfqs.filter(
    (r) =>
      r.id.toString().includes(search) ||
      r.input_type.includes(search) ||
      r.status.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">รายการ RFQ</h1>
          <p className="text-gray-500">{rfqs.length} รายการ</p>
        </div>
        <Link
          href="/rfq/new"
          className="flex items-center gap-2 bg-[#1a365d] text-white px-5 py-2.5 rounded-lg hover:bg-[#2b6cb0]"
        >
          <Plus className="w-4 h-4" /> สร้างใหม่
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา RFQ..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a365d] text-sm"
            />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="px-6 py-3 font-medium">#</th>
              <th className="px-6 py-3 font-medium">ประเภท Input</th>
              <th className="px-6 py-3 font-medium">สถานะ</th>
              <th className="px-6 py-3 font-medium">รายการ</th>
              <th className="px-6 py-3 font-medium">วันที่สร้าง</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rfq) => {
              const status = STATUS_LABELS[rfq.status] || { label: rfq.status, color: "bg-gray-100" };
              return (
                <tr key={rfq.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">RFQ-{rfq.id.toString().padStart(4, "0")}</td>
                  <td className="px-6 py-4 text-sm capitalize">{rfq.input_type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{rfq.items?.length || 0} รายการ</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(rfq.created_at).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/rfq/${rfq.id}`}
                      className="text-[#1a365d] hover:text-[#2b6cb0] flex items-center gap-1 text-sm"
                    >
                      <Eye className="w-4 h-4" /> ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  ยังไม่มีรายการ RFQ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
