import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { detectIssuer, COMPANY_FAMILIES } from "../data/mock";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Building2,
  Car,
} from "lucide-react";
import "../styles/Edit.css";

const STEPS = ["Card Details", "Privileges", "Add Vehicle"];

export default function AddCardPage() {
  const navigate = useNavigate();
  const { refreshCards, refreshVehicles } = useAuth();

  const [step, setStep] = useState(0);

  // Step 1 — card info
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 2 — derived from card number
  const [issuer, setIssuer] = useState(null);
  const [privileges, setPrivileges] = useState([]);

  // Step 3 — vehicle
  const [vehicle, setVehicle] = useState({
    registration: "",
    province: "",
    brand: "",
    model: "",
    color: "",
  });

  /* ── Format card number with spaces ── */
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  /* ── Step 1 → Step 2: detect issuer, look up privileges ── */
  const handleNextToPrivileges = async () => {
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 13) return alert("Enter a valid card number.");
    if (!holderName.trim()) return alert("Enter the cardholder name.");
    if (!expiryMonth || !expiryYear) return alert("Enter expiry month and year.");

    const detected = detectIssuer(digits);
    setIssuer(detected);

    // Fetch privileges from the backend
    try {
      const data = await api("/api/parking/lots");
      // Group by lot — the backend returns the lots this card issuer can access
      setPrivileges(data || []);
    } catch {
      setPrivileges([]);
    }

    setStep(1);
  };

  /* ── Step 3 → Save: create card then vehicle via API ── */
  const handleSave = async () => {
    if (!vehicle.registration.trim()) return alert("Enter the registration.");
    setSaving(true);
    try {
      const digits = cardNumber.replace(/\s/g, "");

      // 1. Create the card
      const newCard = await api("/api/users/cards", {
        method: "POST",
        body: {
          card_number: digits,
          expiry_month: parseInt(expiryMonth, 10),
          expiry_year: parseInt(expiryYear, 10),
        },
      });

      // 2. Create the vehicle linked to the new card
      await api("/api/users/vehicles", {
        method: "POST",
        body: { ...vehicle, card_id: newCard.card_id },
      });

      await refreshCards();
      await refreshVehicles();
      navigate("/edit");
    } catch (err) {
      alert(err.message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-page">
      <button className="btn-back" onClick={() => navigate("/edit")}>
        <ArrowLeft size={18} /> Back to Cards
      </button>

      <h2>Add New Card</h2>

      {/* ── Stepper ── */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`stepper-step${i === step ? " active" : ""}${
              i < step ? " done" : ""
            }`}
          >
            <div className="stepper-dot">{i < step ? "✓" : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* ══════════ STEP 1: Card Details ══════════ */}
      {step === 0 && (
        <div className="edit-section">
          <h3>
            <CreditCard size={16} /> Card Information
          </h3>

          <div className="form-group">
            <label>Card Number</label>
            <input
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
            />
          </div>
          <div className="form-group">
            <label>Cardholder Name</label>
            <input
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Expiry Month</label>
              <input
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="MM"
                inputMode="numeric"
              />
            </div>
            <div className="form-group">
              <label>Expiry Year</label>
              <input
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="YYYY"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Personal Visa"
            />
          </div>

          <button className="btn-save" onClick={handleNextToPrivileges}>
            Next
          </button>
        </div>
      )}

      {/* ══════════ STEP 2: Privileges ══════════ */}
      {step === 1 && (
        <div className="edit-section">
          <h3>
            <CheckCircle size={16} /> Issuer &amp; Privileges
          </h3>

          <div className="issuer-badge">
            <CreditCard size={20} />
            <span>{issuer || "Unknown Issuer"}</span>
          </div>

          {privileges.length > 0 ? (
            <div className="privileges-list">
              <p className="privileges-intro">
                This card qualifies for parking at:
              </p>
              {privileges.map((lot) => (
                <div key={lot.id} className="privilege-group">
                  <div className="privilege-family">
                    <Building2 size={16} /> {lot.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              No parking privileges found for this card issuer.
            </p>
          )}

          <div className="step-actions">
            <button className="btn-cancel" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn-save" onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* ══════════ STEP 3: Add Vehicle ══════════ */}
      {step === 2 && (
        <div className="edit-section">
          <h3>
            <Car size={16} /> Vehicle Details
          </h3>

          <div className="form-group">
            <label>Registration</label>
            <input
              value={vehicle.registration}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, registration: e.target.value }))
              }
              placeholder="e.g. กก1234"
            />
          </div>
          <div className="form-group">
            <label>Province</label>
            <input
              value={vehicle.province}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, province: e.target.value }))
              }
              placeholder="e.g. กรุงเทพมหานคร"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Brand</label>
              <input
                value={vehicle.brand}
                onChange={(e) =>
                  setVehicle((p) => ({ ...p, brand: e.target.value }))
                }
                placeholder="e.g. Toyota"
              />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input
                value={vehicle.model}
                onChange={(e) =>
                  setVehicle((p) => ({ ...p, model: e.target.value }))
                }
                placeholder="e.g. Camry"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Color</label>
            <input
              value={vehicle.color}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, color: e.target.value }))
              }
              placeholder="e.g. White"
            />
          </div>

          <div className="step-actions">
            <button className="btn-cancel" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-save" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save Card"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
