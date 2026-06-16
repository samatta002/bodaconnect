import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiCheck, FiX } from "react-icons/fi";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Ride from "./pages/Ride";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("bc_theme") || "dark");
  const [lang, setLang] = useState(() => localStorage.getItem("bc_lang") || "en");
  const [driver, setDriver] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bc_driver")); }
    catch { return null; }
  });
  const hasDriverSession = Boolean(driver && localStorage.getItem("bc_token"));

  const notify = (nextToast) => {
    setToast({
      id: Date.now(),
      type: nextToast?.type || "success",
      text: nextToast?.text || "",
    });
  };

  const handleLogin = (d) => setDriver(d);
  const handleDriverUpdate = (updates) => {
    setDriver((current) => {
      const next = { ...current, ...updates };
      localStorage.setItem("bc_driver", JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("bc_token");
    localStorage.removeItem("bc_driver");
    setDriver(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bc_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("bc_lang", lang);
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <BrowserRouter>
      {showSplash && (
        <div className="splash-screen">
          <div className="splash-mark">
            <img src="/favicon.svg" alt="" />
          </div>
          <div className="splash-title">BodaConnect</div>
          <div className="splash-subtitle">Connecting rides in real time</div>
          <div className="splash-loader"><span /></div>
        </div>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            className={`app-toast ${toast.type}`}
          >
            {toast.type === "error" ? <FiX /> : <FiCheck />}
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
              <FiX />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Layout
        driver={hasDriverSession ? driver : null}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
      >
        <Routes>
          <Route path="/"     element={<Home lang={lang} />} />
          <Route path="/ride" element={hasDriverSession ? <Navigate to="/dashboard" replace /> : <Ride onNotify={notify} />} />
          <Route path="/login"
            element={hasDriverSession ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
          />
          <Route path="/register"
            element={hasDriverSession ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />}
          />
          <Route path="/dashboard"
            element={hasDriverSession
              ? <Dashboard driver={driver} onLogout={handleLogout} onDriverUpdate={handleDriverUpdate} onNotify={notify} />
              : <Navigate to="/login" replace />
            }
          />
          <Route path="/profile"
            element={hasDriverSession
              ? <Profile driver={driver} onLogout={handleLogout} onDriverUpdate={handleDriverUpdate} onNotify={notify} />
              : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
