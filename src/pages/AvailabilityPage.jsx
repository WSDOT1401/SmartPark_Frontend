import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { api } from "../services/api";
import { connectSocket } from "../services/socket";
import "../styles/Availability.css";

/* ── Issuer colour palette (free / occupied pairs) ── */
const ISSUER_PALETTE = [
  { free: "#c9a84c", occupied: "#6b572a" }, // gold
  { free: "#4a9fd5", occupied: "#2a5a7a" }, // blue
  { free: "#9b59b6", occupied: "#5b3570" }, // purple
  { free: "#1abc9c", occupied: "#0e6b59" }, // teal
  { free: "#e67e22", occupied: "#8a4c15" }, // orange
];

function getIssuerColors(index) {
  return ISSUER_PALETTE[index % ISSUER_PALETTE.length];
}

/* ── Single parking spot mesh ── */
function ParkingSpot({ position, status, label, active, issuerColors }) {
  const palette = issuerColors || ISSUER_PALETTE[0];
  const color = !active
    ? "#555"
    : status === "OCCUPIED"
    ? palette.occupied
    : palette.free;

  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.8, 0.1, 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#fff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

/* ── Ground plane ── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[30, 20]} />
      <meshStandardMaterial color="#0f0f0f" />
    </mesh>
  );
}

/* ── 3D scene — renders spots from multiple lots with per-issuer colours ── */
function ParkingLotScene({ spotGroups }) {
  const allSpots = spotGroups.flatMap((g) =>
    g.spots.map((s) => ({ ...s, issuerColors: g.issuerColors }))
  );

  const parsed = allSpots.map((s) => {
    const loc =
      typeof s.location_coordinates === "string"
        ? JSON.parse(s.location_coordinates)
        : s.location_coordinates;
    return { ...s, location_coordinates: loc };
  });

  if (parsed.length === 0) return null;

  const coords = parsed.map((s) => s.location_coordinates);
  const minX = Math.min(...coords.map((c) => c.x));
  const maxX = Math.max(...coords.map((c) => c.x));
  const minY = Math.min(...coords.map((c) => c.y));
  const maxY = Math.max(...coords.map((c) => c.y));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 1.2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <Ground />
      {parsed.map((spot) => {
        const { x, y } = spot.location_coordinates;
        return (
          <ParkingSpot
            key={`${spot.lot_id}-${spot.slot_id}`}
            position={[(x - cx) / 10 * scale, 0, (y - cy) / 10 * scale]}
            status={spot.status}
            active={spot.is_active}
            label={spot.slot_id}
            issuerColors={spot.issuerColors}
          />
        );
      })}
      <gridHelper args={[30, 30, "#333", "#222"]} />
      <OrbitControls
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={25}
      />
    </>
  );
}

export default function AvailabilityPage() {
  const [lots, setLots] = useState([]);
  const [selectedMall, setSelectedMall] = useState("");
  const [spotsByLot, setSpotsByLot] = useState({});

  /* Fetch all parking lots on mount */
  useEffect(() => {
    api("/api/parking/lots").then((data) => setLots(data || []));
  }, []);

  /* Extract a display name for the mall (handles nested object or flat string) */
  const getMallName = (lot) => {
    if (lot.mall_name) return lot.mall_name;
    if (lot.mall && typeof lot.mall === "object")
      return lot.mall.mall_name || lot.mall.name || "Unknown Mall";
    if (typeof lot.mall === "string") return lot.mall;
    return "Unknown Mall";
  };

  /* Extract a display name for the lot */
  const getLotName = (lot) =>
    lot.lot_name || lot.name || (lot.mall && typeof lot.mall === "object" && lot.mall.mall_name) || lot.lot_id;

  /* Group lots by mall */
  const malls = useMemo(() => {
    const map = {};
    lots.forEach((lot) => {
      const mall = getMallName(lot);
      if (!map[mall]) map[mall] = [];
      map[mall].push(lot);
    });
    return map;
  }, [lots]);

  const mallNames = useMemo(() => Object.keys(malls), [malls]);

  /* Auto-select first mall */
  useEffect(() => {
    if (mallNames.length && !selectedMall) setSelectedMall(mallNames[0]);
  }, [mallNames, selectedMall]);

  /* Lots belonging to the selected mall */
  const mallLots = useMemo(() => malls[selectedMall] || [], [malls, selectedMall]);

  /* Map each issuer/provider to a unique colour */
  const issuerColorMap = useMemo(() => {
    const map = {};
    let idx = 0;
    mallLots.forEach((lot) => {
      const provider =
        lot.provider_name ||
        (lot.program && lot.program.provider_name) ||
        lot.lot_name ||
        lot.lot_id;
      if (!map[provider]) map[provider] = getIssuerColors(idx++);
    });
    return map;
  }, [mallLots]);

  /* Connect to socket rooms for every lot in the selected mall */
  useEffect(() => {
    if (!mallLots.length) return;

    const socket = connectSocket();
    const ids = mallLots.map((l) => l.lot_id);

    ids.forEach((id) => socket.emit("join:lot", id));

    socket.on("dashboard:init", (slotArray) => {
      const grouped = {};
      slotArray.forEach((s) => {
        if (!grouped[s.lot_id]) grouped[s.lot_id] = [];
        grouped[s.lot_id].push(s);
      });
      setSpotsByLot((prev) => ({ ...prev, ...grouped }));
    });

    socket.on("slot:update", (update) => {
      setSpotsByLot((prev) => {
        const arr = prev[update.lot_id] || [];
        return {
          ...prev,
          [update.lot_id]: arr.map((s) =>
            s.slot_id === update.slot_id ? { ...s, ...update } : s
          ),
        };
      });
    });

    return () => {
      ids.forEach((id) => socket.emit("leave:lot", id));
      socket.off("dashboard:init");
      socket.off("slot:update");
      setSpotsByLot({});
    };
  }, [mallLots]);

  /* Build spot groups with issuer colours for the 3D scene */
  const spotGroups = useMemo(() => {
    return mallLots.map((lot) => {
      const provider =
        lot.provider_name ||
        (lot.program && lot.program.provider_name) ||
        lot.lot_name ||
        lot.lot_id;
      return {
        lot,
        provider,
        issuerColors: issuerColorMap[provider],
        spots: (spotsByLot[lot.lot_id] || []).filter((s) => s.is_active),
      };
    });
  }, [mallLots, spotsByLot, issuerColorMap]);

  /* Aggregate stats */
  const allSpots = spotGroups.flatMap((g) => g.spots);
  const totalSpots = allSpots.length;
  const occupiedCount = allSpots.filter((s) => s.status === "OCCUPIED").length;
  const availableCount = totalSpots - occupiedCount;

  return (
    <div className="availability-page">
      {/* ── Mall selector ── */}
      <div className="selector-bar">
        <label>Select mall:</label>
        <select
          value={selectedMall}
          onChange={(e) => setSelectedMall(e.target.value)}
        >
          {mallNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {mallLots.length > 1 && (
          <span className="mall-lot-badge">
            {mallLots.length} privileged parkings
          </span>
        )}
      </div>

      {/* ── Issuer chips (one per lot/provider) ── */}
      {mallLots.length > 0 && (
        <div className="issuer-chips">
          {spotGroups.map((g) => {
            const freeCount = g.spots.filter(
              (s) => s.status !== "OCCUPIED"
            ).length;
            return (
              <div
                key={g.lot.lot_id}
                className="issuer-chip"
                style={{ borderColor: g.issuerColors?.free }}
              >
                <span
                  className="issuer-chip-dot"
                  style={{ background: g.issuerColors?.free }}
                />
                <span className="issuer-chip-label">
                  {g.provider} — {getLotName(g.lot)}
                </span>
                <span className="issuer-chip-count">
                  {freeCount}/{g.spots.length} free
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3D viewer ── */}
      <div className="viewer-wrapper">
        <div className="stats-overlay">
          <h4>Parking Stats</h4>
          <div className="stat-row">
            <span className="stat-label">Total</span>
            <span className="stat-value total">{totalSpots}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Available</span>
            <span className="stat-value available">{availableCount}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Occupied</span>
            <span className="stat-value occupied">{occupiedCount}</span>
          </div>
        </div>

        {/* Dynamic legend — one section per issuer/provider */}
        <div className="legend">
          {Object.entries(issuerColorMap).map(([provider, colors]) => (
            <div key={provider} className="legend-group">
              <span className="legend-provider">{provider}</span>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: colors.free }} />
                Free
              </div>
              <div className="legend-item">
                <span
                  className="legend-dot"
                  style={{ background: colors.occupied }}
                />
                Occupied
              </div>
            </div>
          ))}
        </div>

        <Canvas camera={{ position: [0, 12, 14], fov: 50 }}>
          <ParkingLotScene spotGroups={spotGroups} />
        </Canvas>
      </div>
    </div>
  );
}
