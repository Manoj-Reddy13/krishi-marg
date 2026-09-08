import React from "react";

export default function Topbar({ title }: { title: string }) {
  return (
    <header className="topbar">

      <div className="topbar-left">

        <div className="topbar-logo">
          <div className="logo-leaf">🌿</div>

          <div>
            <strong>Krishi Marg</strong>
            <small>From Farms to Markets</small>
          </div>
        </div>

        <div className="topbar-page">
          <h1>{title}</h1>
          <p>Fresh Produce • Better Value • Less Waste</p>
        </div>

      </div>

      <div className="topbar-right">

        <div className="topbar-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search orders, lots..."
          />
        </div>

        <button className="notification-btn" type="button">
          🔔
          <span>3</span>
        </button>

        <div className="topbar-user">

          <div className="user-avatar">
            👤
          </div>

          <div className="user-info">
            <strong>Krishi Marg User</strong>
            <small>Operations</small>
          </div>

        </div>

        <div className="topbar-date">
          <strong>
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}
          </strong>

          <small>Krishi Marg</small>
        </div>

      </div>

    </header>
  );
}