import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Building2, Car, Clock, MapPin, CircleDot, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import "../styles/Home.css";

export default function HomePage() {
  const { user } = useAuth();
  const [lots, setLots] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  /* Fetch parking lots */
  useEffect(() => {
    api("/api/parking/lots")
      .then((data) => setLots(data || []))
      .catch(() => {})
      .finally(() => setLoadingLots(false));
  }, []);

  /* Fetch active sessions for each user vehicle */
  useEffect(() => {
    const vehicles = user.vehicles || [];
    if (!vehicles.length) {
      setLoadingSessions(false);
      return;
    }
    Promise.all(
      vehicles.map((v) =>
        api(
          `/api/parking/session?registration=${encodeURIComponent(v.registration)}&province=${encodeURIComponent(v.province)}`
        )
          .then((s) => (s ? { ...s, registration: v.registration, province: v.province } : null))
          .catch(() => null)
      )
    )
      .then((results) => setSessions(results.filter(Boolean)))
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, [user.vehicles]);

  /* Unique privilege programs from user's cards */
  const programs = useMemo(() => [
    ...new Map(
      (user.cards || [])
        .filter((c) => c.program)
        .map((c) => [c.program.program_id, c.program])
    ).values(),
  ], [user.cards]);

  /* Set of program_ids the user holds */
  const userProgramIds = useMemo(
    () => new Set(programs.map((p) => p.program_id)),
    [programs]
  );

  /* Group lots by mall, filtered to only those matching user's programs */
  const malls = useMemo(() => {
    const eligible = lots.filter((lot) => {
      const lotProgId =
        lot.program_id || (lot.program && lot.program.program_id);
      return lotProgId && userProgramIds.has(lotProgId);
    });
    const map = {};
    eligible.forEach((lot) => {
      const name =
        lot.mall_name ||
        (lot.mall && typeof lot.mall === "object"
          ? lot.mall.mall_name || lot.mall.name
          : lot.mall) ||
        "Unknown Mall";
      if (!map[name]) map[name] = { name, lots: [] };
      map[name].lots.push(lot);
    });
    return Object.values(map);
  }, [lots, userProgramIds]);

  /* Format duration from entry_time to now */
  const formatDuration = (entryTime) => {
    const diff = Date.now() - new Date(entryTime).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  };

  return (
    <div className="home-page">
      {/* ── Header row ── */}
      <div className="home-header">
        <div>
          <h2>Welcome back, {user.name}</h2>
          <p className="home-subtitle">
            {(user.vehicles || []).length} vehicles linked
          </p>
        </div>
        <div className="home-quick-stats">
          <div className="quick-stat">
            <ShieldCheck size={18} />
            <div>
              <span className="qs-value">{programs.length}</span>
              <span className="qs-label">Privileges</span>
            </div>
          </div>
          <div className="quick-stat">
            <Car size={18} />
            <div>
              <span className="qs-value">{sessions.length}</span>
              <span className="qs-label">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Parking Session ── */}
      <section className="home-section session-section">
        <h3>
          <CircleDot size={14} style={{ color: "#2ecc71" }} /> Active Parking
        </h3>
        {loadingSessions ? (
          <p className="empty-state">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="empty-state">No active parking sessions.</p>
        ) : (
          <div className="sessions-list">
            {sessions.map((s, i) => (
              <div key={s.session_id || i} className="session-card">
                <div className="session-indicator" />
                <div className="session-info">
                  <div className="session-top">
                    <span className="session-plate">
                      {s.registration} ({s.province})
                    </span>
                    <span className="session-duration">
                      <Clock size={12} /> {formatDuration(s.entry_time)}
                    </span>
                  </div>
                  <div className="session-details">
                    <span>
                      <MapPin size={12} />{" "}
                      {s.mall_name || s.lot_name || `Lot ${s.lot_id}`}
                    </span>
                    {s.slot_label && <span>Spot {s.slot_label}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Your Privileges ── */}
      <section className="home-section">
        <h3>
          <ShieldCheck size={14} style={{ color: "#c9a84c" }} /> Your Privileges
        </h3>
        {programs.length === 0 ? (
          <p className="empty-state">No privileges yet. Add a card to unlock parking benefits.</p>
        ) : (
          <div className="privileges-list">
            {programs.map((prog) => (
              <div key={prog.program_id} className="privilege-chip">
                <div className="privilege-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="privilege-body">
                  <span className="privilege-provider">{prog.provider_name}</span>
                  <span className="privilege-tier">{prog.tier}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Eligible Malls ── */}
      <section className="home-section">
        <h3>
          <Building2 size={14} style={{ color: "#c9a84c" }} /> Eligible Malls
        </h3>
        {loadingLots ? (
          <p className="empty-state">Loading malls…</p>
        ) : malls.length === 0 ? (
          <p className="empty-state">No eligible malls. Link a privilege card to see available parking.</p>
        ) : (
          <div className="malls-grid">
            {malls.map((mall) => (
              <Link
                key={mall.name}
                to="/availability"
                className="mall-chip"
              >
                <div className="mall-icon">
                  <Building2 size={20} />
                </div>
                <div className="mall-body">
                  <div className="mall-name">{mall.name}</div>
                  <div className="mall-address">
                    {mall.lots.length} parking{" "}
                    {mall.lots.length === 1 ? "lot" : "lots"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

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
