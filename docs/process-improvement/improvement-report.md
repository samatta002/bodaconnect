# Task 4: Process Change and Improvement Report

## Objective

Improve the BodaConnect CI/CD and operational workflow by reducing deployment risk and making pipeline performance measurable.

## Implemented Improvement 1: CI Measurement Artifacts

### Before

- API tests ran, but failure evidence was mostly visible only inside GitHub Actions logs.
- The pipeline did not save a structured measurement report.
- Test success rate and MQTT health status had to be calculated manually.

### Change Implemented

Updated `.github/workflows/ci.yml` to:

- Record CI test job duration.
- Save API test output to `reports/api-test-output.txt`.
- Save MQTT broker health output to `reports/mqtt-status.json`.
- Upload a `ci-measurement-report` artifact.
- Keep the job failing correctly if API tests fail.

### After

- Each CI run produces evidence for the assignment dashboard.
- Test failure details can be downloaded as an artifact.
- CI timing is available for before/after comparison.

## Implemented Improvement 2: Build/Push Timing Report

### Before

- Docker image build and push happened successfully, but build duration per commit was not saved in a structured file.

### Change Implemented

Updated `.github/workflows/ci.yml` to:

- Record Docker build/push start time.
- Save a `build-metrics.md` report.
- Upload a `build-measurement-report` artifact.

### After

- Build time per commit is visible and can be charted.
- Docker image tags are linked to the commit SHA for traceability.

## Implemented Improvement 3: AWS Health-Check Rollback

### Before

- AWS deployment rebuilt and restarted containers.
- If post-deployment health checks failed, the workflow failed but did not automatically restore the previous working commit.

### Change Implemented

Updated `.github/workflows/cd.yml` to:

- Save `PREVIOUS_COMMIT` before pulling the latest code.
- Run backend, frontend, and MQTT health checks after deployment.
- Automatically check out the previous commit, rebuild, and restart containers if health checks fail.

### After

- Failed deployments have an automated rollback path.
- Downtime after a bad deployment is reduced.
- The deployment process is more reliable and closer to production practice.

## Implemented Improvement 4: MQTT Latency Measurement Script

### Before

- MQTT connection was tested manually using port checks and simulator output.
- Message latency was not measured directly.

### Change Implemented

Added `backend/scripts/measure-mqtt-latency.js` and `npm run measure:mqtt`.

### After

- MQTT round-trip latency can be measured locally or on AWS.
- Results can be added to `metrics-baseline.csv` and visualized in Excel/Grafana.

## Before and After Summary

| Area | Before | After |
| --- | --- | --- |
| Test evidence | Logs only | Downloadable API test artifact |
| Build timing | Manual GitHub Actions inspection | Structured build metrics artifact |
| MQTT measurement | Port check only | MQTT latency script |
| Deployment failure handling | Workflow failed after bad health check | Rollback to previous commit |
| Process maturity | Managed but partially manual | More quantitatively managed and improving |

## Measurement Plan

Run the pipeline at least three times and record:

1. CI test duration from `ci-measurement-report`.
2. API test success rate from `api-test-output.txt`.
3. Build/push duration from `build-measurement-report`.
4. MQTT average latency from `npm run measure:mqtt`.
5. Downtime from CD health-check logs or Grafana.

Then update `metrics-baseline.csv` and create a chart for the final report.
