// passenger.js - interactive passenger simulator for booking rides over MQTT

const mqtt = require("mqtt");
const readline = require("readline");

const MQTT_HOST = process.env.MQTT_HOST || "localhost";
const MQTT_PORT = process.env.MQTT_PORT || "1883";
const MQTT_USE_TLS = process.env.MQTT_USE_TLS === "true";
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const protocol = MQTT_USE_TLS ? "mqtts" : "mqtt";
const brokerUrl = `${protocol}://${MQTT_HOST}:${MQTT_PORT}`;

const clientOptions = {
  clientId: `passenger-simulator-${Date.now()}`,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 3000,
};

if (MQTT_USERNAME) {
  clientOptions.username = MQTT_USERNAME;
  clientOptions.password = MQTT_PASSWORD || "";
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function numberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomRideId() {
  return Math.floor(100000 + Math.random() * 900000);
}

const client = mqtt.connect(brokerUrl, clientOptions);

console.log("\nBodaConnect Passenger Simulator");
console.log("================================");
console.log(`Broker: ${brokerUrl}\n`);

client.on("connect", async () => {
  console.log("Passenger connected to MQTT broker\n");

  client.subscribe("ride/status", (err) => {
    if (err) console.error("Failed to subscribe to ride/status:", err.message);
    else console.log("Subscribed to: ride/status");
  });

  client.subscribe("driver/location", (err) => {
    if (err) console.error("Failed to subscribe to driver/location:", err.message);
    else console.log("Subscribed to: driver/location\n");
  });

  await bookRide();
});

async function bookRide() {
  console.log("Book a ride");
  console.log("Leave coordinates empty to use a Dar es Salaam sample route.\n");

  const pickup = await ask("Pickup name: ");
  const destination = await ask("Destination name: ");
  const pickupLat = await ask("Pickup latitude [-6.8160]: ");
  const pickupLng = await ask("Pickup longitude [39.2738]: ");
  const destinationLat = await ask("Destination latitude [-6.7726]: ");
  const destinationLng = await ask("Destination longitude [39.2285]: ");

  const rideRequest = {
    ride_id: randomRideId(),
    pickup: pickup || "Kariakoo Market",
    destination: destination || "Mlimani City Mall",
    pickup_location: {
      latitude: numberOrDefault(pickupLat, -6.8160),
      longitude: numberOrDefault(pickupLng, 39.2738),
    },
    destination_location: {
      latitude: numberOrDefault(destinationLat, -6.7726),
      longitude: numberOrDefault(destinationLng, 39.2285),
    },
    status: "pending",
    message: "New ride request - waiting for a driver",
    timestamp: new Date().toISOString(),
  };

  console.log("\nPublishing ride request:");
  console.log(JSON.stringify(rideRequest, null, 2));
  client.publish("ride/request", JSON.stringify(rideRequest), { qos: 1 });
}

client.on("message", (topic, message) => {
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch {
    console.log(`\nReceived non-JSON message on ${topic}: ${message.toString()}`);
    return;
  }

  if (topic === "ride/status") {
    console.log("\nRide status update");
    console.log(`Ride ID : ${data.ride_id}`);
    console.log(`Status  : ${data.status}`);
    console.log(`Driver  : ${data.driver_name || "Not assigned"}`);
    console.log(`Plate   : ${data.plate || "N/A"}`);
    console.log(`Message : ${data.message || ""}`);
    console.log(`Time    : ${data.timestamp}`);
  }

  if (topic === "driver/location") {
    console.log("\nDriver location update");
    console.log(`Ride ID : ${data.ride_id || "N/A"}`);
    console.log(`Driver  : ${data.driver_name}`);
    console.log(`Location: ${data.location_name || "On route"}`);
    console.log(`Lat/Lng : ${data.latitude}, ${data.longitude}`);
    console.log(`Progress: ${data.progress_percent || 0}%`);
    console.log(`Time    : ${data.timestamp}`);
  }
});

client.on("error", (err) => {
  console.error("Connection error:", err.message || err);
});

client.on("offline", () => {
  console.error("MQTT client is offline. Check the broker host, port, and AWS security group.");
});

process.on("SIGINT", () => {
  rl.close();
  client.end(true);
  process.exit(0);
});
