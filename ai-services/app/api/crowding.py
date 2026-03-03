"""
Crowding estimation: per route/stop/time → crowd level probabilities.
POST /crowding with route_id, stop_id, time, context → returns probabilities (low/med/high).
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("")
def predict_crowding(payload: dict):
    # TODO: load crowding model, return class probabilities
    return {"probabilities": {"low": 0.33, "medium": 0.33, "high": 0.34}}
