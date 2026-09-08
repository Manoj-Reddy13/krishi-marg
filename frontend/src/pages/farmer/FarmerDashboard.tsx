import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import "./FarmerDashboard.css";

type Props = {
  user: any;
  signout: () => void;
};

type Page = "dashboard" | "list" | "earnings";

type Modal =
  | null
  | "advisory"
  | "pickup"
  | "market"
  | "support"
  | "qr"
  | "register";

export default function FarmerDashboard({ user, signout }: Props) {
  const [page, setPage] = useState<Page>("dashboard");
  const [data, setData] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [advisory, setAdvisory] = useState<any>(null);
  const [pickups, setPickups] = useState<any[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [supportText, setSupportText] = useState("");

  // Unified My Farm: Soil type & irrigation details
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [irrigation, setIrrigation] = useState("Drip Irrigation (Automated)");
  const [farmAcres, setFarmAcres] = useState("4.5");

  // Selected crop in advisory modal
  const [selectedAdvisoryCrop, setSelectedAdvisoryCrop] = useState("Tomato");

  // Form: Added harvest_date, removed grading dropdown
  const [form, setForm] = useState({
    crop: "Tomato",
    quantity: "120",
    harvest_date: new Date().toISOString().split("T")[0],
    price: "32",
  });

  // Farmer Registration Form
  const [regForm, setRegForm] = useState({
    name: user?.name || "Ramesh Patel",
    phone: "98480 23456",
    location: "Shamshabad Rural, Ranga Reddy District",
    acres: "5.0",
    crops: "Tomato, Onion, Chilli",
    soil: "Red Sandy Loam",
    irrigation: "Drip Irrigation",
  });

  const firstName = user?.name?.split(" ")[0] || "Farmer";
  const listings = data?.listings || [];
  const earnings = Number(data?.farmer?.earnings || 0);

  const totalAvailable = useMemo(
    () =>
      listings.reduce(
        (sum: number, item: any) =>
          sum + Number(item.remaining_qty || 0),
        0
      ),
    [listings]
  );

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Helper for crop icons
  function getCropIcon(cropName: string) {
    const lower = (cropName || "").toLowerCase();
    if (lower.includes("tomato")) return "🍅";
    if (lower.includes("onion")) return "🧅";
    if (lower.includes("potato")) return "🥔";
    if (lower.includes("chilli") || lower.includes("chili")) return "🌶️";
    if (lower.includes("mango")) return "🥭";
    if (lower.includes("spinach")) return "🥬";
    return "🌾";
  }

  async function loadFarmer() {
    const response = await api.get("/farmers/me");
    setData(response.data);
  }

  async function refreshDashboard() {
    try {
      setActionLoading("refresh");
      setMessage("");
      await loadFarmer();
      setMessage("Dashboard refreshed with latest Mandi and ledger data.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to refresh farmer data.");
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadFarmer();
      } catch (error) {
        console.error(error);
        setMessage("Unable to load farmer data. Check backend connectivity.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openAction(
    name: Exclude<Modal, null>,
    endpoint: string
  ) {
    try {
      setActionLoading(name);
      setMessage("");

      const response = await api.get(endpoint);

      if (name === "advisory") setAdvisory(response.data);
      if (name === "pickup") setPickups(response.data.pickups || []);
      if (name === "market") setMarket(response.data);

      setModal(name);
    } catch (error) {
      console.error(`${name} error`, error);
      setMessage(`Unable to load ${name} information.`);
    } finally {
      setActionLoading("");
    }
  }

  // Publish produce with Expected Harvest Date (grading removed from UI)
  async function publishProduce() {
    if (!form.quantity || Number(form.quantity) <= 0) {
      setMessage("Please enter a valid quantity in kg.");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setMessage("Please enter a valid expected price (₹/kg).");
      return;
    }

    if (!form.harvest_date) {
      setMessage("Please select an expected harvest date.");
      return;
    }

    try {
      setActionLoading("publish");
      setMessage("");

      await api.post("/farmers/produce", {
        crop: form.crop,
        quantity: Number(form.quantity),
        expected_grade: "A", // Default assigned; assayed upon arrival at collection center
        harvest_date: new Date(form.harvest_date).toISOString(),
        available_date: new Date(form.harvest_date).toISOString(),
        location: data?.farmer?.location || "Hyderabad Rural",
        expected_price: Number(form.price),
      });

      await loadFarmer();

      setForm({
        crop: "Tomato",
        quantity: "120",
        harvest_date: new Date().toISOString().split("T")[0],
        price: "32",
      });

      setPage("dashboard");
      setMessage("Produce listing published with expected harvest date! Reefer collection scheduled.");
    } catch (error: any) {
      console.error(error);
      setMessage(
        error?.response?.data?.detail ||
          "Unable to publish produce."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function submitSupport() {
    if (!supportText.trim()) {
      setMessage("Please describe your support request.");
      return;
    }

    try {
      setActionLoading("support");

      const response = await api.post("/farmers/support", {
        message: supportText.trim(),
      });

      setSupportText("");
      setModal(null);
      setMessage(
        `Support ticket #${response.data.ticket_code} registered. Krishi Kendra executive will contact you.`
      );
    } catch (error: any) {
      console.error(error);
      setMessage(
        error?.response?.data?.detail ||
          "Unable to submit support request."
      );
    } finally {
      setActionLoading("");
    }
  }

  // Farmer registration handler
  function handleRegisterFarmer(e: React.FormEvent) {
    e.preventDefault();
    setSoilType(regForm.soil);
    setIrrigation(regForm.irrigation);
    setFarmAcres(regForm.acres);
    setModal(null);
    setMessage(`Farmer Profile for "${regForm.name}" registered successfully with ID KM-FARM-9042!`);
  }

  if (loading) {
    return (
      <div className="farmer-loading-screen">
        <div className="farmer-loading-orb" />
        <div className="farmer-loading-spinner" />
        <h2>Connecting to Krishi Marg</h2>
        <p>Syncing farmer ledger, cold-chain telemetry & market rates...</p>
      </div>
    );
  }

  return (
    <div className="farmer-app">

      {/* ===================================================
          SIDEBAR
          =================================================== */}
      <aside className="farmer-sidebar-fixed">
        <div className="farmer-brand-fixed">
          <div className="farmer-brand-icon">
            <span>KM</span>
          </div>
          <div className="farmer-brand-title-wrap">
            <strong>KRISHI MARG</strong>
            <small>FARM TO MARKET NETWORK</small>
          </div>
        </div>

        <div className="farmer-role-fixed">
          <span className="farmer-role-dot" />
          <span>🌾 Verified Producer</span>
          <small className="sih-tag">SIH26033</small>
        </div>

        <nav className="farmer-navigation">
          <button
            type="button"
            className={page === "dashboard" ? "farmer-nav-active" : ""}
            onClick={() => setPage("dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <b>Dashboard</b>
          </button>

          <button
            type="button"
            className={page === "list" ? "farmer-nav-active" : ""}
            onClick={() => setPage("list")}
          >
            <span className="nav-icon">＋</span>
            <b>List Produce</b>
            <span className="nav-badge-pill">New</span>
          </button>

          <button
            type="button"
            className={page === "earnings" ? "farmer-nav-active" : ""}
            onClick={() => setPage("earnings")}
          >
            <span className="nav-icon">₹</span>
            <b>Earnings</b>
          </button>

          <button
            type="button"
            className="farmer-nav-register"
            onClick={() => setModal("register")}
          >
            <span className="nav-icon">📝</span>
            <b>Farmer Registration</b>
          </button>
        </nav>

        {/* Sidebar Wallet Glance */}
        <div className="farmer-sidebar-wallet">
          <small>CURRENT SETTLEMENT</small>
          <strong>₹{Math.round(earnings).toLocaleString("en-IN")}</strong>
          <span className="wallet-status">● Live Sync</span>
        </div>

        <div className="farmer-sidebar-bottom-fixed">
          <button
            type="button"
            className="farmer-sidebar-refresh"
            onClick={refreshDashboard}
            disabled={actionLoading === "refresh"}
          >
            <span className={actionLoading === "refresh" ? "spin" : ""}>↻</span>
            {actionLoading === "refresh" ? "Refreshing..." : "Refresh Network"}
          </button>

          <div className="farmer-online">
            <span className="online-ping" />
            <span>Telemetry Online</span>
          </div>

          <button
            type="button"
            className="farmer-logout"
            onClick={signout}
          >
            <span>↪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ===================================================
          MAIN WORKSPACE
          =================================================== */}
      <main className="farmer-main-fixed">

        {/* TOP HEADER */}
        <header className="farmer-header-fixed">
          <div className="farmer-header-titles">
            <h1>
              {page === "dashboard" && `${greeting}, ${firstName} 👋`}
              {page === "list" && "List Fresh Produce"}
              {page === "earnings" && "Farmer Ledger & Earnings"}
            </h1>

            <p>
              {page === "dashboard" && "Real-time harvest listings, cold-chain pickups, and forward mandi rates"}
              {page === "list" && "Publish farm lots with expected harvest date for scheduled cold-chain collection"}
              {page === "earnings" && "Automated batch settlement breakdown and cold-storage value"}
            </p>
          </div>

          <div className="farmer-header-user">
            <button
              type="button"
              className="farmer-header-reg-btn"
              onClick={() => setModal("register")}
            >
              <span>＋</span> Register Farmer
            </button>

            <button
              type="button"
              className="farmer-live-indicator farmer-live-button"
              onClick={refreshDashboard}
              title="Click to sync live telemetry"
            >
              <span className="live-beacon" />
              LIVE DATA
            </button>

            <div className="farmer-user-avatar">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="farmer-user-info">
              <strong>{user?.name || "Farmer"}</strong>
              <small>ID: {data?.farmer?.code || "KM-FARM-0892"}</small>
            </div>
          </div>
        </header>

        {/* TOAST SYSTEM MESSAGE */}
        {message && (
          <div className="farmer-system-message">
            <div className="message-icon">✓</div>
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Close message"
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            PAGE 1: DASHBOARD
            =================================================== */}
        {page === "dashboard" && (
          <div className="farmer-page-content">

            {/* WELCOME BANNER */}
            <section className="farmer-welcome-banner">
              <div className="farmer-welcome-copy">
                <span className="banner-eyebrow">
                  KRISHI MARG • DIRECT AGRI SUPPLY CHAIN
                </span>
                <h2>Grow More. Spoil Less. Realize Fair Prices.</h2>
                <p>
                  Your produce is scheduled for refrigerated transport directly from your farm gate to collection centers and urban buyer hubs.
                </p>

                <div className="farmer-banner-bottom-row">
                  <div className="farmer-location-display">
                    📍 {data?.farmer?.location || "Shamshabad Rural, Telangana"}
                  </div>
                  <button
                    type="button"
                    className="farmer-banner-cta"
                    onClick={() => setPage("list")}
                  >
                    + Book New Harvest Batch
                  </button>
                </div>
              </div>

              <div className="farmer-banner-graphic">
                <div className="banner-glow-circle" />
                <span className="banner-emoji">🌾</span>
              </div>
            </section>

            {/* STAT CARDS */}
            <div className="farmer-stat-grid">
              <div className="farmer-stat-card">
                <div className="stat-icon green">🌾</div>
                <div className="stat-info">
                  <span>Available Produce</span>
                  <strong>{Math.round(totalAvailable).toLocaleString()} <small>kg</small></strong>
                  <div className="stat-subtext">Active on supply grid</div>
                </div>
              </div>

              <div className="farmer-stat-card">
                <div className="stat-icon blue">📦</div>
                <div className="stat-info">
                  <span>Active Listings</span>
                  <strong>{listings.length} <small>lots</small></strong>
                  <div className="stat-subtext">Ready for pickup</div>
                </div>
              </div>

              <div className="farmer-stat-card">
                <div className="stat-icon orange">₹</div>
                <div className="stat-info">
                  <span>Settled Earnings</span>
                  <strong>₹{Math.round(earnings).toLocaleString("en-IN")}</strong>
                  <div className="stat-subtext">Bank-direct ledger</div>
                </div>
              </div>

              <div className="farmer-stat-card">
                <div className="stat-icon purple">⚡</div>
                <div className="stat-info">
                  <span>Network Status</span>
                  <strong>99.4% <small>optimal</small></strong>
                  <div className="stat-subtext">FastAPI node active</div>
                </div>
              </div>
            </div>

            {/* TWO-COLUMN DASHBOARD LAYOUT */}
            <div className="farmer-dashboard-columns">

              {/* LEFT COLUMN */}
              <div className="farmer-left-column">

                {/* QUICK OPERATIONS (Orders & Pickups, Crop Advisory, List Produce, Register) */}
                <section className="farmer-white-card">
                  <div className="farmer-card-heading">
                    <div>
                      <span className="section-pill">FARM SERVICES</span>
                      <h2>Quick Operations</h2>
                      <p>Instant access to harvest listing, agronomy advisory, and scheduled vehicle pickups.</p>
                    </div>
                  </div>

                  <div className="farmer-quick-actions">
                    <button
                      type="button"
                      onClick={() => setPage("list")}
                      className="quick-action-btn"
                    >
                      <div className="quick-icon green">🌾</div>
                      <div className="quick-action-text">
                        <strong>List Produce</strong>
                        <small>Publish harvest date & volume</small>
                      </div>
                      <b className="quick-arrow">→</b>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading === "advisory"}
                      onClick={() => openAction("advisory", "/farmers/advisory")}
                      className="quick-action-btn"
                    >
                      <div className="quick-icon blue">🌱</div>
                      <div className="quick-action-text">
                        <strong>Crop Advisory</strong>
                        <small>Weather, harvest window & care</small>
                      </div>
                      <b className="quick-arrow">
                        {actionLoading === "advisory" ? "..." : "→"}
                      </b>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading === "pickup"}
                      onClick={() => openAction("pickup", "/farmers/pickups")}
                      className="quick-action-btn"
                    >
                      <div className="quick-icon purple">🚚</div>
                      <div className="quick-action-text">
                        <strong>Orders & Pickups</strong>
                        <small>Assigned reefer vehicles & ETA</small>
                      </div>
                      <b className="quick-arrow">
                        {actionLoading === "pickup" ? "..." : "→"}
                      </b>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModal("register")}
                      className="quick-action-btn"
                    >
                      <div className="quick-icon orange">📝</div>
                      <div className="quick-action-text">
                        <strong>Farmer Registration</strong>
                        <small>Update soil, irrigation & land</small>
                      </div>
                      <b className="quick-arrow">→</b>
                    </button>
                  </div>
                </section>

                {/* ACTIVE LISTINGS */}
                <section className="farmer-white-card">
                  <div className="farmer-card-heading">
                    <div>
                      <span className="section-pill">LIVE BATCHES</span>
                      <h2>Your Produce Listings</h2>
                      <p>Active farm harvest lots registered for cold-chain transit.</p>
                    </div>

                    <button
                      type="button"
                      className="farmer-add-button"
                      onClick={() => setPage("list")}
                    >
                      + Add Harvest Lot
                    </button>
                  </div>

                  {listings.length === 0 ? (
                    <div className="farmer-empty-state">
                      <div className="empty-icon">🌾</div>
                      <h3>No Produce Listed Yet</h3>
                      <p>Publish your harvest today to receive automated cold-chain vehicle pickup.</p>
                      <button
                        type="button"
                        className="farmer-primary-btn"
                        onClick={() => setPage("list")}
                      >
                        Create Your First Listing →
                      </button>
                    </div>
                  ) : (
                    <div className="farmer-produce-list">
                      {listings.map((item: any) => {
                        const cropIcon = getCropIcon(item.crop || (item.crop_id === 1 ? "Tomato" : "Produce"));
                        const cropTitle = item.crop || (item.crop_id === 1 ? "Tomato" : "Produce Lot");

                        return (
                          <button
                            type="button"
                            className="farmer-produce-row farmer-produce-button"
                            key={item.id}
                            onClick={() =>
                              setMessage(
                                `Listing #${item.id} (${cropTitle}): ${item.remaining_qty} kg remaining. Ready for cold dispatch.`
                              )
                            }
                          >
                            <div className="produce-symbol-badge">
                              {cropIcon}
                            </div>

                            <div className="produce-name">
                              <strong>{cropTitle}</strong>
                              <small>📍 {item.location || data?.farmer?.location || "Farm Gate"}</small>
                            </div>

                            <div className="produce-data-col">
                              <span>AVAILABLE</span>
                              <strong>{item.remaining_qty} kg</strong>
                            </div>

                            <div className="produce-data-col">
                              <span>HARVEST STAGE</span>
                              <b className="harvest-ready-badge">Ready for Dispatch</b>
                            </div>

                            <div className="produce-data-col">
                              <span>DISPATCH STATUS</span>
                              <b className="produce-status">
                                <span className="status-dot" /> SCHEDULED
                              </b>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* RIGHT COLUMN */}
              <div className="farmer-right-column">

                {/* UNIFIED "MY FARM" (COMBINES MY FARM + FARM SUMMARY + SOIL & IRRIGATION) */}
                <section className="farmer-white-card farmer-my-farm-card">
                  <div className="farmer-card-heading">
                    <div>
                      <span className="section-pill">FARM GATE PROFILE</span>
                      <h2>My Farm</h2>
                      <p>Soil profile, irrigation facilities & geographic credentials.</p>
                    </div>

                    <button
                      type="button"
                      className="farmer-small-action"
                      onClick={() => setModal("qr")}
                      title="View Farm Digital QR"
                    >
                      ▦ Digital QR
                    </button>
                  </div>

                  {/* Primary Farm Info Grid */}
                  <div className="my-farm-grid">
                    <div className="farm-info-box">
                      <span className="farm-info-icon">📍</span>
                      <div>
                        <small>Location / Mandal</small>
                        <strong>{data?.farmer?.location || "Shamshabad Rural, Telangana"}</strong>
                      </div>
                    </div>

                    <div className="farm-info-box">
                      <span className="farm-info-icon">🌾</span>
                      <div>
                        <small>Cultivated Land Area</small>
                        <strong>{farmAcres} Acres</strong>
                      </div>
                    </div>

                    {/* SOIL TYPE */}
                    <div className="farm-info-box highlight-soil">
                      <span className="farm-info-icon">🌱</span>
                      <div>
                        <small>Soil Type</small>
                        <select
                          className="farm-inline-select"
                          value={soilType}
                          onChange={(e) => setSoilType(e.target.value)}
                        >
                          <option value="Red Sandy Loam">Red Sandy Loam</option>
                          <option value="Black Cotton Soil">Black Cotton Soil</option>
                          <option value="Clay Loam">Clay Loam</option>
                          <option value="Alluvial Soil">Alluvial Soil</option>
                          <option value="Silt Loam">Silt Loam</option>
                        </select>
                      </div>
                    </div>

                    {/* IRRIGATION DETAILS */}
                    <div className="farm-info-box highlight-irrigation">
                      <span className="farm-info-icon">💧</span>
                      <div>
                        <small>Irrigation Details</small>
                        <select
                          className="farm-inline-select"
                          value={irrigation}
                          onChange={(e) => setIrrigation(e.target.value)}
                        >
                          <option value="Drip Irrigation (Automated)">Drip Irrigation (Automated)</option>
                          <option value="Borewell + Sprinkler">Borewell + Sprinkler</option>
                          <option value="Canal Fed System">Canal Fed System</option>
                          <option value="Tube Well Flood">Tube Well Flood</option>
                          <option value="Rainfed (Monsoon)">Rainfed (Monsoon)</option>
                        </select>
                      </div>
                    </div>

                    <div className="farm-info-box">
                      <span className="farm-info-icon">🧭</span>
                      <div>
                        <small>GPS Coordinates</small>
                        <strong>
                          {data?.farmer?.lat && data?.farmer?.lng
                            ? `${data.farmer.lat}° N, ${data.farmer.lng}° E`
                            : "17.3850° N, 78.4867° E"}
                        </strong>
                      </div>
                    </div>

                    <div className="farm-info-box">
                      <span className="farm-info-icon">📦</span>
                      <div>
                        <small>Available Produce</small>
                        <strong>{Math.round(totalAvailable)} kg across {listings.length} Lots</strong>
                      </div>
                    </div>
                  </div>

                  {/* Farm Traceability ID Strip */}
                  <div className="farm-passport-strip">
                    <div>
                      <span>TRACEABILITY IDENTIFIER</span>
                      <strong>{data?.farmer?.code || "KM-FARM-0892"}</strong>
                    </div>
                    <button
                      type="button"
                      className="view-passport-btn"
                      onClick={() => setModal("qr")}
                    >
                      Open Passport →
                    </button>
                  </div>
                </section>

                {/* LIVE MANDI MARKET CARD */}
                <section className="farmer-market-card-new">
                  <div className="market-card-top">
                    <span className="market-pulse-dot" />
                    <span className="market-badge">LIVE MANDI TELEMETRY</span>
                  </div>

                  {market ? (
                    <div className="market-content-loaded">
                      <h2>{getCropIcon(market.crop)} {market.crop || "Agricultural Produce"}</h2>
                      <div className="market-price-big">
                        {market.price != null ? `₹${market.price}` : "₹32"}
                        <small>/ kg</small>
                      </div>

                      <div className="market-stats-row">
                        <div>
                          <span>Urban Demand</span>
                          <strong>{market.demand_kg != null ? `${market.demand_kg} kg` : "1,200 kg"}</strong>
                        </div>
                        <div>
                          <span>Supply Pool</span>
                          <strong>{market.supply_kg != null ? `${market.supply_kg} kg` : "840 kg"}</strong>
                        </div>
                      </div>

                      <div className="market-balance-bar-wrap">
                        <div className="balance-label">
                          <span>Market Absorption</span>
                          <b>Optimal Demand</b>
                        </div>
                        <div className="balance-track">
                          <span className="balance-fill" style={{ width: "78%" }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="market-placeholder">
                      <h2>Mandi Market Rates</h2>
                      <p>View real-time wholesale buyer bids, price indexes, and crop demand pools.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="market-action-btn"
                    disabled={actionLoading === "market"}
                    onClick={() => openAction("market", "/farmers/market")}
                  >
                    {actionLoading === "market" ? "Syncing Mandi..." : "Fetch Live Market Demand →"}
                  </button>
                </section>

                {/* SUPPORT CARD */}
                <section className="farmer-support-new">
                  <div className="support-info-text">
                    <strong>Krishi Sahayata 24×7</strong>
                    <p>Facing harvest delays or pickup questions? Submit a ticket directly to the logistics desk.</p>
                  </div>

                  <button
                    type="button"
                    className="support-btn"
                    onClick={() => setModal("support")}
                  >
                    Contact Support →
                  </button>
                </section>

              </div>
            </div>

          </div>
        )}

        {/* ===================================================
            PAGE 2: LIST PRODUCE (WITH EXPECTED HARVEST DATE & NO GRADING)
            =================================================== */}
        {page === "list" && (
          <div className="farmer-form-container">
            <section className="farmer-white-form">
              <div className="farmer-form-title">
                <div>
                  <span className="section-pill">HARVEST BOOKING MODULE</span>
                  <h2>List Available Produce</h2>
                  <p>
                    Enter your harvest details. Reefer transport will be scheduled according to your Expected Harvest Date.
                  </p>
                </div>
                <div className="form-title-badge">
                  {getCropIcon(form.crop)}
                </div>
              </div>

              <div className="farmer-form-grid-layout">
                {/* Form inputs */}
                <div className="farmer-input-grid">
                  <label className="form-field-group">
                    <span className="field-label">Crop Variety</span>
                    <select
                      value={form.crop}
                      onChange={(e) =>
                        setForm({ ...form, crop: e.target.value })
                      }
                      className="farmer-select"
                    >
                      <option value="Tomato">🍅 Tomato (Hybrid / Desi)</option>
                      <option value="Onion">🧅 Onion (Nashik Red)</option>
                      <option value="Potato">🥔 Potato (Jyoti)</option>
                      <option value="Chilli">🌶️ Green Chilli (G4)</option>
                      <option value="Mango">🥭 Mango (Banganapalli)</option>
                      <option value="Spinach">🥬 Spinach (Palak Fresh)</option>
                    </select>
                  </label>

                  <label className="form-field-group">
                    <span className="field-label">Quantity (kg)</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            quantity: e.target.value,
                          })
                        }
                        className="farmer-input"
                        placeholder="e.g. 250"
                      />
                      <span className="unit-tag">kg</span>
                    </div>
                  </label>

                  {/* EXPECTED HARVEST DATE (ADDED AS REQUESTED) */}
                  <label className="form-field-group">
                    <span className="field-label">Expected Harvest Date 📅</span>
                    <input
                      type="date"
                      value={form.harvest_date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setForm({ ...form, harvest_date: e.target.value })
                      }
                      className="farmer-input harvest-date-input"
                      required
                    />
                    <small className="field-hint">
                      Reefer collection corridor is locked to this target harvest window.
                    </small>
                  </label>

                  {/* NOTE: GRADING DROPDOWN REMOVED PER USER REQUIREMENT */}

                  <label className="form-field-group">
                    <span className="field-label">Expected Price (₹/kg)</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="1"
                        value={form.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            price: e.target.value,
                          })
                        }
                        className="farmer-input"
                        placeholder="e.g. 32"
                      />
                      <span className="unit-tag">₹ / kg</span>
                    </div>
                  </label>
                </div>

                {/* Live Preview Card */}
                <div className="farmer-listing-preview">
                  <div className="preview-header">
                    <span className="preview-tag">HARVEST DISPATCH PREVIEW</span>
                    <span className="preview-beacon" />
                  </div>

                  <div className="preview-crop-hero">
                    <span className="crop-big-emoji">{getCropIcon(form.crop)}</span>
                    <div>
                      <h3>{form.crop}</h3>
                      <small>Expected Harvest: {form.harvest_date}</small>
                    </div>
                  </div>

                  <div className="preview-details-list">
                    <div className="preview-stat-row">
                      <span>Total Lot Volume:</span>
                      <strong>{Number(form.quantity || 0).toLocaleString()} kg</strong>
                    </div>

                    <div className="preview-stat-row">
                      <span>Target Harvest Date:</span>
                      <strong>{form.harvest_date}</strong>
                    </div>

                    <div className="preview-stat-row">
                      <span>Expected Price:</span>
                      <strong>₹{Number(form.price || 0)} / kg</strong>
                    </div>

                    <div className="preview-stat-row highlight">
                      <span>Estimated Lot Value:</span>
                      <strong>
                        ₹{(Number(form.quantity || 0) * Number(form.price || 0)).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  <div className="preview-assay-note">
                    🔬 Quality assay & digital grading will be conducted upon arrival at the collection center.
                  </div>
                </div>
              </div>

              <div className="farmer-form-buttons">
                <button
                  type="button"
                  className="farmer-cancel"
                  onClick={() => setPage("dashboard")}
                >
                  ← Back to Dashboard
                </button>

                <button
                  type="button"
                  className="farmer-publish"
                  disabled={actionLoading === "publish"}
                  onClick={publishProduce}
                >
                  {actionLoading === "publish" ? "Publishing Harvest..." : "Publish Harvest Lot →"}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            PAGE 3: EARNINGS
            =================================================== */}
        {page === "earnings" && (
          <div className="farmer-earnings-container">
            <section className="farmer-earnings-hero">
              <div className="earnings-hero-content">
                <span className="earnings-tag">KRISHI MARG SMART LEDGER</span>
                <strong className="earnings-huge-num">
                  ₹{Math.round(earnings).toLocaleString("en-IN")}
                </strong>
                <p>
                  Direct settlement for completed cold-chain batches dispatched to Mandis and City Hubs.
                </p>
                <div className="settlement-meta">
                  <span>● Bank Account Synced</span>
                  <span>● Automated DBT Ready</span>
                </div>
              </div>

              <button
                type="button"
                className="earnings-sync-btn"
                onClick={refreshDashboard}
              >
                ↻ Sync Ledger
              </button>
            </section>

            <section className="farmer-white-card">
              <div className="farmer-card-heading">
                <div>
                  <span className="section-pill">LEDGER SUMMARY</span>
                  <h2>Earnings & Supply Breakdown</h2>
                  <p>Computed from real-time database records and completed weigh-ins.</p>
                </div>

                <button
                  type="button"
                  className="farmer-small-action"
                  onClick={refreshDashboard}
                >
                  Refresh
                </button>
              </div>

              <div className="farmer-earnings-grid">
                <div className="earnings-stat-box">
                  <span>Available Produce</span>
                  <strong>{Math.round(totalAvailable).toLocaleString()} kg</strong>
                  <small>Pending dispatch</small>
                </div>

                <div className="earnings-stat-box">
                  <span>Active Listings</span>
                  <strong>{listings.length} Lots</strong>
                  <small>Awaiting pickup</small>
                </div>

                <div className="earnings-stat-box highlight">
                  <span>Total Realized Value</span>
                  <strong>₹{Math.round(earnings).toLocaleString("en-IN")}</strong>
                  <small>Cleared settlement</small>
                </div>
              </div>
            </section>
          </div>
        )}

      </main>

      {/* ===================================================
          MODAL DIALOGS
          =================================================== */}
      {modal && (
        <div
          className="farmer-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <div
            className="farmer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="farmer-modal-header">
              <div>
                <span className="modal-header-tag">KRISHI MARG NETWORK</span>
                <h2>
                  {modal === "advisory" && "🌱 Smart Crop & Agronomy Advisory"}
                  {modal === "pickup" && "🚚 Assigned Cold-Chain Pickups"}
                  {modal === "market" && "📈 Wholesale Market Demand"}
                  {modal === "support" && "🎧 Krishi Sahayata Helpdesk"}
                  {modal === "qr" && "▦ Digital Traceability Passport"}
                  {modal === "register" && "📝 Farmer Registration Form"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </div>

            {/* MODAL: ADVISORY (RICH REFERENCE IMPLEMENTATION) */}
            {modal === "advisory" && (
              <div className="farmer-modal-body advisory-modal-body">
                {/* Weather & Harvest Window Ribbon */}
                <div className="advisory-weather-card">
                  <div className="weather-stat-left">
                    <span className="weather-icon">☀️</span>
                    <div>
                      <strong>28°C · Clear Sky</strong>
                      <small>Shamshabad Cluster · Humidity: 62% · Wind: 8 km/h NW</small>
                    </div>
                  </div>
                  <div className="harvest-window-pill">
                    <span>OPTIMAL HARVEST HOURS</span>
                    <b>06:00 AM - 09:30 AM</b>
                  </div>
                </div>

                {/* Crop Tabs */}
                <div className="advisory-crop-tabs">
                  {["Tomato", "Onion", "Chilli", "Potato", "Spinach"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`advisory-tab-btn ${selectedAdvisoryCrop === c ? "active" : ""}`}
                      onClick={() => setSelectedAdvisoryCrop(c)}
                    >
                      {getCropIcon(c)} {c}
                    </button>
                  ))}
                </div>

                {/* Dynamic Advisory Cards */}
                <div className="advisory-cards-grid">
                  {selectedAdvisoryCrop === "Tomato" && (
                    <>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge green">Harvest Timing</span>
                          <strong>Color Break Stage</strong>
                        </div>
                        <p>Pick at 'Breaker' to 'Turning' stage (blossom end showing pink star). Extends transit shelf life by 4-5 days in reefer transit.</p>
                      </div>

                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge blue">Pre-Harvest Care</span>
                          <strong>Irrigation Cut-off</strong>
                        </div>
                        <p>Withhold surface/drip irrigation 24 hours before picking to avoid fruit skin cracking and dilution of brix/sugar content.</p>
                      </div>

                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge orange">Crate Handling</span>
                          <strong>Stacking Limit</strong>
                        </div>
                        <p>Use perforated 20-kg agri-crates. Stack maximum 4 layers high to prevent bottom crate compression bruising.</p>
                      </div>

                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge purple">Disease Shield</span>
                          <strong>Early Blight Guard</strong>
                        </div>
                        <p>Inspect lower canopy leaves. Apply organic Trichoderma or neem oil spray if night humidity exceeds 75%.</p>
                      </div>
                    </>
                  )}

                  {selectedAdvisoryCrop === "Onion" && (
                    <>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge green">Maturity Sign</span>
                          <strong>Neck Fall Stage</strong>
                        </div>
                        <p>Harvest when 50% of plant tops fall over naturally. Premature harvest causes bulb rotting during cold storage.</p>
                      </div>

                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge blue">Field Curing</span>
                          <strong>48-Hour Curing</strong>
                        </div>
                        <p>Dry bulbs under partial shade in windrows for 48 hours to tighten outer skins and prevent moisture loss.</p>
                      </div>

                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge orange">Ventilation</span>
                          <strong>Airflow Storage</strong>
                        </div>
                        <p>Store in mesh sacks. Maintain dry, well-ventilated airflow at 0°C to 5°C with 65-70% relative humidity.</p>
                      </div>
                    </>
                  )}

                  {selectedAdvisoryCrop === "Chilli" && (
                    <>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge green">Picking Guideline</span>
                          <strong>Firm Pedicel Pick</strong>
                        </div>
                        <p>Pick dark green, turgid pods with stalk intact. Avoid harvesting immediately after rain to prevent bacterial soft rot.</p>
                      </div>

                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge purple">Pest Alert</span>
                          <strong>Thrips & Mites</strong>
                        </div>
                        <p>Install yellow and blue sticky traps (10 traps per acre) to monitor sucking pests during active flowering and pod set.</p>
                      </div>
                    </>
                  )}

                  {selectedAdvisoryCrop === "Potato" && (
                    <>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge green">Skin Hardening</span>
                          <strong>Dehaulming Technique</strong>
                        </div>
                        <p>Cut above-ground foliage 10-12 days before digging to cure the tuber skin, minimizing skinning during mechanical sorting.</p>
                      </div>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge blue">Temperature</span>
                          <strong>Cold Storage Protocol</strong>
                        </div>
                        <p>Hold at 10-12°C for wound healing for 10 days, then transfer to 4°C reefer storage.</p>
                      </div>
                    </>
                  )}

                  {selectedAdvisoryCrop === "Spinach" && (
                    <>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge green">Early Harvest</span>
                          <strong>Dawn Picking</strong>
                        </div>
                        <p>Harvest at sunrise when leaves are crisp and full of moisture. Wrap in damp burlap sheets for farm-gate reefer pickup.</p>
                      </div>
                      <div className="advisory-card">
                        <div className="advisory-card-top">
                          <span className="adv-badge blue">Transit Temp</span>
                          <strong>0°C - 2°C Reefer</strong>
                        </div>
                        <p>Requires immediate cold-chain entry to prevent chlorophyll degradation and leaf yellowing.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* MODAL: PICKUPS (NO "MATCHING" REFERENCES) */}
            {modal === "pickup" && (
              <div className="farmer-modal-body">
                <div className="pickup-modal-banner">
                  <span>SCHEDULED REEFER LOGISTICS</span>
                  <p>Below are your confirmed cold-chain vehicle pickups. Drivers will arrive directly at your farm gate.</p>
                </div>

                {pickups.length === 0 ? (
                  <div className="farmer-empty-state">
                    <div className="empty-icon">🚚</div>
                    <h3>No Pickups Currently Scheduled</h3>
                    <p>
                      Pickups appear here as soon as a collection run is scheduled for your published harvest dates.
                    </p>
                  </div>
                ) : (
                  <div className="pickups-list">
                    {pickups.map((item: any, idx: number) => (
                      <div className="farmer-modal-item pickup-card-enhanced" key={item.id || idx}>
                        <div className="pickup-top-line">
                          <strong className="shipment-code-badge">
                            {item.shipment_code || `KM-PICK-0${idx + 1}42`}
                          </strong>
                          <span className="pickup-stage-tag">
                            {item.stage === "MATCHED" ? "SCHEDULED FOR PICKUP" : (item.stage || "SCHEDULED FOR PICKUP")}
                          </span>
                        </div>

                        <div className="pickup-enhanced-details">
                          <div className="pickup-col">
                            <small>Produce Lot</small>
                            <strong>{getCropIcon(item.crop)} {item.crop || "Tomato"} · {item.quantity || "120"} kg</strong>
                          </div>

                          <div className="pickup-col">
                            <small>Assigned Vehicle</small>
                            <strong>Mini Reefer Van (4°C - 8°C)</strong>
                          </div>

                          <div className="pickup-col">
                            <small>Pickup Window</small>
                            <strong>Today, 09:30 AM - 11:00 AM</strong>
                          </div>

                          <div className="pickup-col">
                            <small>Destination</small>
                            <strong>Collection Center #02 (Shamshabad)</strong>
                          </div>
                        </div>

                        <div className="pickup-status-footer">
                          <span className="status-beacon-dot" />
                          <span>Driver assigned · Farm-gate weigh-in & seal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODAL: MARKET */}
            {modal === "market" && (
              <div className="farmer-modal-body">
                {market ? (
                  <div className="market-modal-content">
                    <div className="market-hero-stat">
                      <span>{getCropIcon(market.crop)} {market.crop}</span>
                      <strong>₹{market.price || 32} <small>/ kg</small></strong>
                      <small>Current Mandi Benchmark Price</small>
                    </div>

                    <div className="farmer-detail-grid">
                      <div className="detail-item">
                        <span>Total Demand</span>
                        <strong>{market.demand_kg?.toLocaleString() || "1,200"} kg</strong>
                      </div>
                      <div className="detail-item">
                        <span>Available Supply</span>
                        <strong>{market.supply_kg?.toLocaleString() || "840"} kg</strong>
                      </div>
                      <div className="detail-item">
                        <span>Unmet Balance</span>
                        <strong className="positive-text">{market.balance_kg?.toLocaleString() || "360"} kg</strong>
                      </div>
                      <div className="detail-item">
                        <span>Price Trend</span>
                        <strong className="positive-text">↑ +8.4% (Firm Demand)</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>Market demand data is currently not loaded.</p>
                )}
              </div>
            )}

            {/* MODAL: SUPPORT */}
            {modal === "support" && (
              <div className="farmer-modal-body">
                <label className="support-label">
                  <span>Describe your concern or query</span>
                  <textarea
                    value={supportText}
                    onChange={(e) => setSupportText(e.target.value)}
                    placeholder="Example: Need to adjust harvest pickup date for batch KM-2048..."
                    rows={5}
                    className="support-textarea"
                  />
                </label>

                <button
                  type="button"
                  className="farmer-publish support-submit"
                  disabled={actionLoading === "support"}
                  onClick={submitSupport}
                >
                  {actionLoading === "support" ? "Registering Ticket..." : "Submit Support Request →"}
                </button>
              </div>
            )}

            {/* MODAL: FARMER REGISTRATION (NEW REQUIREMENT) */}
            {modal === "register" && (
              <div className="farmer-modal-body">
                <form onSubmit={handleRegisterFarmer} className="farmer-reg-form">
                  <div className="reg-form-banner">
                    <span>PRODUCER ONBOARDING</span>
                    <h3>Register Farmer & Cultivation Profile</h3>
                    <p>Provide farm coordinates, soil characteristics, and irrigation method for optimized cold-chain matching.</p>
                  </div>

                  <div className="reg-grid">
                    <label className="reg-label">
                      Farmer Full Name
                      <input
                        type="text"
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        className="farmer-input"
                        required
                      />
                    </label>

                    <label className="reg-label">
                      Mobile / WhatsApp Number
                      <input
                        type="tel"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        className="farmer-input"
                        required
                      />
                    </label>

                    <label className="reg-label full-width">
                      Farm Gate Location (Village, Mandal, District)
                      <input
                        type="text"
                        value={regForm.location}
                        onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                        className="farmer-input"
                        required
                      />
                    </label>

                    <label className="reg-label">
                      Farm Size (in Acres)
                      <input
                        type="number"
                        step="0.1"
                        value={regForm.acres}
                        onChange={(e) => setRegForm({ ...regForm, acres: e.target.value })}
                        className="farmer-input"
                        required
                      />
                    </label>

                    <label className="reg-label">
                      Primary Crops Grown
                      <input
                        type="text"
                        value={regForm.crops}
                        onChange={(e) => setRegForm({ ...regForm, crops: e.target.value })}
                        className="farmer-input"
                        placeholder="e.g. Tomato, Onion, Chilli"
                        required
                      />
                    </label>

                    {/* SOIL TYPE FIELD */}
                    <label className="reg-label">
                      Soil Type 🌱
                      <select
                        value={regForm.soil}
                        onChange={(e) => setRegForm({ ...regForm, soil: e.target.value })}
                        className="farmer-select"
                      >
                        <option value="Red Sandy Loam">Red Sandy Loam</option>
                        <option value="Black Cotton Soil">Black Cotton Soil</option>
                        <option value="Clay Loam">Clay Loam</option>
                        <option value="Alluvial Soil">Alluvial Soil</option>
                        <option value="Silt Loam">Silt Loam</option>
                      </select>
                    </label>

                    {/* IRRIGATION METHOD FIELD */}
                    <label className="reg-label">
                      Irrigation Facility 💧
                      <select
                        value={regForm.irrigation}
                        onChange={(e) => setRegForm({ ...regForm, irrigation: e.target.value })}
                        className="farmer-select"
                      >
                        <option value="Drip Irrigation">Drip Irrigation (Automated)</option>
                        <option value="Borewell + Sprinkler">Borewell + Sprinkler</option>
                        <option value="Canal Fed">Canal Fed System</option>
                        <option value="Tube Well">Tube Well Flood</option>
                        <option value="Rainfed">Rainfed</option>
                      </select>
                    </label>
                  </div>

                  <div className="reg-buttons">
                    <button
                      type="button"
                      className="farmer-cancel"
                      onClick={() => setModal(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="farmer-publish"
                    >
                      Complete Farmer Registration →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODAL: QR */}
            {modal === "qr" && (
              <div className="farmer-modal-body qr-modal">
                <div className="qr-fake-box">
                  <svg className="qr-svg-graphic" viewBox="0 0 160 160">
                    <rect width="160" height="160" fill="#ffffff" rx="12" />
                    <rect x="14" y="14" width="36" height="36" rx="6" fill="#072618" />
                    <rect x="22" y="22" width="20" height="20" rx="3" fill="#ffffff" />
                    <rect x="27" y="27" width="10" height="10" fill="#22c55e" />
                    <rect x="110" y="14" width="36" height="36" rx="6" fill="#072618" />
                    <rect x="118" y="22" width="20" height="20" rx="3" fill="#ffffff" />
                    <rect x="123" y="27" width="10" height="10" fill="#22c55e" />
                    <rect x="14" y="110" width="36" height="36" rx="6" fill="#072618" />
                    <rect x="22" y="118" width="20" height="20" rx="3" fill="#ffffff" />
                    <rect x="27" y="123" width="10" height="10" fill="#22c55e" />
                    <rect x="62" y="16" width="10" height="10" fill="#072618" />
                    <rect x="76" y="28" width="10" height="10" fill="#22c55e" />
                    <rect x="90" y="16" width="10" height="10" fill="#072618" />
                    <rect x="62" y="44" width="10" height="10" fill="#072618" />
                    <rect x="76" y="60" width="16" height="16" rx="4" fill="#072618" />
                    <rect x="100" y="70" width="10" height="10" fill="#22c55e" />
                    <rect x="120" y="60" width="10" height="10" fill="#072618" />
                    <rect x="62" y="100" width="10" height="10" fill="#22c55e" />
                    <rect x="80" y="114" width="10" height="10" fill="#072618" />
                    <rect x="110" y="114" width="10" height="10" fill="#072618" />
                    <rect x="130" y="130" width="10" height="10" fill="#22c55e" />
                  </svg>
                  <span className="qr-badge-over">KM TRACE</span>
                </div>

                <div className="qr-id-title">
                  <strong>{data?.farmer?.code || "KM-FARM-0892"}</strong>
                  <span className="qr-verified-stamp">✓ Verified Farm Gate · {soilType}</span>
                </div>

                <p className="qr-description">
                  Present this QR token to collection agents at intake or cold-truck drivers for zero-contact batch verification and instant digital receipt.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}