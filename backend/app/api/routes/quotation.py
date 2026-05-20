from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.api.deps import get_db
from app.models.quotation import Quotation
from app.models.rfq import RFQRequest, RFQStatus
from app.schemas.quotation import QuotationCreate, QuotationResponse
from app.core.quotation_gen import generate_quotation_pdf

router = APIRouter()


def generate_quotation_number(db: Session) -> str:
    """Generate unique quotation number: QT-YYYYMMDD-XXX"""
    today = date.today()
    prefix = f"QT-{today.strftime('%Y%m%d')}"
    last = (
        db.query(Quotation)
        .filter(Quotation.quotation_number.like(f"{prefix}%"))
        .order_by(Quotation.id.desc())
        .first()
    )
    if last:
        last_num = int(last.quotation_number.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"{prefix}-{new_num:03d}"


@router.get("/", response_model=list[QuotationResponse])
def list_quotations(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Quotation)
    if status:
        query = query.filter(Quotation.status == status)
    return query.order_by(Quotation.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@router.post("/", response_model=QuotationResponse)
def create_quotation(data: QuotationCreate, db: Session = Depends(get_db)):
    """Create a quotation from a calculated RFQ."""
    rfq = db.query(RFQRequest).filter(RFQRequest.id == data.rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    if rfq.status not in [RFQStatus.CALCULATED, RFQStatus.QUOTED]:
        raise HTTPException(status_code=400, detail="RFQ must be calculated first")

    # Build items snapshot
    items_snapshot = []
    total_price = 0
    for item in rfq.items:
        item_data = {
            "product_type": item.product_type,
            "product_name": item.product_name,
            "dimensions": item.dimensions_json,
            "quantity": item.quantity,
            "colors_front": item.colors_front,
            "colors_back": item.colors_back,
        }
        if item.calculation:
            item_data["calculation"] = {
                "paper_cost": item.calculation.paper_cost,
                "plate_cost": item.calculation.plate_cost,
                "ink_cost": item.calculation.ink_cost,
                "print_cost": item.calculation.print_cost,
                "finishing_cost": item.calculation.finishing_cost,
                "subtotal": item.calculation.subtotal,
                "total_cost": item.calculation.total_cost,
                "unit_cost": item.calculation.unit_cost,
            }
            total_price += item.calculation.total_cost
        items_snapshot.append(item_data)

    # Apply discount
    discount_amount = total_price * (data.discount_pct / 100)
    final_price = total_price - discount_amount

    quotation = Quotation(
        rfq_id=data.rfq_id,
        quotation_number=generate_quotation_number(db),
        customer_name=data.customer_name,
        customer_company=data.customer_company,
        customer_email=data.customer_email,
        total_price=round(total_price, 2),
        discount_pct=data.discount_pct,
        final_price=round(final_price, 2),
        valid_until=date.today() + timedelta(days=data.valid_days),
        payment_terms=data.payment_terms,
        delivery_days=data.delivery_days,
        notes=data.notes,
        items_json={"items": items_snapshot},
        status="draft",
    )
    db.add(quotation)
    rfq.status = RFQStatus.QUOTED
    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/{quotation_id}/generate-pdf")
def generate_pdf(quotation_id: int, db: Session = Depends(get_db)):
    """Generate PDF for a quotation."""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    pdf_path = generate_quotation_pdf(quotation)
    quotation.pdf_url = pdf_path
    db.commit()

    return {"pdf_url": pdf_path}


@router.get("/{quotation_id}/download")
def download_pdf(quotation_id: int, db: Session = Depends(get_db)):
    """Download quotation PDF."""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation or not quotation.pdf_url:
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(
        quotation.pdf_url,
        media_type="application/pdf",
        filename=f"{quotation.quotation_number}.pdf",
    )
