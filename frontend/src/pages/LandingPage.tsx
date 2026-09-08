import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  const [activeStage, setActiveStage] = useState(2);
  const [live, setLive] = useState(true);

  const [mouse, setMouse] = useState({
    x: 50,
    y: 50,
  });

  const [stats, setStats] = useState({
    freshness: 94,
    utilization: 87,
    deliveries: 128,
    farmers: 248,
    vehicles: 42,
    waste: 8.2,
  });

  const heroRef = useRef<HTMLDivElement>(null);

  /* =====================================================
     LIVE DATA ANIMATION
     ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      if (!live) return;

      setStats((prev) => ({
        freshness:
          prev.freshness >= 99
            ? 91
            : prev.freshness + 1,

        utilization:
          prev.utilization >= 95
            ? 82
            : prev.utilization + 1,

        deliveries:
          prev.deliveries >= 145
            ? 121
            : prev.deliveries + 1,

        farmers:
          prev.farmers >= 255
            ? 241
            : prev.farmers + 1,

        vehicles:
          prev.vehicles >= 48
            ? 39
            : prev.vehicles + 1,

        waste:
          prev.waste <= 6.5
            ? 9.1
            : Number((prev.waste - 0.1).toFixed(1)),
      }));

      setActiveStage((stage) =>
        stage >= 4 ? 0 : stage + 1
      );
    }, 2800);

    return () => clearInterval(timer);
  }, [live]);


  /* =====================================================
     MOUSE PARALLAX
     ===================================================== */

  useEffect(() => {
    const handleMouse = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      setMouse({ x, y });
    };

    window.addEventListener("mousemove", handleMouse);

    return () =>
      window.removeEventListener("mousemove", handleMouse);
  }, []);


  /* =====================================================
     SCROLL REVEAL
     ===================================================== */

  useEffect(() => {
    const elements = document.querySelectorAll(".km-scroll");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("km-scroll-visible");
          }
        });
      },
      {
        threshold: 0.12,
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);


  /* =====================================================
     NAVIGATION
     ===================================================== */

  function goLogin() {
    navigate("/login");
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  }


  const stages = [
    {
      number: "01",
      label: "FARM",
      title: "Supply",
      description: "Farmers list available produce with verified harvest timestamps.",
    },
    {
      number: "02",
      label: "COLLECT",
      title: "Quality",
      description: "Produce is AI-graded, verified, and pre-cooled at village centers.",
    },
    {
      number: "03",
      label: "MOVE",
      title: "Routing",
      description: "Reefer vehicles receive multi-stop, freshness-first routing schedules.",
    },
    {
      number: "04",
      label: "HUB",
      title: "Inventory",
      description: "City hubs manage freshness-aware FIFO inventory and bulk dispatch.",
    },
    {
      number: "05",
      label: "DELIVER",
      title: "Consumers",
      description: "Direct-to-consumer farm-fresh produce and B2B bulk demand aggregation.",
    },
  ];


  return (
    <div className="km-home">

      {/* =================================================
          NAVIGATION
          ================================================= */}

      <header className="km-navbar">

        <button
          className="km-brand"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <div className="km-brand-mark-wrap">
            <span className="km-brand-mark">KM</span>
            <span className="km-brand-pulse" />
          </div>

          <span className="km-brand-text">
            <strong>KRISHI MARG</strong>
            <small>FROM FARMS TO MARKETS</small>
          </span>
        </button>


        <nav className="km-nav">
          <button onClick={() => scrollTo("home")}>
            Overview
          </button>

          <button onClick={() => scrollTo("network")}>
            Network
          </button>

          <button onClick={() => scrollTo("workflow")}>
            How it works
          </button>

          <button onClick={() => scrollTo("ecosystem")}>
            Ecosystem
          </button>
        </nav>


        <div className="km-nav-right">
          <div className="km-nav-status">
            <span className="km-status-beacon" />
            <span className="km-nav-status-text">SIH26033 LIVE</span>
          </div>

          <button
            className="km-login"
            onClick={goLogin}
          >
            Login
          </button>

          <button
            className="km-enter"
            onClick={goLogin}
          >
            Enter platform
            <span className="km-enter-arrow">↗</span>
          </button>
        </div>

      </header>


      {/* =================================================
          HERO
          ================================================= */}

      <section
        id="home"
        className="km-hero"
        ref={heroRef}
      >

        {/* MOUSE GLOW */}
        <div
          className="km-mouse-glow"
          style={{
            left: `${mouse.x}%`,
            top: `${mouse.y}%`,
          }}
        />

        {/* AMBIENT MESH ORBS */}
        <div className="km-hero-ambient-orb orb-1" />
        <div className="km-hero-ambient-orb orb-2" />

        {/* BACKGROUND GRID */}
        <div className="km-hero-bg-grid" />

        {/* BACKGROUND PARTICLES */}
        <div className="km-particles">
          {Array.from({ length: 24 }).map((_, index) => (
            <span
              key={index}
              style={{
                left: `${(index * 29 + 13) % 96}%`,
                top: `${(index * 47 + 7) % 94}%`,
                animationDelay: `${(index % 8) * 0.6}s`,
                animationDuration: `${5 + (index % 5)}s`,
              }}
            />
          ))}
        </div>


        {/* HERO COPY */}
        <div className="km-hero-copy">

          <div className="km-eyebrow">
            <span className="km-pulse" />
            <span className="km-eyebrow-text">SMART INDIA HACKATHON</span>
            <b>2026</b>
            <span className="km-eyebrow-dot">•</span>
            <span className="km-badge-code">SIH26033</span>
          </div>


          <h1>
            India's fresh
            <br />
            produce,
            <span className="gradient-text">
              moving
              <br />
              smarter.
            </span>
          </h1>


          <p className="km-hero-description">
            Krishi Marg connects farmers, real-time demand, AI quality grading, cold-chain vehicles, and city hubs through one unified, intelligent fresh-produce logistics network.
          </p>


          <div className="km-hero-actions">
            <button
              className="km-primary"
              onClick={goLogin}
            >
              <span className="km-primary-content">
                Explore the platform
                <span className="km-btn-arrow">→</span>
              </span>
            </button>

            <button
              className="km-secondary"
              onClick={() => scrollTo("workflow")}
            >
              <span className="km-play">▶</span>
              See how it works
            </button>
          </div>


          {/* TRUST / KEY PILLARS */}
          <div className="km-proof">
            <div className="km-proof-item">
              <strong>01</strong>
              <span>
                <b>Demand</b>
                matching
              </span>
            </div>

            <div className="km-proof-item">
              <strong>02</strong>
              <span>
                <b>Grade-aware</b>
                pricing
              </span>
            </div>

            <div className="km-proof-item">
              <strong>03</strong>
              <span>
                <b>Freshness-first</b>
                logistics
              </span>
            </div>
          </div>

        </div>


        {/* =================================================
            COMMAND CENTER HUD
            ================================================= */}

        <div className="km-command-wrapper">
          <div className="km-command-shadow" />

          <div className="km-command">

            {/* RADAR SWEEP EFFECT */}
            <div className="km-radar-sweep" />

            <div className="km-command-top">
              <div>
                <div className="km-telemetry-badge">
                  <span className="km-live-pulse-dot" />
                  <span className="command-label">KRISHI MARG // REAL-TIME NETWORK HUD</span>
                </div>
                <h2>Supply Network Grid</h2>
              </div>

              <button
                className="km-live"
                onClick={() => setLive(!live)}
                title="Toggle live telemetry simulation"
              >
                <span className={live ? "live-dot" : "live-dot off"} />
                {live ? "LIVE TELEMETRY" : "PAUSED"}
              </button>
            </div>


            {/* =================================================
                ANIMATED MAP
                ================================================= */}

            <div className="km-map">

              <div className="map-grid" />
              <div className="map-radial-glow" />

              {/* ROADS */}
              <div className="map-road road-a" />
              <div className="map-road road-b" />
              <div className="map-road road-c" />

              {/* SVG ROUTE */}
              <svg
                className="km-route-svg"
                viewBox="0 0 800 300"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="routeGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="50%" stopColor="#a3e635" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>

                  <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Base Route Road Bed */}
                <path
                  d="
                    M 65 225
                    C 180 220,
                      160 75,
                      310 100
                    S 440 220,
                      535 145
                    S 680 80,
                      740 70
                  "
                  fill="none"
                  stroke="#1b4634"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Animated Flow Corridor */}
                <path
                  className="animated-route"
                  d="
                    M 65 225
                    C 180 220,
                      160 75,
                      310 100
                    S 440 220,
                      535 145
                    S 680 80,
                      740 70
                  "
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="14 12"
                  filter="url(#routeGlow)"
                />
              </svg>


              {/* NETWORK NODES */}
              <MapNode
                className="node-farmer"
                code="F"
                title="FARM"
                value="248 farms"
                active={activeStage === 0}
              />

              <MapNode
                className="node-collection"
                code="C"
                title="COLLECT"
                value="08 centers"
                active={activeStage === 1}
              />

              <MapNode
                className="node-hub"
                code="H"
                title="CITY HUB"
                value="06 hubs"
                active={activeStage === 3}
              />

              <MapNode
                className="node-city"
                code="D"
                title="DELIVERY"
                value="128 today"
                active={activeStage === 4}
              />


              {/* MOVING VEHICLE (REEFER COLD TRUCK) */}
              <div
                className={
                  live
                    ? "km-map-truck moving"
                    : "km-map-truck"
                }
              >
                <div className="truck-glow" />
                <div className="truck-box">
                  <span>KM</span>
                  <span className="truck-reefer-light" />
                </div>
                <div className="truck-cab" />
                <span className="truck-light" />
              </div>


              {/* ACTIVE SHIPMENT TOOLTIP */}
              <div className="map-tooltip">
                <div className="tooltip-header">
                  <span className="tooltip-tag">ACTIVE REEFER DISPATCH</span>
                  <span className="tooltip-pulse" />
                </div>
                <strong>KM-2048 • Grade A</strong>
                <small>Fresh Tomatoes • 420 kg • 4°C Controlled</small>
                <div className="tooltip-status">
                  <span className="status-indicator-dot" /> ON OPTIMIZED ROUTE
                </div>
              </div>


              {/* MAP MINI LABEL */}
              <div className="map-mini-label">
                <span className="mini-pulse-dot" />
                <strong>17 reefer vehicles</strong> in transit
              </div>

            </div>


            {/* =================================================
                LIVE METRICS
                ================================================= */}

            <div className="km-command-stats">
              <div className="stat-card">
                <span className="stat-label">FRESHNESS INDEX</span>
                <strong className="stat-num">
                  {stats.freshness}
                  <small>/100</small>
                </strong>
                <em className="stat-trend positive">
                  ↑ 4.2% Peak
                </em>
              </div>

              <div className="stat-card">
                <span className="stat-label">FLEET UTILIZATION</span>
                <strong className="stat-num">
                  {stats.utilization}
                  <small>%</small>
                </strong>
                <em className="stat-trend positive">
                  ↑ 7.8% Opt.
                </em>
              </div>

              <div className="stat-card">
                <span className="stat-label">ACTIVE LOADS</span>
                <strong className="stat-num">
                  {stats.deliveries}
                </strong>
                <em className="stat-trend neutral">
                  Dispatched Today
                </em>
              </div>
            </div>


            {/* FOOTER */}
            <div className="km-command-footer">
              <div className="km-footer-left">
                <span className="status-ring" />
                <span>Cold-chain network operating at 99.8% stability</span>
              </div>
              <strong className="km-footer-right">
                <span className="gps-indicator">GPS SYNC</span> ACTIVE
              </strong>
            </div>

          </div>


          {/* =================================================
              FLOATING KPI CARDS
              ================================================= */}

          <div className="km-float-card float-top">
            <span className="float-icon">₹</span>
            <div>
              <small>TRANSACTED VALUE</small>
              <strong>₹12.8 Lakh</strong>
            </div>
            <em className="float-pill">+12.4% vs avg</em>
          </div>


          <div className="km-float-card float-bottom">
            <span className="float-icon blue">⚡</span>
            <div>
              <small>TRANSIT ETA</small>
              <strong>42 mins</strong>
            </div>
            <span className="eta-good">● ON SCHEDULE</span>
          </div>


          {/* FLOATING ALERT */}
          <div className="km-alert-card">
            <div className="alert-icon-wrap">
              <span className="alert-check">✓</span>
            </div>
            <div>
              <strong>Freshness Integrity Preserved</strong>
              <small>Route optimized 12 sec ago via AI Engine</small>
            </div>
          </div>

        </div>

      </section>


      {/* =================================================
          NETWORK
          ================================================= */}

      <section
        id="network"
        className="km-network km-scroll"
      >
        <div className="network-intro">
          <span>LIVE INFRASTRUCTURE</span>
          <strong>
            Every farm handoff.
            <br />
            One single source of truth.
          </strong>
          <p className="network-subtext">Real-time synchronized telemetry across pan-India nodes.</p>
        </div>

        <NetworkNumber
          value={stats.farmers}
          label="ACTIVE FARMS"
        />

        <NetworkNumber
          value={8}
          label="COLLECTION HUBS"
        />

        <NetworkNumber
          value={stats.vehicles}
          label="REEFER FLEET"
        />

        <NetworkNumber
          value={6}
          label="CITY HUBS"
        />

        <div className="network-stat highlight">
          <div className="stat-glow-badge" />
          <strong>{stats.waste}%</strong>
          <span>
            PREDICTED POST-HARVEST
            <br />
            WASTE RATE (REDUCED)
          </span>
        </div>
      </section>


      {/* =================================================
          WORKFLOW
          ================================================= */}

      <section
        id="workflow"
        className="km-workflow km-scroll"
      >

        <div className="km-section-heading">
          <span className="km-pill-badge">THE CONNECTED PIPELINE</span>
          <h2>
            From <em>soil</em> to
            <br />
            <em>city kitchen.</em>
          </h2>
          <p>
            An interconnected supply chain where produce, grade data, freshness telemetry, and logistics synchronize seamlessly.
          </p>
        </div>


        <div className="km-stage-track">
          {/* Animated Connecting Progress Line */}
          <div className="stage-line">
            <div
              className="stage-line-fill"
              style={{
                width: `${(activeStage / 4) * 100}%`,
              }}
            />
          </div>

          {stages.map((stage, index) => (
            <button
              key={stage.number}
              className={
                index === activeStage
                  ? "km-stage active"
                  : "km-stage"
              }
              onClick={() => setActiveStage(index)}
            >
              <span className="stage-number">{stage.number}</span>
              <div className="stage-circle-wrap">
                <span className="stage-circle">
                  {stage.label.charAt(0)}
                </span>
                {index === activeStage && <span className="stage-pulse-ring" />}
              </div>
              <strong>{stage.label}</strong>
              <small>{stage.title}</small>
              <span className="stage-description">
                {stage.description}
              </span>
            </button>
          ))}
        </div>


        {/* ACTIVE STAGE PANEL */}
        <div className="km-stage-detail">
          <div className="stage-detail-left">
            <div className="detail-live">
              <span className="detail-live-beacon" />
              CURRENT STAGE IN FOCUS // {stages[activeStage].number}
            </div>

            <strong>{stages[activeStage].label} — {stages[activeStage].title}</strong>
            <p>{stages[activeStage].description}</p>
          </div>

          <div className="stage-detail-right">
            <button
              className="stage-action-btn"
              onClick={goLogin}
            >
              <span>Explore {stages[activeStage].title} Module</span>
              <span className="btn-arrow-icon">→</span>
            </button>
          </div>
        </div>

      </section>


      {/* =================================================
          ECOSYSTEM
          ================================================= */}

      <section
        id="ecosystem"
        className="km-ecosystem km-scroll"
      >

        <div className="km-section-heading left">
          <span className="km-pill-badge">THE ECOSYSTEM</span>
          <h2>
            One intelligent platform.
            <br />
            <em>Everyone empowered.</em>
          </h2>
          <p>
            Every stakeholder gets a dedicated workspace with tailored role tools, while the entire cold-chain stays unified in real time.
          </p>
        </div>


        <div className="km-role-grid">
          <RoleCard
            number="01"
            icon="🌱"
            title="Farmer"
            text="List freshly harvested produce, receive AI grade estimates, and access fair forward market rates."
            onClick={goLogin}
          />

          <RoleCard
            number="02"
            icon="🔬"
            title="Collection"
            text="Automate intake inspection, quality grading, pre-cooling schedules, and container dispatch."
            onClick={goLogin}
          />

          <RoleCard
            number="03"
            icon="🚛"
            title="Transport"
            text="Accept temperature-managed routes, optimize fuel and multi-stop collections with live navigation."
            onClick={goLogin}
          />

          <RoleCard
            number="04"
            icon="🏢"
            title="City Hub"
            text="Manage freshness-based FIFO inventory, shelf-life monitoring, and quick bulk dispatch."
            onClick={goLogin}
          />

          <RoleCard
            number="05"
            icon="🛰️"
            title="Control Tower"
            text="Complete national visibility with live anomaly alerts, price discovery, and predictive analytics."
            onClick={goLogin}
          />

          <RoleCard
            number="06"
            icon="🛒"
            title="Consumers & B2B"
            text="Select between Retail Consumer (D2C) doorstep delivery and B2B Wholesale multi-ton procurement."
            onClick={goLogin}
          />
        </div>

      </section>


      {/* =================================================
          IMPACT / VALUE
          ================================================= */}

      <section className="km-value km-scroll">

        <div className="value-copy">
          <span className="km-pill-badge">PROVEN IMPACT</span>
          <h2>
            Turn farm freshness into
            <br />
            <em>an economic edge.</em>
          </h2>
          <p>
            By dynamically matching field harvests with urban buyer demand and reducing cold-chain bottlenecks, Krishi Marg helps unlock tremendous value across India's agricultural backbone.
          </p>

          <button
            className="km-value-button"
            onClick={goLogin}
          >
            <span>Explore full system telemetry & analytics</span>
            <span className="btn-arrow-icon">→</span>
          </button>
        </div>


        <div className="value-panel">
          <div className="value-panel-header">
            <span>MEASURED PERFORMANCE IMPACT</span>
            <span className="live-demo-tag">● VERIFIED PILOT METRICS</span>
          </div>

          <ImpactMetric
            label="NET FARMER REALIZATION"
            value="+18.6%"
            width="82%"
          />

          <ImpactMetric
            label="COLD VEHICLE UTILIZATION"
            value="87.4%"
            width="87%"
          />

          <ImpactMetric
            label="ON-TIME HARVEST-TO-HUB DISPATCH"
            value="94.2%"
            width="94%"
          />

          <ImpactMetric
            label="POST-HARVEST SPOILAGE REDUCTION"
            value="23.0%"
            width="63%"
          />
        </div>

      </section>


      {/* =================================================
          FINAL CTA
          ================================================= */}

      <section className="km-cta km-scroll">

        <div className="cta-grid" />
        <div className="km-cta-orb orb-one" />
        <div className="km-cta-orb orb-two" />

        <div className="km-cta-content">
          <div className="cta-badge">
            <span className="cta-beacon" />
            <span>SIH 2026 • SIH26033 • SMART AGRI-LOGISTICS</span>
          </div>

          <h2>
            The future of India's
            <br />
            <em>fresh supply chains is here.</em>
          </h2>

          <p>
            Experience the complete Krishi Marg platform prototype — built for reliability, traceability, and maximum freshness.
          </p>

          <button
            onClick={goLogin}
            className="km-cta-main-btn"
          >
            Enter Krishi Marg Platform
            <span className="km-btn-arrow">→</span>
          </button>
        </div>

      </section>


      {/* =================================================
          FOOTER
          ================================================= */}

      <footer className="km-footer">

        <div className="km-footer-brand">
          <span className="km-brand-mark">KM</span>
          <div>
            <strong>KRISHI MARG</strong>
            <small>Smart Fresh Produce Logistics • From Farms to Markets</small>
          </div>
        </div>

        <div className="km-footer-sih">
          Smart India Hackathon 2026 · Problem Statement SIH26033
        </div>

        <button onClick={goLogin} className="km-footer-launch">
          Launch platform <span>→</span>
        </button>

      </footer>

    </div>
  );
}


/* =========================================================
   MAP NODE
   ========================================================= */

function MapNode({
  className,
  code,
  title,
  value,
  active,
}: {
  className: string;
  code: string;
  title: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={
        active
          ? `map-node ${className} active`
          : `map-node ${className}`
      }
    >
      <div className="map-node-dot-wrap">
        <span>{code}</span>
        {active && <span className="node-active-radar" />}
      </div>

      <small>{title}</small>

      <div className="map-node-tooltip">
        <span className="tooltip-indicator" />
        {value}
      </div>
    </div>
  );
}


/* =========================================================
   NETWORK NUMBER
   ========================================================= */

function NetworkNumber({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="network-stat">
      <strong>{value}</strong>
      <span>{label}</span>
      <span className="network-stat-bar" />
    </div>
  );
}


/* =========================================================
   ROLE CARD
   ========================================================= */

function RoleCard({
  number,
  icon,
  title,
  text,
  onClick,
}: {
  number: string;
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      className="km-role-card"
      onClick={onClick}
    >
      <div className="role-top">
        <span className="role-index">{number}</span>
        <b className="role-arrow">↗</b>
      </div>

      <div className="role-symbol">
        {icon}
      </div>

      <h3>{title}</h3>
      <p>{text}</p>

      <span className="role-enter">
        Enter workspace <span>→</span>
      </span>
    </button>
  );
}


/* =========================================================
   IMPACT METRIC
   ========================================================= */

function ImpactMetric({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <div className="impact-row">
      <div className="impact-text-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="impact-bar">
        <span
          style={{
            width,
          }}
        />
      </div>
    </div>
  );
}