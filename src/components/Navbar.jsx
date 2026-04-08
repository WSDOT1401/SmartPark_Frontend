import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Car, User, Menu, X } from "lucide-react";
import "../styles/Navbar.css";

export default function Navbar() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <Car size={25} /> SmartPark
      </NavLink>

      {/* Hamburger toggle */}
      <button
        className="navbar-toggle"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Backdrop */}
      {menuOpen && <div className="navbar-backdrop" onClick={closeMenu} />}

      <div className={`navbar-menu ${menuOpen ? "open" : ""}`}>
        <ul className="navbar-links">
          {user?.role === "USER" && (
            <>
              <li><NavLink to="/" onClick={closeMenu}>Home</NavLink></li>
              <li><NavLink to="/availability" onClick={closeMenu}>Availability</NavLink></li>
              <li><NavLink to="/history" onClick={closeMenu}>History</NavLink></li>
              <li><NavLink to="/edit" onClick={closeMenu}>My Cards</NavLink></li>
            </>
          )}
          {user?.role === "ADMIN" && (
            <>
              <li><NavLink to="/admin" onClick={closeMenu}>Dashboard</NavLink></li>
              <li><NavLink to="/admin/parking" onClick={closeMenu}>Parking</NavLink></li>
              <li><NavLink to="/admin/parking-creator" onClick={closeMenu}>Lot Creator</NavLink></li>
            </>
          )}
        </ul>

        <div className="navbar-user">
          <NavLink to="/profile" className="navbar-username" onClick={closeMenu}>
            <User size={14} />
            <span>{user?.name}</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
