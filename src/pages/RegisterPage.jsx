import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Auth.css";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <p className="subtitle">Register to start smart parking</p>
        {error && <p className="auth-error">{error}</p>}

        <div className="form-group">
          <label>Full Name</label>
          <input placeholder="John Doe" value={form.name} onChange={set("name")} required />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required />
        </div>

        <div className="form-group">
          <label>Gender</label>
          <select value={form.gender} onChange={set("gender")} required>
            <option value="" disabled>Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="form-group">
          <label>Birthday</label>
          <div className="dob-row">
            <select value={form.dobDay} onChange={set("dobDay")} required>
              <option value="" disabled>Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={form.dobMonth} onChange={set("dobMonth")} required>
              <option value="" disabled>Month</option>
              {[
                "January","February","March","April","May","June",
                "July","August","September","October","November","December",
              ].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={form.dobYear} onChange={set("dobYear")} required>
              <option value="" disabled>Year</option>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Register"}
        </button>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
