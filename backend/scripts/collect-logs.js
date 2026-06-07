const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "logs");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

console.log("\n📋 BodaConnect Log Collection\n");

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch (err) {
    return err.stdout || err.message;
  }
}

// ── Collect container logs ────────────────────────────
const containers = [
  "bodaconnect-new-backend-1",
  "bodaconnect-new-frontend-1",
  "bodaconnect-new-db-1",
];

let fullLog = "";
fullLog += `BODACONNECT LOG REPORT\n`;
fullLog += `======================\n`;
fullLog += `Generated : ${new Date().toISOString()}\n\n`;

containers.forEach(name => {
  console.log(`Collecting logs from: ${name}`);
  const logs = run(`docker logs ${name} --tail 50 2>&1`);
  fullLog += `\n${"=".repeat(50)}\n`;
  fullLog += `CONTAINER: ${name}\n`;
  fullLog += `${"=".repeat(50)}\n`;
  fullLog += logs + "\n";
});

// ── Container stats (performance) ────────────────────
console.log("Collecting performance stats...");
const stats = run(
  `docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>&1`
);
fullLog += `\n${"=".repeat(50)}\n`;
fullLog += `PERFORMANCE STATS\n`;
fullLog += `${"=".repeat(50)}\n`;
fullLog += stats + "\n";

// ── Running containers ────────────────────────────────
console.log("Collecting container status...");
const ps = run(`docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1`);
fullLog += `\n${"=".repeat(50)}\n`;
fullLog += `CONTAINER STATUS\n`;
fullLog += `${"=".repeat(50)}\n`;
fullLog += ps + "\n";

// ── Docker image list ─────────────────────────────────
console.log("Collecting image list...");
const images = run(`docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" 2>&1`);
fullLog += `\n${"=".repeat(50)}\n`;
fullLog += `DOCKER IMAGES\n`;
fullLog += `${"=".repeat(50)}\n`;
fullLog += images + "\n";

// ── Error scan ────────────────────────────────────────
console.log("Scanning for errors...");
fullLog += `\n${"=".repeat(50)}\n`;
fullLog += `ERROR SCAN\n`;
fullLog += `${"=".repeat(50)}\n`;

containers.forEach(name => {
  const errors = run(`docker logs ${name} 2>&1 | grep -i "error\\|fail\\|crash\\|exception" || echo "No errors found"`);
  fullLog += `\n${name}:\n`;
  fullLog += errors + "\n";
});

// ── Save to file ──────────────────────────────────────
const logFile = path.join(OUTPUT_DIR, `bodaconnect-logs-${timestamp}.txt`);
fs.writeFileSync(logFile, fullLog);

console.log(`\n✅ Logs saved to: ${logFile}`);
console.log("\n--- PERFORMANCE SNAPSHOT ---");
console.log(stats);
console.log("--- CONTAINER STATUS ---");
console.log(ps);