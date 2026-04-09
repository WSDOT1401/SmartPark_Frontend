import { useEffect, useState, useMemo, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Text, Html, useGLTF, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { api, getToken } from "../services/api";
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

const YOUR_CAR_COLOR = "#3b82f6";
const OTHER_CAR_COLOR = "#2a2a2a";
const STATUS_FREE = "#22c55e";
const STATUS_OCCUPIED = "#ef4444";
const LINE_YELLOW = "#facc15";

/* ── Preload the car model ── */
useGLTF.preload("/Cars.glb");

/* ── 3D car placed inside a slot ── */
function ParkedCar({ isYourCar }) {
  const { scene } = useGLTF("/Cars.glb");
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        child.material.color = new THREE.Color(isYourCar ? YOUR_CAR_COLOR : OTHER_CAR_COLOR);
        child.material.metalness = isYourCar ? 0.6 : 0.4;
        child.material.roughness = isYourCar ? 0.25 : 0.5;
        if (isYourCar) {
          child.material.emissive = new THREE.Color(YOUR_CAR_COLOR);
          child.material.emissiveIntensity = 0.15;
        }
      }
    });
    return c;
  }, [scene, isYourCar]);

  /* Compute bounding box for auto-scaling and center offset */
  const { scale: autoScale, yOffset, centerOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);
    const s = 0.7 / maxDim; // fit within ~0.7 units (slot width is 0.9)
    const yOff = -box.min.y * s; // lift so bottom sits on ground
    // Offset to center the model at origin before rotation
    const centerOff = new THREE.Vector3(-center.x, 0, -center.z);
    return { scale: s, yOffset: yOff, centerOffset: centerOff };
  }, [cloned]);

  return (
    <group position={[0, yOffset, 0.05]} rotation={[0, Math.PI / 2 + Math.PI, 0]}>
      <primitive
        object={cloned}
        scale={[autoScale * 1.82, autoScale * 1.82, autoScale * 1.82]}
        position={[centerOffset.x * autoScale * 1.82, 0, centerOffset.z * autoScale * 1.82]}
      />
    </group>
  );
}

/* ── Single parking spot mesh ── */
function ParkingSpot({ position, rotation, status, label, active, issuerColors, isYourCar, onClick }) {
  const isFree = active && status !== "OCCUPIED";
  const lightColor = !active
    ? "#333"
    : isYourCar
    ? YOUR_CAR_COLOR
    : isFree
    ? STATUS_FREE
    : STATUS_OCCUPIED;
  const lightIntensity = !active ? 0 : isYourCar ? 1.2 : isFree ? 0.6 : 0.8;

  return (
    <group
      position={position}
      rotation={[0, (rotation || 0) * Math.PI / 180, 0]}
      onClick={isYourCar ? (e) => { e.stopPropagation(); onClick?.(); } : undefined}
    >
      {/* ── Asphalt surface ── */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.9, 1.7]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.95} metalness={0} />
      </mesh>

      {/* ── Boundary lines (yellow) ── */}
      {/* Left */}
      <mesh position={[-0.43, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.035, 1.7]} />
        <meshStandardMaterial color={LINE_YELLOW} emissive={LINE_YELLOW} emissiveIntensity={0.15} />
      </mesh>
      {/* Right */}
      <mesh position={[0.43, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.035, 1.7]} />
        <meshStandardMaterial color={LINE_YELLOW} emissive={LINE_YELLOW} emissiveIntensity={0.15} />
      </mesh>
      {/* Back (curb end, +Z) */}
      <mesh position={[0, 0.012, 0.83]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.86, 0.035]} />
        <meshStandardMaterial color={LINE_YELLOW} emissive={LINE_YELLOW} emissiveIntensity={0.15} />
      </mesh>

      {/* ── Wheel stoppers (curb end, +Z) ── */}
      <mesh position={[-0.2, 0.04, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.07, 0.08]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </mesh>
      <mesh position={[0.2, 0.04, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.07, 0.08]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </mesh>
      {/* Yellow stripe on stoppers */}
      <mesh position={[-0.2, 0.076, 0.6]} castShadow>
        <boxGeometry args={[0.18, 0.008, 0.082]} />
        <meshStandardMaterial color={LINE_YELLOW} />
      </mesh>
      <mesh position={[0.2, 0.076, 0.6]} castShadow>
        <boxGeometry args={[0.18, 0.008, 0.082]} />
        <meshStandardMaterial color={LINE_YELLOW} />
      </mesh>

      {/* ── Status pole ── */}
      <mesh position={[0.35, 0.3, 0.78]} castShadow receiveShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.6, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Pole base */}
      <mesh position={[0.35, 0.01, 0.78]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* ── Light indicator housing ── */}
      <mesh position={[0.35, 0.62, 0.78]} castShadow>
        <cylinderGeometry args={[0.045, 0.04, 0.06, 12]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0.35, 0.66, 0.78]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={lightColor}
          emissive={lightColor}
          emissiveIntensity={active ? 3 : 0.1}
          toneMapped={false}
        />
      </mesh>

      {/* ── Point light for glow effect ── */}
      {active && (
        <pointLight
          position={[0.35, 0.66, 0.78]}
          color={lightColor}
          intensity={lightIntensity}
          distance={2.5}
          decay={2}
          castShadow
          shadow-mapSize-width={128}
          shadow-mapSize-height={128}
        />
      )}

      {/* ── Parked car model (when occupied) ── */}
      {active && status === "OCCUPIED" && (
        <ParkedCar isYourCar={isYourCar} />
      )}

      {/* ── Your car pulsing ring ── */}
      {isYourCar && (
        <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.42, 32]} />
          <meshStandardMaterial
            color={YOUR_CAR_COLOR}
            emissive={YOUR_CAR_COLOR}
            emissiveIntensity={1.5}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* ── Slot label (toward entrance, -Z) ── */}
      <Text
        position={[0, 0.018, -0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

const FOG_COLOR = "#181822";

/* ── Scene environment: background, fog ── */
function SceneEnvironment() {
  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, 12, 40]} />
    </>
  );
}

/* ── Ground plane ── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[50, 40]} />
      <meshStandardMaterial color="#191920" roughness={0.92} metalness={0.02} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#222222" roughness={0.88} metalness={0.02} />
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
function ParkingLotScene({ spotGroups, roadsByLot, userSlotIds, onSpotClick }) {
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
      <SceneEnvironment />

      {/* Hemisphere light for subtle ambient fill */}
      <hemisphereLight args={["#2a2a3e", "#0a0a0f", 0.35]} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      />
      {/* Opposite fill light */}
      <directionalLight position={[-8, 10, -6]} intensity={0.12} />

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
        const isYourCar = userSlotIds.has(spot.slot_id);
        if (isYourCar) {
          console.log(`🔵 Your car found at slot: ${spot.slot_id}`);
        }
        return (
          <ParkingSpot
            key={`${spot.lot_id}-${spot.slot_id}`}
            position={[(x - cx) * spacing, 0, (y - cy) * spacing_row]}
            rotation={spot.rotation}
            status={spot.status}
            active={spot.is_active}
            // label={spot.slot_id}
            issuerColors={spot.issuerColors}
            isYourCar={isYourCar}
            onClick={() => onSpotClick?.(spot)}
          />
        );
      })}
      <gridHelper args={[30, 30, "#222", "#181822"]} />
    </>
  );
}

/* ── Format elapsed duration ── */
function formatDuration(entryTime) {
  const ms = Date.now() - new Date(entryTime).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ── Parking detail modal ── */
function ParkingDetailModal({ session, onClose }) {
  if (!session) return null;

  const entryTime = session.entry_time || session.created_at;
  const duration = entryTime ? formatDuration(entryTime) : "—";
  const fee = session.current_fee ?? session.fee ?? session.total_fee;

  return (
    <div className="parking-detail-backdrop" onClick={onClose}>
      <div className="parking-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pdm-close" onClick={onClose}>×</button>
        <h3>Your Parking</h3>
        <div className="pdm-row">
          <span className="pdm-label">Slot</span>
          <span className="pdm-value">{session.slot_id || session.slot?.slot_id || "—"}</span>
        </div>
        {session.lot_name && (
          <div className="pdm-row">
            <span className="pdm-label">Lot</span>
            <span className="pdm-value">{session.lot_name}</span>
          </div>
        )}
        <div className="pdm-row">
          <span className="pdm-label">Vehicle</span>
          <span className="pdm-value">{session.registration || "—"}</span>
        </div>
        <div className="pdm-row">
          <span className="pdm-label">Entry Time</span>
          <span className="pdm-value">
            {entryTime ? new Date(entryTime).toLocaleString() : "—"}
          </span>
        </div>
        <div className="pdm-row">
          <span className="pdm-label">Duration</span>
          <span className="pdm-value pdm-highlight">{duration}</span>
        </div>
        {fee != null && (
          <div className="pdm-row">
            <span className="pdm-label">Current Fee</span>
            <span className="pdm-value pdm-highlight">฿{Number(fee).toFixed(2)}</span>
          </div>
        )}
        {session.rate_per_hour != null && (
          <div className="pdm-row">
            <span className="pdm-label">Rate</span>
            <span className="pdm-value">฿{Number(session.rate_per_hour).toFixed(0)}/hr</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  const [lots, setLots] = useState([]);
  const [selectedMall, setSelectedMall] = useState("");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [spotsByLot, setSpotsByLot] = useState({});
  const [roadsByLot, setRoadsByLot] = useState({});

  /* User parking state */
  const [userSessions, setUserSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  /* Fetch all parking lots on mount */
  useEffect(() => {
    api("/api/parking/lots").then((data) => setLots(data || []));
  }, []);

  /* Fetch user's active parking sessions via their vehicles */
  useEffect(() => {
    if (!getToken()) return; // not logged in
    api("/api/users/vehicles")
      .then((vehicles) => {
        if (!vehicles?.length) {
          console.log("❌ No vehicles found for user");
          return;
        }
        console.log("🚗 Found vehicles:", vehicles.map(v => ({ registration: v.registration, province: v.province })));
        const promises = vehicles.map((v) =>
          api(`/api/parking/session?registration=${encodeURIComponent(v.registration)}&province=${encodeURIComponent(v.province)}`)
            .then((session) => {
              if (session) {
                console.log(`📍 Session for ${v.registration}:`, session);
                return { ...session, registration: v.registration, province: v.province };
              }
              console.log(`⚠️ No session for ${v.registration}`);
              return null;
            })
            .catch((err) => {
              console.error(`Error fetching session for ${v.registration}:`, err);
              return null;
            })
        );
        return Promise.all(promises);
      })
      .then((results) => {
        if (results) {
          const filtered = results.filter(Boolean);
          console.log("✅ User sessions loaded:", filtered);
          filtered.forEach(s => {
            console.log("   Session details:", {
              session_id: s.session_id,
              slot_id: s.slot_id,
              slot: s.slot,
              slot_id_from_slot: s.slot?.slot_id
            });
          });
          setUserSessions(filtered);
        }
      })
      .catch((err) => {
        console.error("Error fetching user sessions:", err);
      });
  }, []);

  /* Set of slot_ids where the current user is parked */
  const userSlotIds = useMemo(() => {
    const slotIds = new Set(userSessions.map((s) => {
      // Handle both flat and nested slot structure
      const id = s.slot_id || s.slot?.slot_id;
      if (id) console.log(`   Extracted slot_id: ${id} from session`, s);
      return id;
    }).filter(Boolean));
    if (slotIds.size > 0) {
      console.log("🎯 User parked slots:", Array.from(slotIds));
    } else {
      console.log("⚠️ No slots found in user sessions");
    }
    return slotIds;
  }, [userSessions]);

  /* Lookup session by slot_id */
  const getSessionForSlot = useCallback(
    (slotId) => userSessions.find((s) => (s.slot_id || s.slot?.slot_id) === slotId) || null,
    [userSessions]
  );

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
      console.log("📊 Dashboard init received with", slotArray?.length, "slots");
      const grouped = {};
      slotArray.forEach((s) => {
        if (!grouped[s.lot_id]) grouped[s.lot_id] = [];
        grouped[s.lot_id].push(s);
      });
      setSpotsByLot((prev) => ({ ...prev, ...grouped }));
    });

    socket.on("slot:update", (update) => {
      console.log("🔄 Slot update received:", update);
      setSpotsByLot((prev) => {
        const arr = prev[update.lot_id] || [];
        const slotExists = arr.some((s) => s.slot_id === update.slot_id);
        
        let updatedArr = arr.map((s) =>
          s.slot_id === update.slot_id ? { ...s, ...update } : s
        );

        // If slot doesn't exist yet, add it (this handles race conditions)
        if (!slotExists && update.slot_id) {
          updatedArr = [...arr, { ...update }];
        }

        return {
          ...prev,
          [update.lot_id]: updatedArr,
        };
      });
    });

    /* Fallback polling: refresh slot data every 10 seconds to ensure sync */
    const pollInterval = setInterval(() => {
      ids.forEach((lotId) => {
        api(`/api/parking/lots/${lotId}/slots`)
          .then((slots) => {
            if (slots?.length) {
              console.log(`🔁 Polling refresh for lot ${lotId}:`, slots.length, "slots");
              setSpotsByLot((prev) => ({
                ...prev,
                [lotId]: slots,
              }));
            }
          })
          .catch((err) => console.error(`Polling error for lot ${lotId}:`, err));
      });
    }, 10000);

    return () => {
      clearInterval(pollInterval);
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

        {/* Legend — status indicator lights */}
        <div className="legend">
          <div className="legend-group">
            <span className="legend-provider">Status</span>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: STATUS_FREE, boxShadow: `0 0 6px ${STATUS_FREE}` }} />
              Free
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: STATUS_OCCUPIED, boxShadow: `0 0 6px ${STATUS_OCCUPIED}` }} />
              Occupied
            </div>
            {userSlotIds.size > 0 && (
              <div className="legend-item">
                <span className="legend-dot" style={{ background: YOUR_CAR_COLOR, boxShadow: `0 0 6px ${YOUR_CAR_COLOR}` }} />
                Your Car
              </div>
            )}
          </div>
          {Object.entries(issuerColorMap).length > 1 &&
            Object.entries(issuerColorMap).map(([provider, colors]) => (
              <div key={provider} className="legend-group">
                <span className="legend-provider">{provider}</span>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: colors.free }} />
                  Lot
                </div>
              </div>
            ))}
        </div>

        <Canvas
          shadows
          camera={{ position: [10, 12, 10], fov: 48, near: 0.1, far: 100 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
        >
          <ParkingLotScene
            spotGroups={spotGroups}
            roadsByLot={roadsByLot}
            userSlotIds={userSlotIds}
            onSpotClick={(spot) => {
              const session = getSessionForSlot(spot.slot_id);
              if (session) setSelectedSession(session);
            }}
          />
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={false}
            minDistance={5}
            maxDistance={40}
          />
          <EffectComposer>
            <Bloom
              intensity={0.8}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Parking detail popup */}
      {selectedSession && (
        <ParkingDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
