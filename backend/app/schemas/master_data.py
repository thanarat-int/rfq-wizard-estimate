from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ===== Paper =====
class PaperBase(BaseModel):
    paper_code: Optional[str] = None
    paper_type: Optional[str] = None
    gram: Optional[int] = None
    thickness_micron: Optional[float] = None
    thickness_mm: Optional[float] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    is_fsc: bool = False
    project_code: Optional[str] = None
    price_import: Optional[float] = None
    is_only_baht_per_sheet: int = 0
    only_print_type: Optional[str] = None
    brand: Optional[str] = None
    supplier: Optional[str] = None
    # Legacy
    name: Optional[str] = None
    type: Optional[str] = None
    gsm: Optional[int] = None
    size_w: Optional[float] = None
    size_h: Optional[float] = None
    price_per_kg: Optional[float] = None
    price_per_sheet: Optional[float] = None
    active: bool = True
    notes: Optional[str] = None


class PaperCreate(PaperBase):
    pass


class PaperResponse(PaperBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ===== Machine =====
class MachineBase(BaseModel):
    name: str
    department: Optional[str] = None
    machine_category: Optional[str] = None
    max_paper_w: Optional[float] = None
    max_paper_h: Optional[float] = None
    min_paper_w: Optional[float] = None
    min_paper_h: Optional[float] = None
    max_print_w: Optional[float] = None
    max_print_h: Optional[float] = None
    plate_size_w: Optional[float] = None
    plate_size_h: Optional[float] = None
    gsm_min: Optional[int] = None
    gsm_max: Optional[int] = None
    setup_time_min: int = 0
    speed_sheets_per_hour: int = 0
    max_colors: int = 4
    cost_per_hour: float = 0
    setup_cost: float = 0
    setup_waste_sheets: int = 200
    # Legacy
    type: Optional[str] = None
    max_width: Optional[float] = None
    max_height: Optional[float] = None
    active: bool = True
    notes: Optional[str] = None


class MachineCreate(MachineBase):
    pass


class MachineResponse(MachineBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ===== Finishing =====
class FinishingBase(BaseModel):
    name: str
    type: str
    unit: str
    price_per_unit: float
    min_charge: float = 0
    setup_cost: float = 0
    active: bool = True
    notes: Optional[str] = None


class FinishingCreate(FinishingBase):
    pass


class FinishingResponse(FinishingBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ===== Ink =====
class InkPriceBase(BaseModel):
    color_type: str
    name: str
    price_per_kg: float
    coverage_sqm_per_kg: Optional[float] = None
    active: bool = True


class InkPriceCreate(InkPriceBase):
    pass


class InkPriceResponse(InkPriceBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ===== Plate =====
class PlatePriceBase(BaseModel):
    type: str
    size: Optional[str] = None
    price_per_plate: float
    active: bool = True


class PlatePriceCreate(PlatePriceBase):
    pass


class PlatePriceResponse(PlatePriceBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ===== Formula =====
class FormulaBase(BaseModel):
    name: str
    category: str
    formula_json: dict
    description: Optional[str] = None
    active: bool = True


class FormulaCreate(FormulaBase):
    pass


class FormulaResponse(FormulaBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ===== Import Result =====
class ImportResult(BaseModel):
    success: bool
    imported_count: int
    errors: list[str] = []
    data_type: str
