import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiZap, FiShield, FiClock, FiStar, FiMapPin, FiUsers, FiTrendingUp } from "react-icons/fi";

const features = [
  { icon: <FiZap size={22} />,    title: "Instant Matching",  desc: "Matched to a nearby driver in under 2 minutes, guaranteed.", color: "var(--green)", dim: "var(--green-dim)"  },
  { icon: <FiShield size={22} />, title: "Safe & Verified",   desc: "Every driver is vetted, rated, and GPS-tracked in real time.", color: "var(--text)",  dim: "var(--white-dim2)" },
  { icon: <FiClock size={22} />,  title: "24 / 7 Service",    desc: "Available day and night across 50+ zones in the city.",        color: "var(--green)", dim: "var(--green-dim)"  },
  { icon: <FiStar size={22} />,   title: "Top-Rated Drivers", desc: "Community ratings keep quality consistent every single ride.", color: "var(--text)",  dim: "var(--white-dim2)" },
];

const stats = [
  { value: "2,400+", label: "Active Riders",  icon: <FiUsers size={16} />       },
  { value: "98%",    label: "On-Time Rate",   icon: <FiTrendingUp size={16} />  },
  { value: "4.9 ★",  label: "Average Rating", icon: <FiStar size={16} />        },
  { value: "50+",    label: "City Zones",     icon: <FiMapPin size={16} />      },
];

const steps = [
  { num: "01", title: "Set your pickup",    desc: "Drop a pin anywhere on the map." },
  { num: "02", title: "Choose destination", desc: "See the fare estimate instantly."  },
  { num: "03", title: "Get matched",        desc: "A nearby driver arrives in minutes." },
];

export default function Home() {
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "5rem 2rem 4rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Grid lines background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)",
        }} />

        {/* Green core glow */}
        <div style={{
          position: "absolute", top: "42%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 900, height: 600,
          background: "radial-gradient(ellipse, rgba(34,197,94,0.09) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Live chip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.22)",
            borderRadius: "var(--radius-full)",
            padding: "7px 18px", fontSize: "0.78rem", fontWeight: 600,
            color: "var(--green)", marginBottom: "2rem", letterSpacing: "0.02em",
          }}
        >
          <div className="pulse-dot" style={{ width: 6, height: 6 }} />
          Now live across Dar es Salaam
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16,1,0.3,1] }}
          style={{
            fontSize: "clamp(3rem, 6.5vw, 5.5rem)",
            fontWeight: 700, letterSpacing: "-0.045em",
            lineHeight: 1.02, marginBottom: "1.5rem", maxWidth: 780,
            color: "var(--text)",
          }}
        >
          The fastest way to{" "}
          <span style={{
            background: "linear-gradient(135deg, var(--green) 0%, var(--green3) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            move
          </span>
          <br />across the city
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: "1.15rem", color: "var(--text2)", lineHeight: 1.7,
            maxWidth: 480, marginBottom: "2.5rem",
          }}
        >
          Reliable boda boda rides at your fingertips.
          Book in seconds, ride in minutes — any time, any zone.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}
        >
          <Link to="/ride" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary btn-xl" style={{
              boxShadow: "0 0 40px rgba(34,197,94,0.28), 0 4px 16px rgba(0,0,0,0.4)",
              fontSize: "1rem", padding: "16px 44px",
            }}>
              Book a Ride <FiArrowRight size={18} />
            </button>
          </Link>
          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <button className="btn btn-outline btn-xl" style={{
              fontSize: "1rem", padding: "16px 36px",
            }}>
              View Dashboard
            </button>
          </Link>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{
            display: "flex", marginTop: "5rem",
            flexWrap: "wrap", justifyContent: "center",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: "center", padding: "1.25rem 2.5rem",
              borderRight: i < stats.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--green)", marginBottom: 6 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text)" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section style={{ padding: "5rem 2rem", maxWidth: 900, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <span className="badge badge-green" style={{ marginBottom: "1rem" }}>How it works</span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.035em", marginTop: 10 }}>
            Three steps, that's it
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "2rem 1.5rem",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Big watermark number */}
              <div style={{
                position: "absolute", top: -10, right: 16,
                fontSize: "5rem", fontWeight: 800,
                color: "rgba(34,197,94,0.05)",
                letterSpacing: "-0.04em", lineHeight: 1,
                userSelect: "none",
              }}>
                {s.num}
              </div>

              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--green-dim)",
                border: "1px solid rgba(34,197,94,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--green)", fontWeight: 700, fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}>
                {s.num}
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text2)", lineHeight: 1.6 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section style={{ padding: "2rem 2rem 5rem", maxWidth: 1060, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3rem" }}
        >
          <span className="badge badge-green" style={{ marginBottom: "1rem" }}>Why BodaConnect</span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.035em", marginTop: 10 }}>
            Built for Dar es Salaam
          </h2>
          <p style={{ color: "var(--text2)", marginTop: 12, fontSize: "1rem", maxWidth: 420, margin: "12px auto 0" }}>
            Every feature designed around the city's real needs
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3, borderColor: "rgba(34,197,94,0.25)" }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "1.75rem",
                display: "flex", gap: 18, alignItems: "flex-start",
                transition: "border-color 0.2s",
                cursor: "default",
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: f.dim,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: f.color, border: "1px solid rgba(255,255,255,0.05)",
              }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text2)", lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════ CTA BAND ══════════════ */}
      <section style={{ maxWidth: 820, margin: "0 auto 6rem", padding: "0 2rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            position: "relative", overflow: "hidden",
            background: "var(--card)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "var(--radius-xl)",
            padding: "4rem 2rem",
            textAlign: "center",
          }}
        >
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 500, height: 300,
            background: "radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: 12 }}>
              Ready to ride?
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "1.05rem", maxWidth: 360, margin: "0 auto 2rem" }}>
              Drivers are standing by. Your first ride is one tap away.
            </p>
            <Link to="/ride" style={{ textDecoration: "none" }}>
              <button className="btn btn-primary btn-lg" style={{
                boxShadow: "0 0 32px rgba(34,197,94,0.25)",
                padding: "14px 44px", fontSize: "1rem",
              }}>
                Book Now <FiArrowRight size={17} />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}