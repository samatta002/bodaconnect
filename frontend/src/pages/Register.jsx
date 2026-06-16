import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiShield,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { motion } from "framer-motion";

const benefits = [
  "Verified driver profile",
  "Live ride requests",
  "Dashboard for trip status",
];

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    plate: "",
    nida: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.nida && form.nida.replace(/\D/g, "").length < 8) return setError("Enter a valid NIDA number.");

    setLoading(true);
    try {
      const res = await axios.post("/api/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        plate: form.plate,
        nida: form.nida,
        password: form.password,
      });
      localStorage.setItem("bc_token", res.data.token);
      localStorage.setItem("bc_driver", JSON.stringify(res.data.driver));
      onLogin(res.data.driver);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "var(--text)",
    fontSize: "0.875rem",
    minWidth: 0,
  };

  const boxStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.045)",
    border: "1px solid var(--border)",
  };

  const labelStyle = {
    fontSize: "0.76rem",
    fontWeight: 700,
    color: "var(--text2)",
    display: "block",
    marginBottom: 6,
  };

  return (
    <div className="register-page">
      <div className="register-grid">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="register-visual"
        >
          <span className="badge badge-green">Driver onboarding</span>
          <h1>Join the trusted BodaConnect driver network.</h1>
          <p>
            Create a verified profile with your contact details, plate number, and NIDA information so ride requests reach the right driver.
          </p>

          <div className="register-verify-card">
            <FiShield />
            <div>
              <strong>Verification ready</strong>
              <span>NIDA and plate details help make every trip safer.</span>
            </div>
          </div>

          <div className="register-benefits">
            {benefits.map((item) => (
              <span key={item}>
                <FiCheckCircle />
                {item}
              </span>
            ))}
          </div>
        </motion.aside>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="register-card"
        >
          <div className="register-card-header">
            <div className="register-icon">BC</div>
            <div>
              <h2>Create driver account</h2>
              <p>Complete your profile to start receiving rides.</p>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="register-error">
              {error}
            </motion.div>
          )}

          <form onSubmit={submit} className="register-form">
            <div className="register-form-grid">
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={boxStyle}>
                  <FiUser size={16} color="var(--green)" />
                  <input
                    type="text"
                    required
                    placeholder="Mbwana Ally"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Phone</label>
                <div style={boxStyle}>
                  <FiPhone size={16} color="var(--green)" />
                  <input
                    type="text"
                    placeholder="+255 7xx xxx xxx"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email address</label>
              <div style={boxStyle}>
                <FiMail size={16} color="var(--green)" />
                <input
                  type="email"
                  required
                  placeholder="driver@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="register-form-grid">
              <div>
                <label style={labelStyle}>Number Plate</label>
                <div style={boxStyle}>
                  <FiTruck size={16} color="var(--green)" />
                  <input
                    type="text"
                    placeholder="T 234 DAR"
                    value={form.plate}
                    onChange={(e) => set("plate", e.target.value.toUpperCase())}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>NIDA Number</label>
                <div style={boxStyle}>
                  <FiCreditCard size={16} color="var(--green)" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1990xxxxxxxxxxxxx"
                    value={form.nida}
                    onChange={(e) => set("nida", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={boxStyle}>
                <FiLock size={16} color="var(--green)" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  style={inputStyle}
                />
                <button type="button" className="register-eye" onClick={() => setShowPw((current) => !current)}>
                  {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div
                style={{
                  ...boxStyle,
                  border: `1px solid ${form.confirm && form.confirm !== form.password ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                }}
              >
                <FiLock size={16} color="var(--green)" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  style={inputStyle}
                />
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p className="register-help danger">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg register-submit">
              {loading ? "Creating account..." : <>Create Account <FiArrowRight size={16} /></>}
            </button>
          </form>

          <div className="register-switch">
            <span>Already a driver?</span>
            <Link to="/login">Sign in instead</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
