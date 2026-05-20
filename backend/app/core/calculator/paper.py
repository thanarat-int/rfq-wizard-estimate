"""
Paper Cost Calculator
คำนวณต้นทุนกระดาษสำหรับงานพิมพ์

สูตรหลัก:
1. คำนวณจำนวนดวง/แผ่น (imposition)
2. คำนวณจำนวนแผ่นที่ต้องใช้
3. บวก waste
4. คำนวณราคา
"""
import math
from typing import Optional


def calculate_imposition(
    sheet_w: float,
    sheet_h: float,
    piece_w: float,
    piece_h: float,
    grip_margin: float = 1.0,  # ขอบจับ (ซม.)
    bleed: float = 0.3,  # bleed (ซม.)
) -> dict:
    """
    คำนวณจำนวนดวงต่อแผ่น (imposition)

    Args:
        sheet_w: ความกว้างกระดาษ (ซม.)
        sheet_h: ความยาวกระดาษ (ซม.)
        piece_w: ความกว้างชิ้นงาน (ซม.)
        piece_h: ความยาวชิ้นงาน (ซม.)
        grip_margin: ขอบจับเครื่อง (ซม.)
        bleed: ขอบ bleed รอบชิ้นงาน (ซม.)
    """
    # ขนาดชิ้นงานรวม bleed
    total_piece_w = piece_w + (bleed * 2)
    total_piece_h = piece_h + (bleed * 2)

    # พื้นที่พิมพ์ได้จริง (หักขอบจับ)
    printable_w = sheet_w - (grip_margin * 2)
    printable_h = sheet_h - grip_margin

    # ลอง 2 แบบ: แนวตั้ง vs แนวนอน
    # แบบ 1: ชิ้นงานตั้ง
    cols_1 = math.floor(printable_w / total_piece_w)
    rows_1 = math.floor(printable_h / total_piece_h)
    count_1 = cols_1 * rows_1

    # แบบ 2: ชิ้นงานหมุน 90 องศา
    cols_2 = math.floor(printable_w / total_piece_h)
    rows_2 = math.floor(printable_h / total_piece_w)
    count_2 = cols_2 * rows_2

    if count_1 >= count_2:
        return {
            "pieces_per_sheet": count_1,
            "cols": cols_1,
            "rows": rows_1,
            "rotated": False,
            "piece_w_with_bleed": total_piece_w,
            "piece_h_with_bleed": total_piece_h,
        }
    else:
        return {
            "pieces_per_sheet": count_2,
            "cols": cols_2,
            "rows": rows_2,
            "rotated": True,
            "piece_w_with_bleed": total_piece_w,
            "piece_h_with_bleed": total_piece_h,
        }


def calculate_paper_cost(
    quantity: int,
    piece_w: float,
    piece_h: float,
    sheet_w: float,
    sheet_h: float,
    price_per_kg: float,
    weight_per_sheet: float,
    price_per_sheet: Optional[float] = None,
    waste_pct: float = 5.0,
    setup_waste_sheets: int = 200,
    grip_margin: float = 1.0,
    bleed: float = 0.3,
) -> dict:
    """
    คำนวณต้นทุนกระดาษ

    Returns:
        dict with paper_cost, sheets_needed, pieces_per_sheet, etc.
    """
    # คำนวณ imposition
    imposition = calculate_imposition(sheet_w, sheet_h, piece_w, piece_h, grip_margin, bleed)
    pieces_per_sheet = imposition["pieces_per_sheet"]

    if pieces_per_sheet == 0:
        return {
            "error": "ขนาดชิ้นงานใหญ่เกินกระดาษ",
            "paper_cost": 0,
            "sheets_needed": 0,
            "pieces_per_sheet": 0,
        }

    # จำนวนแผ่นที่ต้องพิมพ์
    print_sheets = math.ceil(quantity / pieces_per_sheet)

    # บวก waste
    waste_sheets = math.ceil(print_sheets * (waste_pct / 100))
    total_sheets = print_sheets + waste_sheets + setup_waste_sheets

    # คำนวณราคา
    if price_per_sheet and price_per_sheet > 0:
        paper_cost = total_sheets * price_per_sheet
    else:
        paper_cost = total_sheets * weight_per_sheet * price_per_kg

    return {
        "paper_cost": round(paper_cost, 2),
        "sheets_needed": print_sheets,
        "total_sheets_with_waste": total_sheets,
        "pieces_per_sheet": pieces_per_sheet,
        "waste_sheets": waste_sheets + setup_waste_sheets,
        "waste_pct": waste_pct,
        "imposition": imposition,
    }
