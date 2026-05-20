"""
Dimension fixer — overrides AI-converted dimensions with original values from raw input.

Problem: AI model sometimes converts inches to cm despite being told not to.
Solution: Parse raw input for dimension patterns, detect original unit, and override.
"""

import re
import logging

logger = logging.getLogger(__name__)


def _parse_fraction(s: str) -> float:
    """Parse fraction strings like '6-1/4', '7.1/2', '6 1/4' into float."""
    s = s.strip()

    # Pattern: "6-1/4" or "6 1/4" (mixed number with dash or space)
    m = re.match(r'^(\d+)[\s\-](\d+)/(\d+)$', s)
    if m:
        whole, num, den = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return whole + num / den

    # Pattern: "7.1/2" (whole.numerator/denominator — common typo format)
    m = re.match(r'^(\d+)\.(\d+)/(\d+)$', s)
    if m:
        whole, num, den = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return whole + num / den

    # Pattern: simple fraction "1/2"
    m = re.match(r'^(\d+)/(\d+)$', s)
    if m:
        return int(m.group(1)) / int(m.group(2))

    # Pattern: plain number "6.25"
    try:
        return float(s)
    except ValueError:
        return None


def _detect_dimensions_from_input(raw_input: str) -> dict | None:
    """
    Parse raw input text to find dimension patterns and their original unit.
    Returns {width, height, depth (optional), unit} or None.
    """
    if not raw_input:
        return None

    # Normalize input
    text = raw_input.replace('\r\n', '\n').replace('\r', '\n')

    # ---- INCH patterns ----
    # "6-1/4" x 7.1/2"" or "6-1/4 x 7.1/2 inch" or "6.25" x 7.5""
    # Also: 6-1/4" x 7-1/2" x 3"
    # Number part: integer, decimal, fraction (6-1/4, 7.1/2, 6 1/4)
    num_pat = r'(\d+[\-\s]\d+/\d+|\d+\.\d+/\d+|\d+/\d+|\d+\.?\d*)'

    # With " (inch mark) — e.g., 6-1/4" x 7.1/2"
    inch_pat = re.compile(
        num_pat + r'\s*["\u201D\u2033]'   # first dimension + inch mark
        r'\s*[xX×]\s*'
        + num_pat + r'\s*["\u201D\u2033]'  # second dimension + inch mark
        r'(?:\s*[xX×]\s*' + num_pat + r'\s*["\u201D\u2033])?',  # optional third
        re.IGNORECASE
    )
    m = inch_pat.search(text)
    if m:
        w = _parse_fraction(m.group(1))
        h = _parse_fraction(m.group(2))
        d = _parse_fraction(m.group(3)) if m.group(3) else None
        if w and h:
            result = {"width": w, "height": h, "unit": "inch"}
            if d:
                result["depth"] = d
            logger.info(f"[DIM_FIX] Detected inch dimensions from quotes: {result}")
            return result

    # With "inch"/"inches" keyword — e.g., 6.25 x 7.5 inches
    inch_kw_pat = re.compile(
        num_pat + r'\s*[xX×]\s*' + num_pat +
        r'(?:\s*[xX×]\s*' + num_pat + r')?' +
        r'\s*(?:inch|inches|in)\b',
        re.IGNORECASE
    )
    m = inch_kw_pat.search(text)
    if m:
        w = _parse_fraction(m.group(1))
        h = _parse_fraction(m.group(2))
        d = _parse_fraction(m.group(3)) if m.group(3) else None
        if w and h:
            result = {"width": w, "height": h, "unit": "inch"}
            if d:
                result["depth"] = d
            logger.info(f"[DIM_FIX] Detected inch dimensions from keyword: {result}")
            return result

    # ---- CM patterns ----
    cm_pat = re.compile(
        num_pat + r'\s*[xX×]\s*' + num_pat +
        r'(?:\s*[xX×]\s*' + num_pat + r')?' +
        r'\s*(?:cm|ซม\.?|เซนติเมตร)',
        re.IGNORECASE
    )
    m = cm_pat.search(text)
    if m:
        w = _parse_fraction(m.group(1))
        h = _parse_fraction(m.group(2))
        d = _parse_fraction(m.group(3)) if m.group(3) else None
        if w and h:
            result = {"width": w, "height": h, "unit": "cm"}
            if d:
                result["depth"] = d
            logger.info(f"[DIM_FIX] Detected cm dimensions: {result}")
            return result

    # ---- MM patterns ----
    mm_pat = re.compile(
        num_pat + r'\s*[xX×]\s*' + num_pat +
        r'(?:\s*[xX×]\s*' + num_pat + r')?' +
        r'\s*(?:mm|มม\.?|มิลลิเมตร)',
        re.IGNORECASE
    )
    m = mm_pat.search(text)
    if m:
        w = _parse_fraction(m.group(1))
        h = _parse_fraction(m.group(2))
        d = _parse_fraction(m.group(3)) if m.group(3) else None
        if w and h:
            result = {"width": w, "height": h, "unit": "mm"}
            if d:
                result["depth"] = d
            logger.info(f"[DIM_FIX] Detected mm dimensions: {result}")
            return result

    # ---- นิ้ว (Thai inch) ----
    thai_inch_pat = re.compile(
        num_pat + r'\s*[xX×]\s*' + num_pat +
        r'(?:\s*[xX×]\s*' + num_pat + r')?' +
        r'\s*(?:นิ้ว)',
        re.IGNORECASE
    )
    m = thai_inch_pat.search(text)
    if m:
        w = _parse_fraction(m.group(1))
        h = _parse_fraction(m.group(2))
        d = _parse_fraction(m.group(3)) if m.group(3) else None
        if w and h:
            result = {"width": w, "height": h, "unit": "inch"}
            if d:
                result["depth"] = d
            logger.info(f"[DIM_FIX] Detected Thai inch dimensions: {result}")
            return result

    return None


def fix_dimensions(parsed_item: dict, raw_input: str) -> dict:
    """
    Compare AI-parsed dimensions with raw input.
    If AI converted units (e.g., inch→cm), override with original values.
    """
    if not raw_input:
        return parsed_item

    detected = _detect_dimensions_from_input(raw_input)
    if not detected:
        return parsed_item

    ai_dims = parsed_item.get("dimensions")
    if not ai_dims:
        # AI didn't parse dimensions at all — use detected
        parsed_item["dimensions"] = detected
        logger.info(f"[DIM_FIX] AI had no dimensions, using detected: {detected}")
        return parsed_item

    ai_unit = (ai_dims.get("unit") or "cm").lower().strip()
    detected_unit = detected["unit"]

    # If units already match, check if values are close
    if ai_unit == detected_unit:
        # Values should match — override anyway for precision (fraction parsing)
        ai_dims["width"] = detected["width"]
        ai_dims["height"] = detected["height"]
        if "depth" in detected:
            ai_dims["depth"] = detected["depth"]
        logger.info(f"[DIM_FIX] Units match ({ai_unit}), refined values: {ai_dims}")
        return parsed_item

    # Units DON'T match — AI converted! Override with original values
    logger.warning(
        f"[DIM_FIX] AI converted units! AI={ai_unit}, Input={detected_unit}. "
        f"AI values: {ai_dims.get('width')}x{ai_dims.get('height')}, "
        f"Original: {detected['width']}x{detected['height']} {detected_unit}"
    )
    ai_dims["width"] = detected["width"]
    ai_dims["height"] = detected["height"]
    ai_dims["unit"] = detected_unit
    if "depth" in detected:
        ai_dims["depth"] = detected["depth"]
    elif ai_unit != detected_unit and "depth" in ai_dims:
        # AI had a depth from conversion — remove if not in original
        pass  # keep AI's depth, might be from other info

    logger.info(f"[DIM_FIX] Corrected dimensions: {ai_dims}")
    return parsed_item


def _input_has_quantity(raw_input: str) -> bool:
    """Check if raw input text contains any quantity/number-of-copies info."""
    if not raw_input:
        return False
    text = raw_input.lower()
    # Look for quantity keywords
    qty_patterns = [
        r'\b\d[\d,]*\s*(?:pcs|pieces|copies|ชิ้น|ใบ|แผ่น|เล่ม|ซอง|ถุง|กล่อง|ดวง)\b',
        r'(?:quantity|qty|จำนวน)\s*[:=]?\s*\d',
        r'\b\d[\d,]*\s*(?:sets?|ชุด)\b',
    ]
    for pat in qty_patterns:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False


def fix_quantity(parsed_item: dict, raw_input: str) -> dict:
    """
    If the input doesn't mention quantity but AI invented one, reset to 0.
    """
    ai_qty = parsed_item.get("quantity")
    if ai_qty and ai_qty > 0 and not _input_has_quantity(raw_input):
        logger.warning(f"[DIM_FIX] AI invented quantity={ai_qty} but input has none. Setting to 0.")
        parsed_item["quantity"] = 0
    return parsed_item
