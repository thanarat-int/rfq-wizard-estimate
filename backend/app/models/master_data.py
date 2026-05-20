from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON
from app.models.base import Base, TimestampMixin


class Paper(Base, TimestampMixin):
    """กระดาษ — ข้อมูลจาก Paper Price (MI2).xlsx"""
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)

    # --- จาก Paper Price (MI2).xlsx ---
    paper_code = Column(String(20), index=True)          # GA, MA, WF, WC, AC C1s, etc.
    paper_type = Column(String(100))                      # Gloss Art, Matt Art, Woodfree, etc.
    gram = Column(Integer)                                # แกรม (gsm)
    thickness_micron = Column(Float)
    thickness_mm = Column(Float)
    price = Column(Float)                                 # ราคาจาก xlsx (THB/kg or THB/sheet)
    special_ink_paper_code = Column(String(50))
    category_id = Column(Integer)                         # 1=paper/card, 2=sticker, 3=board
    is_fsc = Column(Boolean, default=False)
    project_code = Column(String(100))                    # packaging,popup,book
    price_import = Column(Float)                          # ราคา import
    is_only_baht_per_sheet = Column(Integer, default=0)   # 0=per kg, 1=per sheet
    only_print_type = Column(String(100))                 # Offset, Jet Press, Konica, NULL
    only_print_type_id = Column(Integer)
    brand = Column(String(200))
    supplier = Column(String(200))
    brand_import = Column(String(200))
    supplier_import = Column(String(200))

    # --- Legacy / compatibility ---
    name = Column(String(200))
    type = Column(String(100))
    gsm = Column(Integer)
    size_w = Column(Float)        # ความกว้างแผ่น (ซม.) — ไม่มีใน xlsx, set ตอน job
    size_h = Column(Float)        # ความยาวแผ่น (ซม.)
    price_per_kg = Column(Float)  # derived from price when is_only_baht_per_sheet=0
    price_per_sheet = Column(Float)  # derived from price when is_only_baht_per_sheet=1
    weight_per_sheet = Column(Float)
    active = Column(Boolean, default=True)
    notes = Column(Text)


class Machine(Base, TimestampMixin):
    """เครื่องจักร — ข้อมูลจาก all spec machine.xls"""
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)

    # --- จาก all spec machine.xls ---
    department = Column(String(50), index=True)    # sheet, web, afterpress, packaging, digital
    machine_category = Column(String(100))         # offset, folder, stitcher, diecut, coating, etc.

    # Press dimensions (mm → stored as mm for accuracy)
    max_paper_w = Column(Float)     # max paper width (mm)
    max_paper_h = Column(Float)     # max paper height (mm)
    min_paper_w = Column(Float)     # min paper width (mm)
    min_paper_h = Column(Float)     # min paper height (mm)
    max_print_w = Column(Float)     # max print area width (mm)
    max_print_h = Column(Float)     # max print area height (mm)
    plate_size_w = Column(Float)    # plate width (mm)
    plate_size_h = Column(Float)    # plate height (mm)

    # Paper weight range
    gsm_min = Column(Integer)
    gsm_max = Column(Integer)

    # Throughput
    setup_time_min = Column(Integer, default=0)        # setup time (minutes)
    speed_sheets_per_hour = Column(Integer, default=0)
    max_colors = Column(Integer, default=4)

    # Cost — seeded from market rates (ไม่มีใน xlsx)
    cost_per_hour = Column(Float, default=0)
    setup_cost = Column(Float, default=0)
    setup_waste_sheets = Column(Integer, default=200)

    # Legacy
    type = Column(String(100))
    max_width = Column(Float)
    max_height = Column(Float)
    min_width = Column(Float)
    min_height = Column(Float)

    active = Column(Boolean, default=True)
    notes = Column(Text)


class WasteTable(Base, TimestampMixin):
    """ตาราง waste แบบ tiered ตามจำนวน — จากสูตร Estimate"""
    __tablename__ = "waste_tables"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50), index=True)   # packaging, book, leaflet, etc.
    process_type = Column(String(50))            # print, afterpress, coating, foil, etc.
    qty_min = Column(Integer, default=0)
    qty_max = Column(Integer)                    # NULL = no upper limit
    waste_sheets = Column(Integer, default=0)    # fixed sheets (when qty <= 9500)
    waste_pct = Column(Float, default=0)         # percentage (when qty > 9500)
    notes = Column(Text)


class FinishingOption(Base, TimestampMixin):
    """ค่า finishing — seeded from market rates"""
    __tablename__ = "finishing_options"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(100), nullable=False)  # coating, foil, diecut, folding, binding
    unit = Column(String(50), nullable=False)    # ต่อแผ่น, ต่อตร.นิ้ว, ต่อชิ้น
    price_per_unit = Column(Float, nullable=False)
    min_charge = Column(Float, default=0)
    setup_cost = Column(Float, default=0)
    active = Column(Boolean, default=True)
    notes = Column(Text)


class InkPrice(Base, TimestampMixin):
    """ราคาหมึก — seeded from market rates"""
    __tablename__ = "ink_prices"

    id = Column(Integer, primary_key=True, index=True)
    color_type = Column(String(100), nullable=False)  # CMYK, Pantone, Flexo, Digital
    name = Column(String(200), nullable=False)
    price_per_kg = Column(Float, nullable=False)
    coverage_sqm_per_kg = Column(Float)
    active = Column(Boolean, default=True)


class PlatePrice(Base, TimestampMixin):
    """ราคาเพลท — seeded from market rates"""
    __tablename__ = "plate_prices"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(100), nullable=False)  # CTP_offset, flexo_polymer
    size = Column(String(100))                  # 1030x800, per_sqin
    price_per_plate = Column(Float, nullable=False)
    active = Column(Boolean, default=True)


class Formula(Base, TimestampMixin):
    """สูตรคำนวณ"""
    __tablename__ = "formulas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    formula_json = Column(JSON, nullable=False)
    description = Column(Text)
    active = Column(Boolean, default=True)
