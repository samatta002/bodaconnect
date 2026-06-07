import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/api/auth/login", form);
      localStorage.setItem("bc_token",  res.data.token);
      localStorage.setItem("bc_driver", JSON.stringify(res.data.driver));
      onLogin(res.data.driver);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
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
        background: "radial-gradient(ellipse, rgba(34,197,94,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        style={{
          width: "100%", maxWidth: 420,
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
            Welcome back
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text2)" }}>
            Sign in to your driver account
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

          {/* Email */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>
              Email address
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px", borderRadius: 10,
              background: "var(--bg3)", border: "1px solid var(--border)",
            }}>
              <FiMail size={16} color="var(--text3)" />
              <input
                type="email" required
                placeholder="driver@example.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text)", fontSize: "0.875rem",
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px", borderRadius: 10,
              background: "var(--bg3)", border: "1px solid var(--border)",
            }}>
              <FiLock size={16} color="var(--text3)" />
              <input
                type={showPw ? "text" : "password"} required
                placeholder="••••••••"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text)", fontSize: "0.875rem",
                }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", display: "flex" }}>
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
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
            {loading ? "Signing in..." : <> Sign In <FiArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>New driver?</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <Link to="/register" style={{ textDecoration: "none" }}>
          <button style={{
            width: "100%", padding: "12px", background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 9999,
            color: "var(--text)", fontWeight: 600, fontSize: "0.875rem",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Create Driver Account
          </button>
        </Link>
      </motion.div>
    </div>
  );
}