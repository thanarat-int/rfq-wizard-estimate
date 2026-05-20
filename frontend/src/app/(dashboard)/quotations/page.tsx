"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Eye } from "lucide-react";
import { listQuotations, generatePDF } from "@/lib/api";
import type { Quotation } from "@/types";
import toast from "react-hot-toast";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    listQuotations().then((r) => setQuotations(r.data)).catch(() => {});
  }, []);

  const handleGeneratePDF = async (id: number) => {
    try {
      await generatePDF(id);
      toast.success("สร้าง PDF สำเร็จ!");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" /> ใบเสนอราคา
        </h1>
        <p className="text-gray-500">{quotations.length} ใบ</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-6 py-3">เลขที่</th>
              <th className="px-6 py-3">ลูกค้า</th>
              <th className="px-6 py-3">ราคารวม</th>
              <th className="px-6 py-3">สถานะ</th>
              <th className="px-6 py-3">ใช้ได้ถึง</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{q.quotation_number}</td>
                <td className="px-6 py-4">{q.customer_company || q.customer_name || "-"}</td>
                <td className="px-6 py-4 font-semibold">
                  {q.final_price?.toLocaleString("th-TH", { minimumFractionDigits: 2 })} {q.currency}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {q.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{q.valid_until || "-"}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleGeneratePDF(q.id)}
                    className="text-[#1a365d] hover:text-[#2b6cb0] flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  ยังไม่มีใบเสนอราคา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
