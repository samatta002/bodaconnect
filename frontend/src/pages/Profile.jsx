import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FiAward,
  FiCreditCard,
  FiLock,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiTruck,
  FiUser,
} from "react-icons/fi";

const API = "/api";

const getAuth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("bc_token")}` },
});

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  plate: "",
  nida: "",
  password: "",
};

function Field({ label, icon, children }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <div>
        {icon}
        {children}
      </div>
    </label>
  );
}

export default function Profile({ driver, onLogout, onDriverUpdate, onNotify }) {
  const [form, setForm] = useState({ ...emptyProfile, ...driver });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const notify = (toast) => onNotify?.(toast);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API}/auth/me`, getAuth());
        setForm({ ...emptyProfile, ...res.data, password: "" });
        onDriverUpdate?.(res.data);
      } catch (err) {
        if (err.response?.status === 401) onLogout();
        else {
          setError("Could not load profile.");
          notify({ type: "error", text: "Could not load driver profile." });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email) return setError("Name and email are required.");
    if (form.password && form.password.length < 6) return setError("Password must be at least 6 characters.");

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        plate: form.plate,
        nida: form.nida,
      };
      if (form.password) payload.password = form.password;

      const res = await axios.put(`${API}/auth/me`, payload, getAuth());
      setForm({ ...emptyProfile, ...res.data, password: "" });
      onDriverUpdate?.(res.data);
      notify({ type: "success", text: "Driver profile updated." });
    } catch (err) {
      const message = err.response?.data?.error || "Failed to update profile.";
      setError(message);
      notify({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.name || "Driver")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      <div className="container profile-shell">
        <motion.aside initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="profile-summary">
          <div className="profile-avatar">{initials}</div>
          <h1>{form.name || "Driver Profile"}</h1>
          <p>{form.email || "Complete your account details"}</p>

          <div className="profile-status-grid">
            <span>
              <FiTruck />
              <strong>{form.plate || "No plate"}</strong>
              <small>Vehicle plate</small>
            </span>
            <span>
              <FiAward />
              <strong>{form.rating || "5.00"}</strong>
              <small>Driver rating</small>
            </span>
            <span>
              <FiShield />
              <strong>{form.status === "offline" ? "Offline" : "Online"}</strong>
              <small>Driver mode</small>
            </span>
          </div>

          <div className="profile-note">
            <FiCreditCard />
            <span>NIDA and plate details help riders identify the correct driver before pickup.</span>
          </div>
        </motion.aside>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="profile-card">
          <div className="profile-card-head">
            <div>
              <span className="badge badge-green">Driver account</span>
              <h2>Profile details</h2>
              <p>Keep your contact, vehicle, and verification details current.</p>
            </div>
          </div>

          {error && <div className="register-error">{error}</div>}
          {loading ? (
            <div className="profile-loading">Loading profile...</div>
          ) : (
            <form onSubmit={submit} className="profile-form">
              <div className="profile-form-grid">
                <Field label="Full Name" icon={<FiUser />}>
                  <input required value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Email Address" icon={<FiMail />}>
                  <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Phone Number" icon={<FiPhone />}>
                  <input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+255 700 000 000" />
                </Field>
                <Field label="Plate Number" icon={<FiTruck />}>
                  <input value={form.plate || ""} onChange={(e) => set("plate", e.target.value.toUpperCase())} placeholder="T 234 ABC" />
                </Field>
                <Field label="NIDA Number" icon={<FiCreditCard />}>
                  <input value={form.nida || ""} onChange={(e) => set("nida", e.target.value)} placeholder="National ID number" />
                </Field>
                <Field label="New Password" icon={<FiLock />}>
                  <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Leave blank to keep current" />
                </Field>
              </div>

              <div className="profile-actions">
                <button className="btn btn-green" type="submit" disabled={saving}>
                  <FiSave />
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          )}
        </motion.section>
      </div>
    </div>
  );
}
