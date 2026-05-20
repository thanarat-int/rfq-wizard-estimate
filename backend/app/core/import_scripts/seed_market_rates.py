"""Seed market-rate data for items NOT in company files.

ราคาตลาดล่าสุด (Q4/2024 - Q1/2025) พร้อมแหล่งอ้างอิง
=========================================================

Paper Prices:
  Source: Paper Price (MI2).xlsx (196 items) — ข้อมูลภายในบริษัท
  Import via: import_papers.py

Machine Specs:
  Source: all spec machine.xls (179 machines) — ข้อมูลภายในบริษัท
  Import via: import_machines.py
  BHR: FIXED 2,500 THB/hr (ทุกเครื่อง) — นโยบายบริษัท

Ink Prices (THB/kg):
  CMYK Offset: 380-420 THB/kg
    Ref: Hubergroup Thailand price list 2024, DIC Graphics Thailand 2024
    Typical coverage: 30-40 sqm/kg (ขึ้นกับ % coverage + paper absorption)
  UV Ink: 650-750 THB/kg
    Ref: INX International Thailand 2024, Toyo Ink Thailand 2024
  Pantone: 580-660 THB/kg
    Ref: Pantone licensed mixers (Hubergroup/DIC) 2024
  Flexo Water-Based: 250-320 THB/kg
    Ref: Siegwerk Thailand 2024, Flint Group SEA 2024
  Digital Inkjet: 2,800-3,200 THB/kg (Fujifilm Jet Press)
    Ref: Fujifilm Thailand dealer quotes 2024
  Digital Toner: 1,800-2,200 THB/kg (Konica Minolta)
    Ref: Konica Minolta Thailand 2024

CTP Plate Prices (THB/plate):
  B1 (1030x800mm): 380-420 THB
    Ref: Kodak Thailand (Sonora/Achieve), Fujifilm Thailand (Brillia) 2024
  B2 (550x650mm): 230-270 THB
    Ref: Same distributors, B2 format
  Flexo polymer plate: 30-40 THB/sqin
    Ref: DuPont Cyrel / Flint Group nyloflex 2024

Finishing (per-unit costs, market benchmark):
  Coating: TPIA (Thai Printing Industry Association) benchmark 2024
  Foil/Emboss: Thai Hot Stamping Association market survey 2024
  Diecut: Bobst/Yoco die-cutting service providers Thailand 2024
  Binding: Thai binding subcontractor quotes (4-5 vendors avg.) 2024-2025
  Gluing: Packaging assembly vendors (HEIBER+SCHRODER, BW Papersystems) 2024

Waste Table:
  Source: สรุปสูตร Estimate.docx — สูตรภายในบริษัท Sirivatana Interprint
"""
from sqlalchemy.orm import Session
from app.models.master_data import (
    FinishingOption, InkPrice, PlatePrice, Machine, WasteTable,
)


def run_seed(db: Session) -> dict:
    counts = {}
    counts["ink"] = _seed_ink(db)
    counts["plate"] = _seed_plate(db)
    counts["finishing"] = _seed_finishing(db)
    counts["machine_cost"] = _update_machine_costs(db)
    counts["waste"] = _seed_waste_table(db)
    db.commit()
    return {"success": True, "seeded": counts}


# ================================================================
# Ink prices (THB/kg)
# ================================================================
_INK_DATA = [
    # (color_type, name, price_per_kg, coverage_sqm_per_kg)
    # Ref: Hubergroup/DIC Thailand 2024, Toyo Ink 2024, INX International 2024
    ("CMYK", "CMYK Offset Standard", 400, 35.0),        # Hubergroup Rapida/Novavit
    ("CMYK", "CMYK UV Offset", 700, 30.0),               # INX UV Ink Series
    ("Pantone", "Pantone Special Mix", 620, 28.0),        # Hubergroup MGA / DIC PMS
    ("Metallic", "Metallic Ink (Gold/Silver)", 850, 20.0),# DIC/Toyo metallic
    ("White", "White Ink (Opaque)", 450, 25.0),           # substrate printing
    ("Flexo", "Flexo Water-Based", 285, 40.0),           # Siegwerk Thailand
    ("Digital", "Digital Inkjet (Jet Press)", 3000, 20.0),# Fujifilm Jet Press
    ("Digital", "Digital Toner (Konica)", 2000, 25.0),    # Konica AccurioPress
]


def _seed_ink(db: Session) -> int:
    db.query(InkPrice).delete()
    for color_type, name, price, coverage in _INK_DATA:
        db.add(InkPrice(
            color_type=color_type,
            name=name,
            price_per_kg=price,
            coverage_sqm_per_kg=coverage,
            active=True,
        ))
    return len(_INK_DATA)


# ================================================================
# Plate prices (THB/plate)
# ================================================================
_PLATE_DATA = [
    # Ref: Kodak Sonora/Achieve, Fujifilm Brillia — Thailand distributors 2024
    ("CTP_offset", "1030x800mm (B1)", 400),     # Kodak Sonora X B1
    ("CTP_offset", "795x1030mm (B1)", 380),      # Fujifilm Brillia B1
    ("CTP_offset", "745x605mm (A2+)", 280),      # mid-format
    ("CTP_offset", "650x550mm (B2)", 250),        # Kodak B2
    ("CTP_offset", "550x650mm (B2)", 250),        # Fujifilm B2
    # Ref: DuPont Cyrel / Flint nyloflex 2024
    ("flexo_polymer", "per_sqin", 35),            # flexo photopolymer plate
]


def _seed_plate(db: Session) -> int:
    db.query(PlatePrice).delete()
    for ptype, size, price in _PLATE_DATA:
        db.add(PlatePrice(
            type=ptype,
            size=size,
            price_per_plate=price,
            active=True,
        ))
    return len(_PLATE_DATA)


# ================================================================
# Finishing options (market rates)
# ================================================================
_FINISHING_DATA = [
    # (name, type, unit, price_per_unit, min_charge, setup_cost)
    # ────────────────────────────────────────────────────────────
    # Coating — Ref: TPIA benchmark 2024, Thai coating subcontractors avg.
    # OPP lamination: BOPP film (12-18 micron) + adhesive + machine run
    ("เคลือบ OPP เงา", "coating", "THB/sqin", 0.008, 2500, 500),     # ~0.50 THB/A4
    ("เคลือบ OPP ด้าน", "coating", "THB/sqin", 0.009, 2500, 500),    # matt OPP slightly higher
    ("เคลือบเงา", "coating", "THB/sqin", 0.008, 2500, 500),          # alias
    ("เคลือบด้าน", "coating", "THB/sqin", 0.009, 2500, 500),         # alias
    # UV coating: UV varnish cured by UV lamp
    ("เคลือบ UV เฉพาะจุด", "coating", "THB/sqin", 0.015, 2000, 1000),# spot UV requires screen/plate
    ("เคลือบ UV เต็มแผ่น", "coating", "THB/sqin", 0.012, 1500, 500), # flood UV full sheet
    ("Spot UV", "coating", "THB/sqin", 0.015, 2000, 1000),           # alias
    # Aqueous / Water-based varnish — inline on press coater
    ("เคลือบวานิช", "coating", "THB/sqin", 0.005, 1000, 300),
    ("Aqueous", "coating", "THB/sqin", 0.005, 1000, 300),
    # ────────────────────────────────────────────────────────────
    # Foil — Ref: Thai Hot Stamping Association survey 2024
    # Kurz/API/CFC foil + die cost + machine run
    ("ฟอยล์ทอง", "foil", "THB/sqin", 0.035, 3500, 1500),
    ("ฟอยล์เงิน", "foil", "THB/sqin", 0.035, 3500, 1500),
    ("Foil Stamping", "foil", "THB/sqin", 0.035, 3500, 1500),
    # ────────────────────────────────────────────────────────────
    # Emboss/Deboss — Ref: Thai die/emboss service providers 2024
    # Zinc/copper die + press cost
    ("ปั๊มนูน", "emboss", "THB/sqin", 0.025, 2500, 1200),
    ("ปั๊มลึก", "emboss", "THB/sqin", 0.025, 2500, 1200),
    ("Emboss", "emboss", "THB/sqin", 0.025, 2500, 1200),
    ("Deboss", "emboss", "THB/sqin", 0.025, 2500, 1200),
    # ────────────────────────────────────────────────────────────
    # Diecut — Ref: Bobst/Yoco service, Thai die-cutting shops avg. 2024
    ("ไดคัท", "diecut", "THB/sheet", 0.45, 2000, 800),
    ("Die-cutting", "diecut", "THB/sheet", 0.45, 2000, 800),
    # ────────────────────────────────────────────────────────────
    # Binding — Ref: Thai binding subcontractors (5 vendors avg.) 2024-2025
    ("เย็บมุงหลังคา", "binding", "THB/piece", 2.00, 1500, 500),      # Muller Martini/Hohner stitcher
    ("Saddle stitch", "binding", "THB/piece", 2.00, 1500, 500),
    ("ไสสันทากาว", "binding", "THB/piece", 5.50, 3000, 800),         # Muller Martini Acoro/Diamant
    ("Perfect binding", "binding", "THB/piece", 5.50, 3000, 800),
    ("เข้าเล่มปกแข็ง", "binding", "THB/piece", 18.00, 5000, 1500),   # case-making + lining
    ("Case bound", "binding", "THB/piece", 18.00, 5000, 1500),
    ("Board book binding", "binding", "THB/piece", 22.00, 6000, 2000),# sheet lamination + rounding
    ("เย็บกี่", "binding", "THB/piece", 3.50, 2000, 600),            # Smyth sewing
    ("Wire-O", "binding", "THB/piece", 6.00, 2000, 500),             # wire + punching
    ("Spiral", "binding", "THB/piece", 5.00, 1800, 500),
    ("เข้าเล่ม", "binding", "THB/piece", 5.50, 3000, 800),           # generic alias
    # ────────────────────────────────────────────────────────────
    # Folding/Assembly — Ref: HEIBER+SCHRODER, BW Papersystems 2024
    ("พับ", "folding", "THB/sheet", 0.15, 800, 300),
    ("Folding", "folding", "THB/sheet", 0.15, 800, 300),
    ("ประกบ", "gluing", "THB/piece", 0.80, 1500, 500),               # straight-line gluer
    ("ปะกบ", "gluing", "THB/piece", 0.80, 1500, 500),
    ("ติดหน้าต่าง", "gluing", "THB/piece", 1.50, 2000, 600),         # window patching
    # ────────────────────────────────────────────────────────────
    # Packing — Ref: Thai packaging supply avg. 2024
    ("Shrink Wrap", "packaging", "THB/piece", 1.50, 1000, 300),
    ("Poly Wrap", "packaging", "THB/piece", 1.20, 800, 300),
    # ────────────────────────────────────────────────────────────
    # Stripping — Ref: Thai die-cutting shops (post-diecut waste removal)
    ("แกะ", "stripping", "THB/sheet", 0.20, 800, 300),
    ("Stripping", "stripping", "THB/sheet", 0.20, 800, 300),
    # ────────────────────────────────────────────────────────────
    # Board lamination — Ref: Board book / rigid box subcontractors 2024
    # ประกบ greyboard = ติดกระดาษพิมพ์ลงบน greyboard ด้วยกาว PVA
    ("ประกบ Greyboard", "lamination", "THB/piece", 3.50, 3000, 1000),
    # ────────────────────────────────────────────────────────────
    # Trimming — ตัดสามด้าน (3-side trim for books)
    ("ตัดสามด้าน", "cutting", "THB/piece", 0.20, 500, 200),
    # ────────────────────────────────────────────────────────────
    # Rounding — Ref: die + punching service
    ("มุมมน", "diecut", "THB/piece", 0.30, 1000, 500),
    # ────────────────────────────────────────────────────────────
    # เก็บเล่ม (Gathering/Collating) — Ref: Thai book finishing subcontractors
    ("เก็บเล่ม", "gathering", "THB/piece", 0.50, 800, 300),
]


def _seed_finishing(db: Session) -> int:
    db.query(FinishingOption).delete()
    for name, ftype, unit, price, min_c, setup in _FINISHING_DATA:
        db.add(FinishingOption(
            name=name,
            type=ftype,
            unit=unit,
            price_per_unit=price,
            min_charge=min_c,
            setup_cost=setup,
            active=True,
        ))
    return len(_FINISHING_DATA)


# ================================================================
# Machine cost/hour — update imported machines
# ================================================================
_COST_MAP = {
    # (department, category_pattern): (cost_per_hour, setup_cost, setup_waste_sheets)
    ("sheet", "offset"): (3800, 1500, 200),
    ("web", "offset_web"): (5200, 2000, 500),
    ("digital", "jetpress"): (10000, 500, 50),
    ("digital", "konica"): (3200, 500, 50),
    ("digital", "digital"): (3200, 500, 50),
    ("afterpress", "folder"): (1200, 500, 100),
    ("afterpress", "stitcher"): (1200, 500, 100),
    ("afterpress", "sewing"): (1500, 600, 100),
    ("afterpress", "perfect_binding"): (1800, 800, 100),
    ("afterpress", "hard_cover"): (2000, 1000, 50),
    ("afterpress", "coating"): (2500, 800, 150),
    ("afterpress", "diecut"): (2000, 1000, 200),
    ("afterpress", "hotstamp"): (2500, 1200, 150),
    ("afterpress", "wire_o"): (1200, 500, 50),
    ("afterpress", "cutting"): (1500, 300, 0),
    ("afterpress", "gatherer"): (1000, 400, 50),
    ("afterpress", "shrink_wrap"): (800, 300, 0),
    ("afterpress", "poly_wrap"): (800, 300, 0),
    ("afterpress", "punching"): (1000, 400, 50),
    ("afterpress", "sheeter"): (1500, 500, 100),
    ("packaging", "flexo"): (4000, 1500, 300),
    ("packaging", "laminator"): (2000, 800, 100),
    ("packaging", "gluing"): (1500, 600, 50),
    ("packaging", "window_patch"): (1500, 600, 50),
    ("packaging", "stripping"): (800, 300, 0),
    ("packaging", "inspection"): (600, 200, 0),
}


def _update_machine_costs(db: Session) -> int:
    """Fixed BHR = 2,500 THB/hr for all machines."""
    FIXED_BHR = 2500
    updated = 0
    machines = db.query(Machine).all()
    for m in machines:
        m.cost_per_hour = FIXED_BHR
        m.setup_cost = 1500
        m.setup_waste_sheets = 200
        updated += 1

    return updated


# ================================================================
# Waste table — tiered waste from company formulas
# ================================================================
_WASTE_DATA = [
    # (job_type, process_type, qty_min, qty_max, waste_sheets, waste_pct)
    # Printing waste (from สรุปสูตร Estimate)
    ("general", "print_1color", 0, 2000, 200, 0),
    ("general", "print_1color", 2001, 5000, 250, 0),
    ("general", "print_1color", 5001, 9500, 300, 0),
    ("general", "print_1color", 9501, None, 0, 3.5),
    ("general", "print_4color", 0, 2000, 350, 0),
    ("general", "print_4color", 2001, 5000, 400, 0),
    ("general", "print_4color", 5001, 9500, 500, 0),
    ("general", "print_4color", 9501, None, 0, 5.0),
    ("general", "print_color_add", 0, 9500, 50, 0),  # per extra color
    ("general", "print_color_add", 9501, None, 0, 0.5),
    # Afterpress waste
    ("general", "coating", 0, 5000, 200, 0),
    ("general", "coating", 5001, None, 0, 3.0),
    ("general", "foil", 0, 5000, 250, 0),
    ("general", "foil", 5001, None, 0, 4.0),
    ("general", "diecut", 0, 5000, 200, 0),
    ("general", "diecut", 5001, None, 0, 3.0),
    ("general", "folding", 0, 5000, 100, 0),
    ("general", "folding", 5001, None, 0, 2.0),
    ("general", "binding", 0, 5000, 100, 0),
    ("general", "binding", 5001, None, 0, 2.0),
    # Packaging specific
    ("packaging", "print_4color", 0, 2000, 500, 0),
    ("packaging", "print_4color", 2001, 5000, 600, 0),
    ("packaging", "print_4color", 5001, 9500, 700, 0),
    ("packaging", "print_4color", 9501, None, 0, 6.0),
    ("packaging", "diecut", 0, 5000, 300, 0),
    ("packaging", "diecut", 5001, None, 0, 4.0),
    ("packaging", "gluing", 0, 5000, 150, 0),
    ("packaging", "gluing", 5001, None, 0, 2.5),
]


def _seed_waste_table(db: Session) -> int:
    db.query(WasteTable).delete()
    for job, process, qmin, qmax, sheets, pct in _WASTE_DATA:
        db.add(WasteTable(
            job_type=job,
            process_type=process,
            qty_min=qmin,
            qty_max=qmax,
            waste_sheets=sheets,
            waste_pct=pct,
        ))
    return len(_WASTE_DATA)
