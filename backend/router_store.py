from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import database, models, schemas, auth
from typing import List
from uuid import UUID

router = APIRouter(prefix="/store", tags=["store"])

def get_shop_id(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.shop_id:
        raise HTTPException(status_code=403, detail="User not assigned to any shop")
    return current_user.shop_id

@router.get("/products", response_model=List[schemas.Product])
def get_products(db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    return db.query(models.Product).filter(models.Product.shop_id == shop_id).all()

@router.post("/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    new_prod = models.Product(**product.model_dump(), shop_id=shop_id)
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return new_prod

@router.get("/customers", response_model=List[schemas.Customer])
def get_customers(db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    return db.query(models.Customer).filter(models.Customer.shop_id == shop_id).all()

@router.post("/customers", response_model=schemas.Customer)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    new_cust = models.Customer(**customer.model_dump(), shop_id=shop_id)
    db.add(new_cust)
    db.commit()
    db.refresh(new_cust)
    return new_cust

@router.post("/sales", response_model=schemas.Sale)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    new_sale = models.Sale(**sale.model_dump(), shop_id=shop_id)
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    return new_sale

@router.get("/sales", response_model=List[schemas.Sale])
def get_sales(db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    return db.query(models.Sale).filter(models.Sale.shop_id == shop_id).all()

@router.get("/debts", response_model=List[schemas.Debt])
def get_debts(db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    return db.query(models.Debt).filter(models.Debt.shop_id == shop_id).all()

@router.post("/debts", response_model=schemas.Debt)
def create_debt(debt: schemas.DebtCreate, db: Session = Depends(database.get_db), shop_id: UUID = Depends(get_shop_id)):
    new_debt = models.Debt(**debt.model_dump(), shop_id=shop_id)
    db.add(new_debt)
    db.commit()
    db.refresh(new_debt)
    return new_debt
