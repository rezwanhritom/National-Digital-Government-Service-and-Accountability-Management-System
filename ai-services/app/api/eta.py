"""
ETA prediction: segment travel times for commute planner and live bus ETAs.
POST /eta with segments → returns array of travel times (seconds).
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("")
def predict_eta(segments: list[dict]):
    # TODO: load ETA model (e.g. .pkl), run inference per segment, return travel_time_seconds[]
    return {"travel_times_seconds": [0] * len(segments)}
