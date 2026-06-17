const express    = require("express");
const cors       = require("cors");
const mysql      = require("mysql2/promise");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const promClient = require("prom-client");
const mqtt       = require("mqtt");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "bodaconnect_secret_2025";

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"] }));
app.use(express.json({ limit: "2mb" }));

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
const eventHistory = [];
const eventClients = new Set();

function recordEvent(type, payload = {}) {
  const event = {
    id: Date.now(),
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  eventHistory.unshift(event);
  eventHistory.splice(50);

  const line = `data: ${JSON.stringify(event)}\n\n`;
  eventClients.forEach((client) => client.write(line));
  return event;
}

function normalizeRideStatus(status) {
  if (status === "rejected") return "cancelled";
  if (["pending", "accepted", "active", "completed", "cancelled"].includes(status)) return status;
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

  if (driverId && ["accepted", "active"].includes(status)) {
    await dbConnection.execute("UPDATE drivers SET status='on_trip' WHERE id=?", [driverId]);
  }

  if (driverId && ["completed", "cancelled"].includes(status)) {
    await dbConnection.execute("UPDATE drivers SET status='available' WHERE id=?", [driverId]);
  }

  if (previousStatus !== status) {
    if (status === "accepted") ridesAccepted.inc();

    if (!["accepted", "active"].includes(previousStatus) && ["accepted", "active"].includes(status)) {
      activeRidesGauge.inc();
    }

    if (["accepted", "active"].includes(previousStatus) && ["completed", "cancelled"].includes(status)) {
      activeRidesGauge.dec();
    }

    if (status === "completed") {
      ridesCompleted.inc();
      const [rev] = await dbConnection.execute("SELECT COUNT(*) as count FROM rides WHERE status='completed'");
      revenueGauge.set(rev[0].count * 3200);
    }
  }

  console.log(`Synced ride #${rideId} from MQTT: ${previousStatus} -> ${status}`);
  recordEvent("ride.status.synced", { ride_id: rideId, previous_status: previousStatus, status, driver_id: driverId });

  if (data.driver_name || data.plate) {
    const previousLocation = latestRideLocations.get(rideId) || {};
    latestRideLocations.set(rideId, {
      ...previousLocation,
      ride_id: rideId,
      driver_id: driverId || previousLocation.driver_id || null,
      driver_name: data.driver_name || previousLocation.driver_name || null,
      plate: data.plate || previousLocation.plate || null,
      driver_photo_url: data.driver_photo_url || previousLocation.driver_photo_url || null,
      location_name: data.location_name || previousLocation.location_name || null,
      progress_percent: status === "completed" ? 100 : previousLocation.progress_percent || (status === "active" ? 50 : status === "accepted" ? 15 : 0),
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
    driver_photo_url: data.driver_photo_url || null,
    latitude: data.latitude,
    longitude: data.longitude,
    location_name: data.location_name || "On route",
    progress_percent: data.progress_percent || 0,
    timestamp: data.timestamp || new Date().toISOString(),
  });
  recordEvent("driver.location.synced", {
    ride_id: rideId,
    driver_id: data.driver_id || null,
    driver_name: data.driver_name || null,
    progress_percent: data.progress_percent || 0,
    location_name: data.location_name || "On route",
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
      recordEvent("mqtt.received", { topic, payload: data });
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
    recordEvent("mqtt.publish_skipped", { topic, payload, reason: "MQTT not connected" });
    return;
  }
  const message = JSON.stringify({ ...payload, timestamp: new Date().toISOString() });
  mqttClient.publish(topic, message, { qos: 1, retain: false }, (err) => {
    if (err) {
      console.log(`❌ MQTT publish error [${topic}]:`, err.message);
    } else {
      console.log(`📤 MQTT published [${topic}]:`, message);
      mqttMessagesTotal.inc({ topic });
      recordEvent("mqtt.published", { topic, payload: JSON.parse(message) });
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
      photo_url LONGTEXT,
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

  try {
    await db.execute("ALTER TABLE drivers ADD COLUMN photo_url LONGTEXT AFTER nida");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      passenger_name VARCHAR(255),
      passenger_phone VARCHAR(30),
      pickup VARCHAR(255) NOT NULL,
      destination VARCHAR(255),
      pickup_lat DECIMAL(10,6),
      pickup_lng DECIMAL(10,6),
      destination_lat DECIMAL(10,6),
      destination_lng DECIMAL(10,6),
      status ENUM('pending','accepted','active','completed','cancelled') DEFAULT 'pending',
      driver_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute("ALTER TABLE rides MODIFY status ENUM('pending','accepted','active','completed','cancelled') DEFAULT 'pending'");
  } catch (err) {
    console.log("Could not update rides status enum:", err.message);
  }

  const rideColumnMigrations = [
    "ALTER TABLE rides ADD COLUMN passenger_name VARCHAR(255) AFTER id",
    "ALTER TABLE rides ADD COLUMN passenger_phone VARCHAR(30) AFTER passenger_name",
    "ALTER TABLE rides ADD COLUMN pickup_lat DECIMAL(10,6) AFTER destination",
    "ALTER TABLE rides ADD COLUMN pickup_lng DECIMAL(10,6) AFTER pickup_lat",
    "ALTER TABLE rides ADD COLUMN destination_lat DECIMAL(10,6) AFTER pickup_lng",
    "ALTER TABLE rides ADD COLUMN destination_lng DECIMAL(10,6) AFTER destination_lat",
  ];

  for (const sql of rideColumnMigrations) {
    try {
      await db.execute(sql);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }

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

  const [activeRows] = await db.execute("SELECT COUNT(*) as count FROM rides WHERE status IN ('accepted','active')");
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

  app.get("/events", (req, res) => {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders?.();

    eventHistory.slice().reverse().forEach((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 25000);

    eventClients.add(res);
    req.on("close", () => {
      clearInterval(heartbeat);
      eventClients.delete(res);
    });
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
      res.json({ token, driver: { id: driver.id, name: driver.name, email: driver.email, phone: driver.phone, plate: driver.plate, nida: driver.nida, photo_url: driver.photo_url, rating: driver.rating } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/auth/me", authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT id, name, email, phone, plate, nida, photo_url, status, rating FROM drivers WHERE id=?",
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
    const { name, email, phone, plate, nida, photo_url, password } = req.body;

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
          "UPDATE drivers SET name=?, email=?, phone=?, plate=?, nida=?, photo_url=?, password=? WHERE id=?",
          [name, email, phone || "", plate || "", nida || "", photo_url || "", hashed, req.driver.id]
        );
      } else {
        await db.execute(
          "UPDATE drivers SET name=?, email=?, phone=?, plate=?, nida=?, photo_url=? WHERE id=?",
          [name, email, phone || "", plate || "", nida || "", photo_url || "", req.driver.id]
        );
      }

      const [rows] = await db.execute(
        "SELECT id, name, email, phone, plate, nida, photo_url, status, rating FROM drivers WHERE id=?",
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
        "SELECT id, name, plate, photo_url, rating, status FROM drivers WHERE status='available' ORDER BY rating DESC, id DESC LIMIT 6"
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
  app.get("/driver/rides/history", authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT
          r.id, r.passenger_name, r.passenger_phone, r.pickup, r.destination,
          r.status, r.created_at,
          rr.rating AS review_rating, rr.comment AS review_comment, rr.created_at AS reviewed_at
         FROM rides r
         LEFT JOIN ride_reviews rr ON rr.ride_id = r.id
         WHERE r.driver_id=? AND r.status IN ('completed','cancelled')
         ORDER BY r.id DESC`,
        [req.driver.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/rides", async (req, res) => {
    const { passenger_name, passenger_phone, pickup, destination, pickup_location, destination_location } = req.body;
    const pickupLat = pickup_location?.latitude ?? null;
    const pickupLng = pickup_location?.longitude ?? null;
    const destinationLat = destination_location?.latitude ?? null;
    const destinationLng = destination_location?.longitude ?? null;

    if (!passenger_name || !passenger_phone) {
      return res.status(400).json({ error: "passenger name and phone are required" });
    }
    if (!pickup) return res.status(400).json({ error: "pickup is required" });
    try {
      const [result] = await db.execute(
        `INSERT INTO rides
          (passenger_name, passenger_phone, pickup, destination, pickup_lat, pickup_lng, destination_lat, destination_lng, status)
         VALUES (?,?,?,?,?,?,?,?,'pending')`,
        [passenger_name, passenger_phone, pickup, destination || "", pickupLat, pickupLng, destinationLat, destinationLng]
      );
      ridesTotal.inc();

      // ── OPTION A: Publish ride request to MQTT ────────
      mqttPublish("ride/request", {
        ride_id: result.insertId,
        passenger_name,
        passenger_phone,
        pickup,
        destination: destination || "Not specified",
        pickup_location: pickupLat !== null && pickupLng !== null ? { latitude: Number(pickupLat), longitude: Number(pickupLng) } : null,
        destination_location: destinationLat !== null && destinationLng !== null ? { latitude: Number(destinationLat), longitude: Number(destinationLng) } : null,
        status: "pending",
        message: "New ride request — drivers please respond",
      });

      res.status(201).json({ id: result.insertId, passenger_name, passenger_phone, pickup, destination, status: "pending" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /rides/:id/status — driver accepts or completes
  app.get("/rides/:id/tracking", async (req, res) => {
    try {
      const rideId = Number(req.params.id);
      const [rows] = await db.execute(
        `SELECT r.id, r.passenger_name, r.passenger_phone, r.pickup, r.destination,
          r.pickup_lat, r.pickup_lng, r.destination_lat, r.destination_lng,
          r.status, r.driver_id, r.created_at,
          d.name AS driver_name, d.plate AS driver_plate, d.photo_url AS driver_photo_url, d.rating AS driver_rating
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
          photo_url: latestLocation?.driver_photo_url || ride.driver_photo_url,
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
        "SELECT id, passenger_name, passenger_phone, pickup, destination, pickup_lat, pickup_lng, destination_lat, destination_lng, status, driver_id, created_at FROM rides WHERE id=?",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Ride not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/rides/:id/cancel", async (req, res) => {
    try {
      const rideId = Number(req.params.id);
      if (!Number.isInteger(rideId)) return res.status(400).json({ error: "Invalid ride id" });

      const [rows] = await db.execute(
        "SELECT id, status, driver_id FROM rides WHERE id=?",
        [rideId]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Ride not found" });

      const ride = rows[0];
      if (!["pending", "accepted"].includes(ride.status)) {
        return res.status(400).json({ error: "Only rides before pickup can be cancelled" });
      }

      await db.execute("UPDATE rides SET status='cancelled' WHERE id=?", [rideId]);
      if (ride.driver_id) {
        await db.execute("UPDATE drivers SET status='available' WHERE id=?", [ride.driver_id]);
      }

      mqttPublish("ride/status", {
        ride_id: rideId,
        driver_id: ride.driver_id,
        status: "cancelled",
        message: "Passenger cancelled before pickup",
      });

      res.json({ success: true, status: "cancelled" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/rides/:id/status", authMiddleware, async (req, res) => {
    const { status } = req.body;
    const nextStatus = normalizeRideStatus(status);
    if (!nextStatus || nextStatus === "pending") {
      return res.status(400).json({ error: "Unsupported ride status" });
    }

    try {
      const [currentRows] = await db.execute(
        "SELECT status, driver_id, pickup FROM rides WHERE id=?",
        [req.params.id]
      );
      if (currentRows.length === 0) return res.status(404).json({ error: "Ride not found" });
      const currentRide = currentRows[0];
      const previousStatus = currentRide.status;
      const [driverRows] = await db.execute(
        "SELECT id, name, plate, photo_url FROM drivers WHERE id=?",
        [req.driver.id]
      );
      const driver = driverRows[0] || req.driver;

      await db.execute(
        "UPDATE rides SET status=?, driver_id=? WHERE id=?",
        [nextStatus, req.driver.id, req.params.id]
      );

      if (["accepted", "active"].includes(nextStatus)) {
        await db.execute("UPDATE drivers SET status='on_trip' WHERE id=?", [req.driver.id]);
      }

      if (["completed", "cancelled"].includes(nextStatus)) {
        await db.execute("UPDATE drivers SET status='available' WHERE id=?", [req.driver.id]);
      }

      if (nextStatus === "accepted" && previousStatus !== "accepted") {
        ridesAccepted.inc();
      }
      if (!["accepted", "active"].includes(previousStatus) && ["accepted", "active"].includes(nextStatus)) {
        activeRidesGauge.inc();
      }
      if (nextStatus === "completed" && previousStatus !== "completed") {
        ridesCompleted.inc();
      }
      if (["accepted", "active"].includes(previousStatus) && ["completed", "cancelled"].includes(nextStatus)) {
        activeRidesGauge.dec();
      }
      if (nextStatus === "completed") {
        const [rev] = await db.execute("SELECT COUNT(*) as count FROM rides WHERE status='completed'");
        revenueGauge.set(rev[0].count * 3200);
      }

      // ── OPTION C: Publish ride status update to MQTT ──
      const statusMessages = {
        accepted: "Driver accepted - heading to passenger pickup",
        active: "Passenger picked up - heading to destination",
        completed: "Ride completed successfully",
        cancelled: "Ride was cancelled",
      };

      mqttPublish("ride/status", {
        ride_id: parseInt(req.params.id),
        driver_id: driver.id || req.driver.id,
        driver_name: driver.name || req.driver.name,
        plate: driver.plate || req.driver.plate,
        driver_photo_url: driver.photo_url || null,
        status: nextStatus,
        location_name: nextStatus === "accepted"
          ? `Heading to pickup: ${currentRide.pickup || "passenger pickup"}`
          : undefined,
        message: statusMessages[nextStatus] || `Ride status updated to ${nextStatus}`,
      });

      if (["accepted", "active", "completed"].includes(nextStatus)) {
        const rideId = Number(req.params.id);
        const previousLocation = latestRideLocations.get(rideId) || {};
        latestRideLocations.set(rideId, {
          ...previousLocation,
          ride_id: rideId,
          driver_id: driver.id || req.driver.id,
          driver_name: driver.name || req.driver.name,
          plate: driver.plate || req.driver.plate,
          driver_photo_url: driver.photo_url || previousLocation.driver_photo_url || null,
          location_name: nextStatus === "accepted"
            ? `Heading to pickup: ${currentRide.pickup || "passenger pickup"}`
            : previousLocation.location_name,
          progress_percent: nextStatus === "completed" ? 100 : previousLocation.progress_percent || (nextStatus === "active" ? 50 : 15),
          timestamp: new Date().toISOString(),
        });
      }

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
