# RFQ Wizard — วิธีรันโปรเจกต์

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

---

## 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8899 --reload
```

Backend จะรันที่ `http://localhost:8899`
DB (SQLite) จะสร้างอัตโนมัติตอน startup

## 2. Import Master Data

หลัง backend รันแล้ว ต้อง import ข้อมูลพื้นฐาน (ราคากระดาษ, เครื่องจักร, อัตราตลาด):

```bash
curl -X POST http://localhost:8899/api/master-data/import-from-data
```

หรือเปิด browser ไปที่ `http://localhost:8899/docs` แล้วกด Try it out ที่ endpoint นี้

## 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend จะรันที่ `http://localhost:3001`

---

## Quick Start (2 terminals)

**Terminal 1 — Backend:**
```bash
cd backend && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8899 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm install && npm run dev
```

**แล้วเปิด browser:** `http://localhost:3001`

---

## หมายเหตุ

- Frontend proxy `/api/*` ไปที่ backend อัตโนมัติ (ตั้งใน `next.config.ts`)
- ถ้า DB มีปัญหา ลบไฟล์ `backend/rfq_wizard.db` แล้วรัน backend ใหม่ จะสร้าง DB ใหม่อัตโนมัติ
- ข้อมูลราคากระดาษมาจาก `data/Paper Price (MI2).xlsx`
- ข้อมูลเครื่องจักรมาจาก `data/all spec machine.xls`
