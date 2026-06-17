# Task 5: CMMI Framework Application

## CMMI Maturity Assessment for BodaConnect CI/CD

| CMMI Level | Description | BodaConnect Evidence | Assessment |
| --- | --- | --- | --- |
| Level 1: Initial | Ad hoc builds and manual deployment. | Earlier deployment depended on manual server files and manual recovery when EC2 `git pull` failed. | Partially historical only. |
| Level 2: Managed | Basic pipeline exists and releases follow repeatable steps. | GitHub Actions CI runs API tests; Docker images are built and pushed; CD deploys to AWS EC2. | Achieved. |
| Level 3: Defined | CI/CD process is documented, standardized, and automated. | Docker Compose, CI/CD YAML, health checks, MQTT integration, and process maps are documented. | Mostly achieved. |
| Level 4: Quantitatively Managed | Metrics are collected and used to manage the process. | Prometheus/Grafana exist; CI now uploads measurement artifacts; MQTT latency can be measured. | Emerging / current target level. |
| Level 5: Optimizing | Continuous improvement based on metrics and root-cause analysis. | Root-cause analysis completed; rollback and measurement improvements implemented. | Not fully achieved yet. |

## Current Maturity Level

BodaConnect currently fits between **Level 3: Defined** and **Level 4: Quantitatively Managed**.

Reason:

- The pipeline is automated and documented.
- Docker, MQTT, Prometheus, Grafana, and GitHub Actions are integrated.
- Measurement has started, but long-term trends and regular improvement cycles are still developing.

## Evidence

| Evidence | Location |
| --- | --- |
| CI workflow | `.github/workflows/ci.yml` |
| CD workflow | `.github/workflows/cd.yml` |
| Docker Compose production setup | `docker-compose.prod.yml` |
| Monitoring configuration | `prometheus.yml` |
| Backend Prometheus metrics | `backend/server.js` |
| MQTT simulation and latency measurement | `backend/mqtt-client`, `backend/scripts/measure-mqtt-latency.js` |
| Process improvement documentation | `docs/process-improvement` |

## Plan to Move Up One Level

To move fully into Level 4:

1. Run CI/CD multiple times and collect metrics for every commit.
2. Build a Grafana dashboard showing ride, API, MQTT, and uptime metrics.
3. Track build duration, test success rate, deployment frequency, MQTT latency, and downtime weekly.
4. Define acceptable thresholds, for example:
   - API test success rate: 100 percent on main.
   - MQTT latency: below 200 ms average.
   - Deployment downtime: below 60 seconds.
5. Use the metrics during release decisions.

To move toward Level 5:

1. Review failures after every deployment.
2. Create improvement tasks from root-cause analysis.
3. Automate notifications for failed builds/deployments.
4. Add test coverage thresholds.
5. Use blue-green or rolling deployment to reduce downtime further.
