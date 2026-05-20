"""
Pricing Calculator
รวมต้นทุนทั้งหมด + markup + margin
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.core.calculator.paper import calculate_paper_cost
from app.core.calculator.plate import calculate_plate_cost
from app.core.calculator.ink import calculate_ink_cost
from app.core.calculator.machine import calculate_machine_cost
from app.core.calculator.finishing import calculate_finishing_cost


def calculate_total_cost(
    # Job spec
    quantity: int,
    piece_w: float,  # ซม.
    piece_h: float,  # ซม.
    colors_front: int = 4,
    colors_back: int = 0,
    # Paper
    sheet_w: float = 79.0,  # ขนาดกระดาษ default FullSheet
    sheet_h: float = 109.0,
    price_per_kg: float = 35.0,
    weight_per_sheet: float = 0.1,
    price_per_sheet: Optional[float] = None,
    # Machine
    speed_sheets_per_hour: int = 8000,
    machine_cost_per_hour: float = 2500.0,
    machine_setup_cost: float = 500.0,
    # Plate
    price_per_plate: float = 350.0,
    is_repeat_job: bool = False,
    # Finishing
    finishing_items: list[dict] = None,
    # Margins
    markup_pct: float = 30.0,
    margin_pct: float = 0,
    logistics_cost: float = 0,
    other_cost: float = 0,
    # Parameters
    waste_pct: float = 5.0,
    setup_waste_sheets: int = 200,
    grip_margin: float = 1.0,
    bleed: float = 0.3,
    ink_price_per_kg: float = 450.0,
) -> dict:
    """
    คำนวณต้นทุนรวมทั้งหมด

    Returns:
        Complete cost breakdown dict
    """
    if finishing_items is None:
        finishing_items = []

    # 1. Paper cost
    paper_result = calculate_paper_cost(
        quantity=quantity,
        piece_w=piece_w,
        piece_h=piece_h,
        sheet_w=sheet_w,
        sheet_h=sheet_h,
        price_per_kg=price_per_kg,
        weight_per_sheet=weight_per_sheet,
        price_per_sheet=price_per_sheet,
        waste_pct=waste_pct,
        setup_waste_sheets=setup_waste_sheets,
        grip_margin=grip_margin,
        bleed=bleed,
    )

    if "error" in paper_result:
        return {"error": paper_result["error"]}

    total_sheets = paper_result["total_sheets_with_waste"]

    # 2. Plate cost
    plate_result = calculate_plate_cost(
        colors_front=colors_front,
        colors_back=colors_back,
        price_per_plate=price_per_plate,
        is_repeat_job=is_repeat_job,
    )

    # 3. Ink cost
    ink_result = calculate_ink_cost(
        total_sheets=total_sheets,
        sheet_w=sheet_w,
        sheet_h=sheet_h,
        colors_front=colors_front,
        colors_back=colors_back,
        ink_price_per_kg=ink_price_per_kg,
    )

    # 4. Machine cost
    machine_result = calculate_machine_cost(
        total_sheets=total_sheets,
        speed_sheets_per_hour=speed_sheets_per_hour,
        cost_per_hour=machine_cost_per_hour,
        setup_cost=machine_setup_cost,
        colors_front=colors_front,
        colors_back=colors_back,
    )

    # 5. Finishing cost
    sheet_area_sqcm = sheet_w * sheet_h
    finishing_result = calculate_finishing_cost(
        finishing_items=finishing_items,
        total_sheets=total_sheets,
        quantity=quantity,
        sheet_area_sqcm=sheet_area_sqcm,
    )

    # 6. Sum up
    subtotal = (
        paper_result["paper_cost"]
        + plate_result["plate_cost"]
        + ink_result["ink_cost"]
        + machine_result["print_cost"]
        + finishing_result["finishing_cost"]
        + logistics_cost
        + other_cost
    )

    # Apply markup
    if markup_pct > 0:
        total_with_markup = subtotal * (1 + markup_pct / 100)
    else:
        total_with_markup = subtotal

    # Apply margin (ถ้ามี)
    if margin_pct > 0:
        total_cost = total_with_markup / (1 - margin_pct / 100)
    else:
        total_cost = total_with_markup

    unit_cost = total_cost / quantity if quantity > 0 else 0

    return {
        "paper_cost": paper_result["paper_cost"],
        "plate_cost": plate_result["plate_cost"],
        "ink_cost": ink_result["ink_cost"],
        "print_cost": machine_result["print_cost"],
        "finishing_cost": finishing_result["finishing_cost"],
        "logistics_cost": logistics_cost,
        "other_cost": other_cost,
        "subtotal": round(subtotal, 2),
        "markup_pct": markup_pct,
        "margin_pct": margin_pct,
        "total_cost": round(total_cost, 2),
        "unit_cost": round(unit_cost, 2),
        "quantity": quantity,
        "breakdown": {
            "paper": paper_result,
            "plate": plate_result,
            "ink": ink_result,
            "machine": machine_result,
            "finishing": finishing_result,
        },
    }
