import json
import logging
from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.rfq import (
    ChatMessage, ChatResponse, ParsedSpec,
    ProjectSpec, ComponentSpec, BlockingQuestion,
)
from app.core.ai_engine import ai_engine
from app.core.extra_fields_parser import ensure_extra_fields
from app.core.dimension_fixer import fix_dimensions, fix_quantity
from app.core.spec_converter import component_to_parsed_spec

router = APIRouter()
logger = logging.getLogger(__name__)


def _process_component(comp_data: dict, raw_input: str) -> dict:
    """Apply fix_dimensions, fix_quantity, ensure_extra_fields to a component dict."""
    comp_data = fix_dimensions(comp_data, raw_input)
    comp_data = fix_quantity(comp_data, raw_input)
    comp_data = ensure_extra_fields(comp_data, raw_input)
    return comp_data


def _parse_project_json(spec_data: dict, raw_input: str):
    """Parse new project format: { "project": { "components": [...] } }"""
    project_data = spec_data["project"]
    components = project_data.get("components", [])

    # Process each component
    for i, comp in enumerate(components):
        components[i] = _process_component(comp, raw_input)
        logger.info(f"[CHAT] Component '{comp.get('component_name', i)}': "
                     f"template={comp.get('template_type')}, "
                     f"extra_fields={len(comp.get('extra_fields', []) or [])}")

    # Build ProjectSpec
    blocking_questions = []
    for bq in project_data.get("blocking_questions", []):
        try:
            blocking_questions.append(BlockingQuestion(**bq))
        except Exception as e:
            logger.warning(f"[CHAT] Bad blocking_question: {e}")

    project_spec = ProjectSpec(
        project_name=project_data.get("project_name"),
        customer=project_data.get("customer"),
        brand=project_data.get("brand"),
        reference_no=project_data.get("reference_no"),
        job_category=project_data.get("job_category", "packaging"),
        components=[ComponentSpec(**c) for c in components],
        blocking_questions=blocking_questions,
    )

    # Backward compat: first component as ParsedSpec
    parsed_spec = None
    if project_spec.components:
        try:
            parsed_spec = component_to_parsed_spec(project_spec.components[0])
        except Exception as e:
            logger.warning(f"[CHAT] Error converting to ParsedSpec: {e}")

    needs_more_info = len(blocking_questions) > 0
    return project_spec, parsed_spec, blocking_questions, needs_more_info


def _parse_legacy_json(spec_data: dict, raw_input: str):
    """Parse legacy format: { "items": [...] }"""
    item = spec_data["items"][0]

    ai_extra = item.get("extra_fields", [])
    logger.info(f"[CHAT] Legacy: AI returned extra_fields: {len(ai_extra) if ai_extra else 0}")

    item = _process_component(item, raw_input)

    parsed_spec = ParsedSpec(**item)

    # Convert to ProjectSpec for new frontend
    from app.core.spec_converter import parsed_spec_to_project
    project_spec = parsed_spec_to_project(parsed_spec)

    return project_spec, parsed_spec, [], False


@router.post("/message", response_model=ChatResponse)
def chat_message(chat: ChatMessage, db: Session = Depends(get_db)):
    """Send a chat message and get AI response with parsed spec if available."""
    response_text = ai_engine.chat(chat.message, chat.context)

    parsed_spec = None
    project_spec = None
    blocking_questions = []
    needs_more_info = True
    missing_fields = []

    if "---SPEC_JSON---" in response_text:
        try:
            json_str = response_text.split("---SPEC_JSON---")[1].split("---END_SPEC_JSON---")[0].strip()
            spec_data = json.loads(json_str)

            # Try new project format first
            if spec_data.get("project"):
                project_spec, parsed_spec, blocking_questions, needs_more_info = \
                    _parse_project_json(spec_data, chat.message)
            # Fallback to legacy items format
            elif spec_data.get("items"):
                project_spec, parsed_spec, blocking_questions, needs_more_info = \
                    _parse_legacy_json(spec_data, chat.message)

            # Clean response text
            response_text = response_text.split("---SPEC_JSON---")[0].strip()

        except (json.JSONDecodeError, IndexError, KeyError, TypeError) as e:
            logger.error(f"[CHAT] Error parsing SPEC_JSON: {e}")

    if needs_more_info and not parsed_spec:
        keywords = {
            "ขนาด": "dimensions",
            "กระดาษ": "paper",
            "สี": "colors",
            "จำนวน": "quantity",
            "finishing": "finishing",
        }
        for thai, eng in keywords.items():
            if thai in response_text and "?" in response_text:
                missing_fields.append(eng)

    return ChatResponse(
        reply=response_text,
        parsed_spec=parsed_spec,
        project_spec=project_spec,
        blocking_questions=blocking_questions,
        needs_more_info=needs_more_info,
        missing_fields=missing_fields,
    )


@router.post("/stream")
async def chat_stream(chat: ChatMessage):
    """Stream chat response for real-time display."""

    async def generate():
        async for chunk in ai_engine.chat_stream(chat.message, chat.context):
            yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/parse")
def parse_input(chat: ChatMessage, db: Session = Depends(get_db)):
    """Parse free-text input into structured spec (non-chat mode)."""
    result = ai_engine.parse_input(chat.message)

    # Handle new project format
    if result.get("project"):
        components = result["project"].get("components", [])
        for i, comp in enumerate(components):
            components[i] = _process_component(comp, chat.message)
        return result

    # Legacy items format
    if result.get("items"):
        for i, item in enumerate(result["items"]):
            result["items"][i] = _process_component(item, chat.message)

    return result


@router.post("/parse-file")
async def parse_file(file: UploadFile = File(...)):
    """Extract text from an uploaded file (PDF/Excel/Word/text) and parse it
    into a structured project spec — same output shape as /chat/parse."""
    from app.core.parser.pdf_parser import extract_text_from_pdf
    from app.core.parser.excel_parser import extract_text_from_excel
    from app.core.parser.word_parser import extract_text_from_word

    content = await file.read()
    name = (file.filename or "").lower()

    try:
        if name.endswith((".xlsx", ".xls")):
            text = extract_text_from_excel(content)
        elif name.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        elif name.endswith((".docx", ".doc")):
            text = extract_text_from_word(content)
        elif name.endswith((".txt", ".csv", ".md")):
            text = content.decode("utf-8", errors="ignore")
        else:
            text = content.decode("utf-8", errors="ignore")
    except Exception as e:  # noqa: BLE001
        logger.error(f"[PARSE-FILE] extraction failed for '{name}': {e}")
        return {"error": f"ไม่สามารถอ่านไฟล์ '{file.filename}' ได้"}

    if not text or not text.strip():
        return {"error": "ไม่พบข้อความในไฟล์ — กรุณาตรวจสอบไฟล์อีกครั้ง"}

    result = ai_engine.parse_input(text)

    if result.get("project"):
        comps = result["project"].get("components", [])
        for i, comp in enumerate(comps):
            comps[i] = _process_component(comp, text)
    elif result.get("items"):
        for i, item in enumerate(result["items"]):
            result["items"][i] = _process_component(item, text)

    return result
