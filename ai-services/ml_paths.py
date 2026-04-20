"""
Artifact locations for training and FastAPI inference.
Import from ai-services root (PYTHONPATH includes ai-services).
"""
from __future__ import annotations

from pathlib import Path

AI_SERVICES_ROOT = Path(__file__).resolve().parent
DATA_DIR = AI_SERVICES_ROOT / "data"
MODELS_DIR = AI_SERVICES_ROOT / "models"
ENCODERS_DIR = AI_SERVICES_ROOT / "encoders"

ETA_CSV = DATA_DIR / "eta_dataset.csv"
CROWD_CSV = DATA_DIR / "crowd_dataset.csv"

ETA_MODEL = MODELS_DIR / "eta_model.pkl"
CROWD_MODEL = MODELS_DIR / "crowd_model.pkl"
INCIDENT_VECTORIZER = ENCODERS_DIR / "incident_vectorizer.pkl"
INCIDENT_CATEGORY_CLF = MODELS_DIR / "incident_category_clf.pkl"
INCIDENT_SEVERITY_CLF = MODELS_DIR / "incident_severity_clf.pkl"
IMPACT_DELAY_MODEL = MODELS_DIR / "impact_delay_model.pkl"
IMPACT_RECOVERY_MODEL = MODELS_DIR / "impact_recovery_model.pkl"
IMPACT_CATEGORY_ENCODER = ENCODERS_DIR / "impact_category_encoder.pkl"
IMPACT_SEVERITY_ENCODER = ENCODERS_DIR / "impact_severity_encoder.pkl"
CONGESTION_MODEL = MODELS_DIR / "congestion_model.pkl"
CONGESTION_SEGMENT_ENCODER = ENCODERS_DIR / "congestion_segment_encoder.pkl"

INCIDENT_TRAIN_CSV = DATA_DIR / "incident_train.csv"
IMPACT_TRAIN_CSV = DATA_DIR / "impact_train.csv"
CONGESTION_TRAIN_CSV = DATA_DIR / "congestion_train.csv"

ROUTE_ENCODER = ENCODERS_DIR / "route_encoder.pkl"
STOP_ENCODER = ENCODERS_DIR / "stop_encoder.pkl"
TRAFFIC_ENCODER = ENCODERS_DIR / "traffic_encoder.pkl"
CROWD_ENCODER = ENCODERS_DIR / "crowd_encoder.pkl"


def ensure_artifact_dirs() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    ENCODERS_DIR.mkdir(parents=True, exist_ok=True)
