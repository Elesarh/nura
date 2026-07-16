from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import database, models, schemas, auth
from typing import List

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(auth.get_current_superadmin)])

@router.get("/shops", response_model=List[schemas.Shop])
def get_shops(db: Session = Depends(database.get_db)):
    return db.query(models.Shop).all()

@router.post("/shops", response_model=schemas.Shop)
def create_shop(shop: schemas.ShopCreate, db: Session = Depends(database.get_db)):
    new_shop = models.Shop(**shop.model_dump())
    db.add(new_shop)
    db.commit()
    db.refresh(new_shop)
    return new_shop

@router.get("/licenses")
def get_licenses(db: Session = Depends(database.get_db)):
    return db.query(models.License).all()
