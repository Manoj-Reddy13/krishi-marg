from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import auth, farmers, orders, demand, logistics, analytics, public, buyer

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Krishi Marg API",
    version="1.0.0",
    description="SIH26033 perishability-aware agricultural marketplace and logistics prototype"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(farmers.router, prefix="/farmers", tags=["Farmers"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(demand.router, prefix="/demand", tags=["Demand"])
app.include_router(logistics.router, tags=["Logistics"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(buyer.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "krishi-marg-api"}
