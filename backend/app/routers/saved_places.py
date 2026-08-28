from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import SavedPlace
from app.schemas.schemas import SavedPlaceCreate, SavedPlaceOut
from app.services.hazards.hazard_engine import hazard_engine

router = APIRouter(prefix="/saved-places", tags=["Saved Places Safety Companion"])

@router.get("/", response_model=List[SavedPlaceOut])
async def get_saved_places(user_id: int = 1, db: Session = Depends(get_db)):
    places = db.query(SavedPlace).filter(SavedPlace.user_id == user_id).all()
    
    # If empty, pre-populate default sample places for quick demonstration
    if not places:
        defaults = [
            SavedPlace(user_id=1, name="Home Village", place_type="home", address="Meppadi, Wayanad, Kerala", latitude=11.5540, longitude=76.1280, last_risk_level="Severe", last_risk_score=84.2),
            SavedPlace(user_id=1, name="Parents' House", place_type="parents_house", address="Munnar, Idukki, Kerala", latitude=10.0889, longitude=77.0595, last_risk_level="High", last_risk_score=68.5),
            SavedPlace(user_id=1, name="District School", place_type="school", address="Kalpetta, Wayanad, Kerala", latitude=11.6104, longitude=76.0827, last_risk_level="Moderate", last_risk_score=38.0),
            SavedPlace(user_id=1, name="Agricultural Farm", place_type="farm", address="Vythiri, Wayanad, Kerala", latitude=11.5513, longitude=76.0401, last_risk_level="High", last_risk_score=72.0)
        ]
        for p in defaults:
            db.add(p)
        db.commit()
        places = db.query(SavedPlace).filter(SavedPlace.user_id == user_id).all()

    # Re-evaluate live risk for each saved place
    result = []
    for place in places:
        try:
            eval_res = await hazard_engine.evaluate_hazard(place.latitude, place.longitude)
            place.last_risk_score = eval_res["risk_score"]
            place.last_risk_level = eval_res["risk_level"]
        except Exception:
            pass
        result.append(place)

    return result

@router.post("/", response_model=SavedPlaceOut)
async def create_saved_place(place_in: SavedPlaceCreate, user_id: int = 1, db: Session = Depends(get_db)):
    eval_res = await hazard_engine.evaluate_hazard(place_in.latitude, place_in.longitude)
    
    place = SavedPlace(
        user_id=user_id,
        name=place_in.name,
        place_type=place_in.place_type,
        address=place_in.address or f"{place_in.name} ({place_in.latitude:.3f}, {place_in.longitude:.3f})",
        latitude=place_in.latitude,
        longitude=place_in.longitude,
        last_risk_level=eval_res["risk_level"],
        last_risk_score=eval_res["risk_score"]
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return place

@router.delete("/{place_id}")
def delete_saved_place(place_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    place = db.query(SavedPlace).filter(SavedPlace.id == place_id, SavedPlace.user_id == user_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Saved place not found.")
    db.delete(place)
    db.commit()
    return {"message": "Saved place removed successfully."}
