# Industrial IoT Edge-Cloud Task Offloading Simulation System

A distributed research and simulation platform designed to evaluate and optimize task offloading decisions in Industrial Internet of Things (IIoT) smart manufacturing environments. The platform compares sequential greedy heuristic decisions (**Greedy Best-First Search — GBFS**) against combinatorial swarm optimization (**Binary Particle Swarm Optimization — PSO**) across distributed virtual **Edge** and **Cloud** servers.

---

## 1. System Architecture

The simulation environment runs as a multi-container microservice system orchestrated via Docker Compose:

```
                                 +-------------------------------+
                                 |       React SPA Frontend      |
                                 |   (Vite, Recharts, Nginx)     |
                                 +---------------+---------------+
                                                 | HTTP / WebSocket (:8000)
                                                 v
                                 +-------------------------------+
                                 |    FastAPI Simulation API     |
                                 |   - REST API Endpoints        |
                                 |   - Socket.IO Event Server    |
                                 |   - GBFS & PSO Planning       |
                                 +-------+---------------+-------+
                                         |               |
                   Redis Pub/Sub Commands|               | PostgreSQL (asyncpg)
                                         v               v
                        +------------------+   +--------------------+
                        │   Redis (7.0)    │   │ PostgreSQL (v16)   │
                        │ - Event bridge   │   │ - Machines catalog │
                        │ - Worker Pub/Sub │   │ - Task templates   │
                        +--------+---------+   │ - Runs & analytics │
                                 |             +--------------------+
         +-----------------------+-----------------------+-----------------------+
         |                       |                       |                       |
         v                       v                       v                       v
+-----------------+     +-----------------+     +-----------------+     +-----------------+
|    gbfs-edge    |     |   gbfs-cloud    |     |    pso-edge     |     |    pso-cloud    |
|  (GBFS:SERVER_A)|     |  (GBFS:SERVER_B)|     |  (PSO:SERVER_A) |     |  (PSO:SERVER_B) |
+-----------------+     +-----------------+     +-----------------+     +-----------------+
```

### Core Components
1. **Frontend (`frontend/`)**: React 19 single-page application served via Nginx. Features:
   - **Simulation History**: Landing dashboard with aggregated metrics, run logs, and report views.
   - **4-Step Wizard**: Machine selection -> Workload/Batch builder -> Live Offload Execution -> Reports.
   - **Real-Time Visualizations**: Live Gantt timeline, GBFS decision step traces, PSO particle swarm tracks, live server resource bars, radar profile charts, and tradeoff scatter charts.
2. **Simulation API (`simulation_backend/`)**: FastAPI application providing REST routes, Socket.IO rooms, and telemetry broadcasting.
3. **Database (`PostgreSQL 16`)**: Stores registered machines, task templates, simulation run records, and task telemetry logs.
4. **Message Broker (`Redis 7`)**: Bridges command queues and event streams between the simulation API and worker containers.
5. **Worker Nodes (4 Dedicated Containers)**:
   - `gbfs-edge` (`GBFS:SERVER_A`): Simulates edge processing for GBFS-assigned tasks.
   - `gbfs-cloud` (`GBFS:SERVER_B`): Simulates cloud processing for GBFS-assigned tasks.
   - `pso-edge` (`PSO:SERVER_A`): Simulates edge processing for PSO-assigned tasks.
   - `pso-cloud` (`PSO:SERVER_B`): Simulates cloud processing for PSO-assigned tasks.

---

## 2. Server Specifications & Profiles

Each server profile models physical compute constraints, network properties, and energy coefficients:

| Property | Edge Server A (`SERVER_A`) | Cloud Server B (`SERVER_B`) | Local Machine (`LOCAL_MACHINE`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Network Latency (`N`)** | `50.0 ms` (`0.05 s`) | `120.0 ms` (`0.12 s`) | `0.0 ms` (`0.00 s`) | Base round-trip network transmission delay |
| **Processing Speed (`P`)** | `1.0x` baseline | `2.5x` fast | `0.5x` slow | CPU compute multiplier factor |
| **Max Memory (RAM)** | `500.0 MB` | `2000.0 MB` | `1000.0 MB` | Maximum active task memory capacity |
| **Queue Storage Buffer** | `250.0 MB` | `1000.0 MB` | `500.0 MB` | Maximum payload buffer for pending queue |
| **CPU Cores** | `2 cores` (`200%`) | `8 cores` (`800%`) | `2 cores` (`200%`) | Simultaneous execution capacity |
| **Network Bandwidth (`B`)** | `100.0 MB/s` | `100.0 MB/s` | `1000.0 MB/s` | Shared network upload link bandwidth |
| **Energy Coefficient** | `0.08` | `0.03` | `0.15` | Energy consumption multiplier per unit compute |

---

## 3. Simulation Mechanics & Physics Formulation

### 3.1 Network Transmission & Bandwidth Sharing
Tasks assigned to a server share its network bandwidth equally:

```text
Current Speed (MB/s) = Bandwidth / Active_Transfers   (if Active_Transfers > 0, else 0)
```

For each simulation tick `delta_t`:

```text
Transferred Data (MB) = Current Speed * delta_t
Remaining Payload = Remaining Payload - Transferred Data
```

### 3.2 Total Latency Formulation
The end-to-end total latency `T_total` experienced by each task is:

```text
T_total = T_trans + T_queue + T_proc
```

where:
- **`T_trans`**: Time required to complete data transmission over the shared network plus base network latency.
- **`T_queue`**: Time spent waiting in the server RAM queue while CPU cores are busy.
- **`T_proc`**: Actual compute time on the CPU:
  ```text
  T_proc = Task Processing Duration (sec) / Server Processing Speed
  ```

### 3.3 Failure Conditions
A task will transition to `FAILED` status under any of the following constraints:
1. **Hardware Capacity Deficit**:
   - `Task RAM Demand > Server Max RAM`
   - `Task CPU Demand > Server Max CPU Capacity`
2. **Buffer Overflows**:
   - `Active RAM Allocation + Task RAM > Server Max RAM`
   - `Active Queue Storage + Task Payload > Server Storage Buffer`
3. **SLA Deadline Breach (Service Level Agreement)**:
   - If cumulative elapsed latency exceeds the task's maximum tolerable latency:
     ```text
     T_current + T_proc > Task Max Tolerable Latency (SLA)
     ```

---

## 4. Algorithms: GBFS vs. Binary PSO

### 4.1 Greedy Best-First Search (GBFS)

GBFS processes tasks **sequentially in input order**, making an immediate greedy choice per task by tracking running server memory reservations, storage buffer occupancy, and estimated queue backlog.

#### Feasibility Filter & Capacity Tracking
For each task, candidate servers are checked against individual task constraints and cumulative batch occupancy:

```text
Feasible(Task, Server) = (Task_RAM <= Server_RAM) AND
                         (Running_RAM + Task_RAM <= Server_RAM) AND
                         (Running_Storage + Task_Payload <= Server_Storage) AND
                         (Task_CPU <= Server_CPU)
```

#### Heuristic Scoring Function
For feasible candidate servers, GBFS calculates an immediate heuristic cost combining round-trip network latency, payload transmission time, estimated queue backlog delay, and execution duration:

```text
Estimated Network Time (ms) = Network Latency + (Task Payload / Server Bandwidth * 1000)
Estimated Execution Time (ms) = (Task Processing Duration / Server Processing Speed) * 1000
Estimated Queue Backlog (ms) = Server Cumulative Busy Backlog (ms)

Heuristic Score = Estimated Network Time + (0.8 * Estimated Queue Backlog) + (0.5 * Estimated Execution Time)
```

- **Decision Rule**:
  ```text
  Selected Server = argmin( Heuristic Score for Server in Feasible Servers )
  ```
- **Sequential Dynamic Behavior**:
  - **Early Tasks**: With empty queues and available RAM, Edge Server A is greedily favored due to lower network latency (`50 ms` vs `120 ms`).
  - **Mid to Late Tasks**: As Edge Server A accumulates queue backlog and reaches its 500 MB RAM or 250 MB storage buffer limit, the heuristic score for Edge increases significantly or Edge becomes infeasible. GBFS dynamically routes subsequent tasks to Cloud Server B (`2.5x` processing speed, `2000 MB` RAM, `8 cores`).

> **Note**: After each allocation, the cumulative busy time estimate is updated with a `0.2s` natural decay factor per scheduling step to approximate tasks completing concurrently with new arrivals: `Busy_Time += (T_exec / CPU_Cores) - 0.2`.

---

### 4.2 Binary Particle Swarm Optimization (Binary PSO)

Binary PSO optimizes the **entire batch globally**, evaluating assignment combinations across a search space of `2^N` possible configurations.

#### Representation
- **Position Vector**: `X_i = (x_i1, x_i2, ..., x_iN)`, where:
  - `x_id = 0` -> **Edge Server A**
  - `x_id = 1` -> **Cloud Server B**
- **Swarm Size**: `M = 12` particles.
- **Iterations**: `T = 40` iterations.

#### Velocity & Position Updates
At iteration `t + 1`:

```text
v_id(t+1) = clamp( w * v_id(t) + c1 * r1 * (p_id - x_id(t)) + c2 * r2 * (g_d - x_id(t)), -v_max, v_max )

Sigmoid Transfer Function:
S(v_id(t+1)) = 1 / ( 1 + exp( -v_id(t+1) ) )

Position Sampling:
x_id(t+1) = 1 if rand() < S(v_id(t+1)) else 0
```

#### Hyperparameters
| Parameter | Symbol | Value | Description |
| :--- | :--- | :--- | :--- |
| **Inertia Weight** | `w` | `0.7` | Balances exploration vs. exploitation |
| **Cognitive Acceleration** | `c1` | `1.5` | Particle memory attraction |
| **Social Acceleration** | `c2` | `1.5` | Swarm global best attraction |
| **Velocity Clamp** | `v_max` | `4.0` | Prevents probability saturation |
| **Random Seed** | `seed` | `12345` | Ensures deterministic, reproducible search results |

#### Multi-Objective Lexicographical Fitness Function
Each candidate allocation vector is simulated through the discrete-event simulator engine:

```text
Fitness(X) = ( Failed Count, SLA Breach Count, Total Completed Latency (s), Worst Task Latency (s) )
```

- **Priority 1**: Minimize total failed tasks (hard capacity violations).
- **Priority 2**: Minimize SLA deadline breaches.
- **Priority 3**: Minimize cumulative batch latency.
- **Priority 4**: Minimize makespan / worst-case task latency.

---

## 5. REST API Documentation

Base URL: `http://localhost:8000` (or `/api/v1` via frontend reverse proxy).

### Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health check (verifies PostgreSQL & Redis connectivity) |
| `GET` | `/api/v1/machines` | Returns catalog of registered IoT machines |
| `GET` | `/api/v1/task-templates` | Returns all seeded task templates with demand attributes |
| `GET` | `/api/v1/workloads/{machine_id}` | Retrieves task templates specific to a machine |
| `GET` | `/api/v1/servers` | Returns active server node profiles and capabilities |
| `GET` | `/api/v1/servers/ping/{server_id}` | Ping test returning server network latency |
| `POST` | `/api/v1/runs` | Creates and queues a new simulation run (`202 Accepted`) |
| `GET` | `/api/v1/runs` | Lists simulation run history (supports `?limit=50`) |
| `GET` | `/api/v1/runs/{run_id}` | Retrieves execution results and algorithm allocations for a run |
| `GET` | `/api/v1/runs/{run_id}/analytics` | Retrieves complete 6-section analytics report for a run |

---

### Request & Response Schemas

#### `POST /api/v1/runs`
```json
{
  "seed": 12345,
  "tasks": [
    {
      "task_id": "TSK-1001",
      "task_name": "Plasma Contour Cutting",
      "payload_size_mb": 12.5,
      "processing_duration_sec": 3.2,
      "cpu_demand_percent": 45.0,
      "ram_demand_mb": 128.0,
      "max_tolerable_latency_sec": 8.0,
      "source_machine_id": "M1"
    }
  ]
}
```
**Response (`202 Accepted`)**:
```json
{
  "run_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "QUEUED"
}
```

#### `GET /api/v1/runs/{run_id}/analytics`
Returns structured report data containing:
- `raw_performance`: Latency, processing time, throughput, CPU%, RAM, storage, queue depth.
- `radar_comparison`: 5-dimensional normalized scores (Latency, Processing, Throughput, Energy, Utilization).
- `baseline_improvement`: Percentage improvements compared to local execution baseline.
- `tradeoffs`: Energy donut metrics, bubble chart points, and recommended server allocation.
- `experiment_validation`: Predicted vs. actual measured latency with percentage deviation.
- `research_conclusion`: Algorithm recommendation and summary conclusions.

---

## 6. Socket.IO Real-Time Event Protocol

Clients connect to `/socket.io` and join a run room by emitting:
```javascript
socket.emit("join_run", { run_id: "<uuid>" });
```

### Server-Emitted Events

| Event | Payload Key Fields | Description |
| :--- | :--- | :--- |
| `run` | `run_id`, `status` | Run status updates (`RUNNING`, `COMPLETED`, `FAILED`) |
| `gbfs_decision_step` | `task_index`, `task_id`, `candidates`, `selected_server`, `decision_reason` | Emitted per task to visualize sequential heuristic reasoning |
| `pso_decision_step` | `iteration`, `best_fitness`, `best_x`, `particles`, `global_allocation` | Emitted per PSO iteration to visualize swarm convergence |
| `algorithm` | `run_id`, `algorithm`, `allocation`, `tasks` | Initial serialized allocation results |
| `task` | `run_id`, `algorithm`, `server`, `task_id`, `status`, `error_message` | Real-time task lifecycle transitions (`TRANSFERRING` -> `IN_QUEUE` -> `RUNNING` -> `FINISHED`/`FAILED`) |
| `server_usage` | `server_id`, `algorithm`, `placement`, `tasks_in_flight`, `cpu_utilization_percent`, `memory_utilization_percent` | Live server load and utilization snapshot |
| `run_complete` | `run_id`, `status`, `analytics` | Emitted when simulation workers finish execution |
| `run_failed` | `run_id`, `error` | Emitted if an unhandled error occurs |

---

## 7. Machine & Workload Catalog

The database is seeded from CSV templates (`simulation_backend/data/`):

### Seeded Machines
1. **`CPCM1` (CNC Plasma Cutting)**: Heavy duty high-heat CNC plasma cutting machine.
2. **`PCM1` (Plasma Cutting)**: CNC plasma cutter for plates and shapes.
3. **`PB2` (Paint Booth)**: Automated industrial spray painting cell.
4. **`WM1` (Arc Welding)**: Multi-axis robotic welding arm.
5. **`SM3` (Shearing Machine)**: Heavy metal plate cutting and stamping.

### Workload Sizing Scheme
- **Low**: Sized for `35%` edge server capacity footprint.
- **Mid**: Sized for `65%` edge server capacity footprint.
- **High**: Sized for `95%` edge server capacity footprint (stresses edge capacity, triggering cloud offloading).
- **Custom Batch**: Manual selection and batch quantity configuration.

---

## 8. Deployment & Running Instructions

### 8.1 Docker Compose Deployment (Recommended)

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Start Database and Redis**:
   ```bash
   docker compose up -d postgres redis
   ```

3. **Run One-Time Database Seed**:
   ```bash
   docker compose --profile setup run --rm --build seed
   ```

4. **Start API and Simulation Workers**:
   ```bash
   docker compose up -d --build simulation-api gbfs-edge gbfs-cloud pso-edge pso-cloud
   ```

5. **Start Frontend Dashboard**:
   ```bash
   docker compose up -d --build frontend
   ```

- **Web Dashboard**: `http://localhost:5173`
- **Simulation API**: `http://localhost:8000`

---

### 8.2 Local Development Setup

#### Backend Setup
```bash
cd simulation_backend
python -m venv venv
source venv/bin/activate
pip install -e .
python -m simulation_backend.seed
uvicorn simulation_backend.api:asgi_app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.