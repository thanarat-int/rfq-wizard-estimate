from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin


class RFQStatus(str, enum.Enum):
    DRAFT = "draft"
    PARSING = "parsing"
    PARSED = "parsed"
    CALCULATING = "calculating"
    CALCULATED = "calculated"
    QUOTED = "quoted"
    APPROVED = "approved"
    REJECTED = "rejected"


class InputType(str, enum.Enum):
    CHAT = "chat"
    FORM = "form"
    FILE_UPLOAD = "file_upload"


class RFQRequest(Base, TimestampMixin):
    __tablename__ = "rfq_requests"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=True)
    input_type = Column(String(50), nullable=False)
    raw_input = Column(Text)  # ข้อความ input ดั้งเดิม
    file_path = Column(String(500))  # path ไฟล์ที่ upload (legacy single file)
    attachments_json = Column(JSON)  # [{filename, file_path, file_type, size_bytes}]
    source_channel = Column(String(50))  # web, email, line, api
    parsed_spec_json = Column(JSON)  # spec ที่ AI แยกได้
    status = Column(String(50), default=RFQStatus.DRAFT)
    notes = Column(Text)

    items = relationship("RFQItem", back_populates="rfq", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="rfq", cascade="all, delete-orphan")


class RFQItem(Base, TimestampMixin):
    __tablename__ = "rfq_items"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfq_requests.id"), nullable=False)
    product_type = Column(String(100), nullable=False)  # box, label, brochure, etc.
    product_name = Column(String(200))
    dimensions_json = Column(JSON)  # {width, height, depth, unit}
    paper_id = Column(Integer, ForeignKey("papers.id"))
    paper_gsm = Column(Integer)
    colors_front = Column(Integer, default=4)
    colors_back = Column(Integer, default=0)
    quantity = Column(Integer, nullable=False)
    finishing_json = Column(JSON)  # [{finishing_id, options}]
    special_instructions = Column(Text)

    rfq = relationship("RFQRequest", back_populates="items")
    calculation = relationship("Calculation", back_populates="rfq_item", uselist=False)


class Calculation(Base, TimestampMixin):
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    rfq_item_id = Column(Integer, ForeignKey("rfq_items.id"), nullable=False, unique=True)

    # Cost breakdown
    paper_cost = Column(Float, default=0)
    plate_cost = Column(Float, default=0)
    ink_cost = Column(Float, default=0)
    print_cost = Column(Float, default=0)  # machine hour
    finishing_cost = Column(Float, default=0)
    logistics_cost = Column(Float, default=0)
    other_cost = Column(Float, default=0)

    # Totals
    subtotal = Column(Float, default=0)
    markup_pct = Column(Float, default=0)
    margin_pct = Column(Float, default=0)
    total_cost = Column(Float, default=0)
    unit_cost = Column(Float, default=0)

    # Detailed breakdown
    breakdown_json = Column(JSON)  # รายละเอียดการคำนวณทั้งหมด

    rfq_item = relationship("RFQItem", back_populates="calculation")


# ─── NEW: Project → Components[] Architecture ───

class Project(Base, TimestampMixin):
    """Top-level project container for multi-component RFQs."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfq_requests.id"), nullable=True)
    project_name = Column(String(300))
    customer = Column(String(300))
    brand = Column(String(200))
    reference_no = Column(String(100))
    job_category = Column(String(50), default="packaging")
    notes = Column(Text)
    status = Column(String(50), default="draft")  # draft, review, locked

    # GPT Concept: Project Header fields
    requester_ae = Column(String(200))                # AE owner / requester
    incoterm = Column(String(20))                     # FOB, CIF, EXW, DDP
    destination = Column(String(300))                 # shipping destination
    currency = Column(String(10), default="THB")      # THB, USD, HKD
    quote_due_date = Column(DateTime, nullable=True)  # when quotation is due
    compliance_json = Column(JSON)                    # ["FSC", "Food contact", ...]

    rfq = relationship("RFQRequest", backref="project")
    components = relationship("Component", back_populates="project", cascade="all, delete-orphan")


class Component(Base, TimestampMixin):
    """Single component within a project (e.g., Tray, Sleeve, Divider)."""
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    component_name = Column(String(200), nullable=False)
    template_type = Column(Integer)                     # 1-12 (TemplateType enum)
    job_category = Column(String(50), default="packaging")
    sort_order = Column(Integer, default=0)
    role = Column(String(20), default="primary")        # primary, secondary

    # Structured JSON fields
    dimensions_json = Column(JSON)                      # {width, height, depth, unit, reference, flaps{dust,t,g,ol}, dieline_files[]}
    material_json = Column(JSON)                        # {family, type, code, gsm, board_type, flute, grade}
    print_color_json = Column(JSON)                     # {outside: PrintColorDetail, inside: PrintColorDetail|"no_print"}
    after_press_json = Column(JSON)                     # AfterPressDetail dict (with foil sub-fields)
    finishing_json = Column(JSON)                       # [string] list
    packing_json = Column(JSON)                         # {method, pack_per_carton, pallet_req}

    quantity = Column(Integer, default=0, nullable=False)
    set_qty = Column(Integer, nullable=True)            # qty of sets (if sold as set)
    units_per_set = Column(Integer, default=1)          # how many of this component per set
    extra_fields_json = Column(JSON)                    # [{label, value, field_type}]
    confidence = Column(Float, default=0)

    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=True)

    project = relationship("Project", back_populates="components")
    calculation = relationship("ComponentCalculation", back_populates="component", uselist=False,
                               cascade="all, delete-orphan")


class ComponentCalculation(Base, TimestampMixin):
    """Cost calculation for a single component (4-block structure)."""
    __tablename__ = "component_calculations"

    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False, unique=True)

    # 4 Cost Blocks
    materials_cost = Column(Float, default=0)           # paper + plate
    print_press_cost = Column(Float, default=0)         # printing + special ink
    after_press_cost = Column(Float, default=0)         # diecut, assembly, coating, foil, emboss
    packing_cost = Column(Float, default=0)             # packing + add-ons

    # Totals
    subtotal = Column(Float, default=0)
    markup_pct = Column(Float, default=0)
    total_cost = Column(Float, default=0)
    unit_cost = Column(Float, default=0)

    # Detailed breakdown
    breakdown_json = Column(JSON)

    component = relationship("Component", back_populates="calculation")
