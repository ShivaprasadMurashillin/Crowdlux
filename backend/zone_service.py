from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import firebase_admin
from firebase_admin import firestore
from auth_utils import require_staff_or_admin

router = APIRouter()
db = firestore.client()

class ZoneUpdateRequest(BaseModel):
    stadium_id: str
    event_id: str
    zone_id: str
    current_count: int

class ZoneCloseRequest(BaseModel):
    stadium_id: str
    event_id: str
    zone_id: str
    is_closed: bool

@router.get("/all")
async def get_all_zones(
    stadium_id: str = Query(...),
    event_id: str = Query(...)
):
    zones_ref = (
        db.collection("stadiums")
        .document(stadium_id)
        .collection("events")
        .document(event_id)
        .collection("zones")
        .stream()
    )
    data = {doc.id: doc.to_dict() for doc in zones_ref}
    return data

@router.post("/update")
async def update_zone(req: ZoneUpdateRequest, _: dict = Depends(require_staff_or_admin)):
    event_ref = db.collection("stadiums").document(req.stadium_id).collection("events").document(req.event_id)
    zone_ref = event_ref.collection("zones").document(req.zone_id)
    zone_doc = zone_ref.get()
    
    if not zone_doc.exists:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    zone_data = zone_doc.to_dict()
    capacity = zone_data.get("capacity", 1000)
    # Clamp the count between 0 and capacity
    count = max(0, min(req.current_count, capacity))
    pct = (count / capacity) * 100
    
    # Calculate wait minutes dynamically
    wait = 0
    if pct > 85: wait = 20
    elif pct > 70: wait = 12
    elif pct > 50: wait = 6
    elif pct > 30: wait = 2
    
    # Perform update
    zone_ref.update({
        "current_count": count,
        "wait_minutes": wait,
        "last_updated": firestore.SERVER_TIMESTAMP
    })
    
    # Auto-generate a system warning if pushed too high
    if pct > 85:
        event_ref.collection("alerts").add({
            "message": f"{zone_data['name']} is reaching peak capacity. Please expect delays.",
            "type": "warning",
            "zone_id": req.zone_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": "system",
            "is_active": True
        })
        
    return {"success": True, "new_count": count, "wait_minutes": wait}

@router.post("/close")
async def close_zone(req: ZoneCloseRequest, _: dict = Depends(require_staff_or_admin)):
    event_ref = db.collection("stadiums").document(req.stadium_id).collection("events").document(req.event_id)
    zone_ref = event_ref.collection("zones").document(req.zone_id)
    zone_doc = zone_ref.get()
    
    if not zone_doc.exists:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    zone_ref.update({
        "is_closed": req.is_closed,
        "last_updated": firestore.SERVER_TIMESTAMP
    })
    
    if req.is_closed:
        event_ref.collection("alerts").add({
            "message": f"{zone_doc.to_dict().get('name')} is temporarily closed. Please use an alternate route.",
            "type": "danger",
            "zone_id": req.zone_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "created_by": "system",
            "is_active": True
        })
    return {"success": True}
