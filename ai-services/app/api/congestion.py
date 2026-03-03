"""
Congestion prediction: current + forecast per segment.
POST /congestion/predict → segments + time horizon → predicted congestion per segment per step.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/predict")
def predict_congestion(payload: dict):
    # TODO: load congestion model, return predicted levels/speeds per segment per time step
    return {"predictions": []}


# GET /congestion/current can be served by backend (aggregated from DB/cache);
# backend may call this service for GET /congestion/forecast
