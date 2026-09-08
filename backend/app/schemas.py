from datetime import datetime
from pydantic import BaseModel, Field

class LoginIn(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ProduceIn(BaseModel):
    crop: str
    quantity: float = Field(gt=0)
    expected_grade: str = "A"
    harvest_date: datetime
    available_date: datetime
    location: str
    expected_price: float = Field(gt=0)

class OrderIn(BaseModel):
    crop: str
    quantity: float = Field(gt=0)
    grade_preference: str = "A/B"
    destination: str
    delivery_window: str

class BuyerRequirementIn(BaseModel):
    crop: str
    quantity: float = Field(gt=0)
    grade: str = "A/B"
    destination: str
    cadence: str = "Weekly"

class InspectionIn(BaseModel):
    lot_id: int
    actual_grade: str
    visible_quality: str = "Good"
    accepted_qty: float = Field(gt=0)
    rejected_qty: float = 0
    notes: str = ""

class DriverActionIn(BaseModel):
    driver_id: int | None = None
    vehicle_id: int | None = None

class RouteRequest(BaseModel):
    shipment_id: int

class TrackingTick(BaseModel):
    shipment_id: int
    progress: float = Field(ge=0, le=1)
