import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import "../styles/Admin.css";

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api("/api/admin/logs").then((data) => setLogs(data || []));
  }, []);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !search ||
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.plate.toLowerCase().includes(search.toLowerCase()) ||
        log.mall.toLowerCase().includes(search.toLowerCase());
      const matchesDate = !dateFilter || log.date === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [logs, search, dateFilter]);

  const totalSessions = logs.length;
  const uniqueUsers = new Set(logs.map((l) => l.user)).size;

  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>
      <p className="admin-subtitle">Overview of all parking sessions</p>

      {/* ── Quick stats ── */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="stat-number">{totalSessions}</div>
          <div className="stat-desc">Total Sessions</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-number">{uniqueUsers}</div>
          <div className="stat-desc">Unique Users</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="admin-filters">
        <input
          placeholder="Search user, plate, or mall..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      {/* ── Logs table ── */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Plate</th>
            <th>Mall</th>
            <th>Spot</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((log) => (
            <tr key={log.id}>
              <td>{log.date}</td>
              <td>{log.user}</td>
              <td>{log.plate}</td>
              <td>{log.mall}</td>
              <td>{log.spot}</td>
              <td>{log.entryTime}</td>
              <td>{log.exitTime}</td>
              <td>{log.cost}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "#555" }}>
                No matching records.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
