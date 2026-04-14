"""
Lightweight ETA endpoint used by backend integration tests.
"""
from fastapi import APIRouter
from random import randint

router = APIRouter()


@router.post("")
def predict_eta(payload: dict):
    _ = payload
    return {"eta": randint(8, 55)}
