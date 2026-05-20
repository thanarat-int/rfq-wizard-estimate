"""
Machine Cost Calculator
คำนวณค่าเครื่องจักร (Machine Hour)
"""
import math


def calculate_machine_cost(
    total_sheets: int,
    speed_sheets_per_hour: int,
    cost_per_hour: float,
    setup_cost: float = 0,
    colors_front: int = 4,
    colors_back: int = 0,
    is_perfecting: bool = False,  # พิมพ์หน้า-หลังพร้อมกัน
) -> dict:
    """
    คำนวณค่าเครื่องจักร

    Args:
        total_sheets: จำนวนแผ่นรวม waste
        speed_sheets_per_hour: ความเร็วเครื่อง (แผ่น/ชม.)
        cost_per_hour: ค่าเครื่องต่อชั่วโมง
        setup_cost: ค่า setup
        colors_front: จำนวนสีหน้า
        colors_back: จำนวนสีหลัง
        is_perfecting: พิมพ์หน้า-หลังพร้อมกัน
    """
    # จำนวนรอบพิมพ์
    if is_perfecting:
        # เครื่อง perfecting พิมพ์หน้า-หลังพร้อมกัน
        passes = 1
    else:
        passes = 1  # หน้า
        if colors_back > 0:
            passes = 2  # หน้า + หลัง

    total_impressions = total_sheets * passes

    # เวลาพิมพ์ (ชั่วโมง)
    print_hours = total_impressions / speed_sheets_per_hour

    # ค่าพิมพ์
    print_cost = (print_hours * cost_per_hour) + setup_cost

    return {
        "print_cost": round(print_cost, 2),
        "print_hours": round(print_hours, 2),
        "total_impressions": total_impressions,
        "passes": passes,
        "setup_cost": setup_cost,
        "machine_cost_per_hour": cost_per_hour,
    }
