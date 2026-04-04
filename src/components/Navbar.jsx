import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Car, User } from "lucide-react";
import "../styles/Navbar.css";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <Car size={25} /> SmartPark
      </NavLink>

      <ul className="navbar-links">
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/availability">Availability</NavLink></li>
        <li><NavLink to="/history">History</NavLink></li>
        <li><NavLink to="/edit">My Cards</NavLink></li>
        {user?.role === "admin" && (
          <li><NavLink to="/admin">Dashboard</NavLink></li>
        )}
      </ul>

      <div className="navbar-user">
        <NavLink to="/profile" className="navbar-username">
          <User size={14} />
          <span>{user?.name}</span>
        </NavLink>
      </div>
    </nav>
  );
}
