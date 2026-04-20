from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "crowdlux-api-live"}

def test_zone_update():
    response = client.post(
        "/zones/update",
        json={"zone_id": "gate_a", "current_count": 2500}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "wait_minutes" in data
    assert data["new_count"] == 2500

def test_ai_guide():
    response = client.post(
        "/ai/crowd-guide",
        json={"zone_data": {}, "destination": "Food Court 1", "event_phase": "live"}
    )
    assert response.status_code == 200
    assert "wait_minutes" in response.json()
