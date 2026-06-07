// passenger.js — Simulates a passenger booking rides
// and receiving real-time status updates

const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883", {
  clientId: "passenger-simulator",
  clean: true,
});

console.log("\n🛵 BodaConnect Passenger Simulator");
console.log("====================================\n");

client.on("connect", () => {
  console.log("✅ Passenger connected to MQTT broker\n");

  // Subscribe to ride status updates
  client.subscribe("ride/status", (err) => {
    if (!err) console.log("📩 Subscribed to: ride/status");
  });

  // Subscribe to driver location
  client.subscribe("driver/location", (err) => {
    if (!err) console.log("📍 Subscribed to: driver/location\n");
  });

  // Simulate passenger booking a ride after 2 seconds
  setTimeout(() => {
    const rideRequest = {
      ride_id: Math.floor(Math.random() * 1000),
      pickup: "Kariakoo Market",
      destination: "Mlimani City Mall",
      status: "pending",
      message: "New ride request — drivers please respond",
      timestamp: new Date().toISOString(),
    };

    console.log("🚖 Passenger booking a ride...");
    console.log("📤 Publishing to ride/request:", JSON.stringify(rideRequest, null, 2));
    client.publish("ride/request", JSON.stringify(rideRequest), { qos: 1 });
  }, 2000);
});

// Listen for incoming messages
client.on("message", (topic, message) => {
  const data = JSON.parse(message.toString());
  console.log(`\n📨 Received on [${topic}]:`);

  if (topic === "ride/status") {
    console.log(`  Status  : ${data.status}`);
    console.log(`  Driver  : ${data.driver_name}`);
    console.log(`  Plate   : ${data.plate}`);
    console.log(`  Message : ${data.message}`);
    console.log(`  Time    : ${data.timestamp}`);
  }

  if (topic === "driver/location") {
    console.log(`  Driver  : ${data.driver_name}`);
    console.log(`  Location: ${data.location_name}`);
    console.log(`  Lat/Lng : ${data.latitude}, ${data.longitude}`);
    console.log(`  Time    : ${data.timestamp}`);
  }
});

client.on("error", (err) => {
  console.error("❌ Connection error:", err.message);
});