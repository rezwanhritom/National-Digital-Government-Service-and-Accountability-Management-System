"""
Incident classification (category, severity) and impact estimation.
POST /incidents/classify → category + severity (used after citizen submits incident).
POST /incidents/impact → affected segments, extra delay, recovery time (high-severity).
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/classify")
def classify_incident(payload: dict):
    # TODO: text + metadata → category probabilities, severity level
    return {"category": "other", "severity": 1, "probabilities": {}}


@router.post("/impact")
def estimate_impact(payload: dict):
    # TODO: incident location/type/severity → affected_segments, extra_delay_per_segment, recovery_time
    return {
        "affected_segments": [],
        "extra_delay_per_segment": {},
        "recovery_time_minutes": 0,
    }
