import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Car, LogOut } from "lucide-react";
import "../styles/Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <Car size={25} /> SmartPark
      </NavLink>

      <ul className="navbar-links">
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/availability">Availability</NavLink></li>
        <li><NavLink to="/history">History</NavLink></li>
        <li><NavLink to="/edit">Edit Profile</NavLink></li>
        {user?.role === "admin" && (
          <li><NavLink to="/admin">Dashboard</NavLink></li>
        )}
      </ul>

      <div className="navbar-user">
        <span>{user?.name}</span>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </nav>
  );
}
