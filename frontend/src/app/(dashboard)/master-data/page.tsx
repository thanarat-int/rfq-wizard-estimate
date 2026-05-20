"use client";

import { useEffect, useState, useCallback } from "react";
import { Upload, Database, Plus, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { listPapers, listMachines, listFinishing, importMasterData } from "@/lib/api";
import type { Paper, Machine } from "@/types";
import toast from "react-hot-toast";

type Tab = "papers" | "machines" | "finishing";

export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>("papers");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [finishing, setFinishing] = useState<Array<Record<string, unknown>>>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    listPapers().then((r) => setPapers(r.data)).catch(() => {});
    listMachines().then((r) => setMachines(r.data)).catch(() => {});
    listFinishing().then((r) => setFinishing(r.data)).catch(() => {});
  }, []);

  const handleImport = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const res = await importMasterData(file, tab);
      const result = res.data;
      if (result.success) {
        toast.success(`Import สำเร็จ: ${result.imported_count} รายการ`);
        // Reload data
        if (tab === "papers") listPapers().then((r) => setPapers(r.data));
        if (tab === "machines") listMachines().then((r) => setMachines(r.data));
        if (tab === "finishing") listFinishing().then((r) => setFinishing(r.data));
      } else {
        toast.error(`Import ล้มเหลว: ${result.errors.join(", ")}`);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการ import");
    } finally {
      setIsImporting(false);
    }
  }, [tab]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleImport,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
  });

  const tabs = [
    { key: "papers" as Tab, label: "กระดาษ", count: papers.length },
    { key: "machines" as Tab, label: "เครื่องจักร", count: machines.length },
    { key: "finishing" as Tab, label: "Finishing", count: finishing.length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" /> Master Data
          </h1>
          <p className="text-gray-500">จัดการข้อมูลอ้างอิง ราคากระดาษ, เครื่องจักร, Finishing</p>
        </div>
      </div>

      {/* Import Zone */}
      <div
        {...getRootProps()}
        className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 mb-6 text-center cursor-pointer hover:border-[#1a365d] hover:bg-blue-50 transition-colors"
      >
        <input {...getInputProps()} />
        {isImporting ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#1a365d]" />
            <span>AI กำลังวิเคราะห์และ import ข้อมูล...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-gray-600">
              ลากไฟล์ Excel/PDF/รูปภาพ มาวางที่นี่เพื่อ import ข้อมูล <strong>{tabs.find((t) => t.key === tab)?.label}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-[#1a365d] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {tab === "papers" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">ชนิด</th>
                <th className="px-4 py-3">แกรม</th>
                <th className="px-4 py-3">ขนาด</th>
                <th className="px-4 py-3">ราคา/กก.</th>
                <th className="px-4 py-3">ราคา/แผ่น</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.type}</td>
                  <td className="px-4 py-3">{p.gsm}</td>
                  <td className="px-4 py-3">{p.size_w && p.size_h ? `${p.size_w}x${p.size_h}` : "-"}</td>
                  <td className="px-4 py-3">{p.price_per_kg?.toFixed(2)}</td>
                  <td className="px-4 py-3">{p.price_per_sheet?.toFixed(2) || "-"}</td>
                </tr>
              ))}
              {papers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    ยังไม่มีข้อมูล — Import ไฟล์ด้านบนเพื่อเพิ่ม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "machines" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">ชนิด</th>
                <th className="px-4 py-3">ขนาดสูงสุด</th>
                <th className="px-4 py-3">ความเร็ว</th>
                <th className="px-4 py-3">ค่า/ชม.</th>
                <th className="px-4 py-3">ค่า Setup</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{m.type}</td>
                  <td className="px-4 py-3">{m.max_width && m.max_height ? `${m.max_width}x${m.max_height}` : "-"}</td>
                  <td className="px-4 py-3">{m.speed_sheets_per_hour?.toLocaleString()} แผ่น/ชม.</td>
                  <td className="px-4 py-3">{m.cost_per_hour?.toFixed(2)}</td>
                  <td className="px-4 py-3">-</td>
                </tr>
              ))}
              {machines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    ยังไม่มีข้อมูล — Import ไฟล์ด้านบนเพื่อเพิ่ม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "finishing" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">ชนิด</th>
                <th className="px-4 py-3">หน่วย</th>
                <th className="px-4 py-3">ราคา/หน่วย</th>
                <th className="px-4 py-3">ขั้นต่ำ</th>
              </tr>
            </thead>
            <tbody>
              {finishing.map((f, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{String(f.name)}</td>
                  <td className="px-4 py-3">{String(f.type)}</td>
                  <td className="px-4 py-3">{String(f.unit)}</td>
                  <td className="px-4 py-3">{Number(f.price_per_unit).toFixed(2)}</td>
                  <td className="px-4 py-3">{Number(f.min_charge).toFixed(2)}</td>
                </tr>
              ))}
              {finishing.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    ยังไม่มีข้อมูล — Import ไฟล์ด้านบนเพื่อเพิ่ม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
