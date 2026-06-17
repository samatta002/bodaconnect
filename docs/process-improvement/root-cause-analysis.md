# Task 3: Process Analysis

## Selected Failure

During AWS EC2 deployment, GitHub Actions failed while running `git pull --ff-only origin main`.

Observed symptoms:

- `mosquitto/data/mosquitto.db`: permission denied during stash.
- `mosquitto/data/mosquitto.db`: local changes would be overwritten by merge.
- `docker-compose.prod.yml`: untracked file would be overwritten by merge.
- Deployment stopped before containers were rebuilt.

## 5 Whys Analysis

| Why | Question | Answer |
| --- | --- | --- |
| 1 | Why did deployment fail? | The EC2 repository could not pull the latest `main` branch. |
| 2 | Why could it not pull? | Local runtime files and an untracked production compose file conflicted with incoming repository files. |
| 3 | Why were runtime files inside the repository changing? | Mosquitto writes broker state and logs to mounted folders under the project directory. |
| 4 | Why could GitHub Actions not stash those files? | Docker-created runtime files had permissions that blocked the SSH deployment user. |
| 5 | Why was this not prevented earlier? | Runtime data was not fully separated from source-controlled files, and the deployment script did not unlock/clean runtime paths before pulling. |

## Root Cause

The deployment process mixed source-controlled application files with container-generated runtime files. This caused Git state conflicts and file permission problems during automated deployment.

## Fishbone Diagram

```mermaid
flowchart LR
  Problem[AWS deployment failure]

  Process[Process] --> Problem
  Runtime[Runtime files] --> Problem
  Permissions[Permissions] --> Problem
  Config[Configuration] --> Problem
  Monitoring[Monitoring] --> Problem

  Process --> P1[git pull performed on dirty EC2 worktree]
  Process --> P2[manual recovery needed after failed deploy]

  Runtime --> R1[mosquitto.db generated inside repo]
  Runtime --> R2[mosquitto logs/data changed after container start]

  Permissions --> PE1[Docker-owned files blocked stash]
  Permissions --> PE2[SSH user could not read broker database]

  Config --> C1[docker-compose.prod.yml existed on server before tracked version arrived]
  Config --> C2[.gitignore needed to exclude runtime folders]

  Monitoring --> M1[health checks happened only after pull/build]
  Monitoring --> M2[no rollback path before improvement]
```

## Corrective Actions

| Issue | Improvement |
| --- | --- |
| Runtime file conflict | Ignore Mosquitto runtime folders and keep production compose in source control. |
| Permission denied during deploy | Stop MQTT container and change ownership of runtime folders before pull. |
| Failed deploy can leave app unhealthy | Add health-check-based rollback to previous commit. |
| Hard to measure failure patterns | Upload CI metrics and API test logs as GitHub Actions artifacts. |

## Preventive Actions

- Keep source code, configuration, and runtime data clearly separated.
- Store production deployment files in Git instead of creating them manually on EC2.
- Save CI/CD measurement artifacts for each run.
- Use Grafana/Prometheus and GitHub Actions logs to identify recurring bottlenecks.
