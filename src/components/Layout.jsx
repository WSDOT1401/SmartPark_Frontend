import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/Layout.css";

export default function Layout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}
