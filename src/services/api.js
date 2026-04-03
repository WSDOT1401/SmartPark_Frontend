const BASE = import.meta.env.VITE_API_URL || "";

let token = localStorage.getItem("token");

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function getToken() {
  return token;
}

export async function api(path, options = {}) {
  const { body, headers: customHeaders, ...rest } = options;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  // Some endpoints may return empty 204
  if (res.status === 204) return null;
  return res.json();
}
