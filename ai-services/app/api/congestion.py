"""
Congestion: current snapshot, forecast, planner traffic index, segment predict.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import joblib
import numpy as np
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

import ml_paths

router = APIRouter()

_seg_encoder = None
_congestion_clf = None
_segment_keys: list[str] = []


def load_congestion_artifacts() -> bool:
    global _seg_encoder, _congestion_clf, _segment_keys
    try:
        _seg_encoder = joblib.load(ml_paths.CONGESTION_SEGMENT_ENCODER)
        _congestion_clf = joblib.load(ml_paths.CONGESTION_MODEL)
    except FileNotFoundError:
        _seg_encoder = None
        _congestion_clf = None
        _segment_keys = []
        return False
    _segment_keys = list(_seg_encoder.classes_)
    return True


def _routes_path() -> Any:
    return ml_paths.DATA_DIR / "routes.json"


def _predict_row(segment_key: str, hour: int, dow: int) -> str:
    if _seg_encoder is None or _congestion_clf is None:
        return "MEDIUM"
    try:
        si = int(_seg_encoder.transform(np.array([segment_key]))[0])
    except ValueError:
        si = 0
    X = np.array([[si, hour, dow]], dtype=np.float64)
    return str(_congestion_clf.predict(X)[0]).upper()


class PredictBody(BaseModel):
    segment_keys: list[str] = Field(default_factory=list)
    hour: int = Field(ge=0, le=23, default_factory=lambda: datetime.now().hour % 24)
    dow: int = Field(ge=0, le=6, default_factory=lambda: datetime.now().weekday())


@router.post("/predict")
def predict_congestion(body: PredictBody) -> dict[str, Any]:
    keys = body.segment_keys if body.segment_keys else _segment_keys[: min(40, len(_segment_keys))]
    out = []
    for k in keys:
        lvl = _predict_row(k, body.hour, body.dow)
        out.append({"segment_key": k, "level": lvl})
    return {"hour": body.hour, "dow": body.dow, "predictions": out}


@router.get("/current")
def congestion_current(
    hour: int | None = Query(default=None, ge=0, le=23),
    dow: int | None = Query(default=None, ge=0, le=6),
) -> dict[str, Any]:
    now = datetime.now()
    h = hour if hour is not None else now.hour
    d = dow if dow is not None else now.weekday()
    keys = _segment_keys if _segment_keys else []
    if not keys:
        raw = json.loads(_routes_path().read_text(encoding="utf-8"))
        for r in raw:
            name = r.get("name", "")
            stops = r.get("stops") or []
            for i in range(len(stops) - 1):
                a = str(stops[i]).strip()
                b = str(stops[i + 1]).strip()
                keys.append(f"{name}|{a}->{b}")
    segments = []
    for k in keys[:80]:
        segments.append({"segment_key": k, "level": _predict_row(k, h, d)})
    return {"hour": h, "dow": d, "segments": segments}


@router.get("/forecast")
def congestion_forecast(
    start_hour: int = Query(default=0, ge=0, le=23),
    steps: int = Query(default=6, ge=1, le=24),
    dow: int | None = Query(default=None, ge=0, le=6),
) -> dict[str, Any]:
    d = dow if dow is not None else datetime.now().weekday()
    timeline = []
    for t in range(steps):
        h = (start_hour + t) % 24
        keys = _segment_keys[:30] if _segment_keys else []
        levels = [_predict_row(k, h, d) for k in keys]
        high = sum(1 for x in levels if x == "HIGH")
        med = sum(1 for x in levels if x == "MEDIUM")
        low = sum(1 for x in levels if x == "LOW")
        timeline.append(
            {
                "hour": h,
                "summary": {"HIGH": high, "MEDIUM": med, "LOW": low},
            }
        )
    return {"dow": d, "timeline": timeline}


@router.post("/planner-traffic")
def planner_traffic(payload: dict[str, Any]) -> dict[str, Any]:
    hour = int(payload.get("hour", datetime.now().hour) or 0)
    hour = max(0, min(23, hour))
    dow = datetime.now().weekday()
    keys = _segment_keys if _segment_keys else []
    if not keys:
        return {"traffic_level": "MEDIUM", "sample_size": 0}
    sample = keys[: min(60, len(keys))]
    levels = [_predict_row(k, hour, dow) for k in sample]
    high = sum(1 for x in levels if x == "HIGH")
    med = sum(1 for x in levels if x == "MEDIUM")
    low = sum(1 for x in levels if x == "LOW")
    n = len(levels)
    if high / n >= 0.35:
        tl = "HIGH"
    elif (high + med) / n >= 0.45:
        tl = "MEDIUM"
    else:
        tl = "LOW"
    return {"traffic_level": tl, "sample_size": n, "counts": {"HIGH": high, "MEDIUM": med, "LOW": low}}
