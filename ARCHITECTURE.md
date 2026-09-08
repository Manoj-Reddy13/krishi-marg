# Krishi Marg architecture

Frontend
- `src/App.tsx`: role-specific product experiences
- `src/api.ts`: authenticated API service
- `src/styles.css`: visual system and role differentiation
- Leaflet: operational maps
- Recharts: analytics
- QRCode: client QR rendering support

Backend
- FastAPI REST
- SQLAlchemy normalized relational models
- JWT authentication
- Services for demand aggregation, supply matching, freshness, pricing and distance fallback
- Shipment/driver state transitions persist in the database
- Tracking ticks persist GPS and temperature events
- Optional OR-Tools import with deterministic fallback
- Seeded demo network around Hyderabad

The demo deliberately labels simulated data/GPS and does not expose sensitive identity data.
