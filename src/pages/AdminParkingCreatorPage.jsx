import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { api } from "../services/api";
import {
  ArrowLeft,
  Grid3X3,
  RotateCw,
  Trash2,
  Save,
  Eye,
  Plus,
  Minus,
  SeparatorHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/ParkingCreator.css";

const ROAD_GAP = 1; // extra coordinate units each road inserts

/* ── 3D Preview Components ── */
function PreviewSpot({ position, rotation, label }) {
  return (
    <group position={position} rotation={[0, (rotation || 0) * Math.PI / 180, 0]}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.8, 0.1, 1.6]} />
        <meshStandardMaterial color="#c9a84c" />
      </mesh>
      <Text
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#fff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

function PreviewRoadPatch({ position, width, depth, horizontal }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a1a18" />
      </mesh>
      {/* Dashed center line */}
      {Array.from({ length: 3 }, (_, i) => {
        const isHorizontal = horizontal;
        const len = isHorizontal ? width : depth;
        const dashLen = len * 0.15;
        const gap = len / 3;
        const offset = (i - 1) * gap;
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={
              isHorizontal
                ? [offset, 0.006, 0]
                : [0, 0.006, offset]
            }
          >
            <planeGeometry
              args={isHorizontal ? [dashLen, 0.04] : [0.04, dashLen]}
            />
            <meshStandardMaterial color="#444" />
          </mesh>
        );
      })}
    </group>
  );
}

function PreviewGround({ width, depth }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[width + 4, depth + 4]} />
      <meshStandardMaterial color="#0f0f0f" />
    </mesh>
  );
}

function PreviewScene({ slots, roadSegments }) {
  if (!slots.length) return null;

  const allX = slots.map((s) => s.wx);
  const allY = slots.map((s) => s.wy);
  const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
  const cy = (Math.min(...allY) + Math.max(...allY)) / 2;
  const spacing = 1.2;
  const spacing_row = 2;
  const sw = (Math.max(...allX) - Math.min(...allX)) * spacing;
  const sd = (Math.max(...allY) - Math.min(...allY)) * spacing;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <PreviewGround width={Math.max(sw, 4)} depth={Math.max(sd, 4)} />

      {/* Individual road patches between specific pairs of spots */}
      {roadSegments.map((seg, i) => (
        <PreviewRoadPatch
          key={`road-${i}`}
          position={[(seg.cx - cx) * spacing, 0, (seg.cy - cy) * spacing_row]}
          width={seg.w * spacing}
          depth={seg.d * spacing_row}
          horizontal={seg.horizontal}
        />
      ))}

      {slots.map((s) => (
        <PreviewSpot
          key={s.label}
          position={[(s.wx - cx) * spacing, 0, (s.wy - cy) * spacing_row]}
          rotation={s.rotation}
          label={s.label}
        />
      ))}
      <gridHelper
        args={[Math.max(sw, sd) + 6, 30, "#333", "#222"]}
      />
      <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={30} />
    </>
  );
}

/* ── Helper: generate slot label from row/col ── */
function slotLabel(row, col) {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

/* ── Grid cell component ── */
function GridCell({ row, col, slot, onPlace, onRotate, onRemove, tool }) {
  const label = slotLabel(row, col);
  const isPlaced = !!slot;

  const handleClick = (e) => {
    e.preventDefault();
    if (tool === "place") {
      if (isPlaced) onRotate(row, col);
      else onPlace(row, col);
    } else if (tool === "remove") {
      if (isPlaced) onRemove(row, col);
    } else if (tool === "rotate") {
      if (isPlaced) onRotate(row, col);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (isPlaced) onRemove(row, col);
  };

  return (
    <button
      className={`grid-cell${isPlaced ? " placed" : ""}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={
        isPlaced
          ? `${label} — ${slot.rotation}° (right-click to remove)`
          : `Place ${label}`
      }
    >
      {isPlaced && (
        <>
          <span className="cell-label">{label}</span>
          <span
            className="cell-rotation-indicator"
            style={{ transform: `rotate(${slot.rotation}deg)` }}
          >
            ↑
          </span>
        </>
      )}
    </button>
  );
}

export default function AdminParkingCreatorPage() {
  const navigate = useNavigate();

  /* ── API data ── */
  const [malls, setMalls] = useState([]);
  const [programs, setPrograms] = useState([]);

  /* ── Form state ── */
  const [selectedMall, setSelectedMall] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [lotName, setLotName] = useState("");

  /* ── Grid size ── */
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(3);

  /* ── Slots map: "row,col" → { row, col, rotation, label } ── */
  const [slotMap, setSlotMap] = useState({});

  /* ── Roads — individual segments, NOT saved to DB ── */
  /* Keys: "h:row,col" = gap between (row,col) and (row,col+1)
           "v:row,col" = gap between (row,col) and (row+1,col) */
  const [roads, setRoads] = useState(new Set());

  /* ── Tool state ── */
  const [tool, setTool] = useState("place");
  const [showPreview, setShowPreview] = useState(false);

  /* ── Save state ── */
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  /* ── Remove out-of-range roads when grid shrinks ── */
  useEffect(() => {
    setRoads((prev) => {
      const next = new Set();
      prev.forEach((key) => {
        const [type, coords] = key.split(":");
        const [r, c] = coords.split(",").map(Number);
        if (type === "h" && c < cols - 1 && r < rows) next.add(key);
        if (type === "v" && r < rows - 1 && c < cols) next.add(key);
      });
      return next.size !== prev.size ? next : prev;
    });
  }, [rows, cols]);

  /* ── Fetch malls & programs on mount ── */
  useEffect(() => {
    api("/api/parking/lots").then((data) => {
      if (!data) return;
      const mallMap = {};
      data.forEach((lot) => {
        const name =
          lot.mall_name ||
          (lot.mall && typeof lot.mall === "object"
            ? lot.mall.mall_name || lot.mall.name
            : lot.mall) ||
          null;
        const id =
          lot.mall_id ||
          (lot.mall && typeof lot.mall === "object" ? lot.mall.mall_id : null) ||
          name;
        if (name && id) mallMap[id] = name;
      });
      setMalls(Object.entries(mallMap).map(([id, name]) => ({ id, name })));
    });

    api("/api/admin/programs")
      .then((data) => setPrograms(data || []))
      .catch(() => {
        api("/api/parking/programs")
          .then((data) => setPrograms(data || []))
          .catch(() => setPrograms([]));
      });
  }, []);

  /* ── Road toggle ── */
  const toggleRoad = useCallback((key) => {
    setRoads((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /* ── Coordinate mapping — per-slot, counting road segments in its row/col ── */
  const getWX = useCallback(
    (row, col) => {
      let x = col;
      for (let c = 0; c < col; c++) {
        if (roads.has(`h:${row},${c}`)) x += ROAD_GAP;
      }
      return x;
    },
    [roads]
  );
  const getWY = useCallback(
    (row, col) => {
      let y = row;
      for (let r = 0; r < row; r++) {
        if (roads.has(`v:${r},${col}`)) y += ROAD_GAP;
      }
      return y;
    },
    [roads]
  );

  /* ── Slot actions ── */
  const placeSlot = useCallback((row, col) => {
    const key = `${row},${col}`;
    setSlotMap((prev) => ({
      ...prev,
      [key]: { row, col, rotation: 0, label: slotLabel(row, col) },
    }));
  }, []);

  const rotateSlot = useCallback((row, col) => {
    const key = `${row},${col}`;
    setSlotMap((prev) => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], rotation: (prev[key].rotation + 90) % 360 },
      };
    });
  }, []);

  const removeSlot = useCallback((row, col) => {
    const key = `${row},${col}`;
    setSlotMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /* ── Fill / clear all ── */
  const fillAll = () => {
    const map = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        map[`${r},${c}`] = { row: r, col: c, rotation: 0, label: slotLabel(r, c) };
      }
    }
    setSlotMap(map);
  };

  const clearAll = () => {
    setSlotMap({});
    setRoads(new Set());
  };

  const slots = useMemo(() => Object.values(slotMap), [slotMap]);

  /* ── World-coordinate slots (with road gaps baked in) ── */
  const worldSlots = useMemo(
    () => slots.map((s) => ({ ...s, wx: getWX(s.row, s.col), wy: getWY(s.row, s.col) })),
    [slots, getWX, getWY]
  );

  /* Road segments for 3D preview — individual patches between two spots */
  const roadSegments = useMemo(() => {
    const segs = [];
    roads.forEach((key) => {
      const [type, coords] = key.split(":");
      const [r, c] = coords.split(",").map(Number);
      if (type === "h") {
        // Gap between columns — road runs parallel to spots (along Z)
        const x1 = getWX(r, c);
        const x2 = getWX(r, c + 1);
        const y = getWY(r, c);
        segs.push({ cx: (x1 + x2) / 2, cy: y, w: (x2 - x1) * 0.85, d: 1.2, horizontal: false });
      } else {
        // Gap between rows — road runs perpendicular to spots (along X)
        const x = getWX(r, c);
        const y1 = getWY(r, c);
        const y2 = getWY(r + 1, c);
        segs.push({ cx: x, cy: (y1 + y2) / 2, w: 1.2, d: (y2 - y1) * 0.85, horizontal: true });
      }
    });
    return segs;
  }, [roads, getWX, getWY]);

  /* ── Save to backend ── */
  const handleSave = async () => {
    setConfirmOpen(false);
    if (!selectedMall) return setFeedback({ type: "error", msg: "Select a mall." });
    if (!selectedProgram) return setFeedback({ type: "error", msg: "Select a privilege program." });
    if (!lotName.trim()) return setFeedback({ type: "error", msg: "Enter a lot name." });
    if (!slots.length) return setFeedback({ type: "error", msg: "Place at least one parking slot." });

    setSaving(true);
    setFeedback(null);

    try {
      const lot = await api("/api/admin/lots", {
        method: "POST",
        body: {
          lot_name: lotName.trim(),
          mall_id: selectedMall,
          program_id: selectedProgram,
        },
      });

      const lotId = lot.lot_id || lot.id;

      // Coordinates include road gaps so the client renders natural spacing
      const slotPayload = worldSlots.map((s) => ({
        slot_id: s.label,
        location_coordinates: { x: s.wx, y: s.wy, z: 0 },
        rotation: s.rotation,
        is_active: true,
      }));

      await api(`/api/admin/lots/${lotId}/slots`, {
        method: "POST",
        body: { slots: slotPayload },
      });

      setFeedback({ type: "success", msg: `Lot "${lotName}" created with ${slots.length} slots.` });
      setSlotMap({});
      setRoads(new Set());
      setLotName("");
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  /* ── Grid template columns (with gutter slots for road toggles) ── */
  const gridTemplateCols =
    cols > 1
      ? `36px repeat(${cols - 1}, 1fr 10px) 1fr`
      : "36px 1fr";

  return (
    <div className="parking-creator">
      <button className="btn-back" onClick={() => navigate("/admin")}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <h2>Parking Lot Creator</h2>
      <p className="creator-subtitle">
        Design a virtual 3D parking layout and save it to the database.
      </p>

      {/* ── Configuration panel ── */}
      <div className="creator-config">
        <div className="config-row">
          <div className="form-group">
            <label>Mall</label>
            <select
              value={selectedMall}
              onChange={(e) => setSelectedMall(e.target.value)}
            >
              <option value="">Select mall…</option>
              {malls.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Privilege Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              <option value="">Select program…</option>
              {programs.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.provider_name} — {p.tier}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Lot Name</label>
            <input
              value={lotName}
              onChange={(e) => setLotName(e.target.value)}
              placeholder="e.g. Zone A — Level 3"
            />
          </div>
        </div>

        {/* Grid size controls */}
        <div className="config-row">
          <div className="size-control">
            <label>Columns</label>
            <div className="size-stepper">
              <button onClick={() => setCols((c) => Math.max(1, c - 1))}><Minus size={14} /></button>
              <span>{cols}</span>
              <button onClick={() => setCols((c) => Math.min(26, c + 1))}><Plus size={14} /></button>
            </div>
          </div>
          <div className="size-control">
            <label>Rows</label>
            <div className="size-stepper">
              <button onClick={() => setRows((r) => Math.max(1, r - 1))}><Minus size={14} /></button>
              <span>{rows}</span>
              <button onClick={() => setRows((r) => Math.min(26, r + 1))}><Plus size={14} /></button>
            </div>
          </div>
          <div className="config-actions">
            <button className="btn-fill" onClick={fillAll}>
              <Grid3X3 size={14} /> Fill All
            </button>
            <button className="btn-clear" onClick={clearAll}>
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="creator-toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn${tool === "place" ? " active" : ""}`}
            onClick={() => setTool("place")}
          >
            <Plus size={15} /> Place
          </button>
          <button
            className={`tool-btn${tool === "rotate" ? " active" : ""}`}
            onClick={() => setTool("rotate")}
          >
            <RotateCw size={15} /> Rotate
          </button>
          <button
            className={`tool-btn${tool === "remove" ? " active" : ""}`}
            onClick={() => setTool("remove")}
          >
            <Trash2 size={15} /> Remove
          </button>
        </div>

        <div className="tool-group">
          <button
            className={`tool-btn preview-btn${showPreview ? " active" : ""}`}
            onClick={() => setShowPreview((v) => !v)}
          >
            <Eye size={15} /> 3D Preview
          </button>
          <span className="slot-count">
            {slots.length} slots
            {roads.size > 0 && <> · {roads.size} roads</>}
          </span>
        </div>
      </div>

      {/* ── Road hint ── */}
      <div className="road-hint">
        <SeparatorHorizontal size={13} />
        Click any thin gutter between two adjacent spots to add a road. Each
        segment is independent — roads push spots apart in the saved coordinates
        but are not stored themselves.
      </div>

      {/* ── Editor area ── */}
      <div className={`creator-workspace${showPreview ? " with-preview" : ""}`}>
        {/* 2D Grid editor — includes gutter slots for road toggles */}
        <div className="grid-editor">
          {/* Column headers */}
          <div className="grid-corner" />
          {Array.from({ length: cols }, (_, c) => (
            <Fragment key={`ch-${c}`}>
              <div className="grid-header col-header">{c + 1}</div>
              {c < cols - 1 && <div className="grid-gutter-spacer" />}
            </Fragment>
          ))}

          {/* Data rows + horizontal gutter rows */}
          {Array.from({ length: rows }, (_, r) => (
            <Fragment key={`row-${r}`}>
              {/* Row header */}
              <div className="grid-header row-header">
                {String.fromCharCode(65 + r)}
              </div>
              {/* Cells + vertical gutter columns (per-segment) */}
              {Array.from({ length: cols }, (_, c) => (
                <Fragment key={`c-${r}-${c}`}>
                  <GridCell
                    row={r}
                    col={c}
                    slot={slotMap[`${r},${c}`]}
                    onPlace={placeSlot}
                    onRotate={rotateSlot}
                    onRemove={removeSlot}
                    tool={tool}
                  />
                  {c < cols - 1 && (
                    <button
                      className={`grid-gutter-v${roads.has(`h:${r},${c}`) ? " road" : ""}`}
                      onClick={() => toggleRoad(`h:${r},${c}`)}
                      title={
                        roads.has(`h:${r},${c}`)
                          ? `Remove road between ${slotLabel(r, c)} and ${slotLabel(r, c + 1)}`
                          : `Add road between ${slotLabel(r, c)} and ${slotLabel(r, c + 1)}`
                      }
                    />
                  )}
                </Fragment>
              ))}

              {/* Horizontal gutter row (per-segment between this row and next) */}
              {r < rows - 1 && (
                <Fragment key={`hg-${r}`}>
                  <div className="grid-gutter-h-header" />
                  {Array.from({ length: cols }, (_, c) => (
                    <Fragment key={`hg-${r}-${c}`}>
                      <button
                        className={`grid-gutter-h${roads.has(`v:${r},${c}`) ? " road" : ""}`}
                        onClick={() => toggleRoad(`v:${r},${c}`)}
                        title={
                          roads.has(`v:${r},${c}`)
                            ? `Remove road between ${slotLabel(r, c)} and ${slotLabel(r + 1, c)}`
                            : `Add road between ${slotLabel(r, c)} and ${slotLabel(r + 1, c)}`
                        }
                      />
                      {c < cols - 1 && (
                        <div
                          className={`grid-gutter-cross${
                            roads.has(`v:${r},${c}`) || roads.has(`h:${r},${c}`) ||
                            roads.has(`v:${r},${c + 1}`) || roads.has(`h:${r + 1},${c}`)
                              ? " road"
                              : ""
                          }`}
                        />
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              )}
            </Fragment>
          ))}

          <style>{`.grid-editor { grid-template-columns: ${gridTemplateCols}; }`}</style>
        </div>

        {/* 3D Preview */}
        {showPreview && (
          <div className="preview-panel">
            <Canvas camera={{ position: [0, 8, 10], fov: 50 }}>
              <PreviewScene
                slots={worldSlots}
                roadSegments={roadSegments}
              />
            </Canvas>
          </div>
        )}
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div className={`creator-feedback ${feedback.type}`}>
          {feedback.msg}
        </div>
      )}

      {/* ── Save button ── */}
      <button
        className="btn-save-lot"
        disabled={saving || !slots.length}
        onClick={() => setConfirmOpen(true)}
      >
        <Save size={16} /> {saving ? "Saving…" : "Save Parking Lot"}
      </button>

      <ConfirmModal
        open={confirmOpen}
        variant="warning"
        title="Create Parking Lot"
        message={`This will create "${lotName || "Untitled"}" with ${slots.length} parking slots. Continue?`}
        confirmText="Create"
        cancelText="Cancel"
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
