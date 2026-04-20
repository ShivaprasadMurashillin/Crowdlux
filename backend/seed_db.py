import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
try:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
except ValueError:
    pass # App already initialized
except Exception as e:
    print(f"Error initializing: {e}")

db = firestore.client()

stadium_id = "jln_delhi"
event_id = "athletics_india_open_2026"

stadium_data = {
    "id": stadium_id,
    "name": "Jawaharlal Nehru Stadium",
    "city": "New Delhi",
    "state": "Delhi",
    "capacity": 60000,
    "lat": 28.5665,
    "lng": 77.2433,
    "gates": [
        {"id": "gate_north", "name": "Gate 1 - VIP", "stand": "North"},
        {"id": "gate_east", "name": "Gate 2 - GA", "stand": "East"},
        {"id": "gate_south", "name": "Gate 3 - GA", "stand": "South"},
        {"id": "gate_west", "name": "Gate 4 - VIP", "stand": "West"}
    ]
}

event_data = {
    "name": "Athletics India Open 2026",
    "date": "2026-05-15T18:00:00Z",
    "phase": "entry", # waiting, entry, live, halftime, end
    "sport": "Athletics",
    "organizer": "AFI"
}

# 1. Write Stadium
db.collection('stadiums').document(stadium_id).set(stadium_data)

# 2. Write Event
db.collection('stadiums').document(stadium_id).collection('events').document(event_id).set(event_data)

# comprehensively populate zones
SEED_ZONES = [
    # Gates -> strictly matching the 'gates' provided in stadium
    {"id": "gate_north", "name": "Gate 1 — VIP Entry", "category": "gate", "capacity": 2000, "current_count": 850, "wait_minutes": 2, "is_closed": False},
    {"id": "gate_east", "name": "Gate 2 — East Entry", "category": "gate", "capacity": 15000, "current_count": 12500, "wait_minutes": 18, "is_closed": False},
    {"id": "gate_south", "name": "Gate 3 — South Entry", "category": "gate", "capacity": 15000, "current_count": 11000, "wait_minutes": 14, "is_closed": False},
    {"id": "gate_west", "name": "Gate 4 — West Entry", "category": "gate", "capacity": 15000, "current_count": 6000, "wait_minutes": 8, "is_closed": False},

    # Stands -> Matching North/East/South/West
    {"id": "seat_north", "name": "North Stand VIP", "category": "seating", "capacity": 5000, "current_count": 3000, "wait_minutes": 0, "is_closed": False},
    {"id": "seat_east", "name": "East Stand GA", "category": "seating", "capacity": 20000, "current_count": 16000, "wait_minutes": 0, "is_closed": False},
    {"id": "seat_south", "name": "South Stand GA", "category": "seating", "capacity": 20000, "current_count": 10000, "wait_minutes": 0, "is_closed": False},
    {"id": "seat_west", "name": "West Stand GA", "category": "seating", "capacity": 15000, "current_count": 12000, "wait_minutes": 0, "is_closed": False},

    # Amenities
    {"id": "food_north", "name": "Food Kiosk — North", "category": "food", "capacity": 300, "current_count": 180, "wait_minutes": 5, "is_closed": False},
    {"id": "food_east_1", "name": "Food Court — East A", "category": "food", "capacity": 1000, "current_count": 900, "wait_minutes": 15, "is_closed": False},
    {"id": "food_east_2", "name": "Food Court — East B", "category": "food", "capacity": 1000, "current_count": 600, "wait_minutes": 8, "is_closed": False},
    {"id": "food_south", "name": "Food Kiosk — South", "category": "food", "capacity": 800, "current_count": 780, "wait_minutes": 25, "is_closed": False},
    {"id": "food_west", "name": "Food Kiosk — West", "category": "food", "capacity": 800, "current_count": 400, "wait_minutes": 6, "is_closed": False},

    # Restrooms
    {"id": "rest_north", "name": "Restrooms — North", "category": "restroom", "capacity": 50, "current_count": 48, "wait_minutes": 10, "is_closed": False},
    {"id": "rest_east_1", "name": "Restrooms — East M", "category": "restroom", "capacity": 120, "current_count": 80, "wait_minutes": 4, "is_closed": False},
    {"id": "rest_east_2", "name": "Restrooms — East F", "category": "restroom", "capacity": 120, "current_count": 115, "wait_minutes": 12, "is_closed": False},
    {"id": "rest_south", "name": "Restrooms — South", "category": "restroom", "capacity": 100, "current_count": 60, "wait_minutes": 2, "is_closed": False},
    {"id": "rest_west", "name": "Restrooms — West", "category": "restroom", "capacity": 100, "current_count": 100, "wait_minutes": 18, "is_closed": False},
]

print("Seeding robustly distributed database...")

# 3. Write Zones
for zone in SEED_ZONES:
    doc_id = zone.pop('id')
    zone['last_updated'] = firestore.SERVER_TIMESTAMP
    db.collection('stadiums').document(stadium_id).collection('events').document(event_id).collection('zones').document(doc_id).set(zone)

print("Finished completely seeding the database!")
