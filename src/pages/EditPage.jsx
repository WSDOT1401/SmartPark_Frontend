import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { CreditCard, ChevronRight, Plus } from "lucide-react";
import "../styles/Edit.css";

export default function EditPage() {
  const { user } = useAuth();

  return (
    <div className="edit-page">
      <h2>My Cards</h2>
      <p className="edit-subtitle">
        Select a card to view and edit linked vehicles.
      </p>
      
      <div className="card-list">
        {(user.cards || []).map((card) => {
          const vehicleCount = (user.vehicles || []).filter(
            (v) => (v.cards || []).some((c) => String(c.card_id) === String(card.card_id))
          ).length;
          return (
            <Link
              key={card.card_id}
              to={`/edit/card/${card.card_id}`}
              className="card-list-item"
            >
              <div className="card-list-icon">
                <CreditCard size={24} />
              </div>
              <div className="card-list-info">
                <span className="card-list-brand">
                  {card.network} •••• •••• •••• {card.last_four}
                </span>
                <span className="card-list-label">
                  {card.program ? `${card.program.provider_name} — ${card.program.tier}` : card.label}
                </span>
                <span className="card-list-vehicles">
                  {vehicleCount} vehicle
                  {vehicleCount !== 1 ? "s" : ""} linked
                </span>
              </div>
              <ChevronRight size={20} className="card-list-arrow" />
            </Link>
          );
        })}
      </div>

      <Link to="/edit/add-card" className="btn-add-card">
        <Plus size={18} />
        Add New Card
      </Link>
    </div>
  );
}
