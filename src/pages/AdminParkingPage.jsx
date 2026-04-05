import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import {
  Building2,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  ParkingCircle,
  MapPin,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  ArrowLeft,
  Shield,
} from "lucide-react";
import "../styles/AdminParking.css";

/* ── Inline‑editable text ── */
function InlineEdit({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  if (!editing) {
    return (
      <button className="inline-edit-trigger" onClick={() => setEditing(true)} title="Click to edit">
        {value || <span className="placeholder">{placeholder}</span>}
        <Pencil size={12} />
      </button>
    );
  }

  const commit = () => {
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    setEditing(false);
  };

  return (
    <span className="inline-edit">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        placeholder={placeholder}
      />
    </span>
  );
}

/* ── Slot row inside a lot ── */
function SlotRow({ slot, onToggle, onDelete }) {
  const coords = typeof slot.location_coordinates === "string"
    ? JSON.parse(slot.location_coordinates)
    : slot.location_coordinates || {};

  return (
    <tr className={`slot-row${slot.is_active ? "" : " inactive"}`}>
      <td className="slot-id">{slot.slot_id}</td>
      <td className="slot-coords">
        {coords.x != null ? `(${coords.x}, ${coords.y})` : "—"}
      </td>
      <td className="slot-status">{slot.status || "available"}</td>
      <td>
        <button
          className={`toggle-btn ${slot.is_active ? "on" : "off"}`}
          onClick={() => onToggle(slot)}
          title={slot.is_active ? "Deactivate" : "Activate"}
        >
          {slot.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>
      </td>
      <td>
        <button className="icon-btn danger" onClick={() => onDelete(slot)} title="Delete slot">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

/* ── Lot card inside a mall ── */
function LotCard({ lot, programs, onUpdate, onDelete, onSlotsChange }) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsFetched, setSlotsFetched] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (slotsFetched) return;
    setLoadingSlots(true);
    try {
      const data = await api(`/api/parking/lots/${lot.lot_id}/slots`);
      setSlots(data || []);
      setSlotsFetched(true);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [lot.lot_id, slotsFetched]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchSlots();
  };

  const handleToggleSlot = async (slot) => {
    try {
      await api(`/api/admin/lots/${lot.lot_id}/slots/${slot.slot_id}`, {
        method: "PATCH",
        body: { is_active: !slot.is_active },
      });
      setSlots((prev) =>
        prev.map((s) => (s.slot_id === slot.slot_id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch { /* silent */ }
  };

  const handleDeleteSlot = async (slot) => {
    try {
      await api(`/api/admin/lots/${lot.lot_id}/slots/${slot.slot_id}`, { method: "DELETE" });
      setSlots((prev) => prev.filter((s) => s.slot_id !== slot.slot_id));
      if (onSlotsChange) onSlotsChange();
    } catch { /* silent */ }
  };

  const handleLotNameSave = (name) => onUpdate({ ...lot, lot_name: name });

  const handleProgramChange = (e) => {
    onUpdate({ ...lot, program_id: e.target.value });
  };

  const programName = (() => {
    const p = programs.find((pr) => pr.program_id === lot.program_id);
    return p ? `${p.provider_name} — ${p.tier}` : lot.program_id;
  })();

  return (
    <div className="lot-card">
      <div className="lot-header" onClick={toggle}>
        <span className="lot-chevron">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <ParkingCircle size={16} className="lot-icon" />
        <span className="lot-name">{lot.lot_name || lot.name || "Unnamed Lot"}</span>
        <span className="lot-program-badge">{programName}</span>
        {lot.location && (
          <span className="lot-location">
            <MapPin size={12} /> {lot.location}
          </span>
        )}
        <span className="lot-slot-count">
          {slots.length > 0 ? `${slots.length} slots` : slotsFetched ? "No slots" : ""}
        </span>
      </div>

      {open && (
        <div className="lot-body">
          <div className="lot-edit-row">
            <label>Name</label>
            <InlineEdit
              value={lot.lot_name || lot.name || ""}
              onSave={handleLotNameSave}
              placeholder="Lot name"
            />
          </div>
          <div className="lot-edit-row">
            <label>Program</label>
            <select value={lot.program_id || ""} onChange={handleProgramChange}>
              <option value="">None</option>
              {programs.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.provider_name} — {p.tier}
                </option>
              ))}
            </select>
          </div>

          {/* Slots table */}
          <div className="lot-slots-section">
            <div className="slots-header">
              <h4>Parking Slots</h4>
            </div>
            {loadingSlots ? (
              <p className="slots-loading">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="slots-empty">No slots yet. Use the Lot Creator to add slots.</p>
            ) : (
              <div className="slots-table-wrap">
                <table className="slots-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Coords</th>
                      <th>Status</th>
                      <th>Active</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((s) => (
                      <SlotRow
                        key={s.slot_id}
                        slot={s}
                        onToggle={handleToggleSlot}
                        onDelete={handleDeleteSlot}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="lot-actions">
            <button className="btn-danger-sm" onClick={() => onDelete(lot)}>
              <Trash2 size={13} /> Delete Lot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════ */
export default function AdminParkingPage() {
  const navigate = useNavigate();

  const [malls, setMalls] = useState([]);
  const [lots, setLots] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Mall management */
  const [expandedMall, setExpandedMall] = useState(null);
  const [addingMall, setAddingMall] = useState(false);
  const [newMallName, setNewMallName] = useState("");

  /* Program management */
  const [addingProgram, setAddingProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({ provider_name: "", tier: "" });

  /* Confirm modal */
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, variant }

  /* ── Fetch data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mallData, lotData, progData] = await Promise.all([
        api("/api/admin/malls").catch(() => null),
        api("/api/parking/lots").catch(() => null),
        api("/api/admin/programs").catch(() => null),
      ]);

      /* Malls — from dedicated endpoint or derived from lots */
      if (mallData && Array.isArray(mallData)) {
        setMalls(mallData);
      } else if (lotData) {
        const mallMap = {};
        lotData.forEach((lot) => {
          const mall = lot.mall && typeof lot.mall === "object" ? lot.mall : null;
          const id = lot.mall_id || (mall && mall.mall_id) || null;
          const name = lot.mall_name || (mall && (mall.mall_name || mall.name)) || null;
          if (id && name) mallMap[id] = { mall_id: id, name };
        });
        setMalls(Object.values(mallMap));
      }

      /* Programs — from dedicated endpoint or derived from lots */
      const progArr = Array.isArray(progData) ? progData : progData?.programs || progData?.data || [];
      if (progArr.length) {
        setPrograms(progArr);
      } else if (lotData) {
        const progMap = {};
        lotData.forEach((lot) => {
          const prog = lot.program || lot.privilege_program;
          if (prog && prog.program_id) progMap[prog.program_id] = prog;
        });
        setPrograms(Object.values(progMap));
      }

      setLots(lotData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Mall CRUD ── */
  const handleAddMall = async () => {
    if (!newMallName.trim()) return;
    try {
      const created = await api("/api/admin/malls", {
        method: "POST",
        body: { name: newMallName.trim() },
      });
      setMalls((prev) => [...prev, created]);
      setNewMallName("");
      setAddingMall(false);
    } catch (err) {
      alert(err.message || "Failed to create mall");
    }
  };

  const handleRenameMall = async (mall, newName) => {
    try {
      await api(`/api/admin/malls/${mall.mall_id}`, {
        method: "PATCH",
        body: { name: newName },
      });
      setMalls((prev) =>
        prev.map((m) => (m.mall_id === mall.mall_id ? { ...m, name: newName } : m))
      );
    } catch { /* silent */ }
  };

  const handleDeleteMall = (mall) => {
    const mallLots = lots.filter((l) => {
      const lid = l.mall_id || (l.mall && l.mall.mall_id);
      return lid === mall.mall_id;
    });
    setConfirm({
      title: "Delete Mall",
      message: `Delete "${mall.name}"${mallLots.length ? ` and its ${mallLots.length} parking lot(s)` : ""}? This cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api(`/api/admin/malls/${mall.mall_id}`, { method: "DELETE" });
          setMalls((prev) => prev.filter((m) => m.mall_id !== mall.mall_id));
          setLots((prev) =>
            prev.filter((l) => {
              const lid = l.mall_id || (l.mall && l.mall.mall_id);
              return lid !== mall.mall_id;
            })
          );
        } catch (err) {
          alert(err.message || "Failed to delete mall");
        }
      },
    });
  };

  /* ── Program CRUD ── */
  const handleAddProgram = async () => {
    if (!newProgram.provider_name.trim() || !newProgram.tier.trim()) return;
    try {
      const created = await api("/api/admin/programs", {
        method: "POST",
        body: { provider_name: newProgram.provider_name.trim(), tier: newProgram.tier.trim() },
      });
      setPrograms((prev) => [...prev, created]);
      setNewProgram({ provider_name: "", tier: "" });
      setAddingProgram(false);
    } catch (err) {
      alert(err.message || "Failed to create program");
    }
  };

  const handleDeleteProgram = (program) => {
    const label = `${program.provider_name} — ${program.tier}`;
    const linkedLots = lots.filter((l) => l.program_id === program.program_id);
    setConfirm({
      title: "Delete Privilege Program",
      message: `Delete "${label}"${linkedLots.length ? ` (used by ${linkedLots.length} lot${linkedLots.length > 1 ? "s" : ""})` : ""}? This cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api(`/api/admin/programs/${program.program_id}`, { method: "DELETE" });
          setPrograms((prev) => prev.filter((p) => p.program_id !== program.program_id));
        } catch (err) {
          alert(err.message || "Failed to delete program");
        }
      },
    });
  };

  /* ── Lot CRUD ── */
  const handleUpdateLot = async (updated) => {
    try {
      await api(`/api/admin/lots/${updated.lot_id}`, {
        method: "PATCH",
        body: {
          lot_name: updated.lot_name || updated.name,
          program_id: updated.program_id,
        },
      });
      setLots((prev) => prev.map((l) => (l.lot_id === updated.lot_id ? { ...l, ...updated } : l)));
    } catch { /* silent */ }
  };

  const handleDeleteLot = (lot) => {
    setConfirm({
      title: "Delete Parking Lot",
      message: `Delete "${lot.lot_name || lot.name || "this lot"}" and all its slots? This cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api(`/api/admin/lots/${lot.lot_id}`, { method: "DELETE" });
          setLots((prev) => prev.filter((l) => l.lot_id !== lot.lot_id));
        } catch (err) {
          alert(err.message || "Failed to delete lot");
        }
      },
    });
  };

  /* ── Group lots by mall ── */
  const lotsByMall = (mallId) =>
    lots.filter((l) => {
      const lid = l.mall_id || (l.mall && l.mall.mall_id);
      return lid === mallId;
    });

  if (loading) {
    return (
      <div className="admin-parking">
        <p className="ap-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="admin-parking">
      <button className="btn-back" onClick={() => navigate("/admin")}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <h2>Parking Management</h2>
      <p className="ap-subtitle">
        Manage malls, privilege parking lots, and individual slots.
      </p>

      {/* ── Stats ── */}
      <div className="ap-stats">
        <div className="ap-stat">
          <div className="stat-number">{malls.length}</div>
          <div className="stat-desc">Malls</div>
        </div>
        <div className="ap-stat">
          <div className="stat-number">{lots.length}</div>
          <div className="stat-desc">Lots</div>
        </div>
        <div className="ap-stat">
          <div className="stat-number">{programs.length}</div>
          <div className="stat-desc">Programs</div>
        </div>
      </div>

      {/* ── Mall list ── */}
      <div className="ap-section">
        <div className="ap-section-header">
          <h3>Malls</h3>
          {addingMall ? (
            <div className="add-mall-form">
              <input
                autoFocus
                value={newMallName}
                onChange={(e) => setNewMallName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddMall();
                  if (e.key === "Escape") { setAddingMall(false); setNewMallName(""); }
                }}
                placeholder="Mall name…"
              />
              <button className="icon-btn confirm" onClick={handleAddMall}><Check size={15} /></button>
              <button className="icon-btn" onClick={() => { setAddingMall(false); setNewMallName(""); }}><X size={15} /></button>
            </div>
          ) : (
            <button className="btn-add" onClick={() => setAddingMall(true)}>
              <Plus size={14} /> Add Mall
            </button>
          )}
        </div>

        {malls.length === 0 ? (
          <div className="ap-empty">No malls found. Add one to get started.</div>
        ) : (
          <div className="mall-list">
            {malls.map((mall) => {
              const isExpanded = expandedMall === mall.mall_id;
              const mallLots = lotsByMall(mall.mall_id);

              return (
                <div key={mall.mall_id} className={`mall-card${isExpanded ? " expanded" : ""}`}>
                  <div
                    className="mall-header"
                    onClick={() => setExpandedMall(isExpanded ? null : mall.mall_id)}
                  >
                    <span className="mall-chevron">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <Building2 size={18} className="mall-icon" />
                    <span className="mall-name">{mall.name}</span>
                    <span className="mall-lot-count">
                      {mallLots.length} lot{mallLots.length !== 1 ? "s" : ""}
                    </span>
                    <div className="mall-actions" onClick={(e) => e.stopPropagation()}>
                      <InlineEdit
                        value={mall.name}
                        onSave={(name) => handleRenameMall(mall, name)}
                        placeholder="Mall name"
                      />
                      <button
                        className="icon-btn danger"
                        onClick={() => handleDeleteMall(mall)}
                        title="Delete mall"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mall-body">
                      {mallLots.length === 0 ? (
                        <div className="mall-empty">
                          No parking lots in this mall.{" "}
                          <button
                            className="link-btn"
                            onClick={() => navigate("/admin/parking-creator")}
                          >
                            Create one →
                          </button>
                        </div>
                      ) : (
                        <div className="lot-list">
                          {mallLots.map((lot) => (
                            <LotCard
                              key={lot.lot_id}
                              lot={lot}
                              programs={programs}
                              onUpdate={handleUpdateLot}
                              onDelete={handleDeleteLot}
                              onSlotsChange={fetchAll}
                            />
                          ))}
                        </div>
                      )}

                      <button
                        className="btn-add-lot"
                        onClick={() => navigate("/admin/parking-creator")}
                      >
                        <Plus size={14} /> Create Lot in This Mall
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Programs section ── */}
      <div className="ap-section">
        <div className="ap-section-header">
          <h3>Privilege Programs</h3>
          {addingProgram ? (
            <div className="add-mall-form">
              <input
                autoFocus
                value={newProgram.provider_name}
                onChange={(e) => setNewProgram((p) => ({ ...p, provider_name: e.target.value }))}
                placeholder="Provider name…"
              />
              <input
                value={newProgram.tier}
                onChange={(e) => setNewProgram((p) => ({ ...p, tier: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddProgram();
                  if (e.key === "Escape") { setAddingProgram(false); setNewProgram({ provider_name: "", tier: "" }); }
                }}
                placeholder="Tier…"
              />
              <button className="icon-btn confirm" onClick={handleAddProgram}><Check size={15} /></button>
              <button className="icon-btn" onClick={() => { setAddingProgram(false); setNewProgram({ provider_name: "", tier: "" }); }}><X size={15} /></button>
            </div>
          ) : (
            <button className="btn-add" onClick={() => setAddingProgram(true)}>
              <Plus size={14} /> Add Program
            </button>
          )}
        </div>

        {programs.length === 0 ? (
          <div className="ap-empty">No privilege programs found. Add one to get started.</div>
        ) : (
          <div className="program-list">
            {programs.map((prog) => {
              const linkedCount = lots.filter((l) => l.program_id === prog.program_id).length;
              return (
                <div key={prog.program_id} className="program-card">
                  <Shield size={16} className="program-icon" />
                  <span className="program-provider">{prog.provider_name}</span>
                  <span className="program-tier">{prog.tier}</span>
                  {linkedCount > 0 && (
                    <span className="program-lot-count">
                      {linkedCount} lot{linkedCount > 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDeleteProgram(prog)}
                    title="Delete program"
                    style={{ marginLeft: "auto" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          open
          variant={confirm.variant || "danger"}
          title={confirm.title}
          message={confirm.message}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
