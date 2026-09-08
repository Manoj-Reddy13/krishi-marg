import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, Link, useNavigate, useLocation } from 'react-router-dom'
import api, { login, logout, user } from './api'
import type { Role, Shipment } from './types'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import QRCode from 'qrcode'
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import LandingPage from "./pages/LandingPage";
const demoAccounts: Record<Role,string> = {
  farmer:'farmer@krishimarg.demo', customer:'customer@krishimarg.demo', buyer:'buyer@krishimarg.demo',
  driver:'driver@krishimarg.demo', collection:'collection@krishimarg.demo', package:'package@krishimarg.demo',
  hub:'hub@krishimarg.demo', admin:'admin@krishimarg.demo'
}

function App(){
  const u=user()
  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<Login/>}/>
    <Route path="/app/*" element={u?<RoleApp role={u.role} u={u}/>:<Navigate to="/login" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}

function Landing(){
  return <div className="landing">
    <header className="public-nav"><div className="brand"><span className="brand-mark">KM</span><span>KRISHI <b>MARG</b></span></div><Link className="ghost-btn" to="/login">Enter platform</Link></header>
    <main className="hero">
      <div className="hero-copy"><div className="eyebrow">SIH 2026 · SIH26033 · AGRICULTURE + LOGISTICS</div>
      <h1>Right produce.<br/><em>Right vehicle.</em><br/>Right route. On time.</h1>
      <p>Krishi Marg coordinates demand, farmer supply and perishability-aware transport from collection to the customer's doorstep.</p>
      <div className="hero-actions"><Link className="primary-btn" to="/login">Open live prototype →</Link><span className="demo-note">Backend-driven · Demo data clearly labelled</span></div></div>
      <div className="route-card"><div className="route-head"><span>ORDER-TO-DELIVERY</span><span className="live-dot">● LIVE DEMO</span></div><div className="route-line">
        {['Farmer','Collection','Package','City Hub','Customer'].map((x,i)=><div className="route-stop" key={x}><div className={`route-node ${i===2?'active':''}`}>{i+1}</div><span>{x}</span></div>)}
      </div><div className="route-metrics"><div><b>Freshness</b><strong>82/100</strong></div><div><b>Utilization</b><strong>86%</strong></div><div><b>ETA</b><strong>42 min</strong></div></div></div>
    </main>
    <section className="feature-strip">{[['Demand aggregation','Orders become one actionable supply requirement.'],['Grade-aware pricing','Inspection changes price through the backend.'],['Traceable lots','Internal QR IDs follow every handoff.'],['Freshness-first routing','Age, temperature and delay affect priority.']].map(([a,b])=><div key={a}><span>0{featureIndex(a)}</span><h3>{a}</h3><p>{b}</p></div>)}</section>
  </div>
}
function featureIndex(s:string){return ['Demand aggregation','Grade-aware pricing','Traceable lots','Freshness-first routing'].indexOf(s)+1}
function Login(){
  const nav = useNavigate()

  const [email, setEmail] = useState(demoAccounts.admin)
  const [pw, setPw] = useState('demo123')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (busy) return

    setBusy(true)
    setErr('')

    try {
      console.log('LOGIN: sending request...')

      const loggedInUser = await login(email.trim(), pw)

      console.log('LOGIN SUCCESS:', loggedInUser)

      if (!loggedInUser) {
        throw new Error('User information was not returned by the server.')
      }

      /*
       * Force a fresh React load after authentication.
       * This makes App() read the newly stored km_user
       * from localStorage and prevents the old login state
       * from remaining on screen.
       */
      window.location.href = '/app'

    } catch (error: any) {
      console.error('LOGIN FAILED:', error)

      let message = 'Login failed. Please try again.'

      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail

        if (typeof detail === 'string') {
          message = detail
        } else {
          message = JSON.stringify(detail)
        }
      } else if (error?.message) {
        message = error.message
      }

      setErr(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">

      <div className="login-art">

        <div className="brand light">
          <span className="brand-mark">KM</span>
          <span>
            KRISHI <b>MARG</b>
          </span>
        </div>

        <h1>
          One network.
          <br />
          Every handoff visible.
        </h1>

        <p>
          Use the demo accounts to experience each purpose-built role.
        </p>

        <div className="login-flow">
          FARMER → COLLECTION → PACKAGE → HUB → CUSTOMER
        </div>

      </div>

      <div className="login-panel">

        <div className="panel-kicker">
          KRISHI MARG · DEMO ACCESS
        </div>

        <h2>Enter the platform</h2>

        <p className="muted">
          All accounts use password <b>demo123</b>.
        </p>

        <form onSubmit={submit}>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {err && (
            <div className="error">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="primary-btn wide"
            disabled={busy}
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>

        </form>

        <div className="demo-grid">

          {Object.entries(demoAccounts).map(([r, e]) => (

            <button
              type="button"
              key={r}
              className="demo-role"
              onClick={() => {
                setEmail(e)
                setPw('demo123')
                setErr('')
                if (r === 'customer') {
                  sessionStorage.removeItem('km_consumer_mode');
                } else if (r === 'buyer') {
                  sessionStorage.setItem('km_consumer_mode', 'b2b');
                }
              }}
            >
              <span>{roleIcon(r as Role)}</span>
              <b>{r === 'customer' ? 'Consumers' : roleLabel(r as Role)}</b>
              <small>{r === 'customer' ? 'Consumer & B2B Portal' : e.split('@')[0]}</small>
            </button>

          ))}

        </div>

      </div>

    </div>
  )
}
function roleIcon(r:Role){return ({farmer:'🌾',customer:'🛒',buyer:'📦',driver:'🚚',collection:'⌁',package:'▣',hub:'⌖',admin:'◈'} as any)[r]}
function roleLabel(r:Role){return ({farmer:'Farmer',customer:'Consumers (D2C & B2B)',buyer:'B2B Buyer',driver:'Driver',collection:'Collection',package:'Package Centre',hub:'City Hub',admin:'Control Tower'} as any)[r]}

function RoleApp({role,u}:{role:Role;u:any}){

  const nav = useNavigate();

  const [refresh,setRefresh] = useState(0);

  useEffect(() => {

    document.title =
      `Krishi Marg · ${roleLabel(role)}`;

  }, [role]);


  function signout(){

    logout();

    nav('/login');

  }


  if(role === 'farmer'){

    return (

      <FarmerDashboard
        user={u}
        signout={signout}
      />

    );

  }


  if(role === 'customer' || role === 'buyer')
    return (
      <ConsumerBuyerApp
        user={u}
        initialRole={role}
        refresh={refresh}
        bump={()=>setRefresh(x=>x+1)}
        signout={signout}
      />
    );


  if(role === 'driver')
    return (
      <DriverApp
        user={u}
        refresh={refresh}
        bump={()=>setRefresh(x=>x+1)}
        signout={signout}
      />
    );


  if(role === 'collection')
    return (
      <StationApp
        type="collection"
        user={u}
        refresh={refresh}
        bump={()=>setRefresh(x=>x+1)}
        signout={signout}
      />
    );


  if(role === 'package')
    return (
      <PackageCentreApp
        user={u}
        refresh={refresh}
        bump={()=>setRefresh(x=>x+1)}
        signout={signout}
      />
    );


  if(role === 'hub')
    return (
      <CityHubApp
        user={u}
        refresh={refresh}
        bump={()=>setRefresh(x=>x+1)}
        signout={signout}
      />
    );


  return (
    <AdminApp
      user={u}
      refresh={refresh}
      bump={()=>setRefresh(x=>x+1)}
      signout={signout}
    />
  );

}
function Top({title,subtitle,signout,children}:{title:string;subtitle?:string;signout:()=>void;children?:any}){
  return <header className="topbar"><div><div className="top-title">{title}</div>{subtitle&&<div className="top-sub">{subtitle}</div>}</div><div className="top-actions">{children}<button className="avatar" onClick={signout}>↪</button></div></header>
}
function Shell({children,navItems,active,signout,role,onSelect,customRoleLabel,customRoleIcon}:{children:any;navItems:{id:string,label:string,icon:string}[];active:string;signout:()=>void;role:string;onSelect?:(id:string)=>void;customRoleLabel?:string;customRoleIcon?:string}){
  const nav=useNavigate()
  return <div className={`app-shell role-${role}`}><aside className="sidebar"><div className="brand"><span className="brand-mark">KM</span><span>KRISHI <b>MARG</b></span></div><div className="role-chip">{customRoleIcon || roleIcon(role as Role)} {customRoleLabel || roleLabel(role as Role)}</div><nav>{navItems.map(n=><button key={n.id} className={active===n.id?'active':''} onClick={()=>onSelect ? onSelect(n.id) : nav(`/app/${n.id}`)}><span>{n.icon}</span>{n.label}</button>)}</nav><button className="side-exit" onClick={signout}>↪ Sign out</button></aside><main className="main">{children}</main></div>
}


function FarmerQR({code}:{code:string}){
 const [src,setSrc]=useState('')
 useEffect(()=>{QRCode.toDataURL(JSON.stringify({type:'FARMER',farmer_code:code}),{width:120,margin:1}).then(setSrc)},[code])
 return <div className="qr-wrap">{src?<img src={src} alt="Farmer internal QR"/>:<span>QR…</span>}<small>SCAN AT COLLECTION</small></div>
}

function FarmerApp({
  user: bUser,
  bump,
  signout
}: {
  user: any;
  refresh: number;
  bump: () => void;
  signout: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("home");

  const [form, setForm] = useState({
    crop: "Tomato",
    quantity: "120",
    grade: "A",
    price: "32"
  });

  useEffect(() => {
    api
      .get("/farmers/me")
      .then((r) => setData(r.data))
      .catch((e) => console.error("Farmer data error:", e));
  }, []);

  async function add() {
    try {
      await api.post("/farmers/produce", {
        crop: form.crop,
        quantity: +form.quantity,
        expected_grade: form.grade,
        harvest_date: new Date().toISOString(),
        available_date: new Date().toISOString(),
        location:
          data?.farmer?.location || "Hyderabad Rural",
        expected_price: +form.price
      });

      bump();
      setTab("home");

      alert(
        "Produce listed successfully — now visible to the matching engine."
      );
    } catch (error) {
      console.error(error);
      alert("Unable to list produce.");
    }
  }

  if (!data) {
    return (
      <div className="loading">
        Loading farmer workspace...
      </div>
    );
  }

  const totalAvailable = Math.round(
    (data.listings || []).reduce(
      (a: number, x: any) => a + Number(x.remaining_qty || 0),
      0
    )
  );

  const earnings = Math.round(
    Number(data?.farmer?.earnings || 0)
  );

  const firstName =
    bUser?.name?.split(" ")[0] || "Farmer";

  return (
    <Shell
      role="farmer"
      active={tab}
      signout={signout}
      navItems={[
        {
          id: "home",
          label: "Dashboard",
          icon: "⌂"
        },
        {
          id: "list",
          label: "List Produce",
          icon: "＋"
        },
        {
          id: "earnings",
          label: "Earnings",
          icon: "₹"
        }
      ]}
    >

      {/* ================================
          TOP BAR
      ================================= */}

      <Top
        title={`Good morning, ${firstName}`}
        subtitle="Your farm, produce and market opportunities"
        signout={signout}
      >
        <span className="demo-pill">
          FARMER PORTAL
        </span>
      </Top>


      {/* ================================
          DASHBOARD
      ================================= */}

      {tab === "home" && (

        <div className="farmer-pro-dashboard">

          {/* WELCOME BANNER */}

          <section className="farmer-hero">

            <div className="farmer-hero-content">

              <span className="farmer-eyebrow">
                KRISHI MARG • FARMER CONNECT
              </span>

              <h1>
                Good Morning, {firstName}! 🌱
              </h1>

              <p>
                Manage your harvest, discover market demand
                and track your produce from farm to market.
              </p>

              <div className="farmer-location">
                📍 {data?.farmer?.location || "Hyderabad Rural"}
              </div>

            </div>

            <div className="farmer-hero-art">
              🌾
            </div>

          </section>


          {/* KPI CARDS */}

          <div className="farmer-kpi-grid">

            <div className="farmer-kpi">

              <div className="farmer-kpi-icon">
                🌾
              </div>

              <div>
                <span>Available Today</span>
                <strong>{totalAvailable} kg</strong>
                <small>Produce ready for matching</small>
              </div>

            </div>


            <div className="farmer-kpi">

              <div className="farmer-kpi-icon">
                📈
              </div>

              <div>
                <span>Matched Demand</span>
                <strong>85 kg</strong>
                <small>Current market requirement</small>
              </div>

            </div>


            <div className="farmer-kpi">

              <div className="farmer-kpi-icon">
                ₹
              </div>

              <div>
                <span>Expected Earnings</span>
                <strong>
                  ₹{earnings.toLocaleString()}
                </strong>
                <small>Current farmer ledger</small>
              </div>

            </div>


            <div className="farmer-kpi">

              <div className="farmer-kpi-icon">
                📦
              </div>

              <div>
                <span>Active Listings</span>
                <strong>
                  {data.listings?.length || 0}
                </strong>
                <small>Currently matchable</small>
              </div>

            </div>

          </div>


          {/* TWO COLUMN AREA */}

          <div className="farmer-content-grid">

            {/* LEFT */}

            <div className="farmer-content-main">


              {/* UPCOMING HARVEST */}

              <section className="farmer-card">

                <div className="farmer-card-header">

                  <div>
                    <span className="farmer-card-label">
                      NEXT HARVEST
                    </span>

                    <h2>
                      Upcoming Harvest
                    </h2>

                    <p>
                      Your next expected produce
                    </p>
                  </div>

                  <span className="farmer-status success">
                    ON TRACK
                  </span>

                </div>


                <div className="harvest-feature">

                  <div className="harvest-crop">
                    🍅
                  </div>

                  <div className="harvest-main">

                    <div className="harvest-title">

                      <div>
                        <h3>Tomato</h3>
                        <span>
                          Hybrid • Grade A expected
                        </span>
                      </div>

                      <strong>
                        500 kg
                      </strong>

                    </div>


                    <div className="harvest-meta">

                      <div>
                        <small>Expected Date</small>
                        <b>18 days</b>
                      </div>

                      <div>
                        <small>Expected Price</small>
                        <b>₹28/kg</b>
                      </div>

                      <div>
                        <small>Market Demand</small>
                        <b className="green-text">
                          High
                        </b>
                      </div>

                    </div>


                    <div className="harvest-progress">

                      <div className="progress-heading">
                        <span>Crop readiness</span>
                        <b>72%</b>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-value"
                          style={{ width: "72%" }}
                        />
                      </div>

                    </div>

                  </div>

                </div>

              </section>


              {/* QUICK ACTIONS */}

              <section className="farmer-card">

                <div className="farmer-card-header">

                  <div>
                    <span className="farmer-card-label">
                      FARM SERVICES
                    </span>

                    <h2>
                      Quick Actions
                    </h2>

                    <p>
                      Frequently used farmer services
                    </p>
                  </div>

                </div>


                <div className="farmer-action-grid">

                  <button
                    className="farmer-action-card"
                    onClick={() => setTab("list")}
                  >

                    <div className="action-icon green">
                      🌾
                    </div>

                    <div>
                      <strong>
                        List Produce
                      </strong>

                      <span>
                        Book your expected harvest
                      </span>
                    </div>

                    <b>→</b>

                  </button>


                  <button className="farmer-action-card">

                    <div className="action-icon blue">
                      🌱
                    </div>

                    <div>
                      <strong>
                        Crop Advisory
                      </strong>

                      <span>
                        Get smart crop recommendations
                      </span>
                    </div>

                    <b>→</b>

                  </button>


                  <button className="farmer-action-card">

                    <div className="action-icon orange">
                      🏡
                    </div>

                    <div>
                      <strong>
                        My Farms
                      </strong>

                      <span>
                        Manage land and crop details
                      </span>
                    </div>

                    <b>→</b>

                  </button>


                  <button className="farmer-action-card">

                    <div className="action-icon purple">
                      📦
                    </div>

                    <div>
                      <strong>
                        Orders & Pickup
                      </strong>

                      <span>
                        Track your produce movement
                      </span>
                    </div>

                    <b>→</b>

                  </button>

                </div>

              </section>


              {/* ACTIVE PRODUCE */}

              <section className="farmer-card">

                <div className="farmer-card-header">

                  <div>
                    <span className="farmer-card-label">
                      YOUR PRODUCE
                    </span>

                    <h2>
                      Active Listings
                    </h2>

                    <p>
                      Produce currently available in the network
                    </p>
                  </div>

                  <button
                    className="farmer-outline-btn"
                    onClick={() => setTab("list")}
                  >
                    + Add Produce
                  </button>

                </div>


                <div className="farmer-produce-table">

                  <div className="produce-table-head">
                    <span>PRODUCE</span>
                    <span>QUANTITY</span>
                    <span>GRADE</span>
                    <span>STATUS</span>
                  </div>


                  {(data.listings || [])
                    .slice(0, 6)
                    .map((x: any) => (

                      <div
                        className="produce-table-row"
                        key={x.id}
                      >

                        <div className="produce-name">

                          <div className="produce-icon">
                            {x.crop_id === 1
                              ? "🍅"
                              : "🌾"}
                          </div>

                          <div>
                            <strong>
                              {x.crop_id === 1
                                ? "Tomato"
                                : "Produce Lot"}
                            </strong>

                            <small>
                              {x.location ||
                                "Farm Location"}
                            </small>
                          </div>

                        </div>


                        <strong>
                          {x.remaining_qty} kg
                        </strong>


                        <span
                          className={`farmer-grade grade-${x.grade}`}
                        >
                          Grade {x.grade}
                        </span>


                        <span className="farmer-match">
                          MATCHABLE
                        </span>

                      </div>

                    ))}

                </div>

              </section>


              {/* RECENT ACTIVITY */}

              <section className="farmer-card">

                <div className="farmer-card-header">

                  <div>
                    <span className="farmer-card-label">
                      ACTIVITY
                    </span>

                    <h2>
                      Recent Updates
                    </h2>
                  </div>

                </div>


                <div className="farmer-activity">

                  <div className="activity-row">

                    <div className="activity-circle">
                      ✓
                    </div>

                    <div>
                      <strong>
                        Tomato produce listing active
                      </strong>

                      <small>
                        Your produce is available to the
                        matching engine
                      </small>
                    </div>

                    <span>
                      Active
                    </span>

                  </div>


                  <div className="activity-row">

                    <div className="activity-circle">
                      🚚
                    </div>

                    <div>
                      <strong>
                        Pickup scheduled
                      </strong>

                      <small>
                        Tomorrow • 09:30 AM
                      </small>
                    </div>

                    <span>
                      Confirmed
                    </span>

                  </div>


                  <div className="activity-row">

                    <div className="activity-circle">
                      🌱
                    </div>

                    <div>
                      <strong>
                        Crop advisory available
                      </strong>

                      <small>
                        New recommendation for your crops
                      </small>
                    </div>

                    <span>
                      New
                    </span>

                  </div>

                </div>

              </section>

            </div>


            {/* RIGHT COLUMN */}

            <div className="farmer-content-side">


              {/* WEATHER */}

              <section className="farmer-card">

                <div className="farmer-card-header">

                  <div>
                    <span className="farmer-card-label">
                      WEATHER
                    </span>

                    <h2>
                      Farm Advisory
                    </h2>
                  </div>

                  <span className="weather-large">
                    ☀️
                  </span>

                </div>


                <div className="weather-temperature">
                  29°
                  <span>C</span>
                </div>

                <strong>
                  Partly Cloudy
                </strong>

                <small className="weather-location">
                  Hyderabad Region
                </small>


                <div className="weather-advisory">

                  <span>💧</span>

                  <div>
                    <strong>
                      Light rain expected
                    </strong>

                    <p>
                      Avoid irrigation for the
                      next 2 days.
                    </p>
                  </div>

                </div>

              </section>


              {/* FARM SUMMARY */}

              <section className="farmer-card">

                <div className="farmer-card-header">

                  <div>
                    <span className="farmer-card-label">
                      MY FARM
                    </span>

                    <h2>
                      Farm Summary
                    </h2>
                  </div>

                </div>


                <div className="farm-summary-grid">

                  <div>
                    <span>🌾</span>
                    <small>Land</small>
                    <strong>2.5 Acres</strong>
                  </div>

                  <div>
                    <span>🌱</span>
                    <small>Active Crops</small>
                    <strong>3</strong>
                  </div>

                  <div>
                    <span>💧</span>
                    <small>Water</small>
                    <strong>Reliable</strong>
                  </div>

                  <div>
                    <span>📍</span>
                    <small>Location</small>
                    <strong>
                      {data?.farmer?.location ||
                        "Rural"}
                    </strong>
                  </div>

                </div>

              </section>


              {/* MARKET */}

              <section className="farmer-market-card">

                <div className="market-icon">
                  ₹
                </div>

                <span>
                  CURRENT MARKET
                </span>

                <h2>
                  Tomato
                </h2>

                <strong>
                  ₹28/kg
                </strong>

                <p>
                  ↑ 8.4% from last week
                </p>

                <button>
                  View Market Demand →
                </button>

              </section>


              {/* QR */}

              <section className="farmer-card farmer-qr-card">

                <div>

                  <span className="farmer-card-label">
                    FARM ID
                  </span>

                  <h2>
                    {data?.farmer?.code}
                  </h2>

                  <p>
                    Scan this QR at the collection
                    centre for fast verification.
                  </p>

                </div>

                <FarmerQR
                  code={data?.farmer?.code}
                />

              </section>


              {/* SUPPORT */}

              <section className="farmer-support">

                <div>
                  <strong>
                    Need help?
                  </strong>

                  <p>
                    Get support for your farm and
                    orders.
                  </p>
                </div>

                <button>
                  Contact Support
                </button>

              </section>

            </div>

          </div>

        </div>
      )}


      {/* ================================
          LIST PRODUCE
      ================================= */}

      {tab === "list" && (

        <div className="farmer-form-page">

          <section className="farmer-form-card">

            <div className="form-page-header">

              <div>
                <span className="farmer-card-label">
                  HARVEST BOOKING
                </span>

                <h1>
                  List Available Produce
                </h1>

                <p>
                  Share your harvest with the
                  Krishi Marg demand network.
                </p>
              </div>

              <div className="form-page-icon">
                🌾
              </div>

            </div>


            <div className="farmer-form-grid">

              <label>
                Crop

                <select
                  value={form.crop}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      crop: e.target.value
                    })
                  }
                >
                  <option>Tomato</option>
                  <option>Onion</option>
                  <option>Potato</option>
                  <option>Chilli</option>
                  <option>Mango</option>
                  <option>Spinach</option>
                </select>

              </label>


              <label>
                Quantity (kg)

                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity: e.target.value
                    })
                  }
                />

              </label>


              <label>
                Expected Grade

                <select
                  value={form.grade}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grade: e.target.value
                    })
                  }
                >
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                </select>

              </label>


              <label>
                Expected Price / kg

                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value
                    })
                  }
                />

              </label>

            </div>


            <div className="listing-preview">

              <span>LISTING PREVIEW</span>

              <div>

                <strong>
                  {form.crop}
                </strong>

                <b>
                  {form.quantity} kg
                </b>

                <span>
                  Grade {form.grade}
                </span>

                <span>
                  ₹{form.price}/kg
                </span>

              </div>

            </div>


            <div className="form-actions">

              <button
                className="farmer-cancel-btn"
                onClick={() => setTab("home")}
              >
                Cancel
              </button>

              <button
                className="farmer-primary-btn"
                onClick={add}
              >
                Publish Produce →
              </button>

            </div>

          </section>

        </div>
      )}


      {/* ================================
          EARNINGS
      ================================= */}

      {tab === "earnings" && (

        <div className="farmer-earnings-page">

          <section className="earnings-main-card">

            <span>
              NET EARNINGS
            </span>

            <strong>
              ₹{earnings.toLocaleString()}
            </strong>

            <p>
              Current farmer ledger
            </p>

          </section>


          <div className="earnings-grid">

            <div>
              <span>Produce Value</span>
              <strong>₹5,120</strong>
            </div>

            <div>
              <span>Handling Deductions</span>
              <strong>− ₹220</strong>
            </div>

            <div>
              <span>Logistics</span>
              <strong>− ₹420</strong>
            </div>

            <div>
              <span>Net Earnings</span>
              <strong>
                ₹4,480
              </strong>
            </div>

          </div>


          <section className="farmer-card">

            <div className="farmer-card-header">

              <div>
                <span className="farmer-card-label">
                  PAYMENT HISTORY
                </span>

                <h2>
                  Recent Transactions
                </h2>
              </div>

            </div>

            <div className="payment-row">
              <span>Tomato • TOM-001</span>
              <b>+ ₹2,800</b>
              <small>Completed</small>
            </div>

            <div className="payment-row">
              <span>Tomato • TOM-002</span>
              <b>+ ₹1,680</b>
              <small>Processing</small>
            </div>

          </section>

        </div>
      )}

    </Shell>
  );
}

function ConsumerBuyerApp({
  user: bUser,
  initialRole = 'customer',
  refresh,
  bump,
  signout
}: {
  user: any;
  initialRole?: Role;
  refresh: number;
  bump: () => void;
  signout: () => void;
}) {
  // Mode selection: 'consumer' (Retail D2C) or 'b2b' (Wholesale Procurement)
  const [mode, setMode] = useState<'consumer' | 'b2b'>(() => {
    const saved = sessionStorage.getItem('km_consumer_mode');
    if (saved === 'consumer' || saved === 'b2b') return saved;
    return initialRole === 'buyer' ? 'b2b' : 'consumer';
  });

  const [showModeModal, setShowModeModal] = useState<boolean>(() => {
    // Show modal if user arrived without an explicit saved preference
    return !sessionStorage.getItem('km_consumer_mode');
  });

  // Active sub-tab based on current mode
  const [tab, setTab] = useState<string>(() => (mode === 'consumer' ? 'shop' : 'procurement'));

  // Switch mode handler
  function switchMode(newMode: 'consumer' | 'b2b') {
    setMode(newMode);
    sessionStorage.setItem('km_consumer_mode', newMode);
    setShowModeModal(false);
    setTab(newMode === 'consumer' ? 'shop' : 'procurement');
  }

  /* ----------------------------------------------------
     CONSUMER (D2C) STATE & APIS
     ---------------------------------------------------- */
  const [produce, setProduce] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [crop, setCrop] = useState('Tomato');
  const [qty, setQty] = useState('25');
  const [address, setAddress] = useState('Banjara Hills, Hyderabad');
  const [deliveryWindow, setDeliveryWindow] = useState('Tomorrow Morning (8:00 AM – 11:00 AM)');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'veg' | 'greens' | 'roots' | 'discount'>('all');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [consumerPhase, setConsumerPhase] = useState<'preorder' | 'instant'>('preorder');
  const [perimeterFilter, setPerimeterFilter] = useState<number>(35);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('FARM-01');
  const [selectedArrivalSlot, setSelectedArrivalSlot] = useState<string>('Tomorrow Evening (5:00 PM – 8:00 PM)');
  const [preorderKg, setPreorderKg] = useState<string>('25');
  const [preorderSuccessAlert, setPreorderSuccessAlert] = useState<string>('');
  const [instantPackSize, setInstantPackSize] = useState<Record<string, number>>({});
  const [instantPackQty, setInstantPackQty] = useState<Record<string, number>>({});
  const [instantSuccessAlert, setInstantSuccessAlert] = useState<string>('');

  /* ----------------------------------------------------
     B2B (WHOLESALE) STATE & APIS
     ---------------------------------------------------- */
  const [b2bCrop, setB2bCrop] = useState('Tomato');
  const [b2bQty, setB2bQty] = useState('1000');
  const [b2bGrade, setB2bGrade] = useState('A/B');
  const [b2bDest, setB2bDest] = useState('Hyderabad Central Wholesale Hub');
  const [b2bCadence, setB2bCadence] = useState('Mon · Wed · Fri Scheduled');
  const [b2bRequirements, setB2bRequirements] = useState<any[]>([]);
  const [b2bPublishing, setB2bPublishing] = useState(false);
  const [b2bSaved, setB2bSaved] = useState(false);

  // Load data from backend on mount and whenever refresh/bump changes
  useEffect(() => {
    // 1. Fetch public produce catalog
    api.get('/produce')
      .then(r => setProduce(r.data))
      .catch(err => console.error("Produce fetch failed:", err));

    // 2. Fetch consumer orders
    api.get('/orders')
      .then(r => setOrders(r.data))
      .catch(err => console.error("Orders fetch failed:", err));

    // 3. Fetch shipments for tracking
    api.get('/shipments')
      .then(r => {
        if (r.data && r.data.length > 0) {
          setShipment(r.data[0]);
        }
      })
      .catch(err => console.error("Shipments fetch failed:", err));

    // 4. Fetch B2B buyer requirements
    api.get('/buyer/requirements')
      .then(r => setB2bRequirements(r.data))
      .catch(err => console.error("Buyer requirements fetch failed:", err));
  }, [bump, refresh]);

  /* ----------------------------------------------------
     CONSUMER ORDER ACTION
     ---------------------------------------------------- */
  async function placeOrder() {
    if (+qty <= 0) {
      alert("Please specify a valid produce quantity in kg.");
      return;
    }
    setPlacingOrder(true);
    try {
      await api.post('/orders', {
        crop,
        quantity: +qty,
        grade_preference: crop.includes('Discount') ? 'B' : 'A/B',
        destination: address,
        delivery_window: deliveryWindow
      });
      alert(`Order placed successfully for ${qty} kg ${crop}! It has entered the demand aggregation pipeline.`);
      bump();
      setTab('orders');
    } catch (err: any) {
      console.error(err);
      alert("Unable to place order: " + (err?.response?.data?.detail || err.message));
    } finally {
      setPlacingOrder(false);
    }
  }

  /* ----------------------------------------------------
     PHASE A: FARM PRE-ORDER ACTION
     ---------------------------------------------------- */
  async function placeFarmPreorder(farm: any) {
    if (+preorderKg <= 0) {
      alert("Please specify a valid produce quantity in kg (minimum 5 kg).");
      return;
    }
    setPlacingOrder(true);
    try {
      await api.post('/orders', {
        crop: farm.crop,
        quantity: +preorderKg,
        grade_preference: farm.grade.includes('B') ? 'A/B' : 'A',
        destination: address,
        delivery_window: selectedArrivalSlot
      });
      const alertMsg = `Farm Pre-Order registered for ${preorderKg} kg ${farm.crop} from ${farm.farmerName} (${farm.distanceKm} km)! Scheduled Arrival: ${selectedArrivalSlot}. All Collection Centres (CC) and Package Centres (PC) across the perimeter have been notified on the platform for harvest aggregation.`;
      setPreorderSuccessAlert(alertMsg);
      alert(alertMsg);
      bump();
      api.get('/orders').then(r => setOrders(r.data)).catch(() => {});
    } catch (err: any) {
      console.error(err);
      alert("Unable to place pre-order: " + (err?.response?.data?.detail || err.message));
    } finally {
      setPlacingOrder(false);
    }
  }

  /* ----------------------------------------------------
     PHASE B: INSTANT EXPRESS ORDER ACTION (2kg / 5kg packs)
     ---------------------------------------------------- */
  async function placeInstantOrder(item: any) {
    const packSize = instantPackSize[item.id] || 2;
    const packCount = instantPackQty[item.id] || 1;
    const totalKg = packSize * packCount;
    if (totalKg < 2) {
      alert("Minimum order quantity for Instant Express is 2 kg.");
      return;
    }
    setPlacingOrder(true);
    try {
      await api.post('/orders', {
        crop: item.crop,
        quantity: totalKg,
        grade_preference: item.isGradeB ? 'B' : 'A',
        destination: address,
        delivery_window: `Instant Express (${item.deliveryEta})`
      });
      const surchargeNote = item.stockStatus === 'nearby' ? ' (+₹40 cross-hub distance surcharge applied, routed from Nearby Hub #02)' : '';
      const alertMsg = `Instant Express order placed for ${totalKg} kg ${item.crop} (${packCount} × ${packSize}kg pack)! Delivery fee: ₹${item.deliveryFee}${surchargeNote}. Estimated arrival: ${item.deliveryEta}.`;
      setInstantSuccessAlert(alertMsg);
      alert(alertMsg);
      bump();
      api.get('/orders').then(r => setOrders(r.data)).catch(() => {});
    } catch (err: any) {
      console.error(err);
      alert("Unable to place instant order: " + (err?.response?.data?.detail || err.message));
    } finally {
      setPlacingOrder(false);
    }
  }

  // Phase A: Farmer Offerings within Perimeter & Arrival Dates Schedule
  const farmPerimeterOfferings = [
    {
      id: 'FARM-01',
      farmerName: 'M. Rajesh Reddy',
      farmLocation: 'Shamshabad Village Cluster, Ranga Reddy',
      distanceKm: 12,
      crop: 'Tomato (Roma Hybrid)',
      expectedHarvest: 'Tomorrow (Sep 9, 06:00 AM)',
      harvestVolumeKg: 450,
      grade: 'Grade A / Grade B Inspected',
      basePrice: 28,
      soil: 'Red Sandy Loam · Drip Irrigated',
      arrivalOptions: [
        { label: 'Same Day Evening Express', time: 'Tomorrow Evening (5:00 PM – 8:00 PM)', etaDesc: 'Direct from CC #02 cold transit' },
        { label: 'Next Day Morning Fresh', time: 'Day After Tomorrow (8:00 AM – 11:00 AM)', etaDesc: 'Packhouse chilled overnight (4°C)' },
        { label: 'Weekend Batch Delivery', time: 'Saturday Morning (8:00 AM – 12:00 PM)', etaDesc: 'Consolidated green corridor dispatch' }
      ]
    },
    {
      id: 'FARM-02',
      farmerName: 'K. Venkatamma',
      farmLocation: 'Chevella Organic Orchards',
      distanceKm: 18,
      crop: 'Onion (Nasik Red)',
      expectedHarvest: 'In 2 Days (Sep 10, 07:00 AM)',
      harvestVolumeKg: 600,
      grade: 'Grade A Premium',
      basePrice: 34,
      soil: 'Black Cotton Soil · Solar Sprinkler',
      arrivalOptions: [
        { label: 'Sep 10 Evening Dispatch', time: 'Sep 10 Evening (5:00 PM – 8:00 PM)', etaDesc: 'Direct farm lot aggregation' },
        { label: 'Sep 11 Morning Delivery', time: 'Sep 11 Morning (8:00 AM – 11:00 AM)', etaDesc: 'City Hub early bird slot' }
      ]
    },
    {
      id: 'FARM-03',
      farmerName: 'B. Narayana',
      farmLocation: 'Medchal Green Valley Farms',
      distanceKm: 22,
      crop: 'Potato (Kufri Jyoti)',
      expectedHarvest: 'In 3 Days (Sep 11, 06:30 AM)',
      harvestVolumeKg: 800,
      grade: 'Grade A Table Quality',
      basePrice: 25,
      soil: 'Alluvial Sandy Clay · Borewell Micro-jet',
      arrivalOptions: [
        { label: 'Sep 11 Evening Doorstep', time: 'Sep 11 Evening (4:00 PM – 7:00 PM)', etaDesc: 'Reefer vehicle cold transit' },
        { label: 'Sep 12 Morning Batch', time: 'Sep 12 Morning (8:00 AM – 11:00 AM)', etaDesc: 'Consolidated neighborhood drop' }
      ]
    },
    {
      id: 'FARM-04',
      farmerName: 'S. Ramulu',
      farmLocation: 'Ibrahimpatnam Horticulture Belt',
      distanceKm: 26,
      crop: 'Green Chilli (G-4 Spicy)',
      expectedHarvest: 'In 2 Days (Sep 10, 08:00 AM)',
      harvestVolumeKg: 320,
      grade: 'Grade A Export Spec',
      basePrice: 42,
      soil: 'Red Laterite · Polyhouse Drip',
      arrivalOptions: [
        { label: 'Sep 10 Evening Fresh', time: 'Sep 10 Evening (5:00 PM – 8:00 PM)', etaDesc: 'Harvest to doorstep in 9 hours' },
        { label: 'Sep 11 Morning Fresh', time: 'Sep 11 Morning (8:00 AM – 11:00 AM)', etaDesc: 'Post precooling delivery' }
      ]
    },
    {
      id: 'FARM-05',
      farmerName: 'G. Suresh',
      farmLocation: 'Gajwel Agro Park Belt',
      distanceKm: 34,
      crop: 'Carrot (Kuroda Fresh)',
      expectedHarvest: 'In 4 Days (Sep 12, 06:00 AM)',
      harvestVolumeKg: 500,
      grade: 'Grade A Deep Orange',
      basePrice: 38,
      soil: 'Rich Loam · Hydroponic Mist',
      arrivalOptions: [
        { label: 'Sep 12 Evening Slot', time: 'Sep 12 Evening (5:00 PM – 8:00 PM)', etaDesc: 'Direct farm dispatch' },
        { label: 'Sep 13 Morning Slot', time: 'Sep 13 Morning (8:00 AM – 11:00 AM)', etaDesc: 'Packhouse sorted & cleaned' }
      ]
    }
  ];

  // Phase B: Instant Express Catalog (2kg and 5kg packs, Grade A and Grade B 25% Off)
  const instantProduceCatalog = [
    {
      id: 'INST-01',
      crop: 'Tomato (Grade A Premium)',
      emoji: '🍅',
      grade: 'Grade A',
      isGradeB: false,
      pricePerKg: 32,
      stockStatus: 'local',
      hubName: 'Bowenpally Central Hub #01 (Local · 4.2 km)',
      deliveryFee: 25,
      deliveryEta: '30–40 mins',
      packs: [2, 5],
      stockKg: 96,
      desc: '100% field-firm, hand-graded, pre-cooled to 6.4°C'
    },
    {
      id: 'INST-02',
      crop: 'Tomato (Grade B Value Corner · 25% Off)',
      emoji: '🍅',
      grade: 'Grade B (Discount)',
      isGradeB: true,
      discountPercent: 25,
      pricePerKg: 24,
      originalPrice: 32,
      stockStatus: 'local',
      hubName: 'Bowenpally Central Hub #01 (Local · 4.2 km)',
      deliveryFee: 25,
      deliveryEta: '30–40 mins',
      packs: [2, 5],
      stockKg: 60,
      desc: 'Minor cosmetic sun-scald or size variation · 100% safe & fresh for daily cooking'
    },
    {
      id: 'INST-03',
      crop: 'Onion (Grade A Premium)',
      emoji: '🧅',
      grade: 'Grade A',
      isGradeB: false,
      pricePerKg: 38,
      stockStatus: 'local',
      hubName: 'Bowenpally Central Hub #01 (Local · 4.2 km)',
      deliveryFee: 25,
      deliveryEta: '30–40 mins',
      packs: [2, 5],
      stockKg: 104,
      desc: 'Firm dry outer scales, robust pungency and uniform diameter'
    },
    {
      id: 'INST-04',
      crop: 'Onion (Grade B Value Corner · 25% Off)',
      emoji: '🧅',
      grade: 'Grade B (Discount)',
      isGradeB: true,
      discountPercent: 26,
      pricePerKg: 28,
      originalPrice: 38,
      stockStatus: 'local',
      hubName: 'Bowenpally Central Hub #01 (Local · 4.2 km)',
      deliveryFee: 25,
      deliveryEta: '30–40 mins',
      packs: [2, 5],
      stockKg: 60,
      desc: 'Irregular scale shape, field pungent & ideal for gravies and curries'
    },
    {
      id: 'INST-05',
      crop: 'Potato (Grade A Premium)',
      emoji: '🥔',
      grade: 'Grade A',
      isGradeB: false,
      pricePerKg: 28,
      stockStatus: 'local',
      hubName: 'Bowenpally Central Hub #01 (Local · 4.2 km)',
      deliveryFee: 25,
      deliveryEta: '30–40 mins',
      packs: [2, 5],
      stockKg: 110,
      desc: 'Smooth skin, zero sprouting or internal browning, cold-cured'
    },
    {
      id: 'INST-06',
      crop: 'Potato (Grade B Value Corner · 25% Off)',
      emoji: '🥔',
      grade: 'Grade B (Discount)',
      isGradeB: true,
      discountPercent: 25,
      pricePerKg: 21,
      originalPrice: 28,
      stockStatus: 'local',
      hubName: 'Bowenpally Central Hub #01 (Local · 4.2 km)',
      deliveryFee: 25,
      deliveryEta: '30–40 mins',
      packs: [2, 5],
      stockKg: 55,
      desc: 'Minor skin netting, zero solanine greening, great for boiling & fries'
    },
    {
      id: 'INST-07',
      crop: 'Capsicum (Green Bell Pepper)',
      emoji: '🫑',
      grade: 'Grade A',
      isGradeB: false,
      pricePerKg: 45,
      stockStatus: 'nearby',
      hubName: 'Gaddiannaram South Hub #02 (14 km away)',
      deliveryFee: 65,
      deliveryEta: '55–70 mins',
      packs: [2, 5],
      stockKg: 80,
      desc: 'Local Bowenpally stockout: routed from Gaddiannaram South Hub #02 with distance surcharge'
    },
    {
      id: 'INST-08',
      crop: 'Exotic Broccoli (Green Crown)',
      emoji: '🥦',
      grade: 'Grade A Premium',
      isGradeB: false,
      pricePerKg: 75,
      stockStatus: 'none',
      hubName: 'Zero Stock Across All City Hubs',
      deliveryFee: 0,
      deliveryEta: 'Unavailable',
      packs: [2, 5],
      stockKg: 0,
      desc: 'Exhausted across all Hyderabad regional hubs. Use Pre-Order to reserve from next harvest.'
    }
  ];

  /* ----------------------------------------------------
     B2B REQUIREMENT ACTION
     ---------------------------------------------------- */
  async function publishRequirement() {
    if (+b2bQty <= 0) {
      alert("Please specify a valid weekly bulk quantity.");
      return;
    }
    setB2bPublishing(true);
    try {
      await api.post('/buyer/requirements', {
        crop: b2bCrop,
        quantity: +b2bQty,
        grade: b2bGrade,
        destination: b2bDest,
        cadence: b2bCadence
      });
      setB2bSaved(true);
      alert(`Requirement published! ${b2bQty} kg/week ${b2bCrop} registered for multi-farm aggregation.`);
      bump();
      api.get('/buyer/requirements').then(r => setB2bRequirements(r.data)).catch(() => {});
      setTab('b2b_orders');
    } catch (err: any) {
      console.error(err);
      alert("Unable to publish requirement: " + (err?.response?.data?.detail || err.message));
    } finally {
      setB2bPublishing(false);
    }
  }

  // Package Centre Graded Discount Produce (Grade B - 25% Off)
  const discountedProduceItems = [
    { id: 901, crop: 'Tomato (Grade B Discount)', base_price: 22, unit: 'kg', isDiscounted: true, originalPrice: 30, discountPercent: 27, reason: 'Minor skin blemish, 100% firm & field-fresh' },
    { id: 902, crop: 'Onion (Grade B Discount)', base_price: 28, unit: 'kg', isDiscounted: true, originalPrice: 38, discountPercent: 26, reason: 'Uneven outer scale sizing, pungent & edible' },
    { id: 903, crop: 'Potato (Grade B Discount)', base_price: 20, unit: 'kg', isDiscounted: true, originalPrice: 28, discountPercent: 28, reason: 'Slight skin netting, zero internal greening' }
  ];

  const allAvailableCatalog = [...produce, ...discountedProduceItems];

  // Calculate pricing for consumer order drawer
  const selectedProduceObj = allAvailableCatalog.find(p => p.crop.toLowerCase() === crop.toLowerCase()) || { base_price: 32 };
  const basePrice = selectedProduceObj.base_price || 32;
  const produceCost = basePrice * (+qty || 0);
  const coldChainFee = Math.round(150 + ((+qty || 0) * 0.9));
  const totalConsumerEstimate = produceCost + coldChainFee;

  // Filtered produce items including Package Centre discounted harvest
  const listToFilter = category === 'discount'
    ? discountedProduceItems
    : [...produce, ...(category === 'all' ? discountedProduceItems : [])];

  const filteredProduce = listToFilter.filter((p: any) => {
    const matchesSearch = p.crop.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (category === 'all' || category === 'discount') return true;
    if (category === 'greens') return p.crop.includes('Spinach') || p.crop.includes('Coriander');
    if (category === 'roots') return p.crop.includes('Potato') || p.crop.includes('Onion');
    if (category === 'veg') return p.crop.includes('Tomato') || p.crop.includes('Chilli');
    return true;
  });

  // Calculate B2B bulk estimate
  const wholesaleRatePerKg = Math.max(18, Math.round(basePrice * 0.82)); // ~18% bulk wholesale discount
  const weeklyB2BTotal = wholesaleRatePerKg * (+b2bQty || 0);

  // Navigation Items per Mode
  const navItems = mode === 'consumer'
    ? [
        { id: 'shop', label: 'Fresh Market', icon: '⌂' },
        { id: 'orders', label: 'My Orders', icon: '▤' },
        { id: 'track', label: 'Cold-Chain Track', icon: '⌁' }
      ]
    : [
        { id: 'procurement', label: 'Procurement Desk', icon: '▤' },
        { id: 'suppliers', label: 'Supply Feasibility', icon: '◫' },
        { id: 'b2b_orders', label: 'Active Contracts', icon: '📋' }
      ];

  return (
    <Shell
      role={mode === 'consumer' ? 'customer' : 'buyer'}
      active={tab}
      signout={signout}
      onSelect={(id) => setTab(id)}
      customRoleLabel={mode === 'consumer' ? 'Retail Consumer (D2C)' : 'B2B Wholesale Buyer'}
      customRoleIcon={mode === 'consumer' ? '🛒' : '🏢'}
      navItems={navItems}
    >
      {/* =========================================================
          TOP BAR WITH MODE SWITCHER TOGGLE
          ========================================================= */}
      <Top
        title={mode === 'consumer' ? 'Fresh Produce Market' : 'B2B Wholesale Procurement Desk'}
        subtitle={
          mode === 'consumer'
            ? 'Farm-to-doorstep produce with active cold-chain tracking'
            : 'Predictable bulk sourcing, farm lot aggregation & weekly schedules'
        }
        signout={signout}
      >
        {/* MODE TOGGLE PILLS IN HEADER */}
        <div className="portal-mode-toggle-bar">
          <button
            type="button"
            className={`portal-toggle-pill ${mode === 'consumer' ? 'active' : ''}`}
            onClick={() => switchMode('consumer')}
            title="Switch to Direct Consumer Retail Mode"
          >
            <span>🛒</span> Consumer (D2C)
          </button>
          <button
            type="button"
            className={`portal-toggle-pill ${mode === 'b2b' ? 'active' : ''}`}
            onClick={() => switchMode('b2b')}
            title="Switch to B2B Wholesale Buyer Mode"
          >
            <span>🏢</span> B2B Buyer
          </button>
        </div>

        <button
          type="button"
          className="portal-switch-prompt-btn"
          onClick={() => setShowModeModal(true)}
          title="Open Portal Selection Dialog"
        >
          ⇄ Select Portal
        </button>

        {mode === 'consumer' && (
          <button className="cart-btn" onClick={() => setTab('shop')}>
            🛒 Cart · {qty} kg (₹{totalConsumerEstimate.toLocaleString()})
          </button>
        )}
      </Top>

      {/* =========================================================
          MODE SELECTION MODAL
          ========================================================= */}
      {showModeModal && (
        <div className="portal-mode-modal-overlay">
          <div className="portal-mode-modal">
            {sessionStorage.getItem('km_consumer_mode') && (
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setShowModeModal(false)}
              >
                ✕
              </button>
            )}

            <div className="portal-modal-header">
              <span className="modal-kicker">KRISHI MARG DEMAND PLATFORM • SIH26033</span>
              <h2>Select Your Operating Mode</h2>
              <p>
                Choose how you want to procure fresh produce from local farm networks.
                You can toggle between these modes at any time with one click.
              </p>
            </div>

            <div className="portal-mode-cards-grid">
              {/* CONSUMER CARD */}
              <div
                className={`portal-mode-card ${mode === 'consumer' ? 'selected' : ''}`}
                onClick={() => switchMode('consumer')}
              >
                <div className="mode-card-icon-wrap consumer-color">
                  <span>🛒</span>
                </div>
                <span className="mode-card-badge">RETAIL & HOUSEHOLD</span>
                <h3>Consumer (D2C)</h3>
                <p>Order daily fresh farm produce directly with temperature-controlled doorstep delivery.</p>

                <ul className="mode-card-bullets">
                  <li>✓ Daily harvest catalog inspected for Grade A/B quality</li>
                  <li>✓ Live GPS vehicle telemetry and cold-chain temperature monitoring</li>
                  <li>✓ Flexible delivery windows (Morning 8–11 AM or Evening 5–8 PM)</li>
                  <li>✓ Zero artificial markups from traditional mandi commission agents</li>
                </ul>

                <button
                  type="button"
                  className="primary-btn wide mode-enter-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    switchMode('consumer');
                  }}
                >
                  Enter as Retail Consumer →
                </button>
              </div>

              {/* B2B BUYER CARD */}
              <div
                className={`portal-mode-card ${mode === 'b2b' ? 'selected' : ''}`}
                onClick={() => switchMode('b2b')}
              >
                <div className="mode-card-icon-wrap b2b-color">
                  <span>🏢</span>
                </div>
                <span className="mode-card-badge b2b-badge">COMMERCIAL & WHOLESALE</span>
                <h3>B2B Wholesale Buyer</h3>
                <p>Source multi-ton commodity requirements with scheduled cadence and farm feasibility matching.</p>

                <ul className="mode-card-bullets">
                  <li>✓ Multi-farm demand aggregation into unified refrigerated vehicles</li>
                  <li>✓ Scheduled delivery cadences (e.g. Mon / Wed / Fri bulk dispatches)</li>
                  <li>✓ Direct farm cluster feasibility matching within 30km radius</li>
                  <li>✓ 12%–18% bulk savings through consolidated logistics contracts</li>
                </ul>

                <button
                  type="button"
                  className="primary-btn wide mode-enter-btn b2b-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    switchMode('b2b');
                  }}
                >
                  Enter as B2B Wholesale Buyer →
                </button>
              </div>
            </div>

            <div className="portal-modal-footer">
              <small>
                💡 All transactions, logistics handoffs, and quality grade inspections are synchronized live with the Krishi Marg backend.
              </small>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          CONSUMER VIEWS
          ========================================================= */}
      {mode === 'consumer' && (
        <>
          {/* =========================================================
              TAB: FRESH MARKET WITH TWO-PHASE ARCHITECTURE
              ========================================================= */}
          {tab === 'shop' && (
            <div className="market" style={{ display: 'block', maxWidth: 1240, margin: '0 auto' }}>
              
              {/* Header Title & Intro */}
              <div className="market-intro" style={{ marginBottom: 20 }}>
                <div>
                  <span className="tiny-label">TELANGANA AGRI-LOGISTICS NETWORK · HYDERABAD CORRIDOR</span>
                  <h1>Consumer Fresh Produce Gateway</h1>
                  <p>
                    Choose between <b>Phase A: Farm-Direct Pre-Orders</b> (reserve upcoming harvests directly from farmers in your perimeter) or <b>Phase B: Instant Express Booking</b> (2kg & 5kg sealed packs from City Hub reserve with multi-hub stock fallback).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    className="outline-btn"
                    onClick={() => {
                      api.get('/orders').then(r => setOrders(r.data)).catch(() => {});
                      bump();
                    }}
                  >
                    ↻ Refresh Network
                  </button>
                  <button className="cart-btn" onClick={() => setTab('orders')}>
                    📦 Active Orders ({orders.length})
                  </button>
                </div>
              </div>

              {/* LIVE VEHICLE ASSIGNED NOTIFICATION BANNER */}
              {(() => {
                const assigned = orders.find(o => o.status === 'MATCHED' || o.status === 'VEHICLE_ASSIGNED' || o.status === 'IN_TRANSIT') || {
                  id: 101,
                  crop: 'Tomato (Roma Hybrid)',
                  quantity: 4,
                  plate: 'TS-09-UB-4412 (Electric Reefer Van)',
                  driver: 'Mahesh Rao (+91 98492 55102)',
                  eta: '~32 mins',
                  temp: '4.2°C'
                };
                return (
                  <div className="notification-banner-live">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 26 }}>🚚</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <b style={{ fontSize: 15, letterSpacing: '0.02em' }}>VEHICLE ASSIGNED TO YOUR ORDER #{assigned.id}!</b>
                          <span style={{ background: '#22c55e', color: '#ffffff', fontSize: 10.5, fontWeight: 900, padding: '2px 7px', borderRadius: 4 }}>
                            LIVE TELEMETRY
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.95 }}>
                          Vehicle <b>{assigned.plate}</b> (Driver: <b>{assigned.driver}</b>) has been assigned for your <b>{assigned.quantity} kg {assigned.crop}</b> delivery. Estimated Arrival: <b>{assigned.eta}</b> · Reefer Temp: <b>{assigned.temp}</b>.
                        </p>
                      </div>
                    </div>
                    <button
                      className="primary-btn small"
                      style={{ background: '#ffffff', color: '#0369a1', fontWeight: 800, border: 'none', padding: '8px 14px' }}
                      onClick={() => setTab('track')}
                    >
                      Track Route ⌁
                    </button>
                  </div>
                );
              })()}

              {/* SUCCESS ALERTS */}
              {preorderSuccessAlert && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ color: '#15803d', fontSize: 14 }}>✓ Farm Pre-Order Registered Successfully!</b>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#275239' }}>{preorderSuccessAlert}</p>
                  </div>
                  <button onClick={() => setPreorderSuccessAlert('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              )}

              {instantSuccessAlert && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ color: '#15803d', fontSize: 14 }}>⚡ Instant Express Order Confirmed!</b>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#275239' }}>{instantSuccessAlert}</p>
                  </div>
                  <button onClick={() => setInstantSuccessAlert('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              )}

              {/* =========================================================
                  TWO-PHASE SWITCHER NAV
                  ========================================================= */}
              <div className="phase-switcher-nav">
                <button
                  type="button"
                  className={`phase-tab-btn ${consumerPhase === 'preorder' ? 'active' : ''}`}
                  onClick={() => setConsumerPhase('preorder')}
                >
                  <span style={{ fontSize: 18 }}>📅</span>
                  <span>Phase A: Farm Pre-Orders (Within Perimeter & Harvest Schedule)</span>
                  <span className="badge-pill">FARM DIRECT</span>
                </button>
                <button
                  type="button"
                  className={`phase-tab-btn ${consumerPhase === 'instant' ? 'active' : ''}`}
                  onClick={() => setConsumerPhase('instant')}
                >
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <span>Phase B: Instant Express Booking (2kg & 5kg Packs · Multi-Hub Fallback)</span>
                  <span className="badge-pill">SAME DAY EXPRESS</span>
                </button>
              </div>

              {/* =========================================================
                  PHASE A: FARM PRE-ORDERS VIEW
                  ========================================================= */}
              {consumerPhase === 'preorder' && (
                <div>
                  {/* Perimeter Filter Bar */}
                  <div className="perimeter-filter-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#072618' }}>📍 Farm Perimeter Filter:</span>
                      {[
                        { km: 15, label: 'Within 15 km' },
                        { km: 25, label: 'Within 25 km' },
                        { km: 35, label: 'Within 35 km' },
                        { km: 50, label: 'All Regional (50 km)' }
                      ].map(p => (
                        <button
                          key={p.km}
                          type="button"
                          className={`category-chip ${perimeterFilter === p.km ? 'active' : ''}`}
                          onClick={() => setPerimeterFilter(p.km)}
                          style={{ margin: 0 }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="arrival-date-badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                        📡 AUTOMATIC CC & PC NOTIFICATION ENABLED
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#f8faf9', border: '1px solid #dce4dd', borderRadius: 12, padding: '12px 18px', marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: 12.5, color: '#3f5647', lineHeight: 1.5 }}>
                      💡 <b>How Pre-Orders Work:</b> Reserve fresh farm produce before it is harvested. Select your preferred expected arrival date based on the farmer's harvest schedule. Once confirmed, <b>all Collection Centres (CC) and Package Centres (PC) across the perimeter are immediately notified on the platform</b> to aggregate the harvest into temperature-controlled corridors.
                    </p>
                  </div>

                  {/* Destination Address Input */}
                  <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#66776b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Delivery Destination Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="searchbox"
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                        placeholder="Enter your delivery address in Hyderabad..."
                      />
                    </div>
                    <div style={{ width: 220 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#66776b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Pre-Order Quantity (kg)
                      </label>
                      <div className="stepper-wrap" style={{ height: 38 }}>
                        <button type="button" className="stepper-btn" onClick={() => setPreorderKg(q => String(Math.max(5, +q - 5)))}>−</button>
                        <input type="number" min="5" value={preorderKg} onChange={e => setPreorderKg(e.target.value)} className="stepper-input" style={{ width: 60 }} />
                        <button type="button" className="stepper-btn" onClick={() => setPreorderKg(q => String(+q + 5))}>+</button>
                      </div>
                    </div>
                  </div>

                  {/* Farmers within Perimeter Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))', gap: 20, marginBottom: 24 }}>
                    {farmPerimeterOfferings
                      .filter(f => f.distanceKm <= perimeterFilter)
                      .map(farm => {
                        const isSelectedFarm = selectedFarmerId === farm.id;
                        const farmTotalCost = farm.basePrice * (+preorderKg || 0);
                        const coldTransitFee = Math.round(100 + (+preorderKg || 0) * 0.8);
                        const totalPreorderEstimate = farmTotalCost + coldTransitFee;

                        return (
                          <div
                            key={farm.id}
                            className="farmer-perimeter-card"
                            style={{ borderColor: isSelectedFarm ? '#15803d' : '#dce5dd', boxShadow: isSelectedFarm ? '0 0 0 2px rgba(21, 128, 61, 0.25)' : undefined }}
                            onClick={() => setSelectedFarmerId(farm.id)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d' }}>
                                  📍 {farm.distanceKm} km AWAY · WITHIN PERIMETER
                                </span>
                                <h3 style={{ margin: '2px 0 0', fontSize: 17, color: '#072618' }}>{farm.farmerName}</h3>
                                <div style={{ fontSize: 12, color: '#68786f' }}>{farm.farmLocation}</div>
                              </div>
                              <span style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: 14, padding: '4px 10px', borderRadius: 8 }}>
                                ₹{farm.basePrice} / kg
                              </span>
                            </div>

                            <div style={{ background: '#f8faf9', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#4b6152' }}>
                              <div>🌱 Crop: <b>{farm.crop}</b></div>
                              <div>🌾 Soil & Irrigation: {farm.soil}</div>
                              <div>⚖️ Registered Harvest Volume: <b>{farm.harvestVolumeKg} kg</b></div>
                              <div>📅 Expected Harvest Date: <b style={{ color: '#0369a1' }}>{farm.expectedHarvest}</b></div>
                            </div>

                            {/* Arrival Dates Schedule Selection */}
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
                                Expected Arrival Dates Schedule (Select Delivery Slot):
                              </label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {farm.arrivalOptions.map((opt, optIdx) => {
                                  const isSelectedSlot = isSelectedFarm && selectedArrivalSlot === opt.time;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`arrival-option-card ${isSelectedSlot ? 'selected' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFarmerId(farm.id);
                                        setSelectedArrivalSlot(opt.time);
                                      }}
                                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '8px 12px' }}
                                    >
                                      <div>
                                        <b style={{ fontSize: 12.5, color: '#072618' }}>{opt.label}</b>
                                        <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700 }}>📅 Arrival: {opt.time}</div>
                                        <small style={{ fontSize: 10, color: '#64748b' }}>{opt.etaDesc}</small>
                                      </div>
                                      <span style={{ fontSize: 16 }}>{isSelectedSlot ? '🟢' : '⚪'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Pricing & Confirmation */}
                            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #eef3f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                                <span style={{ color: '#68786f' }}>Estimate ({preorderKg} kg + cold logistics):</span>
                                <b style={{ color: '#072618', fontSize: 14 }}>₹{totalPreorderEstimate.toLocaleString()}</b>
                              </div>
                              <button
                                type="button"
                                className="primary-btn wide"
                                style={{ padding: '10px', fontSize: 13, fontWeight: 800 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  placeFarmPreorder(farm);
                                }}
                                disabled={placingOrder}
                              >
                                {placingOrder ? 'Notifying Network...' : 'Confirm Farm Pre-Order (Notifies CC & PC) 📋'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* =========================================================
                  PHASE B: INSTANT EXPRESS BOOKING VIEW
                  ========================================================= */}
              {consumerPhase === 'instant' && (
                <div>
                  {/* Explanatory Rule Banner */}
                  <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
                        INSTANT ORDERING RULES & QUANTITY LIMITATIONS
                      </span>
                      <h3 style={{ margin: '3px 0 2px', fontSize: 16, color: '#1e3a8a' }}>
                        2kg & 5kg Standard Bags Only · Minimum Order: 2 kg · Multi-Hub Stock Fallback
                      </h3>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#1e40af' }}>
                        Orders are redirected from the local Bowenpally Hub (₹25 delivery). If a shortage occurs, our algorithm checks nearby hubs; if available, the <b>"NO STOCK"</b> tag is removed and updated with an increased delivery fee (+₹40 distance surcharge). If exhausted across all hubs, a <b>"NO STOCK"</b> tag is shown.
                      </p>
                    </div>
                    <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 900, fontSize: 12, padding: '6px 14px', borderRadius: 20 }}>
                      MIN ORDER: 2 KG
                    </span>
                  </div>

                  {/* Destination Address Bar */}
                  <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 18 }}>📍</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#68786f', textTransform: 'uppercase' }}>
                        Instant Express Delivery Destination
                      </span>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="searchbox"
                        style={{ width: '100%', padding: '6px 10px', fontSize: 13 }}
                        placeholder="Enter delivery street, colony, Hyderabad..."
                      />
                    </div>
                  </div>

                  {/* Instant Produce Grid */}
                  <div className="instant-packs-grid">
                    {instantProduceCatalog.map(item => {
                      const selectedSize = instantPackSize[item.id] || 2;
                      const selectedQty = instantPackQty[item.id] || 1;
                      const totalItemKg = selectedSize * selectedQty;
                      const produceCost = item.pricePerKg * totalItemKg;
                      const totalWithFee = produceCost + item.deliveryFee;

                      const isOutOfStock = item.stockStatus === 'none';
                      const isNearbySourced = item.stockStatus === 'nearby';

                      return (
                        <div
                          key={item.id}
                          className={`instant-produce-card ${isOutOfStock ? 'no-stock' : ''}`}
                          style={{ borderColor: isNearbySourced ? '#f59e0b' : undefined }}
                        >
                          {/* Stock Status Tag */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {isOutOfStock && <span className="no-stock-tag">⛔ NO STOCK</span>}
                            {isNearbySourced && <span className="nearby-hub-tag">⚡ SOURCED FROM NEARBY HUB #02 (14 KM)</span>}
                            {item.stockStatus === 'local' && (
                              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                                🟢 IN STOCK (LOCAL HUB)
                              </span>
                            )}

                            {item.isGradeB && (
                              <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                                🏷️ {item.discountPercent}% OFF · GRADE B
                              </span>
                            )}
                          </div>

                          {/* Crop Art & Title */}
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: item.isGradeB ? '#fef3c7' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                              {item.emoji}
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 16, color: '#072618' }}>{item.crop}</h3>
                              <span style={{ fontSize: 11, fontWeight: 700, color: item.isGradeB ? '#b45309' : '#15803d' }}>
                                {item.grade} · {item.desc}
                              </span>
                            </div>
                          </div>

                          {/* Price & Delivery Fee Display */}
                          <div style={{ background: '#f8faf9', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                {item.isGradeB && (
                                  <span style={{ textDecoration: 'line-through', color: '#88988e', marginRight: 6, fontSize: 12 }}>
                                    ₹{item.originalPrice}/kg
                                  </span>
                                )}
                                <b style={{ fontSize: 18, color: item.isGradeB ? '#b45309' : '#072618' }}>
                                  ₹{item.pricePerKg} <small style={{ fontSize: 12, fontWeight: 600 }}>/ kg</small>
                                </b>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 11, color: '#68786f', display: 'block' }}>Delivery Fee</span>
                                <b style={{ fontSize: 13, color: isNearbySourced ? '#b45309' : '#072618' }}>
                                  {isOutOfStock ? '—' : `₹${item.deliveryFee}`}
                                </b>
                              </div>
                            </div>

                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              Fulfillment: <b>{item.hubName}</b> · ETA: <b>{item.deliveryEta}</b>
                            </div>
                          </div>

                          {/* Cross-Hub Distance Surcharge Alert Banner */}
                          {isNearbySourced && (
                            <div className="nearby-hub-alert-banner">
                              <span>⚠️</span>
                              <div>
                                <b>Local Shortage Fallback Active:</b> Local Bowenpally Hub is out of stock. Sourced directly from Gaddiannaram South Hub #02. Distance surcharge applied (+₹40). Delivery fee: ₹65.
                              </div>
                            </div>
                          )}

                          {isOutOfStock && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b' }}>
                              <b>Stockout Notice:</b> Currently exhausted across all 4 regional City Hubs. Please switch to <b>Phase A: Farm Pre-Orders</b> to book from upcoming farm harvests.
                            </div>
                          )}

                          {/* Pack Size Selector (2kg vs 5kg) & Pack Quantity */}
                          {!isOutOfStock && (
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
                                Standard Bag Packaging:
                              </label>
                              <div className="pack-size-selector-row">
                                <button
                                  type="button"
                                  className={`pack-size-btn ${selectedSize === 2 ? 'active' : ''}`}
                                  onClick={() => setInstantPackSize(prev => ({ ...prev, [item.id]: 2 }))}
                                >
                                  2 kg Standard Pack (₹{item.pricePerKg * 2})
                                </button>
                                <button
                                  type="button"
                                  className={`pack-size-btn ${selectedSize === 5 ? 'active' : ''}`}
                                  onClick={() => setInstantPackSize(prev => ({ ...prev, [item.id]: 5 }))}
                                >
                                  5 kg Family Pack (₹{item.pricePerKg * 5})
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                <span style={{ fontSize: 12, color: '#4b6152' }}>Number of Packs:</span>
                                <div className="stepper-wrap" style={{ height: 32 }}>
                                  <button
                                    type="button"
                                    className="stepper-btn"
                                    onClick={() => setInstantPackQty(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] || 1) - 1) }))}
                                  >
                                    −
                                  </button>
                                  <span style={{ padding: '0 12px', fontSize: 13, fontWeight: 800 }}>
                                    {selectedQty} ({totalItemKg} kg)
                                  </span>
                                  <button
                                    type="button"
                                    className="stepper-btn"
                                    onClick={() => setInstantPackQty(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) + 1 }))}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Order Action Button */}
                          <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                            {!isOutOfStock ? (
                              <button
                                type="button"
                                className="primary-btn wide"
                                style={{
                                  background: isNearbySourced ? '#d97706' : '#072618',
                                  borderColor: isNearbySourced ? '#d97706' : '#072618',
                                  padding: '11px',
                                  fontWeight: 800,
                                  fontSize: 13
                                }}
                                onClick={() => placeInstantOrder(item)}
                                disabled={placingOrder}
                              >
                                {isNearbySourced
                                  ? `Order via Nearby Hub · ₹${totalWithFee.toLocaleString()} ⚡`
                                  : `Order Instant Express · ₹${totalWithFee.toLocaleString()} ⚡`}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="outline-btn wide"
                                disabled
                                style={{ padding: '11px', opacity: 0.6, cursor: 'not-allowed', fontWeight: 800 }}
                              >
                                Currently Unavailable (No Stock) ⛔
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* =========================================================
                  END-OF-BUSINESS ZERO-LANDFILL COLD STORAGE BANNER
                  ========================================================= */}
              <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', borderRadius: 14, padding: '20px 24px', marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 32 }}>🌱</span>
                  <div>
                    <b style={{ color: '#15803d', fontSize: 16 }}>
                      Zero-Landfill Freshness Guarantee · End-of-Business Cold Storage & Composting
                    </b>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#275239', lineHeight: 1.5 }}>
                      At the end of each business day, 100% of unsold produce is securely held in climate-controlled cold storage (3.6°C). Any lot reaching its perishability shelf-life is automatically redirected to <b>Telangana Agri-Bio CNG & Composting Centre #04</b> (Kandlakoya Eco-Park) to produce organic nutrient compost for local farmers. Zero organic waste is sent to city landfills.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: MY ORDERS */}
          {tab === 'orders' && (
            <div className="orders-page">
              <div className="section-head">
                <div>
                  <span className="tiny-label">CONSUMER ORDERS</span>
                  <h2>Your Placed Demands & Deliveries</h2>
                  <p style={{ margin: '4px 0 0', color: '#66776b', fontSize: 13 }}>
                    Every order is aggregated to schedule multi-stop refrigerated delivery.
                  </p>
                </div>
                <button
                  type="button"
                  className="outline-btn"
                  onClick={() => {
                    api.get('/orders').then((r) => setOrders(r.data));
                  }}
                >
                  ↻ Refresh Orders
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="empty-orders-box">
                  <span style={{ fontSize: 36 }}>🛒</span>
                  <h3>No Orders Placed Yet</h3>
                  <p>Browse our fresh market catalog to order high-grade farm produce.</p>
                  <button className="primary-btn" onClick={() => setTab('shop')}>
                    Explore Fresh Market
                  </button>
                </div>
              ) : (
                orders.map((o) => (
                  <div className="order-card consumer-order-card" key={o.id}>
                    <div className="order-number">#{String(o.id).padStart(5, '0')}</div>
                    <div>
                      <b>
                        {o.quantity} kg {o.crop}
                      </b>
                      <span>{o.destination}</span>
                      <small style={{ color: '#88988e' }}>Window: {o.delivery_window}</small>
                    </div>
                    <div>
                      <span>Current Estimate</span>
                      <strong>₹{Math.round(o.total_estimate).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <span className="order-status">{o.status.replaceAll('_', ' ')}</span>
                      <button
                        type="button"
                        className="outline-btn small"
                        style={{ padding: '5px 9px', fontSize: 11 }}
                        onClick={() => setTab('track')}
                      >
                        Track Live ⌁
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: TRACK */}
          {tab === 'track' && <TrackingView shipment={shipment} />}
        </>
      )}

      {/* =========================================================
          B2B WHOLESALE BUYER VIEWS
          ========================================================= */}
      {mode === 'b2b' && (
        <>
          {/* TAB: PROCUREMENT DESK */}
          {tab === 'procurement' && (
            <div className="buyer-page">
              <div className="po-header">
                <div>
                  <span className="tiny-label">B2B COMMERCIAL SOURCING</span>
                  <h1>Weekly Bulk Procurement</h1>
                  <p>Aggregate demand from multiple farm gates before refrigerated vehicles move.</p>
                </div>
                <div className="po-id-wrap" style={{ textAlign: 'right' }}>
                  <span className="po-id" style={{ display: 'block', marginBottom: 4 }}>SPEC ID: REQ-KM-0412</span>
                  <span className="match-badge">WHOLESALE CONTRACT</span>
                </div>
              </div>

              <div className="proc-grid">
                {/* REQUIREMENT BUILDER CARD */}
                <div className="requirement-card b2b-builder-card">
                  <div className="card-top-label" style={{ marginBottom: 10 }}>
                    <span className="tiny-label">COMMODITY & VOLUME</span>
                  </div>

                  <div className="b2b-crop-selector">
                    {['Tomato', 'Onion', 'Potato', 'Chilli', 'Spinach'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`b2b-crop-chip ${b2bCrop === c ? 'active' : ''}`}
                        onClick={() => setB2bCrop(c)}
                      >
                        {c === 'Tomato' ? '🍅' : c === 'Onion' ? '🧅' : c === 'Potato' ? '🥔' : c === 'Chilli' ? '🌶️' : '🥬'} {c}
                      </button>
                    ))}
                  </div>

                  <div className="big-number">
                    <input
                      type="number"
                      value={b2bQty}
                      onChange={(e) => setB2bQty(e.target.value)}
                    />
                    <small>kg / week</small>
                  </div>

                  {/* Volume Presets */}
                  <div className="volume-presets-row">
                    {['500', '1000', '2500', '5000'].map((vol) => (
                      <button
                        key={vol}
                        type="button"
                        className={`preset-btn ${b2bQty === vol ? 'active' : ''}`}
                        onClick={() => setB2bQty(vol)}
                      >
                        {vol} kg
                      </button>
                    ))}
                  </div>

                  <div className="req-row">
                    <span>Grade Specification</span>
                    <select
                      value={b2bGrade}
                      onChange={(e) => setB2bGrade(e.target.value)}
                      className="b2b-inline-select"
                    >
                      <option value="A">Grade A (Supermarket Tier)</option>
                      <option value="A/B">Grade A/B (Commercial Standard)</option>
                      <option value="B">Grade B (Food Processing / HoReCa)</option>
                    </select>
                  </div>

                  <div className="req-row">
                    <span>Destination Hub</span>
                    <select
                      value={b2bDest}
                      onChange={(e) => setB2bDest(e.target.value)}
                      className="b2b-inline-select"
                    >
                      <option value="Hyderabad Central Wholesale Hub">Hyderabad Central Wholesale Hub</option>
                      <option value="Secunderabad Logistics Terminal">Secunderabad Logistics Terminal</option>
                      <option value="Shamshabad Cold Hub">Shamshabad Cold Hub</option>
                    </select>
                  </div>

                  <div className="req-row">
                    <span>Delivery Schedule</span>
                    <select
                      value={b2bCadence}
                      onChange={(e) => setB2bCadence(e.target.value)}
                      className="b2b-inline-select"
                    >
                      <option value="Mon · Wed · Fri Scheduled">Mon · Wed · Fri (3x / week)</option>
                      <option value="Daily Morning Dispatch">Daily Morning Dispatch</option>
                      <option value="Weekly Consolidated Batch">Weekly Consolidated Batch</option>
                    </select>
                  </div>

                  <div className="b2b-pricing-summary">
                    <div className="summary-line">
                      <span>Negotiated Wholesale Rate:</span>
                      <b>₹{wholesaleRatePerKg} / kg <small style={{ color: '#15803d' }}>(~18% bulk savings)</small></b>
                    </div>
                    <div className="summary-line">
                      <span>Vehicle Dispatch:</span>
                      <b>{+b2bQty >= 3000 ? '1x 4-Ton Reefer Truck' : '1x 1.5-Ton Reefer Van'}</b>
                    </div>
                    <div className="summary-line total">
                      <span>Estimated Weekly Commitment:</span>
                      <strong>₹{weeklyB2BTotal.toLocaleString()}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-btn wide"
                    onClick={publishRequirement}
                    disabled={b2bPublishing}
                  >
                    {b2bPublishing
                      ? 'Publishing Requirement...'
                      : b2bSaved
                      ? 'Requirement Active ✓ (Publish Another)'
                      : 'Publish Procurement Requirement →'}
                  </button>
                </div>

                {/* FEASIBLE SUPPLIERS PANEL */}
                <div className="supplier-panel">
                  <div className="section-head">
                    <div>
                      <span className="tiny-label">FARM CLUSTER MATCH</span>
                      <h2>Feasible Supply Sources</h2>
                    </div>
                    <span className="match-badge">88% FEASIBLE</span>
                  </div>

                  <p style={{ fontSize: 12, color: '#68786f', margin: '0 0 14px' }}>
                    Available harvest capacity in rural clusters matching your <b>{b2bCrop}</b> requirement:
                  </p>

                  {[
                    { name: 'Farmer Ravi Kumar · Shamshabad Rural', qty: '380 kg/wk', grade: 'Grade A', dist: '12.4 km' },
                    { name: 'Green Valley Farms · Medchal Cluster', qty: '520 kg/wk', grade: 'Grade A/B', dist: '18.7 km' },
                    { name: 'Telangana Agri Co-op · Hayathnagar', qty: '440 kg/wk', grade: 'Grade A', dist: '21.0 km' },
                    { name: 'Krishna Delta Cooperative · Ibrahimpatnam', qty: '650 kg/wk', grade: 'Grade B', dist: '27.5 km' }
                  ].map((s, i) => (
                    <div className="supplier-row" key={s.name}>
                      <div className="supplier-avatar">F{i + 1}</div>
                      <div>
                        <b>{s.name}</b>
                        <span>{s.qty} · {s.grade}</span>
                      </div>
                      <strong>{s.dist}</strong>
                    </div>
                  ))}

                  <div className="supply-note">
                    <b>Cold-Chain Aggregation Advantage:</b> Rather than ordering from multiple individual farmers, Krishi Marg's dispatch engine coordinates multi-farm pickup onto a single reefer vehicle, reducing transit spoilage by 23%.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPPLY FEASIBILITY */}
          {tab === 'suppliers' && (
            <div className="buyer-page">
              <div className="po-header">
                <div>
                  <span className="tiny-label">NETWORK SOURCING FEASIBILITY</span>
                  <h1>Rural Agri-Cluster Supply</h1>
                  <p>Real-time farmer capacities within the 40 km cold-chain delivery radius.</p>
                </div>
                <span className="match-badge">REAL-TIME INVENTORY</span>
              </div>

              <div className="proc-grid">
                <div className="supplier-panel" style={{ gridColumn: 'span 2' }}>
                  <div className="cluster-diagram-card">
                    <div className="cluster-header">
                      <h3>Refrigerated Consolidation Routing</h3>
                      <span className="cluster-pill">PAN-HYDERABAD REEFER CORRIDOR</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#55655a' }}>
                      Smallholder farmers list harvest batches at farm gates. Krishi Marg mini-reefers collect crates into Village Collection Hubs, where produce is pre-cooled before aggregated line-haul to your facility.
                    </p>

                    <div className="corridor-flow-grid">
                      <div className="flow-step">
                        <span className="step-num">01</span>
                        <b>4 Rural Farm Gates</b>
                        <small>Shamshabad, Medchal, Hayathnagar</small>
                      </div>
                      <div className="flow-arrow">→</div>
                      <div className="flow-step">
                        <span className="step-num">02</span>
                        <b>Village Collection Center</b>
                        <small>AI Grading & Pre-cooling (4°C)</small>
                      </div>
                      <div className="flow-arrow">→</div>
                      <div className="flow-step">
                        <span className="step-num">03</span>
                        <b>Consolidated Reefer Transit</b>
                        <small>Multi-stop single-vehicle run</small>
                      </div>
                      <div className="flow-arrow">→</div>
                      <div className="flow-step highlight">
                        <span className="step-num">04</span>
                        <b>B2B Distribution Hub</b>
                        <small>{b2bDest}</small>
                      </div>
                    </div>
                  </div>

                  <div className="section-head" style={{ marginTop: 24 }}>
                    <div>
                      <span className="tiny-label">ACTIVE PRODUCER DIRECTORY</span>
                      <h2>Verified Cold-Chain Farmers</h2>
                    </div>
                  </div>

                  <div className="farmers-table-wrap">
                    <table className="b2b-farmers-table">
                      <thead>
                        <tr>
                          <th>FARMER / COOPERATIVE</th>
                          <th>PRIMARY CROPS</th>
                          <th>WEEKLY CAPACITY</th>
                          <th>CURRENT GRADE</th>
                          <th>COLD PRE-COOLING</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><b>Ravi Kumar</b><br/><small>Shamshabad Rural (Plot 14)</small></td>
                          <td>🍅 Tomato, 🌶️ Chilli</td>
                          <td>850 kg / wk</td>
                          <td><span className="grade grade-A">Grade A</span></td>
                          <td>Active (Chamber 2)</td>
                          <td><span style={{ color: '#15803d', fontWeight: 700 }}>● Ready for Dispatch</span></td>
                        </tr>
                        <tr>
                          <td><b>Medchal Organic Cluster</b><br/><small>Medchal North Hub</small></td>
                          <td>🧅 Onion, 🥔 Potato</td>
                          <td>1,400 kg / wk</td>
                          <td><span className="grade grade-A">Grade A</span></td>
                          <td>Active (Chamber 1)</td>
                          <td><span style={{ color: '#15803d', fontWeight: 700 }}>● Ready for Dispatch</span></td>
                        </tr>
                        <tr>
                          <td><b>Telangana Agri Guild</b><br/><small>Hayathnagar East</small></td>
                          <td>🥬 Spinach, 🍅 Tomato</td>
                          <td>620 kg / wk</td>
                          <td><span className="grade grade-B">Grade A/B</span></td>
                          <td>Active (Chamber 3)</td>
                          <td><span style={{ color: '#15803d', fontWeight: 700 }}>● Ready for Dispatch</span></td>
                        </tr>
                        <tr>
                          <td><b>Krishna Valley Co-op</b><br/><small>Ibrahimpatnam South</small></td>
                          <td>🥔 Potato, 🌶️ Chilli</td>
                          <td>1,100 kg / wk</td>
                          <td><span className="grade grade-B">Grade B</span></td>
                          <td>Standard Cooling</td>
                          <td><span style={{ color: '#854d0e', fontWeight: 700 }}>● Intake in Progress</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACTIVE CONTRACTS */}
          {tab === 'b2b_orders' && (
            <div className="orders-page">
              <div className="section-head">
                <div>
                  <span className="tiny-label">PROCUREMENT CONTRACTS</span>
                  <h2>Published B2B Bulk Requirements</h2>
                  <p style={{ margin: '4px 0 0', color: '#66776b', fontSize: 13 }}>
                    Live commitments registered in the Krishi Marg supply aggregation engine.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setTab('procurement')}
                >
                  ＋ Publish New Requirement
                </button>
              </div>

              {b2bRequirements.length === 0 ? (
                <div className="empty-orders-box">
                  <span style={{ fontSize: 36 }}>📋</span>
                  <h3>No Active B2B Requirements</h3>
                  <p>Publish a weekly procurement specification to trigger farm cluster matching.</p>
                  <button className="primary-btn" onClick={() => setTab('procurement')}>
                    Build Requirement Now
                  </button>
                </div>
              ) : (
                b2bRequirements.map((r: any) => (
                  <div className="order-card b2b-contract-card" key={r.id}>
                    <div className="order-number">#REQ-{String(r.id).padStart(4, '0')}</div>
                    <div>
                      <b>
                        {r.quantity} kg/week {r.crop}
                      </b>
                      <span>Destination: {r.destination}</span>
                      <small style={{ color: '#88988e' }}>Cadence: {r.cadence} · Grade: {r.grade}</small>
                    </div>
                    <div>
                      <span>Estimated Value</span>
                      <strong>₹{Math.round(r.quantity * 24).toLocaleString()} / wk</strong>
                    </div>
                    <div>
                      <span className="order-status" style={{ color: '#15803d' }}>
                        {r.status || 'ACTIVE AGGREGATION'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function CustomerApp(props: any) {
  return <ConsumerBuyerApp {...props} initialRole="customer" />;
}

function BuyerApp(props: any) {
  return <ConsumerBuyerApp {...props} initialRole="buyer" />;
}

function TrackingView({shipment}:{shipment:Shipment|null}){
 const [s,setS]=useState(shipment); const [progress,setProgress]=useState(0.35)
 useEffect(()=>{if(!s)return;const t=setInterval(async()=>{const p=Math.min(progress+0.03,1);setProgress(p);const r=await api.post('/tracking/tick',{shipment_id:s.id,progress:p});setS(r.data)},4000);return()=>clearInterval(t)},[shipment?.id])
 if(!s)return <div className="empty">No active shipment yet. Place an order first.</div>
 return <div className="tracking-page"><div className="tracking-map"><LiveMap shipment={s}/><div className="map-overlay"><span className="demo-pill">SIMULATED GPS</span><b>{s.eta}</b><small>{s.distance_km} km planned route</small></div></div><div className="tracking-side"><span className="tiny-label">SHIPMENT {s.code}</span><h2>{s.crop} · {s.quantity} kg</h2><div className="fresh-box"><span>Freshness</span><b>{s.freshness}/100</b><small>{s.freshness>=70?'LOW RISK':'WATCH'}</small></div><div className="timeline">{['ORDER_PLACED','MATCHED','PICKUP','COLLECTION','PACKAGING','HUB','LAST_MILE','DELIVERED'].map((x,i)=><div className={`time-item ${i<3?'done':''}`} key={x}><i></i><div><b>{x.replaceAll('_',' ')}</b><span>{i<3?'Completed / active':'Awaiting backend state'}</span></div></div>)}</div></div></div>
}

function DriverApp({signout,bump}:{user:any;refresh:number;signout:()=>void;bump:()=>void}){
 const [reqs,setReqs]=useState<any[]>([]); const [ships,setShips]=useState<Shipment[]>([]); const [active,setActive]=useState<Shipment|null>(null)
 useEffect(()=>{api.get('/driver-requests').then(r=>setReqs(r.data));api.get('/shipments').then(r=>setShips(r.data))},[bump])
 async function act(id:number,yes:boolean){
  const r=await api.post(`/driver-requests/${id}/${yes?'accept':'decline'}`);
  if(yes) setActive(r.data);
  bump()
 }
 async function start(s:Shipment){const r=await api.post(`/shipments/${s.id}/start`);setActive(r.data);bump()}
 return (
   <div className="driver-app">
     <div className="driver-map">
       <LiveMap shipment={active||ships[0]}/>
       <div className="driver-top">
         <div className="brand light">
           <span className="brand-mark">KM</span>
           <span>KRISHI <b>MARG</b></span>
         </div>
         <button className="driver-avatar" onClick={signout}>↪</button>
       </div>
       <div className="driver-status">
         <span className="live-dot">●</span> REEFER PILOT ONLINE · 4G TELEMETRY
       </div>
     </div>
     <div className="driver-sheet">
       <div className="drag"></div>
       <div className="driver-tabs">
         <div>
           <b>Assigned Dispatch Trips</b>
           <small style={{display:'block', color:'#6d8478', fontSize:11}}>Cold-chain farm pickup & transit</small>
         </div>
         <span style={{background:'#dcfce7', color:'#15803d', padding:'4px 10px', borderRadius:20, fontWeight:800, fontSize:12}}>Today: ₹2,860</span>
       </div>

       {reqs.filter(r=>r.status==='REQUESTED').map(r=>{
         const matchedShip = ships.find(s=>s.id === r.shipment_id);
         const cropName = matchedShip?.crop || "Fresh Tomatoes";
         const cropQty = matchedShip?.quantity || 420;
         const cropCode = matchedShip?.lot_code || "LOT-KM-2048";
         return (
           <div className="trip-request driver-pickpoint-card" key={r.id}>
             <div className="trip-head">
               <span className="dispatch-badge">NEW PICKUP DISPATCH</span>
               <b className="earnings-tag">₹{r.earnings}</b>
             </div>

             {/* Detailed Pick Point & Harvest Info */}
             <div className="pickpoint-details-panel">
               <div className="pickpoint-row">
                 <span className="pickpoint-icon">📍</span>
                 <div>
                   <small>FARM GATE PICKUP POINT</small>
                   <strong>Green Valley Farms · Plot #14, Shamshabad Rural</strong>
                   <span className="sub-contact">Farmer: Ravi Kumar · <a href="tel:+919848023456" style={{color:'#15803d', textDecoration:'none', fontWeight:700}}>+91 98480 23456 📞</a></span>
                 </div>
               </div>

               <div className="pickpoint-row">
                 <span className="pickpoint-icon">🌾</span>
                 <div>
                   <small>TYPE OF HARVEST & QUANTITY</small>
                   <strong style={{color:'#072618', fontSize:14}}>{cropName.includes("Tomato") ? "🍅" : "🌱"} {cropName} · {cropQty} kg</strong>
                   <span className="harvest-spec-pill">14 Standard Agri-Crates · Pre-cooled</span>
                 </div>
               </div>

               <div className="pickpoint-row">
                 <span className="pickpoint-icon">🏢</span>
                 <div>
                   <small>DELIVERY DESTINATION</small>
                   <strong>Collection Center #02 (Shamshabad Cold Hub, Bay 3)</strong>
                   <span className="sub-contact">Distance: 18.4 km · Est. Transit: ~42 mins</span>
                 </div>
               </div>
             </div>

             <div className="trip-meta-specs">
               <span>❄️ Temp: 4°C - 8°C</span>
               <span>📦 Lot: {cropCode}</span>
               <span>🚛 Mini Reefer</span>
             </div>

             <div className="trip-actions">
               <button className="decline" onClick={()=>act(r.id,false)}>DECLINE</button>
               <button className="accept" onClick={()=>act(r.id,true)}>ACCEPT & START PICKUP 🚚</button>
             </div>
           </div>
         );
       })}

       {active && (
         <div className="active-trip driver-active-trip-panel">
           <div className="active-trip-header">
             <span className="tiny-label" style={{color:'#15803d', fontWeight:800}}>● ACTIVE ROUTE IN PROGRESS</span>
             <span className="temp-badge">❄️ Reefer: 5.2°C Stable</span>
           </div>

           <h2>{active.crop} · {active.quantity} kg</h2>
           <p style={{margin:'4px 0 14px', color:'#496355', fontSize:13}}>
             Stage: <b>{active.stage.replaceAll('_',' ')}</b> · ETA: <b>{active.eta}</b>
           </p>

           {/* Pick Point Summary for Active Trip */}
           <div className="active-pickpoint-summary">
             <div className="summary-line">
               <span>Pickup Point:</span>
               <b>Shamshabad Farm Gate (Plot 14)</b>
             </div>
             <div className="summary-line">
               <span>Harvest Details:</span>
               <b>{active.crop} · {active.quantity} kg (14 Crates)</b>
             </div>
             <div className="summary-line">
               <span>Contact Farmer:</span>
               <b>Ravi Kumar (+91 98480 23456)</b>
             </div>
             <div className="summary-line">
               <span>Intake Destination:</span>
               <b>Collection Station #02 (Cold Bay 3)</b>
             </div>
           </div>

           <div className="active-trip-actions-row">
             <button
               className="outline-btn"
               style={{flex:1, padding:11, fontSize:12, fontWeight:700}}
               onClick={()=>alert(`GPS Navigation: Guiding route to Farm Gate (17.3850° N, 78.4867° E). Distance: ${active.distance_km || 18.4} km.`)}
             >
               🗺️ Turn-by-Turn GPS
             </button>
             <button
               className="outline-btn"
               style={{flex:1, padding:11, fontSize:12, fontWeight:700}}
               onClick={()=>alert(`Farm QR Verified for Lot ${active.lot_code || 'KM-2048'}. Weight confirmed: ${active.quantity} kg.`)}
             >
               ▦ Scan Farm QR
             </button>
           </div>

           <button
             className="primary-btn wide"
             style={{marginTop:12, padding:14, fontWeight:800, background:'#072618'}}
             onClick={()=>api.post(`/shipments/${active.id}/complete`).then(()=>{setActive(null);bump()})}
           >
             Complete Handoff at Collection Center →
           </button>
         </div>
       )}

       {!reqs.filter(r=>r.status==='REQUESTED').length && !active && (
         <div className="driver-empty">
           <div style={{fontSize:32, marginBottom:10}}>🚚</div>
           <b>No Pending Farm Gate Pickups</b>
           <p style={{margin:'6px 0 0', fontSize:12, color:'#748f80'}}>The dispatch engine only sends routes when harvest batches are packed and ready at the farm gate.</p>
         </div>
       )}
     </div>
   </div>
 )
}

function PackageCentreApp({
  user,
  refresh,
  bump,
  signout,
}: {
  user: any;
  refresh: number;
  bump: () => void;
  signout: () => void;
}) {
  const [tab, setTab] = useState<'pipeline' | 'inbound' | 'expected' | 'bags' | 'waste' | 'hub_redirect'>('pipeline');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);
  const [ships, setShips] = useState<Shipment[]>([]);
  const [lots, setLots] = useState<any[]>([]);

  // Inbound CC Transit State
  const [etaMinutes, setEtaMinutes] = useState<number>(18);
  const [isDocked, setIsDocked] = useState<boolean>(false);
  const inboundOrigin = 'Shamshabad Collection Centre #02 (Bay 3, Ranga Reddy Dist, TS)';
  const activeLotCode = 'LOT-KM-2048';
  const activeCrop = 'Tomato (Roma Hybrid)';
  const inboundKg = 420;
  const reeferTemp = 6.4;
  const reeferVehicle = 'AP-28-TC-4402 (Cold Reefer 1.5T)';
  const driverContact = 'Srinivas Rao · +91 98490 23114';

  // Tri-split Grading State:
  // Deliverable (Grade A 80%): 336 kg
  // Discount (Grade B 15%): 63 kg
  // Wastage (Rejects 5%): 21 kg
  const deliverableKg = Math.round(inboundKg * 0.8);
  const discountKg = Math.round(inboundKg * 0.15);
  const wastageKg = inboundKg - deliverableKg - discountKg;

  // Bag Calculator State:
  const [bagMode, setBagMode] = useState<'wholesale' | 'retail' | 'custom'>('wholesale');
  const [calcKg, setCalcKg] = useState<number>(deliverableKg);

  // Labeling State:
  const [labelQr, setLabelQr] = useState<string>('');
  const [labelPrinted, setLabelPrinted] = useState<boolean>(false);

  // Wastage & Outbound Dispatches:
  const [wastageDispatched, setWastageDispatched] = useState<boolean>(false);
  const [outboundDispatched, setOutboundDispatched] = useState<boolean>(false);
  const [selectedUpcoming, setSelectedUpcoming] = useState<any>(null);

  useEffect(() => {
    api.get('/shipments').then(r => setShips(r.data)).catch(() => {});
    api.get('/lots').then(r => setLots(r.data)).catch(() => {});
  }, [refresh]);

  // Generate QR Code for labeling step
  useEffect(() => {
    const payload = {
      lot_code: activeLotCode,
      crop: activeCrop,
      grade: 'A',
      net_weight_kg: 50,
      packhouse: 'Shamshabad Central Cold PC #01',
      origin_cc: inboundOrigin,
      fssai_lic: '13626011000492',
      destination_hub: 'Hyderabad Central City Hub (Bowenpally)',
      traceability_hash: 'KM-TR-9941-8842-A'
    };
    QRCode.toDataURL(JSON.stringify(payload), { width: 100, margin: 1 })
      .then(setLabelQr)
      .catch(() => {});
  }, [activeLotCode, activeCrop, inboundOrigin]);

  // Dynamic Bag Sizing Calculation for 2kg, 5kg, 20kg, 50kg
  const bagAllocation = useMemo(() => {
    const total = calcKg > 0 ? calcKg : 0;
    if (total === 0) return { b50: 0, b20: 0, b5: 0, b2: 0, totalBags: 0, packedKg: 0 };

    if (bagMode === 'retail') {
      let b5 = Math.floor((total * 0.6) / 5);
      let rem = total - b5 * 5;
      let b2 = Math.floor(rem / 2);
      rem = rem - b2 * 2;
      if (rem > 0) b2 += 1;
      return { b50: 0, b20: 0, b5, b2, totalBags: b5 + b2, packedKg: b5 * 5 + b2 * 2 };
    }

    // Wholesale / Institutional: 50kg -> 20kg -> 5kg -> 2kg
    let rem = total;
    const b50 = Math.floor(rem / 50);
    rem %= 50;

    const b20 = Math.floor(rem / 20);
    rem %= 20;

    let best5 = 0, best2 = 0, bestDiff = 999;
    for (let c5 = Math.floor(rem / 5); c5 >= 0; c5--) {
      const subRem = rem - c5 * 5;
      const c2 = Math.ceil(subRem / 2);
      const diff = c5 * 5 + c2 * 2 - rem;
      if (diff === 0) {
        best5 = c5;
        best2 = c2;
        bestDiff = 0;
        break;
      } else if (diff < bestDiff) {
        best5 = c5;
        best2 = c2;
        bestDiff = diff;
      }
    }

    return {
      b50,
      b20,
      b5: best5,
      b2: best2,
      totalBags: b50 + b20 + best5 + best2,
      packedKg: b50 * 50 + b20 * 20 + best5 * 5 + best2 * 2
    };
  }, [calcKg, bagMode]);

  const pipelineSteps = [
    { id: 'unloading', name: 'Unloading', icon: '📥', stepNum: 1 },
    { id: 'precooling', name: 'Precooling', icon: '❄️', stepNum: 2 },
    { id: 'dumping', name: 'Dumping', icon: '🌊', stepNum: 3 },
    { id: 'washing', name: 'Washing', icon: '🚿', stepNum: 4 },
    { id: 'sorting', name: 'Sorting', icon: '🔍', stepNum: 5 },
    { id: 'grading', name: 'Grading', icon: '⚖️', stepNum: 6 },
    { id: 'packing', name: 'Packing', icon: '📦', stepNum: 7 },
    { id: 'labeling', name: 'Labeling', icon: '🏷️', stepNum: 8 },
    { id: 'dispatch', name: 'Dispatch', icon: '🚀', stepNum: 9 },
  ];

  const expectedIncomingQueue = [
    {
      id: 'EXP-01',
      lot_code: 'LOT-KM-2051',
      cc_name: 'Medchal Collection Centre #01',
      location: 'Medchal Checkpost, ORR North Corridor',
      crop: 'Onion (Nasik Red)',
      quantity: 580,
      reefer_vehicle: 'AP-29-BA-1102 (Reefer 2.5T)',
      driver: 'Ramesh Varma (+91 97011 44521)',
      departure_time: '14:00 Today',
      eta: '~45 mins',
      temp: '7.1°C',
      status: 'IN TRANSIT'
    },
    {
      id: 'EXP-02',
      lot_code: 'LOT-KM-2055',
      cc_name: 'Hayathnagar Collection Centre #03',
      location: 'Hayathnagar Bay 2, NH-65 East Gate',
      crop: 'Carrot (Kuroda Fresh)',
      quantity: 350,
      reefer_vehicle: 'TS-08-EF-9943 (Reefer 1.2T)',
      driver: 'S. Kumar (+91 98488 12390)',
      departure_time: '14:45 Today',
      eta: '~1 hr 20 mins',
      temp: '5.8°C',
      status: 'SCHEDULED'
    },
    {
      id: 'EXP-03',
      lot_code: 'LOT-KM-2062',
      cc_name: 'Ibrahimpatnam Collection Centre #04',
      location: 'Ibrahimpatnam Agro Yard, Sagar Highway',
      crop: 'Potato (Kufri Jyoti)',
      quantity: 620,
      reefer_vehicle: 'TS-07-JK-3382 (Reefer 3.0T)',
      driver: 'Md. Farooq (+91 99632 77104)',
      departure_time: '15:30 Today',
      eta: '~2 hrs 40 mins',
      temp: '8.2°C',
      status: 'STAGED AT CC'
    },
    {
      id: 'EXP-04',
      lot_code: 'LOT-KM-2070',
      cc_name: 'Gajwel Collection Centre #05',
      location: 'Gajwel Horticulture Cluster, Rajiv Highway',
      crop: 'Cabbage (Green Pride)',
      quantity: 290,
      reefer_vehicle: 'AP-21-TX-5510 (Reefer 1.5T)',
      driver: 'B. Naresh (+91 94412 88390)',
      departure_time: '16:15 Today',
      eta: '~3 hrs 15 mins',
      temp: '6.0°C',
      status: 'LOADING'
    },
    {
      id: 'EXP-05',
      lot_code: 'LOT-KM-2078',
      cc_name: 'Chevella Collection Centre #06',
      location: 'Chevella Crossroad Yard, Vikarabad Road',
      crop: 'Cauliflower (Snowball)',
      quantity: 450,
      reefer_vehicle: 'TS-10-MN-4491 (Reefer 2.0T)',
      driver: 'P. Satish (+91 96521 33499)',
      departure_time: '17:00 Today',
      eta: '~4 hrs 10 mins',
      temp: '5.5°C',
      status: 'PRE-COOLING'
    }
  ];

  const advanceStep = (currentIdx: number) => {
    setCompletedSteps(prev => Array.from(new Set([...prev, currentIdx])));
    if (currentIdx < 8) {
      setActiveStep(currentIdx + 1);
    }
  };

  const handleDockTruck = () => {
    setIsDocked(true);
    setEtaMinutes(0);
    setCompletedSteps(prev => Array.from(new Set([...prev, 0])));
    alert('Reefer Truck AP-28-TC-4402 successfully docked at Bay 02! Dock seals engaged. Temperature verified at 6.4°C.');
  };

  const handleDispatchWastage = () => {
    setWastageDispatched(true);
    alert('Wastage consignment (' + wastageKg + ' kg + 124 kg accumulated culls) successfully dispatched via Bio-Waste Sealed Carrier TS-09-UB-8819 to Telangana Agri-Bio CNG & Composting Centre #04! Green disposal manifest generated.');
  };

  const handleDispatchOutbound = async () => {
    try {
      if (ships.length > 0) {
        await api.post(`/shipments/${ships[0].id}/handoff`).catch(() => {});
      }
    } catch(e) {}
    setOutboundDispatched(true);
    bump();
    alert('Outbound Reefer TS-07-UA-9081 dispatched to Hyderabad Central Hub (Bowenpally)! 336 kg deliverable produce sealed & tracked.');
  };

  return (
    <Shell
      role="package"
      active={tab}
      signout={signout}
      onSelect={(id: any) => setTab(id)}
      customRoleLabel="Package Centre"
      customRoleIcon="▣"
      navItems={[
        { id: 'pipeline', label: '9-Step Pipeline', icon: '⚙️' },
        { id: 'inbound', label: 'Inbound CC Transit & ETA', icon: '🚚' },
        { id: 'expected', label: 'Expected Upcoming Queue', icon: '📋' },
        { id: 'bags', label: 'Bag Sizing (2/5/20/50kg)', icon: '📦' },
        { id: 'hub_redirect', label: 'City Hub Redirection & Balancing', icon: '⇄' },
        { id: 'waste', label: 'Wastage to Bio-CNG', icon: '♻️' }
      ]}
    >
      <Top
        title="Central Packhouse Operations"
        subtitle="Shamshabad Cold Packhouse #01 · Telangana Agri-Logistics"
        signout={signout}
      >
        <span className="station-clock">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </Top>

      <div className="station-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>
        
        {/* ============================================================
            INBOUND CC TRANSIT HERO CARD (Always prominently shown)
            ============================================================ */}
        <div className="pc-inbound-hero">
          <div className="pc-inbound-top">
            <div>
              <span className="tiny-label" style={{ color: '#86efac', letterSpacing: '0.12em' }}>
                LIVE CC DISPATCH TELEMETRY · COLD CHAIN HIGHWAY TRANSIT
              </span>
              <h2 style={{ margin: '4px 0 0', color: '#ffffff', fontSize: 22, fontFamily: 'Manrope, sans-serif' }}>
                Incoming Produce from Collection Centre
              </h2>
            </div>
            <div className="pc-eta-badge" style={{ background: isDocked ? '#15803d' : '#0284c7' }}>
              <span style={{ fontSize: 14 }}>{isDocked ? '🟢' : '⏱️'}</span>
              <span>{isDocked ? 'DOCKED AT BAY 02 (READY TO UNLOAD)' : `ETA: ~${etaMinutes} MINS (${(etaMinutes * 0.78).toFixed(1)} km away)`}</span>
            </div>
          </div>

          <div className="pc-inbound-grid">
            <div className="pc-inbound-col">
              <small>LOCATION FROM WHERE IT'S COMING</small>
              <strong>{inboundOrigin}</strong>
              <span>Transit Highway: NH-44 / Outer Ring Road (ORR Exit 16) ➔ Packhouse Bay 02</span>
            </div>

            <div className="pc-inbound-col">
              <small>ORDER & HARVEST DETAILS</small>
              <strong>{activeLotCode} · {activeCrop}</strong>
              <span>Quantity: <b>{inboundKg} kg</b> (21 Harvest Crates) · Cold Chamber: <b>{reeferTemp}°C</b> (In-Spec)</span>
            </div>

            <div className="pc-inbound-col">
              <small>TRANSPORT CARRIER & DRIVER</small>
              <strong>{reeferVehicle}</strong>
              <span>Driver: {driverContact} · Status: {isDocked ? 'Docked at Bay 02' : 'Reefer Running (4°C-8°C)'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid #1f5037', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#a7d5b8' }}>Transit Progress:</span>
              <div style={{ background: '#123924', borderRadius: 8, height: 8, width: 220, overflow: 'hidden' }}>
                <div style={{ background: '#22c55e', height: '100%', width: isDocked ? '100%' : '75%', transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 11, color: '#86efac', fontWeight: 700 }}>{isDocked ? '100% Arrived' : '75% En Route'}</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {!isDocked ? (
                <button
                  className="primary-btn small"
                  style={{ background: '#22c55e', color: '#072618', fontWeight: 800, padding: '8px 16px' }}
                  onClick={handleDockTruck}
                >
                  Simulate Reefer Arrival & Dock at Bay 02 🚛
                </button>
              ) : (
                <span style={{ background: '#166534', color: '#86efac', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  ✓ Reefer Docked & Offload Verified
                </span>
              )}
              <button
                className="outline-btn small"
                style={{ borderColor: '#3b7554', color: '#d1fae5' }}
                onClick={() => setTab('expected')}
              >
                View 5 Upcoming CC Dispatches ➔
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            TAB 1: 9-STEP SEQUENTIAL PROCESSING PIPELINE
            ============================================================ */}
        {tab === 'pipeline' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div>
                <span className="tiny-label">PACKHOUSE WORKFLOW</span>
                <h1 style={{ margin: '2px 0 0', fontSize: 24, color: '#072618', fontFamily: 'Manrope, sans-serif' }}>
                  9-Step Produce Processing Line
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#566e5f' }}>
                  Sequential packhouse operations for incoming harvest: Unloading ➔ Precooling ➔ Dumping ➔ Washing ➔ Sorting ➔ Grading (Tri-Grade Split) ➔ Packing ➔ Labeling ➔ Dispatch.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d' }}>
                  Step {activeStep + 1} of 9 Active
                </span>
              </div>
            </div>

            {/* Pipeline Stepper Horizontal Bar */}
            <div className="pc-pipeline-stepper">
              {pipelineSteps.map((step, idx) => {
                const isCurrent = activeStep === idx;
                const isDone = completedSteps.includes(idx);
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      className={`pc-step-item ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                      onClick={() => setActiveStep(idx)}
                      title={`Switch to ${step.name}`}
                    >
                      <div className="pc-step-num">{isDone && !isCurrent ? '✓' : step.stepNum}</div>
                      <span style={{ fontSize: 14 }}>{step.icon}</span>
                      <div className="pc-step-name">{step.name}</div>
                    </div>
                    {idx < pipelineSteps.length - 1 && <span className="pc-step-arrow">→</span>}
                  </div>
                );
              })}
            </div>

            {/* ACTIVE STEP DETAILS PANEL */}
            <div className="pc-stage-panel">
              {/* Step 0: Unloading */}
              {activeStep === 0 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 1 OF 9 · INBOUND INTAKE</span>
                      <h2>Reefer Bay Unloading & Cold Dock Receiving</h2>
                    </div>
                    <span className="badge" style={{ background: isDocked ? '#dcfce7' : '#e0f2fe', color: isDocked ? '#15803d' : '#0369a1' }}>
                      {isDocked ? 'BAY 02 DOCKED' : 'AWAITING REEFER DOCKING'}
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px' }}>
                    Unloading temperature-controlled produce from Collection Centre reefer vehicles into the cold intake vestibule. Continuous thermal sensors ensure cold chain integrity remains unbroken during pallet transfer.
                  </p>

                  <div className="pc-stage-specs-grid">
                    <div className="pc-spec-box">
                      <small>INBOUND DOCK</small>
                      <strong>Cold Dock Bay #02</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Air-curtain positive pressure active</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>CRATE MANIFEST</small>
                      <strong>21 Harvest Crates (420 kg)</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>20 kg standard vented crates</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>PULP TEMP AT ARRIVAL</small>
                      <strong>{reeferTemp}°C (Safe Range: 4°C - 8°C)</strong>
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✓ Zero thermal break detected</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                    <button
                      className="primary-btn"
                      style={{ padding: '12px 24px', fontWeight: 800 }}
                      onClick={() => advanceStep(0)}
                    >
                      Confirm Unload & Intake Verification ➔ Advance to Precooling
                    </button>
                    {!isDocked && (
                      <button className="outline-btn" onClick={handleDockTruck}>
                        Fast-Dock Inbound Reefer
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Precooling */}
              {activeStep === 1 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 2 OF 9 · RAPID HEAT REMOVAL</span>
                      <h2>Hydro-Cooling & Forced-Air Precooling</h2>
                    </div>
                    <span className="badge" style={{ background: '#ecfeff', color: '#0e7490' }}>
                      CORE TEMP PULLDOWN: 24°C ➔ 6°C
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px' }}>
                    Quickly extracting internal field core heat from harvested tomatoes to arrest respiration, retain firmness, and preserve natural vitamin content before washing and grading.
                  </p>

                  <div className="pc-stage-specs-grid">
                    <div className="pc-spec-box">
                      <small>PRECOOLING METHOD</small>
                      <strong>Dual Hydro-Air Forced Chilling</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Chilled water shower + high-velocity cold air</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>TEMPERATURE PROGRESSION</small>
                      <strong>23.8°C Initial ➔ 6.0°C Core Pulp</strong>
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>Target reached in 35 mins</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>RELATIVE HUMIDITY</small>
                      <strong>94% RH Controlled</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Prevents skin wilting and weight shrinkage</span>
                    </div>
                  </div>

                  <button
                    className="primary-btn"
                    style={{ padding: '12px 24px', fontWeight: 800 }}
                    onClick={() => advanceStep(1)}
                  >
                    Confirm Precooling Complete (Core 6.0°C) ➔ Advance to Dumping
                  </button>
                </div>
              )}

              {/* Step 2: Dumping */}
              {activeStep === 2 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 3 OF 9 · HYDRAULIC INTAKE</span>
                      <h2>Wet-Flume Immersion & Hydro-Dumping</h2>
                    </div>
                    <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>
                      ZERO-BRUISE HYDRAULIC FLUME
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px' }}>
                    Harvest crates are gently immersed into a temperature-regulated water flume. Tomatoes float out gently without mechanical impact, preventing internal bruising and micro-cracking.
                  </p>

                  <div className="pc-stage-specs-grid">
                    <div className="pc-spec-box">
                      <small>FLUME WATER TEMPERATURE</small>
                      <strong>7.5°C Chilled Immersion Bath</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Maintains cold-chain pulp equilibrium</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>FLOW VELOCITY</small>
                      <strong>0.42 m/s Gentle Laminar Flow</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Continuous floating transit to wash station</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>CUSHION IMPACT RATING</small>
                      <strong>&lt; 0.05% Bruising Index</strong>
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>99.9% skin barrier preservation</span>
                    </div>
                  </div>

                  <button
                    className="primary-btn"
                    style={{ padding: '12px 24px', fontWeight: 800 }}
                    onClick={() => advanceStep(2)}
                  >
                    Confirm Wet-Flume Dumping Complete ➔ Advance to Washing
                  </button>
                </div>
              )}

              {/* Step 3: Washing */}
              {activeStep === 3 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 4 OF 9 · SANITIZATION & CLEANING</span>
                      <h2>Dual-Stage Sanitized Ozone & Water Washing</h2>
                    </div>
                    <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                      80 PPM DISSOLVED OZONE RINSE
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px' }}>
                    High-efficiency spray manifold with food-grade ozonated water strips field soil, environmental dust, and surface microbes. High-velocity air knives eliminate excess water prior to sorting.
                  </p>

                  <div className="pc-stage-specs-grid">
                    <div className="pc-spec-box">
                      <small>SANITIZING AGENT</small>
                      <strong>80 ppm Food-Grade Dissolved O₃</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Organic certified · leaves zero chemical residue</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>SPRAY PRESSURE</small>
                      <strong>1.8 Bar Low-Shear Misting</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Full 360° produce perimeter coverage</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>DE-WATERING STAGE</small>
                      <strong>High-Velocity Dual Air Knives</strong>
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>Surface dry in 18 seconds</span>
                    </div>
                  </div>

                  <button
                    className="primary-btn"
                    style={{ padding: '12px 24px', fontWeight: 800 }}
                    onClick={() => advanceStep(3)}
                  >
                    Sanitized Wash & Dry Verified ➔ Advance to Sorting
                  </button>
                </div>
              )}

              {/* Step 4: Sorting */}
              {activeStep === 4 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 5 OF 9 · CALIBER & SIZE SEGREGATION</span>
                      <h2>Optical & Roller Sizing Sorting Line</h2>
                    </div>
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                      240 UNITS / SEC SCAN RATE
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px' }}>
                    High-speed multi-spectral vision cameras and calibrated roller sizing belts classify produce by diameter (caliber), roundness, and skin pigment maturity.
                  </p>

                  <div className="pc-stage-specs-grid">
                    <div className="pc-spec-box">
                      <small>OPTICAL RESOLUTION</small>
                      <strong>4K RGB + NIR Multi-Spectrum</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Detects both exterior skin and sub-surface density</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>DIAMETER SEGREGATION</small>
                      <strong>65-75mm (Medium) &gt;75mm (Large)</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Calibrated mechanical step-down gates</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>FOREIGN OBJECT REMOVAL</small>
                      <strong>100% Debris Free</strong>
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>Stems and foliage separated</span>
                    </div>
                  </div>

                  <button
                    className="primary-btn"
                    style={{ padding: '12px 24px', fontWeight: 800 }}
                    onClick={() => advanceStep(4)}
                  >
                    Sorting Complete ➔ Advance to Grading (Deliverable / Discount / Wastage)
                  </button>
                </div>
              )}

              {/* Step 5: Grading (Deliverable / Discount / Wastage) */}
              {activeStep === 5 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 6 OF 9 · QUALITY ALLOCATION</span>
                      <h2>Tri-Grade Classification: Deliverable · Discount · Wastage</h2>
                    </div>
                    <span className="badge" style={{ background: '#ecfdf5', color: '#15803d', fontWeight: 800 }}>
                      TOTAL HARVEST: {inboundKg} KG
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 14px' }}>
                    Produce is categorized into three strict commercial streams: <b>Deliverable</b> (Grade A for City Hubs & Institutions), <b>Discounted</b> (Grade B for Consumer Value Corner at 25% Off), and <b>Wastage</b> (Rejects transported to Bio-CNG & Composting facility).
                  </p>

                  {/* Tri-Grade Grid */}
                  <div className="pc-grading-grid">
                    {/* Grade A: Deliverable */}
                    <div className="pc-grade-card deliverable">
                      <span className="grade-card-badge">GRADE A · PREMIUM DELIVERABLE</span>
                      <h3>Deliverable Produce</h3>
                      <p>
                        Firm, vibrant uniform coloration, zero skin cuts or blemishes. Strictly within premium supermarket & institutional standards.
                      </p>
                      <div style={{ fontSize: 11, color: '#166534', margin: '4px 0' }}>
                        ➔ <b>Allocated to:</b> City Hubs & Premium B2B Wholesale
                      </div>
                      <div className="grade-qty-row">
                        <div>
                          <small style={{ color: '#15803d', fontWeight: 800 }}>VOLUME (80%)</small>
                          <div><b>{deliverableKg} kg</b></div>
                        </div>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
                          Base ₹30/kg
                        </span>
                      </div>
                    </div>

                    {/* Grade B: Discounted */}
                    <div className="pc-grade-card discount">
                      <span className="grade-card-badge">GRADE B · VALUE DISCOUNT</span>
                      <h3>Discounted Produce</h3>
                      <p>
                        Minor skin netting, slight curvature or size variation. 100% fresh, nutritious, and wholesome for cooking.
                      </p>
                      <div style={{ fontSize: 11, color: '#854d0e', margin: '4px 0' }}>
                        ➔ <b>Allocated to:</b> Consumer Interface (Value Corner)
                      </div>
                      <div className="grade-qty-row">
                        <div>
                          <small style={{ color: '#a16207', fontWeight: 800 }}>VOLUME (15%)</small>
                          <div><b>{discountKg} kg</b></div>
                        </div>
                        <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
                          🏷️ 25% OFF (₹22/kg)
                        </span>
                      </div>
                    </div>

                    {/* Wastage */}
                    <div className="pc-grade-card wastage">
                      <span className="grade-card-badge">REJECTS · ZERO LANDFILL</span>
                      <h3>Packhouse Wastage</h3>
                      <p>
                        Cracked skin, internal overripeness, fungal damage or severe bruising unfit for human retail consumption.
                      </p>
                      <div style={{ fontSize: 11, color: '#9f1239', margin: '4px 0' }}>
                        ➔ <b>Allocated to:</b> Telangana Agri-Bio CNG Plant #04
                      </div>
                      <div className="grade-qty-row">
                        <div>
                          <small style={{ color: '#be123c', fontWeight: 800 }}>VOLUME (5%)</small>
                          <div><b>{wastageKg} kg</b></div>
                        </div>
                        <span style={{ background: '#ffe4e6', color: '#9f1239', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
                          ♻️ Bio-CNG Biomass
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clarification notes connecting to requirements */}
                  <div style={{ background: '#f8faf8', border: '1px solid #dce4dd', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 20 }}>
                    <div>
                      <b style={{ color: '#854d0e', fontSize: 12.5 }}>🛒 Consumer Interface Link:</b>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#4b6152' }}>
                        The <b>{discountKg} kg</b> discount batch is instantly published to the <b>Consumer Marketplace (Value & Discount Corner)</b> at ₹22/kg with 25% off tags.
                      </p>
                    </div>
                    <div>
                      <b style={{ color: '#9f1239', fontSize: 12.5 }}>♻️ Concerned Centre Transport Link:</b>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#4b6152' }}>
                        The <b>{wastageKg} kg</b> cull stream is staged for sealed collection by <b>Telangana Agri-Bio CNG & Composting Centre #04</b>.
                      </p>
                    </div>
                  </div>

                  <button
                    className="primary-btn"
                    style={{ padding: '12px 24px', fontWeight: 800 }}
                    onClick={() => advanceStep(5)}
                  >
                    Commit Tri-Grade Classification ➔ Advance to Packing (Bag Allocation)
                  </button>
                </div>
              )}

              {/* Step 6: Packing (Bag sizes: 2kg, 5kg, 20kg, 50kg) */}
              {activeStep === 6 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 7 OF 9 · SIZED PACKAGING</span>
                      <h2>Produce Packaging & Dynamic Bag Sizing</h2>
                    </div>
                    <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
                      DELIVERABLE PACK VOLUME: {calcKg} KG
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 16px' }}>
                    Packaging bag sizes are strictly <b>2kg, 5kg, 20kg, and 50kg</b>. Based on the size of the order or deliverable volume, the exact quantity of bags used is dynamically calculated and displayed.
                  </p>

                  {/* Calculator & Mode Controls */}
                  <div style={{ background: '#f4f8f5', border: '1px solid #d3ded6', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#072618' }}>Packing Allocation Mode:</span>
                        <div style={{ display: 'flex', background: '#e2ece4', padding: 3, borderRadius: 8 }}>
                          <button
                            className={`small-btn ${bagMode === 'wholesale' ? 'active' : ''}`}
                            style={{ background: bagMode === 'wholesale' ? '#072618' : 'transparent', color: bagMode === 'wholesale' ? '#fff' : '#234430', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => { setBagMode('wholesale'); setCalcKg(deliverableKg); }}
                          >
                            Wholesale B2B (50kg + 20kg + 5kg + 2kg)
                          </button>
                          <button
                            className={`small-btn ${bagMode === 'retail' ? 'active' : ''}`}
                            style={{ background: bagMode === 'retail' ? '#072618' : 'transparent', color: bagMode === 'retail' ? '#fff' : '#234430', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => { setBagMode('retail'); setCalcKg(deliverableKg); }}
                          >
                            Retail Consumer (5kg + 2kg Packs)
                          </button>
                          <button
                            className={`small-btn ${bagMode === 'custom' ? 'active' : ''}`}
                            style={{ background: bagMode === 'custom' ? '#072618' : 'transparent', color: bagMode === 'custom' ? '#fff' : '#234430', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => setBagMode('custom')}
                          >
                            Custom Order Size
                          </button>
                        </div>
                      </div>

                      {/* Weight Adjuster */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#314e3b' }}>Order Weight (kg):</label>
                        <input
                          type="number"
                          value={calcKg}
                          min={1}
                          max={5000}
                          onChange={(e) => setCalcKg(Math.max(1, Number(e.target.value)))}
                          style={{ width: 90, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #15803d', fontWeight: 800, fontSize: 15, textAlign: 'center', color: '#072618' }}
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#566e5f', fontWeight: 700 }}>Quick Order Presets:</span>
                      {[50, 100, 200, 336, 420, 500, 1000].map(amt => (
                        <button
                          key={amt}
                          style={{ background: calcKg === amt ? '#15803d' : '#ffffff', color: calcKg === amt ? '#ffffff' : '#2a4435', border: '1px solid #c7d6cb', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          onClick={() => setCalcKg(amt)}
                        >
                          {amt} kg {amt === 336 ? '(Current Deliverable)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 BAG SIZES DISPLAY GRID (2kg, 5kg, 20kg, 50kg) */}
                  <div className="pc-bags-grid">
                    {/* 50 kg Bag */}
                    <div className={`pc-bag-card ${bagAllocation.b50 > 0 ? 'active' : ''}`}>
                      <span className="bag-size-tag" style={{ background: '#dcfce7', color: '#15803d' }}>
                        50 KG · BULK SACK
                      </span>
                      <h4>Wholesale & Mandi Sack</h4>
                      <div className="bag-count-display">
                        <strong>{bagAllocation.b50}</strong>
                        <small>bags used</small>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                        = {bagAllocation.b50 * 50} kg total
                      </div>
                      <p className="bag-material-note">
                        5-ply cross-laminated woven PP sack with tamper-evident stitch seal for APMC mandi & institutional buyers.
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 11, fontWeight: 800, color: bagAllocation.b50 > 0 ? '#15803d' : '#94a3b8' }}>
                        {bagAllocation.b50 > 0 ? '● IN USE FOR THIS ORDER' : '○ STANDBY'}
                      </div>
                    </div>

                    {/* 20 kg Bag */}
                    <div className={`pc-bag-card ${bagAllocation.b20 > 0 ? 'active' : ''}`}>
                      <span className="bag-size-tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        20 KG · CATERING PACK
                      </span>
                      <h4>Food Service / HoReCa</h4>
                      <div className="bag-count-display">
                        <strong>{bagAllocation.b20}</strong>
                        <small>bags used</small>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
                        = {bagAllocation.b20 * 20} kg total
                      </div>
                      <p className="bag-material-note">
                        Micro-vented high-density woven polypropylene bag for commercial restaurants, canteens, and catering services.
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 11, fontWeight: 800, color: bagAllocation.b20 > 0 ? '#0369a1' : '#94a3b8' }}>
                        {bagAllocation.b20 > 0 ? '● IN USE FOR THIS ORDER' : '○ STANDBY'}
                      </div>
                    </div>

                    {/* 5 kg Bag */}
                    <div className={`pc-bag-card ${bagAllocation.b5 > 0 ? 'active' : ''}`}>
                      <span className="bag-size-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
                        5 KG · FAMILY PACK
                      </span>
                      <h4>Consumer Family Pack</h4>
                      <div className="bag-count-display">
                        <strong>{bagAllocation.b5}</strong>
                        <small>bags used</small>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                        = {bagAllocation.b5 * 5} kg total
                      </div>
                      <p className="bag-material-note">
                        Breathable UV-stabilized kraft paper & woven mesh pouch for retail supermarkets and residential cluster orders.
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 11, fontWeight: 800, color: bagAllocation.b5 > 0 ? '#92400e' : '#94a3b8' }}>
                        {bagAllocation.b5 > 0 ? '● IN USE FOR THIS ORDER' : '○ STANDBY'}
                      </div>
                    </div>

                    {/* 2 kg Bag */}
                    <div className={`pc-bag-card ${bagAllocation.b2 > 0 ? 'active' : ''}`}>
                      <span className="bag-size-tag" style={{ background: '#f1f5f9', color: '#334155' }}>
                        2 KG · D2C POUCH
                      </span>
                      <h4>Direct Consumer Pouch</h4>
                      <div className="bag-count-display">
                        <strong>{bagAllocation.b2}</strong>
                        <small>bags used</small>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        = {bagAllocation.b2 * 2} kg total
                      </div>
                      <p className="bag-material-note">
                        Laser-perforated breathable poly-mesh retail pouch with carrying handle for quick-commerce and home delivery.
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 11, fontWeight: 800, color: bagAllocation.b2 > 0 ? '#334155' : '#94a3b8' }}>
                        {bagAllocation.b2 > 0 ? '● IN USE FOR THIS ORDER' : '○ STANDBY'}
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div style={{ background: '#072618', color: '#ffffff', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#86efac', fontWeight: 800 }}>PACKAGING SUMMARY:</span>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                        Total <b>{bagAllocation.totalBags} Bags</b> ({bagAllocation.b50}×50kg + {bagAllocation.b20}×20kg + {bagAllocation.b5}×5kg + {bagAllocation.b2}×2kg) = <b>{bagAllocation.packedKg} kg packed</b>
                      </div>
                    </div>
                    <span style={{ background: '#22c55e', color: '#072618', padding: '6px 14px', borderRadius: 8, fontWeight: 800, fontSize: 13 }}>
                      ✓ 100% Volume Allocated
                    </span>
                  </div>

                  <button
                    className="primary-btn"
                    style={{ padding: '12px 24px', fontWeight: 800 }}
                    onClick={() => advanceStep(6)}
                  >
                    Confirm Bags Packed & Stitch-Sealed ➔ Advance to Labeling
                  </button>
                </div>
              )}

              {/* Step 7: Labeling */}
              {activeStep === 7 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 8 OF 9 · TRACEABILITY & SERIALIZATION</span>
                      <h2>Tamper-Evident QR & Barcode Bag Labeling</h2>
                    </div>
                    <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>
                      GS1 COMPLIANT LABELS READY
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 16px' }}>
                    Every individual bag receives a serialized barcode and cryptographic QR label containing origin farm, harvest timestamp, precooling core temperature, and destination hub routing.
                  </p>

                  {/* Label Preview Card */}
                  <div className="pc-label-preview-card">
                    <div className="pc-label-details">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: '#15803d', letterSpacing: '0.1em' }}>
                          KRISHI MARG · PACKHOUSE BATCH LABEL
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4 }}>
                          BAG 01 OF {bagAllocation.totalBags}
                        </span>
                      </div>
                      <h4 style={{ margin: '4px 0 2px' }}>{activeCrop} · Grade A Premium</h4>
                      <div style={{ fontSize: 11.5, color: '#496353' }}>
                        Lot Code: <b>{activeLotCode}-A1</b> · Net Wt: <b>50.0 kg</b>
                      </div>
                      <div style={{ fontSize: 11, color: '#566e5f' }}>
                        Packhouse: <b>Shamshabad Central PC #01</b> (FSSAI 13626011000492)
                      </div>
                      <div style={{ fontSize: 11, color: '#566e5f' }}>
                        Origin: <b>{inboundOrigin.split('(')[0]}</b>
                      </div>
                      <div style={{ fontSize: 11, color: '#566e5f' }}>
                        Core Temp: <b>6.0°C</b> · Harvest: <b>Yesterday</b> · Packed: <b>Today</b>
                      </div>
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 4 }}>
                        Destination: Hyderabad Central City Hub (Bowenpally)
                      </div>
                    </div>

                    <div className="pc-label-qr-wrap">
                      {labelQr ? (
                        <img src={labelQr} alt="Bag QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: 10 }}>Generating QR...</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                    <button
                      className="primary-btn"
                      style={{ padding: '12px 24px', fontWeight: 800 }}
                      onClick={() => {
                        setLabelPrinted(true);
                        alert(`Printed ${bagAllocation.totalBags} QR & Barcode serialized labels on industrial thermal printer. All bags labeled & verified.`);
                        advanceStep(7);
                      }}
                    >
                      Print {bagAllocation.totalBags} Bag Labels & Apply ➔ Advance to Dispatch
                    </button>
                    <button
                      className="outline-btn"
                      onClick={() => alert('Barcode scanner verified! Code: ' + activeLotCode + '-A1 matched with central database.')}
                    >
                      Scan & Verify Bag #01 Barcode
                    </button>
                  </div>
                </div>
              )}

              {/* Step 8: Dispatch */}
              {activeStep === 8 && (
                <div>
                  <div className="pc-stage-header">
                    <div>
                      <span className="tiny-label">STEP 9 OF 9 · OUTBOUND COLD TRANSPORT</span>
                      <h2>Outbound Staging & Reefer Dispatch to City Hub</h2>
                    </div>
                    <span className="badge" style={{ background: outboundDispatched ? '#dcfce7' : '#e0f2fe', color: outboundDispatched ? '#15803d' : '#0369a1', fontWeight: 800 }}>
                      {outboundDispatched ? 'DISPATCHED TO CITY HUB' : 'READY FOR OUTBOUND STAGING'}
                    </span>
                  </div>

                  <p style={{ color: '#445b4c', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 16px' }}>
                    Final palletized consignment of labeled produce loaded into secondary reefer vehicle for transit to City Distribution Hub (Bowenpally, Secunderabad).
                  </p>

                  <div className="pc-stage-specs-grid">
                    <div className="pc-spec-box">
                      <small>DESTINATION HUB</small>
                      <strong>Hyderabad Central Hub (Bowenpally)</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Bay 04 Loading Dock · 28 km transit</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>OUTBOUND REEFER VEHICLE</small>
                      <strong>TS-07-UA-9081 (Reefer 3.5T)</strong>
                      <span style={{ fontSize: 11, color: '#688271' }}>Driver: Venkatesh P. (+91 98851 77312)</span>
                    </div>
                    <div className="pc-spec-box">
                      <small>LOAD CONSIGNMENT</small>
                      <strong>4 Shrink-Wrapped Pallets ({bagAllocation.totalBags} Bags)</strong>
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>336 kg net deliverable weight</span>
                    </div>
                  </div>

                  {outboundDispatched ? (
                    <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                      <b style={{ color: '#15803d', fontSize: 15 }}>🚀 Outbound Reefer Dispatched to City Hub!</b>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#275239' }}>
                        Consignment #{activeLotCode}-HUB has left Bay 04. Temperature set to 5.0°C. Live GPS telemetry active. City Hub dispatch board updated.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                      <button
                        className="primary-btn"
                        style={{ padding: '13px 26px', fontWeight: 800, background: '#072618' }}
                        onClick={handleDispatchOutbound}
                      >
                        Dispatch Reefer Truck to City Hub 🚀
                      </button>
                      <button
                        className="outline-btn"
                        onClick={() => alert('Outbound Gate Pass & Consignment Note KM-DS-8819 printed. Seal No: TS-PC01-SEAL-88412.')}
                      >
                        Print Consignment Waybill & Seal Note 🖨️
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* QUICK LINK TO WASTAGE & BAG SIZING */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div
                style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setTab('bags')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ color: '#92400e', fontSize: 14 }}>📦 Bag Size Calculator (2kg, 5kg, 20kg, 50kg)</b>
                  <span style={{ color: '#b45309', fontWeight: 800, fontSize: 12 }}>Open Tool ➔</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#78350f' }}>
                  Dynamically simulate and adjust packaging counts for any custom order or batch weight.
                </p>
              </div>

              <div
                style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 14, padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setTab('waste')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ color: '#9f1239', fontSize: 14 }}>♻️ Wastage Transport to Bio-CNG Facility</b>
                  <span style={{ color: '#be123c', fontWeight: 800, fontSize: 12 }}>Dispatch Vehicle ➔</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#881337' }}>
                  {wastageKg} kg rejects scheduled for transfer to Telangana Agri-Bio CNG & Composting Centre #04.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: INBOUND CC TRANSIT & ETA DETAILED VIEW
            ============================================================ */}
        {tab === 'inbound' && (
          <div>
            <div className="page-title" style={{ marginBottom: 20 }}>
              <span className="tiny-label">COLD CHAIN TRANSPORTATION</span>
              <h1 style={{ margin: '2px 0 0', fontSize: 24, color: '#072618', fontFamily: 'Manrope, sans-serif' }}>
                Inbound Collection Centre Dispatches & Live ETA
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#566e5f' }}>
                Real-time tracking of reefer vehicles dispatched from regional Collection Centres to this Packhouse.
              </p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
                    ACTIVE PRIMARY DISPATCH
                  </span>
                  <h3 style={{ margin: '6px 0 2px', fontSize: 18, color: '#072618' }}>
                    {activeLotCode} · {activeCrop}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: isDocked ? '#15803d' : '#0284c7' }}>
                    {isDocked ? 'Docked at Bay 02' : `~${etaMinutes} Mins`}
                  </div>
                  <small style={{ color: '#657e6e' }}>{isDocked ? 'Arrival Completed' : 'Estimated Time of Arrival'}</small>
                </div>
              </div>

              <div className="pc-inbound-grid">
                <div className="pc-inbound-col">
                  <small>ORIGIN COLLECTION CENTRE</small>
                  <strong style={{ color: '#072618' }}>{inboundOrigin}</strong>
                  <span style={{ color: '#516758' }}>Distance: 38 km total · Corridor: NH-44 / Outer Ring Road</span>
                </div>
                <div className="pc-inbound-col">
                  <small>ORDER SPECIFICATIONS</small>
                  <strong style={{ color: '#072618' }}>{inboundKg} kg (21 Crates)</strong>
                  <span style={{ color: '#516758' }}>Harvest: Yesterday evening · Dispatched: Today 10:42 AM</span>
                </div>
                <div className="pc-inbound-col">
                  <small>REEFER TELEMETRY</small>
                  <strong style={{ color: '#072618' }}>{reeferTemp}°C Cold Chamber</strong>
                  <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Within 4°C - 8°C mandatory threshold</span>
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #edf1ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#4b6152' }}>
                  Carrier: <b>{reeferVehicle}</b> · Driver: <b>{driverContact}</b>
                </div>
                {!isDocked ? (
                  <button className="primary-btn small" onClick={handleDockTruck}>
                    Simulate Vehicle Arrival & Dock Bay 02 🚛
                  </button>
                ) : (
                  <button className="outline-btn small" onClick={() => setTab('pipeline')}>
                    Open 9-Step Processing Pipeline ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: EXPECTED INCOMING PRODUCE QUEUE
            ============================================================ */}
        {tab === 'expected' && (
          <div>
            <div className="page-title" style={{ marginBottom: 20 }}>
              <span className="tiny-label">INBOUND ROSTER</span>
              <h1 style={{ margin: '2px 0 0', fontSize: 24, color: '#072618', fontFamily: 'Manrope, sans-serif' }}>
                Expected Incoming Produce from Regional Collection Centres
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#566e5f' }}>
                Upcoming produce dispatches scheduled to arrive at this Packhouse from various Collection Centres across Telangana.
              </p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 90px 1.1fr 100px 110px 100px', background: '#f4f7f4', padding: '12px 18px', fontWeight: 800, fontSize: 11, color: '#4d6455', borderBottom: '1px solid #e1e8e2' }}>
                <span>COLLECTION CENTRE</span>
                <span>CROP & LOT</span>
                <span>QTY</span>
                <span>REEFER & DRIVER</span>
                <span>TEMP</span>
                <span>ETA</span>
                <span>STATUS</span>
              </div>

              {expectedIncomingQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 90px 1.1fr 100px 110px 100px',
                    padding: '14px 18px',
                    alignItems: 'center',
                    borderBottom: '1px solid #edf1ed',
                    fontSize: 12.5,
                    cursor: 'pointer',
                    background: selectedUpcoming?.id === item.id ? '#f0fdf4' : '#ffffff'
                  }}
                  onClick={() => setSelectedUpcoming(item)}
                >
                  <div>
                    <b style={{ color: '#072618' }}>{item.cc_name}</b>
                    <div style={{ fontSize: 10.5, color: '#657e6e' }}>{item.location}</div>
                  </div>
                  <div>
                    <b>{item.crop}</b>
                    <div style={{ fontSize: 10.5, color: '#657e6e' }}>{item.lot_code}</div>
                  </div>
                  <div>
                    <b style={{ color: '#072618', fontSize: 14 }}>{item.quantity} kg</b>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#274233' }}>{item.reefer_vehicle.split('(')[0]}</div>
                    <div style={{ fontSize: 10.5, color: '#657e6e' }}>{item.driver.split('(')[0]}</div>
                  </div>
                  <div>
                    <span style={{ color: '#15803d', fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                      {item.temp}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, color: '#0369a1' }}>{item.eta}</span>
                    <div style={{ fontSize: 10, color: '#657e6e' }}>Dep: {item.departure_time.split(' ')[0]}</div>
                  </div>
                  <div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: item.status === 'IN TRANSIT' ? '#e0f2fe' : item.status === 'SCHEDULED' ? '#fef3c7' : '#f1f5f9',
                      color: item.status === 'IN TRANSIT' ? '#0369a1' : item.status === 'SCHEDULED' ? '#92400e' : '#475569'
                    }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Upcoming Batch Details */}
            {selectedUpcoming && (
              <div style={{ background: '#f8faf8', border: '1.5px solid #86efac', borderRadius: 14, padding: '18px 22px', marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, color: '#072618' }}>
                    Inbound Pre-Arrival Manifest: {selectedUpcoming.lot_code} ({selectedUpcoming.crop})
                  </h4>
                  <button className="small-btn" style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: '2px 8px' }} onClick={() => setSelectedUpcoming(null)}>✕ Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, fontSize: 12 }}>
                  <div><small style={{ color: '#657e6e', fontWeight: 800 }}>ORIGIN CC:</small><div><b>{selectedUpcoming.cc_name}</b></div></div>
                  <div><small style={{ color: '#657e6e', fontWeight: 800 }}>ESTIMATED REACH (ETA):</small><div style={{ color: '#0284c7', fontWeight: 800 }}>{selectedUpcoming.eta}</div></div>
                  <div><small style={{ color: '#657e6e', fontWeight: 800 }}>CHAMBER TEMP:</small><div style={{ color: '#15803d', fontWeight: 800 }}>{selectedUpcoming.temp}</div></div>
                  <div><small style={{ color: '#657e6e', fontWeight: 800 }}>DRIVER TELEPHONE:</small><div>{selectedUpcoming.driver}</div></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 4: BAG SIZING & CALCULATOR (2kg, 5kg, 20kg, 50kg)
            ============================================================ */}
        {tab === 'bags' && (
          <div>
            <div className="page-title" style={{ marginBottom: 20 }}>
              <span className="tiny-label">PACKAGING SPECIFICATIONS</span>
              <h1 style={{ margin: '2px 0 0', fontSize: 24, color: '#072618', fontFamily: 'Manrope, sans-serif' }}>
                Order-Based Bag Sizing Calculator (2kg, 5kg, 20kg, 50kg)
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#566e5f' }}>
                Calculate and display the exact bag sizes and counts required for any order or deliverable volume.
              </p>
            </div>

            {/* Interactive Calculator Box */}
            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                  <span className="tiny-label">SIMULATE ORDER SIZE</span>
                  <h3 style={{ margin: '2px 0 0', color: '#072618' }}>Enter Order / Batch Quantity</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    value={calcKg}
                    min={1}
                    max={10000}
                    onChange={(e) => setCalcKg(Math.max(1, Number(e.target.value)))}
                    style={{ width: 120, padding: '8px 14px', borderRadius: 8, border: '2px solid #15803d', fontWeight: 800, fontSize: 18, color: '#072618', textAlign: 'center' }}
                  />
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#15803d' }}>KG</span>
                </div>
              </div>

              {/* Mode Switcher */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button
                  style={{ background: bagMode === 'wholesale' ? '#072618' : '#f1f5f2', color: bagMode === 'wholesale' ? '#ffffff' : '#234430', border: '1px solid #d3dfd6', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setBagMode('wholesale')}
                >
                  Wholesale Optimization (50kg ➔ 20kg ➔ 5kg ➔ 2kg)
                </button>
                <button
                  style={{ background: bagMode === 'retail' ? '#072618' : '#f1f5f2', color: bagMode === 'retail' ? '#ffffff' : '#234430', border: '1px solid #d3dfd6', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setBagMode('retail')}
                >
                  Consumer Retail Focus (5kg &amp; 2kg Packs)
                </button>
              </div>

              {/* Presets Row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#688271' }}>COMMON VOLUMES:</span>
                {[20, 50, 100, 200, 336, 420, 500, 800, 1200, 2500].map(amt => (
                  <button
                    key={amt}
                    style={{ background: calcKg === amt ? '#15803d' : '#f8faf8', color: calcKg === amt ? '#fff' : '#234430', border: '1px solid #c7d6cb', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => setCalcKg(amt)}
                  >
                    {amt} kg
                  </button>
                ))}
              </div>

              {/* Bags Grid */}
              <div className="pc-bags-grid">
                {/* 50 kg */}
                <div className={`pc-bag-card ${bagAllocation.b50 > 0 ? 'active' : ''}`}>
                  <span className="bag-size-tag" style={{ background: '#dcfce7', color: '#15803d' }}>
                    50 KG BULK SACK
                  </span>
                  <h4>Wholesale & Mandi Sacks</h4>
                  <div className="bag-count-display">
                    <strong>{bagAllocation.b50}</strong>
                    <small>bags used</small>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>
                    = {bagAllocation.b50 * 50} kg packed
                  </div>
                  <p className="bag-material-note">
                    Heavy-duty woven polypropylene sack with UV coating and tamper-evident lock stitch.
                  </p>
                </div>

                {/* 20 kg */}
                <div className={`pc-bag-card ${bagAllocation.b20 > 0 ? 'active' : ''}`}>
                  <span className="bag-size-tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    20 KG CATERING PACK
                  </span>
                  <h4>HoReCa Food Service</h4>
                  <div className="bag-count-display">
                    <strong>{bagAllocation.b20}</strong>
                    <small>bags used</small>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0369a1' }}>
                    = {bagAllocation.b20 * 20} kg packed
                  </div>
                  <p className="bag-material-note">
                    Micro-vented HDPE sack for commercial catering kitchens, cloud kitchens, and institutional mess.
                  </p>
                </div>

                {/* 5 kg */}
                <div className={`pc-bag-card ${bagAllocation.b5 > 0 ? 'active' : ''}`}>
                  <span className="bag-size-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
                    5 KG FAMILY PACK
                  </span>
                  <h4>Supermarket Family Bag</h4>
                  <div className="bag-count-display">
                    <strong>{bagAllocation.b5}</strong>
                    <small>bags used</small>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
                    = {bagAllocation.b5 * 5} kg packed
                  </div>
                  <p className="bag-material-note">
                    Breathable kraft paper bag with nylon mesh ventilation window and easy-carry handle.
                  </p>
                </div>

                {/* 2 kg */}
                <div className={`pc-bag-card ${bagAllocation.b2 > 0 ? 'active' : ''}`}>
                  <span className="bag-size-tag" style={{ background: '#f1f5f9', color: '#334155' }}>
                    2 KG D2C POUCH
                  </span>
                  <h4>Consumer Direct Pouch</h4>
                  <div className="bag-count-display">
                    <strong>{bagAllocation.b2}</strong>
                    <small>bags used</small>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                    = {bagAllocation.b2 * 2} kg packed
                  </div>
                  <p className="bag-material-note">
                    Laser-perforated breathable poly-mesh retail pouch for rapid doorstep e-commerce delivery.
                  </p>
                </div>
              </div>

              {/* Total Callout */}
              <div style={{ background: '#072618', color: '#ffffff', borderRadius: 12, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#86efac', fontWeight: 800 }}>TOTAL BAGS FOR {calcKg} KG ORDER:</span>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                    {bagAllocation.totalBags} Bags Used ({bagAllocation.packedKg} kg accounted for)
                  </div>
                </div>
                <button
                  className="primary-btn small"
                  style={{ background: '#22c55e', color: '#072618', fontWeight: 800 }}
                  onClick={() => { setTab('pipeline'); setActiveStep(6); }}
                >
                  Apply to Packing Line ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 5: WASTAGE TRANSPORT TO CONCERNED CENTRE (BIO-CNG)
            ============================================================ */}
        {tab === 'waste' && (
          <div>
            <div className="page-title" style={{ marginBottom: 20 }}>
              <span className="tiny-label">ZERO LANDFILL SUSTAINABILITY</span>
              <h1 style={{ margin: '2px 0 0', fontSize: 24, color: '#072618', fontFamily: 'Manrope, sans-serif' }}>
                Wastage Transport to Concerned Facility (Bio-CNG &amp; Composting)
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#566e5f' }}>
                Produce rejects from grading (culls, skin cracks, overripe fruit) are safely segregated and transported to regional green processing plants.
              </p>
            </div>

            {/* Wastage Hero Card */}
            <div className="pc-wastage-card">
              <div className="pc-wastage-top">
                <div>
                  <span style={{ background: '#ffe4e6', color: '#9f1239', fontWeight: 800, fontSize: 11, padding: '3px 8px', borderRadius: 6 }}>
                    CONCERNED RECYCLING FACILITY
                  </span>
                  <h3 style={{ margin: '6px 0 0', fontSize: 20, color: '#881337', fontFamily: 'Manrope, sans-serif' }}>
                    Telangana Agri-Bio CNG &amp; Composting Centre #04
                  </h3>
                  <div style={{ fontSize: 12.5, color: '#9f1239', marginTop: 2 }}>
                    Location: Kandlakoya Industrial Eco-Park, Hyderabad North (TSPCB / CPCB Certified Zero-Waste Hub)
                  </div>
                </div>
                <span className="badge" style={{ background: wastageDispatched ? '#dcfce7' : '#ffe4e6', color: wastageDispatched ? '#15803d' : '#9f1239', fontWeight: 800 }}>
                  {wastageDispatched ? 'DISPATCHED TO BIO-CNG PLANT' : 'STAGED FOR BIO-HAUL'}
                </span>
              </div>

              <div className="pc-wastage-details-grid">
                <div className="pc-spec-box" style={{ background: '#ffffff', borderColor: '#fecdd3' }}>
                  <small style={{ color: '#9f1239' }}>CURRENT BATCH REJECTS</small>
                  <strong style={{ color: '#be123c', fontSize: 20 }}>{wastageKg} kg</strong>
                  <span style={{ fontSize: 11, color: '#9f1239' }}>5.0% cull rate from Lot {activeLotCode}</span>
                </div>
                <div className="pc-spec-box" style={{ background: '#ffffff', borderColor: '#fecdd3' }}>
                  <small style={{ color: '#9f1239' }}>ACCUMULATED STAGED BIOMASS</small>
                  <strong style={{ color: '#be123c', fontSize: 20 }}>{wastageKg + 124} kg</strong>
                  <span style={{ fontSize: 11, color: '#9f1239' }}>Total daily packhouse rejects</span>
                </div>
                <div className="pc-spec-box" style={{ background: '#ffffff', borderColor: '#fecdd3' }}>
                  <small style={{ color: '#9f1239' }}>DEDICATED BIO-CARRIER</small>
                  <strong style={{ color: '#072618', fontSize: 16 }}>TS-09-UB-8819</strong>
                  <span style={{ fontSize: 11, color: '#4b6152' }}>Sealed Organic Tipper · Mallesh G.</span>
                </div>
              </div>

              {/* Conversion Output Highlights */}
              <div style={{ background: '#ffffff', border: '1px solid #fecdd3', borderRadius: 12, padding: '16px 20px', margin: '18px 0' }}>
                <b style={{ color: '#881337', fontSize: 13 }}>Sustainable Circular Economy Conversion:</b>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                  <div>
                    <span style={{ color: '#15803d', fontWeight: 800, fontSize: 12 }}>⚡ 65% Biogas Generation (Bio-CNG)</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#4b6152' }}>
                      Anaerobic digestion produces clean compressed biogas used to fuel green agricultural delivery vehicles.
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#854d0e', fontWeight: 800, fontSize: 12 }}>🌱 35% Organic Humus Fertilizer</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#4b6152' }}>
                      Digestate slurry is enriched and bagged as organic microbial compost for local farmers to replenish soil carbon.
                    </p>
                  </div>
                </div>
              </div>

              {wastageDispatched ? (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', borderRadius: 12, padding: '16px 20px' }}>
                  <b style={{ color: '#15803d', fontSize: 15 }}>✓ Bio-Waste Carrier Dispatched to Composting Centre!</b>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#275239' }}>
                    Vehicle TS-09-UB-8819 is en route to Kandlakoya Eco-Park. CPCB Form 4 Green Waybill #WM-2026-TS-089 filed. Zero organic waste sent to landfill.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    className="primary-btn"
                    style={{ background: '#be123c', borderColor: '#be123c', padding: '12px 24px', fontWeight: 800 }}
                    onClick={handleDispatchWastage}
                  >
                    Dispatch Bio-Waste Carrier to Bio-CNG Plant 🚛
                  </button>
                  <button
                    className="outline-btn"
                    onClick={() => alert('CPCB Green Waybill #WM-2026-TS-089 generated. Certified for anaerobic digestion.')}
                  >
                    View Disposal Certificate & Manifest 📄
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: CITY HUB REDIRECTION & BALANCING PROTOCOL
            ============================================================ */}
        {tab === 'hub_redirect' && (
          <div className="pc-step-content-card">
            <div className="step-content-head">
              <div>
                <span className="step-phase-kicker">PACKAGE CENTRE TO CITY HUB BALANCING PROTOCOL</span>
                <h3>Regional Redirection, Inter-PC Transfer & Demand Balancing</h3>
                <p>
                  Hierarchical 4-step dispatch protocol: Balances inter-PC supply deficits, forwards surplus based on City Hub demand forecast, commits pre-orders, and packs remaining produce into 2kg and 5kg standard bags.
                </p>
              </div>
            </div>

            {/* 4-Step Allocation Architecture Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, margin: '20px 0' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '14px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Step a · Inter-Direct</span>
                <h4 style={{ margin: '4px 0 6px', fontSize: 14, color: '#0f172a' }}>Inter-PC Transfer</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  Redirects supply deficits between adjacent Package Centres (e.g. 60 kg transferred to Patancheru Cold PC #02).
                </p>
              </div>

              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Step b · Surplus Forward</span>
                <h4 style={{ margin: '4px 0 6px', fontSize: 14, color: '#072618' }}>Demand Forecast Routing</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#354a3e', lineHeight: 1.4 }}>
                  Forwards surplus beyond preorders to City Hubs with higher demand index (Bowenpally 95/100, Kukatpally 88/100).
                </p>
              </div>

              <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 12, padding: '14px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#a16207', textTransform: 'uppercase' }}>Step c · Last-Mile Trigger</span>
                <h4 style={{ margin: '4px 0 6px', fontSize: 14, color: '#713f12' }}>Vehicle Assignment</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#854d0e', lineHeight: 1.4 }}>
                  In City Hub, orders are taken and vehicles assigned. Consumer instantly receives ETA notification on assignment.
                </p>
              </div>

              <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 12, padding: '14px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase' }}>Step d · Express Packing</span>
                <h4 style={{ margin: '4px 0 6px', fontSize: 14, color: '#581c87' }}>2kg & 5kg Instant Packs</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#6b21a8', lineHeight: 1.4 }}>
                  Surplus after preorders is sealed in 2kg and 5kg bags for instant customer ordering (min 2kg order enforced).
                </p>
              </div>
            </div>

            {/* City Hub Proximity, Capacity & Demand Forecast Allocation Table */}
            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#072618' }}>Hyderabad City Hub Capacity & Demand Routing</h4>
                  <small style={{ color: '#68786f' }}>Automatic redirection based on proximity, live capacity headroom, and forecast demand index</small>
                </div>
                <span style={{ background: '#e0f2fe', color: '#0284c7', fontWeight: 800, fontSize: 11, padding: '4px 10px', borderRadius: 6 }}>
                  ALGORITHM: PROXIMITY-WEIGHTED CAPACITY FEFO
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f4f8f5', borderBottom: '1.5px solid #d7e4db', textAlign: 'left', color: '#274332' }}>
                    <th style={{ padding: '10px 12px' }}>City Hub</th>
                    <th style={{ padding: '10px 12px' }}>Proximity</th>
                    <th style={{ padding: '10px 12px' }}>Total Capacity</th>
                    <th style={{ padding: '10px 12px' }}>Used Capacity</th>
                    <th style={{ padding: '10px 12px' }}>Demand Index</th>
                    <th style={{ padding: '10px 12px' }}>Surplus Allocation</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eef3f0' }}>
                    <td style={{ padding: '12px' }}><b>Bowenpally Central Hub #01</b></td>
                    <td style={{ padding: '12px' }}>18 km (North Corridor)</td>
                    <td style={{ padding: '12px' }}>12,000 kg</td>
                    <td style={{ padding: '12px' }}>8,880 kg (74%)</td>
                    <td style={{ padding: '12px' }}><b style={{ color: '#15803d' }}>95 / 100 · High</b></td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>140 kg Assigned</span></td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#15803d', fontWeight: 700 }}>● Primary Route</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eef3f0' }}>
                    <td style={{ padding: '12px' }}><b>Kukatpally West Hub #03</b></td>
                    <td style={{ padding: '12px' }}>29 km (West IT Corridor)</td>
                    <td style={{ padding: '12px' }}>10,000 kg</td>
                    <td style={{ padding: '12px' }}>8,100 kg (81%)</td>
                    <td style={{ padding: '12px' }}><b style={{ color: '#15803d' }}>88 / 100 · High</b></td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>80 kg Assigned</span></td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#15803d', fontWeight: 700 }}>● High Priority</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eef3f0' }}>
                    <td style={{ padding: '12px' }}><b>Gaddiannaram South Hub #02</b></td>
                    <td style={{ padding: '12px' }}>24 km (South Corridor)</td>
                    <td style={{ padding: '12px' }}>8,500 kg</td>
                    <td style={{ padding: '12px' }}>5,270 kg (62%)</td>
                    <td style={{ padding: '12px' }}><b style={{ color: '#d97706' }}>72 / 100 · Medium</b></td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>40 kg Assigned</span></td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#b45309', fontWeight: 700 }}>● Balanced Inflow</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px' }}><b>Mehdipatnam Hub #04</b></td>
                    <td style={{ padding: '12px' }}>34 km (South-West)</td>
                    <td style={{ padding: '12px' }}>7,500 kg</td>
                    <td style={{ padding: '12px' }}>6,825 kg (91%)</td>
                    <td style={{ padding: '12px' }}><b style={{ color: '#64748b' }}>65 / 100 · Low Headroom</b></td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>16 kg Allocated</span></td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#64748b', fontWeight: 700 }}>● Diverted Surplus</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Surplus 2kg & 5kg Pack Allocation Panel */}
            <div style={{ background: '#fdfbf7', border: '1.5px solid #fef08a', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase' }}>
                    STEP D PROTOCOL · SURPLUS EXPRESS PACKING
                  </span>
                  <h4 style={{ margin: '4px 0 2px', fontSize: 16, color: '#713f12' }}>
                    Standard 2kg & 5kg Bagging for Instant Ordering (96 kg Surplus)
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#854d0e' }}>
                    Surplus remaining beyond committed preorders is automatically bagged into 2kg and 5kg formats for same-day doorstep instant booking.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                    <b style={{ fontSize: 18, color: '#713f12', display: 'block' }}>28 Bags</b>
                    <small style={{ fontSize: 10, color: '#a16207' }}>× 2kg Pack (56 kg)</small>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                    <b style={{ fontSize: 18, color: '#713f12', display: 'block' }}>8 Bags</b>
                    <small style={{ fontSize: 10, color: '#a16207' }}>× 5kg Pack (40 kg)</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons for Forwarding and Dispatch */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="primary-btn"
                style={{ padding: '12px 22px', fontWeight: 800 }}
                onClick={() => alert('Inter-PC Direct Transfer Executed: 60 kg Tomato dispatched to Patancheru Cold PC #02 via Reefer Shuttle TS-08-KL-3390. Local deficit resolved!')}
              >
                Execute Inter-PC Balancing Transfer (60 kg) ⇄
              </button>
              <button
                className="primary-btn"
                style={{ background: '#0284c7', borderColor: '#0284c7', padding: '12px 22px', fontWeight: 800 }}
                onClick={() => alert('Surplus Forwarded: 276 kg produce forwarded to high-demand City Hubs (Bowenpally Central #01 & Kukatpally West #03) via Reefer TS-07-UA-9081.')}
              >
                Forward Surplus to High-Demand City Hubs 🚀
              </button>
              <button
                className="outline-btn"
                onClick={() => alert('Preorder Commitment Confirmed: 180 kg allocated to verified customer pre-orders. City Hub last-mile delivery vehicles notified for assignment.')}
              >
                Commit Pre-Orders & Notify City Hubs 📋
              </button>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

function CityHubApp({
  user,
  refresh,
  bump,
  signout,
}: {
  user: any;
  refresh: number;
  bump: () => void;
  signout: () => void;
}) {
  const [tab, setTab] = useState<'capacity' | 'dispatch' | 'surplus' | 'balancing' | 'coldstorage'>('capacity');
  const [orders, setOrders] = useState<any[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<Record<number, { vehicle: string; driver: string; eta: string }>>({
    101: { vehicle: 'TS-09-UB-4412 (Electric Reefer Van)', driver: 'Mahesh Rao (+91 98492 55102)', eta: '~32 mins' }
  });
  const [notificationSentMsg, setNotificationSentMsg] = useState<string>('');
  const [compostDispatched, setCompostDispatched] = useState<boolean>(false);
  const [interHubTransferred, setInterHubTransferred] = useState<boolean>(false);

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data)).catch(() => {});
  }, [refresh]);

  // Central Hub Capacity & Regional Metrics
  const centralHubCapacity = 12000;
  const centralHubUsed = 8880;
  const centralHubHeadroom = centralHubCapacity - centralHubUsed;
  const centralHubUtilPercent = Math.round((centralHubUsed / centralHubCapacity) * 100);

  const regionalHubs = [
    { id: 'CH-01', name: 'Bowenpally Central Hub #01', distance: '18 km from PC', capacity: 12000, used: 8880, demandIndex: 95, demandLevel: 'High Demand', stock: 3120, status: 'Active Hub · Primary' },
    { id: 'CH-02', name: 'Gaddiannaram South Hub #02', distance: '24 km from PC', capacity: 8500, used: 5270, demandIndex: 72, demandLevel: 'Medium Demand', stock: 3230, status: 'Inflow Balanced' },
    { id: 'CH-03', name: 'Kukatpally West Hub #03', distance: '29 km from PC', capacity: 10000, used: 8100, demandIndex: 88, demandLevel: 'High Demand', stock: 1900, status: 'High Inflow' },
    { id: 'CH-04', name: 'Mehdipatnam Hub #04', distance: '34 km from PC', capacity: 7500, used: 6825, demandIndex: 65, demandLevel: 'Low Headroom', stock: 675, status: 'Stock Shortage' }
  ];

  // Inbound Shipments from Package Centres
  const inboundShipments = [
    { code: 'SH-PC-0921', from: 'Shamshabad Cold PC #01 (Bay 2)', crop: 'Tomato (Roma Hybrid)', qty: 336, grade: 'A', vehicle: 'TS-07-UA-9081 (Reefer 2.5T)', temp: '5.2°C', eta: '12 mins', status: 'ARRIVING' },
    { code: 'SH-PC-0928', from: 'Medchal Central PC #02', crop: 'Onion (Nasik Red)', qty: 580, grade: 'A', vehicle: 'AP-29-BA-1102 (Reefer 3.0T)', temp: '6.8°C', eta: '34 mins', status: 'IN TRANSIT' },
    { code: 'SH-PC-0935', from: 'Patancheru Cold PC #03', crop: 'Potato (Kufri Jyoti)', qty: 450, grade: 'B (Discount)', vehicle: 'TS-08-EF-9943 (Reefer 1.5T)', temp: '7.4°C', eta: '1 hr 10 mins', status: 'DISPATCHED' }
  ];

  // Surplus 2kg and 5kg Pack Sizing Staged in Hub for Instant Ordering
  const surplusInventory = [
    { id: 'SP-01', crop: 'Tomato (Grade A Premium)', p2kg: 28, p5kg: 8, totalKg: 96, bagsCount: 36, rate: 32, status: 'Ready for Instant Dispatch' },
    { id: 'SP-02', crop: 'Tomato (Grade B Value Corner · 25% Off)', p2kg: 20, p5kg: 4, totalKg: 60, bagsCount: 24, rate: 24, status: 'Discount Corner Ready' },
    { id: 'SP-03', crop: 'Onion (Grade A Premium)', p2kg: 22, p5kg: 12, totalKg: 104, bagsCount: 34, rate: 38, status: 'Ready for Instant Dispatch' },
    { id: 'SP-04', crop: 'Onion (Grade B Value Corner · 25% Off)', p2kg: 15, p5kg: 6, totalKg: 60, bagsCount: 21, rate: 28, status: 'Discount Corner Ready' },
    { id: 'SP-05', crop: 'Potato (Grade A Premium)', p2kg: 30, p5kg: 10, totalKg: 110, bagsCount: 40, rate: 28, status: 'Ready for Instant Dispatch' },
  ];

  // Last-Mile Customer Order Queue
  const hubOrdersList = [
    { id: 101, customer: 'Ananya Rao', address: 'Banjara Hills, Hyderabad', crop: 'Tomato', qty: 4, packType: '2 × 2kg Packs (4 kg)', orderType: 'Instant Express (Min 2kg)', grade: 'Grade A', status: assignedOrders[101] ? 'VEHICLE_ASSIGNED' : 'PENDING_DISPATCH', vehicle: assignedOrders[101]?.vehicle || null, eta: assignedOrders[101]?.eta || null },
    { id: 102, customer: 'Vikram Mehta', address: 'Madhapur, Hitec City', crop: 'Tomato (Grade B Discount)', qty: 5, packType: '1 × 5kg Family Pack (5 kg)', orderType: 'Instant Express (Min 2kg)', grade: 'Grade B (25% Off)', status: assignedOrders[102] ? 'VEHICLE_ASSIGNED' : 'PENDING_DISPATCH', vehicle: assignedOrders[102]?.vehicle || null, eta: assignedOrders[102]?.eta || null },
    { id: 103, customer: 'Pooja Reddy', address: 'Jubilee Hills, Hyderabad', crop: 'Onion', qty: 10, packType: '2 × 5kg Packs (10 kg)', orderType: 'Instant Express (Min 2kg)', grade: 'Grade A', status: assignedOrders[103] ? 'VEHICLE_ASSIGNED' : 'PENDING_DISPATCH', vehicle: assignedOrders[103]?.vehicle || null, eta: assignedOrders[103]?.eta || null },
    { id: 104, customer: 'Suresh Kumar', address: 'Gachibowli, Hyderabad', crop: 'Tomato', qty: 25, packType: 'Aggregated Pre-Order (25 kg)', orderType: 'Farm Pre-Order', grade: 'Grade A/B', status: assignedOrders[104] ? 'VEHICLE_ASSIGNED' : 'PENDING_DISPATCH', vehicle: assignedOrders[104]?.vehicle || null, eta: assignedOrders[104]?.eta || null },
    ...orders.map((o: any) => ({
      id: o.id,
      customer: o.customer_id === 2 ? 'Ananya Rao' : `Consumer #${o.customer_id}`,
      address: o.destination || 'Hyderabad Local',
      crop: o.crop,
      qty: o.quantity,
      packType: o.quantity <= 5 ? `${o.quantity} kg Standard Pack` : `Bulk / Aggregated (${o.quantity} kg)`,
      orderType: o.quantity <= 5 ? 'Instant Express (Min 2kg)' : 'Farm Pre-Order',
      grade: o.grade_preference || 'Grade A',
      status: assignedOrders[o.id] ? 'VEHICLE_ASSIGNED' : (o.status === 'MATCHED' ? 'PENDING_DISPATCH' : o.status),
      vehicle: assignedOrders[o.id]?.vehicle || null,
      eta: assignedOrders[o.id]?.eta || null
    }))
  ];

  // Vehicle Assignment Action with Customer Notification
  const handleAssignVehicle = async (orderId: number, customerName: string, cropName: string) => {
    const vehicles = [
      { plate: 'TS-09-UB-4412 (EV Reefer Van)', driver: 'Mahesh Rao (+91 98492 55102)', eta: '~32 mins' },
      { plate: 'TS-10-CD-8819 (Cold Delivery E-Bike)', driver: 'K. Naveen (+91 97001 22910)', eta: '~24 mins' },
      { plate: 'AP-29-EE-3341 (Mini Reefer 1.0T)', driver: 'R. Shekhar (+91 99881 77362)', eta: '~40 mins' }
    ];
    const picked = vehicles[Math.floor(Math.random() * vehicles.length)];

    setAssignedOrders(prev => ({
      ...prev,
      [orderId]: { vehicle: picked.plate, driver: picked.driver, eta: picked.eta }
    }));

    try {
      await api.post('/logistics/assign-driver', { driver_id: 4 }).catch(() => {});
    } catch (e) {}

    const alertMsg = `Vehicle ${picked.plate} assigned to Order #${orderId} for ${customerName}! Live notification sent to consumer with ETA ${picked.eta}.`;
    setNotificationSentMsg(alertMsg);
    alert(alertMsg);
    bump();
  };

  // End of Business Cold Storage Batches
  const coldStorageBatches = [
    { id: 'CS-TOM-104', crop: 'Tomato (Grade A)', qty: 42, storedHours: 14, freshness: 88, temp: '3.6°C', maxLifeHours: 72, expired: false },
    { id: 'CS-ONI-108', crop: 'Onion (Grade A)', qty: 68, storedHours: 20, freshness: 92, temp: '3.5°C', maxLifeHours: 120, expired: false },
    { id: 'CS-POT-112', crop: 'Potato (Grade B Discount)', qty: 55, storedHours: 18, freshness: 86, temp: '3.8°C', maxLifeHours: 140, expired: false },
    { id: 'CS-TOM-099', crop: 'Tomato (Grade B Discount)', qty: 24, storedHours: 76, freshness: 46, temp: '3.7°C', maxLifeHours: 72, expired: true },
    { id: 'CS-SPN-088', crop: 'Spinach / Palak', qty: 18, storedHours: 38, freshness: 42, temp: '3.6°C', maxLifeHours: 36, expired: true },
  ];

  const totalExpiredKg = coldStorageBatches.filter(b => b.expired).reduce((acc, b) => acc + b.qty, 0);

  const handleCompostDispatch = () => {
    setCompostDispatched(true);
    alert(`Bio-Waste Carrier TS-09-UB-8819 dispatched to Telangana Agri-Bio CNG & Composting Centre #04! ${totalExpiredKg} kg of expired shelf-life produce diverted from landfill to anaerobic digestion compost.`);
  };

  const handleInterHubBalance = () => {
    setInterHubTransferred(true);
    alert('Inter-Hub Balancing Active: 80 kg Tomato stock transferred from Gaddiannaram Hub #02 to Mehdipatnam Hub #04 to eliminate local shortage. +₹40 cross-hub distance surcharge applied to routed orders.');
  };

  return (
    <Shell
      role="hub"
      active={tab}
      signout={signout}
      onSelect={(id: any) => setTab(id)}
      customRoleLabel="City Hub Dispatch"
      customRoleIcon="⌖"
      navItems={[
        { id: 'capacity', label: 'Capacity & Inflow Telemetry', icon: '📊' },
        { id: 'dispatch', label: 'Orders & Vehicle Dispatch', icon: '🚚' },
        { id: 'surplus', label: 'Surplus 2kg/5kg Staging', icon: '📦' },
        { id: 'balancing', label: 'Inter-Hub Redirection & Fees', icon: '⇄' },
        { id: 'coldstorage', label: 'Cold Storage & Bio-CNG', icon: '❄️' }
      ]}
    >
      <Top
        title="Hyderabad Central City Hub #01"
        subtitle="Bowenpally Distribution Centre · Real-Time Capacity & Last-Mile Dispatch"
        signout={signout}
      >
        <span className="station-clock">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </Top>

      <div className="station-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>
        
        {/* Real-time Notification Banner if an order was just assigned */}
        {notificationSentMsg && (
          <div className="notification-banner-live">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🔔</span>
              <div>
                <b style={{ fontSize: 14 }}>Consumer Notification Triggered Live!</b>
                <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.9 }}>{notificationSentMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setNotificationSentMsg('')}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================
            TAB: CAPACITY & INFLOW TELEMETRY
            ============================================================ */}
        {tab === 'capacity' && (
          <div>
            {/* Capacity Meter Panel */}
            <div className="hub-capacity-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="tiny-label" style={{ color: '#15803d' }}>BOWENPALLY CENTRAL HUB · ACTIVE STORAGE METRICS</span>
                  <h2 style={{ margin: '4px 0 2px', fontSize: 22, color: '#072618' }}>Hub Capacity Utilization: {centralHubUtilPercent}%</h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#4b6152' }}>
                    {centralHubUsed.toLocaleString()} kg stored of {centralHubCapacity.toLocaleString()} kg max capacity · <b>{centralHubHeadroom.toLocaleString()} kg headroom available</b>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 12, padding: '6px 14px', borderRadius: 20 }}>
                    HEADROOM: {centralHubHeadroom.toLocaleString()} KG
                  </span>
                </div>
              </div>

              <div className="hub-capacity-gauge">
                <div className="hub-capacity-fill" style={{ width: `${centralHubUtilPercent}%` }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#66776b' }}>
                <span>0 kg</span>
                <span>Safety Buffer: 2,000 kg</span>
                <span>Current: 8,880 kg (74%)</span>
                <span>Max: 12,000 kg</span>
              </div>
            </div>

            {/* Regional Network Grid */}
            <h3 style={{ fontSize: 16, color: '#072618', margin: '24px 0 12px' }}>
              Hyderabad Regional City Hub Network (Proximity & Demand Matrix)
            </h3>
            <div className="hub-network-grid">
              {regionalHubs.map(h => (
                <div className={`hub-network-card ${h.id === 'CH-01' ? 'selected' : ''}`} key={h.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: h.id === 'CH-01' ? '#15803d' : '#4b6152' }}>{h.id}</span>
                    <span style={{ fontSize: 10, background: h.demandIndex > 80 ? '#dcfce7' : '#fef3c7', color: h.demandIndex > 80 ? '#15803d' : '#b45309', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                      Demand {h.demandIndex}/100
                    </span>
                  </div>
                  <b style={{ fontSize: 14, color: '#072618', margin: '4px 0 2px' }}>{h.name}</b>
                  <span style={{ fontSize: 12, color: '#55665a' }}>📍 {h.distance}</span>
                  <div style={{ margin: '8px 0 4px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Capacity:</span>
                    <b>{h.used} / {h.capacity} kg</b>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((h.used / h.capacity) * 100)}%`, background: h.used / h.capacity > 0.85 ? '#ef4444' : '#10b981' }}></div>
                  </div>
                  <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 4 }}>● {h.status}</span>
                </div>
              ))}
            </div>

            {/* Live Inbound from Package Centres */}
            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 14, padding: '20px', marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#072618' }}>Active Inbound Dispatches from Package Centres</h4>
                  <small style={{ color: '#68786f' }}>Cold-chain reefer shipments redirected to Bowenpally Central Hub</small>
                </div>
                <span style={{ background: '#ecfdf5', color: '#15803d', fontWeight: 800, fontSize: 11, padding: '4px 10px', borderRadius: 6 }}>
                  3 SHIPMENTS IN TRANSIT
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f4f8f5', borderBottom: '1.5px solid #d7e4db', textAlign: 'left', color: '#274332' }}>
                    <th style={{ padding: '10px 12px' }}>Shipment</th>
                    <th style={{ padding: '10px 12px' }}>Origin PC</th>
                    <th style={{ padding: '10px 12px' }}>Produce & Grade</th>
                    <th style={{ padding: '10px 12px' }}>Quantity</th>
                    <th style={{ padding: '10px 12px' }}>Reefer Vehicle</th>
                    <th style={{ padding: '10px 12px' }}>Temp</th>
                    <th style={{ padding: '10px 12px' }}>ETA to Hub</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inboundShipments.map(s => (
                    <tr key={s.code} style={{ borderBottom: '1px solid #eef3f0' }}>
                      <td style={{ padding: '12px' }}><b>{s.code}</b></td>
                      <td style={{ padding: '12px' }}>{s.from}</td>
                      <td style={{ padding: '12px' }}>{s.crop} <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>Grade {s.grade}</span></td>
                      <td style={{ padding: '12px' }}><b>{s.qty} kg</b></td>
                      <td style={{ padding: '12px' }}>{s.vehicle}</td>
                      <td style={{ padding: '12px' }}><b style={{ color: '#0284c7' }}>{s.temp}</b></td>
                      <td style={{ padding: '12px' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>{s.eta}</span></td>
                      <td style={{ padding: '12px' }}><span style={{ color: '#15803d', fontWeight: 700 }}>● {s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: ORDERS & LAST-MILE VEHICLE DISPATCH
            ============================================================ */}
        {tab === 'dispatch' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <span className="tiny-label" style={{ color: '#15803d' }}>LAST-MILE FULFILLMENT & DISPATCH DESK</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 22, color: '#072618' }}>City Hub Orders & Vehicle Assignment</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4b6152' }}>
                  Assign delivery vehicles to customer shipments. As soon as a vehicle is assigned, the customer receives a real-time notification with ETA.
                </p>
              </div>
              <button
                className="primary-btn"
                onClick={() => {
                  api.get('/orders').then(r => setOrders(r.data)).catch(() => {});
                  bump();
                }}
              >
                ↻ Refresh Orders
              </button>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f4f8f5', borderBottom: '1.5px solid #d7e4db', textAlign: 'left', color: '#274332' }}>
                    <th style={{ padding: '12px 14px' }}>Order ID</th>
                    <th style={{ padding: '12px 14px' }}>Customer & Destination</th>
                    <th style={{ padding: '12px 14px' }}>Produce</th>
                    <th style={{ padding: '12px 14px' }}>Pack Type & Size</th>
                    <th style={{ padding: '12px 14px' }}>Order Type</th>
                    <th style={{ padding: '12px 14px' }}>Assigned Vehicle & ETA</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hubOrdersList.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #eef3f0' }}>
                      <td style={{ padding: '12px 14px' }}><b>#{String(o.id).padStart(5, '0')}</b></td>
                      <td style={{ padding: '12px 14px' }}>
                        <b>{o.customer}</b>
                        <div style={{ fontSize: 11, color: '#68786f' }}>📍 {o.address}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <b>{o.crop}</b>
                        <div><span style={{ fontSize: 10, background: o.grade.includes('B') ? '#fef3c7' : '#dcfce7', color: o.grade.includes('B') ? '#b45309' : '#15803d', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>{o.grade}</span></div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          {o.packType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: o.orderType.includes('Instant') ? '#0284c7' : '#15803d' }}>
                          {o.orderType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {o.vehicle ? (
                          <div>
                            <b style={{ color: '#0369a1', fontSize: 12 }}>{o.vehicle}</b>
                            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 800 }}>ETA: {o.eta}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: o.status === 'VEHICLE_ASSIGNED' ? '#dcfce7' : '#fef3c7',
                          color: o.status === 'VEHICLE_ASSIGNED' ? '#15803d' : '#b45309',
                          fontWeight: 800,
                          fontSize: 10.5,
                          padding: '3px 8px',
                          borderRadius: 6
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {o.status === 'VEHICLE_ASSIGNED' ? (
                          <span style={{ color: '#15803d', fontWeight: 800, fontSize: 12 }}>✓ Dispatched</span>
                        ) : (
                          <button
                            className="primary-btn small"
                            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 800 }}
                            onClick={() => handleAssignVehicle(o.id, o.customer, o.crop)}
                          >
                            Assign Vehicle & Dispatch 🚚
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: SURPLUS 2KG / 5KG STAGING
            ============================================================ */}
        {tab === 'surplus' && (
          <div>
            <div style={{ background: '#fdfbf7', border: '1.5px solid #fef08a', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
              <span className="tiny-label" style={{ color: '#a16207' }}>
                PROTOCOL REQUIREMENT: PRODUCE REMAINING AFTER PRE-ORDERS
              </span>
              <h2 style={{ margin: '4px 0 6px', fontSize: 22, color: '#713f12' }}>
                Surplus Staged in Standard 2kg & 5kg Packs
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#854d0e', lineHeight: 1.5 }}>
                Even after pre-orders are committed, all remaining surplus produce from Package Centres is automatically sealed into 2kg and 5kg packs. These packs are held in climate-controlled staging for instant express ordering with minimum 2kg threshold.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {surplusInventory.map(item => (
                <div key={item.id} style={{ background: '#ffffff', border: '1.5px solid #dce4dd', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: item.crop.includes('Discount') ? '#b45309' : '#15803d' }}>
                      {item.crop.includes('Discount') ? 'GRADE B · 25% DISCOUNT' : 'GRADE A · PREMIUM'}
                    </span>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>
                      ₹{item.rate}/kg
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#072618' }}>{item.crop}</h3>
                  <div style={{ display: 'flex', gap: 10, margin: '6px 0' }}>
                    <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <b style={{ fontSize: 16, color: '#0f172a' }}>{item.p2kg} Bags</b>
                      <small style={{ display: 'block', fontSize: 10, color: '#64748b' }}>2kg Standard ({item.p2kg * 2} kg)</small>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <b style={{ fontSize: 16, color: '#0f172a' }}>{item.p5kg} Bags</b>
                      <small style={{ display: 'block', fontSize: 10, color: '#64748b' }}>5kg Family ({item.p5kg * 5} kg)</small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>Total Staged: <b>{item.totalKg} kg</b></span>
                    <span style={{ color: '#15803d', fontWeight: 700 }}>● {item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: INTER-HUB REDIRECTION & BALANCING
            ============================================================ */}
        {tab === 'balancing' && (
          <div>
            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 14, padding: '22px', marginBottom: 20 }}>
              <span className="tiny-label" style={{ color: '#0284c7' }}>MULTI-HUB SHORTAGE FALLBACK ALGORITHM</span>
              <h2 style={{ margin: '4px 0 6px', fontSize: 22, color: '#072618' }}>
                Inter-Hub Balancing & Distance Surcharges
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#4b6152', lineHeight: 1.5 }}>
                When the local warehouse has stock, produce is redirected directly to the consumer with standard delivery (₹25). If a shortage occurs, the algorithm checks nearby City Hubs. If available, the <b>"NO STOCK"</b> tag is removed and updated with an increased delivery fee (+₹40 distance surcharge). If the customer confirms, stock is routed directly from that hub. If all hubs are exhausted, a <b>"NO STOCK"</b> tag is shown.
              </p>
            </div>

            {/* Fallback Matrix Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>🟢</span>
                  <b style={{ color: '#15803d', fontSize: 14 }}>Case 1: Local Stock Available</b>
                </div>
                <p style={{ fontSize: 12, color: '#275239', margin: '0 0 8px' }}>
                  Local Bowenpally Hub has stock (Tomato, Onion, Potato).
                </p>
                <div style={{ background: '#ffffff', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div>Delivery Fee: <b>₹25 (Standard Express)</b></div>
                  <div>ETA: <b>30–40 mins</b></div>
                  <div>Tag: <span style={{ color: '#15803d', fontWeight: 800 }}>In Stock (Local Hub)</span></div>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>🟡</span>
                  <b style={{ color: '#b45309', fontSize: 14 }}>Case 2: Shortage ➔ Nearby Hub</b>
                </div>
                <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 8px' }}>
                  Local hub out of stock, but Gaddiannaram Hub #02 (14 km) has stock.
                </p>
                <div style={{ background: '#ffffff', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div>Delivery Fee: <b style={{ color: '#b45309' }}>₹65 (₹25 + ₹40 Surcharge)</b></div>
                  <div>NO STOCK tag: <b style={{ color: '#15803d' }}>REMOVED</b></div>
                  <div>Tag: <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>Sourced from Nearby Hub #02</span></div>
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>🔴</span>
                  <b style={{ color: '#b91c1c', fontSize: 14 }}>Case 3: All Hubs Exhausted</b>
                </div>
                <p style={{ fontSize: 12, color: '#7f1d1d', margin: '0 0 8px' }}>
                  Zero inventory across all 4 regional City Hubs in Hyderabad.
                </p>
                <div style={{ background: '#ffffff', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div>Status: <b style={{ color: '#b91c1c' }}>Order Disabled</b></div>
                  <div>Tag Displayed: <span style={{ background: '#ef4444', color: '#ffffff', fontWeight: 900, padding: '2px 8px', borderRadius: 4 }}>NO STOCK</span></div>
                  <div>Alternative: <b>Prompt user to Farm Pre-Order</b></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="primary-btn"
                style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 800 }}
                onClick={handleInterHubBalance}
              >
                Simulate Inter-Hub Shortage Rebalance (80 kg) ⇄
              </button>
              {interHubTransferred && (
                <span style={{ background: '#ecfdf5', color: '#15803d', fontWeight: 800, fontSize: 12, padding: '10px 14px', borderRadius: 8 }}>
                  ✓ 80 kg Tomato stock transferred from Hub #02 to eliminate local shortage!
                </span>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: COLD STORAGE (3.6°C) & COMPOSTING / BIO-CNG
            ============================================================ */}
        {tab === 'coldstorage' && (
          <div>
            {/* Cold Room Telemetry */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: 16, padding: '24px', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em' }}>
                    END-OF-BUSINESS PRESERVATION CHAMBER · ROOM #03
                  </span>
                  <h2 style={{ margin: '4px 0 2px', fontSize: 24, color: '#ffffff' }}>
                    Controlled Atmosphere Cold Storage (3.6°C)
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                    Unsold produce at the end of each business day is transferred to cold rooms to maintain turgidity and suspend respiration.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>CHAMBER TEMP</span>
                    <b style={{ fontSize: 22, color: '#38bdf8' }}>3.6°C</b>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>HUMIDITY</span>
                    <b style={{ fontSize: 22, color: '#4ade80' }}>92% RH</b>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>ETHYLENE SCRUBBER</span>
                    <b style={{ fontSize: 22, color: '#a78bfa' }}>ACTIVE</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Shelf-Life Batches Table */}
            <div style={{ background: '#ffffff', border: '1px solid #dce4dd', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#072618' }}>Batch Shelf-Life Tracking & FEFO Monitor</h4>
                  <small style={{ color: '#68786f' }}>Produce exceeding allowable shelf-life is diverted to composting/bio-CNG</small>
                </div>
                <span style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: 11, padding: '4px 10px', borderRadius: 6 }}>
                  {totalExpiredKg} KG EXPIRED SHELF-LIFE
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f4f8f5', borderBottom: '1.5px solid #d7e4db', textAlign: 'left', color: '#274332' }}>
                    <th style={{ padding: '10px 12px' }}>Batch Code</th>
                    <th style={{ padding: '10px 12px' }}>Crop</th>
                    <th style={{ padding: '10px 12px' }}>Quantity</th>
                    <th style={{ padding: '10px 12px' }}>Stored Time</th>
                    <th style={{ padding: '10px 12px' }}>Freshness</th>
                    <th style={{ padding: '10px 12px' }}>Shelf-Life Window</th>
                    <th style={{ padding: '10px 12px' }}>Storage Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coldStorageBatches.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #eef3f0', background: b.expired ? '#fff1f2' : 'transparent' }}>
                      <td style={{ padding: '12px' }}><b>{b.id}</b></td>
                      <td style={{ padding: '12px' }}>{b.crop}</td>
                      <td style={{ padding: '12px' }}><b>{b.qty} kg</b></td>
                      <td style={{ padding: '12px' }}>{b.storedHours} hrs in 3.6°C</td>
                      <td style={{ padding: '12px' }}>
                        <b style={{ color: b.freshness > 70 ? '#15803d' : '#b91c1c' }}>{b.freshness}/100</b>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {b.expired ? (
                          <span style={{ color: '#b91c1c', fontWeight: 800 }}>EXPIRED (Limit {b.maxLifeHours}h)</span>
                        ) : (
                          <span style={{ color: '#15803d' }}>{b.maxLifeHours - b.storedHours} hrs remaining</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {b.expired ? (
                          <span style={{ background: '#ef4444', color: '#ffffff', fontSize: 10.5, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>
                            REDIRECT TO BIO-CNG / COMPOST
                          </span>
                        ) : (
                          <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>
                            OPTIMAL COLD PRESERVATION
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Zero Landfill Composting Protocol Banner */}
            <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', borderRadius: 14, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <b style={{ color: '#15803d', fontSize: 16 }}>🌱 Zero-Landfill Composting & Bio-CNG Protocol</b>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#275239', maxWidth: 750 }}>
                    Any produce crossing allowable shelf-life is segregated from edible inventory and dispatched directly to Telangana Agri-Bio CNG & Composting Centre #04 (Kandlakoya Eco-Park). Organic slurry is enriched and distributed to local farmers to regenerate soil carbon.
                  </p>
                </div>

                {compostDispatched ? (
                  <div style={{ background: '#ffffff', border: '1.5px solid #15803d', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontWeight: 800, fontSize: 13 }}>
                    ✓ Bio-Carrier Dispatched! CPCB Waybill #WM-2026-CH-042 Generated.
                  </div>
                ) : (
                  <button
                    className="primary-btn"
                    style={{ background: '#15803d', borderColor: '#15803d', padding: '12px 20px', fontWeight: 800 }}
                    onClick={handleCompostDispatch}
                  >
                    Dispatch {totalExpiredKg} kg Expired Produce to Bio-CNG ♻️
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

function StationApp({type,signout,bump}:{type:'collection'|'package'|'hub';user:any;refresh:number;signout:()=>void;bump:()=>void}){
  const [ships,setShips]=useState<Shipment[]>([]); const [lots,setLots]=useState<any[]>([]); const [selected,setSelected]=useState<any>(null)
  useEffect(()=>{api.get('/shipments').then(r=>setShips(r.data));api.get('/lots').then(r=>setLots(r.data))},[bump])
  const config={collection:{title:'Receiving station',sub:'Scan · inspect · handoff',tabs:['RECEIVING QUEUE','INSPECTION']},package:{title:'Pack house',sub:'Inbound · packing · outbound',tabs:['INBOUND','PACKING','READY TO SHIP']},hub:{title:'City hub dispatch',sub:'Arrivals · FEFO · last mile',tabs:['ARRIVING','AT HUB','READY','DISPATCHED']}}[type]
  async function inspect(){if(!selected)return;await api.post('/inspection',{lot_id:selected.lot_id,actual_grade:'B',visible_quality:'Good — downgraded after inspection',accepted_qty:selected.quantity,rejected_qty:0,notes:'Grade change demo: A → B'});alert('Grade changed A → B. Backend recalculated linked order pricing and created notification.');bump()}
  async function handoff(id:number){await api.post(`/shipments/${id}/handoff`);bump()}
  async function assign(id:number){await api.post(`/shipments/${id}/assign-driver`,{});alert('Compatible driver request created.');bump()}
  return <Shell role={type} active="ops" signout={signout} navItems={[{id:'ops',label:config.tabs[0],icon:'▣'},{id:'trace',label:'Traceability',icon:'⌁'},{id:'alerts',label:'Alerts',icon:'!'}]}><Top title={config.title} subtitle={config.sub} signout={signout}><span className="station-clock">{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></Top><div className="station-page"><div className="station-banner"><div><span className="tiny-label">OPERATIONS QUEUE</span><h1>{type==='collection'?'Receiving today':type==='package'?'Packhouse workload':'Dispatch board'}</h1></div><div className="queue-count">{ships.length}<small>active loads</small></div></div>{type==='collection'&&<div style={{background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'12px 18px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center'}}><div><b style={{color:'#15803d', fontSize:13}}>🚚 Cold-Chain Reefer Dispatch: Collection Centre ➔ Package Centre (PC)</b><div style={{color:'#4b6152', fontSize:11.5, marginTop:2}}>Dispatches inspected produce to Central Packhouse via temperature-controlled reefer vehicles (4°C - 8°C).</div></div><span style={{background:'#dcfce7', color:'#15803d', fontWeight:800, fontSize:11, padding:'4px 10px', borderRadius:6}}>COLD CHAIN ACTIVE</span></div>}<div className="station-layout"><div className="queue-panel"><div className="queue-head"><b>LOAD / LOT</b><span>QTY</span><span>GRADE</span><span>STAGE</span><span>ACTION</span></div>{ships.map(s=><button className={`queue-row ${selected?.id===s.id?'selected':''}`} key={s.id} onClick={()=>setSelected(s)}><div><b>{s.lot_code}</b><span>{s.crop}</span></div><span>{s.quantity} kg</span><span className={`grade grade-${s.grade}`}>{s.grade}</span><span>{s.stage}</span><span>Open →</span></button>)}</div><div className="station-side">{selected?<><span className="tiny-label">{selected.code}</span><h2>{selected.crop} · {selected.quantity} kg</h2><div className="lot-id-box"><span>INTERNAL LOT QR</span><b>{selected.lot_code}</b><small>No Aadhaar / sensitive identity stored</small></div><div className="side-actions">{type==='collection'&&<><button className="primary-btn wide" onClick={inspect}>INSPECT · CHANGE TO B</button><button className="outline-btn wide" onClick={()=>alert('QR scanner ready. Use the generated lot QR on the Farmer/Traceability screen.')}>SCAN LOT QR</button><button className="primary-btn wide" style={{background:'#0284c7', borderColor:'#0284c7', marginTop:8}} onClick={async ()=>{if(!selected){alert('Please select a load from the queue first.');return;}try {await assign(selected.id);await handoff(selected.id);alert(`Produce dispatched to Package Centre! Reefer truck assigned (4°C - 8°C). Lot moved to PACKAGING.`);} catch(e:any) {alert('Dispatched to Package Centre! Lot moved to PACKAGING.');bump();}}}>DISPATCH TO PACKAGE CENTRE (PC) 🚚</button></>}{type==='package'&&<><button className="primary-btn wide" onClick={()=>handoff(selected.id)}>CONFIRM PACK + HANDOFF</button><button className="outline-btn wide" onClick={()=>assign(selected.id)}>CREATE NEXT LEG</button></>}{type==='hub'&&<><div className="fefo-alert">FEFO PRIORITY · Freshness {selected.freshness}/100</div><button className="primary-btn wide" onClick={()=>handoff(selected.id)}>DISPATCH NEXT LEG</button><button className="outline-btn wide" onClick={()=>assign(selected.id)}>ASSIGN LAST-MILE DRIVER</button></>}</div></>:<div className="station-empty">Select a load from the queue.<br/><small>The right panel becomes the operational action surface.</small></div>}</div></div></div></Shell>
}

function AdminApp({signout,bump}:{user:any;refresh:number;signout:()=>void;bump:()=>void}){
 const [dash,setDash]=useState<any>(null); const [ships,setShips]=useState<Shipment[]>([]); const [clusters,setClusters]=useState<any[]>([]); const [view,setView]=useState('control'); const [forecast,setForecast]=useState<any[]>([])
 useEffect(()=>{load()},[bump])
 async function load(){const [d,s,c,f]=await Promise.all([api.get('/analytics/dashboard'),api.get('/shipments'),api.get('/demand'),api.get('/analytics/forecast/demand')]);setDash(d.data);setShips(s.data);setClusters(c.data);setForecast(f.data.forecast)}
 async function aggregate(){await api.post('/demand/aggregate');await api.post('/demand/match');load()}
 async function optimize(id:number){const r=await api.post('/routes/optimize',{shipment_id:id});alert(`Route optimized: ${r.data.original_km} km → ${r.data.optimized_km} km · utilization ${r.data.utilization}%`)}
 if(!dash)return <div className="loading">Opening control tower…</div>
 return <Shell role="admin" active={view} signout={signout} navItems={[{id:'control',label:'Control tower',icon:'◈'},{id:'demand',label:'Supply & demand',icon:'⇄'},{id:'shipments',label:'Shipment board',icon:'▤'},{id:'analytics',label:'Analytics',icon:'◒'}]}><Top title="Logistics control tower" subtitle="Hyderabad network · all values marked demo are simulated" signout={signout}><button className="refresh-btn" onClick={load}>↻ Refresh</button><span className="demo-pill">DEMO / SIMULATED</span></Top>{view==='control'&&<div className="control-tower"><div className="kpi-strip">{[['Orders',dash.kpis.orders_today],['Active shipments',dash.kpis.active_shipments],['Farmers',dash.kpis.farmers],['Drivers online',dash.kpis.drivers_online],['Vehicles free',dash.kpis.vehicles_available],['At-risk lots',dash.kpis.at_risk_lots],['Delayed',dash.kpis.delayed_shipments],['On-time',dash.kpis.on_time+'%']].map(([a,b])=><div key={String(a)}><span>{a}</span><b>{b}</b></div>)}</div><div className="tower-grid"><div className="big-map"><div className="panel-head"><div><span className="tiny-label">LIVE NETWORK MAP</span><h2>Movement across Hyderabad</h2></div><span className="map-legend">● drivers　◆ hubs　○ orders</span></div><LiveMap shipment={ships[0]} all={ships}/></div><div className="alerts-panel"><div className="panel-head"><div><span className="tiny-label">ATTENTION</span><h2>Operations alerts</h2></div></div>{[['HIGH','Lot LOT-KM-98231 freshness window narrowing'],['MED','Driver acceptance pending for next leg'],['INFO','Demand aggregation ready to run'],['INFO','Temperature within safe range']].map(([lvl,t])=><div className="alert-row" key={t}><span className={`alert-level ${lvl}`}>{lvl}</span><div><b>{t}</b><small>Updated just now · demo signal</small></div></div>)}</div></div><div className="lower-grid"><div className="panel"><div className="panel-head"><div><span className="tiny-label">DEMAND ENGINE</span><h2>Aggregate before dispatch</h2></div><button className="primary-btn small" onClick={aggregate}>Run aggregation + match</button></div><div className="demand-table">{clusters.slice(0,5).map(c=><div key={c.id}><b>{c.crop}</b><span>{c.destination}</span><strong>{c.quantity} kg</strong><em>{c.matched} matched</em></div>)}</div></div><div className="panel"><div className="panel-head"><div><span className="tiny-label">FRESHNESS</span><h2>Risk distribution</h2></div></div><div className="chart-box"><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={dash.freshness} dataKey="count" nameKey="risk" innerRadius={52} outerRadius={72}><Cell/><Cell/><Cell/></Pie><Tooltip/></PieChart></ResponsiveContainer><div className="pie-label"><b>{dash.freshness.reduce((a:any,x:any)=>a+x.count,0)}</b><span>lots tracked</span></div></div></div></div></div>}
 {view==='demand'&&<div className="analytics-page"><div className="page-title"><span className="tiny-label">GLOBAL ALLOCATION</span><h1>Supply vs demand</h1><p>Shortages and surpluses are calculated from database records.</p></div><div className="chart-panel"><ResponsiveContainer width="100%" height={320}><BarChart data={dash.demand_by_crop}><XAxis dataKey="crop"/><YAxis/><Tooltip/><Bar dataKey="quantity" name="Demand (kg)"/></BarChart></ResponsiveContainer></div><div className="forecast-grid">{forecast.map(f=><div className="forecast-card" key={f.crop}><span>{f.crop}</span><b>{f.tomorrow} kg</b><small>tomorrow · {f.next_3_days} kg next 3 days</small></div>)}</div></div>}
 {view==='shipments'&&<div className="shipment-board"><div className="board-title"><div><span className="tiny-label">LIVE FULFILMENT</span><h1>Shipment board</h1></div></div><div className="kanban">{['BOOKED','MATCHED','PICKUP','COLLECTION','PACKAGING','HUB','LAST_MILE','DELIVERED'].map(stage=><div className="kanban-col" key={stage}><h3>{stage}</h3>{ships.filter(s=>s.stage===stage).map(s=><div className="ship-card" key={s.id}><b>{s.code}</b><span>{s.crop} · {s.quantity} kg</span><span>Grade {s.grade} · Fresh {s.freshness}</span><small>{s.driver}</small><button onClick={()=>optimize(s.id)}>Optimize route</button></div>)}</div>)}</div></div>}
 {view==='analytics'&&<div className="analytics-page"><div className="page-title"><span className="tiny-label">NETWORK PERFORMANCE</span><h1>What the network is doing</h1></div><div className="charts-grid"><div className="chart-panel"><h3>Orders / day</h3><ResponsiveContainer width="100%" height={250}><LineChart data={dash.orders_by_day}><XAxis dataKey="day"/><YAxis/><Tooltip/><Line type="monotone" dataKey="orders"/></LineChart></ResponsiveContainer></div><div className="chart-panel"><h3>Demand by crop</h3><ResponsiveContainer width="100%" height={250}><BarChart data={dash.demand_by_crop}><XAxis dataKey="crop"/><YAxis/><Tooltip/><Bar dataKey="quantity"/></BarChart></ResponsiveContainer></div></div><div className="metric-row">{[['Vehicle utilization','86%'],['Empty km','−18%'],['Logistics cost/kg','₹4.90'],['Demand fulfilment','92%'],['Driver acceptance','84%'],['On-time delivery',dash.kpis.on_time+'%']].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b><small>DEMO KPI</small></div>)}</div></div>}</Shell>
}

function LiveMap({shipment,all=[]}:{shipment?:Shipment|null;all?:Shipment[]}){
 const defaultCenter:[number,number]=[17.40,78.46]
 const points=shipment?[[17.385,78.486],[shipment.lat,shipment.lng],[17.494,78.399]] as [number,number][]:[] 
 return <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom={false} className="map"><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{points.length>1&&<Polyline positions={points}/>} {(all.length?all:(shipment?[shipment]:[])).map(s=><Marker key={s.id} position={[s.lat,s.lng]}><Popup><b>{s.code}</b><br/>{s.crop} · {s.quantity} kg<br/>{s.stage}</Popup></Marker>)}</MapContainer>
}

export default App
