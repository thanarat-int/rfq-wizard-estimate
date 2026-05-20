"""
Pricing V2 — ใช้ข้อมูลจริงจาก DB ของ Deep Estimate

สูตรจากบริษัท (สรุปสูตร Estimate.docx):
- LaySize W = printing_w + color_bar(8mm) + gripper(12mm)
- LaySize H = printing_h + edge(4mm) × 2
- Split = floor(paper_w / lay_w) × floor(paper_h / lay_h)
- After_ups = ceil(qty / ups)
- Waste = lookup WasteTable by qty range + color_add + coating/foil waste
- Paper_qty = ceil((after_ups + waste) / split)
- Paper_net = roundup to 100
- Weight = paper_net × gram × W_in × H_in / 1,550,000
- Cost Mode A: weight × price/kg × (1 + markup%)
- Cost Mode B: paper_net × price/sheet × (1 + markup%)
"""
import math
from typing import Optional
from sqlalchemy.orm import Session

from app.models.master_data import Paper, Machine, InkPrice, PlatePrice, FinishingOption, WasteTable
from app.core.calculator.machine_selector import select_machine_flexible


# ================================================================
# Constants (from company formula docs)
# ================================================================
COLOR_BAR_MM = 8
GRIPPER_MM = 12
EDGE_MM = 4
WEIGHT_DIVISOR = 1_550_000  # paper_net × gram × W_in × H_in / 1,550,000


def calculate_v2(
    db: Session,
    quantity: int,
    piece_w_cm: float,
    piece_h_cm: float,
    colors_front: int = 4,
    colors_back: int = 0,
    paper_code: str = None,
    paper_gsm: int = None,
    paper_id: int = None,
    paper_w_cm: float = None,
    paper_h_cm: float = None,
    finishing_names: list[str] = None,
    is_repeat_job: bool = False,
    markup_pct: float = 0.0,
    job_type: str = "general",
    spreads_per_book: int = 0,
    rounded_corners: int = 0,
) -> dict:
    """
    V2 unified pricing engine — queries all data from DB.

    Args:
        piece_w_cm, piece_h_cm: finished piece size in cm
        paper_w_cm, paper_h_cm: paper sheet size in cm (if known, otherwise auto-select)
        paper_code: e.g. "GA", "MA", "AC C1s" — to look up price from DB
        paper_gsm: paper weight (g/m²)
    """
    errors = []

    # ── 1. Resolve paper ──
    paper = _resolve_paper(db, paper_id, paper_code, paper_gsm)

    if paper:
        gsm = paper.gram or paper_gsm or 120
        price_per_kg = paper.price_per_kg or paper.price
        price_per_sheet = paper.price_per_sheet
        is_baht_per_sheet = paper.is_only_baht_per_sheet == 1
        paper_name = f"{paper.paper_code} {paper.gram}g"
    else:
        gsm = paper_gsm or 120
        price_per_kg = 35.0  # fallback
        price_per_sheet = None
        is_baht_per_sheet = False
        paper_name = f"(default) {gsm}g"
        errors.append("ไม่พบกระดาษใน DB — ใช้ราคาเริ่มต้น 35 THB/kg")

    # ── 2. Calculate lay size (mm) ──
    printing_w_mm = piece_w_cm * 10
    printing_h_mm = piece_h_cm * 10
    lay_w_mm = printing_w_mm + COLOR_BAR_MM + GRIPPER_MM
    lay_h_mm = printing_h_mm + (EDGE_MM * 2)

    # ── 3. Resolve paper size ──
    if paper_w_cm and paper_h_cm:
        sheet_w_mm = paper_w_cm * 10
        sheet_h_mm = paper_h_cm * 10
    else:
        # Default full sheet sizes to try
        sheet_w_mm = 790.0
        sheet_h_mm = 1090.0

    # ── 4. Calculate split (imposition) ──
    split, ups, rotated = _calc_split(sheet_w_mm, sheet_h_mm, lay_w_mm, lay_h_mm)

    if ups == 0:
        return {"error": "ขนาดชิ้นงานใหญ่เกินกระดาษ", "errors": errors}

    # ── 5. After_ups + waste ──
    after_ups = math.ceil(quantity / ups)

    # Lookup waste from WasteTable
    print_waste = _lookup_waste(db, job_type, "print_4color", quantity)
    if colors_front > 4:
        extra_color_waste = _lookup_waste(db, job_type, "print_color_add", quantity)
        print_waste += extra_color_waste * (colors_front - 4)

    total_waste = print_waste

    # Add finishing waste
    finishing_names = finishing_names or []
    for fn in finishing_names:
        fn_lower = fn.lower()
        if "เคลือบ" in fn_lower or "coat" in fn_lower or "uv" in fn_lower or "opp" in fn_lower:
            total_waste += _lookup_waste(db, job_type, "coating", quantity)
        elif "foil" in fn_lower or "ฟอยล์" in fn_lower or "ทอง" in fn_lower:
            total_waste += _lookup_waste(db, job_type, "foil", quantity)
        elif "diecut" in fn_lower or "ไดคัท" in fn_lower:
            total_waste += _lookup_waste(db, job_type, "diecut", quantity)
        elif "พับ" in fn_lower or "fold" in fn_lower:
            total_waste += _lookup_waste(db, job_type, "folding", quantity)
        elif "เย็บ" in fn_lower or "bind" in fn_lower or "stitch" in fn_lower:
            total_waste += _lookup_waste(db, job_type, "binding", quantity)

    # Paper quantity
    # after_ups = sheets needed for printing, total_waste = extra sheets for makeready
    # Both are in SHEETS — no division by split needed (full sheet = press sheet)
    paper_qty = after_ups + total_waste
    paper_net = _roundup_100(paper_qty)

    # ── 6. Paper cost ──
    sheet_w_in = sheet_w_mm / 25.4
    sheet_h_in = sheet_h_mm / 25.4

    if is_baht_per_sheet and price_per_sheet:
        paper_cost = paper_net * price_per_sheet
        cost_mode = "B (per sheet)"
    else:
        weight_kg = paper_net * gsm * sheet_w_in * sheet_h_in / WEIGHT_DIVISOR
        paper_cost = weight_kg * (price_per_kg or 35.0)
        cost_mode = "A (per kg)"

    paper_cost_with_markup = paper_cost * (1 + markup_pct / 100)

    # ── 7. Select machine ──
    machine = select_machine_flexible(
        db, sheet_w_mm, sheet_h_mm, gsm, colors_front,
    )

    FIXED_BHR = 2500  # Fixed machine cost per hour

    if machine:
        machine_name = machine.name
        speed = machine.speed_sheets_per_hour or 8000
        cost_hr = FIXED_BHR
        setup_cost = machine.setup_cost or 1500
    else:
        machine_name = "(default)"
        speed = 8000
        cost_hr = FIXED_BHR
        setup_cost = 1500
        errors.append("ไม่พบเครื่องจักรที่เหมาะสม — ใช้ค่าเริ่มต้น")

    # Machine cost
    passes = 1 + (1 if colors_back > 0 else 0)
    total_impressions = paper_net * passes
    print_hours = total_impressions / speed
    machine_cost = (print_hours * cost_hr) + setup_cost

    # ── 8. Plate cost ──
    plate_cost = 0
    plate_info = {}
    if not is_repeat_job:
        total_plates = colors_front + colors_back
        plate_price = _get_plate_price(db, sheet_w_mm, sheet_h_mm)
        plate_cost = total_plates * plate_price
        plate_info = {
            "total_plates": total_plates,
            "price_per_plate": plate_price,
        }

    # ── 9. Ink cost ──
    ink_record = db.query(InkPrice).filter(
        InkPrice.active == True,
        InkPrice.color_type == "CMYK",
    ).first()
    ink_price_kg = ink_record.price_per_kg if ink_record else 400
    ink_coverage = ink_record.coverage_sqm_per_kg if ink_record else 35

    sheet_area_sqm = (sheet_w_mm / 1000) * (sheet_h_mm / 1000)
    total_colors = colors_front + colors_back
    total_ink_kg = (sheet_area_sqm * paper_net * total_colors * 0.3) / ink_coverage
    ink_cost = total_ink_kg * ink_price_kg

    # ── 10. Finishing cost ──
    finishing_details = []
    finishing_total = 0
    sheet_area_sqin = sheet_area_sqm * 1550.0031  # sqm → sqin
    # For sheet-based finishing costs, use after_ups (not paper_net)
    # because finishing is done on good printed sheets, not waste
    finishing_sheets = after_ups + print_waste  # sheets that enter finishing pipeline

    for fn in finishing_names:
        f_option = db.query(FinishingOption).filter(
            FinishingOption.active == True,
            FinishingOption.name == fn,
        ).first()

        if not f_option:
            # Try partial match
            f_option = db.query(FinishingOption).filter(
                FinishingOption.active == True,
                FinishingOption.name.ilike(f"%{fn}%"),
            ).first()

        if f_option:
            unit = f_option.unit
            fn_lower_match = fn.lower()

            # ── Determine effective quantity for this process ──
            # Board book processes scale with spreads (pages/2)
            effective_qty = quantity
            scale_note = ""

            if spreads_per_book > 0:
                # ประกบ Greyboard: DB rate is per-book (base ~5 spreads), scale proportionally
                if "greyboard" in fn_lower_match or ("ประกบ" in fn_lower_match and "greyboard" in fn_lower_match.lower()):
                    BASE_SPREADS = 5
                    scale_factor = spreads_per_book / BASE_SPREADS
                    scaled_price = f_option.price_per_unit * scale_factor
                    cost = quantity * scaled_price + f_option.setup_cost
                    if cost < f_option.min_charge:
                        cost = f_option.min_charge
                    finishing_details.append({
                        "name": f_option.name,
                        "unit": f"THB/piece (scaled {spreads_per_book} spreads)",
                        "price_per_unit": round(scaled_price, 2),
                        "cost": round(cost, 2),
                        "ref": {
                            "note": f"Base {f_option.price_per_unit}/book ({BASE_SPREADS} spreads) x {spreads_per_book}/{BASE_SPREADS} = {scaled_price:.2f}/book",
                            "source": "Thai board book subcontractors 2024",
                        },
                    })
                    finishing_total += cost
                    continue  # skip normal calculation
                # Board book binding: base rate + per-spread surcharge
                elif "board book" in fn_lower_match and "bind" in fn_lower_match:
                    # Base: 12 THB/book + 1.0 THB per spread beyond 5
                    base_per_book = 12.0
                    extra_spreads = max(0, spreads_per_book - 5)
                    per_book = base_per_book + (extra_spreads * 1.0)
                    cost = quantity * per_book + f_option.setup_cost
                    if cost < f_option.min_charge:
                        cost = f_option.min_charge
                    finishing_details.append({
                        "name": f_option.name,
                        "unit": f"THB/piece (scaled {spreads_per_book} spreads)",
                        "price_per_unit": round(per_book, 2),
                        "cost": round(cost, 2),
                        "ref": {
                            "note": f"Base 12 THB/book + {extra_spreads} extra spreads x 1.0 THB = {per_book:.2f}/book",
                            "source": "Thai board book subcontractors 2024",
                        },
                    })
                    finishing_total += cost
                    continue  # skip normal calculation below

            # Rounded corners: scale by corner count
            if rounded_corners > 0 and ("มุมมน" in fn_lower_match or "corner" in fn_lower_match):
                effective_qty = quantity * rounded_corners
                scale_note = f" ({rounded_corners} corners x {quantity:,} = {effective_qty:,})"

            if "sqin" in unit.lower() or "ตร.นิ้ว" in unit:
                cost = sheet_area_sqin * finishing_sheets * f_option.price_per_unit
            elif "sheet" in unit.lower() or "แผ่น" in unit:
                cost = finishing_sheets * f_option.price_per_unit
            elif "piece" in unit.lower() or "ชิ้น" in unit:
                cost = effective_qty * f_option.price_per_unit
            else:
                cost = effective_qty * f_option.price_per_unit

            cost += f_option.setup_cost
            if cost < f_option.min_charge:
                cost = f_option.min_charge

            finishing_details.append({
                "name": f_option.name + scale_note,
                "unit": f_option.unit,
                "price_per_unit": f_option.price_per_unit,
                "cost": round(cost, 2),
            })
            finishing_total += cost
        else:
            errors.append(f"ไม่พบ finishing '{fn}' ใน DB")

    # ── 11. Total ──
    subtotal = paper_cost_with_markup + machine_cost + plate_cost + ink_cost + finishing_total
    total_cost = subtotal
    unit_cost = total_cost / quantity if quantity > 0 else 0

    return {
        "paper_cost": round(paper_cost_with_markup, 2),
        "plate_cost": round(plate_cost, 2),
        "ink_cost": round(ink_cost, 2),
        "print_cost": round(machine_cost, 2),
        "finishing_cost": round(finishing_total, 2),
        "subtotal": round(subtotal, 2),
        "total_cost": round(total_cost, 2),
        "unit_cost": round(unit_cost, 2),
        "markup_pct": markup_pct,
        "margin_pct": 0,
        "quantity": quantity,
        "logistics_cost": 0,
        "other_cost": 0,
        "breakdown": {
            "paper": {
                "paper_name": paper_name,
                "gsm": gsm,
                "sheet_size_mm": f"{sheet_w_mm}×{sheet_h_mm}",
                "lay_size_mm": f"{lay_w_mm}×{lay_h_mm}",
                "ups": ups,
                "split": split,
                "after_ups": after_ups,
                "waste_sheets": total_waste,
                "paper_qty": paper_qty,
                "paper_net": paper_net,
                "cost_mode": cost_mode,
                "paper_cost_raw": round(paper_cost, 2),
                "markup_pct": markup_pct,
                "paper_cost": round(paper_cost_with_markup, 2),
                "price_per_kg": price_per_kg,
                "ref": {
                    "source": "Deep Estimate",
                    "file": "Paper Price (MI2).xlsx",
                    "note": f"กระดาษ {paper_name} ราคา {'%.2f' % (price_per_kg or 0)} THB/kg" if not is_baht_per_sheet else f"กระดาษ {paper_name} ราคา {'%.2f' % (price_per_sheet or 0)} THB/แผ่น",
                    "formula": f"LaySize = ({printing_w_mm}+8+12) × ({printing_h_mm}+4×2) = {lay_w_mm}×{lay_h_mm} mm | ups = floor({sheet_w_mm}/{lay_w_mm})×floor({sheet_h_mm}/{lay_h_mm}) = {ups} | after_ups = ceil({quantity}/{ups}) = {after_ups} | waste = {total_waste} (WasteTable) | paper_net = roundup100(ceil(({after_ups}+{total_waste})/{split})) = {paper_net}",
                },
            },
            "machine": {
                "machine_name": machine_name,
                "speed_per_hr": speed,
                "cost_per_hr": cost_hr,
                "setup_cost": setup_cost,
                "passes": passes,
                "total_impressions": total_impressions,
                "print_hours": round(print_hours, 2),
                "print_cost": round(machine_cost, 2),
                "ref": {
                    "source": "Deep Estimate",
                    "file": "all spec machine.xls",
                    "note": f"เครื่อง {machine_name} ความเร็ว {speed:,} แผ่น/ชม. | BHR คงที่ 2,500 THB/hr (นโยบายบริษัท)",
                    "formula": f"impressions = {paper_net} × {passes} = {total_impressions} | ชม. = {total_impressions}/{speed:,} = {round(print_hours, 4)} | ค่าพิมพ์ = ({round(print_hours, 4)}×2,500)+{setup_cost} = {round(machine_cost, 2)}",
                },
            },
            "plate": {
                "plate_cost": round(plate_cost, 2),
                "is_repeat_job": is_repeat_job,
                **plate_info,
                "ref": {
                    "source": "Kodak/Fujifilm Thailand",
                    "note": f"CTP Plate {'B1' if (sheet_w_mm >= 900 or sheet_h_mm >= 900) else 'B2'} — ราคาตัวแทนจำหน่าย 2024",
                    "formula": f"{colors_front}+{colors_back} สี × {plate_info.get('price_per_plate', 0)} THB/เพลท = {round(plate_cost, 2)}" if not is_repeat_job else "งานซ้ำ — ไม่คิดค่าเพลท",
                },
            },
            "ink": {
                "ink_cost": round(ink_cost, 2),
                "total_ink_kg": round(total_ink_kg, 3),
                "ink_price_per_kg": ink_price_kg,
                "ink_coverage_sqm_per_kg": ink_coverage,
                "ref": {
                    "source": "Hubergroup/DIC Thailand 2024",
                    "note": f"CMYK Offset {ink_price_kg} THB/kg, coverage {ink_coverage} sqm/kg",
                    "formula": f"พื้นที่ = {round(sheet_area_sqm, 4)} sqm × {paper_net} แผ่น × {total_colors} สี × 0.3 / {ink_coverage} = {round(total_ink_kg, 3)} kg × {ink_price_kg} = {round(ink_cost, 2)}",
                },
            },
            "finishing": {
                "finishing_cost": round(finishing_total, 2),
                "details": finishing_details,
                "ref": {
                    "source": "TPIA / Thai subcontractors 2024",
                    "note": "ราคาตลาดเฉลี่ยจากผู้รับเหมา 4-5 ราย (2024-2025)",
                },
            },
        },
        "errors": errors,
    }


# ================================================================
# Internal helpers
# ================================================================

def _resolve_paper(db: Session, paper_id, paper_code, paper_gsm) -> Paper | None:
    if paper_id:
        return db.query(Paper).filter(Paper.id == paper_id, Paper.active == True).first()

    if paper_code and paper_gsm:
        return db.query(Paper).filter(
            Paper.paper_code == paper_code,
            Paper.gram == paper_gsm,
            Paper.active == True,
        ).first()

    if paper_code:
        return db.query(Paper).filter(
            Paper.paper_code == paper_code,
            Paper.active == True,
        ).first()

    if paper_gsm:
        # Pick the cheapest paper with matching gsm
        return db.query(Paper).filter(
            Paper.gram == paper_gsm,
            Paper.active == True,
        ).order_by(Paper.price.asc()).first()

    return None


def _calc_split(sheet_w, sheet_h, lay_w, lay_h):
    """Calculate imposition: try both orientations, return best."""
    # Orientation 1
    cols1 = math.floor(sheet_w / lay_w)
    rows1 = math.floor(sheet_h / lay_h)
    ups1 = cols1 * rows1

    # Orientation 2 (rotated)
    cols2 = math.floor(sheet_w / lay_h)
    rows2 = math.floor(sheet_h / lay_w)
    ups2 = cols2 * rows2

    if ups1 >= ups2:
        return cols1 * rows1, ups1, False
    else:
        return cols2 * rows2, ups2, True


def _lookup_waste(db: Session, job_type: str, process_type: str, qty: int) -> int:
    """Look up waste from WasteTable. Returns sheets or calculates from pct."""
    row = db.query(WasteTable).filter(
        WasteTable.job_type == job_type,
        WasteTable.process_type == process_type,
        WasteTable.qty_min <= qty,
        (WasteTable.qty_max == None) | (WasteTable.qty_max >= qty),
    ).first()

    if not row:
        # Try "general" as fallback
        row = db.query(WasteTable).filter(
            WasteTable.job_type == "general",
            WasteTable.process_type == process_type,
            WasteTable.qty_min <= qty,
            (WasteTable.qty_max == None) | (WasteTable.qty_max >= qty),
        ).first()

    if not row:
        return 200  # default fallback

    if row.waste_pct > 0:
        return math.ceil(qty * row.waste_pct / 100)
    return row.waste_sheets


def _roundup_100(n: int) -> int:
    """Round up to nearest 100."""
    return math.ceil(n / 100) * 100


def _get_plate_price(db: Session, sheet_w_mm: float, sheet_h_mm: float) -> float:
    """Get plate price based on approximate sheet size."""
    # Try to match plate size
    if sheet_w_mm >= 900 or sheet_h_mm >= 900:
        size_filter = "B1"
    elif sheet_w_mm >= 600 or sheet_h_mm >= 600:
        size_filter = "B2"
    else:
        size_filter = "B2"

    plate = db.query(PlatePrice).filter(
        PlatePrice.active == True,
        PlatePrice.type == "CTP_offset",
        PlatePrice.size.ilike(f"%{size_filter}%"),
    ).first()

    if plate:
        return plate.price_per_plate

    # Fallback: get any CTP plate
    plate = db.query(PlatePrice).filter(
        PlatePrice.active == True,
        PlatePrice.type == "CTP_offset",
    ).first()

    return plate.price_per_plate if plate else 350.0
