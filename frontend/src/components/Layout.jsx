import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiGlobe, FiGrid, FiHome, FiLogOut, FiMoon, FiNavigation, FiSun, FiUser } from "react-icons/fi";

export default function Layout({ children, driver, onLogout, lang = "en", setLang, theme = "dark", setTheme }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const text = {
    en: { home: "Home", ride: "Book Ride", dashboard: "Dashboard", profile: "Profile", live: "LIVE", login: "Driver Login" },
    sw: { home: "Nyumbani", ride: "Agiza Safari", dashboard: "Dashibodi", profile: "Wasifu", live: "LIVE", login: "Dereva Ingia" },
  }[lang] || {};

  const links = [
    { to: "/",     label: text.home,      Icon: FiHome      },
    ...(!driver ? [{ to: "/ride", label: text.ride, Icon: FiNavigation }] : []),
    ...(driver ? [{ to: "/dashboard", label: text.dashboard, Icon: FiGrid }] : []),
    ...(driver ? [{ to: "/profile", label: text.profile, Icon: FiUser }] : []),
  ];

  const logout = () => { onLogout(); navigate("/login"); };
  const toggleLang = () => setLang?.(lang === "en" ? "sw" : "en");
  const toggleTheme = () => setTheme?.(theme === "dark" ? "light" : "dark");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav style={{
        width: "100%", display: "flex", flexDirection: "row",
        alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 64,
        background: "rgba(8,12,16,0.96)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 0, zIndex: 200,
        boxSizing: "border-box", flexShrink: 0,
      }}>

        {/* Logo */}
        <Link to="/" style={{
          display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
          fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em",
          textDecoration: "none", color: "#f0f6fc", flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, background: "#22c55e", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0, boxShadow: "0 0 20px rgba(34,197,94,0.3)",
          }}>🏍</div>
          <span>Boda</span>
          <span style={{ color: "#22c55e" }}>Connect</span>
        </Link>

        {/* Center pill links */}
        <div style={{
          display: "flex", flexDirection: "row", alignItems: "center", gap: 2,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 9999, padding: "4px", flexShrink: 0,
        }}>
          {links.map(({ to, label, Icon }) => {
            const isActive = pathname === to;
            return (
              <Link key={to} to={to} style={{
                display: "flex", flexDirection: "row", alignItems: "center", gap: 7,
                padding: "7px 16px", borderRadius: 9999,
                fontSize: "0.84rem", fontWeight: isActive ? 600 : 500,
                textDecoration: "none", whiteSpace: "nowrap",
                color: isActive ? "#22c55e" : "#484f58",
                background: isActive ? "rgba(34,197,94,0.1)" : "transparent",
                border: isActive ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 }}>

          {/* Live dot */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.18)",
            borderRadius: 9999,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#22c55e", boxShadow: "0 0 6px #22c55e",
            }} />
            <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 600, letterSpacing: "0.04em" }}>
              {text.live}
            </span>
          </div>

          {driver ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 9999,
              }}>
                <FiUser size={13} color="#22c55e" />
                <span style={{ fontSize: "0.78rem", color: "#f0f6fc", fontWeight: 500 }}>
                  {driver.name?.split(" ")[0]}
                </span>
              </div>
              <button onClick={logout} title="Sign out" style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#ef4444", flexShrink: 0,
              }}>
                <FiLogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "7px 18px", borderRadius: 9999,
                background: "#22c55e", border: "none",
                color: "#000", fontWeight: 700, fontSize: "0.82rem",
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 0 16px rgba(34,197,94,0.25)",
              }}>
                {text.login}
              </button>
            </Link>
          )}
        </div>
      </nav>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>

      <div className="app-floating-controls" aria-label="Display controls">
        <button type="button" onClick={toggleLang} title="Switch language">
          <FiGlobe />
          <span>{lang === "en" ? "SW" : "EN"}</span>
        </button>
        <button type="button" onClick={toggleTheme} title="Switch theme">
          {theme === "dark" ? <FiSun /> : <FiMoon />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>
    </div>
  );
}
