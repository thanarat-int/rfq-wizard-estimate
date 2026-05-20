from pydantic import BaseModel
from typing import Optional, Any, Union
from datetime import datetime
from enum import IntEnum


# ─── Legacy ParsedSpec (kept for backward compatibility) ───

class ParsedSpec(BaseModel):
    job_category: str = "packaging"  # "packaging" or "book_commercial"
    product_type: str  # box, label, brochure, poster, etc.
    product_name: Optional[str] = None
    dimensions: Optional[dict] = None  # {width, height, depth, unit}
    paper: Optional[dict] = None  # {type, gsm}
    colors_front: int = 4
    colors_back: int = 0
    quantity: int = 0
    finishing: list[str] = []
    special_instructions: Optional[str] = None
    confidence: float = 0.0  # AI confidence score
    # Dynamic extra fields — captures ALL data from input that doesn't fit standard fields
    extra_fields: Optional[list[dict]] = None  # [{label, value, field_type}]


# ─── Template Types (Packaging) ───

class TemplateType(IntEnum):
    REVERSE_TUCK_END = 1
    STRAIGHT_TUCK_END = 2
    TTSLB = 3           # Tuck Top Snap Lock Bottom
    TTAB = 4            # Tuck Top Auto Bottom
    SIMPLEX_TRAY = 5
    FRAME_VUE_TRAY = 6
    FOUR_CORNER_BEERS = 7
    GABLE_TOP = 8
    SLEEVE = 9
    PILLOW_BOX = 10
    SEAL_END = 11
    CUSTOM = 12


TEMPLATE_TYPE_NAMES = {
    1: "Reverse Tuck End",
    2: "Straight Tuck End",
    3: "TTSLB (Tuck Top Snap Lock Bottom)",
    4: "TTAB (Tuck Top Auto Bottom)",
    5: "Simplex Tray",
    6: "Frame-Vue Tray",
    7: "Four Corner Beers",
    8: "Gable Top",
    9: "Sleeve",
    10: "Pillow Box",
    11: "Seal End",
    12: "Custom",
}


# ─── Print & Color Detail (per side) ───

class SpecialInk(BaseModel):
    name: str                                   # e.g. "Pantone 186 C"
    pantone_ref: Optional[str] = None
    ink_type: str = "pantone"                   # pantone, metallic, fluorescent, white


class PrintColorDetail(BaseModel):
    print_type: str = "offset"                  # offset, digital, flexo, jetpress, konica, no_print
    colors: str = "cmyk"                        # cmyk, special, mixed, none
    color_count: int = 4
    color_limit: str = "standard"               # light, standard, dark
    special_inks: list[SpecialInk] = []
    approved_color_ref: Optional[str] = None    # approved color reference doc from customer


# ─── After Press Detail ───

class DiecutSpec(BaseModel):
    status: str = "none"                        # new, existing, none
    reference: Optional[str] = None             # dieline ref or existing die ID


class AssemblySpec(BaseModel):
    has_glue: bool = False
    glue_spots: int = 0


class FoilSpec(BaseModel):
    enabled: bool = False
    color: Optional[str] = None                 # silver, gold, rose gold, etc.
    area_est: Optional[str] = None              # "30x10mm" or area description
    position_ref: Optional[str] = None          # layer name or file reference


class AfterPressDetail(BaseModel):
    diecut: DiecutSpec = DiecutSpec()
    assembly: AssemblySpec = AssemblySpec()
    inspection: str = "normal"                  # normal, strict, aql, 100
    coating: Optional[str] = None               # OPP เงา, OPP ด้าน, UV spot, UV full, Aqueous
    foil: Optional[Union[str, FoilSpec]] = None # backward compat: string or FoilSpec
    emboss: bool = False
    deboss: bool = False


# ─── Component Spec (single piece within a project) ───

class PackingSpec(BaseModel):
    method: Optional[str] = None                # paper_band, kraft_wrap, carton, pallet, shrink
    pack_per_carton: Optional[int] = None       # pieces per carton
    pallet_req: Optional[bool] = None           # palletised?
    pallet_note: Optional[str] = None           # e.g. "export pallet", "fumigation"


class DimensionSpec(BaseModel):
    width: Optional[float] = None
    height: Optional[float] = None
    depth: Optional[float] = None
    unit: str = "mm"
    reference: Optional[str] = None             # ID, OD, Score (dimension reference type)
    orientation: Optional[str] = None           # portrait, landscape
    flaps: Optional[dict] = None                # {dust, t, g, ol} — template-dependent flap sizes
    dieline_files: Optional[list[str]] = None   # file references for dieline/diecut


class MaterialSpec(BaseModel):
    family: Optional[str] = None                # corrugated, paperboard, other
    type: Optional[str] = None                  # e.g. "Art Card C1S", "E-Flute"
    code: Optional[str] = None                  # e.g. "AC C1s", "Kraft"
    gsm: Optional[int] = None
    brand: Optional[str] = None                 # paper brand e.g. "Promax", "APP"
    board_type: Optional[str] = None
    flute: Optional[str] = None                 # E, B, C, BC (corrugated only)
    grade: Optional[str] = None                 # e.g. "DP250/CA105/CA125"


class ComponentSpec(BaseModel):
    component_name: str = ""
    template_type: Optional[int] = None         # 1-12 for packaging, None for book_commercial
    job_category: str = "packaging"
    role: str = "primary"                       # primary, secondary
    dimensions: Optional[Union[DimensionSpec, dict]] = None
    paper: Optional[Union[MaterialSpec, dict]] = None
    outside: PrintColorDetail = PrintColorDetail()
    inside: Optional[Union[PrintColorDetail, str]] = "no_print"  # PrintColorDetail or "no_print"
    after_press: AfterPressDetail = AfterPressDetail()
    finishing: list[str] = []
    packing: Optional[Union[PackingSpec, str]] = None  # backward compat: string or PackingSpec
    quantity: int = 0
    set_qty: Optional[int] = None               # qty of sets (if sold as set)
    units_per_set: int = 1                      # how many of this component per set
    pages: Optional[int] = None                 # total pages (book/commercial)
    pages_text: Optional[str] = None            # raw text e.g. "12 spreads + cover"
    binding: Optional[str] = None               # e.g. "Board book binding", "Perfect binding"
    extra_fields: Optional[list[dict]] = None
    confidence: float = 0.0


# ─── Blocking Question (AI ask-back) ───

class BlockingQuestion(BaseModel):
    field: str                                  # which field this resolves
    component_name: Optional[str] = None        # null = project-level
    question_th: str                            # Thai text
    options: Optional[list[str]] = None         # clickable options
    priority: int = 99                          # lower = more urgent


# ─── Project Spec (top-level container) ───

class ProjectSpec(BaseModel):
    project_name: Optional[str] = None
    customer: Optional[str] = None
    brand: Optional[str] = None
    reference_no: Optional[str] = None
    job_category: str = "packaging"
    requester_ae: Optional[str] = None          # AE owner / requester
    incoterm: Optional[str] = None              # FOB, CIF, EXW, DDP
    destination: Optional[str] = None           # shipping destination
    currency: str = "THB"                       # THB, USD, HKD
    quote_due_date: Optional[str] = None        # ISO date string
    compliance: Optional[list[str]] = None      # ["FSC", "Food contact"]
    components: list[ComponentSpec] = []
    blocking_questions: list[BlockingQuestion] = []
    notes: Optional[str] = None


# ─── Chat (updated) ───

class ChatMessage(BaseModel):
    message: str
    context: Optional[list[dict]] = None  # previous messages


class ChatResponse(BaseModel):
    reply: str
    parsed_spec: Optional[ParsedSpec] = None        # backward compat (first component)
    project_spec: Optional[ProjectSpec] = None       # NEW: full project with components
    blocking_questions: list[BlockingQuestion] = []   # NEW: AI ask-back questions
    needs_more_info: bool = False
    missing_fields: list[str] = []


class RFQCreate(BaseModel):
    input_type: str  # chat, form, file_upload
    customer_id: Optional[int] = None
    raw_input: Optional[str] = None
    parsed_spec: Optional[dict] = None


class RFQItemCreate(BaseModel):
    product_type: str
    product_name: Optional[str] = None
    dimensions_json: Optional[dict] = None
    paper_id: Optional[int] = None
    paper_gsm: Optional[int] = None
    colors_front: int = 4
    colors_back: int = 0
    quantity: int
    finishing_json: Optional[list[Any]] = None
    special_instructions: Optional[str] = None


class CalculationResult(BaseModel):
    paper_cost: float = 0
    plate_cost: float = 0
    ink_cost: float = 0
    print_cost: float = 0
    finishing_cost: float = 0
    logistics_cost: float = 0
    other_cost: float = 0
    subtotal: float = 0
    markup_pct: float = 0
    margin_pct: float = 0
    total_cost: float = 0
    unit_cost: float = 0
    breakdown: dict = {}


class RFQItemResponse(BaseModel):
    id: int
    product_type: str
    product_name: Optional[str] = None
    dimensions_json: Optional[dict] = None
    quantity: int
    colors_front: int
    colors_back: int
    calculation: Optional[CalculationResult] = None

    model_config = {"from_attributes": True}


class RFQResponse(BaseModel):
    id: int
    input_type: str
    status: str
    raw_input: Optional[str] = None
    parsed_spec_json: Optional[dict] = None
    items: list[RFQItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
