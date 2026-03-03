"""
AI microservice – ETA, crowding, congestion prediction, incident classification & impact.
Backend calls this service for predictions; load trained models from model_registry/ or config.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import eta, crowding, incidents, congestion

app = FastAPI(
    title="Dhaka Smart Transit – AI Services",
    description="ETA, crowding, congestion, incident classification and impact estimation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(eta.router, prefix="/eta", tags=["ETA"])
app.include_router(crowding.router, prefix="/crowding", tags=["Crowding"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
app.include_router(congestion.router, prefix="/congestion", tags=["Congestion"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-services"}
