"""
ETA prediction endpoint for bus arrival times.
"""
from fastapi import APIRouter
from math import sqrt
import random

router = APIRouter()

# Mock congestion factors based on time/route
def get_congestion_factor(hour, route_id):
    # Simulate peak hours
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        return 1.5  # Peak congestion
    return 1.0

@router.post("")
def predict_eta(payload: dict):
    route_id = payload.get("route_id", "default")
    stop_id = payload.get("stop_id", "default")
    current_hour = payload.get("hour", 12)  # Assume 12 if not provided
    distance_km = payload.get("distance_km", 5.0)  # Default 5km
    
    # Base speed: 30 km/h average bus speed
    base_speed = 30
    congestion = get_congestion_factor(current_hour, route_id)
    effective_speed = base_speed / congestion
    
    # ETA in minutes
    eta = (distance_km / effective_speed) * 60
    
    # Add some randomness for realism
    eta += random.uniform(-5, 5)
    eta = max(1, round(eta))  # At least 1 minute
    
    return {"eta": eta, "route_id": route_id, "stop_id": stop_id}
