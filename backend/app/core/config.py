from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env", extra="ignore", populate_by_name=True
    )

    data_dir: Path = Field(default=REPOSITORY_ROOT / "data", alias="DATA_DIR")
    max_upload_mb: int = Field(default=10, ge=1, le=100, alias="MAX_UPLOAD_MB")
    enable_dense: bool = Field(default=True, alias="ENABLE_DENSE")
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2", alias="EMBEDDING_MODEL"
    )

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def index_dir(self) -> Path:
        return self.data_dir / "index"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"


@lru_cache
def get_settings() -> Settings:
    return Settings()