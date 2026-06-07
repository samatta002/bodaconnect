import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Ride from "./pages/Ride";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  const [driver, setDriver] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bc_driver")); }
    catch { return null; }
  });

  const handleLogin = (d) => setDriver(d);

  const handleLogout = () => {
    localStorage.removeItem("bc_token");
    localStorage.removeItem("bc_driver");
    setDriver(null);
  };

  return (
    <BrowserRouter>
      <Layout driver={driver} onLogout={handleLogout}>
        <Routes>
          <Route path="/"     element={<Home />} />
          <Route path="/ride" element={<Ride />} />
          <Route path="/login"
            element={driver ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
          />
          <Route path="/register"
            element={driver ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />}
          />
          <Route path="/dashboard"
            element={driver
              ? <Dashboard driver={driver} onLogout={handleLogout} />
              : <Navigate to="/login" />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}