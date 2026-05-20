"""Import machine specs from all spec machine.xls into DB."""
import os
import re
import xlrd
from sqlalchemy.orm import Session
from app.models.master_data import Machine


DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "all spec machine.xls")


def run_import(db: Session) -> dict:
    filepath = os.path.normpath(DATA_FILE)
    if not os.path.exists(filepath):
        return {"success": False, "imported": 0, "errors": [f"File not found: {filepath}"]}

    wb = xlrd.open_workbook(filepath, encoding_override="utf-8")
    imported = 0
    errors = []

    for sheet_name in wb.sheet_names():
        sheet = wb.sheet_by_name(sheet_name)
        if sheet.nrows < 2:
            continue

        handler = SHEET_HANDLERS.get(sheet_name)
        if handler:
            count, errs = handler(db, sheet, sheet_name)
            imported += count
            errors.extend(errs)

    db.commit()
    return {"success": True, "imported": imported, "errors": errors}


# ================================================================
# Sheet handlers — each sheet has different column structure
# ================================================================

def _import_sheetfed(db: Session, sheet, sheet_name: str):
    """Sheet 'Sheet' — Sheet-fed offset printing machines."""
    count = 0
    errs = []
    for r in range(1, sheet.nrows):
        try:
            row = [sheet.cell_value(r, c) for c in range(sheet.ncols)]
            name = _str(row[0]) or _str(row[1])
            if not name or name.startswith("ลำดับ") or name.startswith("Machine"):
                continue

            speed = _int_val(row[3])
            if not speed:
                continue

            # Parse paper size "820x1143" format
            paper_max = _parse_size(_str(row[4]))
            paper_min = _parse_size(_str(row[5]))
            print_max = _parse_size(_str(row[6]))
            print_min = _parse_size(_str(row[7]))
            plate_size = _parse_size(_str(row[8]))

            # Parse gsm range from "Spec" or "Paper" columns
            gsm_min, gsm_max = _parse_gsm_range(row, 9, 10)

            # Parse colors from name
            colors = _parse_colors(name)

            machine = Machine(
                name=name.strip(),
                department="sheet",
                machine_category="offset",
                type="offset",
                setup_time_min=_int_val(row[2]) or 0,
                speed_sheets_per_hour=speed,
                max_paper_w=paper_max[0], max_paper_h=paper_max[1],
                min_paper_w=paper_min[0], min_paper_h=paper_min[1],
                max_print_w=print_max[0], max_print_h=print_max[1],
                plate_size_w=plate_size[0], plate_size_h=plate_size[1],
                gsm_min=gsm_min, gsm_max=gsm_max,
                max_colors=colors,
                max_width=paper_max[0], max_height=paper_max[1],
                min_width=paper_min[0], min_height=paper_min[1],
                active=True,
            )
            db.add(machine)
            count += 1
        except Exception as e:
            errs.append(f"Sheet '{sheet_name}' row {r}: {e}")
    return count, errs


def _import_web(db: Session, sheet, sheet_name: str):
    """Sheet 'Web' — Web press machines."""
    count = 0
    errs = []
    for r in range(1, sheet.nrows):
        try:
            row = [sheet.cell_value(r, c) for c in range(sheet.ncols)]
            name = _str(row[1])  # col B
            if not name or "Machine" in name:
                continue

            speed = _int_val(row[3]) or _int_val(row[4])
            if not speed:
                continue

            paper_max = _parse_size(_str(row[5]))
            paper_min = _parse_size(_str(row[6]))
            print_max = _parse_size(_str(row[7]))
            print_min = _parse_size(_str(row[8]))
            plate_size = _parse_size(_str(row[9]))
            gsm_min, gsm_max = _parse_gsm_range(row, 10, 11)

            machine = Machine(
                name=name.strip(),
                department="web",
                machine_category="offset_web",
                type="offset",
                setup_time_min=_int_val(row[2]) or 0,
                speed_sheets_per_hour=speed,
                max_paper_w=paper_max[0], max_paper_h=paper_max[1],
                min_paper_w=paper_min[0], min_paper_h=paper_min[1],
                max_print_w=print_max[0], max_print_h=print_max[1],
                plate_size_w=plate_size[0], plate_size_h=plate_size[1],
                gsm_min=gsm_min, gsm_max=gsm_max,
                max_colors=4,  # web is typically 4/4
                max_width=paper_max[0], max_height=paper_max[1],
                active=True,
            )
            db.add(machine)
            count += 1
        except Exception as e:
            errs.append(f"Sheet '{sheet_name}' row {r}: {e}")
    return count, errs


def _import_afterpress(db: Session, sheet, sheet_name: str):
    """Sheet 'Afterpress' — Post-press machines (folder, stitcher, binder, etc.)."""
    count = 0
    errs = []
    current_category = "other"

    for r in range(1, sheet.nrows):
        try:
            row = [sheet.cell_value(r, c) for c in range(min(sheet.ncols, 8))]
            while len(row) < 8:
                row.append("")

            first_cell = _str(row[0]).strip()

            # Detect category headers
            cat = _detect_afterpress_category(first_cell)
            if cat:
                current_category = cat
                continue

            name = _str(row[1]) or first_cell
            if not name or len(name) < 2:
                continue

            speed = _int_val(row[3]) or _int_val(row[2])
            setup = _int_val(row[2]) if speed != _int_val(row[2]) else 0

            # Parse dimensions if available
            paper_max = _parse_size(_str(row[4]))
            paper_min = _parse_size(_str(row[5]))

            machine = Machine(
                name=name.strip(),
                department="afterpress",
                machine_category=current_category,
                type=current_category,
                setup_time_min=setup or 0,
                speed_sheets_per_hour=speed or 0,
                max_paper_w=paper_max[0], max_paper_h=paper_max[1],
                min_paper_w=paper_min[0], min_paper_h=paper_min[1],
                max_width=paper_max[0], max_height=paper_max[1],
                active=True,
            )
            db.add(machine)
            count += 1
        except Exception as e:
            errs.append(f"Sheet '{sheet_name}' row {r}: {e}")
    return count, errs


def _import_packaging(db: Session, sheet, sheet_name: str):
    """Sheet 'Packaging + ลูกฟูก' — Packaging machines."""
    count = 0
    errs = []
    for r in range(1, sheet.nrows):
        try:
            row = [sheet.cell_value(r, c) for c in range(min(sheet.ncols, 15))]
            while len(row) < 15:
                row.append("")

            name = _str(row[1]) or _str(row[0])
            if not name or len(name) < 2 or "Machine" in name:
                continue

            speed = _int_val(row[3]) or _int_val(row[2])
            paper_max = _parse_size(_str(row[4]))
            paper_min = _parse_size(_str(row[5]))
            gsm_min, gsm_max = _parse_gsm_range(row, 9, 10)

            category = _detect_packaging_category(name)

            machine = Machine(
                name=name.strip(),
                department="packaging",
                machine_category=category,
                type=category,
                setup_time_min=_int_val(row[2]) or 0,
                speed_sheets_per_hour=speed or 0,
                max_paper_w=paper_max[0], max_paper_h=paper_max[1],
                min_paper_w=paper_min[0], min_paper_h=paper_min[1],
                gsm_min=gsm_min, gsm_max=gsm_max,
                max_width=paper_max[0], max_height=paper_max[1],
                active=True,
            )
            db.add(machine)
            count += 1
        except Exception as e:
            errs.append(f"Sheet '{sheet_name}' row {r}: {e}")
    return count, errs


def _import_digital(db: Session, sheet, sheet_name: str):
    """Sheet 'digital print' — Digital press machines."""
    count = 0
    errs = []
    for r in range(1, sheet.nrows):
        try:
            row = [sheet.cell_value(r, c) for c in range(min(sheet.ncols, 7))]
            while len(row) < 7:
                row.append("")

            name = _str(row[0]) or _str(row[1])
            if not name or len(name) < 2 or "Machine" in name:
                continue

            speed = _int_val(row[2]) or _int_val(row[3])
            paper_max = _parse_size(_str(row[4]))
            paper_min = _parse_size(_str(row[5]))

            category = "jetpress" if "jet" in name.lower() else "konica" if "konica" in name.lower() else "digital"

            machine = Machine(
                name=name.strip(),
                department="digital",
                machine_category=category,
                type="digital",
                speed_sheets_per_hour=speed or 0,
                max_paper_w=paper_max[0], max_paper_h=paper_max[1],
                min_paper_w=paper_min[0], min_paper_h=paper_min[1],
                max_width=paper_max[0], max_height=paper_max[1],
                max_colors=4,
                active=True,
            )
            db.add(machine)
            count += 1
        except Exception as e:
            errs.append(f"Sheet '{sheet_name}' row {r}: {e}")
    return count, errs


# ================================================================
# Sheet name → handler mapping
# ================================================================
SHEET_HANDLERS = {
    "Sheet": _import_sheetfed,
    "Web": _import_web,
    "Afterpress": _import_afterpress,
    "Packaging + ลูกฟูก": _import_packaging,
    "digital print": _import_digital,
    # Sheet1 (inventory summary) — skip, no machine-level data
}


# ================================================================
# Helper functions
# ================================================================

def _str(val):
    if val is None or val == "":
        return ""
    return str(val).strip()


def _int_val(val):
    if val is None or val == "":
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _parse_size(text: str) -> tuple:
    """Parse size strings like '820x1143' or '820*1143' → (820, 1143). Returns (None, None) on failure."""
    if not text:
        return (None, None)
    m = re.search(r'(\d+\.?\d*)\s*[x×*X]\s*(\d+\.?\d*)', text)
    if m:
        return (float(m.group(1)), float(m.group(2)))
    return (None, None)


def _parse_gsm_range(row, col1, col2):
    """Extract gsm min/max from spec/paper columns. Tries to find patterns like '40-260' or '40~260g'."""
    for col in [col1, col2]:
        if col < len(row):
            text = _str(row[col])
            m = re.search(r'(\d+)\s*[-~]\s*(\d+)', text)
            if m:
                return (int(m.group(1)), int(m.group(2)))
    return (None, None)


def _parse_colors(name: str) -> int:
    """Parse max colors from machine name. e.g. 'G844' → 8 colors, 'L640' → 6."""
    # Look for patterns like "8 color" or "844" (first digit = colors)
    m = re.search(r'(\d+)\s*[Cc]olor', name)
    if m:
        return int(m.group(1))
    # Check for number pattern in model code
    m = re.search(r'[A-Z]+\s*(\d)(\d{2})', name)
    if m:
        first_digit = int(m.group(1))
        if 1 <= first_digit <= 10:
            return first_digit
    return 4  # default


def _detect_afterpress_category(text: str) -> str | None:
    """Detect category headers in Afterpress sheet."""
    t = text.lower()
    mapping = [
        ("folder", "folder"), ("พับ", "folder"),
        ("autostitch", "stitcher"), ("เย็บเข็ม", "stitcher"),
        ("sewing", "sewing"), ("เย็บกี่", "sewing"),
        ("perfect bind", "perfect_binding"), ("ไสสัน", "perfect_binding"),
        ("hard cover", "hard_cover"), ("ปกแข็ง", "hard_cover"),
        ("coat", "coating"), ("เคลือบ", "coating"), ("opp", "coating"), ("uv", "coating"),
        ("poly", "poly_wrap"),
        ("punch", "punching"), ("เจาะ", "punching"),
        ("wire-o", "wire_o"), ("wire o", "wire_o"),
        ("diecut", "diecut"), ("ไดคัท", "diecut"),
        ("hotstamp", "hotstamp"), ("ปั๊มทอง", "hotstamp"), ("ปั๊มฟอยล์", "hotstamp"),
        ("french", "french_joint"),
        ("gatherer", "gatherer"), ("เก็บชุด", "gatherer"),
        ("shrink", "shrink_wrap"),
        ("rigid", "rigid_box"),
        ("board book", "board_book"),
        ("sheeter", "sheeter"),
        ("guillotine", "cutting"), ("ตัด", "cutting"), ("polar", "cutting"),
    ]
    for keyword, cat in mapping:
        if keyword in t:
            return cat
    return None


def _detect_packaging_category(name: str) -> str:
    t = name.lower()
    if "flexo" in t:
        return "flexo"
    if "ปะกบ" in t or "laminate" in t:
        return "laminator"
    if "ปะลิ้น" in t or "gluing" in t or "glu" in t:
        return "gluing"
    if "หน้าต่าง" in t or "window" in t:
        return "window_patch"
    if "แกะ" in t or "strip" in t:
        return "stripping"
    if "inspect" in t:
        return "inspection"
    if "เทป" in t or "tape" in t:
        return "tape"
    if "ซอง" in t or "envelope" in t:
        return "envelope"
    if "ถาด" in t or "tray" in t:
        return "tray"
    if "ตอก" in t or "blade" in t:
        return "blade"
    return "packaging_other"
