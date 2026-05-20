from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class QuotationCreate(BaseModel):
    rfq_id: int
    customer_name: Optional[str] = None
    customer_company: Optional[str] = None
    customer_email: Optional[str] = None
    discount_pct: float = 0
    payment_terms: Optional[str] = "30 วันหลังส่งมอบ"
    delivery_days: Optional[int] = 14
    valid_days: int = 30
    notes: Optional[str] = None


class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    version: int
    rfq_id: int
    customer_name: Optional[str] = None
    customer_company: Optional[str] = None
    total_price: float
    discount_pct: float
    final_price: float
    currency: str
    valid_until: Optional[date] = None
    status: str
    pdf_url: Optional[str] = None
    items_json: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}
