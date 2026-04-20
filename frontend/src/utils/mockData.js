export const MOCK_VENUES = {
  RajivGandhi: {
    name: "Rajiv Gandhi Cricket Stadium",
    capacity: 55000,
    coordinates: { lat: 17.4065, lng: 78.4772 }
  }
};

export const SEED_ZONES = {
  gate_a: { id: "gate_a", name: "Gate A — North Entry", category: "gate", capacity: 5000, is_closed: false },
  gate_b: { id: "gate_b", name: "Gate B — South Entry", category: "gate", capacity: 5000, is_closed: false },
  gate_c: { id: "gate_c", name: "Gate C — East Entry", category: "gate", capacity: 5000, is_closed: false },
  gate_d: { id: "gate_d", name: "Gate D — West Entry", category: "gate", capacity: 5000, is_closed: false },
  gate_e: { id: "gate_e", name: "Gate E — VIP Entry", category: "gate", capacity: 2000, is_closed: false },
  gate_f: { id: "gate_f", name: "Gate F — Press Entry", category: "gate", capacity: 1000, is_closed: false },

  food_1: { id: "food_1", name: "Food Court 1 — North Stand", category: "food", capacity: 800, is_closed: false },
  food_2: { id: "food_2", name: "Food Court 2 — South Stand", category: "food", capacity: 800, is_closed: false },
  food_3: { id: "food_3", name: "Food Court 3 — East Pavilion", category: "food", capacity: 800, is_closed: false },
  food_4: { id: "food_4", name: "Food Court 4 — West Pavilion", category: "food", capacity: 800, is_closed: false },

  rest_n: { id: "rest_n", name: "Restrooms — North Block", category: "restroom", capacity: 200, is_closed: false },
  rest_s: { id: "rest_s", name: "Restrooms — South Block", category: "restroom", capacity: 200, is_closed: false },
  rest_e: { id: "rest_e", name: "Restrooms — East Block", category: "restroom", capacity: 200, is_closed: false },
  rest_w: { id: "rest_w", name: "Restrooms — West Block", category: "restroom", capacity: 200, is_closed: false },

  merch_1: { id: "merch_1", name: "Official Store — Main", category: "merch", capacity: 300, is_closed: false },
  merch_2: { id: "merch_2", name: "Pop-up Store — East", category: "merch", capacity: 300, is_closed: false },
  merch_3: { id: "merch_3", name: "Pop-up Store — West", category: "merch", capacity: 300, is_closed: false },

  seat_a: { id: "seat_a", name: "Stand A — North", category: "seating", capacity: 8000, is_closed: false },
  seat_b: { id: "seat_b", name: "Stand B — South", category: "seating", capacity: 8000, is_closed: false },
  seat_c: { id: "seat_c", name: "Stand C — East", category: "seating", capacity: 8000, is_closed: false },
  seat_d: { id: "seat_d", name: "Stand D — West", category: "seating", capacity: 8000, is_closed: false },
};

export const DEMO_ATTENDEE = {
  name: "Arjun Mehta",
  seat_stand: "Stand C — East",
  seat_row: "Row 14",
  seat_number: "Seat 08",
  ticket_id: "CDX-2026-IPL-8872",
  entry_gate: "gate_c",
  preferred_food: "Food Court 4 — West Pavilion"
};

// Generates initial counts based on a generic "waiting" phase
export function generateInitialZoneCounts(zonesMap) {
  const result = {};
  for (const [id, zone] of Object.entries(zonesMap)) {
    let pct = Math.random() * 0.2; // 0-20%
    if (zone.category === 'gate') pct = 0.1 + Math.random() * 0.2; // 10-30%
    
    const current_count = Math.floor(zone.capacity * pct);
    result[id] = {
      ...zone,
      current_count,
      wait_minutes: calculateWaitMinutes(current_count, zone.capacity)
    };
  }
  return result;
}

export function calculateWaitMinutes(current_count, capacity) {
  const pct = current_count / capacity;
  if (pct > 0.85) return 20 + Math.floor(Math.random() * 10);
  if (pct > 0.70) return 10 + Math.floor(Math.random() * 5);
  if (pct > 0.40) return 5 + Math.floor(Math.random() * 4);
  return 0 + Math.floor(Math.random() * 3);
}
