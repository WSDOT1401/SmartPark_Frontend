import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setToken, getToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // On mount, if we have a stored token, refresh cards & vehicles from API
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    Promise.all([api("/api/users/cards"), api("/api/users/vehicles")])
      .then(([cards, vehicles]) => {
        setUser((prev) =>
          prev ? { ...prev, cards: cards || [], vehicles: vehicles || [] } : prev
        );
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    const [cards, vehicles] = await Promise.all([
      api("/api/users/cards"),
      api("/api/users/vehicles"),
    ]);
    setUser({ ...data.user, cards: cards || [], vehicles: vehicles || [] });
    return true;
  }, []);

  const register = useCallback(async (formData) => {
    const dob = `${formData.dobYear}-${String(formData.dobMonth).padStart(2, "0")}-${String(formData.dobDay).padStart(2, "0")}`;
    const data = await api("/api/auth/register", {
      method: "POST",
      body: {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        gender: formData.gender,
        birthday: dob,
      },
    });
    setToken(data.token);
    const [cards, vehicles] = await Promise.all([
      api("/api/users/cards"),
      api("/api/users/vehicles"),
    ]);
    setUser({ ...data.user, cards: cards || [], vehicles: vehicles || [] });
    return true;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("user");
  }, []);

  const refreshCards = useCallback(async () => {
    const cards = await api("/api/users/cards");
    setUser((prev) => (prev ? { ...prev, cards } : prev));
  }, []);

  const refreshVehicles = useCallback(async () => {
    const vehicles = await api("/api/users/vehicles");
    setUser((prev) => (prev ? { ...prev, vehicles } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshCards, refreshVehicles }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
