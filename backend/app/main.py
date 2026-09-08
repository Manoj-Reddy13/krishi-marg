from fastapi import FastAPI
from fastapi.responses import HTMLResponse
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

@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Krishi Marg API — Live</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1f17; color: #e1ede4; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #162f23; border: 1px solid #2d5540; border-radius: 16px; padding: 42px 48px; max-width: 540px; text-align: center; box-shadow: 0 20px 45px rgba(0,0,0,0.45); }
          .badge { display: inline-block; background: #1e4530; color: #4ade80; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; text-transform: uppercase; }
          h1 { color: #86efac; margin: 0 0 12px; font-size: 26px; }
          p { color: #a7c4b3; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
          a { display: inline-block; background: #4ade80; color: #0f1f17; text-decoration: none; font-weight: 700; padding: 10px 18px; border-radius: 8px; font-size: 13px; }
          a.sec { background: transparent; border: 1px solid #3d6f54; color: #86efac; }
          a:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● FastAPI Backend Online</div>
          <h1>Krishi Marg Backend API is Active</h1>
          <p>This service provides the real-time AI dispatch, FEFO inventory, and role authentication APIs for Krishi Marg (SIH26033).</p>
          <div class="links">
            <a href="/docs">Open Swagger API Docs →</a>
            <a href="/health" class="sec">Health Check</a>
          </div>
        </div>
      </body>
    </html>
    """

@app.get("/health")
def health():
    return {"status": "ok", "service": "krishi-marg-api"}
