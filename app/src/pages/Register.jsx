import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiUser, FiMail, FiLock, FiPhone, FiTruck, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", plate: "", password: "", confirm: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/register", {
        name: form.name, email: form.email,
        phone: form.phone, plate: form.plate,
        password: form.password,
      });
      localStorage.setItem("bc_token",  res.data.token);
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
    flex: 1, background: "none", border: "none", outline: "none",
    color: "var(--text)", fontSize: "0.875rem",
  };
  const boxStyle = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 14px", borderRadius: 10,
    background: "var(--bg3)", border: "1px solid var(--border)",
  };
  const labelStyle = {
    fontSize: "0.78rem", fontWeight: 600,
    color: "var(--text2)", display: "block", marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem", background: "var(--bg)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(34,197,94,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 52, height: 52, background: "#22c55e", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, margin: "0 auto 1rem",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
          }}>🏍</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Become a driver
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text2)" }}>
            Create your BodaConnect driver account
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: "1.25rem",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            fontSize: "0.82rem", color: "#ef4444",
          }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Name + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <div style={boxStyle}>
                <FiUser size={16} color="var(--text3)" />
                <input type="text" required placeholder="James Mwangi"
                  value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <div style={boxStyle}>
                <FiPhone size={16} color="var(--text3)" />
                <input type="text" placeholder="+255 7xx xxx xxx"
                  value={form.phone} onChange={e => set("phone", e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email address</label>
            <div style={boxStyle}>
              <FiMail size={16} color="var(--text3)" />
              <input type="email" required placeholder="driver@example.com"
                value={form.email} onChange={e => set("email", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Plate */}
          <div>
            <label style={labelStyle}>Number Plate</label>
            <div style={boxStyle}>
              <FiTruck size={16} color="var(--text3)" />
              <input type="text" placeholder="T 234 DAR"
                value={form.plate} onChange={e => set("plate", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={boxStyle}>
              <FiLock size={16} color="var(--text3)" />
              <input type={showPw ? "text" : "password"} required placeholder="Min. 6 characters"
                value={form.password} onChange={e => set("password", e.target.value)} style={inputStyle} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", display: "flex" }}>
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{
              ...boxStyle,
              border: `1px solid ${form.confirm && form.confirm !== form.password ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
            }}>
              <FiLock size={16} color="var(--text3)" />
              <input type={showPw ? "text" : "password"} required placeholder="Repeat password"
                value={form.confirm} onChange={e => set("confirm", e.target.value)} style={inputStyle} />
            </div>
            {form.confirm && form.confirm !== form.password && (
              <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 4 }}>
                Passwords do not match
              </p>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            marginTop: 8, width: "100%", padding: "13px",
            background: loading ? "rgba(34,197,94,0.4)" : "#22c55e",
            border: "none", borderRadius: 9999,
            color: "#000", fontWeight: 700, fontSize: "0.95rem",
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: loading ? "none" : "0 0 24px rgba(34,197,94,0.25)",
            transition: "all 0.2s",
          }}>
            {loading ? "Creating account..." : <> Create Account <FiArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Already a driver?</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <Link to="/login" style={{ textDecoration: "none" }}>
          <button style={{
            width: "100%", padding: "12px", background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9999,
            color: "var(--text)", fontWeight: 600, fontSize: "0.875rem",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Sign In Instead
          </button>
        </Link>
      </motion.div>
    </div>
  );
}