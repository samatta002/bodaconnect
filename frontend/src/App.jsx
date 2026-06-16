import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Ride from "./pages/Ride";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [driver, setDriver] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bc_driver")); }
    catch { return null; }
  });
  const hasDriverSession = Boolean(driver && localStorage.getItem("bc_token"));

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
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

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
      <Layout driver={hasDriverSession ? driver : null} onLogout={handleLogout}>
        <Routes>
          <Route path="/"     element={<Home />} />
          <Route path="/ride" element={hasDriverSession ? <Navigate to="/dashboard" replace /> : <Ride />} />
          <Route path="/login"
            element={hasDriverSession ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
          />
          <Route path="/register"
            element={hasDriverSession ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />}
          />
          <Route path="/dashboard"
            element={hasDriverSession
              ? <Dashboard driver={driver} onLogout={handleLogout} onDriverUpdate={handleDriverUpdate} />
              : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
