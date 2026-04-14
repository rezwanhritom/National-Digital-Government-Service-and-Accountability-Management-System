"""
Crowding endpoint returning a mock crowd level.
"""
from fastapi import APIRouter
from random import choice

router = APIRouter()


@router.post("")
def predict_crowding(payload: dict):
    _ = payload
    return {"level": choice(["Low", "Medium", "High"])}
