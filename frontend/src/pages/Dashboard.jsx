import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FiTruck, FiCheckCircle, FiClock, FiDollarSign,
  FiRefreshCw, FiAlertCircle, FiActivity,
  FiArrowUpRight, FiArrowDownRight, FiStar, FiPower, FiRadio,
} from "react-icons/fi";

const API = "/api";

const getAuth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("bc_token")}` },
});

const STATUS_MAP = {
  pending:   { cls: "badge-orange", label: "Pending"   },
  accepted:  { cls: "badge-green",  label: "Accepted"  },
  active:    { cls: "badge-green",  label: "On Trip"   },
  completed: { cls: "badge-muted",  label: "Completed" },
  cancelled: { cls: "badge-red",    label: "Cancelled" },
};

function StatusBadge({ status }) {
  const { cls, label } = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span className={`badge ${cls}`}>{label}</span>;
}

function describeLiveEvent(event) {
  const payload = event.payload?.payload || event.payload || {};
  const topic = event.payload?.topic;

  if (topic === "ride/request") {
    return {
      label: "New request",
      title: `Ride #${payload.ride_id || "-"}`,
      detail: `${payload.pickup || "Pickup"} to ${payload.destination || "destination"}`,
    };
  }

  if (topic === "ride/status" || event.type === "ride.status.synced") {
    const statusText = {
      accepted: "Driver accepted",
      active: "Trip started",
      completed: "Ride completed",
      cancelled: "Ride cancelled",
      rejected: "Ride rejected",
    }[payload.status] || "Ride updated";

    return {
      label: statusText,
      title: `Ride #${payload.ride_id || "-"}`,
      detail: payload.driver_name ? `${payload.driver_name} - ${payload.plate || "No plate"}` : payload.message || "Status changed",
    };
  }

  if (topic === "driver/location" || event.type === "driver.location.synced") {
    return {
      label: "Location update",
      title: `Ride #${payload.ride_id || "-"}`,
      detail: payload.location_name || `Progress ${payload.progress_percent || 0}%`,
    };
  }

  if (event.type === "mqtt.publish_skipped") {
    return {
      label: "Connection notice",
      title: "Live update delayed",
      detail: "The realtime broker is not connected.",
    };
  }

  return {
    label: "Live update",
    title: `Ride #${payload.ride_id || "-"}`,
    detail: payload.message || new Date(event.timestamp).toLocaleTimeString(),
  };
}

export default function Dashboard({ driver, onLogout, onDriverUpdate, onNotify }) {
  const [rides, setRides]         = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError]         = useState(null);
  const [view, setView]           = useState("active");
  const [accepting, setAccepting] = useState(null);
  const [hovered, setHovered]     = useState(null);
  const [driverStatus, setDriverStatus] = useState(driver?.status || "available");
  const [savingStatus, setSavingStatus] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const isOnline = driverStatus !== "offline";
  const notify = (toast) => onNotify?.(toast);

  const fetchRides = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/rides`, getAuth());
      setRides(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 401) onLogout();
      else {
        setError("Could not load rides.");
        if (!silent) notify({ type: "error", text: "Could not load rides." });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchHistory = async ({ silent = false } = {}) => {
    if (!silent) setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/driver/rides/history`, getAuth());
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 401) onLogout();
      else if (!silent) notify({ type: "error", text: "Could not load ride history." });
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
    fetchHistory();
    const timer = setInterval(() => {
      fetchRides({ silent: true });
      fetchHistory({ silent: true });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const events = new EventSource(`${API}/events`);

    events.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        setLiveEvents((current) => [event, ...current].slice(0, 8));

        const topic = event.payload?.topic;
        if (topic === "ride/request" || topic === "ride/status" || event.type.startsWith("ride.")) {
          fetchRides({ silent: true });
          fetchHistory({ silent: true });
        }
      } catch {
        // Ignore malformed event stream messages.
      }
    };

    events.onerror = () => {
      events.close();
    };

    return () => events.close();
  }, []);

  useEffect(() => {
    setDriverStatus(driver?.status || "available");
  }, [driver?.status]);

  const toggleDriverMode = async () => {
    const nextStatus = isOnline ? "offline" : "available";
    setSavingStatus(true);
    setError(null);

    try {
      const res = await axios.patch(`${API}/driver/status`, { status: nextStatus }, getAuth());
      setDriverStatus(res.data.status);
      onDriverUpdate?.({ status: res.data.status });
      notify({
        type: "success",
        text: res.data.status === "available" ? "Driver Mode is online." : "Driver Mode is offline.",
      });
    } catch (err) {
      if (err.response?.status === 401) onLogout();
      else {
        setError("Failed to update driver mode.");
        notify({ type: "error", text: "Failed to update driver mode." });
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const acceptRide = async (ride) => {
    setAccepting(ride.id);
    try {
      await axios.patch(`${API}/rides/${ride.id}/status`, { status: "accepted" }, getAuth());
      setRides(prev => prev.map(r => r.id === ride.id ? { ...r, status: "accepted" } : r));
      notify({ type: "success", text: `Ride #${ride.id} accepted.` });
    } catch {
      setError("Failed to accept ride.");
      notify({ type: "error", text: "Failed to accept ride." });
    }
    finally { setAccepting(null); }
  };

  const startTrip = async (ride) => {
    setAccepting(ride.id);
    try {
      await axios.patch(`${API}/rides/${ride.id}/status`, { status: "active" }, getAuth());
      setRides(prev => prev.map(r => r.id === ride.id ? { ...r, status: "active" } : r));
      notify({ type: "success", text: `Ride #${ride.id} started.` });
    } catch {
      setError("Failed to start trip.");
      notify({ type: "error", text: "Failed to start trip." });
    }
    finally { setAccepting(null); }
  };

  const completeRide = async (ride) => {
    setAccepting(ride.id);
    try {
      await axios.patch(`${API}/rides/${ride.id}/status`, { status: "completed" }, getAuth());
      setRides(prev => prev.map(r => r.id === ride.id ? { ...r, status: "completed" } : r));
      notify({ type: "success", text: `Ride #${ride.id} completed.` });
    } catch {
      setError("Failed to complete ride.");
      notify({ type: "error", text: "Failed to complete ride." });
    }
    finally { setAccepting(null); }
  };

  const active    = rides.filter(r => ["accepted", "active"].includes(r.status)).length;
  const pending   = rides.filter(r => r.status === "pending").length;
  const completed = rides.filter(r => r.status === "completed").length;
  const revenue   = completed * 3200;
  const activeRides = rides.filter(r => ["pending", "accepted", "active"].includes(r.status));

  const statCards = [
    { label: "Total Rides",   value: rides.length, sub: "All requests",      up: true,  icon: <FiTruck size={17} />,      color: "var(--text)",  dim: "var(--white-dim2)"     },
    { label: "Active Now",    value: active,        sub: "Pickup or trip in progress",  up: true,  icon: <FiActivity size={17} />,   color: "var(--green)", dim: "var(--green-dim)"      },
    { label: "Pending",       value: pending,       sub: "Awaiting driver",   up: false, icon: <FiClock size={17} />,      color: "var(--amber)", dim: "rgba(245,158,11,0.10)" },
    { label: "Revenue Today", value: `TSh ${revenue.toLocaleString()}`, sub: "Completed rides", up: true, icon: <FiDollarSign size={17} />, color: "var(--green)", dim: "var(--green-dim)" },
  ];

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", paddingTop: "0.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 4 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text3)" }}>
              Welcome back, <span style={{ color: "var(--green)", fontWeight: 600 }}>{driver?.name}</span>
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchRides} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
            <FiRefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </motion.div>

        {/* Driver profile card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{
            background: "var(--card2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 16, marginBottom: "1.5rem",
          }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: "#000", flexShrink: 0,
          }}>
            {driver?.name?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 2 }}>{driver?.name}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{driver?.email}</div>
          </div>
          <button
            type="button"
            onClick={toggleDriverMode}
            disabled={savingStatus}
            className={`driver-mode-toggle ${isOnline ? "online" : "offline"}`}
            aria-pressed={isOnline}
          >
            <span className="driver-mode-dot"><FiPower size={12} /></span>
            <span>
              <strong>Driver Mode</strong>
              <small>{savingStatus ? "Updating..." : isOnline ? "Online" : "Offline"}</small>
            </span>
          </button>
          {driver?.plate && (
            <div style={{
              padding: "4px 12px", borderRadius: 9999,
              background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.2)",
              fontSize: "0.78rem", fontWeight: 600, color: "var(--green)",
              fontFamily: "var(--mono)",
            }}>
              {driver.plate}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", color: "#f59e0b" }}>
            <FiStar size={13} />
            <span style={{ fontWeight: 600 }}>{driver?.rating || "5.00"}</span>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
            borderRadius: "var(--radius-sm)", background: "var(--white-dim)",
            border: "1px solid var(--border2)", marginBottom: "1.5rem",
            fontSize: "0.82rem", color: "var(--text2)",
          }}>
            <FiAlertCircle size={14} color="var(--amber)" /> {error}
          </motion.div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {statCards.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
                  {s.label}
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: s.dim, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {s.icon}
                </div>
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.02em", color: s.color, marginBottom: 8 }}>
                {s.value}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: s.up ? "var(--green)" : "var(--amber)" }}>
                {s.up ? <FiArrowUpRight size={12} /> : <FiArrowDownRight size={12} />}
                {s.sub}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="event-feed-card"
        >
          <div className="event-feed-head">
            <div>
              <span>Live Activity</span>
              <strong>Recent ride updates</strong>
            </div>
            <FiRadio />
          </div>
          {liveEvents.length === 0 ? (
            <p className="event-feed-empty">Waiting for new ride activity...</p>
          ) : (
            <div className="event-feed-list">
              {liveEvents.map((event) => {
                const item = describeLiveEvent(event);
                return (
                  <div key={`${event.id}-${event.type}`} className="event-feed-item">
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Rides table */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "2rem" }}>

          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 2 }}>{view === "active" ? "Active Requests" : "Ride History"}</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                {view === "active" ? "Accept requests, start trips at pickup, then complete at destination" : "Completed and cancelled rides assigned to you"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="dashboard-tabs">
                <button type="button" className={view === "active" ? "active" : ""} onClick={() => setView("active")}>
                  Active
                </button>
                <button type="button" className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
                  History
                </button>
              </div>
            </div>
          </div>

          {view === "active" && (
            <div className="dashboard-table-meta">
              <span className="badge badge-muted">{activeRides.length} active view</span>
              {active  > 0 && <span className="badge badge-green">{active} active</span>}
              {pending > 0 && <span className="badge badge-orange">{pending} pending</span>}
            </div>
          )}

          {view === "history" && (
            <div className="dashboard-table-meta">
              <span className="badge badge-muted">{history.length} historical</span>
              <span className="badge badge-green">{history.filter(r => r.status === "completed").length} completed</span>
              <span className="badge badge-red">{history.filter(r => r.status === "cancelled").length} cancelled</span>
            </div>
          )}

          {view === "active" && loading && (
            <div style={{ padding: "1.5rem 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />)}
            </div>
          )}

          {view === "history" && historyLoading && (
            <div style={{ padding: "1.5rem 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />)}
            </div>
          )}

          {view === "active" && !loading && activeRides.length === 0 && (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--text3)" }}>
              <FiTruck size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
              <p style={{ fontSize: "0.9rem", marginBottom: 6 }}>No active rides</p>
              <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>New passenger requests will appear here</p>
            </div>
          )}

          {view === "history" && !historyLoading && history.length === 0 && (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--text3)" }}>
              <FiClock size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
              <p style={{ fontSize: "0.9rem", marginBottom: 6 }}>No ride history yet</p>
              <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>Completed and cancelled rides will appear here</p>
            </div>
          )}

          {view === "active" && !loading && activeRides.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["ID", "Passenger", "Pickup", "Destination", "Status", "Action"].map(h => (
                      <th key={h} style={{
                        padding: "11px 20px", textAlign: "left",
                        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text3)",
                        background: "var(--bg3)", borderBottom: "1px solid var(--border)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRides.map((r, i) => (
                    <tr key={r.id || i}
                      onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                      style={{
                        borderBottom: i < rides.length - 1 ? "1px solid var(--border)" : "none",
                        background: hovered === i ? "var(--bg3)" : "transparent",
                        transition: "background 0.12s",
                      }}>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", color: "var(--text3)" }}>
                          #{String(r.id || i+1).padStart(3,"0")}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ fontSize: "0.83rem", color: "var(--text2)", fontWeight: 600 }}>{r.passenger_name || "Passenger"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 2 }}>{r.passenger_phone || "No phone"}</div>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.83rem", color: "var(--text2)" }}>{r.pickup}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text3)", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.83rem", color: "var(--text2)" }}>{r.destination || "—"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        {r.status === "pending" && (
                          <button className="btn btn-green btn-sm" disabled={accepting === r.id} onClick={() => acceptRide(r)}
                            style={{ minWidth: 100, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {accepting === r.id
                              ? <FiRefreshCw size={12} style={{ animation: "spin 0.8s linear infinite" }} />
                              : <><FiCheckCircle size={12} /> Accept</>}
                          </button>
                        )}
                        {r.status === "accepted" && (
                          <button className="btn btn-sm" disabled={accepting === r.id} onClick={() => startTrip(r)}
                            style={{ minWidth: 100, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "var(--radius-md)" }}>
                            {accepting === r.id
                              ? <FiRefreshCw size={12} style={{ animation: "spin 0.8s linear infinite" }} />
                              : <><FiCheckCircle size={12} /> Start Trip</>}
                          </button>
                        )}
                        {r.status === "active" && (
                          <button className="btn btn-sm" disabled={accepting === r.id} onClick={() => completeRide(r)}
                            style={{ minWidth: 100, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "var(--radius-md)" }}>
                            {accepting === r.id
                              ? <FiRefreshCw size={12} style={{ animation: "spin 0.8s linear infinite" }} />
                              : <><FiCheckCircle size={12} /> Complete</>}
                          </button>
                        )}
                        {r.status === "completed" && (
                          <span style={{ fontSize: "0.78rem", color: "var(--text3)", display: "flex", alignItems: "center", gap: 5 }}>
                            <FiCheckCircle size={13} color="var(--green)" /> Done
                          </span>
                        )}
                        {r.status === "cancelled" && (
                          <span style={{ fontSize: "0.78rem", color: "var(--red)", display: "flex", alignItems: "center", gap: 5 }}>
                            <FiAlertCircle size={13} /> Cancelled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "history" && !historyLoading && history.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["ID", "Passenger", "Route", "Status", "Review", "Date"].map(h => (
                      <th key={h} style={{
                        padding: "11px 20px", textAlign: "left",
                        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text3)",
                        background: "var(--bg3)", borderBottom: "1px solid var(--border)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => (
                    <tr key={r.id || i}
                      style={{
                        borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
                      }}>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", color: "var(--text3)" }}>
                          #{String(r.id || i+1).padStart(3,"0")}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ fontSize: "0.83rem", color: "var(--text2)", fontWeight: 600 }}>{r.passenger_name || "Passenger"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 2 }}>{r.passenger_phone || "No phone"}</div>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ fontSize: "0.83rem", color: "var(--text2)" }}>{r.pickup}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 2 }}>to {r.destination || "destination"}</div>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: "13px 20px", minWidth: 180 }}>
                        {r.review_rating ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--amber)", fontSize: "0.8rem", fontWeight: 700 }}>
                              <FiStar size={13} /> {r.review_rating}/5
                            </div>
                            {r.review_comment && <div style={{ color: "var(--text3)", fontSize: "0.74rem", marginTop: 4 }}>{r.review_comment}</div>}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>No review</span>
                        )}
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>
                          {r.created_at ? new Date(r.created_at).toLocaleString() : "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
