import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { ArrowLeft, Car, Trash2, Plus } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/Edit.css";

export default function CardDetailPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { user, refreshCards, refreshVehicles } = useAuth();

  const card = user.cards.find((c) => String(c.card_id) === String(cardId));

  const [vehicles, setVehicles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    registration: "",
    province: "",
    brand: "",
    model: "",
    color: "",
  });
  const [confirm, setConfirm] = useState({ open: false, variant: "danger", title: "", message: "", onConfirm: null });

  // Load vehicles for this card from the user's vehicles list
  useEffect(() => {
    if (user.vehicles) {
      setVehicles(user.vehicles.filter((v) => (v.cards || []).some((c) => String(c.card_id) === String(cardId))));
    }
  }, [user.vehicles, cardId]);

  const maxVehicles = card?.program?.max_vehicles || 0;
  const atLimit = maxVehicles > 0 && vehicles.length >= maxVehicles;

  if (!card) {
    return (
      <div className="edit-page">
        <h2>Card not found</h2>
        <button className="btn-back" onClick={() => navigate("/edit")}>
          <ArrowLeft size={18} /> Back to Cards
        </button>
      </div>
    );
  }

  const handleVehicleChange = (idx, field, value) => {
    setVehicles((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVehicle = (idx) => {
    const v = vehicles[idx];
    setConfirm({
      open: true,
      variant: "danger",
      title: "Delete Vehicle",
      message: `Are you sure you want to delete "${v.registration}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api(`/api/users/vehicles/${v.vehicle_id}`, { method: "DELETE" });
          await refreshVehicles();
        } catch (err) {
          alert(err.message);
        }
      },
    });
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.registration.trim()) return;
    try {
      await api("/api/users/vehicles", {
        method: "POST",
        body: { ...newVehicle, card_id: cardId },
      });
      await refreshVehicles();
      setNewVehicle({ registration: "", province: "", brand: "", model: "", color: "" });
      setAdding(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveVehicle = (v) => {
    setConfirm({
      open: true,
      variant: "warning",
      title: "Save Changes",
      message: `Save changes to vehicle "${v.registration}"?`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        setSaving(true);
        try {
          await api(`/api/users/vehicles/${v.vehicle_id}`, {
            method: "PUT",
            body: {
              registration: v.registration,
              province: v.province,
              brand: v.brand,
              model: v.model,
              color: v.color,
              card_id: cardId,
            },
          });
          await refreshVehicles();
        } catch (err) {
          alert(err.message);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  return (
    <div className="edit-page">
      <button className="btn-back" onClick={() => navigate("/edit")}>
        <ArrowLeft size={18} /> Back to Cards
      </button>

      <div className="card-detail-header">
        <h2>
          {card.network} •••• •••• •••• {card.last_four}
        </h2>
        <span className="card-detail-label">{card.label}</span>
        {card.program && (
          <span className="card-detail-program">
            {card.program.provider_name} — {card.program.tier}
          </span>
        )}
      </div>

      <div className="edit-section">
        <h3>
          Linked Vehicles
          {maxVehicles > 0 && (
            <span className="vehicle-count-badge">
              {vehicles.length} / {maxVehicles}
            </span>
          )}
        </h3>

        {vehicles.length === 0 && !adding && (
          <p className="empty-state">No vehicles linked to this card yet.</p>
        )}

        {vehicles.map((v, idx) => (
          <div key={v.vehicle_id} className="vehicle-block">
            <div className="vehicle-block-header">
              <div className="vehicle-id-badge">{idx + 1}</div>
              <div className="vehicle-header-info">
                <span className="vehicle-plate">{v.registration || "No plate"}</span>
                <span className="vehicle-meta">{v.brand} {v.model} {v.color && `· ${v.color}`}</span>
              </div>
              <button
                type="button"
                className="btn-remove"
                onClick={() => handleRemoveVehicle(idx)}
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="vehicle-fields">
              <div className="form-group">
                <label>Registration</label>
                <input
                  value={v.registration}
                  onChange={(e) =>
                    handleVehicleChange(idx, "registration", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Province</label>
                <input
                  value={v.province}
                  onChange={(e) =>
                    handleVehicleChange(idx, "province", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input
                  value={v.brand}
                  onChange={(e) =>
                    handleVehicleChange(idx, "brand", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input
                  value={v.model}
                  onChange={(e) =>
                    handleVehicleChange(idx, "model", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  value={v.color}
                  onChange={(e) =>
                    handleVehicleChange(idx, "color", e.target.value)
                  }
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-save btn-small"
              disabled={saving}
              onClick={() => handleSaveVehicle(v)}
            >
              Save
            </button>
          </div>
        ))}

        {adding && (
          <div className="vehicle-block vehicle-block--new">
            <div className="vehicle-block-header">
              <Car size={16} />
              <span>New Vehicle</span>
            </div>
            <div className="vehicle-fields">
              <div className="form-group">
                <label>Registration</label>
                <input
                  value={newVehicle.registration}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, registration: e.target.value }))
                  }
                  placeholder="e.g. กก1234"
                />
              </div>
              <div className="form-group">
                <label>Province</label>
                <input
                  value={newVehicle.province}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, province: e.target.value }))
                  }
                  placeholder="e.g. กรุงเทพมหานคร"
                />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input
                  value={newVehicle.brand}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, brand: e.target.value }))
                  }
                  placeholder="e.g. Toyota"
                />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input
                  value={newVehicle.model}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, model: e.target.value }))
                  }
                  placeholder="e.g. Camry"
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  value={newVehicle.color}
                  onChange={(e) =>
                    setNewVehicle((p) => ({ ...p, color: e.target.value }))
                  }
                  placeholder="e.g. White"
                />
              </div>
            </div>
            <div className="vehicle-add-actions">
              <button
                type="button"
                className="btn-save btn-small"
                onClick={handleAddVehicle}
              >
                Add
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!adding && (
          <button
            type="button"
            className="btn-add"
            onClick={() => setAdding(true)}
            disabled={atLimit}
          >
            <Plus size={14} /> {atLimit ? `Limit reached (${maxVehicles})` : "Add Vehicle"}
          </button>
        )}
      </div>

      <ConfirmModal
        open={confirm.open}
        variant={confirm.variant}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.variant === "danger" ? "Delete" : "Save"}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
