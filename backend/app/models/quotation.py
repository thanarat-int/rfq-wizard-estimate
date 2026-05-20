from sqlalchemy import Column, Integer, String, Float, Text, JSON, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import date, timedelta

from app.models.base import Base, TimestampMixin


class Quotation(Base, TimestampMixin):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfq_requests.id"), nullable=False)
    quotation_number = Column(String(50), unique=True, nullable=False)
    version = Column(Integer, default=1)

    # Customer info
    customer_name = Column(String(200))
    customer_company = Column(String(200))
    customer_email = Column(String(255))

    # Pricing
    total_price = Column(Float, nullable=False)
    discount_pct = Column(Float, default=0)
    final_price = Column(Float, nullable=False)
    currency = Column(String(10), default="THB")

    # Terms
    valid_until = Column(Date)
    payment_terms = Column(String(200))
    delivery_days = Column(Integer)
    notes = Column(Text)

    # Status
    status = Column(String(50), default="draft")  # draft, sent, approved, rejected, expired
    pdf_url = Column(String(500))

    # Line items snapshot
    items_json = Column(JSON)  # snapshot ของ items + calculations

    rfq = relationship("RFQRequest", back_populates="quotations")
