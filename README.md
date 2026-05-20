<div align="center">

# 🧾 RFQ Wizard — Deep Estimate

**ระบบประเมินราคางานพิมพ์ & บรรจุภัณฑ์ด้วย AI**
_AI-Powered RFQ & Estimation System for the Printing / Packaging Industry_

วาง Spec งานพิมพ์ → AI แยกข้อมูลอัตโนมัติ → คำนวณต้นทุนตามสูตรจริง → ออกใบเสนอราคาได้ทันที

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2016-000000?logo=next.js&logoColor=white)
![Python](https://img.shields.io/badge/Python%203.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)

</div>

---

## 📖 ภาพรวม

**RFQ Wizard** ช่วยให้ฝ่ายขาย/ประเมินราคาของโรงพิมพ์ทำใบเสนอราคาได้เร็วขึ้นมาก — แทนที่จะกรอกฟอร์มทีละช่อง แค่ **วางข้อความ Spec หรืออัปโหลดไฟล์** จากลูกค้า ระบบจะ:

1. ใช้ AI แยกรายละเอียดงาน (ขนาด, กระดาษ, สี, finishing, จำนวน) ออกมาเป็นข้อมูลที่มีโครงสร้าง
2. ให้ตรวจสอบ/แก้ไข Spec พร้อมพรีวิวกล่อง 3D และ die-cut layout
3. คำนวณต้นทุน **ตามสูตรจริงของโรงพิมพ์** (ราคากระดาษ, เครื่องจักร, ค่าหลังพิมพ์, บรรจุ, ขนส่ง)
4. สร้าง **ใบเสนอราคา** พร้อมพิมพ์/บันทึก PDF

---

## ✨ ฟีเจอร์หลัก

- **🤖 AI แยก Spec** — วางข้อความ หรืออัปโหลดไฟล์ PDF / Excel / Word / Text
- **❓ Blocking Questions** — ถ้าข้อมูลไม่ครบ ระบบถามกลับ พร้อมปุ่มเลือก
- **📦 3D Preview** — กล่อง 3 มิติหมุนได้ (CSS 3D) รองรับกล่อง / ถาด / ปลอก
- **📐 Die-cut Layout** — ผังกางแบบไดคัทตาม template
- **🧮 Cost Breakdown** — แยกต้นทุน 5 ก้อน พร้อม "วิธีคิด" และที่มาของตัวเลขทุกบรรทัด
- **📈 Markup / Markdown** — ปรับราคาขายจากต้นทุนแบบ realtime
- **🧾 ใบเสนอราคา** — ออกเอกสารพร้อมพิมพ์ / บันทึกเป็น PDF
- **🌙 Light / Dark mode**

---

## 🧮 การคำนวณต้นทุน (5 ก้อน)

| ก้อน | ครอบคลุม |
|---|---|
| **Materials** | กระดาษ + เพลท + greyboard |
| **Print** | ค่าเครื่องพิมพ์ + หมึก |
| **After Press** | เคลือบ / ไดคัท / ฟอยล์ / ปั๊มนูน / เข้าเล่ม |
| **Packing** | กล่องบรรจุ + ค่าแรงแพ็ค |
| **Logistics** | ค่าจัดส่ง (คิดตามรถ 4 ล้อ / 6 ล้อ เขต กทม.-ปริมณฑล) |

เครื่องคำนวณ (V2 engine) อ้างอิงข้อมูลจริงจากฐานข้อมูลบริษัท — ราคากระดาษ, สเปกเครื่องจักร, Waste Table และสูตร Estimate

---

## 🛠 Tech Stack

**Frontend** — Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Framer Motion
**Backend** — FastAPI · SQLAlchemy · SQLite · Pydantic · Anthropic SDK
**File parsing** — openpyxl · xlrd · PyPDF2 · python-docx

---

## 📂 โครงสร้างโปรเจกต์

```
RFQ-Wizard/
├── backend/          # FastAPI — API, calculator, AI engine
│   └── app/
│       ├── api/routes/      # rfq, chat, project, quotation, master-data
│       ├── core/
│       │   ├── calculator/  # V2 pricing engine (5 cost blocks)
│       │   ├── parser/      # PDF / Excel / Word extractors
│       │   └── mock_parser.py   # heuristic spec parser (โหมด mock)
│       └── models/ schemas/ prompts/
├── frontend/         # Next.js — UI
│   └── src/
│       ├── app/(dashboard)/     # หน้า /, /rfq/new, /quotations, ...
│       ├── components/          # views, rfq (3D, die-cut, quotation)
│       └── lib/                 # api client, zustand store
├── data/             # ข้อมูลตั้งต้น (ราคากระดาษ, สเปกเครื่อง, สูตร)
└── docker-compose.yml
```

---

## 🚀 เริ่มต้นใช้งาน

**สิ่งที่ต้องมี:** Python 3.10+ · Node.js 20+ · npm

### 1️⃣ Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8899
```

Backend จะรันที่ `http://localhost:8899` · API docs: `http://localhost:8899/docs`

### 2️⃣ Import ข้อมูลตั้งต้น (ครั้งแรกครั้งเดียว)

```bash
curl -X POST http://localhost:8899/api/master-data/import-from-data
```

นำเข้าราคากระดาษ / สเปกเครื่องจักร / อัตราตลาด เข้าสู่ฐานข้อมูล

### 3️⃣ Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ 👉 **`http://localhost:3000`**

---

## 🤖 โหมด AI

ระบบทำงานได้ **โดยไม่ต้องมี API key** — ค่าเริ่มต้นใช้ตัวแยก Spec แบบ heuristic (`AI_MOCK_MODE=true`)

หากต้องการใช้ Claude จริง สร้างไฟล์ `backend/.env`:

```env
AI_MOCK_MODE=false
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## 🔄 ขั้นตอนการทำงาน

```
วาง Spec / อัปโหลดไฟล์  →  AI แยก Spec  →  ตรวจสอบ & แก้ไข  →  คำนวณ  →  ผลลัพธ์ + ใบเสนอราคา
```

---

## 📝 หมายเหตุ

- โฟลเดอร์ `data/` มีข้อมูลตั้งต้นสำหรับการ import — ถ้า DB เสียหาย ลบ `backend/rfq_wizard.db` แล้วรัน backend + import ใหม่
- ดูรายละเอียดการรันเพิ่มเติมได้ที่ [`HOW-TO-RUN.md`](HOW-TO-RUN.md)

---

<div align="center">
<sub>RFQ Wizard — Deep Estimate · AI-Powered RFQ &amp; Estimation</sub>
</div>
