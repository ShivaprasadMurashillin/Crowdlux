from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from firebase_admin import firestore
from auth_utils import get_authenticated_user

router = APIRouter()
db = firestore.client()


class ReserveSeatRequest(BaseModel):
    stadium_id: str
    event_id: str
    stand: str
    row: str
    seat: str
    accessibility: bool = False
    gate: str | None = None


def _seat_key(stand: str, row: str, seat: str) -> str:
    safe_stand = ''.join(ch for ch in stand.lower() if ch.isalnum())
    safe_row = ''.join(ch for ch in str(row).lower() if ch.isalnum())
    safe_seat = ''.join(ch for ch in str(seat).lower() if ch.isalnum())
    return f"{safe_stand}_{safe_row}_{safe_seat}"


@router.post('/reserve')
async def reserve_seat(req: ReserveSeatRequest, user: dict = Depends(get_authenticated_user)):
    user_id = user.get('uid')
    if not user_id:
        raise HTTPException(status_code=401, detail='Invalid authentication token')

    seat_key = _seat_key(req.stand, req.row, req.seat)

    event_ref = (
        db.collection('stadiums')
        .document(req.stadium_id)
        .collection('events')
        .document(req.event_id)
    )
    seat_ref = event_ref.collection('seats').document(seat_key)
    user_ref = db.collection('users').document(user_id)

    transaction = db.transaction()

    @firestore.transactional
    def _reserve_in_txn(txn):
        seat_doc = seat_ref.get(transaction=txn)
        if seat_doc.exists:
            current = seat_doc.to_dict() or {}
            reserved_by = current.get('reserved_by')
            if reserved_by and reserved_by != user_id:
                raise ValueError('seat_taken')

        seat_payload = {
            'key': seat_key,
            'stand': req.stand,
            'row': req.row,
            'seat': req.seat,
            'accessibility': req.accessibility,
            'gate': req.gate,
            'reserved_by': user_id,
            'status': 'reserved',
            'updated_at': firestore.SERVER_TIMESTAMP,
        }
        txn.set(seat_ref, seat_payload, merge=True)

        user_seat = {
            'stand': req.stand,
            'row': req.row,
            'seat': req.seat,
            'accessibility': req.accessibility,
            'gate': req.gate,
            'seat_key': seat_key,
        }
        user_payload = {
            'currentEvent': {
                'stadiumId': req.stadium_id,
                'eventId': req.event_id,
            },
            'seats': {
                req.event_id: user_seat,
            },
        }
        txn.set(user_ref, user_payload, merge=True)

    try:
        _reserve_in_txn(transaction)
    except ValueError as e:
        if str(e) == 'seat_taken':
            raise HTTPException(status_code=409, detail='Seat already booked by another attendee')
        raise HTTPException(status_code=500, detail='Seat reservation failed')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        'success': True,
        'seat_key': seat_key,
    }
