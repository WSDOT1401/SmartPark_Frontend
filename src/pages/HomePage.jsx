import { useAuth } from "../contexts/AuthContext";
import { CreditCard, Building2, Car, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

export default function HomePage() {
  const { user } = useAuth();

  // Gather unique programs from user's cards
  const programs = [
    ...new Map(
      (user.cards || [])
        .filter((c) => c.program)
        .map((c) => [c.program.program_id, c.program])
    ).values(),
  ];

  return (
    <div className="home-page">
      {/* ── Header row ── */}
      <div className="home-header">
        <div>
          <h2>Welcome back, {user.name}</h2>
          <p className="home-subtitle">{(user.vehicles || []).length} vehicles linked</p>
        </div>
        <div className="home-quick-stats">
          <div className="quick-stat">
            <CreditCard size={18} />
            <div>
              <span className="qs-value">{(user.cards || []).length}</span>
              <span className="qs-label">Cards</span>
            </div>
          </div>
          <div className="quick-stat">
            <Building2 size={18} />
            <div>
              <span className="qs-value">{programs.length}</span>
              <span className="qs-label">Programs</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="home-grid">
        {/* Left: Cards */}
        <section className="home-section">
          <h3><CreditCard size={14} style={{ color: "#c9a84c" }} /> Your Cards</h3>
          <div className="cards-stack">
            {(user.cards || []).map((card) => (
              <div key={card.card_id} className="card-item">
                <div className="card-top">
                  <span className="brand">{card.network}</span>
                  <span className="family-badge">
                    {card.program ? `${card.program.provider_name} — ${card.program.tier}` : "No Program"}
                  </span>
                </div>
                <div className="last_four">•••• •••• •••• {card.last_four}</div>
                <span className="label">{card.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Privilege Programs */}
        <section className="home-section">
          <h3><Building2 size={14} style={{ color: "#c9a84c" }} /> Privilege Programs</h3>
          <div className="malls-grid">
            {programs.map((prog) => (
              <div key={prog.program_id} className="mall-chip">
                <div className="mall-name">{prog.provider_name}</div>
                <div className="mall-address">{prog.tier}</div>
                <span className="family-tag">Max {prog.max_vehicles} vehicles</span>
              </div>
            ))}
            {programs.length === 0 && (
              <p className="empty-state">No privilege programs linked yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* ── Quick actions ── */}
      <div className="home-actions">
        <Link to="/availability" className="action-card">
          <Car size={20} />
          <div>
            <span className="action-title">Find Parking</span>
            <span className="action-desc">View live availability</span>
          </div>
        </Link>
        <Link to="/history" className="action-card">
          <Clock size={20} />
          <div>
            <span className="action-title">History</span>
            <span className="action-desc">Past parking sessions</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
