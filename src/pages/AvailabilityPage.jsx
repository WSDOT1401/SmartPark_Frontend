import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, useGLTF } from "@react-three/drei";
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
function ParkingSpot({ position, rotation, status, label, active, issuerColors }) {
  const palette = issuerColors || ISSUER_PALETTE[0];
  const color = !active
    ? "#555"
    : status === "OCCUPIED"
    ? palette.occupied
    : palette.free;

  return (
    <group position={position} rotation={[0, (rotation || 0) * Math.PI / 180, 0]}>
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

/* ── Road patch using Three.js geometry ── */
function RoadPatch({ position, width, depth, horizontal, connections }) {
  const LINE_COLOR = "#d4a017";
  const LINE_Y = 0.006;
  const LINE_THICK = 0.04;

  const lines = [];

  if (connections) {
    // Intersection patch — draw line segments for each connected direction
    const hw = width / 2;
    const hd = depth / 2;
    if (connections.top)    lines.push({ pos: [0, LINE_Y, -hd / 2], w: LINE_THICK, d: hd });
    if (connections.bottom) lines.push({ pos: [0, LINE_Y, hd / 2],  w: LINE_THICK, d: hd });
    if (connections.left)   lines.push({ pos: [-hw / 2, LINE_Y, 0], w: hw, d: LINE_THICK });
    if (connections.right)  lines.push({ pos: [hw / 2, LINE_Y, 0],  w: hw, d: LINE_THICK });
  } else {
    // Straight road — dashed center line
    const isH = horizontal;
    const len = isH ? width : depth;
    const dashLen = len * 0.15;
    const gap = len / 3;
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * gap;
      lines.push({
        pos: isH ? [offset, LINE_Y, 0] : [0, LINE_Y, offset],
        w: isH ? dashLen : LINE_THICK,
        d: isH ? LINE_THICK : dashLen,
      });
    }
  }

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {lines.map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={l.pos}>
          <planeGeometry args={[l.w, l.d]} />
          <meshStandardMaterial color={LINE_COLOR} />
        </mesh>
      ))}
    </group>
  );
}

/* ── 3D scene — renders spots from multiple lots with per-issuer colours ── */
function ParkingLotScene({ spotGroups, roadsByLot }) {
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
  const spacing = 1.2;
  const spacing_row = 2;

  // Collect all road segments from DB for visible lots
  const roadSegments = spotGroups.flatMap((g) =>
    (roadsByLot[g.lot.lot_id] || []).map((r) => ({
      cx: r.cx,
      cy: r.cy,
      w: r.w,
      d: r.d,
      horizontal: r.horizontal,
      connections: r.connections || null,
    }))
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <directionalLight position={[-8, 10, -6]} intensity={0.4} />
      <Ground />

      {/* Roads */}
      {roadSegments.map((seg, i) => (
        <RoadPatch
          key={`road-${i}`}
          position={[
            (seg.cx - cx) * spacing,
            0,
            (seg.cy - cy) * spacing_row,
          ]}
          width={seg.connections ? seg.w * spacing * 0.67 : seg.horizontal ? seg.w * spacing : seg.w * spacing * 0.45}
          depth={seg.connections ? seg.w * spacing_row * 0.67 : seg.horizontal ? seg.d * spacing_row * 0.45 : seg.d * spacing_row}
          horizontal={seg.horizontal}
          connections={seg.connections}
        />
      ))}

      {parsed.map((spot) => {
        const { x, y } = spot.location_coordinates;
        return (
          <ParkingSpot
            key={`${spot.lot_id}-${spot.slot_id}`}
            position={[(x - cx) * spacing, 0, (y - cy) * spacing_row]}
            rotation={spot.rotation}
            status={spot.status}
            active={spot.is_active}
            // label={spot.slot_id}
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
  const [selectedLotId, setSelectedLotId] = useState("");
  const [spotsByLot, setSpotsByLot] = useState({});
  const [roadsByLot, setRoadsByLot] = useState({});

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

  /* Auto-select first lot when mall changes */
  useEffect(() => {
    if (mallLots.length) setSelectedLotId(mallLots[0].lot_id);
    else setSelectedLotId("");
  }, [mallLots]);

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

  /* Fetch roads for each lot in the selected mall */
  useEffect(() => {
    if (!mallLots.length) return;
    setRoadsByLot({});
    mallLots.forEach((lot) => {
      api(`/api/parking/lots/${lot.lot_id}/roads`)
        .then((data) => {
          if (data) setRoadsByLot((prev) => ({ ...prev, [lot.lot_id]: data }));
        })
        .catch(() => {});
    });
  }, [mallLots]);

  /* Build spot groups with issuer colours — filtered to selected lot */
  const spotGroups = useMemo(() => {
    const filtered = selectedLotId
      ? mallLots.filter((l) => l.lot_id === selectedLotId)
      : mallLots;
    return filtered.map((lot) => {
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
  }, [mallLots, spotsByLot, issuerColorMap, selectedLotId]);

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
          <>
            <label>Select parking:</label>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
            >
              {mallLots.map((lot) => (
                <option key={lot.lot_id} value={lot.lot_id}>
                  {getLotName(lot)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

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
          <ParkingLotScene spotGroups={spotGroups} roadsByLot={roadsByLot} />
        </Canvas>
      </div>
    </div>
  );
}
