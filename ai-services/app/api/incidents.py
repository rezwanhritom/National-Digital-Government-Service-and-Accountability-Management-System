"""
Incident classification and impact estimation (ML when artifacts present).
"""
from __future__ import annotations

import re
from typing import Any

import joblib
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

import ml_paths

router = APIRouter()

_vectorizer = None
_category_clf = None
_severity_clf = None
_impact_cat_enc = None
_impact_sev_enc = None
_impact_delay_m = None
_impact_recovery_m = None


def load_incident_artifacts() -> bool:
    """Load from disk; return True if all present."""
    global _vectorizer, _category_clf, _severity_clf
    global _impact_cat_enc, _impact_sev_enc, _impact_delay_m, _impact_recovery_m
    try:
        _vectorizer = joblib.load(ml_paths.INCIDENT_VECTORIZER)
        _category_clf = joblib.load(ml_paths.INCIDENT_CATEGORY_CLF)
        _severity_clf = joblib.load(ml_paths.INCIDENT_SEVERITY_CLF)
        _impact_cat_enc = joblib.load(ml_paths.IMPACT_CATEGORY_ENCODER)
        _impact_sev_enc = joblib.load(ml_paths.IMPACT_SEVERITY_ENCODER)
        _impact_delay_m = joblib.load(ml_paths.IMPACT_DELAY_MODEL)
        _impact_recovery_m = joblib.load(ml_paths.IMPACT_RECOVERY_MODEL)
    except FileNotFoundError:
        _vectorizer = _category_clf = _severity_clf = None
        _impact_cat_enc = _impact_sev_enc = _impact_delay_m = _impact_recovery_m = None
        return False
    return True


class ClassifyBody(BaseModel):
    text: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)

    @field_validator("text", "location", mode="before")
    @classmethod
    def strip_s(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class ImpactBody(BaseModel):
    location: str
    category: str
    severity: str
    affected_routes: list[str] = Field(default_factory=list)
    hour: int | None = None

    @field_validator("location", "category", "severity", mode="before")
    @classmethod
    def strip_s(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


def _fallback_classify(combined: str) -> tuple[str, str]:
    t = combined.lower()
    if any(w in t for w in ("accident", "collision", "crash", "hit")):
        return "accident", "HIGH"
    if any(w in t for w in ("breakdown", "engine", "smoke", "flat tire")):
        return "breakdown", "MEDIUM"
    if any(w in t for w in ("overcrowd", "packed", "crush", "aisle")):
        return "overcrowding", "HIGH"
    if any(w in t for w in ("block", "closed", "construction", "vip")):
        return "road_blockage", "MEDIUM"
    if any(w in t for w in ("speed", "reckless", "phone", "red light")):
        return "reckless_driving", "MEDIUM"
    return "other", "LOW"


def _fallback_impact(category: str, severity: str, n_routes: int) -> tuple[int, int]:
    base = {"LOW": 8, "MEDIUM": 20, "HIGH": 40}.get(severity.upper(), 15)
    mult = 1 + min(n_routes, 4) * 0.15
    delay = int(round(base * mult))
    recovery = int(round(delay * 2.2))
    return max(5, delay), max(15, recovery)


@router.post("/classify")
def classify_incident(body: ClassifyBody) -> dict[str, Any]:
    combined = f"{body.text} {body.location}".strip()
    if _vectorizer is not None and _category_clf is not None and _severity_clf is not None:
        X = _vectorizer.transform([combined])
        category = str(_category_clf.predict(X)[0])
        severity = str(_severity_clf.predict(X)[0]).upper()
        try:
            cat_probs = dict(
                zip(
                    _category_clf.classes_.astype(str),
                    _category_clf.predict_proba(X)[0].astype(float).round(4).tolist(),
                )
            )
        except Exception:  # noqa: BLE001
            cat_probs = {}
        try:
            sev_probs = dict(
                zip(
                    _severity_clf.classes_.astype(str),
                    _severity_clf.predict_proba(X)[0].astype(float).round(4).tolist(),
                )
            )
        except Exception:  # noqa: BLE001
            sev_probs = {}
    else:
        category, severity = _fallback_classify(combined)
        severity = severity.upper()
        cat_probs = {}
        sev_probs = {}

    return {
        "category": category,
        "severity": severity,
        "category_probs": cat_probs,
        "severity_probs": sev_probs,
    }


@router.post("/impact")
def estimate_impact(body: ImpactBody) -> dict[str, Any]:
    n_routes = len([r for r in body.affected_routes if str(r).strip()])
    hour = body.hour if body.hour is not None else 12
    m = re.search(r"hour[=:]?\s*(\d{1,2})", body.location, re.I)
    if m:
        h = int(m.group(1))
        if 0 <= h <= 23:
            hour = h

    if (
        _impact_cat_enc is not None
        and _impact_sev_enc is not None
        and _impact_delay_m is not None
        and _impact_recovery_m is not None
    ):
        try:
            ci = int(_impact_cat_enc.transform([body.category])[0])
            si = int(_impact_sev_enc.transform([body.severity.upper()])[0])
        except ValueError:
            ci = 0
            si = 0
        X = np.array([[ci, si, n_routes, hour]], dtype=np.float64)
        delay = int(round(float(_impact_delay_m.predict(X)[0])))
        recovery = int(round(float(_impact_recovery_m.predict(X)[0])))
        delay = max(5, delay)
        recovery = max(15, recovery)
    else:
        delay, recovery = _fallback_impact(body.category, body.severity, n_routes)

    return {
        "delay": delay,
        "recovery_time": recovery,
    }
