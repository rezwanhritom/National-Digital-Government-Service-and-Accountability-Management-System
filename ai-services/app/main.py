"""
AI microservice – ETA, crowding, congestion prediction, incident classification & impact.
Loads trained models once at startup; see ml_paths for artifact locations.
"""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import ml_paths  # noqa: E402

from app.api import congestion as congestion_api, incidents as incidents_api

eta_model = None
crowd_model = None
route_encoder = None
stop_encoder = None
traffic_encoder = None
crowd_encoder = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global eta_model, crowd_model, route_encoder, stop_encoder, traffic_encoder, crowd_encoder
    try:
        eta_model = joblib.load(ml_paths.ETA_MODEL)
        crowd_model = joblib.load(ml_paths.CROWD_MODEL)
        route_encoder = joblib.load(ml_paths.ROUTE_ENCODER)
        stop_encoder = joblib.load(ml_paths.STOP_ENCODER)
        traffic_encoder = joblib.load(ml_paths.TRAFFIC_ENCODER)
        crowd_encoder = joblib.load(ml_paths.CROWD_ENCODER)
    except FileNotFoundError as exc:
        raise RuntimeError(
            "ML artifacts missing. Train models first: "
            "python ai-services/training/train_eta.py && "
            "python ai-services/training/train_crowd.py"
        ) from exc
    incidents_api.load_incident_artifacts()
    congestion_api.load_congestion_artifacts()
    yield


app = FastAPI(
    title="Dhaka Smart Transit – AI Services",
    description="ETA, crowding, congestion, incident classification and impact estimation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ETARequest(BaseModel):
    route: str
    from_stop: str
    to_stop: str
    hour: int = Field(ge=0, le=23)
    traffic_level: str

    @field_validator("route", "from_stop", "to_stop", "traffic_level", mode="before")
    @classmethod
    def strip_strings(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class CrowdRequest(BaseModel):
    route: str
    stop: str
    hour: int = Field(ge=0, le=23)

    @field_validator("route", "stop", mode="before")
    @classmethod
    def strip_strings(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


@app.post("/eta")
def predict_eta(body: ETARequest) -> dict:
    """Real segment ETA (minutes) from trained RandomForestRegressor."""
    try:
        r = int(route_encoder.transform(np.array([body.route]))[0])
        fs = int(stop_encoder.transform(np.array([body.from_stop]))[0])
        ts = int(stop_encoder.transform(np.array([body.to_stop]))[0])
        tr = int(traffic_encoder.transform(np.array([body.traffic_level]))[0])
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Unknown route, stop, or traffic_level for trained encoders",
                "error": str(exc),
            },
        ) from exc

    X = np.array([[r, fs, ts, body.hour, tr]], dtype=np.float64)
    try:
        pred = eta_model.predict(X)
    except Exception as exc:  # noqa: BLE001 — surface safe message
        raise HTTPException(
            status_code=500,
            detail={"message": "Prediction failed", "error": str(exc)},
        ) from exc

    eta_minutes = int(round(float(pred[0])))
    return {"eta": max(1, eta_minutes)}


@app.post("/crowding")
def predict_crowding(body: CrowdRequest) -> dict:
    """Real crowd level from trained RandomForestClassifier."""
    try:
        r = int(route_encoder.transform(np.array([body.route]))[0])
        s = int(stop_encoder.transform(np.array([body.stop]))[0])
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Unknown route or stop for trained encoders",
                "error": str(exc),
            },
        ) from exc

    X = np.array([[r, s, body.hour]], dtype=np.float64)
    try:
        pred = crowd_model.predict(X)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail={"message": "Prediction failed", "error": str(exc)},
        ) from exc

    level = crowd_encoder.inverse_transform(np.asarray(pred, dtype=int))[0]
    return {"level": str(level)}


app.include_router(incidents_api.router, prefix="/incidents", tags=["Incidents"])
app.include_router(congestion_api.router, prefix="/congestion", tags=["Congestion"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-services"}
