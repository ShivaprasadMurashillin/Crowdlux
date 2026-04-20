from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore
from datetime import datetime, timedelta
from auth_utils import require_admin

router = APIRouter()
db = firestore.client()

def _wait_from_pct(pct: float) -> int:
    if pct > 0.85:
        return 20
    if pct > 0.70:
        return 12
    if pct > 0.50:
        return 6
    if pct > 0.30:
        return 2
    return 0

def _count_from_capacity(capacity: int, pct: float) -> int:
    safe_pct = max(0.0, min(pct, 0.98))
    return int(capacity * safe_pct)


def _delete_event_tree(event_ref):
    # Prefer recursive delete if available in the Firestore client.
    try:
        db.recursive_delete(event_ref)
        return
    except Exception:
        pass

    # Fallback for environments where recursive_delete is not available.
    for subcol in ["zones", "alerts"]:
        for subdoc in event_ref.collection(subcol).stream():
            subdoc.reference.delete()
    event_ref.delete()


def _clear_stadium_events(stadium_id: str):
    events_ref = db.collection("stadiums").document(stadium_id).collection("events")
    for existing_event in events_ref.stream():
        _delete_event_tree(existing_event.reference)

@router.post("/seed")
async def seed_multi_stadium_data(_: dict = Depends(require_admin)):
    """Seeds the 3-level hierarchy: Stadiums -> Events -> Zones."""
    
    stadiums = [
        {
            "id": "rajiv_gandhi_hyd",
            "name": "Rajiv Gandhi Int'l Cricket Stadium",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "sport": "cricket",
            "capacity": 55000,
            "lat": 17.4065,
            "lng": 78.4772,
            "address": "Uppal, Hyderabad, Telangana 500039",
            "amenities": ["parking", "metro", "food", "accessibility"],
            "gates": [
                {"id": "gate_a", "name": "Gate A", "stand": "North"},
                {"id": "gate_b", "name": "Gate B", "stand": "South"},
                {"id": "gate_c", "name": "Gate C", "stand": "East"},
                {"id": "gate_d", "name": "Gate D", "stand": "West"},
                {"id": "gate_e", "name": "Gate E", "stand": "VIP"},
                {"id": "gate_f", "name": "Gate F", "stand": "Press"}
            ]
        },
        {
            "id": "salt_lake_kol",
            "name": "Vivekananda Yuba Bharati Krirangan",
            "city": "Kolkata",
            "state": "West Bengal",
            "country": "India",
            "sport": "football",
            "capacity": 85000,
            "lat": 22.5788,
            "lng": 88.4027,
            "address": "JB Block, Sector III, Bidhannagar, Kolkata, West Bengal 700098",
            "amenities": ["parking", "food", "accessibility"],
            "gates": [
                {"id": "gate_1", "name": "Gate 1", "stand": "East"},
                {"id": "gate_2", "name": "Gate 2", "stand": "West"},
                {"id": "gate_3", "name": "Gate 3", "stand": "North"},
                {"id": "gate_4", "name": "Gate 4", "stand": "South"},
                {"id": "gate_5", "name": "Gate 5", "stand": "VIP"}
            ]
        },
        {
            "id": "jln_delhi",
            "name": "Jawaharlal Nehru Stadium",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "sport": "multi",
            "capacity": 75000,
            "lat": 28.5665,
            "lng": 77.2433,
            "address": "Bhishma Pitamah Marg, Pragati Vihar, New Delhi, Delhi 110003",
            "amenities": ["parking", "metro", "food", "accessibility", "medical"],
            "gates": [
                {"id": "gate_a", "name": "Gate A", "stand": "North"},
                {"id": "gate_b", "name": "Gate B", "stand": "South"},
                {"id": "gate_c", "name": "Gate C", "stand": "East"},
                {"id": "gate_d", "name": "Gate D", "stand": "West"},
                {"id": "gate_e", "name": "Gate E", "stand": "VIP"},
                {"id": "gate_f", "name": "Gate F", "stand": "Media"}
            ]
        }
    ]

    events = {
        "rajiv_gandhi_hyd": [
            {
                "name": "IPL 2026 — Match 38",
                "teams": "Sunrisers Hyderabad vs Mumbai Indians",
                "status": "live",
                "phase": "live",
                "sport": "cricket",
                "date_offset": 0,
                "timeIST": "7:30 PM IST",
                "ticketPrice": "₹800 – ₹12,000"
            },
            {
                "name": "India vs Australia — 3rd ODI",
                "teams": "India vs Australia",
                "status": "upcoming",
                "phase": "waiting",
                "sport": "cricket",
                "date_offset": 5,
                "timeIST": "2:00 PM IST",
                "ticketPrice": "₹500 – ₹15,000"
            }
        ],
        "salt_lake_kol": [
            {
                "name": "ISL 2026 — East Bengal vs ATK Mohun Bagan",
                "teams": "East Bengal vs ATK Mohun Bagan",
                "status": "upcoming",
                "phase": "waiting",
                "sport": "football",
                "date_offset": 3,
                "timeIST": "7:30 PM IST",
                "ticketPrice": "₹200 – ₹2,500"
            },
            {
                "name": "Durand Cup 2026 — Final",
                "teams": "Mohammedan SC vs FC Goa",
                "status": "upcoming",
                "phase": "waiting",
                "sport": "football",
                "date_offset": 10,
                "timeIST": "6:00 PM IST",
                "ticketPrice": "₹100 – ₹1,000"
            }
        ],
        "jln_delhi": [
            {
                "name": "Pro Kabaddi 2026 — Semifinal",
                "teams": "Patna Pirates vs Bengal Warriors",
                "status": "upcoming",
                "phase": "waiting",
                "sport": "kabaddi",
                "date_offset": 7,
                "timeIST": "8:00 PM IST",
                "ticketPrice": "₹300 – ₹3,000"
            },
            {
                "name": "Athletics India Open 2026",
                "teams": "National Championships",
                "status": "upcoming",
                "phase": "waiting",
                "sport": "athletics",
                "date_offset": 14,
                "timeIST": "9:00 AM IST",
                "ticketPrice": "Free Entry"
            }
        ]
    }

    base_zones = [
        {"id": "food_1", "name": "Food Court 1", "category": "food", "capacity": 800, "lat_offset": 0.00028, "lng_offset": 0.00042, "target_pct": 0.62},
        {"id": "food_2", "name": "Food Court 2", "category": "food", "capacity": 600, "lat_offset": -0.00032, "lng_offset": 0.00036, "target_pct": 0.48},
        {"id": "rest_n", "name": "Restrooms North", "category": "restroom", "capacity": 100, "lat_offset": 0.00038, "lng_offset": -0.0001, "target_pct": 0.55},
        {"id": "rest_s", "name": "Restrooms South", "category": "restroom", "capacity": 100, "lat_offset": -0.00038, "lng_offset": 0.0001, "target_pct": 0.35},
        {"id": "merch_1", "name": "Official Merch Store", "category": "merch", "capacity": 300, "lat_offset": 0.0001, "lng_offset": -0.00045, "target_pct": 0.28},
    ]

    try:
        # 1. Seed Stadiums
        for s in stadiums:
            stadium_id = s["id"]
            db.collection("stadiums").document(stadium_id).set({
                **s,
                "createdAt": firestore.SERVER_TIMESTAMP
            })

            # Ensure reseed is idempotent by clearing stale/legacy event trees first.
            _clear_stadium_events(stadium_id)

            # 2. Seed Events for this stadium
            stadium_events = events.get(stadium_id, [])
            for e in stadium_events:
                event_date = datetime.now() + timedelta(days=e["date_offset"])
                
                # Create event doc
                event_id = (
                    e["name"]
                    .lower()
                    .replace("—", "-")
                    .replace("–", "-")
                    .replace(" ", "-")
                    .replace("/", "-")
                )
                event_id = "".join(ch for ch in event_id if ch.isalnum() or ch == "-").strip("-")
                while "--" in event_id:
                    event_id = event_id.replace("--", "-")
                event_ref = db.collection("stadiums").document(stadium_id).collection("events").document(event_id)
                
                event_data = {
                    **e,
                    "id": event_id,
                    "stadiumId": stadium_id,
                    "date": event_date,
                    "createdAt": firestore.SERVER_TIMESTAMP
                }
                del event_data["date_offset"]
                event_ref.set(event_data)

                # 3. Seed Zones for this event
                # Add service zones
                for z in base_zones:
                    count = _count_from_capacity(z["capacity"], z.get("target_pct", 0.0))
                    wait = _wait_from_pct((count / z["capacity"]) if z["capacity"] else 0)
                    event_ref.collection("zones").document(z["id"]).set({
                        "id": z["id"],
                        "name": z["name"],
                        "category": z["category"],
                        "capacity": z["capacity"],
                        "current_count": count,
                        "wait_minutes": wait,
                        "lat": s["lat"] + z.get("lat_offset", 0.0),
                        "lng": s["lng"] + z.get("lng_offset", 0.0),
                        "is_closed": False,
                        "last_updated": firestore.SERVER_TIMESTAMP
                    })
                
                # Add stadium-specific gate zones
                for gate in s["gates"]:
                    stand = gate.get("stand", "").lower()
                    gate_offsets = {
                        "north": (0.00052, 0.0),
                        "south": (-0.00052, 0.0),
                        "east": (0.0, 0.00052),
                        "west": (0.0, -0.00052),
                        "vip": (0.0004, -0.00033),
                        "press": (-0.0004, 0.00033),
                        "media": (-0.0004, 0.00033),
                    }
                    lat_offset, lng_offset = gate_offsets.get(stand, (0.00028, 0.00028))
                    capacity = s["capacity"] // len(s["gates"])
                    gate_target = 0.18 if stand in ["vip", "press", "media"] else 0.42
                    gate_count = _count_from_capacity(capacity, gate_target)
                    gate_wait = _wait_from_pct((gate_count / capacity) if capacity else 0)

                    event_ref.collection("zones").document(gate["id"]).set({
                        "id": gate["id"],
                        "name": f"{gate['name']} — {gate['stand']} Entry",
                        "category": "gate",
                        "capacity": capacity,
                        "current_count": gate_count,
                        "wait_minutes": gate_wait,
                        "lat": s["lat"] + lat_offset,
                        "lng": s["lng"] + lng_offset,
                        "is_closed": False,
                        "last_updated": firestore.SERVER_TIMESTAMP
                    })

        return {"success": True, "message": "Multi-stadium data hierarchy seeded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
