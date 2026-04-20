"""Re-export artifact paths from ai-services root for training scripts."""
from __future__ import annotations

import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from ml_paths import (  # noqa: E402
    AI_SERVICES_ROOT,
    CONGESTION_MODEL,
    CONGESTION_SEGMENT_ENCODER,
    CONGESTION_TRAIN_CSV,
    CROWD_CSV,
    CROWD_ENCODER,
    CROWD_MODEL,
    DATA_DIR,
    ETA_CSV,
    ETA_MODEL,
    IMPACT_CATEGORY_ENCODER,
    IMPACT_DELAY_MODEL,
    IMPACT_RECOVERY_MODEL,
    IMPACT_SEVERITY_ENCODER,
    IMPACT_TRAIN_CSV,
    INCIDENT_CATEGORY_CLF,
    INCIDENT_SEVERITY_CLF,
    INCIDENT_TRAIN_CSV,
    INCIDENT_VECTORIZER,
    MODELS_DIR,
    ROUTE_ENCODER,
    STOP_ENCODER,
    TRAFFIC_ENCODER,
    ensure_artifact_dirs,
)

__all__ = [
    "AI_SERVICES_ROOT",
    "CONGESTION_MODEL",
    "CONGESTION_SEGMENT_ENCODER",
    "CONGESTION_TRAIN_CSV",
    "CROWD_CSV",
    "CROWD_ENCODER",
    "CROWD_MODEL",
    "DATA_DIR",
    "ETA_CSV",
    "ETA_MODEL",
    "IMPACT_CATEGORY_ENCODER",
    "IMPACT_DELAY_MODEL",
    "IMPACT_RECOVERY_MODEL",
    "IMPACT_SEVERITY_ENCODER",
    "IMPACT_TRAIN_CSV",
    "INCIDENT_CATEGORY_CLF",
    "INCIDENT_SEVERITY_CLF",
    "INCIDENT_TRAIN_CSV",
    "INCIDENT_VECTORIZER",
    "MODELS_DIR",
    "ROUTE_ENCODER",
    "STOP_ENCODER",
    "TRAFFIC_ENCODER",
    "ensure_artifact_dirs",
]
