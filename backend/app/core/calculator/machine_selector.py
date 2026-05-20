"""
Machine Selector — เลือกเครื่องจักรที่เหมาะสมจาก DB
ใช้ข้อมูลจริงของ Sirivatana Interprint เท่านั้น
"""
from sqlalchemy.orm import Session
from app.models.master_data import Machine


def select_machine(
    db: Session,
    paper_w_mm: float,
    paper_h_mm: float,
    paper_gsm: int = 0,
    colors_front: int = 4,
    department: str = "sheet",
    machine_category: str = None,
) -> Machine | None:
    """
    เลือกเครื่องจักรที่เหมาะสมที่สุด

    Logic:
    1. Filter by department
    2. Filter ขนาดกระดาษ: max_paper_w >= paper_w AND max_paper_h >= paper_h
    3. Filter แกรม: gsm_min <= paper_gsm <= gsm_max (if set)
    4. Filter สี: max_colors >= colors_front
    5. เรียงตาม speed DESC → เลือกเร็วสุด
    """
    query = db.query(Machine).filter(
        Machine.active == True,
        Machine.department == department,
    )

    if machine_category:
        query = query.filter(Machine.machine_category == machine_category)

    # Filter by paper size (machine must accept the paper)
    query = query.filter(
        Machine.max_paper_w >= paper_w_mm,
        Machine.max_paper_h >= paper_h_mm,
    )

    # Filter by gsm range (only if machine has gsm limits set)
    if paper_gsm > 0:
        query = query.filter(
            (Machine.gsm_min == None) | (Machine.gsm_min <= paper_gsm),
            (Machine.gsm_max == None) | (Machine.gsm_max >= paper_gsm),
        )

    # Filter by color count (only for press machines)
    if department in ("sheet", "web", "digital"):
        query = query.filter(Machine.max_colors >= colors_front)

    # Order by speed descending — pick the fastest machine that fits
    query = query.order_by(Machine.speed_sheets_per_hour.desc())

    return query.first()


def select_machine_flexible(
    db: Session,
    paper_w_mm: float,
    paper_h_mm: float,
    paper_gsm: int = 0,
    colors_front: int = 4,
) -> Machine | None:
    """
    Try multiple departments in order: sheet → web → digital
    Returns the first suitable machine found.
    """
    for dept in ["sheet", "web", "digital"]:
        machine = select_machine(
            db, paper_w_mm, paper_h_mm, paper_gsm, colors_front, department=dept,
        )
        if machine:
            return machine

    # Fallback: try without size filter (for very small jobs)
    return db.query(Machine).filter(
        Machine.active == True,
        Machine.department.in_(["sheet", "digital"]),
        Machine.max_colors >= colors_front,
    ).order_by(Machine.speed_sheets_per_hour.desc()).first()
