import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout({
  children,
  title,
  subtitle,
  role
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  role: string;
}) {
  return (
    <div className="app-shell">

      <Sidebar role={role} />

      <div className="main-area">

        <Topbar title={title} />

        <main className="page-content">

          {subtitle && (
            <div className="page-heading">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          )}

          {children}

        </main>

      </div>

    </div>
  );
}