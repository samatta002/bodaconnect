import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FiNavigation, FiMapPin, FiCheck, FiX, FiChevronDown, FiLoader, FiClock, FiTruck, FiUser, FiStar, FiMessageSquare } from "react-icons/fi";

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
const driverIcon = L.divIcon({
  className: "driver-live-marker",
  html: "<div>➤</div>",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
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

export default function Ride({ onNotify }) {
  const [pickup, setPickup]           = useState(null);
  const [destination, setDestination] = useState(null);
  const [status, setStatus]           = useState("idle");
  const [rideId, setRideId]           = useState(null);
  const [rideStatus, setRideStatus]   = useState(null);
  const [tracking, setTracking]       = useState(null);
  const [toast, setToast]             = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);
  const notify = (nextToast) => {
    if (onNotify) onNotify(nextToast);
    else setToast(nextToast);
  };

  const dist = calcDist(pickup, destination);
  const fare = dist ? Math.round(dist * FARE_PER_KM) : null;

  const requestRide = async () => {
    if (!pickup) return;
    setStatus("loading");
    try {
      const res = await axios.post("/api/rides", {
        pickup: pickup.name,
        destination: destination?.name || "Not specified",
        pickup_location: { latitude: pickup.lat, longitude: pickup.lng },
        destination_location: destination ? { latitude: destination.lat, longitude: destination.lng } : null,
      });
      setRideId(res.data?.id || "—");
      setRideStatus(res.data?.status || "pending");
      setTracking(null);
      notify({ type: "success", text: "Ride request sent. Waiting for a driver." });
      setStatus("success");
    } catch (err) {
      console.error(err);
      notify({ type: "error", text: "Ride request failed. Please try again." });
      setStatus("error");
    }
  };

  useEffect(() => {
    const fetchNearbyDrivers = async () => {
      try {
        const res = await axios.get("/api/drivers/nearby");
        setNearbyDrivers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNearbyDrivers();
    const timer = setInterval(fetchNearbyDrivers, 8000);
    return () => clearInterval(timer);
  }, []);

  const reset = () => {
    setPickup(null); setDestination(null);
    setStatus("idle"); setRideId(null); setRideStatus(null);
    setTracking(null); setToast(null); setSubmittedReview(null); setReviewRating(5); setReviewComment("");
  };

  useEffect(() => {
    if (status !== "success" || !rideId) return;
    let previousStatus = rideStatus;

    const fetchRideTracking = async () => {
      try {
        const res = await axios.get(`/api/rides/${rideId}/tracking`);
        const nextStatus = res.data?.ride?.status || "pending";
        setRideStatus(nextStatus);
        setTracking(res.data || null);
        setSubmittedReview(res.data?.review || null);

        if (previousStatus && previousStatus !== nextStatus) {
          const message = {
            active: "Driver accepted your ride and is on the way.",
            completed: "Ride completed successfully.",
            cancelled: "Ride was cancelled.",
          }[nextStatus];
          if (message) notify({ type: nextStatus === "cancelled" ? "error" : "success", text: message });
        }
        previousStatus = nextStatus;
      } catch (err) {
        console.error(err);
      }
    };

    fetchRideTracking();
    const timer = setInterval(fetchRideTracking, 3000);
    return () => clearInterval(timer);
  }, [status, rideId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const mapCenter = pickup
    ? [pickup.lat, pickup.lng]
    : [-6.8160, 39.2738];

  const rideStatusText = {
    pending: "Waiting for a driver to accept.",
    active: "Driver accepted and is on the way.",
    completed: "Ride completed successfully.",
    cancelled: "Ride was cancelled.",
  }[rideStatus] || "Waiting for ride updates.";
  const driverLocation = tracking?.driver_location;
  const assignedDriver = tracking?.driver;
  const driverPosition = driverLocation?.latitude && driverLocation?.longitude
    ? [Number(driverLocation.latitude), Number(driverLocation.longitude)]
    : null;
  const liveProgress = Math.min(Number(driverLocation?.progress_percent || 0), 100);
  const progress = rideStatus === "completed" ? 100 : rideStatus === "active" ? Math.max(liveProgress, 15) : liveProgress;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rideId || submittedReview) return;

    setSubmittingReview(true);
    try {
      const res = await axios.post(`/api/rides/${rideId}/review`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      setSubmittedReview(res.data);
      notify({ type: "success", text: "Thanks for rating your ride." });
    } catch (err) {
      notify({ type: "error", text: err.response?.data?.error || "Could not submit review." });
    } finally {
      setSubmittingReview(false);
    }
  };

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
          {!onNotify && toast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`ride-toast ${toast.type}`}
            >
              {toast.type === "error" ? <FiX /> : <FiCheck />}
              <span>{toast.text}</span>
            </motion.div>
          )}

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

        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="ride-live-tracker"
          >
            <div className="ride-tracker-head">
              <div>
                <span>Live Tracker</span>
                <strong>{rideStatus === "active" ? "Driver on route" : rideStatus === "completed" ? "Trip complete" : "Finding driver"}</strong>
              </div>
              <div className={`ride-status-pill ${rideStatus || "pending"}`}>{rideStatus || "pending"}</div>
            </div>

            <div className="ride-progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="ride-tracker-grid">
              <div>
                <FiTruck />
                <span>Driver</span>
                <strong>{driverLocation?.driver_name || assignedDriver?.name || "Pending"}</strong>
              </div>
              <div>
                <FiUser />
                <span>Plate</span>
                <strong>{driverLocation?.plate || assignedDriver?.plate || "Waiting"}</strong>
              </div>
              <div>
                <FiClock />
                <span>Progress</span>
                <strong>{progress}%</strong>
              </div>
            </div>

            <div className="ride-tracker-location">
              <FiMapPin />
              <span>
                {driverLocation?.location_name ||
                  (rideStatus === "completed" ? "Trip completed." :
                    rideStatus === "active" ? "Driver accepted. Waiting for live location update." :
                      "Driver location will appear after acceptance.")}
              </span>
            </div>
          </motion.div>
        )}

        {status === "success" && rideStatus === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="ride-review-card"
          >
            {submittedReview ? (
              <>
                <div className="ride-review-head">
                  <div>
                    <span>Ride Review</span>
                    <strong>Review submitted</strong>
                  </div>
                  <div className="ride-review-stars readonly">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar key={star} className={star <= submittedReview.rating ? "active" : ""} />
                    ))}
                  </div>
                </div>
                {submittedReview.comment && (
                  <p className="ride-review-comment">{submittedReview.comment}</p>
                )}
              </>
            ) : (
              <form onSubmit={submitReview}>
                <div className="ride-review-head">
                  <div>
                    <span>Rate Your Ride</span>
                    <strong>{assignedDriver?.name || driverLocation?.driver_name || "Your driver"}</strong>
                  </div>
                </div>

                <div className="ride-review-stars" aria-label="Choose ride rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={star <= reviewRating ? "active" : ""}
                      aria-label={`${star} star rating`}
                    >
                      <FiStar />
                    </button>
                  ))}
                </div>

                <label className="ride-review-input">
                  <FiMessageSquare />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={300}
                    placeholder="Optional comment about your trip"
                  />
                </label>

                <button className="btn btn-green" type="submit" disabled={submittingReview}>
                  {submittingReview ? "Submitting..." : "Submit review"}
                </button>
              </form>
            )}
          </motion.div>
        )}

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
          {nearbyDrivers.length === 0 && (
            <div style={{ fontSize: "0.8rem", color: "#8b949e", lineHeight: 1.55 }}>
              No online drivers yet. Drivers appear here when they switch Driver Mode online.
            </div>
          )}
          {nearbyDrivers.map((d, i) => (
            <div key={d.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: i < nearbyDrivers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(34,197,94,0.1)",
                color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                {(d.name || "Driver").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "#f0f6fc" }}>{d.name || "Available driver"}</div>
                <div style={{ fontSize: "0.72rem", color: "#484f58" }}>{d.plate || "No plate"} - Online</div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#f59e0b" }}>Rating {d.rating || "5.00"}</div>
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
          {driverPosition && <Marker position={driverPosition} icon={driverIcon}><Popup>{driverLocation?.driver_name || "Driver"} is on route</Popup></Marker>}
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
