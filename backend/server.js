const express    = require("express");
const cors       = require("cors");
const mysql      = require("mysql2/promise");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const promClient = require("prom-client");
const mqtt       = require("mqtt");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "bodaconnect_secret_2025";

app.use(cors({ origin: "*", methods: ["GET","POST","PATCH","DELETE","OPTIONS"] }));
app.use(express.json());

// ── Prometheus ────────────────────────────────────────
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const ridesTotal     = new promClient.Counter({ name: "rides_created_total",   help: "Total rides created",   registers: [register] });
const ridesAccepted  = new promClient.Counter({ name: "rides_accepted_total",  help: "Total rides accepted",  registers: [register] });
const ridesCompleted = new promClient.Counter({ name: "rides_completed_total", help: "Total rides completed", registers: [register] });
const activeRidesGauge = new promClient.Gauge({ name: "rides_active_current",  help: "Current active rides",  registers: [register] });
const revenueGauge   = new promClient.Gauge({ name: "rides_revenue_total",     help: "Total revenue in TSh",  registers: [register] });
const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total", help: "Total HTTP requests",
  labelNames: ["method", "route", "status"], registers: [register],
});
const mqttMessagesTotal = new promClient.Counter({
  name: "mqtt_messages_published_total", help: "Total MQTT messages published",
  labelNames: ["topic"], registers: [register],
});

app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

// ── Auth middleware ───────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  const token = header.replace("Bearer ", "");
  try {
    req.driver = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── MQTT Client ───────────────────────────────────────
const MQTT_HOST = process.env.MQTT_HOST || "localhost";
const MQTT_PORT = process.env.MQTT_PORT || 1883;
let mqttClient = null;
let dbConnection = null;
const latestRideLocations = new Map();

function normalizeRideStatus(status) {
  if (status === "rejected") return "cancelled";
  if (["pending", "active", "completed", "cancelled"].includes(status)) return status;
  return null;
}

async function syncRideStatusFromMQTT(data) {
  if (!dbConnection || !data?.ride_id || !data?.status) return;

  const status = normalizeRideStatus(data.status);
  if (!status) {
    console.log(`Ignoring unsupported MQTT ride status: ${data.status}`);
    return;
  }

  const rideId = Number(data.ride_id);
  const driverId = data.driver_id ? Number(data.driver_id) : null;
  if (!Number.isInteger(rideId)) return;

  const [currentRows] = await dbConnection.execute(
    "SELECT status FROM rides WHERE id=?",
    [rideId]
  );

  if (currentRows.length === 0) {
    console.log(`MQTT ride/status ignored; ride #${rideId} is not in the database`);
    return;
  }

  const previousStatus = currentRows[0].status;
  await dbConnection.execute(
    "UPDATE rides SET status=?, driver_id=COALESCE(?, driver_id) WHERE id=?",
    [status, driverId, rideId]
  );

  if (previousStatus !== status) {
    if (status === "active") ridesAccepted.inc();

    if (previousStatus !== "active" && status === "active") {
      activeRidesGauge.inc();
    }

    if (previousStatus === "active" && ["completed", "cancelled"].includes(status)) {
      activeRidesGauge.dec();
    }

    if (status === "completed") {
      ridesCompleted.inc();
      const [rev] = await dbConnection.execute("SELECT COUNT(*) as count FROM rides WHERE status='completed'");
      revenueGauge.set(rev[0].count * 3200);
    }
  }

  console.log(`Synced ride #${rideId} from MQTT: ${previousStatus} -> ${status}`);

  if (data.driver_name || data.plate) {
    const previousLocation = latestRideLocations.get(rideId) || {};
    latestRideLocations.set(rideId, {
      ...previousLocation,
      ride_id: rideId,
      driver_id: driverId || previousLocation.driver_id || null,
      driver_name: data.driver_name || previousLocation.driver_name || null,
      plate: data.plate || previousLocation.plate || null,
      progress_percent: status === "completed" ? 100 : previousLocation.progress_percent || (status === "active" ? 15 : 0),
      timestamp: data.timestamp || new Date().toISOString(),
    });
  }
}

function syncDriverLocationFromMQTT(data) {
  if (!data?.ride_id) return;

  const rideId = Number(data.ride_id);
  if (!Number.isInteger(rideId)) return;

  latestRideLocations.set(rideId, {
    ride_id: rideId,
    driver_id: data.driver_id || null,
    driver_name: data.driver_name || null,
    plate: data.plate || null,
    latitude: data.latitude,
    longitude: data.longitude,
    location_name: data.location_name || "On route",
    progress_percent: data.progress_percent || 0,
    timestamp: data.timestamp || new Date().toISOString(),
  });
}

function connectMQTT() {
  const url = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
  console.log(`Connecting to MQTT broker at ${url}...`);

  mqttClient = mqtt.connect(url, {
    clientId: `bodaconnect-backend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  mqttClient.on("connect", () => {
    console.log("✅ MQTT broker connected");

    // Subscribe to driver location updates
    mqttClient.subscribe("driver/location", (err) => {
      if (!err) console.log("📍 Subscribed to driver/location");
    });

    // Subscribe to driver status updates
    mqttClient.subscribe("ride/status", (err) => {
      if (!err) console.log("🔄 Subscribed to ride/status");
    });
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      if (topic === "ride/status") {
        await syncRideStatusFromMQTT(data);
      }
      if (topic === "driver/location") {
        syncDriverLocationFromMQTT(data);
      }
      console.log(`📨 MQTT [${topic}]:`, data);
    } catch {
      console.log(`📨 MQTT [${topic}]: ${message.toString()}`);
    }
  });

  mqttClient.on("error", (err) => {
    console.log("⚠️  MQTT error:", err.message);
  });

  mqttClient.on("reconnect", () => {
    console.log("🔄 MQTT reconnecting...");
  });

  mqttClient.on("disconnect", () => {
    console.log("❌ MQTT disconnected");
  });
}

// Helper to publish MQTT message
function mqttPublish(topic, payload) {
  if (!mqttClient || !mqttClient.connected) {
    console.log(`⚠️  MQTT not connected, skipping publish to ${topic}`);
    return;
  }
  const message = JSON.stringify({ ...payload, timestamp: new Date().toISOString() });
  mqttClient.publish(topic, message, { qos: 1, retain: false }, (err) => {
    if (err) {
      console.log(`❌ MQTT publish error [${topic}]:`, err.message);
    } else {
      console.log(`📤 MQTT published [${topic}]:`, message);
      mqttMessagesTotal.inc({ topic });
    }
  });
}

// ── Wait for MySQL ────────────────────────────────────
async function waitForDB() {
  const cfg = {
    host:     process.env.DB_HOST     || "db",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME     || "bodadb",
  };
  while (true) {
    try {
      const conn = await mysql.createConnection(cfg);
      console.log("✅ MySQL connected");
      return conn;
    } catch (err) {
      console.log("⏳ Waiting for MySQL...", err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function start() {
  // Connect to MQTT first (non-blocking)
  connectMQTT();

  // Connect to DB
  const db = await waitForDB();
  dbConnection = db;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(30),
      password VARCHAR(255) NOT NULL,
      plate VARCHAR(50),
      nida VARCHAR(50),
      status ENUM('available','on_trip','offline') DEFAULT 'available',
      rating DECIMAL(3,2) DEFAULT 5.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute("ALTER TABLE drivers ADD COLUMN nida VARCHAR(50) AFTER plate");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pickup VARCHAR(255) NOT NULL,
      destination VARCHAR(255),
      status ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
      driver_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Tables ready");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ride_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ride_id INT NOT NULL UNIQUE,
      driver_id INT NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_review_ride FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      CONSTRAINT fk_review_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
    )
  `);

  const [activeRows] = await db.execute("SELECT COUNT(*) as count FROM rides WHERE status='active'");
  activeRidesGauge.set(activeRows[0].count);
  const [revRows] = await db.execute("SELECT COUNT(*) as count FROM rides WHERE status='completed'");
  revenueGauge.set(revRows[0].count * 3200);

  // ═══════════════════════════════════════
  // PUBLIC ROUTES
  // ═══════════════════════════════════════

  app.get("/", (req, res) => {
    res.json({
      status: "BodaConnect running",
      mqtt: mqttClient?.connected ? "connected" : "disconnected",
      time: new Date()
    });
  });

  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  // REGISTER
  app.post("/auth/register", async (req, res) => {
    const { name, email, phone, password, plate, nida } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    try {
      const [existing] = await db.execute("SELECT id FROM drivers WHERE email=?", [email]);
      if (existing.length > 0) return res.status(409).json({ error: "Email already registered" });
      const hashed = await bcrypt.hash(password, 10);
      const [result] = await db.execute(
        "INSERT INTO drivers (name, email, phone, password, plate, nida) VALUES (?,?,?,?,?,?)",
        [name, email, phone || "", hashed, plate || "", nida || ""]
      );
      const token = jwt.sign({ id: result.insertId, name, email, plate: plate || "", nida: nida || "" }, JWT_SECRET, { expiresIn: "7d" });
      res.status(201).json({ token, driver: { id: result.insertId, name, email, phone, plate, nida } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // LOGIN
  app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    try {
      const [rows] = await db.execute("SELECT * FROM drivers WHERE email=?", [email]);
      if (rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });
      const driver = rows[0];
      const valid = await bcrypt.compare(password, driver.password);
      if (!valid) return res.status(401).json({ error: "Invalid email or password" });
      const token = jwt.sign(
        { id: driver.id, name: driver.name, email: driver.email, plate: driver.plate, nida: driver.nida },
        JWT_SECRET, { expiresIn: "7d" }
      );
      res.json({ token, driver: { id: driver.id, name: driver.name, email: driver.email, phone: driver.phone, plate: driver.plate, nida: driver.nida, rating: driver.rating } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/auth/me", authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT id, name, email, phone, plate, nida, status, rating FROM drivers WHERE id=?",
        [req.driver.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Driver not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════
  // RIDES (protected)
  // ═══════════════════════════════════════

  app.put("/auth/me", authMiddleware, async (req, res) => {
    const { name, email, phone, plate, nida, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    try {
      const [existing] = await db.execute(
        "SELECT id FROM drivers WHERE email=? AND id<>?",
        [email, req.driver.id]
      );
      if (existing.length > 0) return res.status(409).json({ error: "Email is already used by another driver" });

      if (password) {
        if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
        const hashed = await bcrypt.hash(password, 10);
        await db.execute(
          "UPDATE drivers SET name=?, email=?, phone=?, plate=?, nida=?, password=? WHERE id=?",
          [name, email, phone || "", plate || "", nida || "", hashed, req.driver.id]
        );
      } else {
        await db.execute(
          "UPDATE drivers SET name=?, email=?, phone=?, plate=?, nida=? WHERE id=?",
          [name, email, phone || "", plate || "", nida || "", req.driver.id]
        );
      }

      const [rows] = await db.execute(
        "SELECT id, name, email, phone, plate, nida, status, rating FROM drivers WHERE id=?",
        [req.driver.id]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/driver/status", authMiddleware, async (req, res) => {
    const { mode, status } = req.body;
    const nextStatus = status || (mode === "online" ? "available" : mode === "offline" ? "offline" : null);

    if (!["available", "offline"].includes(nextStatus)) {
      return res.status(400).json({ error: "Driver status must be online or offline" });
    }

    try {
      await db.execute("UPDATE drivers SET status=? WHERE id=?", [nextStatus, req.driver.id]);
      res.json({
        success: true,
        status: nextStatus,
        mode: nextStatus === "available" ? "online" : "offline",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/drivers/nearby", async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT id, name, plate, rating, status FROM drivers WHERE status='available' ORDER BY rating DESC, id DESC LIMIT 6"
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/rides", authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM rides ORDER BY id DESC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /rides — public, rider books a ride
  app.post("/rides", async (req, res) => {
    const { pickup, destination, pickup_location, destination_location } = req.body;
    if (!pickup) return res.status(400).json({ error: "pickup is required" });
    try {
      const [result] = await db.execute(
        "INSERT INTO rides (pickup, destination, status) VALUES (?,?,'pending')",
        [pickup, destination || ""]
      );
      ridesTotal.inc();

      // ── OPTION A: Publish ride request to MQTT ────────
      mqttPublish("ride/request", {
        ride_id: result.insertId,
        pickup,
        destination: destination || "Not specified",
        pickup_location,
        destination_location,
        status: "pending",
        message: "New ride request — drivers please respond",
      });

      res.status(201).json({ id: result.insertId, pickup, destination, status: "pending" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /rides/:id/status — driver accepts or completes
  app.get("/rides/:id/tracking", async (req, res) => {
    try {
      const rideId = Number(req.params.id);
      const [rows] = await db.execute(
        `SELECT r.id, r.pickup, r.destination, r.status, r.driver_id, r.created_at,
          d.name AS driver_name, d.plate AS driver_plate, d.rating AS driver_rating
         FROM rides r
         LEFT JOIN drivers d ON d.id = r.driver_id
         WHERE r.id=?`,
        [rideId]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Ride not found" });
      const ride = rows[0];
      const latestLocation = latestRideLocations.get(rideId) || null;
      const [reviewRows] = await db.execute(
        "SELECT id, rating, comment, created_at FROM ride_reviews WHERE ride_id=?",
        [rideId]
      );
      res.json({
        ride,
        driver: ride.driver_id || latestLocation?.driver_id ? {
          id: ride.driver_id || latestLocation?.driver_id,
          name: latestLocation?.driver_name || ride.driver_name,
          plate: latestLocation?.plate || ride.driver_plate,
          rating: ride.driver_rating,
        } : null,
        driver_location: latestLocation,
        review: reviewRows[0] || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/rides/:id/review", async (req, res) => {
    const rideId = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || "").trim();

    if (!Number.isInteger(rideId)) return res.status(400).json({ error: "Invalid ride id" });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    try {
      const [rides] = await db.execute(
        "SELECT id, status, driver_id FROM rides WHERE id=?",
        [rideId]
      );
      if (rides.length === 0) return res.status(404).json({ error: "Ride not found" });

      const ride = rides[0];
      if (ride.status !== "completed") return res.status(400).json({ error: "Only completed rides can be reviewed" });
      if (!ride.driver_id) return res.status(400).json({ error: "Ride has no assigned driver" });

      const [result] = await db.execute(
        "INSERT INTO ride_reviews (ride_id, driver_id, rating, comment) VALUES (?,?,?,?)",
        [rideId, ride.driver_id, rating, comment]
      );

      const [[avg]] = await db.execute(
        "SELECT AVG(rating) AS rating FROM ride_reviews WHERE driver_id=?",
        [ride.driver_id]
      );
      const nextRating = Number(avg.rating || 5).toFixed(2);
      await db.execute("UPDATE drivers SET rating=? WHERE id=?", [nextRating, ride.driver_id]);

      res.status(201).json({
        id: result.insertId,
        ride_id: rideId,
        driver_id: ride.driver_id,
        rating,
        comment,
        driver_rating: nextRating,
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "This ride has already been reviewed" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/rides/:id", async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT id, pickup, destination, status, driver_id, created_at FROM rides WHERE id=?",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Ride not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/rides/:id/status", authMiddleware, async (req, res) => {
    const { status } = req.body;
    try {
      await db.execute(
        "UPDATE rides SET status=?, driver_id=? WHERE id=?",
        [status, req.driver.id, req.params.id]
      );

      if (status === "active") {
        ridesAccepted.inc();
        activeRidesGauge.inc();
      }
      if (status === "completed") {
        ridesCompleted.inc();
        activeRidesGauge.dec();
        const [rev] = await db.execute("SELECT COUNT(*) as count FROM rides WHERE status='completed'");
        revenueGauge.set(rev[0].count * 3200);
      }

      // ── OPTION C: Publish ride status update to MQTT ──
      const statusMessages = {
        active:    "Driver accepted — on the way",
        completed: "Ride completed successfully",
        cancelled: "Ride was cancelled",
      };

      mqttPublish("ride/status", {
        ride_id: parseInt(req.params.id),
        driver_id: req.driver.id,
        driver_name: req.driver.name,
        plate: req.driver.plate,
        status,
        message: statusMessages[status] || `Ride status updated to ${status}`,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/rides/:id", authMiddleware, async (req, res) => {
    try {
      await db.execute("DELETE FROM rides WHERE id=?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── OPTION B: Driver publishes location ──────────────
  app.post("/driver/location", authMiddleware, async (req, res) => {
    const { ride_id, latitude, longitude, location_name, progress_percent } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "latitude and longitude are required" });
    }
    mqttPublish("driver/location", {
      ride_id,
      driver_id: req.driver.id,
      driver_name: req.driver.name,
      plate: req.driver.plate,
      latitude,
      longitude,
      location_name: location_name || "Unknown",
      progress_percent,
    });
    res.json({ success: true, message: "Location published to MQTT" });
  });

  // ── MQTT status endpoint ──────────────────────────────
  app.get("/mqtt/status", (req, res) => {
    res.json({
      connected: mqttClient?.connected || false,
      broker: `mqtt://${MQTT_HOST}:${MQTT_PORT}`,
      topics: ["ride/request", "driver/location", "ride/status"],
    });
  });

  // ── Database viewer routes ────────────────────────────
  app.get("/db/rides", authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM rides ORDER BY id DESC");
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get("/db/drivers", authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT id, name, email, phone, plate, nida, status, rating, created_at FROM drivers ORDER BY id DESC"
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get("/db/stats", authMiddleware, async (req, res) => {
    try {
      const [[rideStats]] = await db.execute(`
        SELECT COUNT(*) as total,
          SUM(status='pending') as pending,
          SUM(status='active') as active,
          SUM(status='completed') as completed,
          SUM(status='cancelled') as cancelled
        FROM rides
      `);
      const [[driverStats]] = await db.execute("SELECT COUNT(*) as total FROM drivers");
      res.json({ rides: rideStats, drivers: driverStats });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.listen(5000, "0.0.0.0", () => {
    console.log("🚀 Server on port 5000");
    console.log("📊 Metrics at http://localhost:5000/metrics");
    console.log("📡 MQTT status at http://localhost:5000/mqtt/status");
  });
}

start();
