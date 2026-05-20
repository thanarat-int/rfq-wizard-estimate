"""
Ink Cost Calculator
คำนวณค่าหมึกพิมพ์
"""


def calculate_ink_cost(
    total_sheets: int,
    sheet_w: float,
    sheet_h: float,
    colors_front: int,
    colors_back: int = 0,
    ink_price_per_kg: float = 450.0,
    coverage_pct: float = 30.0,  # % การเกลี่ยหมึก
    ink_consumption_g_per_sqm: float = 2.0,  # กรัมต่อตร.ม. ต่อสี
) -> dict:
    """
    คำนวณค่าหมึก

    Args:
        total_sheets: จำนวนแผ่นรวม waste
        sheet_w: ความกว้างกระดาษ (ซม.)
        sheet_h: ความยาวกระดาษ (ซม.)
        colors_front: จำนวนสีหน้า
        colors_back: จำนวนสีหลัง
        ink_price_per_kg: ราคาหมึกต่อ กก.
        coverage_pct: % การเกลี่ยหมึก
        ink_consumption_g_per_sqm: การใช้หมึก (กรัม/ตร.ม./สี)
    """
    # พื้นที่พิมพ์ต่อแผ่น (ตร.ม.)
    sheet_area_sqm = (sheet_w / 100) * (sheet_h / 100)

    # พื้นที่พิมพ์จริง (ตามเปอร์เซ็นต์ coverage)
    actual_area = sheet_area_sqm * (coverage_pct / 100)

    # ปริมาณหมึกหน้า (กก.)
    ink_front_kg = (actual_area * ink_consumption_g_per_sqm * colors_front * total_sheets) / 1000

    # ปริมาณหมึกหลัง (กก.)
    ink_back_kg = (actual_area * ink_consumption_g_per_sqm * colors_back * total_sheets) / 1000

    total_ink_kg = ink_front_kg + ink_back_kg
    ink_cost = total_ink_kg * ink_price_per_kg

    return {
        "ink_cost": round(ink_cost, 2),
        "total_ink_kg": round(total_ink_kg, 3),
        "ink_front_kg": round(ink_front_kg, 3),
        "ink_back_kg": round(ink_back_kg, 3),
        "coverage_pct": coverage_pct,
    }
