# KRISHI MARG — SIH26033 Prototype

A genuinely backend-driven Smart India Hackathon 2026 prototype for:
**Right Produce • Right Vehicle • Right Route • On Time**

## Included
- React + Vite + TypeScript frontend
- FastAPI REST backend
- PostgreSQL via Docker Compose (SQLite fallback for zero-friction local demo)
- Role-based demo access for Farmer, Customer, B2B Buyer, Driver, Collection Centre, Package Centre, City Hub and Admin
- Backend-driven order creation, demand aggregation, farmer matching, QR lot traceability, grade inspection, dynamic pricing, driver assignment, shipment state transitions, tracking, freshness scoring, forecasting and analytics
- Leaflet/OpenStreetMap map
- Simulated GPS movement stored through the backend
- Recharts analytics
- QR generation and browser camera scanning
- OR-Tools optimization when installed, with a deterministic fallback when it is not
- Seeded Hyderabad-area demo data

## Fastest run

### Option A — easiest local demo
Backend:
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

Frontend (new terminal):
```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173.

The default local database is SQLite so the prototype works even without Docker/PostgreSQL.

### Option B — PostgreSQL
From the project root:
```bash
docker compose up -d db
```
Then set:
```env
DATABASE_URL=postgresql+psycopg://krishi:krishi@localhost:5432/krishi_marg
```
in `backend/.env`, seed, and run the API.

## Demo accounts

All demo accounts accept the same password:
`demo123`

- farmer@krishimarg.demo
- customer@krishimarg.demo
- buyer@krishimarg.demo
- driver@krishimarg.demo
- collection@krishimarg.demo
- package@krishimarg.demo
- hub@krishimarg.demo
- admin@krishimarg.demo

You can also use the **Quick Demo Login** buttons on the login screen.

## Suggested SIH judge flow
1. Customer creates 100 kg tomato order.
2. Customer creates another 150 kg tomato order.
3. B2B requirement contributes 500 kg.
4. Admin opens Demand & Matching and runs aggregation.
5. Matching allocates suitable farmer supply.
6. Collection operator opens Receiving, scans the generated lot QR and changes grade A → B.
7. Backend recalculates the price and creates a notification.
8. Driver sees a compatible trip, accepts it, starts it, and simulated GPS moves the marker.
9. Package centre confirms packing/handoff.
10. Hub applies FEFO priority and dispatches.
11. Customer tracking shows the same shipment state and map position.
12. Admin analytics update after delivery.

## API docs
Once the backend is running:
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Important
Demo values and simulated GPS are explicitly labelled in the UI. The application does not expose Aadhaar or other sensitive identity data. Farmer and lot identifiers are internal QR-safe IDs.
