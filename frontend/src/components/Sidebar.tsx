import React from "react";

export default function Sidebar({ role }: { role: string }) {

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <div className="sidebar-logo">
          🌿
        </div>

        <div>
          <strong>Krishi Marg</strong>
          <small>From Farms to Markets</small>
        </div>
      </div>

      <div className="sidebar-role">
        {role.toUpperCase()}
      </div>

      <nav className="sidebar-nav">

        <button className="sidebar-item active">
          <span>⌂</span>
          Dashboard
        </button>

        <button className="sidebar-item">
          <span>▣</span>
          Incoming Shipments
        </button>

        <button className="sidebar-item">
          <span>⚙</span>
          Processing
        </button>

        <button className="sidebar-item">
          <span>◆</span>
          Grading & Quality
        </button>

        <button className="sidebar-item">
          <span>▦</span>
          Packaging
        </button>

        <button className="sidebar-item">
          <span>🚚</span>
          Dispatch
        </button>

        <button className="sidebar-item">
          <span>▤</span>
          Inventory
        </button>

        <button className="sidebar-item">
          <span>▥</span>
          Reports
        </button>

      </nav>

      <div className="sidebar-bottom">

        <div className="sidebar-status">
          <span className="online-dot"></span>
          System Online
        </div>

        <div className="sidebar-footer">
          Fresh Produce
          <br />
          Efficient Supply
          <br />
          Stronger India
        </div>

      </div>

    </aside>
  );
}