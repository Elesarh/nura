from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from .models import UserRole, ShopStatus, LicenseStatus, PaymentType

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    shop_id: Optional[UUID] = None

class UserBase(BaseModel):
    username: str
    role: UserRole

class UserCreate(UserBase):
    password: str
    shop_id: Optional[UUID] = None

class User(UserBase):
    id: UUID
    shop_id: Optional[UUID]
    created_at: datetime
    class Config:
        from_attributes = True

class ShopBase(BaseModel):
    name: str
    owner_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class ShopCreate(ShopBase):
    pass

class Shop(ShopBase):
    id: UUID
    status: ShopStatus
    created_at: datetime
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    purchase_price: float = 0.0
    sale_price: float = 0.0
    quantity: int = 0
    minimum_stock: int = 0

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: UUID
    shop_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: UUID
    shop_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class SaleBase(BaseModel):
    customer_id: Optional[UUID] = None
    total_amount: float
    discount: float = 0.0
    payment_type: PaymentType

class SaleCreate(SaleBase):
    pass

class Sale(SaleBase):
    id: UUID
    shop_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class DebtBase(BaseModel):
    customer_id: UUID
    sale_id: Optional[UUID] = None
    debt_amount: float
    paid_amount: float = 0.0
    remaining_amount: float

class DebtCreate(DebtBase):
    pass

class Debt(DebtBase):
    id: UUID
    shop_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True
