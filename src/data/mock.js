// ── Mock data for development. Replace with real API calls later. ──

export const MOCK_USER = {
  id: "u1",
  name: "John Doe",
  email: "john@example.com",
  cards: [
    {
      id: "c1",
      last_four: "4242",
      brand: "Visa",
      holderName: "John Doe",
      expiry: "12/28",
      companyFamily: "A",
      label: "Personal Visa",
      vehicles: [
        { id: "v1", plate: "ABC-1234", brand: "Toyota", model: "Camry", color: "White" },
        { id: "v2", plate: "DEF-5678", brand: "Honda", model: "Civic", color: "Black" },
      ],
    },
    {
      id: "c2",
      last_four: "8888",
      brand: "Mastercard",
      holderName: "John Doe",
      expiry: "06/27",
      companyFamily: "B",
      label: "Business MC",
      vehicles: [
        { id: "v3", plate: "GHI-9012", brand: "BMW", model: "3 Series", color: "Silver" },
      ],
    },
  ],
};

export const COMPANY_FAMILIES = {
  A: {
    name: "MegaMall Group",
    malls: [
      { id: "m1", name: "MegaMall Central", address: "123 Main St" },
      { id: "m2", name: "MegaMall East", address: "456 East Ave" },
    ],
  },
  B: {
    name: "StarPlaza Holdings",
    malls: [
      { id: "m3", name: "StarPlaza Downtown", address: "789 Star Blvd" },
      { id: "m4", name: "StarPlaza Harbour", address: "321 Harbour Rd" },
    ],
  },
};

// Maps card issuer → which company families they have parking deals with
export const ISSUER_PRIVILEGES = {
  Visa: { companyFamilies: ["A"] },
  Mastercard: { companyFamilies: ["A", "B"] },
  "American Express": { companyFamilies: ["B"] },
};

// Detect card issuer from number prefix
export function detectIssuer(number) {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  return null;
}

// Parking slots — mirrors the DB schema:
// slot_id (PK), status ("FREE"|"OCCUPIED"), location_coordinates {x,y,z},
// is_active (boolean), lot_id (FK)
const LOT_ID = "fb24a338-7fc3-4a85-9fe6-368f8bedb2bc";

export const PARKING_SPOTS = Array.from({ length: 40 }, (_, i) => {
  const row = Math.floor(i / 10);
  const col = i % 10;
  return {
    slot_id: `${String.fromCharCode(65 + row)}${col + 1}`,
    status: Math.random() > 0.55 ? "OCCUPIED" : "FREE",
    location_coordinates: { x: col * 10, y: 0, z: row * 10 },
    is_active: true,
    lot_id: LOT_ID,
  };
});

export const MOCK_HISTORY = [
  {
    id: "h1",
    mall: "MegaMall Central",
    spot: "A3",
    date: "2026-03-28",
    entryTime: "10:15",
    exitTime: "12:30",
    cost: "$4.50",
  },
  {
    id: "h2",
    mall: "StarPlaza Downtown",
    spot: "B7",
    date: "2026-03-25",
    entryTime: "14:00",
    exitTime: "16:45",
    cost: "$5.50",
  },
  {
    id: "h3",
    mall: "MegaMall East",
    spot: "C1",
    date: "2026-03-20",
    entryTime: "09:00",
    exitTime: "11:00",
    cost: "$4.00",
  },
  {
    id: "h4",
    mall: "StarPlaza Harbour",
    spot: "A9",
    date: "2026-03-18",
    entryTime: "18:30",
    exitTime: "21:00",
    cost: "$5.00",
  },
];

// Admin-level logs — superset of all users' history
export const ADMIN_LOGS = [
  ...MOCK_HISTORY.map((h) => ({ ...h, user: "John Doe", plate: "ABC-1234" })),
  {
    id: "h5",
    user: "Jane Smith",
    plate: "XYZ-9999",
    mall: "MegaMall Central",
    spot: "B2",
    date: "2026-03-29",
    entryTime: "08:00",
    exitTime: "10:15",
    cost: "$4.50",
  },
  {
    id: "h6",
    user: "Bob Lee",
    plate: "QWE-5678",
    mall: "StarPlaza Downtown",
    spot: "A1",
    date: "2026-03-30",
    entryTime: "12:00",
    exitTime: "14:30",
    cost: "$5.00",
  },
];
