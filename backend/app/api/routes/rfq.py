from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.models.rfq import RFQRequest, RFQItem, Calculation, RFQStatus
from app.models.master_data import Paper, Machine, FinishingOption
from app.schemas.rfq import RFQCreate, RFQItemCreate, RFQResponse, CalculationResult
from app.core.ai_engine import ai_engine
from app.core.calculator.pricing import calculate_total_cost
from app.core.calculator.pricing_v2 import calculate_v2
from app.core.parser.pdf_parser import extract_text_from_pdf
from app.core.parser.excel_parser import extract_text_from_excel
from app.core.parser.word_parser import extract_text_from_word
from app.core.parser.image_parser import extract_text_from_image

router = APIRouter()


@router.get("/", response_model=list[RFQResponse])
def list_rfqs(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(RFQRequest)
    if status:
        query = query.filter(RFQRequest.status == status)
    return query.order_by(RFQRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{rfq_id}", response_model=RFQResponse)
def get_rfq(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.query(RFQRequest).filter(RFQRequest.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.post("/", response_model=RFQResponse)
def create_rfq(rfq_data: RFQCreate, db: Session = Depends(get_db)):
    """Create a new RFQ from any input type."""
    rfq = RFQRequest(
        customer_id=rfq_data.customer_id or 1,  # default user for now
        input_type=rfq_data.input_type,
        raw_input=rfq_data.raw_input,
        status=RFQStatus.DRAFT,
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq


@router.post("/{rfq_id}/parse")
def parse_rfq(rfq_id: int, db: Session = Depends(get_db)):
    """Parse raw input of an RFQ using AI."""
    rfq = db.query(RFQRequest).filter(RFQRequest.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    rfq.status = RFQStatus.PARSING

    # Parse using AI
    result = ai_engine.parse_input(rfq.raw_input)
    rfq.parsed_spec_json = result
    rfq.status = RFQStatus.PARSED

    # Create RFQ items from parsed spec
    if result.get("items"):
        for item_data in result["items"]:
            item = RFQItem(
                rfq_id=rfq.id,
                product_type=item_data.get("product_type", "other"),
                product_name=item_data.get("product_name"),
                dimensions_json=item_data.get("dimensions"),
                paper_gsm=item_data.get("paper", {}).get("gsm"),
                colors_front=item_data.get("colors_front", 4),
                colors_back=item_data.get("colors_back", 0),
                quantity=item_data.get("quantity", 0),
                finishing_json=item_data.get("finishing"),
                special_instructions=item_data.get("special_instructions"),
            )
            db.add(item)

    db.commit()
    db.refresh(rfq)
    return rfq


@router.post("/{rfq_id}/upload")
async def upload_rfq_file(rfq_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a file for RFQ and parse it."""
    rfq = db.query(RFQRequest).filter(RFQRequest.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    content = await file.read()
    filename = file.filename.lower()

    # Extract text
    if filename.endswith((".xlsx", ".xls")):
        text = extract_text_from_excel(content)
    elif filename.endswith(".pdf"):
        text = extract_text_from_pdf(content)
    elif filename.endswith((".docx", ".doc")):
        text = extract_text_from_word(content)
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
        media_type = file.content_type or "image/png"
        text = extract_text_from_image(content, media_type)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    rfq.raw_input = text
    rfq.input_type = "file_upload"
    rfq.file_path = filename
    db.commit()

    # Auto parse
    return parse_rfq(rfq_id, db)


@router.post("/{rfq_id}/items", response_model=dict)
def add_rfq_item(rfq_id: int, item_data: RFQItemCreate, db: Session = Depends(get_db)):
    """Manually add an item to an RFQ."""
    rfq = db.query(RFQRequest).filter(RFQRequest.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    item = RFQItem(rfq_id=rfq_id, **item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "message": "Item added"}


@router.post("/{rfq_id}/calculate")
def calculate_rfq(rfq_id: int, db: Session = Depends(get_db)):
    """Calculate costs for all items in an RFQ using V2 engine (real company data)."""
    rfq = db.query(RFQRequest).filter(RFQRequest.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    rfq.status = RFQStatus.CALCULATING
    results = []

    for item in rfq.items:
        dims = item.dimensions_json or {}
        piece_w = dims.get("width", 10)
        piece_h = dims.get("height", 15)

        # Extract finishing names
        finishing_names = []
        if item.finishing_json:
            for f in item.finishing_json:
                if isinstance(f, str):
                    finishing_names.append(f)
                elif isinstance(f, dict):
                    finishing_names.append(f.get("name", ""))

        # Extract paper info from parsed spec
        paper_code = dims.get("paper_code")
        paper_gsm = item.paper_gsm

        # Calculate using V2 engine
        calc_result = calculate_v2(
            db=db,
            quantity=item.quantity,
            piece_w_cm=piece_w,
            piece_h_cm=piece_h,
            colors_front=item.colors_front,
            colors_back=item.colors_back,
            paper_id=item.paper_id,
            paper_code=paper_code,
            paper_gsm=paper_gsm,
            finishing_names=finishing_names,
        )

        if "error" in calc_result and calc_result.get("error"):
            results.append({"item_id": item.id, "error": calc_result["error"]})
            continue

        # Save calculation
        existing_calc = db.query(Calculation).filter(Calculation.rfq_item_id == item.id).first()
        if existing_calc:
            for key, value in calc_result.items():
                if key not in ("breakdown", "errors") and hasattr(existing_calc, key):
                    setattr(existing_calc, key, value)
            existing_calc.breakdown_json = calc_result.get("breakdown")
        else:
            calc = Calculation(
                rfq_item_id=item.id,
                paper_cost=calc_result["paper_cost"],
                plate_cost=calc_result["plate_cost"],
                ink_cost=calc_result["ink_cost"],
                print_cost=calc_result["print_cost"],
                finishing_cost=calc_result["finishing_cost"],
                subtotal=calc_result["subtotal"],
                markup_pct=calc_result["markup_pct"],
                margin_pct=calc_result["margin_pct"],
                total_cost=calc_result["total_cost"],
                unit_cost=calc_result["unit_cost"],
                breakdown_json=calc_result.get("breakdown"),
            )
            db.add(calc)

        results.append({"item_id": item.id, "calculation": calc_result})

    rfq.status = RFQStatus.CALCULATED
    db.commit()

    return {"rfq_id": rfq_id, "results": results}


@router.post("/quick-estimate")
def quick_estimate(item: RFQItemCreate, db: Session = Depends(get_db)):
    """Quick estimate using V2 engine — real company data from DB."""
    dims = item.dimensions_json or {}
    piece_w = dims.get("width", 10)
    piece_h = dims.get("height", 15)

    finishing_names = []
    if hasattr(item, "finishing_json") and item.finishing_json:
        for f in item.finishing_json:
            if isinstance(f, str):
                finishing_names.append(f)
            elif isinstance(f, dict):
                finishing_names.append(f.get("name", ""))

    result = calculate_v2(
        db=db,
        quantity=item.quantity,
        piece_w_cm=piece_w,
        piece_h_cm=piece_h,
        colors_front=item.colors_front,
        colors_back=item.colors_back,
        paper_id=item.paper_id,
        paper_code=dims.get("paper_code"),
        paper_gsm=item.paper_gsm,
        paper_w_cm=dims.get("paper_w"),
        paper_h_cm=dims.get("paper_h"),
        finishing_names=finishing_names,
    )

    return result
