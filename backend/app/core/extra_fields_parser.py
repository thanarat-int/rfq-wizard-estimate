"""
Fallback parser for extracting extra_fields from raw input text.
When the AI doesn't return extra_fields, this module analyzes the original input
and extracts all key-value data that wasn't captured in standard fields.
"""

import re
from typing import Optional


# Standard fields that already have dedicated form fields
STANDARD_KEYS = {
    "product_type", "product_name", "dimensions", "paper", "colors_front",
    "colors_back", "quantity", "finishing", "special_instructions", "job_category",
    "width", "height", "depth", "unit", "type", "code", "gsm", "confidence",
    "missing_fields", "suggestions", "extra_fields",
}

# Known key patterns to extract (Thai + English)
KEY_PATTERNS = [
    # Date
    (r"(?:Date|วันที่)\s*[:：]\s*(.+)", "วันที่"),
    # Customer/Brand
    (r"(?:CUSTOMER|BRAND|Customer|Brand|ลูกค้า|แบรนด์)\s*[/:：]*\s*(.+)", "ลูกค้า/แบรนด์"),
    # Project name
    (r"(?:PROJECT\s*NAME|Project\s*Name|ชื่อโปรเจ็กต์|โปรเจ็กต์)\s*[:：]\s*(.+)", "ชื่อโปรเจ็กต์"),
    # Net weight
    (r"(?:NET\s*WEIGHT|Net\s*Weight|น้ำหนัก)\s*[:：]?\s*(.+)", "น้ำหนักสินค้า"),
    # Can/Bottle size
    (r"(?:CAN\s*SIZE|Can\s*Size|BOTTLE\s*SIZE|Bottle\s*Size|ขนาดกระป๋อง|ขนาดขวด)\s*[:：]?\s*(.+)", "ขนาดกระป๋อง/ขวด"),
    # EOE
    (r"(?:EOE)\s*[:：]?\s*(.+)", "EOE"),
    # Score line
    (r"(?:Score\s*line|SCORE\s*LINE)\s*[:：]?\s*(.+)", "Score line"),
    # Material (not paper)
    (r"(?:MATERIAL\s*GRADE|Material\s*Grade)\s*[:：]?\s*(.+)", "Material Grade"),
    (r"(?:MATERIAL|Material|วัสดุ)\s*[:：]\s*(.+)", "วัสดุ/Material"),
    # Coating
    (r"(?:COATING|Coating|เคลือบ)\s*[:：]\s*(.+)", "Coating"),
    # Extent
    (r"(?:Extent|EXTENT|จำนวนหน้า)\s*[:：]\s*(.+)", "Extent/จำนวนหน้า"),
    # Binding
    (r"(?:Binding|BINDING|เข้าเล่ม)\s*[:：]\s*(.+)", "Binding/เข้าเล่ม"),
    # Packing
    (r"(?:Packing|PACKING|บรรจุ)\s*[:：]\s*(.+)", "Packing/บรรจุ"),
    # Shipping
    (r"(?:Shipping\s*terms?|SHIPPING|FOB|การจัดส่ง)\s*[:：]\s*(.+)", "Shipping/การจัดส่ง"),
    # Orientation
    (r"(?:Orientation|ORIENTATION|แนว)\s*[:：]?\s*(Portrait|Landscape|แนวตั้ง|แนวนอน)", "Orientation"),
    # Proofs
    (r"(?:Proofs?|PROOFS?)\s*[:：]\s*(.+)", "Proofs"),
    # Cans per tray/case
    (r"(\d+)\s*(?:Cans?|cans?|กระป๋อง)\s*/?\s*(?:Tray|tray|Case|case)", "จำนวนต่อ Tray/Case"),
    # Text/Cover specification
    (r"(?:Text\s*/?\s*Cover|TEXT\s*/?\s*COVER)\s*[:：]\s*(.+)", "Text/Cover"),
    # Quantity note with specific format
    (r"(?:COLOR\s*QTY|Colour\s*Qty)\s*[-:：]\s*(.+)", "Color Qty"),
]


def extract_extra_fields_from_text(
    raw_input: str,
    parsed_spec: Optional[dict] = None,
) -> list[dict]:
    """
    Parse raw input text and extract key-value pairs as extra_fields.
    Skips data that's already captured in standard parsed_spec fields.
    """
    if not raw_input:
        return []

    extra_fields = []
    used_labels = set()

    # Track which raw keys we've already matched (to prevent duplicates)
    matched_raw_keys = set()

    # Method 1: Match known key patterns
    for pattern, label in KEY_PATTERNS:
        match = re.search(pattern, raw_input, re.IGNORECASE)
        if match and label not in used_labels:
            value = match.group(1).strip().rstrip(",;")
            if value and len(value) > 0:
                extra_fields.append({
                    "label": label,
                    "value": value,
                    "field_type": "text",
                })
                used_labels.add(label)
                # Mark the raw key text so generic parser won't duplicate it
                raw_key_match = re.search(r"([A-Za-zก-๙/\s\-\.]+?)\s*[:=：]", match.group(0))
                if raw_key_match:
                    matched_raw_keys.add(raw_key_match.group(1).strip().lower())

    # Method 2: Generic "Key: Value" pattern for anything we missed
    # Match lines like "Key: value" or "Key = value"
    generic_matches = re.findall(
        r"(?:^|\n)\s*([A-Za-zก-๙/\s\-\.]+?)\s*[:=：]\s*(.+?)(?:\n|$)",
        raw_input,
    )
    for key, value in generic_matches:
        key = key.strip()
        value = value.strip().rstrip(",;")

        # Skip if already captured or is a standard field
        if not key or not value or len(key) > 40:
            continue
        normalized = key.lower().replace(" ", "_")
        if normalized in STANDARD_KEYS:
            continue
        if key in used_labels:
            continue
        # Skip if raw key was already matched by known patterns
        if key.lower() in matched_raw_keys:
            continue

        # Skip keys that map to standard fields
        skip_keys = [
            "size", "ขนาด", "color", "สี", "quantity", "จำนวน",
            "paper", "กระดาษ", "type", "ประเภท",
        ]
        if any(sk in key.lower() for sk in skip_keys):
            # But "Can Size" or "Color Qty" should NOT be skipped
            if not any(special in key.lower() for special in ["can", "bottle", "color qty", "colour"]):
                continue

        extra_fields.append({
            "label": key,
            "value": value,
            "field_type": "text",
        })
        used_labels.add(key)

    # Method 3: Check for Portrait/Landscape keyword not captured
    if "Orientation" not in used_labels and "แนว" not in used_labels:
        if re.search(r"\(Portrait\)", raw_input, re.IGNORECASE):
            extra_fields.append({"label": "Orientation", "value": "Portrait", "field_type": "text"})
        elif re.search(r"\(Landscape\)", raw_input, re.IGNORECASE):
            extra_fields.append({"label": "Orientation", "value": "Landscape", "field_type": "text"})

    return extra_fields


def ensure_extra_fields(
    parsed_spec_dict: dict,
    raw_input: str,
) -> dict:
    """
    Ensure parsed_spec has extra_fields populated.
    If AI didn't return them, use fallback parser.
    """
    existing = parsed_spec_dict.get("extra_fields") or []

    # If AI already returned extra_fields, keep them
    if existing and len(existing) > 0:
        return parsed_spec_dict

    # Fallback: extract from raw input
    extracted = extract_extra_fields_from_text(raw_input, parsed_spec_dict)
    if extracted:
        parsed_spec_dict["extra_fields"] = extracted

    return parsed_spec_dict
