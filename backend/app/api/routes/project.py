"""Project API routes — multi-component RFQ management."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.rfq import ProjectSpec, ComponentSpec
from app.core.calculator.component_calculator import calculate_project, calculate_component

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/calculate")
def calculate_project_endpoint(project: ProjectSpec, db: Session = Depends(get_db)):
    """Calculate cost for all components in a project."""
    if not project.components:
        raise HTTPException(400, "โปรเจ็กต์ไม่มี component")

    # Log spec for traceability (same input should produce same output)
    for i, comp in enumerate(project.components):
        logger.info(
            f"[CALC] Component[{i}] '{comp.component_name}': "
            f"template={comp.template_type}, qty={comp.quantity}, "
            f"dims={comp.dimensions}, paper={comp.paper}, "
            f"colors={comp.outside.color_count if comp.outside and hasattr(comp.outside, 'color_count') else '?'}/"
            f"{comp.inside.color_count if comp.inside and hasattr(comp.inside, 'color_count') else 0}, "
            f"binding={comp.binding}, pages={comp.pages}, "
            f"packing={comp.packing}"
        )

    # Convert Pydantic models to dicts for calculator
    project_dict = project.model_dump()
    result = calculate_project(db, project_dict)

    return result


@router.post("/calculate-component")
def calculate_single_component(component: ComponentSpec, db: Session = Depends(get_db)):
    """Calculate cost for a single component."""
    comp_dict = component.model_dump()
    result = calculate_component(db, comp_dict)
    return result


@router.post("/quick-estimate")
def quick_estimate(project: ProjectSpec, db: Session = Depends(get_db)):
    """Quick estimate without saving to DB — for preview in UI."""
    if not project.components:
        raise HTTPException(400, "โปรเจ็กต์ไม่มี component")

    project_dict = project.model_dump()
    result = calculate_project(db, project_dict)
    return result
