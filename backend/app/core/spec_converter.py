"""Bidirectional converters between legacy ParsedSpec and new ProjectSpec/ComponentSpec."""

from app.schemas.rfq import (
    ParsedSpec, ProjectSpec, ComponentSpec,
    PrintColorDetail, AfterPressDetail, DiecutSpec, AssemblySpec,
)


def parsed_spec_to_project(spec: ParsedSpec) -> ProjectSpec:
    """Convert legacy flat ParsedSpec into ProjectSpec with 1 component."""
    # Build outside print detail from flat colors
    outside = PrintColorDetail(
        color_count=spec.colors_front,
        colors="cmyk" if spec.colors_front == 4 else "special" if spec.colors_front > 0 else "none",
    )

    # Build inside print detail
    if spec.colors_back > 0:
        inside = PrintColorDetail(
            color_count=spec.colors_back,
            colors="cmyk" if spec.colors_back == 4 else "special",
        )
    else:
        inside = "no_print"

    # Build after_press from finishing list
    after_press = AfterPressDetail()
    remaining_finishing = []
    for f in spec.finishing:
        f_lower = f.lower()
        if "ไดคัท" in f or "die" in f_lower:
            after_press.diecut = DiecutSpec(status="new")
        elif "ประกบ" in f or "กาว" in f or "glue" in f_lower:
            after_press.assembly = AssemblySpec(has_glue=True)
        elif "เคลือบ" in f or "coat" in f_lower or "uv" in f_lower:
            after_press.coating = f
        elif "ฟอยล์" in f or "foil" in f_lower:
            after_press.foil = f
        elif "นูน" in f or "emboss" in f_lower:
            after_press.emboss = True
        elif "ลึก" in f or "deboss" in f_lower:
            after_press.deboss = True
        else:
            remaining_finishing.append(f)

    component = ComponentSpec(
        component_name=spec.product_name or spec.product_type,
        job_category=spec.job_category,
        dimensions=spec.dimensions,
        paper=spec.paper,
        outside=outside,
        inside=inside,
        after_press=after_press,
        finishing=remaining_finishing,
        quantity=spec.quantity,
        extra_fields=spec.extra_fields,
        confidence=spec.confidence,
    )

    return ProjectSpec(
        job_category=spec.job_category,
        components=[component],
    )


def component_to_parsed_spec(comp: ComponentSpec) -> ParsedSpec:
    """Convert a ComponentSpec back to flat ParsedSpec for backward compat."""
    # Flatten print colors
    colors_front = comp.outside.color_count if isinstance(comp.outside, PrintColorDetail) else 0
    colors_back = 0
    if isinstance(comp.inside, PrintColorDetail):
        colors_back = comp.inside.color_count

    # Flatten finishing from after_press + finishing list
    finishing = list(comp.finishing)
    ap = comp.after_press
    if ap.diecut.status in ("new", "existing"):
        finishing.append("ไดคัท")
    if ap.assembly.has_glue:
        finishing.append("ประกบ")
    if ap.coating:
        finishing.append(ap.coating)
    if ap.foil:
        finishing.append(ap.foil)
    if ap.emboss:
        finishing.append("ปั๊มนูน")
    if ap.deboss:
        finishing.append("ปั๊มลึก")

    return ParsedSpec(
        job_category=comp.job_category,
        product_type=comp.component_name,
        dimensions=comp.dimensions,
        paper=comp.paper,
        colors_front=colors_front,
        colors_back=colors_back,
        quantity=comp.quantity,
        finishing=finishing,
        extra_fields=comp.extra_fields,
        confidence=comp.confidence,
    )


def project_first_component_to_parsed_spec(project: ProjectSpec) -> ParsedSpec | None:
    """Get ParsedSpec from first component of a project (for backward compat)."""
    if not project.components:
        return None
    return component_to_parsed_spec(project.components[0])
