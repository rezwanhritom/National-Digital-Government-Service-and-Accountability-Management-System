"""
Incident endpoints used by backend AI integration service.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/classify")
def classify_incident(payload: dict):
    _ = payload
    return {"category": "accident", "severity": "HIGH"}


@router.post("/impact")
def estimate_impact(payload: dict):
    _ = payload
    return {
        "affected_routes": ["Route A"],
        "delay": 20,
        "recovery_time": 60,
    }
