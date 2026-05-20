"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { parseInput } from "@/lib/api";
import type { ParsedSpec } from "@/types";

interface Props {
  onSpecParsed: (spec: ParsedSpec) => void;
}

export default function FileUploader({ onSpecParsed }: Props) {
  const [processing, setProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setProcessing(true);
    try {
      const text = await f.text();
      const res = await parseInput(text);
      setResult(res.data);
      if (res.data?.items?.[0]) onSpecParsed(res.data.items[0] as ParsedSpec);
    } catch {
      setResult({ error: "ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่" });
    } finally {
      setProcessing(false);
    }
  }, [onSpecParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className="rounded-xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${isDragActive ? "#6366f1" : "var(--color-border)"}`,
          background: isDragActive ? "rgba(99,102,241,0.04)" : "var(--color-bg-sub)",
        }}
      >
        <input {...getInputProps()} />
        {processing ? (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-indigo-500 animate-spin" />
            <p className="font-medium text-indigo-500">AI กำลังวิเคราะห์ไฟล์...</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>อาจใช้เวลาสักครู่</p>
          </>
        ) : file ? (
          <>
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
            <p className="font-medium" style={{ color: "var(--color-text)" }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>ลากไฟล์ใหม่เพื่อเปลี่ยน</p>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-text-dim)" }} />
            <p className="font-medium" style={{ color: "var(--color-text)" }}>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
            <div className="flex justify-center gap-3 mt-3">
              {["PDF", "Excel", "Word", "Image"].map((t) => (
                <span key={t} className="text-[11px] px-2 py-1 rounded" style={{ background: "var(--color-bg-hover)", color: "var(--color-text-dim)" }}>
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-2" style={{ color: "var(--color-text-dim)" }}>สูงสุด 50MB</p>
          </>
        )}
      </div>

      {result && !("error" in result) && (
        <div className="rounded-lg p-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> AI วิเคราะห์แล้ว
          </p>
          <pre className="text-xs overflow-auto max-h-48 font-mono" style={{ color: "var(--color-text-sub)" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {result && "error" in result && (
        <div className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {String(result.error)}
          </p>
        </div>
      )}
    </div>
  );
}
