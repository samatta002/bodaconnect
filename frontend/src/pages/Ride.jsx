import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FiNavigation, FiMapPin, FiCheck, FiX, FiChevronDown, FiLoader } from "react-icons/fi";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34],
});
const greyIcon = new L.Icon({
  iconUrl:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34],
});

// Real Dar es Salaam locations with coordinates
const DAR_PLACES = [
  { name: "Kariakoo Market",       lat: -6.8160, lng: 39.2738 },
  { name: "Nyerere Road",          lat: -6.8235, lng: 39.2850 },
  { name: "Posta CBD",             lat: -6.8150, lng: 39.2900 },
  { name: "Mlimani City Mall",     lat: -6.7726, lng: 39.2285 },
  { name: "Ubungo Bus Terminal",   lat: -6.7961, lng: 39.2200 },
  { name: "Msasani Beach",         lat: -6.7620, lng: 39.2850 },
  { name: "Kinondoni",             lat: -6.7736, lng: 39.2551 },
  { name: "Tegeta Junction",       lat: -6.7060, lng: 39.2220 },
  { name: "Magomeni",              lat: -6.7980, lng: 39.2620 },
  { name: "Ilala",                 lat: -6.8240, lng: 39.2680 },
  { name: "Temeke",                lat: -6.8780, lng: 39.3000 },
  { name: "Kigamboni Ferry",       lat: -6.8270, lng: 39.3160 },
  { name: "Upanga",                lat: -6.8070, lng: 39.2940 },
  { name: "Mikocheni",             lat: -6.7790, lng: 39.2700 },
  { name: "Sinza",                 lat: -6.7880, lng: 39.2480 },
  { name: "Mwenge",                lat: -6.7680, lng: 39.2490 },
  { name: "Tabata",                lat: -6.8440, lng: 39.2480 },
  { name: "Gongo la Mboto",        lat: -6.8320, lng: 39.2230 },
  { name: "Mbezi Beach",           lat: -6.7380, lng: 39.2260 },
  { name: "Julius Nyerere Airport",lat: -6.8780, lng: 39.2026 },
  { name: "Oyster Bay",            lat: -6.7740, lng: 39.2930 },
  { name: "Masaki",                lat: -6.7650, lng: 39.2860 },
  { name: "Buguruni",              lat: -6.8370, lng: 39.2580 },
  { name: "Mwananyamala Hospital", lat: -6.7910, lng: 39.2630 },
  { name: "Muhimbili Hospital",    lat: -6.8040, lng: 39.2790 },
];

const FARE_PER_KM = 1200;

function calcDist(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function PlaceSelect({ label, value, onChange, dotColor, exclude }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = DAR_PLACES.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (!exclude || p.name !== exclude.name)
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", borderRadius: 12,
          background: open ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.07)"}`,
          cursor: "pointer", transition: "all 0.15s",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0,
          boxShadow: open && dotColor === "#22c55e" ? "0 0 8px #22c55e" : "none" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.62rem", color: "#484f58", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
            {label}
          </div>
          <div style={{ fontSize: "0.88rem", color: value ? "#f0f6fc" : "#484f58" }}>
            {value ? value.name : `Select ${label.toLowerCase()}...`}
          </div>
        </div>
        {value
          ? <button onClick={e => { e.stopPropagation(); onChange(null); setOpen(false); }}
              style={{ background: "none", border: "none", color: "#484f58", cursor: "pointer", display: "flex", padding: 2 }}>
              <FiX size={14} />
            </button>
          : <FiChevronDown size={14} color="#484f58" />
        }
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#0f161e", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, zIndex: 500, overflow: "hidden",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        }}>
          {/* Search */}
          <div style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                padding: "8px 12px", color: "#f0f6fc", fontSize: "0.84rem",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "1rem", fontSize: "0.82rem", color: "#484f58", textAlign: "center" }}>No results</div>
              : filtered.map(place => (
                <div
                  key={place.name}
                  onClick={() => { onChange(place); setOpen(false); setSearch(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background 0.1s",
                    background: value?.name === place.name ? "rgba(34,197,94,0.08)" : "transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = value?.name === place.name ? "rgba(34,197,94,0.08)" : "transparent"}
                >
                  <FiMapPin size={12} color={dotColor} />
                  <span style={{ fontSize: "0.84rem", color: "#f0f6fc" }}>{place.name}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({ setPickup, setDestination, pickup }) {
  useMapEvents({
    click(e) {
      const closest = DAR_PLACES.reduce((prev, cur) => {
        const dPrev = Math.hypot(prev.lat - e.latlng.lat, prev.lng - e.latlng.lng);
        const dCur  = Math.hypot(cur.lat  - e.latlng.lat, cur.lng  - e.latlng.lng);
        return dCur < dPrev ? cur : prev;
      });
      if (!pickup) setPickup(closest);
      else setDestination(closest);
    },
  });
  return null;
}

const NEARBY = [
  { initials: "JM", name: "James Mwangi",  dist: "0.8 km", eta: "2 min", rating: "4.9" },
  { initials: "AO", name: "Aisha Omar",    dist: "1.2 km", eta: "3 min", rating: "4.7" },
  { initials: "PK", name: "Peter Kimani",  dist: "2.0 km", eta: "5 min", rating: "4.8" },
];

export default function Ride() {
  const [pickup, setPickup]           = useState(null);
  const [destination, setDestination] = useState(null);
  const [status, setStatus]           = useState("idle");
  const [rideId, setRideId]           = useState(null);
  const [rideStatus, setRideStatus]   = useState(null);

  const dist = calcDist(pickup, destination);
  const fare = dist ? Math.round(dist * FARE_PER_KM) : null;

  const requestRide = async () => {
    if (!pickup) return;
    setStatus("loading");
    try {
      const res = await axios.post("/api/rides", {
        pickup: pickup.name,
        destination: destination?.name || "Not specified",
      });
      setRideId(res.data?.id || "—");
      setRideStatus(res.data?.status || "pending");
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const reset = () => {
    setPickup(null); setDestination(null);
    setStatus("idle"); setRideId(null); setRideStatus(null);
  };

  useEffect(() => {
    if (status !== "success" || !rideId) return;

    const fetchRideStatus = async () => {
      try {
        const res = await axios.get(`/api/rides/${rideId}`);
        setRideStatus(res.data?.status || "pending");
      } catch (err) {
        console.error(err);
      }
    };

    fetchRideStatus();
    const timer = setInterval(fetchRideStatus, 3000);
    return () => clearInterval(timer);
  }, [status, rideId]);

  const mapCenter = pickup
    ? [pickup.lat, pickup.lng]
    : [-6.8160, 39.2738];

  const rideStatusText = {
    pending: "Waiting for a driver to accept.",
    active: "Driver accepted and is on the way.",
    completed: "Ride completed successfully.",
    cancelled: "Ride was cancelled.",
  }[rideStatus] || "Waiting for ride updates.";

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: 360, flexShrink: 0,
        background: "#0d1117",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        overflowY: "auto", zIndex: 10,
      }}>

        {/* Header */}
        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#484f58", marginBottom: 6 }}>
            Book a Ride
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f6fc" }}>
            Where to?
          </h2>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: "1rem 1.25rem", padding: "1rem 1.25rem", borderRadius: 12,
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#22c55e", fontWeight: 700, marginBottom: 6, fontSize: "0.92rem" }}>
                <FiCheck size={15} /> Ride {rideStatus || "pending"}
              </div>
              <p style={{ fontSize: "0.82rem", color: "#8b949e", lineHeight: 1.6 }}>
                Ride #{rideId} booked from <strong style={{ color: "#f0f6fc" }}>{pickup?.name}</strong> to{" "}
                <strong style={{ color: "#f0f6fc" }}>{destination?.name || "destination"}</strong>.
                {rideStatusText}
              </p>
              <button onClick={reset}
                style={{ marginTop: 12, width: "100%", padding: "8px", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#8b949e",
                  fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>
                Book Another Ride
              </button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: "1rem 1.25rem", padding: "1rem 1.25rem", borderRadius: 12,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontWeight: 700, fontSize: "0.92rem" }}>
                <FiX size={15} /> Request Failed
              </div>
              <p style={{ fontSize: "0.82rem", color: "#8b949e", marginTop: 4 }}>
                Could not reach the server. Check your connection.
              </p>
              <button onClick={() => setStatus("idle")}
                style={{ marginTop: 10, padding: "6px 14px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8b949e",
                  fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location selects */}
        {status !== "success" && (
          <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 10 }}>
            <PlaceSelect
              label="Pickup"
              value={pickup}
              onChange={setPickup}
              dotColor="#22c55e"
              exclude={destination}
            />
            <PlaceSelect
              label="Destination"
              value={destination}
              onChange={setDestination}
              dotColor="#8b949e"
              exclude={pickup}
            />

            {/* Or click map hint */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: "0.78rem", color: "#484f58" }}>
              <FiMapPin size={12} color="#484f58" />
              Or click the map to auto-select nearest location
            </div>

            {/* Fare estimate */}
            {fare && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: "1rem 1.25rem", borderRadius: 12,
                  background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#484f58", marginBottom: 8 }}>
                  Fare Estimate
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e", letterSpacing: "-0.02em" }}>
                    TSh {fare.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#484f58" }}>{dist.toFixed(1)} km</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#484f58", marginTop: 6 }}>
                  ~{Math.round(dist * 3)} min ETA &nbsp;·&nbsp; {pickup?.name} → {destination?.name}
                </div>
              </motion.div>
            )}

            {/* Request button */}
            <button
              onClick={requestRide}
              disabled={!pickup || status === "loading"}
              style={{
                width: "100%", padding: "13px",
                background: !pickup || status === "loading" ? "rgba(34,197,94,0.3)" : "#22c55e",
                border: "none", borderRadius: 9999,
                color: "#000", fontWeight: 700, fontSize: "0.95rem",
                cursor: !pickup || status === "loading" ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
                boxShadow: pickup && status !== "loading" ? "0 0 24px rgba(34,197,94,0.25)" : "none",
              }}
            >
              {status === "loading"
                ? <><FiLoader size={15} style={{ animation: "spin 1s linear infinite" }} /> Finding driver...</>
                : <><FiNavigation size={15} /> Request Ride</>
              }
            </button>
          </div>
        )}

        {/* Nearby drivers */}
        <div style={{ padding: "0 1.25rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "auto", paddingTop: "1.25rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#484f58", marginBottom: 12 }}>
            Nearby Drivers
          </div>
          {NEARBY.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(34,197,94,0.1)",
                color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                {d.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "#f0f6fc" }}>{d.name}</div>
                <div style={{ fontSize: "0.72rem", color: "#484f58" }}>{d.dist} away · {d.eta}</div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#f59e0b" }}>★ {d.rating}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAP ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer center={mapCenter} zoom={13}
          style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <MapClickHandler setPickup={setPickup} setDestination={setDestination} pickup={pickup} />
          {pickup      && <Marker position={[pickup.lat, pickup.lng]}           icon={greenIcon}><Popup>{pickup.name}</Popup></Marker>}
          {destination && <Marker position={[destination.lat, destination.lng]} icon={greyIcon}><Popup>{destination.name}</Popup></Marker>}
        </MapContainer>

        {/* Bottom hint */}
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(13,17,23,0.92)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999,
          padding: "7px 18px", fontSize: "0.8rem", color: "#8b949e",
          display: "flex", alignItems: "center", gap: 7,
          zIndex: 400, pointerEvents: "none",
        }}>
          <FiMapPin size={13} color="#22c55e" />
          {!pickup ? "Click map or use dropdown to set pickup" : !destination ? "Now set your destination" : `${pickup.name} → ${destination.name}`}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
