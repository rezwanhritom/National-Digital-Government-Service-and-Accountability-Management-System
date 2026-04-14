"""Re-export artifact paths from ai-services root for training scripts."""
from __future__ import annotations

import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from ml_paths import (  # noqa: E402
    AI_SERVICES_ROOT,
    CROWD_CSV,
    CROWD_ENCODER,
    CROWD_MODEL,
    DATA_DIR,
    ETA_CSV,
    ETA_MODEL,
    MODELS_DIR,
    ROUTE_ENCODER,
    STOP_ENCODER,
    TRAFFIC_ENCODER,
    ensure_artifact_dirs,
)

__all__ = [
    "AI_SERVICES_ROOT",
    "CROWD_CSV",
    "CROWD_ENCODER",
    "CROWD_MODEL",
    "DATA_DIR",
    "ETA_CSV",
    "ETA_MODEL",
    "MODELS_DIR",
    "ROUTE_ENCODER",
    "STOP_ENCODER",
    "TRAFFIC_ENCODER",
    "ensure_artifact_dirs",
]
