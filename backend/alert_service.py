from fastapi import APIRouter, Depends
from pydantic import BaseModel
from firebase_admin import firestore
from auth_utils import require_staff_or_admin

router = APIRouter()
db = firestore.client()

class AlertBroadcastRequest(BaseModel):
    stadium_id: str
    event_id: str
    message: str
    type: str # 'info', 'warning', 'danger', 'success'
    zone_id: str | None = None
    created_by: str = "antigravity_ops"

class AlertDismissRequest(BaseModel):
    stadium_id: str
    event_id: str


class GlobalAlertBroadcastRequest(BaseModel):
    message: str
    type: str  # 'info', 'warning', 'danger', 'success'
    created_by: str = "antigravity_ops"
    only_active_events: bool = False

@router.post("/broadcast")
async def broadcast_alert(req: AlertBroadcastRequest, _: dict = Depends(require_staff_or_admin)):
    event_ref = db.collection("stadiums").document(req.stadium_id).collection("events").document(req.event_id)
    doc_ref = event_ref.collection("alerts").add({
        "message": req.message.strip(),
        "type": req.type,
        "zone_id": req.zone_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "created_by": req.created_by,
        "is_active": True
    })
    return {"success": True, "alert_id": doc_ref[1].id}

@router.put("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, req: AlertDismissRequest, _: dict = Depends(require_staff_or_admin)):
    alert_ref = (
        db.collection("stadiums")
        .document(req.stadium_id)
        .collection("events")
        .document(req.event_id)
        .collection("alerts")
        .document(alert_id)
    )
    alert_ref.update({"is_active": False})
    return {"success": True}


@router.post("/broadcast-global")
async def broadcast_global_alert(req: GlobalAlertBroadcastRequest, _: dict = Depends(require_staff_or_admin)):
    message = req.message.strip()
    if not message:
        return {"success": False, "created": 0, "message": "Alert message cannot be empty."}

    created = 0
    stadiums = db.collection("stadiums").stream()
    for stadium_doc in stadiums:
        events = stadium_doc.reference.collection("events").stream()
        for event_doc in events:
            event_data = event_doc.to_dict() or {}
            if req.only_active_events and event_data.get("status") != "live":
                continue

            event_doc.reference.collection("alerts").add({
                "message": message,
                "type": req.type,
                "zone_id": None,
                "created_at": firestore.SERVER_TIMESTAMP,
                "created_by": req.created_by,
                "is_active": True
            })
            created += 1

    return {"success": True, "created": created}
