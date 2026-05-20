"""
Plate Cost Calculator
คำนวณค่าแม่พิมพ์ (CTP Plate)
"""


def calculate_plate_cost(
    colors_front: int,
    colors_back: int = 0,
    price_per_plate: float = 350.0,
    is_repeat_job: bool = False,
) -> dict:
    """
    คำนวณค่าแม่พิมพ์

    Args:
        colors_front: จำนวนสีหน้า
        colors_back: จำนวนสีหลัง
        price_per_plate: ราคาต่อ plate
        is_repeat_job: งานซ้ำ (ไม่ต้องทำ plate ใหม่)
    """
    if is_repeat_job:
        return {
            "plate_cost": 0,
            "total_plates": 0,
            "plates_front": 0,
            "plates_back": 0,
            "note": "งานซ้ำ - ใช้ plate เดิม",
        }

    total_plates = colors_front + colors_back
    plate_cost = total_plates * price_per_plate

    return {
        "plate_cost": round(plate_cost, 2),
        "total_plates": total_plates,
        "plates_front": colors_front,
        "plates_back": colors_back,
        "price_per_plate": price_per_plate,
    }
