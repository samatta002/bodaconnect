// driver.js - interactive driver simulator for responding to MQTT ride requests

const mqtt = require("mqtt");
const readline = require("readline");

const MQTT_HOST = process.env.MQTT_HOST || "localhost";
const MQTT_PORT = process.env.MQTT_PORT || "1883";
const MQTT_USE_TLS = process.env.MQTT_USE_TLS === "true";
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const API_URL = (process.env.BODACONNECT_API_URL || "http://localhost:5000").replace(/\/$/, "");
const protocol = MQTT_USE_TLS ? "mqtts" : "mqtt";
const brokerUrl = `${protocol}://${MQTT_HOST}:${MQTT_PORT}`;

let DRIVER = null;
let client = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return body;
}

async function getAuthToken() {
  if (process.env.BODACONNECT_TOKEN) return process.env.BODACONNECT_TOKEN;

  let email = process.env.DRIVER_EMAIL;
  let password = process.env.DRIVER_PASSWORD;

  if (!email) email = await ask("Driver email: ");
  if (!password) password = await ask("Driver password: ");

  const login = await fetchJson(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return login.token;
}

async function loadDriverProfile() {
  const token = await getAuthToken();
  const driver = await fetchJson(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    id: driver.id,
    name: driver.name,
    email: driver.email,
    plate: driver.plate || "No plate",
  };
}

function publish(topic, payload) {
  if (!client?.connected) {
    console.error(`Cannot publish ${topic}; MQTT client is not connected.`);
    return;
  }

  client.publish(
    topic,
    JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    { qos: 1 }
  );
}

function interpolate(start, end, progress) {
  return {
    latitude: Number((start.latitude + (end.latitude - start.latitude) * progress).toFixed(6)),
    longitude: Number((start.longitude + (end.longitude - start.longitude) * progress).toFixed(6)),
  };
}

function startTripSimulation(ride) {
  const pickup = ride.pickup_location || { latitude: -6.8160, longitude: 39.2738 };
  const destination = ride.destination_location || { latitude: -6.7726, longitude: 39.2285 };
  const steps = Number(process.env.TRIP_STEPS || 10);
  const intervalMs = Number(process.env.TRIP_INTERVAL_MS || 5000);
  let step = 0;

  console.log(`\nStarting live location updates for ride #${ride.ride_id}`);
  console.log(`Updates: ${steps} steps, every ${intervalMs / 1000}s\n`);

  const timer = setInterval(() => {
    step += 1;
    const progress = Math.min(step / steps, 1);
    const location = interpolate(pickup, destination, progress);

    publish("driver/location", {
      ride_id: ride.ride_id,
      driver_id: DRIVER.id,
      driver_name: DRIVER.name,
      plate: DRIVER.plate,
      latitude: location.latitude,
      longitude: location.longitude,
      location_name: progress >= 1 ? ride.destination : `On route to ${ride.destination}`,
      progress_percent: Math.round(progress * 100),
    });

    console.log(`Location sent for ride #${ride.ride_id}: ${Math.round(progress * 100)}%`);

    if (progress >= 1) {
      clearInterval(timer);
      publish("ride/status", {
        ride_id: ride.ride_id,
        driver_id: DRIVER.id,
        driver_name: DRIVER.name,
        plate: DRIVER.plate,
        status: "completed",
        message: "Ride completed successfully",
      });
      console.log(`Ride #${ride.ride_id} completed\n`);
    }
  }, intervalMs);
}

async function handleRideRequest(ride) {
  console.log("\nNew ride request");
  console.log(`Ride ID     : ${ride.ride_id}`);
  console.log(`Pickup      : ${ride.pickup}`);
  console.log(`Destination : ${ride.destination}`);
  console.log(`Message     : ${ride.message || ""}`);

  const answer = (await ask("Accept this ride? (y/n): ")).toLowerCase();

  if (answer !== "y" && answer !== "yes") {
    publish("ride/status", {
      ride_id: ride.ride_id,
      driver_id: DRIVER.id,
      driver_name: DRIVER.name,
      plate: DRIVER.plate,
      status: "rejected",
      message: "Driver rejected the ride",
    });
    console.log(`Ride #${ride.ride_id} rejected\n`);
    return;
  }

  publish("ride/status", {
    ride_id: ride.ride_id,
    driver_id: DRIVER.id,
    driver_name: DRIVER.name,
    plate: DRIVER.plate,
    status: "active",
    message: "Driver accepted - on the way",
  });

  console.log(`Ride #${ride.ride_id} accepted`);
  startTripSimulation(ride);
}

function connectMQTT() {
  const clientOptions = {
    clientId: `driver-simulator-${DRIVER.id}-${Date.now()}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
  };

  if (MQTT_USERNAME) {
    clientOptions.username = MQTT_USERNAME;
    clientOptions.password = MQTT_PASSWORD || "";
  }

  client = mqtt.connect(brokerUrl, clientOptions);

  client.on("connect", () => {
    console.log("Driver connected to MQTT broker\n");

    client.subscribe("ride/request", (err) => {
      if (err) console.error("Failed to subscribe to ride/request:", err.message);
      else console.log("Waiting for ride requests on: ride/request\n");
    });
  });

  client.on("message", (topic, message) => {
    if (topic !== "ride/request") return;

    let ride;
    try {
      ride = JSON.parse(message.toString());
    } catch {
      console.log(`Received non-JSON ride request: ${message.toString()}`);
      return;
    }

    handleRideRequest(ride).catch((err) => {
      console.error("Failed to handle ride request:", err.message || err);
    });
  });

  client.on("error", (err) => {
    console.error("Connection error:", err.message || err);
  });

  client.on("offline", () => {
    console.error("MQTT client is offline. Check the broker host, port, and AWS security group.");
  });
}

async function start() {
  console.log("\nBodaConnect Driver Simulator");
  console.log("============================");
  console.log(`API   : ${API_URL}`);
  console.log(`Broker: ${brokerUrl}\n`);

  try {
    DRIVER = await loadDriverProfile();
  } catch (err) {
    console.error(`Could not load driver profile: ${err.message}`);
    console.error("Set BODACONNECT_API_URL and valid DRIVER_EMAIL/DRIVER_PASSWORD, then try again.");
    process.exit(1);
  }

  console.log(`Driver: ${DRIVER.name}`);
  console.log(`Email : ${DRIVER.email}`);
  console.log(`Plate : ${DRIVER.plate}\n`);

  connectMQTT();
}

process.on("SIGINT", () => {
  rl.close();
  if (client) client.end(true);
  process.exit(0);
});

start();
