"""
Finishing Cost Calculator
คำนวณค่า finishing: เคลือบ, ปั๊มฟอยล์, ไดคัท, พับ, เข้าเล่ม, ฯลฯ
"""


def calculate_finishing_cost(
    finishing_items: list[dict],
    total_sheets: int,
    quantity: int,
    sheet_area_sqcm: float = 0,
) -> dict:
    """
    คำนวณค่า finishing ทั้งหมด

    Args:
        finishing_items: [{name, type, unit, price_per_unit, setup_cost, min_charge}]
        total_sheets: จำนวนแผ่นรวม
        quantity: จำนวนชิ้นสำเร็จ
        sheet_area_sqcm: พื้นที่กระดาษ (ตร.ซม.) สำหรับคิดเคลือบ
    """
    details = []
    total_cost = 0

    for item in finishing_items:
        name = item.get("name", "")
        unit = item.get("unit", "ต่อแผ่น")
        price_per_unit = item.get("price_per_unit", 0)
        setup_cost = item.get("setup_cost", 0)
        min_charge = item.get("min_charge", 0)

        # คำนวณตามหน่วย
        if unit == "ต่อแผ่น":
            item_cost = total_sheets * price_per_unit
        elif unit == "ต่อชิ้น":
            item_cost = quantity * price_per_unit
        elif unit == "ต่อตร.ซม.":
            item_cost = sheet_area_sqcm * total_sheets * price_per_unit
        elif unit == "ต่อตร.นิ้ว":
            item_cost = (sheet_area_sqcm / 6.4516) * total_sheets * price_per_unit
        else:
            item_cost = quantity * price_per_unit

        # บวกค่า setup
        item_cost += setup_cost

        # ตรวจ minimum charge
        if item_cost < min_charge:
            item_cost = min_charge

        total_cost += item_cost
        details.append({
            "name": name,
            "unit": unit,
            "price_per_unit": price_per_unit,
            "setup_cost": setup_cost,
            "cost": round(item_cost, 2),
        })

    return {
        "finishing_cost": round(total_cost, 2),
        "details": details,
    }
