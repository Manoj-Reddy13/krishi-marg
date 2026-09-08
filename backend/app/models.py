from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(40), index=True)
    phone: Mapped[str] = mapped_column(String(30), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Farmer(Base):
    __tablename__ = "farmers"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    farmer_code: Mapped[str] = mapped_column(String(40), unique=True)
    location: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    earnings: Mapped[float] = mapped_column(Float, default=0)

class Produce(Base):
    __tablename__ = "produce"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    unit: Mapped[str] = mapped_column(String(20), default="kg")
    base_price: Mapped[float] = mapped_column(Float)

class ProduceListing(Base):
    __tablename__ = "produce_listings"
    id: Mapped[int] = mapped_column(primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id"))
    produce_id: Mapped[int] = mapped_column(ForeignKey("produce.id"))
    quantity: Mapped[float] = mapped_column(Float)
    expected_grade: Mapped[str] = mapped_column(String(2), default="A")
    harvest_date: Mapped[datetime] = mapped_column(DateTime)
    available_date: Mapped[datetime] = mapped_column(DateTime)
    location: Mapped[str] = mapped_column(String(120))
    expected_price: Mapped[float] = mapped_column(Float)
    remaining_qty: Mapped[float] = mapped_column(Float)

class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"
    id: Mapped[int] = mapped_column(primary_key=True)
    buyer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    crop: Mapped[str] = mapped_column(String(80))
    quantity: Mapped[float] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(String(20))
    destination: Mapped[str] = mapped_column(String(120))
    cadence: Mapped[str] = mapped_column(String(80), default="One-time")
    status: Mapped[str] = mapped_column(String(30), default="OPEN")

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    crop: Mapped[str] = mapped_column(String(80))
    quantity: Mapped[float] = mapped_column(Float)
    grade_preference: Mapped[str] = mapped_column(String(20))
    destination: Mapped[str] = mapped_column(String(180))
    delivery_window: Mapped[str] = mapped_column(String(100))
    produce_cost: Mapped[float] = mapped_column(Float)
    logistics_estimate: Mapped[float] = mapped_column(Float)
    total_estimate: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="ORDER_PLACED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class DemandCluster(Base):
    __tablename__ = "demand_clusters"
    id: Mapped[int] = mapped_column(primary_key=True)
    crop: Mapped[str] = mapped_column(String(80))
    destination: Mapped[str] = mapped_column(String(120))
    delivery_window: Mapped[str] = mapped_column(String(100))
    grade_preference: Mapped[str] = mapped_column(String(20))
    total_quantity: Mapped[float] = mapped_column(Float)
    matched_quantity: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class FarmerSupplyMatch(Base):
    __tablename__ = "farmer_supply_matches"
    id: Mapped[int] = mapped_column(primary_key=True)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("demand_clusters.id"))
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id"))
    listing_id: Mapped[int] = mapped_column(ForeignKey("produce_listings.id"))
    quantity: Mapped[float] = mapped_column(Float)
    score: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="MATCHED")

class CollectionCentre(Base):
    __tablename__ = "collection_centres"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)

class PackageCentre(Base):
    __tablename__ = "package_centres"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)

class CityHub(Base):
    __tablename__ = "city_hubs"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)

class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[int] = mapped_column(primary_key=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    vehicle_type: Mapped[str] = mapped_column(String(50))
    capacity_kg: Mapped[float] = mapped_column(Float)
    temp_capable: Mapped[bool] = mapped_column(Boolean, default=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    plate: Mapped[str] = mapped_column(String(30), unique=True)

class Lot(Base):
    __tablename__ = "lots"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_code: Mapped[str] = mapped_column(String(60), unique=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id"))
    crop: Mapped[str] = mapped_column(String(80))
    quantity: Mapped[float] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(String(2))
    harvest_time: Mapped[datetime] = mapped_column(DateTime)
    current_stage: Mapped[str] = mapped_column(String(60), default="COLLECTION")
    freshness_score: Mapped[float] = mapped_column(Float, default=82)
    temperature: Mapped[float] = mapped_column(Float, default=8.4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class GradeInspection(Base):
    __tablename__ = "grade_inspections"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"))
    actual_grade: Mapped[str] = mapped_column(String(2))
    visible_quality: Mapped[str] = mapped_column(String(80))
    accepted_qty: Mapped[float] = mapped_column(Float)
    rejected_qty: Mapped[float] = mapped_column(Float, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_code: Mapped[str] = mapped_column(String(60), unique=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    current_stage: Mapped[str] = mapped_column(String(50), default="BOOKED")
    status: Mapped[str] = mapped_column(String(50), default="REQUESTED")
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    distance_km: Mapped[float] = mapped_column(Float, default=0)
    duration_min: Mapped[float] = mapped_column(Float, default=0)
    eta: Mapped[str] = mapped_column(String(80), default="—")
    current_lat: Mapped[float] = mapped_column(Float, default=17.385)
    current_lng: Mapped[float] = mapped_column(Float, default=78.486)
    freshness_score: Mapped[float] = mapped_column(Float, default=82)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ShipmentLeg(Base):
    __tablename__ = "shipment_legs"
    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"))
    sequence: Mapped[int] = mapped_column(Integer)
    origin: Mapped[str] = mapped_column(String(120))
    destination: Mapped[str] = mapped_column(String(120))
    distance_km: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="REQUESTED")

class DriverRequest(Base):
    __tablename__ = "driver_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"))
    driver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    earnings: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class TrackingEvent(Base):
    __tablename__ = "tracking_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"))
    event_type: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(40), default="INFO")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")

class TemperatureLog(Base):
    __tablename__ = "temperature_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"))
    temperature: Mapped[float] = mapped_column(Float)
    safe_min: Mapped[float] = mapped_column(Float, default=4)
    safe_max: Mapped[float] = mapped_column(Float, default=12)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[str] = mapped_column(String(80))
    value: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
