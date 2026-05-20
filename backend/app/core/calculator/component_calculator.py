"""
Component Calculator — Adapter between ComponentSpec and pricing_v2.

Translates the new structured Component model into flat parameters
that calculate_v2() already expects, then reorganizes output into 4-block structure.
"""
import logging
import math
import re
from sqlalchemy.orm import Session

from app.core.calculator.pricing_v2 import calculate_v2

logger = logging.getLogger(__name__)


def _to_cm(value: float, unit: str) -> float:
    """Convert any unit to cm for calculator."""
    if not value:
        return 0
    unit = (unit or "cm").lower()
    if unit == "mm":
        return value / 10
    elif unit in ("inch", "in", "inches"):
        return value * 2.54
    return value  # already cm


def _build_finishing_names(after_press: dict, finishing_list: list) -> list[str]:
    """Translate structured after_press + finishing into flat name list for V2."""
    names = []

    if after_press:
        diecut = after_press.get("diecut", {})
        if isinstance(diecut, dict) and diecut.get("status") in ("new", "existing"):
            names.append("ไดคัท")

        assembly = after_press.get("assembly", {})
        if isinstance(assembly, dict) and assembly.get("has_glue"):
            names.append("ประกบ")

        coating = after_press.get("coating")
        if coating:
            names.append(coating)

        foil = after_press.get("foil")
        if foil:
            names.append(foil)

        if after_press.get("emboss"):
            names.append("ปั๊มนูน")
        if after_press.get("deboss"):
            names.append("ปั๊มลึก")

    # Additional finishing from the finishing list
    for item in (finishing_list or []):
        if isinstance(item, str) and item not in names:
            names.append(item)

    return names


# ================================================================
# Template type → required finishing processes
# ================================================================
# Template types 1-12 are packaging boxes; "book" types detected by binding
_PACKAGING_TEMPLATES = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}

# Required finishing for packaging boxes (template 1-12)
_PACKAGING_REQUIRED = [
    "เคลือบ OPP เงา",   # coating — almost all packaging needs coating
    "ไดคัท",            # die-cutting — cut box shape
    "แกะ",              # stripping — remove waste after diecut
    "ประกบ",            # gluing — fold & glue box
]

# Required finishing for board book
_BOARD_BOOK_REQUIRED = [
    "เคลือบ OPP ด้าน",  # matt coating for children's book
    "ประกบ Greyboard",   # laminate onto greyboard
    "ไดคัท",            # die-cut book shape
    "มุมมน",            # rounded corners for safety
    "Board book binding", # board book binding (sheet lamination + rounding)
]

# Required finishing for saddle-stitch booklet
_SADDLE_STITCH_REQUIRED = [
    "พับ",              # folding
    "เย็บมุงหลังคา",     # saddle stitching
    "ตัดสามด้าน",        # 3-side trim
]

# Required finishing for perfect binding book
_PERFECT_BIND_REQUIRED = [
    "พับ",
    "เก็บเล่ม",         # gathering/collating
    "ไสสันทากาว",        # perfect binding
    "ตัดสามด้าน",
]

# Required finishing for hard cover book
_HARD_COVER_REQUIRED = [
    "พับ",
    "เก็บเล่ม",
    "เย็บกี่",           # Smyth sewing
    "เข้าเล่มปกแข็ง",    # case bound
    "ตัดสามด้าน",
]


def _auto_finishing_for_template(template_type: int | None, binding: str | None,
                                  existing_names: list[str]) -> list[str]:
    """
    Auto-inject required finishing based on template type and binding method.
    Only adds items not already in existing_names.
    """
    required = []

    # Detect board book from binding or template_type
    binding_lower = (binding or "").lower()
    is_board_book = "board book" in binding_lower or "board_book" in binding_lower

    if is_board_book:
        required = _BOARD_BOOK_REQUIRED
    elif template_type in _PACKAGING_TEMPLATES:
        required = _PACKAGING_REQUIRED
    elif "saddle" in binding_lower or "มุงหลังคา" in binding_lower or "เย็บเข็ม" in binding_lower:
        required = _SADDLE_STITCH_REQUIRED
    elif "perfect" in binding_lower or "ไสสัน" in binding_lower or "ทากาว" in binding_lower:
        required = _PERFECT_BIND_REQUIRED
    elif "hard" in binding_lower or "case" in binding_lower or "ปกแข็ง" in binding_lower:
        required = _HARD_COVER_REQUIRED

    added = []
    existing_lower = [n.lower() for n in existing_names]
    for name in required:
        if name.lower() not in existing_lower:
            added.append(name)

    return added


def calculate_component(db: Session, component: dict) -> dict:
    """
    Calculate cost for a single component.

    Args:
        db: Database session
        component: Component dict with new structured fields

    Returns:
        dict with 4 cost blocks + totals + breakdown
    """
    # Extract dimensions
    dims = component.get("dimensions") or {}
    unit = dims.get("unit", "cm")
    piece_w_cm = _to_cm(dims.get("width", 0), unit)
    piece_h_cm = _to_cm(dims.get("height", 0) or dims.get("length", 0), unit)

    # Extract print colors
    outside = component.get("outside", {})
    inside = component.get("inside", "no_print")

    if isinstance(outside, dict):
        colors_front = outside.get("color_count", 4) if outside.get("print_type") != "no_print" else 0
    else:
        colors_front = 0

    if isinstance(inside, dict):
        colors_back = inside.get("color_count", 0) if inside.get("print_type") != "no_print" else 0
    else:
        colors_back = 0

    # Extract paper
    paper = component.get("paper") or {}
    paper_code = paper.get("code")
    paper_gsm = paper.get("gsm")

    # Build finishing names from after_press + finishing
    after_press = component.get("after_press") or {}
    finishing_list = component.get("finishing") or []
    finishing_names = _build_finishing_names(after_press, finishing_list)

    # Auto-inject required finishing based on template type / binding
    template_type = component.get("template_type")
    binding = component.get("binding")
    auto_added = _auto_finishing_for_template(template_type, binding, finishing_names)
    if auto_added:
        logger.info(f"Auto-added finishing for template={template_type} binding={binding}: {auto_added}")
        finishing_names.extend(auto_added)

    # Detect board book early (used for spreads, corners, greyboard, packing)
    binding_lower = (binding or "").lower()
    is_board_book = "board book" in binding_lower or "board_book" in binding_lower

    # Is repeat job (existing diecut)?
    diecut = after_press.get("diecut", {})
    is_repeat = isinstance(diecut, dict) and diecut.get("status") == "existing"

    quantity = component.get("quantity", 0)

    if quantity <= 0 or piece_w_cm <= 0 or piece_h_cm <= 0:
        return {
            "error": "ข้อมูลไม่ครบ (quantity, dimensions)",
            "materials": 0,
            "print_press": 0,
            "after_press": 0,
            "packing": 0,
            "logistics": 0,
            "subtotal": 0,
            "unit_cost": 0,
            "breakdown": {},
        }

    # Board book: calculate spreads for scaling finishing costs
    pages = component.get("pages") or 0
    spreads_per_book = max(pages // 2, 0) if is_board_book else 0

    # Rounded corners: extract from spec or default
    rounded_corners = 0
    if is_board_book:
        # Check if spec explicitly states corner count, default 4 for board book
        corner_spec = component.get("rounded_corners")
        if corner_spec is not None:
            rounded_corners = int(corner_spec)
        else:
            # Try to parse from binding text (e.g. "2 rounded corners")
            corner_match = re.search(r'(\d+)\s*rounded', binding_lower)
            if corner_match:
                rounded_corners = int(corner_match.group(1))
            else:
                rounded_corners = 4  # default for board book

    # Call existing V2 engine
    v2_result = calculate_v2(
        db=db,
        quantity=quantity,
        piece_w_cm=piece_w_cm,
        piece_h_cm=piece_h_cm,
        colors_front=colors_front,
        colors_back=colors_back,
        paper_code=paper_code,
        paper_gsm=paper_gsm,
        finishing_names=finishing_names,
        is_repeat_job=is_repeat,
        spreads_per_book=spreads_per_book,
        rounded_corners=rounded_corners,
    )

    if "error" in v2_result:
        return {
            **v2_result,
            "materials": 0,
            "print_press": 0,
            "after_press": 0,
            "packing": 0,
            "logistics": 0,
            "subtotal": 0,
            "unit_cost": 0,
        }

    # ── Extra material: Greyboard for board book ──
    greyboard_cost = 0
    if is_board_book and quantity > 0:
        spreads = max(spreads_per_book, 3) if spreads_per_book > 0 else max((component.get("pages") or 10) // 2, 3)

        # Greyboard pricing: buy large sheets (31"×43" = ~790×1090mm), cut to book size
        # Price per large sheet ~35-45 THB (1.5mm grey board)
        gb_large_sheet_price = 40.0  # THB per 31"×43" sheet
        gb_sheet_w_mm = 790.0
        gb_sheet_h_mm = 1090.0

        # How many book-size boards fit on one large sheet?
        book_w_mm = dims.get("width", 170) or 170
        book_h_mm = dims.get("height", 170) or 170
        # Board = one spread opened = book_w * 2 (double page)
        spread_w_mm = book_w_mm * 2 + 5  # +5mm for spine/trim
        spread_h_mm = book_h_mm + 5

        # Nesting on large sheet (try both orientations)
        ups_a = max(1, int(gb_sheet_w_mm // spread_w_mm)) * max(1, int(gb_sheet_h_mm // spread_h_mm))
        ups_b = max(1, int(gb_sheet_w_mm // spread_h_mm)) * max(1, int(gb_sheet_h_mm // spread_w_mm))
        ups_per_sheet = max(ups_a, ups_b, 1)

        total_boards = quantity * spreads
        large_sheets_needed = -(-total_boards // ups_per_sheet)  # ceil division
        greyboard_cost = large_sheets_needed * gb_large_sheet_price

        # Add to breakdown
        bd = v2_result.get("breakdown", {})
        bd["greyboard"] = {
            "spreads_per_book": spreads,
            "spread_size_mm": f"{spread_w_mm:.0f}×{spread_h_mm:.0f}",
            "ups_per_large_sheet": ups_per_sheet,
            "total_boards": total_boards,
            "large_sheets": large_sheets_needed,
            "price_per_large_sheet": gb_large_sheet_price,
            "cost": round(greyboard_cost, 2),
            "ref": {
                "source": "Thai greyboard suppliers 2024",
                "note": (f"Greyboard 1.5mm แผ่นใหญ่ 31\"×43\" ราคา {gb_large_sheet_price} THB/แผ่น | "
                         f"ตัดได้ {ups_per_sheet} บอร์ด/แผ่น ({spread_w_mm:.0f}×{spread_h_mm:.0f}mm) | "
                         f"{spreads} spreads/เล่ม × {quantity:,} เล่ม = {total_boards:,} บอร์ด → {large_sheets_needed:,} แผ่นใหญ่"),
            },
        }

    # ── Packing cost calculation ──
    packing_cost = 0
    packing_details = []
    packing_spec = component.get("packing") or {}
    if isinstance(packing_spec, str):
        packing_spec = {"method": packing_spec}

    packing_method = (packing_spec.get("method") or "").lower() if isinstance(packing_spec, dict) else ""
    pack_per_carton = packing_spec.get("pack_per_carton") if isinstance(packing_spec, dict) else None
    pallet_req = packing_spec.get("pallet_req") if isinstance(packing_spec, dict) else None

    # Auto-detect packing from spec text or defaults
    needs_carton = "carton" in packing_method or "กล่อง" in packing_method or "export" in packing_method
    needs_pallet = pallet_req or "pallet" in packing_method or "พาเลท" in packing_method

    # If no packing specified, use sensible defaults based on product type
    if not packing_method and quantity > 0:
        if is_board_book:
            needs_carton = True  # board books always packed in cartons
        elif template_type in _PACKAGING_TEMPLATES:
            needs_carton = True  # packaging boxes always in cartons

    if needs_carton and quantity > 0:
        # Carton packing: standard export carton
        # Rate: ~3-8 THB per piece (includes carton material + labor)
        # Small items: ~50 pcs/carton, medium: 20-30, large: 10-15
        pcs_per_carton = pack_per_carton or (20 if is_board_book else 30)
        num_cartons = math.ceil(quantity / pcs_per_carton)

        # Carton cost: material (~35-60 THB/carton) + packing labor (~1.5 THB/piece)
        carton_material_cost = num_cartons * 45.0  # avg export carton
        packing_labor = quantity * 1.5
        carton_total = carton_material_cost + packing_labor

        packing_cost += carton_total
        packing_details.append({
            "name": "Export carton packing",
            "pcs_per_carton": pcs_per_carton,
            "num_cartons": num_cartons,
            "carton_unit_cost": 45.0,
            "labor_per_piece": 1.5,
            "cost": round(carton_total, 2),
            "ref": {
                "source": "Thai corrugated carton suppliers 2024",
                "note": f"กล่องลูกฟูก 3 ชั้น export grade ~45 THB/กล่อง | แพ็ค {pcs_per_carton} ชิ้น/กล่อง | "
                        f"ค่าแรงแพ็ค 1.5 THB/ชิ้น | {num_cartons} กล่อง × 45 + {quantity:,} × 1.5 = {round(carton_total, 2):,.0f}",
            },
        })

    if needs_pallet and quantity > 0:
        # Pallet: ~250-400 THB per pallet (wood pallet + wrapping)
        cartons_per_pallet = 40
        num_cartons_for_pallet = math.ceil(quantity / (pack_per_carton or 20)) if needs_carton else math.ceil(quantity / 20)
        num_pallets = max(1, math.ceil(num_cartons_for_pallet / cartons_per_pallet))
        pallet_unit_cost = 350.0  # fumigation-treated export pallet
        pallet_total = num_pallets * pallet_unit_cost

        packing_cost += pallet_total
        packing_details.append({
            "name": "Palletising",
            "num_pallets": num_pallets,
            "pallet_unit_cost": pallet_unit_cost,
            "cost": round(pallet_total, 2),
            "ref": {
                "source": "Thai logistics suppliers 2024",
                "note": f"Export pallet (fumigation treated) ~350 THB/pallet | "
                        f"{num_pallets} pallets | {round(pallet_total, 2):,.0f} THB",
            },
        })

    # Store packing breakdown
    bd = v2_result.get("breakdown", {})
    if packing_details:
        bd["packing"] = {
            "packing_cost": round(packing_cost, 2),
            "details": packing_details,
        }

    # ── Logistics / delivery cost (Bangkok-metro truck) ──
    logistics_cost = 0
    logistics_details = []
    if quantity > 0:
        # cartons to ship — reuse the packing carton count, else estimate
        cartons = 0
        for pd in packing_details:
            if pd.get("num_cartons"):
                cartons = pd["num_cartons"]
                break
        if cartons == 0:
            cartons = math.ceil(quantity / (20 if is_board_book else 30))

        # Truck rates — Bangkok + ปริมณฑล (industry reference 2024)
        CARTONS_PER_4WHEEL = 70
        CARTONS_PER_6WHEEL = 220
        RATE_4WHEEL = 1300.0   # THB/trip
        RATE_6WHEEL = 2900.0   # THB/trip
        if cartons <= CARTONS_PER_4WHEEL:
            trips, truck = 1, "รถกระบะ 4 ล้อ"
            logistics_cost = RATE_4WHEEL
        else:
            trips = math.ceil(cartons / CARTONS_PER_6WHEEL)
            truck = "รถบรรทุก 6 ล้อ"
            logistics_cost = trips * RATE_6WHEEL

        logistics_details.append({
            "name": f"ค่าจัดส่ง — {truck} × {trips} เที่ยว",
            "cartons": cartons,
            "truck": truck,
            "trips": trips,
            "cost": round(logistics_cost, 2),
            "ref": {
                "source": "อัตราค่าขนส่งงานพิมพ์ เขตกรุงเทพฯ–ปริมณฑล 2024",
                "note": (f"{cartons:,} กล่อง → {truck} {trips} เที่ยว | "
                         f"รถ 4 ล้อ ~{RATE_4WHEEL:,.0f} / รถ 6 ล้อ ~{RATE_6WHEEL:,.0f} THB/เที่ยว | "
                         f"ส่งในเขต กทม.-ปริมณฑล (ต่างจังหวัดคิดเพิ่มตามระยะทาง)"),
            },
        })
        bd["logistics"] = {
            "logistics_cost": round(logistics_cost, 2),
            "details": logistics_details,
        }

    # Reorganize into cost blocks
    materials = v2_result.get("paper_cost", 0) + v2_result.get("plate_cost", 0) + greyboard_cost
    print_press = v2_result.get("print_cost", 0) + v2_result.get("ink_cost", 0)
    after_press_cost = v2_result.get("finishing_cost", 0)
    packing = packing_cost

    subtotal = v2_result.get("total_cost", 0) + greyboard_cost + packing_cost + logistics_cost
    unit_cost = subtotal / quantity if quantity > 0 else 0

    return {
        "materials": round(materials, 2),
        "print_press": round(print_press, 2),
        "after_press": round(after_press_cost, 2),
        "packing": round(packing, 2),
        "logistics": round(logistics_cost, 2),
        "subtotal": round(subtotal, 2),
        "unit_cost": round(unit_cost, 4),
        "markup_pct": v2_result.get("markup_pct", 0),
        "breakdown": v2_result.get("breakdown", {}),
    }


def calculate_project(db: Session, project: dict) -> dict:
    """
    Calculate cost for all components in a project.

    Args:
        db: Database session
        project: ProjectSpec dict with components[]

    Returns:
        dict with per-component results + project totals (4 cost blocks)
    """
    components = project.get("components", [])
    results = []
    total_materials = 0
    total_print = 0
    total_after_press = 0
    total_packing = 0
    total_logistics = 0
    project_total = 0

    for comp in components:
        cost = calculate_component(db, comp)
        results.append({
            "component_name": comp.get("component_name", ""),
            "template_type": comp.get("template_type"),
            "quantity": comp.get("quantity", 0),
            "cost": cost,
        })

        if "error" not in cost:
            total_materials += cost["materials"]
            total_print += cost["print_press"]
            total_after_press += cost["after_press"]
            total_packing += cost["packing"]
            total_logistics += cost.get("logistics", 0)
            project_total += cost["subtotal"]

    # Unit cost based on first component's quantity (shared quantity)
    qty = components[0].get("quantity", 0) if components else 0
    project_unit_cost = round(project_total / qty, 4) if qty > 0 else 0

    return {
        "components": results,
        "materials_total": round(total_materials, 2),
        "print_total": round(total_print, 2),
        "after_press_total": round(total_after_press, 2),
        "packing_total": round(total_packing, 2),
        "logistics_total": round(total_logistics, 2),
        "grand_total": round(project_total, 2),
        "unit_cost": project_unit_cost,
        "quantity": qty,
    }
