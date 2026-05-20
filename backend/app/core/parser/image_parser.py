import base64
import anthropic
from app.config import get_settings

settings = get_settings()


def extract_text_from_image(file_content: bytes, media_type: str = "image/png") -> str:
    """Extract text from image using Claude's vision capability."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    image_data = base64.standard_b64encode(file_content).decode("utf-8")

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": "อ่านข้อความและข้อมูลทั้งหมดจากรูปภาพนี้ โดยเฉพาะข้อมูลที่เกี่ยวกับงานพิมพ์ เช่น ขนาด, จำนวน, สี, วัสดุ, finishing ถ้าเป็นตาราง ให้แยกข้อมูลตามแถวและคอลัมน์",
                    },
                ],
            }
        ],
    )

    return message.content[0].text
