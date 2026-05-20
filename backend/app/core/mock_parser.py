"""
Mock parser — heuristic (regex-based) spec extraction used when no real LLM
(ANTHROPIC_API_KEY) is configured.

It returns the same JSON shape that ai_engine.parse_input() would produce from
the Claude model, so the rest of the pipeline (chat.parse route → _process_component
→ /projects/calculate) works end-to-end without an API key.

This is NOT a replacement for the real model — it only understands the common
Thai/English print-spec patterns well enough to drive the estimate flow for demos.
"""
import re
import logging

logger = logging.getLogger(__name__)


# ================================================================
# Dimensions
# ================================================================
_DIM_RE = re.compile(
    r'(\d+(?:\.\d+)?)\s*[xX×\*]\s*(\d+(?:\.\d+)?)'
    r'(?:\s*[xX×\*]\s*(\d+(?:\.\d+)?))?'
    r'\s*(cm|mm|นิ้ว|inches|inch|in|ซม\.?|มม\.?)?',
    re.IGNORECASE,
)


def _norm_unit(raw: str | None) -> str:
    if not raw:
        return "cm"
    r = raw.lower().strip()
    if r.startswith("mm") or r.startswith("มม"):
        return "mm"
    if r.startswith("cm") or r.startswith("ซม"):
        return "cm"
    if r in ("นิ้ว",) or r.startswith("inch") or r == "in":
        return "inch"
    return "cm"


def _extract_dimensions(text: str) -> dict | None:
    m = _DIM_RE.search(text)
    if not m:
        return None
    try:
        width = float(m.group(1))
        height = float(m.group(2))
    except (TypeError, ValueError):
        return None
    if width <= 0 or height <= 0:
        return None
    dims = {
        "width": width,
        "height": height,
        "depth": float(m.group(3)) if m.group(3) else None,
        "unit": _norm_unit(m.group(4)),
        "reference": None,
        "orientation": "portrait" if height >= width else "landscape",
    }
    return dims


# ================================================================
# Quantity
# ================================================================
_QTY_LABEL_RE = re.compile(r'(?:จำนวน|ยอดสั่ง|qty|quantity|order)\s*[:=]?\s*([\d,]+)', re.IGNORECASE)
_QTY_UNIT_RE = re.compile(
    r'([\d,]+)\s*(?:ใบ|ชิ้น|แผ่น|เล่ม|ซอง|ถุง|ดวง|กล่อง|ชุด|pcs|pieces|copies|sets?|units?)',
    re.IGNORECASE,
)


def _extract_quantity(text: str) -> int:
    for rx in (_QTY_LABEL_RE, _QTY_UNIT_RE):
        m = rx.search(text)
        if m:
            try:
                val = int(m.group(1).replace(",", ""))
                if val > 0:
                    return val
            except ValueError:
                continue
    return 0


# ================================================================
# Paper
# ================================================================
_GSM_RE = re.compile(r'(\d{2,4})\s*(?:gsm|g/m2|g/m²|gram|grams|แกรม|g)\b', re.IGNORECASE)


def _extract_paper(text_low: str) -> dict:
    # gsm
    gsm = 300
    mg = _GSM_RE.search(text_low)
    if mg:
        try:
            g = int(mg.group(1))
            if 30 <= g <= 2000:
                gsm = g
        except ValueError:
            pass

    # code — check specific before generic
    code, ptype, family = "AC C1s", "Art Card C1S", "paperboard"
    if "c2s" in text_low:
        code, ptype = "AC C2s", "Art Card C2S"
    elif "c1s" in text_low or "อาร์ตการ์ด" in text_low or "art card" in text_low or "sbs" in text_low:
        code, ptype = "AC C1s", "Art Card C1S"
    elif "อาร์ตด้าน" in text_low or "matt art" in text_low or "matte art" in text_low:
        code, ptype = "MA", "Matt Art"
    elif "อาร์ตมัน" in text_low or "อาร์ตเงา" in text_low or "gloss art" in text_low or "อาร์ต" in text_low:
        code, ptype = "GA", "Gloss Art"
    elif "woodfree" in text_low or "ปอนด์" in text_low or "bond paper" in text_low:
        code, ptype, family = "WF", "Woodfree", "paper"
    elif "kraft" in text_low or "คราฟท" in text_low:
        code, ptype = "KS", "Kraft"
    elif "ivory" in text_low or "ไอวอรี" in text_low:
        code, ptype = "AC C1s", "Ivory Board"

    return {"family": family, "type": ptype, "code": code, "gsm": gsm, "brand": None}


# ================================================================
# Colours
# ================================================================
_CXC_RE = re.compile(r'(\d)\s*c\s*[xX×/+]\s*(\d)\s*c', re.IGNORECASE)
_FRONT_RE = re.compile(r'(?:พิมพ์\s*)?(\d)\s*สี')
_BACK_RE = re.compile(r'(\d)\s*สี\s*(?:ด้าน)?(?:ใน|หลัง)')

_NO_INSIDE = ("ไม่พิมพ์ใน", "ไม่พิมพ์ด้านใน", "ไม่พิมพ์ข้างใน", "พิมพ์หน้าเดียว",
              "พิมพ์ด้านเดียว", "no print inside", "one side", "single side")


def _extract_colors(text_low: str) -> tuple[int, int]:
    front, back = 4, 0
    m = _CXC_RE.search(text_low)
    if m:
        front, back = int(m.group(1)), int(m.group(2))
    else:
        mf = _FRONT_RE.search(text_low)
        if mf:
            front = int(mf.group(1))
        mb = _BACK_RE.search(text_low)
        if mb:
            back = int(mb.group(1))
    if any(k in text_low for k in _NO_INSIDE):
        back = 0
    front = max(0, min(front, 8))
    back = max(0, min(back, 8))
    return front, back


# ================================================================
# Template type (packaging 1-12)
# ================================================================
def _detect_template(text_low: str) -> int | None:
    rules = [
        (("reverse tuck", "rte", "รีเวิร์สทัค"), 1),
        (("straight tuck", "ste", "สเตรททัค"), 2),
        (("snap lock", "ttslb"), 3),
        (("auto bottom", "ttab", "auto-lock"), 4),
        (("simplex tray", "เทรย์", "tray"), 5),
        (("frame vue", "frame-vue", "frame view"), 6),
        (("four corner", "beer"), 7),
        (("gable",), 8),
        (("sleeve", "สลีฟ"), 9),
        (("pillow", "หมอน"), 10),
        (("seal end",), 11),
    ]
    for keys, tid in rules:
        if any(k in text_low for k in keys):
            return tid
    if any(k in text_low for k in ("กล่อง", "box", "carton box")):
        return 1  # most common box template
    return None


# ================================================================
# Job category
# ================================================================
_PACKAGING_KW = ("กล่อง", "box", "tray", "sleeve", "ฉลาก", "label", "sticker",
                 "สติ๊กเกอร์", "สติกเกอร์", "ถุง", "bag", "ซอง", "envelope",
                 "pouch", "packaging", "บรรจุภัณฑ์", "carton")
_BOOK_KW = ("หนังสือ", "book", "brochure", "โบรชัวร์", "แผ่นพับ", "leaflet",
            "flyer", "ใบปลิว", "catalog", "แคตตาล็อก", "magazine", "นิตยสาร",
            "poster", "โปสเตอร์", "นามบัตร", "name card", "booklet")


def _detect_job_category(text_low: str) -> str:
    pack = sum(1 for k in _PACKAGING_KW if k in text_low)
    book = sum(1 for k in _BOOK_KW if k in text_low)
    return "book_commercial" if book > pack else "packaging"


# ================================================================
# Finishing / after-press
# ================================================================
def _extract_finishing(text_low: str, job_category: str) -> tuple[dict, list[str]]:
    finishing: list[str] = []
    coating = None
    foil = None
    emboss = False
    deboss = False

    if "opp ด้าน" in text_low or "เคลือบ opp ด้าน" in text_low or "matt lam" in text_low or "matte lam" in text_low:
        coating = "เคลือบ OPP ด้าน"
    elif "opp เงา" in text_low or "เคลือบ opp เงา" in text_low or "gloss lam" in text_low:
        coating = "เคลือบ OPP เงา"
    elif "spot uv" in text_low or "uv เฉพาะจุด" in text_low:
        finishing.append("เคลือบ UV เฉพาะจุด")
    elif "uv" in text_low and "เคลือบ" in text_low:
        coating = "เคลือบ UV เต็มแผ่น"
    elif "วานิช" in text_low or "varnish" in text_low or "aqueous" in text_low:
        coating = "Aqueous"

    if "ฟอยล์" in text_low or "foil" in text_low:
        if "ทอง" in text_low or "gold" in text_low:
            foil = "ปั๊มฟอยล์ทอง"
        elif "เงิน" in text_low or "silver" in text_low:
            foil = "ปั๊มฟอยล์เงิน"
        else:
            foil = "ปั๊มฟอยล์"

    if "ปั๊มนูน" in text_low or "emboss" in text_low:
        emboss = True
    if "ปั๊มจม" in text_low or "ปั๊มลึก" in text_low or "deboss" in text_low:
        deboss = True

    has_diecut = any(k in text_low for k in ("ไดคัท", "diecut", "die cut", "die-cut"))
    has_glue = any(k in text_low for k in ("ประกบ", "ติดกาว", "ปะกล่อง", "glue", "gluing"))

    is_packaging_box = job_category == "packaging"

    after_press = {
        "diecut": {
            "status": "new" if (has_diecut or is_packaging_box) else "none",
            "reference": "",
        },
        "assembly": {
            "has_glue": bool(has_glue or is_packaging_box),
            "glue_spots": 2 if (has_glue or is_packaging_box) else 0,
        },
        "inspection": "normal",
        "coating": coating,
        "foil": foil,
        "emboss": emboss,
        "deboss": deboss,
    }

    if coating and coating not in finishing:
        finishing.append(coating)
    if foil and foil not in finishing:
        finishing.append(foil)
    if emboss:
        finishing.append("ปั๊มนูน")
    if deboss:
        finishing.append("ปั๊มลึก")
    if has_diecut or is_packaging_box:
        finishing.append("ไดคัท")
    if has_glue or is_packaging_box:
        finishing.append("ประกบ")

    # de-dup, keep order
    seen = set()
    finishing = [f for f in finishing if not (f in seen or seen.add(f))]
    return after_press, finishing


# ================================================================
# Customer
# ================================================================
_CUSTOMER_RE = re.compile(
    r'(?:ลูกค้า|ชื่อลูกค้า|customer|client|cust)\s*[:：]?\s*(.+)',
    re.IGNORECASE,
)


def _extract_customer(text: str) -> str | None:
    for line in text.splitlines():
        m = _CUSTOMER_RE.search(line)
        if m:
            val = m.group(1).strip().strip(",;.")
            if val and len(val) <= 60:
                return val
    m = re.search(r'คุณ\s*([฀-๿]+)', text)
    if m:
        return "คุณ" + m.group(1)
    return None


# ================================================================
# Public entry point
# ================================================================
def mock_parse_input(input_text: str) -> dict:
    """Heuristically parse free-text print spec into the project JSON format."""
    text = (input_text or "").strip()
    text_low = text.lower()

    if not text:
        return {
            "project": {"job_category": "packaging", "currency": "THB",
                        "components": [], "blocking_questions": []},
            "confidence": 0.0,
            "missing_fields": ["input"],
            "suggestions": "ไม่มีข้อมูลให้วิเคราะห์",
        }

    job_category = _detect_job_category(text_low)
    dims = _extract_dimensions(text)
    quantity = _extract_quantity(text)
    customer = _extract_customer(text)
    paper = _extract_paper(text_low)
    colors_front, colors_back = _extract_colors(text_low)
    template_type = _detect_template(text_low) if job_category == "packaging" else None
    after_press, finishing = _extract_finishing(text_low, job_category)

    # component name = first meaningful line that isn't a metadata line
    component_name = "ชิ้นงาน 1"
    for _ln in text.splitlines():
        _s = _ln.strip()
        if _s and not _CUSTOMER_RE.search(_s):
            component_name = _s[:60]
            break

    outside = {
        "print_type": "offset" if colors_front > 0 else "no_print",
        "colors": "cmyk" if colors_front >= 4 else ("special" if colors_front > 0 else "none"),
        "color_count": colors_front,
        "color_limit": "standard",
        "special_inks": [],
    }
    if colors_back > 0:
        inside = {
            "print_type": "offset",
            "colors": "cmyk" if colors_back >= 4 else "special",
            "color_count": colors_back,
            "color_limit": "standard",
            "special_inks": [],
        }
    else:
        inside = "no_print"

    component = {
        "component_name": component_name,
        "template_type": template_type,
        "job_category": job_category,
        "role": "primary",
        "dimensions": dims,
        "paper": paper,
        "outside": outside,
        "inside": inside,
        "after_press": after_press,
        "finishing": finishing,
        "packing": {"method": "carton", "pallet_req": False} if job_category == "packaging" else None,
        "quantity": quantity,
        "pages": None,
        "pages_text": None,
        "binding": None,
        "extra_fields": [],
        "confidence": 0.7,
    }

    # Missing-field detection → real blocking questions so the user is guided
    # to a complete spec that the calculator can actually price.
    missing_fields = []
    blocking_questions = []
    if quantity <= 0:
        missing_fields.append("quantity")
        blocking_questions.append({
            "field": "quantity",
            "component_name": None,
            "question_th": "ต้องการผลิตจำนวนกี่ชิ้น?",
            "options": ["1,000", "3,000", "5,000", "10,000"],
            "priority": 1,
        })
    if not dims:
        missing_fields.append("dimensions")
        blocking_questions.append({
            "field": "dimensions",
            "component_name": None,
            "question_th": "ขนาดงานเท่าไหร่? ระบุ กว้าง x ยาว x ลึก เช่น 10x15x5 cm",
            "options": [],
            "priority": 2,
        })

    # confidence reflects how much we could extract
    found = sum([bool(dims), quantity > 0, True, colors_front > 0])
    confidence = round(0.4 + 0.15 * found, 2)

    logger.info(
        f"[MOCK_PARSE] category={job_category} template={template_type} "
        f"dims={dims} qty={quantity} paper={paper['code']}/{paper['gsm']} "
        f"colors={colors_front}/{colors_back} finishing={finishing}"
    )

    return {
        "project": {
            "project_name": None,
            "customer": customer,
            "brand": None,
            "reference_no": None,
            "job_category": job_category,
            "currency": "THB",
            "components": [component],
            "blocking_questions": blocking_questions,
        },
        "confidence": confidence,
        "missing_fields": missing_fields,
        "suggestions": "วิเคราะห์ด้วยโหมด Mockup (heuristic) — ตรวจสอบและแก้ไขข้อมูลในฟอร์มก่อนคำนวณได้",
    }


def mock_chat_reply(message: str) -> str:
    """Friendly placeholder reply for chat endpoints in mock mode."""
    return (
        "🔧 โหมด Mockup — ยังไม่ได้เชื่อมต่อ LLM จริง\n\n"
        "ระบบกำลังใช้ตัวแยก Spec แบบ heuristic คุณสามารถแก้ไขข้อมูลในฟอร์มด้านซ้าย "
        "ได้โดยตรง แล้วกด \"คำนวณ\" เพื่อดูราคาประเมินได้เลย\n\n"
        "หากต้องการให้ AI ช่วยวิเคราะห์/ตอบคำถามจริง กรุณาตั้งค่า ANTHROPIC_API_KEY "
        "ในไฟล์ backend/.env แล้วรีสตาร์ท backend"
    )
