# Task 2: Process Measurement

## Measurement Goals

The goal is to make CI/CD and operational performance visible using GitHub Actions artifacts, Prometheus, Grafana, and MQTT latency checks.

## Metrics Dashboard

| Metric | Source | How to Measure | Baseline / Initial Value | Target |
| --- | --- | --- | --- | --- |
| Build time per commit | GitHub Actions `build-measurement-report` artifact | Duration from Docker build start to image push completion | Record from next CI run | Reduce by 10 percent |
| Test success rate | GitHub Actions `ci-measurement-report` and API test output | Passed tests divided by total tests | Example failure observed: 7/8 = 87.5 percent | 100 percent on main |
| Deployment frequency | GitHub Actions run history | Count successful CD runs per day/week | Record weekly from Actions Insights | At least one successful deployment per release day |
| MQTT message latency | `npm run measure:mqtt` or Grafana custom panel | Average round-trip MQTT publish/receive time | Record from broker test | Under 200 ms on local/AWS network |
| Downtime after deployment | CD health checks, Grafana uptime panel | Time from deployment start to healthy frontend/backend/MQTT checks | Record from CD logs | Under 60 seconds |

## GitHub Actions Evidence

The CI workflow now uploads:

- `ci-measurement-report`
- `api-test-output.txt`
- `mqtt-status.json`
- `build-measurement-report`

Recommended screenshot evidence:

1. GitHub Actions run duration page.
2. Uploaded artifact list.
3. API test output showing pass/fail result.
4. CD deploy log showing health checks.
5. Grafana or Prometheus panel for backend request metrics.

## Prometheus/Grafana Panels

BodaConnect exposes Prometheus metrics from the backend at `/metrics`.

Recommended dashboard panels:

| Panel | Prometheus Query |
| --- | --- |
| HTTP requests by route | `sum by (route, status) (http_requests_total)` |
| Rides created | `rides_created_total` |
| Rides accepted | `rides_accepted_total` |
| Rides completed | `rides_completed_total` |
| Active rides | `rides_active_current` |
| MQTT messages published | `sum by (topic) (mqtt_messages_published_total)` |
| Total revenue estimate | `rides_revenue_total` |

## MQTT Latency Measurement

Run:

```bash
cd backend
MQTT_HOST=56.228.16.104 MQTT_PORT=1883 npm run measure:mqtt
```

For local Docker Compose:

```bash
cd backend
npm run measure:mqtt
```

Copy the output into the report and add it to `metrics-baseline.csv`.

## Baseline Data Table

Use `metrics-baseline.csv` as the spreadsheet source for charts in Excel, Power BI, or Google Sheets.
