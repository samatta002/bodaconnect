# Process Improvement Analysis and Implementation

## Introduction

BodaConnect is a Bodaboda ride-booking system deployed using Docker, GitHub Actions, AWS EC2, MQTT, Prometheus, and Grafana. The purpose of this process improvement work is to evaluate the CI/CD workflow, measure performance, analyze deployment failures, implement improvements, and assess process maturity using the CMMI framework.

## Process Map Summary

The CI/CD process starts when a developer pushes code to GitHub. GitHub Actions runs backend API tests, checks MQTT health, builds Docker images, pushes images to Docker Hub, deploys to staging, passes through a production approval gate, and deploys to AWS EC2 using Docker Compose. The deployed services include frontend, backend, MySQL, MQTT broker, Prometheus, and Grafana.

The business workflow starts when a passenger books a ride. The backend creates a pending ride, publishes an MQTT ride request, the driver accepts the ride, the ride changes to accepted, the driver travels to the pickup point, the trip becomes active, the passenger is taken to the destination, and the ride is completed and reviewed.

See `process-map.md` for the full diagrams.

## Measurement Dashboard Summary

The selected metrics are:

| Metric | Purpose |
| --- | --- |
| Build time per commit | Shows whether Docker build/push is becoming faster or slower. |
| Test success rate | Shows software quality and CI stability. |
| Deployment frequency | Shows how often working releases reach production. |
| MQTT message latency | Shows real-time communication performance. |
| Downtime after deployment | Shows deployment reliability and user impact. |

GitHub Actions artifacts and Prometheus/Grafana provide the evidence. The repository now includes CI measurement artifacts and an MQTT latency script.

## Root-Cause Analysis Summary

The main analyzed failure was AWS deployment failing during `git pull`. The cause was a dirty EC2 worktree created by runtime files such as `mosquitto/data/mosquitto.db`, plus permission issues caused by Docker-created files. The root cause was that runtime data and source-controlled deployment files were not separated clearly enough.

Corrective actions included ignoring runtime folders, unlocking Mosquitto runtime file permissions before pulling, and adding a rollback path when production health checks fail.

See `root-cause-analysis.md` for the 5 Whys and fishbone diagram.

## Implemented Improvements

| Improvement | Implementation | Expected Impact |
| --- | --- | --- |
| CI measurement artifacts | Updated `.github/workflows/ci.yml` | Easier measurement of test duration, test result, and MQTT health. |
| Build/push timing report | Updated `.github/workflows/ci.yml` | Build time per commit can be charted. |
| AWS rollback mechanism | Updated `.github/workflows/cd.yml` | Failed deployments can restore the previous working commit. |
| MQTT latency test | Added `backend/scripts/measure-mqtt-latency.js` | MQTT message latency can be measured directly. |

## Before and After Results

| Area | Before | After |
| --- | --- | --- |
| CI evidence | Manual log inspection | Downloadable artifacts |
| Build time tracking | Manual estimate | Build timing report |
| MQTT measurement | Port connectivity test | Round-trip message latency test |
| Deployment failure recovery | Manual recovery | Automated rollback on failed health checks |
| Process visibility | Partial | Improved measurement and documentation |

## CMMI Assessment

BodaConnect currently fits between Level 3 and Level 4.

- Level 3 is supported because the CI/CD process is defined, automated, and documented.
- Level 4 is emerging because metrics are now collected through GitHub Actions, Prometheus/Grafana, and MQTT latency measurement.
- To fully reach Level 4, the team should collect metrics across multiple commits and use thresholds to guide release decisions.

See `cmmi-assessment.md` for the full maturity table.

## Conclusion

The improved BodaConnect process is more measurable, more reliable, and easier to analyze. The added CI artifacts, build timing report, MQTT latency script, and AWS rollback mechanism support continuous improvement and help the team progress toward a quantitatively managed CI/CD process.
