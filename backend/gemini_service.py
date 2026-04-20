from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import json
import os
import time

def generate_with_retry(model, messages, max_retries=3):
    """Retry Gemini calls with exponential backoff for 429 rate limits."""
    for attempt in range(max_retries):
        try:
            return model.generate_content(messages)
        except Exception as e:
            error_str = str(e)
            if "429" in error_str and attempt < max_retries - 1:
                wait = (attempt + 1) * 5  # 5s, 10s, 15s
                print(f"Rate limited, retrying in {wait}s... (attempt {attempt + 1})")
                time.sleep(wait)
            else:
                raise e

router = APIRouter()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction="You are Crowdlux AI, an intelligent stadium crowd navigation assistant. Your goal is to help attendees find the quickest routes to their destinations (restrooms, food, stands, exits). You must ALWAYS respond with a single, valid JSON object following the requested schema. Do not include any conversational text or markdown outside the JSON."
)

class CrowdGuideRequest(BaseModel):
    stadium_id: str
    event_id: str
    zone_data: dict
    event_phase: str
    destination: str
    history: list = []
    attendee_profile: dict = None

@router.post("/crowd-guide")
async def crowd_guide(req: CrowdGuideRequest):
    from firebase_admin import firestore
    db = firestore.client()
    
    # Fetch dynamic names for context
    stadium_name = "the stadium"
    event_name = "the event"
    try:
        s_doc = db.collection("stadiums").document(req.stadium_id).get()
        if s_doc.exists:
            stadium_name = s_doc.to_dict().get("name", stadium_name)
        
        e_doc = db.collection("stadiums").document(req.stadium_id).collection("events").document(req.event_id).get()
        if e_doc.exists:
            event_name = e_doc.to_dict().get("name", event_name)
    except:
        pass

    profile_str = json.dumps(req.attendee_profile) if req.attendee_profile else "Unknown location"
    
    instruction_prompt = f"""
    STADIUM CONTEXT:
    You are at {stadium_name}. The current event is {event_name}.
    Event phase: {req.event_phase}
    Attendee Current Profile/Location: {profile_str}
    Current Zone Data (Wait times, crowding): {json.dumps(req.zone_data)}

    TASK:
    Analyze the data and attendee location. Identify the optimal route/zone based on their question: "{req.destination}".
    If they are asking for proximity ("nearest", "is there crowd here"), use their profile stand/gate information to calculate relevance.
    
    RESPONSE SCHEMA:
    {{
        "reasoning": "Hidden analysis of why this is the best choice (1 sentence)",
        "wait_minutes": number (minimum 2),
        "crowd_level": "low" | "moderate" | "high",
        "recommendation": "1 friendly, action-oriented sentence",
        "alternative_zone": "zone name or null",
        "alternative_wait": number or null,
        "best_time_to_go": "Now" or "Wait X minutes",
        "tip": "1 short stadium tip relevant to the current phase"
    }}

    INTELLIGENCE RULES:
    1. Proximity First: If the attendee is in Stand A, suggest services in or near North/Stand A first.
    2. Real-time Awareness: If a zone is near capacity (>80%), flag it as "high" crowd level and suggest the "alternative_zone".
    3. Respond ONLY with the JSON object. No markdown.
    4. Every field must be non-empty (except alternative fields where appropriate)."""
    
    # Reconstruct history dynamically
    messages = []
    
    if len(req.history) > 0:
        # Pass conversation history
        for msg in req.history:
              messages.append({"role": "user" if msg['role'] == 'user' else "model", "parts": [msg['parts']]})
        
        # Append the new instruction + target to the last message
        messages.append({"role": "user", "parts": [instruction_prompt]})
    else:
        messages.append({"role": "user", "parts": [instruction_prompt]})
    
    try:
        response = generate_with_retry(model, messages)
        text = response.text.strip()
        print(f"[Gemini RAW] {text[:500]}")  # Log first 500 chars
        
        # Extract JSON from markdown code blocks if present
        if "```" in text:
            # Find content between ``` markers
            parts = text.split("```")
            for part in parts[1:]:  # skip text before first ```
                cleaned = part.strip()
                if cleaned.lower().startswith("json"):
                    cleaned = cleaned[4:].strip()
                # Try parsing this block
                try:
                    return json.loads(cleaned)
                except:
                    continue
        
        # Try direct JSON parse
        try:
            return json.loads(text)
        except:
            pass
        
        # Last resort: find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        
        raise ValueError("Could not extract JSON from response")
        
    except Exception as e:
        print(f"Gemini API failure: {str(e)}")
        # Graceful degradation
        return {
            "wait_minutes": 5,
            "crowd_level": "low",
            "recommendation": f"Proceed normally to {req.destination}.",
            "alternative_zone": None,
            "alternative_wait": None,
            "best_time_to_go": "Now",
            "tip": "Enjoy the match!"
        }

@router.post("/smart-alerts")
async def generate_smart_alerts(req: dict):
    # Generates 3 alert suggestions based on zone data
    system_prompt = """You are the AI Operations Assistant for Crowdlux.
    Analyze the live stadium JSON dictionary provided representing the current state of zones.
    Generate EXACTLY 3 short, urgent push notification alerts (1-2 sentences max) recommending safe routing or warnings.
    Respond ONLY with a valid JSON array of objects, containing "type" (one of: info, warning, danger) and "message".
    """
    zone_data_str = json.dumps(req)
    
    try:
        response = generate_with_retry(model,
            [{"role": "user", "parts": [system_prompt + "\nData: " + zone_data_str]}]
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.lower().startswith("json"):
                text = text[4:]
        suggestions = json.loads(text.strip())
        return suggestions
    except Exception as e:
        print(f"Smart Alert failure: {str(e)}")
        # Fallback if Gemini fails
        return [
            {"type": "info", "message": "Remember to use all available gates for exit."},
            {"type": "warning", "message": "High traffic detected globally. Please be patient."}
        ]
