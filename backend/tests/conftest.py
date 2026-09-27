from pathlib import Path

import pytest

from app.core.config import Settings


@pytest.fixture
def app_settings(tmp_path: Path) -> Settings:
    return Settings(data_dir=tmp_path / "data", enable_dense=False)