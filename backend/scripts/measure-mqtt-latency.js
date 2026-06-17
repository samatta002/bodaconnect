const mqtt = require("mqtt");

const MQTT_HOST = process.env.MQTT_HOST || "localhost";
const MQTT_PORT = process.env.MQTT_PORT || "1883";
const SAMPLE_COUNT = Number(process.env.MQTT_LATENCY_SAMPLES || 10);
const TIMEOUT_MS = Number(process.env.MQTT_LATENCY_TIMEOUT_MS || 5000);
const clientId = `bodaconnect-latency-${Date.now()}`;
const topic = `bodaconnect/latency/${clientId}`;
const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

const client = mqtt.connect(brokerUrl, { clientId, reconnectPeriod: 0 });
const samples = [];
let sentAt = 0;
let timer = null;

function finish(exitCode = 0) {
  clearTimeout(timer);
  client.end(true, () => process.exit(exitCode));
}

function publishNext() {
  if (samples.length >= SAMPLE_COUNT) {
    const total = samples.reduce((sum, value) => sum + value, 0);
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const avg = total / samples.length;

    console.log("BodaConnect MQTT Latency Report");
    console.log("===============================");
    console.log(`Broker : ${brokerUrl}`);
    console.log(`Samples: ${samples.length}`);
    console.log(`Min    : ${min.toFixed(2)} ms`);
    console.log(`Avg    : ${avg.toFixed(2)} ms`);
    console.log(`Max    : ${max.toFixed(2)} ms`);
    finish(0);
    return;
  }

  sentAt = performance.now();
  client.publish(topic, JSON.stringify({ sent_at: Date.now(), sample: samples.length + 1 }));
}

client.on("connect", () => {
  timer = setTimeout(() => {
    console.error(`MQTT latency test timed out after ${TIMEOUT_MS} ms`);
    finish(1);
  }, TIMEOUT_MS);

  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`Could not subscribe to ${topic}: ${err.message}`);
      finish(1);
      return;
    }
    publishNext();
  });
});

client.on("message", () => {
  samples.push(performance.now() - sentAt);
  publishNext();
});

client.on("error", (err) => {
  console.error(`MQTT latency test failed: ${err.message}`);
  finish(1);
});
