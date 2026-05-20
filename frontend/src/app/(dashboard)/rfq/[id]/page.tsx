"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calculator, FileDown, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getRFQ, calculateRFQ, createQuotation } from "@/lib/api";
import type { RFQ } from "@/types";
import toast from "react-hot-toast";

export default function RFQDetailPage() {
  const params = useParams();
  const rfqId = Number(params.id);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResults, setCalcResults] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getRFQ(rfqId).then((res) => setRfq(res.data)).catch(() => {});
  }, [rfqId]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const res = await calculateRFQ(rfqId);
      setCalcResults(res.data);
      toast.success("คำนวณราคาเสร็จแล้ว!");
      // Reload RFQ
      const rfqRes = await getRFQ(rfqId);
      setRfq(rfqRes.data);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการคำนวณ");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateQuotation = async () => {
    try {
      await createQuotation({ rfq_id: rfqId });
      toast.success("สร้างใบเสนอราคาเสร็จแล้ว!");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  if (!rfq) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a365d]" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/rfq" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> กลับไปรายการ RFQ
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">RFQ-{rfq.id.toString().padStart(4, "0")}</h1>
          <p className="text-gray-500">สถานะ: {rfq.status} | ประเภท: {rfq.input_type}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex items-center gap-2 bg-[#ed8936] text-white px-5 py-2.5 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            คำนวณราคา
          </button>
          {rfq.status === "calculated" && (
            <button
              onClick={handleCreateQuotation}
              className="flex items-center gap-2 bg-[#1a365d] text-white px-5 py-2.5 rounded-lg hover:bg-[#2b6cb0]"
            >
              <FileDown className="w-4 h-4" /> สร้างใบเสนอราคา
            </button>
          )}
        </div>
      </div>

      {/* Raw input */}
      {rfq.raw_input && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold mb-2">ข้อมูล Input ดั้งเดิม</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{rfq.raw_input}</p>
        </div>
      )}

      {/* Parsed spec */}
      {rfq.parsed_spec_json && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold mb-2">Spec ที่ AI วิเคราะห์ได้</h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-60">
            {JSON.stringify(rfq.parsed_spec_json, null, 2)}
          </pre>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">รายการ ({rfq.items.length})</h3>
        {rfq.items.map((item, i) => (
          <div key={item.id || i} className="border rounded-lg p-4 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">ประเภท:</span>
                <span className="ml-1 font-medium">{item.product_type}</span>
              </div>
              <div>
                <span className="text-gray-500">จำนวน:</span>
                <span className="ml-1 font-medium">{item.quantity?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">สี:</span>
                <span className="ml-1 font-medium">
                  หน้า {item.colors_front} / หลัง {item.colors_back}
                </span>
              </div>
              {item.calculation && (
                <div>
                  <span className="text-gray-500">ราคา:</span>
                  <span className="ml-1 font-bold text-[#1a365d]">
                    {item.calculation.total_cost?.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Calculation results */}
      {calcResults && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6 mt-6">
          <h3 className="font-semibold text-green-800 mb-2">ผลการคำนวณ</h3>
          <pre className="text-xs text-green-700 overflow-auto max-h-60">
            {JSON.stringify(calcResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
