import json
import logging
import anthropic
from typing import Optional, AsyncGenerator

from app.config import get_settings
from app.prompts.parse_input import SYSTEM_PROMPT, PARSE_USER_PROMPT
from app.prompts.chat_assistant import CHAT_SYSTEM_PROMPT
from app.prompts.validate_spec import VALIDATE_SYSTEM_PROMPT, VALIDATE_USER_PROMPT
from app.core.mock_parser import mock_parse_input, mock_chat_reply

settings = get_settings()
logger = logging.getLogger(__name__)


class AIEngine:
    def __init__(self):
        # Mock mode: skip the real LLM and use the heuristic parser.
        # Enabled by the AI_MOCK_MODE setting, or whenever no usable API key exists.
        raw_key = (settings.anthropic_api_key or "").strip()
        key_unusable = (not raw_key) or raw_key.lower().startswith("your-")
        self.mock_mode = bool(settings.ai_mock_mode) or key_unusable
        self.client = None if self.mock_mode else anthropic.Anthropic(api_key=raw_key)
        self.model = "claude-sonnet-4-20250514"
        if self.mock_mode:
            logger.warning(
                "AIEngine running in MOCK mode — using heuristic parser for spec "
                "extraction (set AI_MOCK_MODE=false + ANTHROPIC_API_KEY for the real LLM)"
            )

    def parse_input(self, input_text: str) -> dict:
        """Parse free-text input from customer into structured spec."""
        if self.mock_mode:
            return mock_parse_input(input_text)

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                temperature=0,  # Deterministic: same input → same spec every time
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": PARSE_USER_PROMPT.format(input_text=input_text)}
                ],
            )
            response_text = message.content[0].text
        except Exception as e:  # noqa: BLE001 — any LLM/transport error → degrade to mock
            logger.warning(f"LLM parse_input failed ({e}); falling back to mock parser")
            return mock_parse_input(input_text)

        # Try to extract JSON from response
        try:
            # Handle case where response might have markdown code blocks
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text.strip()
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return {
                "items": [],
                "confidence": 0,
                "missing_fields": ["ไม่สามารถวิเคราะห์ข้อมูลได้ กรุณาลองใหม่"],
                "raw_response": response_text,
            }

    def parse_file_content(self, file_content: str, file_type: str) -> dict:
        """Parse extracted file content into structured spec."""
        prompt = f"ข้อมูลจากไฟล์ {file_type}:\n\n{file_content}"
        return self.parse_input(prompt)

    def chat(self, message: str, history: Optional[list[dict]] = None) -> str:
        """Chat with customer to collect spec information."""
        if self.mock_mode:
            return mock_chat_reply(message)

        messages = []
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": message})

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0,  # Deterministic: consistent spec parsing across runs
                system=CHAT_SYSTEM_PROMPT,
                messages=messages,
            )
            return response.content[0].text
        except Exception as e:  # noqa: BLE001 — any LLM/transport error → degrade to mock
            logger.warning(f"LLM chat failed ({e}); falling back to mock reply")
            return mock_chat_reply(message)

    async def chat_stream(self, message: str, history: Optional[list[dict]] = None) -> AsyncGenerator[str, None]:
        """Stream chat response for real-time UI."""
        if self.mock_mode:
            yield mock_chat_reply(message)
            return

        messages = []
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": message})

        with self.client.messages.stream(
            model=self.model,
            max_tokens=2048,
            temperature=0,  # Deterministic
            system=CHAT_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

    def validate_spec(self, spec: dict) -> dict:
        """Validate parsed spec for completeness and reasonableness."""
        if self.mock_mode:
            return {"valid": True, "warnings": [], "suggestions": [], "missing_fields": []}

        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            temperature=0,  # Deterministic
            system=VALIDATE_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": VALIDATE_USER_PROMPT.format(spec_json=json.dumps(spec, ensure_ascii=False))}
            ],
        )

        response_text = message.content[0].text
        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text.strip()
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return {"valid": True, "warnings": [], "suggestions": [], "missing_fields": []}

    def parse_master_data(self, content: str, data_type: str) -> dict:
        """Parse uploaded master data files (paper prices, machine specs, etc.)."""
        if self.mock_mode:
            return {
                "success": False,
                "error": "โหมด Mockup: ไม่รองรับการ import master data ด้วย AI "
                         "(ตั้งค่า ANTHROPIC_API_KEY เพื่อใช้งานจริง)",
            }

        prompt = f"""วิเคราะห์ข้อมูล {data_type} จากเอกสารนี้ และแยกออกมาเป็น JSON array

ข้อมูล:
{content}

ตอบเป็น JSON array เท่านั้น ตามรูปแบบที่เหมาะสมกับประเภทข้อมูล {data_type}"""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            temperature=0,  # Deterministic
            system="คุณเป็นผู้เชี่ยวชาญด้านการแยกข้อมูลจากเอกสาร ตอบเป็น JSON เท่านั้น",
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text
        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text.strip()
            return {"success": True, "data": json.loads(json_str)}
        except (json.JSONDecodeError, IndexError):
            return {"success": False, "error": "ไม่สามารถแยกข้อมูลได้", "raw": response_text}


# Singleton
ai_engine = AIEngine()
