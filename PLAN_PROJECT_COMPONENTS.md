# RFQ Wizard — Packaging Spec Form v1 Implementation Plan

## สรุปความต้องการจากทีม (ChatGPT Conversation)

ทีม Art ได้ออกแบบระบบ Packaging Spec Form v1 ผ่าน ChatGPT โดยอิงจากเอกสาร Estimate ของบริษัท
ต้องเปลี่ยนจาก **flat ParsedSpec** (1 product) → **Project → Components[]** (หลายชิ้นงาน)

---

## 1. สิ่งที่ต้องการ (Requirements)

### 1.1 Project → Components[] Architecture
- 1 Project = 1 งานจากลูกค้า (เช่น "ZURU Whipped Mousse")
- 1 Project มีหลาย Component (เช่น Tray + Sleeve + Divider)
- แต่ละ Component มี spec เป็นของตัวเอง

### 1.2 Template Types 1-12 (Packaging)
| # | ชื่อ | คำอธิบาย |
|---|------|----------|
| 1 | Reverse Tuck End | กล่องฝาเสียบกลับด้าน |
| 2 | Straight Tuck End | กล่องฝาเสียบตรง |
| 3 | TTSLB (Tuck Top Snap Lock Bottom) | ฝาเสียบบน ล็อคก้น |
| 4 | TTAB (Tuck Top Auto Bottom) | ฝาเสียบบน ก้นอัตโนมัติ |
| 5 | Simplex Tray | ถาดธรรมดา |
| 6 | Frame-Vue Tray | ถาดมีกรอบ/หน้าต่าง |
| 7 | Four Corner Beers | กล่อง 4 มุม |
| 8 | Gable Top | กล่องหูหิ้ว |
| 9 | Sleeve | ปลอก/sleeve |
| 10 | Pillow Box | กล่องหมอน |
| 11 | Seal End | กล่องซีลปลาย |
| 12 | Custom | แบบพิเศษ |

### 1.3 Color Limit System
- **Light** — สีอ่อน หมึกน้อย (ต้นทุนต่ำ QC ง่าย)
- **Standard** — สีปกติ CMYK มาตรฐาน
- **Dark** — สีเข้ม/ทึบ หมึกหนัก (ต้นทุนสูง QC เข้มงวด)

### 1.4 Print & Color Detail (per Component)
- **Outside (ด้านนอก)**: print_type (offset/digital), สี (CMYK/special/mixed), color_limit, special_inks[] พร้อม Pantone ref
- **Inside (ด้านใน)**: เหมือน outside หรือ "no_print" (ไม่พิมพ์)

### 1.5 After Press Detail (per Component)
- **Diecut**: new (ทำแม่พิมพ์ใหม่) / existing (ใช้เดิม) / none
- **Assembly**: has_glue (ติดกาว), glue_spots (จำนวนจุดกาว)
- **Inspection**: normal / strict (เข้มงวด)
- **Coating**: OPP เงา, OPP ด้าน, UV spot, UV full, Aqueous
- **Foil Stamp**: ปั๊มฟอยล์ทอง/เงิน + พื้นที่
- **Emboss/Deboss**: ปั๊มนูน/ปั๊มลึก

### 1.6 Dimensions
- **Method A**: parameterized — W × L × D + flaps (dust, tuck, glue, overlap)
- **Method B**: dieline_file — อัพโหลดไฟล์ dieline

### 1.7 Blocking Rules (AI Ask-Back)
AI ถามได้ ≤3 คำถามต่อรอบ ตามลำดับ priority:
1. **quantity** — จำนวนพิมพ์ (ห้าม AI เดา)
2. **template_type** — แบบกล่อง 1-12
3. **dimension/dieline** — ขนาดหรือไฟล์ dieline
4. **material** — กระดาษ, แกรม, board type
5. **print + color_limit** — สีพิมพ์ + ระดับความเข้ม
6. **diecut** — ทำใหม่หรือใช้เดิม
7. **packing** — วิธีแพ็ค

### 1.8 Four Cost Blocks
| Block | รายการ |
|-------|--------|
| 1. Materials | กระดาษ + แม่พิมพ์ (plate) |
| 2. Print/Press | ค่าพิมพ์ + หมึกพิเศษ |
| 3. After Press | ไดคัท + ประกบ + เคลือบ + ฟอยล์ + emboss + QC |
| 4. Packing | แพ็ค + ขนส่ง + add-ons |

### 1.9 Workflow
```
Ingest → Classify → Extract (AI) → Validate (Blocking) → AI Ask-Back → AE Review → Lock for Estimate
```

---

## 2. แผนการทำงาน (Implementation Steps)

### Step 1: Backend Schemas
**File**: `backend/app/schemas/rfq.py`
- เพิ่ม Pydantic models (ไม่ลบของเดิม):
  - `PrintColorDetail` — print_type, colors, color_count, color_limit, special_inks[]
  - `AfterPressDetail` — diecut, assembly, inspection, coating, foil, emboss, deboss
  - `ComponentSpec` — component_name, template_type, dimensions, paper, outside, inside, after_press, finishing[], packing, quantity, extra_fields
  - `ProjectSpec` — project_name, customer, job_category, components[]
  - `BlockingQuestion` — field, component_name, question_th, options[], priority
  - Update `ChatResponse` เพิ่ม project_spec + blocking_questions

### Step 2: Backend Models
**File**: `backend/app/models/rfq.py`
- เพิ่ม SQLAlchemy tables:
  - `Project` — header (project_name, customer, brand, reference_no)
  - `Component` — dimensions_json, material_json, print_color_json, after_press_json, finishing_json, packing_json, quantity
  - `ComponentCalculation` — 4 cost blocks (materials, print, after_press, packing) + breakdown

### Step 3: Spec Converter
**New file**: `backend/app/core/spec_converter.py`
- `parsed_spec_to_project()` — แปลง ParsedSpec เดิม → ProjectSpec (1 component)
- `component_to_parsed_spec()` — แปลงกลับ backward compat

### Step 4: AI Prompts
**Files**: `backend/app/prompts/chat_assistant.py`, `parse_input.py`
- เพิ่ม Template Types 1-12 + Multi-component detection
- เปลี่ยน JSON format เป็น `{ "project": { "components": [...], "blocking_questions": [...] } }`
- เพิ่ม Blocking Rules + Color Limit + Print per side

### Step 5: Chat Route
**File**: `backend/app/api/routes/chat.py`
- Parse new project JSON format (fallback to legacy items[])
- Apply fix_dimensions/fix_quantity/ensure_extra_fields to each component
- Return project_spec + blocking_questions

### Step 6: Component Calculator
**New file**: `backend/app/core/calculator/component_calculator.py`
- Adapter: Component → flat params → pricing_v2() → 4 cost blocks
- ไม่แก้ pricing_v2.py

### Step 7: Project API Routes
**New file**: `backend/app/api/routes/project.py`
- POST /api/projects/ — create
- POST /api/projects/{id}/calculate — calculate all components

### Step 8: Frontend Types
**File**: `frontend/src/types/index.ts`
- เพิ่ม TemplateType, PrintColorDetail, AfterPressDetail, ComponentSpec, ProjectSpec, BlockingQuestion, ProjectCalcResult

### Step 9: Frontend Store
**File**: `frontend/src/lib/store.ts`
- parsedSpec → project: ProjectSpec
- เพิ่ม activeComponentIndex, component CRUD, blockingQuestions

### Step 10: Frontend API
**File**: `frontend/src/lib/api.ts`
- เพิ่ม calculateProject(), update chatMessage return type

### Step 11: SpecForm Sub-Components (New Files)
- `ComponentTabBar.tsx` — tabs สลับ component
- `TemplateTypeSelector.tsx` — grid เลือก template 1-12
- `PrintColorSection.tsx` — outside/inside print detail + color limit
- `AfterPressSection.tsx` — diecut, assembly, inspection, coating, foil, emboss

### Step 12: SpecForm Rewrite
**File**: `frontend/src/components/rfq/SpecForm.tsx`
- Tab bar + ComponentForm (active component)
- Calculate button → calculate ALL components

### Step 13: ChatInput + Blocking Questions
**New file**: `BlockingQuestionCards.tsx`
**Modify**: `ChatInput.tsx`
- แสดง blocking questions เป็น clickable chips
- Handle project_spec response

### Step 14: Results View
**New files**: `ComponentCostCard.tsx`, `CostBlocksRow.tsx`
**Modify**: `ResultsView.tsx`
- Per-component costs + 4 cost blocks summary + grand total

---

## 3. ไฟล์ที่ต้องสร้างใหม่

| ไฟล์ | คำอธิบาย |
|------|----------|
| `backend/app/core/spec_converter.py` | แปลง ParsedSpec ↔ ProjectSpec |
| `backend/app/core/calculator/component_calculator.py` | Adapter Component → pricing_v2 |
| `backend/app/api/routes/project.py` | Project CRUD + calculate endpoints |
| `frontend/src/components/rfq/ComponentTabBar.tsx` | Tab bar สลับ component |
| `frontend/src/components/rfq/TemplateTypeSelector.tsx` | Grid เลือก template 1-12 |
| `frontend/src/components/rfq/PrintColorSection.tsx` | Print & Color detail per side |
| `frontend/src/components/rfq/AfterPressSection.tsx` | After Press structured fields |
| (inline in ChatInput.tsx) | AI ask-back question chips (BlockingQuestionCards) |
| `frontend/src/components/rfq/ComponentCostCard.tsx` | Per-component cost breakdown |
| `frontend/src/components/rfq/CostBlocksRow.tsx` | 4 cost blocks summary |

## 4. ไฟล์ที่ต้องแก้ไข

| ไฟล์ | สิ่งที่แก้ |
|------|-----------|
| `backend/app/schemas/rfq.py` | เพิ่ม new schemas |
| `backend/app/models/rfq.py` | เพิ่ม Project, Component, ComponentCalculation tables |
| `backend/app/prompts/chat_assistant.py` | New JSON format + blocking rules + templates |
| `backend/app/prompts/parse_input.py` | New JSON format |
| `backend/app/api/routes/chat.py` | Parse project JSON + blocking questions |
| `backend/app/main.py` | Register project router |
| `frontend/src/types/index.ts` | เพิ่ม new types |
| `frontend/src/lib/store.ts` | Project-based state |
| `frontend/src/lib/api.ts` | เพิ่ม API calls |
| `frontend/src/components/rfq/SpecForm.tsx` | Rewrite with tab bar + component form |
| `frontend/src/components/rfq/ChatInput.tsx` | Handle project_spec + blocking questions |
| `frontend/src/components/views/SpecReviewView.tsx` | Pass project instead of single spec |
| `frontend/src/components/views/ResultsView.tsx` | Per-component results |

---

## 5. Verification Checklist

- [ ] พิมพ์ "กล่อง tray+sleeve 10x15x5 ซม. 300 แกรม 4 สี" → AI แยก 2 components
- [ ] AI ถาม blocking questions ≤3 ข้อ → แสดงเป็น clickable chips
- [ ] คลิก chip ตอบ → AI อัพเดท spec → ถามคำถามถัดไป
- [ ] Blocking questions หมด → auto-transition to Spec view
- [ ] Spec view มี tab bar [Tray] [Sleeve] สลับได้
- [ ] แต่ละ tab มี Template Type, Print & Color, Color Limit, After Press
- [ ] กด Calculate → per-component cost + 4 cost blocks + grand total
- [ ] Backward compat: งาน 1 ชิ้นทำงานปกติ
- [ ] Dark mode ทำงานทุก view
