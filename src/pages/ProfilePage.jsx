import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { User, Save, LogOut } from "lucide-react";
import "../styles/Profile.css";

export default function ProfilePage() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", gender: "", dobDay: "", dobMonth: "", dobYear: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState({ open: false, onConfirm: null });

  useEffect(() => {
    if (!user) return;
    const bday = user.birthday ? new Date(user.birthday) : null;
    setForm({
      name: user.name || "",
      gender: user.gender || "",
      dobDay: bday ? String(bday.getUTCDate()) : "",
      dobMonth: bday ? String(bday.getUTCMonth() + 1) : "",
      dobYear: bday ? String(bday.getUTCFullYear()) : "",
    });
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    setConfirm({
      open: true,
      onConfirm: async () => {
        setConfirm({ open: false, onConfirm: null });
        setSaving(true);
        setError("");
        setSuccess(false);
        try {
          const birthday = form.dobYear && form.dobMonth && form.dobDay
            ? `${form.dobYear}-${String(form.dobMonth).padStart(2, "0")}-${String(form.dobDay).padStart(2, "0")}`
            : undefined;
          await api("/api/users/profile", {
            method: "PUT",
            body: { name: form.name, gender: form.gender, birthday },
          });
          await refreshProfile();
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
          setError(err.message || "Failed to update profile");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <User size={32} />
        </div>
        <div>
          <h2>{user?.name || "Your Profile"}</h2>
          <p className="profile-email">{user?.email}</p>
        </div>
      </div>

      <div className="profile-card">
        <h3>Personal Information</h3>

        {error && <p className="profile-error">{error}</p>}
        {success && <p className="profile-success">Profile updated successfully!</p>}

        <div className="profile-fields">
          <div className="form-group">
            <label>Full Name</label>
            <input value={form.name} onChange={set("name")} placeholder="Your name" />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input value={user?.email || ""} disabled className="input-disabled" />
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select value={form.gender} onChange={set("gender")}>
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
            </select>
          </div>

          <div className="form-group">
            <label>Birthday</label>
            <div className="dob-row">
              <select value={form.dobDay} onChange={set("dobDay")}>
                <option value="" disabled>Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={form.dobMonth} onChange={set("dobMonth")}>
                <option value="" disabled>Month</option>
                {[
                  "January","February","March","April","May","June",
                  "July","August","September","October","November","December",
                ].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select value={form.dobYear} onChange={set("dobYear")}>
                <option value="" disabled>Year</option>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button className="btn-save-profile" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <button
        className="btn-logout-profile"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        <LogOut size={16} /> Logout
      </button>

      <ConfirmModal
        open={confirm.open}
        variant="warning"
        title="Update Profile"
        message="Save changes to your profile?"
        confirmText="Save"
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open: false, onConfirm: null })}
      />
    </div>
  );
}
