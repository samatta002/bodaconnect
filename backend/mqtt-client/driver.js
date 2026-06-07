// driver.js — Simulates a driver receiving ride requests
// accepting rides and publishing location updates

const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883", {
  clientId: "driver-simulator",
  clean: true,
});

const DRIVER = {
  id: 1,
  name: "Mbwana Tupa",
  plate: "T 234 ABC",
};

// Dar es Salaam locations for simulation
const LOCATIONS = [
  { name: "Kariakoo Market",     lat: -6.8160, lng: 39.2738 },
  { name: "Posta CBD",           lat: -6.8150, lng: 39.2900 },
  { name: "Mlimani City Mall",   lat: -6.7726, lng: 39.2285 },
  { name: "Ubungo Terminal",     lat: -6.7961, lng: 39.2200 },
  { name: "Msasani Beach",       lat: -6.7620, lng: 39.2850 },
];

let locationIndex = 0;

console.log("\n🏍  BodaConnect Driver Simulator");
console.log("==================================\n");
console.log(`Driver : ${DRIVER.name}`);
console.log(`Plate  : ${DRIVER.plate}\n`);

client.on("connect", () => {
  console.log("✅ Driver connected to MQTT broker\n");

  // Subscribe to ride requests
  client.subscribe("ride/request", (err) => {
    if (!err) console.log("📩 Subscribed to: ride/request");
  });

  // Publish driver location every 5 seconds (Option B)
  console.log("📍 Publishing location every 5 seconds...\n");
  setInterval(() => {
    const loc = LOCATIONS[locationIndex % LOCATIONS.length];
    locationIndex++;

    const locationUpdate = {
      driver_id: DRIVER.id,
      driver_name: DRIVER.name,
      plate: DRIVER.plate,
      latitude: loc.lat + (Math.random() * 0.001),  // Slight variation
      longitude: loc.lng + (Math.random() * 0.001),
      location_name: loc.name,
      timestamp: new Date().toISOString(),
    };

    console.log(`📤 Publishing location: ${loc.name}`);
    client.publish("driver/location", JSON.stringify(locationUpdate), { qos: 1 });
  }, 5000);
});

// Listen for ride requests
client.on("message", (topic, message) => {
  const data = JSON.parse(message.toString());
  console.log(`\n📨 Received on [${topic}]:`);

  if (topic === "ride/request") {
    console.log(`  Ride ID     : ${data.ride_id}`);
    console.log(`  Pickup      : ${data.pickup}`);
    console.log(`  Destination : ${data.destination}`);
    console.log(`  Time        : ${data.timestamp}`);

    // Driver accepts the ride after 3 seconds
    setTimeout(() => {
      const statusUpdate = {
        ride_id: data.ride_id,
        driver_id: DRIVER.id,
        driver_name: DRIVER.name,
        plate: DRIVER.plate,
        status: "active",
        message: "Driver accepted — on the way",
        timestamp: new Date().toISOString(),
      };

      console.log(`\n✅ Driver accepting ride #${data.ride_id}...`);
      console.log("📤 Publishing to ride/status:", JSON.stringify(statusUpdate, null, 2));
      client.publish("ride/status", JSON.stringify(statusUpdate), { qos: 1 });

      // Complete the ride after 10 seconds
      setTimeout(() => {
        const completedUpdate = {
          ...statusUpdate,
          status: "completed",
          message: "Ride completed successfully",
          timestamp: new Date().toISOString(),
        };
        console.log(`\n🏁 Completing ride #${data.ride_id}...`);
        client.publish("ride/status", JSON.stringify(completedUpdate), { qos: 1 });
      }, 10000);

    }, 3000);
  }
});

client.on("error", (err) => {
  console.error("❌ Connection error:", err.message);
});