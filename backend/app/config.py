from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database (SQLite for local dev)
    database_url: str = "sqlite:///./rfq_wizard.db"

    # Security
    backend_secret_key: str = "change-this-secret-key"
    access_token_expire_minutes: int = 480  # 8 hours
    algorithm: str = "HS256"

    # CORS
    backend_cors_origins: str = "http://localhost:3000"

    # AI
    anthropic_api_key: str = ""
    # Mock mode — use the built-in heuristic spec parser instead of calling the LLM.
    # Defaults to True so the app runs with no API key. Set AI_MOCK_MODE=false
    # (and provide a valid ANTHROPIC_API_KEY) to use the real Claude model.
    ai_mock_mode: bool = True

    # Upload
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 50

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
