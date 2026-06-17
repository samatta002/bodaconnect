# CS 421 Assignment 4: Process Improvement Package

This folder contains the BodaConnect process improvement deliverables for CS 421 Assignment 4.

## Deliverables

- `process-map.md`: Current CI/CD process map and Bodaboda business workflow.
- `measurement-dashboard.md`: Metrics dashboard plan, baseline table, and evidence sources.
- `metrics-baseline.csv`: Spreadsheet-friendly baseline metrics template.
- `root-cause-analysis.md`: 5 Whys and fishbone analysis for deployment failures.
- `improvement-report.md`: Implemented process changes and before/after impact.
- `cmmi-assessment.md`: CMMI maturity table with current level and improvement plan.

## Implemented Repository Improvements

1. CI measurement artifacts:
   - `.github/workflows/ci.yml` now saves API test logs, MQTT health output, and CI timing reports as GitHub Actions artifacts.
   - This supports build time, test success rate, and MQTT health measurement.

2. AWS deployment rollback:
   - `.github/workflows/cd.yml` now records the previous EC2 commit and rolls back if production health checks fail.
   - This reduces downtime after failed deployments.

3. MQTT latency measurement:
   - `backend/scripts/measure-mqtt-latency.js` measures MQTT round-trip latency.
   - Run it with:

```bash
cd backend
npm run measure:mqtt
```

Use screenshots from GitHub Actions, Grafana, Prometheus, and terminal output as report evidence.
