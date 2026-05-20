from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.models.master_data import Paper, Machine, FinishingOption, InkPrice, PlatePrice
from app.schemas.master_data import (
    PaperCreate, PaperResponse,
    MachineCreate, MachineResponse,
    FinishingCreate, FinishingResponse,
    InkPriceCreate, InkPriceResponse,
    PlatePriceCreate, PlatePriceResponse,
    ImportResult,
)
from app.core.ai_engine import ai_engine
from app.core.parser.excel_parser import extract_text_from_excel, extract_data_from_excel
from app.core.parser.pdf_parser import extract_text_from_pdf
from app.core.parser.word_parser import extract_text_from_word
from app.core.parser.image_parser import extract_text_from_image
from app.core.import_scripts import import_papers, import_machines
from app.core.import_scripts.seed_market_rates import run_seed

router = APIRouter()


# ===== Paper CRUD =====
@router.get("/papers", response_model=list[PaperResponse])
def list_papers(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(Paper)
    if active_only:
        query = query.filter(Paper.active == True)
    return query.all()


@router.post("/papers", response_model=PaperResponse)
def create_paper(paper: PaperCreate, db: Session = Depends(get_db)):
    db_paper = Paper(**paper.model_dump())
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)
    return db_paper


@router.put("/papers/{paper_id}", response_model=PaperResponse)
def update_paper(paper_id: int, paper: PaperCreate, db: Session = Depends(get_db)):
    db_paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not db_paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    for key, value in paper.model_dump().items():
        setattr(db_paper, key, value)
    db.commit()
    db.refresh(db_paper)
    return db_paper


@router.delete("/papers/{paper_id}")
def delete_paper(paper_id: int, db: Session = Depends(get_db)):
    db_paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not db_paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    db_paper.active = False
    db.commit()
    return {"message": "Paper deactivated"}


# ===== Machine CRUD =====
@router.get("/machines", response_model=list[MachineResponse])
def list_machines(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(Machine)
    if active_only:
        query = query.filter(Machine.active == True)
    return query.all()


@router.post("/machines", response_model=MachineResponse)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    db_machine = Machine(**machine.model_dump())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


# ===== Finishing CRUD =====
@router.get("/finishing", response_model=list[FinishingResponse])
def list_finishing(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(FinishingOption)
    if active_only:
        query = query.filter(FinishingOption.active == True)
    return query.all()


@router.post("/finishing", response_model=FinishingResponse)
def create_finishing(finishing: FinishingCreate, db: Session = Depends(get_db)):
    db_finishing = FinishingOption(**finishing.model_dump())
    db.add(db_finishing)
    db.commit()
    db.refresh(db_finishing)
    return db_finishing


# ===== Import Master Data from File =====
@router.post("/import", response_model=ImportResult)
async def import_master_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),  # papers, machines, finishing, ink, plate
    db: Session = Depends(get_db),
):
    """
    Import master data from file (Excel/PDF/Word/Image)
    AI will parse the file and extract structured data
    """
    content = await file.read()
    filename = file.filename.lower()

    # Extract text based on file type
    if filename.endswith((".xlsx", ".xls")):
        text_content = extract_text_from_excel(content)
        file_type = "Excel"
    elif filename.endswith(".pdf"):
        text_content = extract_text_from_pdf(content)
        file_type = "PDF"
    elif filename.endswith((".docx", ".doc")):
        text_content = extract_text_from_word(content)
        file_type = "Word"
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
        media_type = file.content_type or "image/png"
        text_content = extract_text_from_image(content, media_type)
        file_type = "Image"
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # AI parse the extracted text
    result = ai_engine.parse_master_data(text_content, data_type)

    if not result.get("success"):
        return ImportResult(
            success=False,
            imported_count=0,
            errors=[result.get("error", "Unknown error")],
            data_type=data_type,
        )

    # Import into database based on data_type
    imported_count = 0
    errors = []
    data_list = result.get("data", [])

    if not isinstance(data_list, list):
        data_list = [data_list]

    model_map = {
        "papers": Paper,
        "machines": Machine,
        "finishing": FinishingOption,
        "ink": InkPrice,
        "plate": PlatePrice,
    }

    model_class = model_map.get(data_type)
    if not model_class:
        raise HTTPException(status_code=400, detail=f"Unknown data type: {data_type}")

    for item in data_list:
        try:
            db_item = model_class(**item)
            db.add(db_item)
            db.flush()
            imported_count += 1
        except Exception as e:
            errors.append(f"Row error: {str(e)}")

    db.commit()

    return ImportResult(
        success=imported_count > 0,
        imported_count=imported_count,
        errors=errors,
        data_type=data_type,
    )


# ===== Import from /data/ folder (company files) =====
@router.post("/import-from-data")
def import_from_data_folder(db: Session = Depends(get_db)):
    """Import papers + machines from company data files, then seed market rates."""
    results = {}

    # 1. Import papers from Paper Price (MI2).xlsx
    paper_result = import_papers.run_import(db)
    results["papers"] = paper_result

    # 2. Import machines from all spec machine.xls
    machine_result = import_machines.run_import(db)
    results["machines"] = machine_result

    # 3. Seed market rates (ink, plate, finishing, machine costs, waste)
    seed_result = run_seed(db)
    results["market_rates"] = seed_result

    return results


@router.get("/ink", response_model=list[InkPriceResponse])
def list_ink(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(InkPrice)
    if active_only:
        query = query.filter(InkPrice.active == True)
    return query.all()


@router.get("/plates", response_model=list[PlatePriceResponse])
def list_plates(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(PlatePrice)
    if active_only:
        query = query.filter(PlatePrice.active == True)
    return query.all()
