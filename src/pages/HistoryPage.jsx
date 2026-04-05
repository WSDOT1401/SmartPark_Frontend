import { useState, useEffect } from "react";
import { api } from "../services/api";
import "../styles/History.css";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api("/api/users/parking/history").then((data) => setHistory(data || []));
  }, []);

  return (
    <div className="history-page">
      <h2>Parking History</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mall</th>
            <th>Spot</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>{h.date}</td>
              <td>{h.mall}</td>
              <td>{h.spot}</td>
              <td>{h.entryTime}</td>
              <td>{h.exitTime}</td>
              <td>{h.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
