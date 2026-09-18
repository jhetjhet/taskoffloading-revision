# Industrial IoT Edge-Cloud Task Offloading Simulation System

## Current Backend Setup

The active backend is [simulation_backend](simulation_backend), not the legacy `Backend/` folder. It uses local PostgreSQL for machine/task templates and run history, Redis for internal worker commands/events, Socket.IO for frontend events, and four isolated workers: GBFS Edge, GBFS Cloud, PSO Edge, and PSO Cloud.

### Start and Seed

```bash
cp .env.example .env

docker compose up -d postgres redis
docker compose --profile setup run --rm --build seed
docker compose up -d --build simulation-api gbfs-edge gbfs-cloud pso-edge pso-cloud
```

The seed command is repeatable. It upserts 5 machines and 15 task templates from [simulation_backend/data](simulation_backend/data). Start the frontend after the API is healthy:

```bash
docker compose up -d --build frontend
```

The API is available at `http://localhost:8000`.

### Frontend API Contract

- `GET /api/v1/health` checks API, PostgreSQL, and Redis health.
- `GET /api/v1/machines` returns the seeded machine catalog.
- `GET /api/v1/task-templates` returns all 15 task templates.
- `GET /api/v1/servers` returns the available server list with latency/capability metadata.
- `GET /api/v1/servers/ping/{server_id}` pings a server and returns its measured latency profile.
- `GET /api/v1/workloads/{machine_id}` returns the task templates for one machine so the frontend can batch them into a custom low/mid/high simulation.
- `POST /api/v1/runs` accepts a custom `tasks` array or a machine-based batch and returns a `202` response containing `run_id`.
- `GET /api/v1/runs/{run_id}` returns persisted input, GBFS/PSO allocations, and per-task timings/statuses.
- `GET /api/v1/runs` returns recent run history.

Socket.IO clients connect to the API origin and emit `join_run` with `{ "run_id": "..." }`. The backend emits `run`, `algorithm`, `task`, `server_usage`, `run_complete`, and `run_failed`.

Task lifecycle events are emitted for each task on its assigned algorithm/server pair and follow this status flow:

```json
{
   "event": "task",
   "run_id": "<uuid>",
   "algorithm": "GBFS",
   "server": "GBFS:SERVER_A",
   "task_id": "TSK-1042",
   "status": "TRANSFERRING"
}
```

Later task events resolve to `FINISHED` or `FAILED`, and include the same `run_id`, `algorithm`, `server`, and `task_id`, plus `error_message` when the task misses its SLA or cannot fit the server profile.

Server usage snapshots are emitted as a summary of the currently active load on each of the four simulated workers. The frontend can use them to update utilization bars and status chips in real time:

```json
{
   "event": "server_usage",
   "run_id": "<uuid>",
   "server_id": "GBFS:SERVER_A",
   "algorithm": "GBFS",
   "placement": "EDGE",
   "status": "BUSY",
   "tasks_in_flight": 6,
   "queue_depth": 2,
   "running_tasks": 3,
   "finished_tasks": 4,
   "failed_tasks": 1,
   "cpu_utilization_percent": 42.86,
   "memory_utilization_percent": 66.67
}
```

The live server IDs are exactly:

- `GBFS:SERVER_A`
- `GBFS:SERVER_B`
- `PSO:SERVER_A`
- `PSO:SERVER_B`

An experimental research and simulation platform designed to evaluate and optimize task offloading decisions in Industrial Internet of Things (IIoT) smart manufacturing environments. The system evaluates task distribution between localized **Edge Servers** and centralized **Cloud Servers** using two core algorithms: **Greedy Best-First Search (GBFS)** and **Particle Swarm Optimization (PSO)**.

---

## 1. System Purpose and Function

In smart factories, industrial machinery (such as CNC plasma cutters, arc welders, paint booths, and shearing machines) generates workloads with differing resource demands—such as latency sensitivity, computational intensity, and energy constraints.

This platform solves the task offloading problem by:
- Modeling physics-based execution metrics (transmission delay, propagation latency, queuing delay, processor speed, and power consumption).
- Simulating dynamic task batches generated from industrial machine profiles and workload tiers.
- Comparing sequential greedy decisions (**GBFS**) against combinatorial multi-particle global optimization (**Binary PSO**).
- Providing multi-tiered visual evaluation through a **React Web Dashboard**, a **Tkinter Desktop GUI Simulator**, and **Multi-Node REST Backends** backed by Supabase / PostgreSQL.

---

## 2. System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Industrial IoT Machinery    │
                                  │ (Plasma, Welding, Paint, etc) │
                                  └──────────────┬────────────────┘
                                                 │
                                                 ▼
                        ┌──────────────────────────────────────────────────┐
                        │            Simulation & Decision Engine          │
                        │  - Task Batch Generator (Workload Tiers)         │
                        │  - GBFS Heuristic Evaluator                      │
                        │  - Binary PSO Swarm Optimizer                    │
                        └──────────────┬───────────────────┬───────────────┘
                                       │                   │
                     ┌─────────────────┴──┐             ┌──┴─────────────────┐
                     ▼                    ▼             ▼                    ▼
             ┌──────────────┐     ┌──────────────┐┌──────────────┐    ┌──────────────┐
             │Edge Server A │     │Cloud Server B││React Web UI  │    │Tkinter GUI   │
             │(Low Latency) │     │(High Compute)││(Recharts)    │    │(Matplotlib)  │
             └───────┬──────┘     └──────┬───────┘└──────────────┘    └──────────────┘
                     │                   │
                     └─────────┬─────────┘
                               ▼
                   ┌────────────────────────┐
                   │  Supabase / PostgreSQL │
                   │ (machines, logs)       │
                   └────────────────────────┘
```

The system is implemented across three core components:

1. **Web Dashboard (`frontend/`)**: React 19 + Vite single-page application featuring a multi-step offloading wizard, interactive timeline, live Recharts visual analytics (Gantt timeline, radar charts, win tally, bubble charts, efficiency donuts), and history tracking.
2. **Distributed Backends (`Backend/` and root `app.py`)**:
   - **Root `app.py`**: Direct PostgreSQL connection via `psycopg2`, managing schema setup, machine seeding, and offloading logs.
   - **`Backend/app.py` (Server A)**: Represents **Edge Server A** (latency-sensitive, compute-heavy edge node), deployed with Supabase REST API integration.
   - **`Backend/server_b/app.py` (Server B)**: Represents **Cloud Server B** (energy-efficient, cloud-hosted node), applying energy-optimized coefficients.
   - **`Backend/server.js`**: Node.js / Express alternative API connecting via `@supabase/supabase-js`.
3. **Desktop Simulator (`iot_task_offloading/`)**: Standalone Python Tkinter desktop application featuring physical cutting parameter matrices, live embedded Matplotlib graphs, server simulator tiers, and execution logging.

---

## 3. Core Algorithms & Offloading Logic

### Physics & Performance Formulation
Offloading candidates are evaluated using real system constraints:
- **Edge Server A**: Processing speed $P_{Edge} = 20\text{ MB/s}$, Network latency $N_{Edge} = 0.05\text{ s}$ ($50\text{ ms}$), Capacity $C_{Edge} = 500\text{ MB}$, Energy coefficient $= 0.08$.
- **Cloud Server B**: Processing speed $P_{Cloud} = 50\text{ MB/s}$, Network latency $N_{Cloud} = 0.12\text{ s}$ ($120\text{ ms}$), Capacity $C_{Cloud} = 2000\text{ MB}$, Energy coefficient $= 0.03$.
- **Bandwidth**: Shared transmission bandwidth $= 100\text{ MB/s}$.
- **Theoretical Decision Boundary**: Derived from:
  $$\frac{S}{20} + \frac{S}{100} + 0.05 = \frac{S}{50} + \frac{S}{100} + 0.12 \implies S = 2.33\text{ MB}$$
- **Total Latency Formulation**:
  $$T_{total} = T_{proc} + T_{trans} + T_{net} + T_{queue}$$
  where:
  $$T_{proc} = \frac{\text{TaskSize}}{\text{Speed}} \times 1000\text{ ms}$$
  $$T_{trans} = \frac{\text{TaskSize}}{\text{Bandwidth}} \times 1000\text{ ms}$$
  $$T_{net} = \text{NetworkLatency} \times 1000\text{ ms}$$
  $$T_{queue} = \text{QueueLength} \times 2 + \text{Utilization} \times 0.05$$

### Greedy Best-First Search (GBFS)
- Sequentially steps through tasks in a batch.
- For each task, evaluates Edge vs. Cloud placement based on the server's **running cumulative load** and capacity bounds.
- Selects the feasible server that minimizes latency at each individual step.

### Binary Particle Swarm Optimization (PSO)
- Evaluates the task batch globally across a discrete search space of $2^N$ allocation vectors.
- Each particle's position represents a binary assignment vector ($0 = \text{Edge}$, $1 = \text{Cloud}$).
- Updates particle velocity and position using cognitive ($c_1 = 1.5$) and social ($c_2 = 1.5$) acceleration constants with inertia weight ($w = 0.7$) and maximum velocity clamping ($v_{max} = 0.5$).
- Uses a sigmoid transfer function to sample binary positions and a seeded pseudo-random number generator (`SeededRandom`) for reproducible convergence.
- Fitness is calculated to minimize average batch latency normalized against edge/cloud extremes.

---

## 4. Machine Data & Workload Profiles

Default machine profiles seeded in the database:

| ID | Machine Code | Machine Name | Category | Default Task Type | Base Task Size | Base Latency |
|---|---|---|---|---|---|---|
| `M1` | `CPCM1` | CNC Plasma | Cutting Machines | Computation-Intensive | 50 MB | 88 ms |
| `M2` | `PCM1` | Plasma Cutting | Cutting Machines | Computation-Intensive | 40 MB | 78 ms |
| `M3` | `PB2` | Paint Booth | Finishing Machines | Energy-Efficient | 20 MB | 72 ms |
| `M4` | `WM1` | Arc Welding | Welding Machines | Computation-Intensive | 30 MB | 92 ms |
| `M5` | `SM3` | Shearing Machine | Cutting Machines | Latency-Sensitive | 25 MB | 85 ms |

### Dynamic Workload Tiers
Each machine supports predefined workload tiers:
- **Low**: Reduced task sizes and queue lengths, testing performance under light workloads.
- **Medium / Mid**: Balanced baseline industrial operational state.
- **High**: Stress condition with high CPU utilization ($90\%$) and longer queues.
- **Task Batching**: Synthesizes an 8-task batch per simulation run using fixed multiplier spreads ($0.55\times$ to $1.4\times$) to test allocation divergence.

---

## 5. API Reference

All backend variants implement the following REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root status and route index |
| `GET` | `/health` | Server health check and Supabase connectivity status |
| `GET` | `/api/health` | Node identification check (reports Server A or Server B) |
| `GET` | `/api/setup` | Initializes PostgreSQL schema and seeds default machines |
| `GET` | `/api/machines` | Returns dictionary of all registered IoT machines |
| `GET` | `/api/machines/<id>/task-data` | Fetches operational metrics for a specific machine ID |
| `POST` | `/api/gbfs` | Calculates estimated latency and metrics using GBFS |
| `POST` | `/api/pso` | Calculates estimated latency and metrics using PSO |
| `POST` | `/api/offload` | Commits an offload decision and logs execution to database |
| `GET` | `/api/logs` | Retrieves the latest 50 offload execution records |

---

## 6. Project Directory Structure

```
.
├── app.py                         # Root Flask backend (psycopg2 direct PostgreSQL connection)
├── requirements.txt               # Dependencies for root Flask app
├── README.md                      # System documentation
├── Backend/
│   ├── app.py                     # Flask backend - Server A (Edge Node, Supabase REST)
│   ├── requirements.txt           # Python dependencies for Backend Server A
│   ├── server.js                  # Node.js / Express backend alternative
│   ├── supabase_client.py         # Supabase client initializer for Server A
│   ├── algorithms/
│   │   ├── gbfs.js                # Standalone JavaScript GBFS score calculation
│   │   └── pso.js                 # Standalone JavaScript PSO score calculation
│   └── server_b/
│       ├── app.py                 # Flask backend - Server B (Cloud Node, energy-optimized)
│       ├── requirements.txt       # Python dependencies for Backend Server B
│       └── supabase_client.py     # Supabase client initializer for Server B
├── frontend/
│   ├── package.json               # Node dependencies (React 19, Vite, Recharts)
│   ├── vite.config.js             # Vite configuration
│   ├── index.html                 # HTML shell
│   ├── src/
│   │   ├── main.jsx               # React entry point
│   │   ├── App.jsx                # Main web application (wizards, charts, simulation)
│   │   ├── App.css / index.css    # Styling
│   │   └── algorithms/
│   │       ├── gbfs.js            # Frontend utility GBFS score function
│   │       └── pso.js             # Frontend utility PSO score function
│   └── public/images/             # Machine illustration assets
└── iot_task_offloading/
    ├── main.py                    # Tkinter desktop application entry point
    ├── logs/
    │   └── simulation.log         # Local execution text log
    ├── algorithms/
    │   ├── gbfs.py                # Python GBFS heuristic scoring logic
    │   └── pso.py                 # Python PSO scoring logic with random convergence
    ├── simulation/
    │   └── server_simulator.py    # Edge/Fog/Cloud tier simulator
    ├── monitoring/
    │   └── performance_graphs.py  # Embedded Matplotlib multi-axis and pie charts
    └── ui/
        └── dashboard.py           # Tkinter dashboard layout, canvas, controls, and tables
```

---

## 7. Setup & Execution Instructions

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+ and npm
- **PostgreSQL / Supabase**: An active Supabase project (for database logging)

---

### Environment Variables
For backends connecting to Supabase, configure:
```bash
export SUPABASE_URL="https://<your-project-id>.supabase.co"
export SUPABASE_KEY="<your-anon-or-service-role-key>"
```

For the root direct PostgreSQL backend (`app.py`):
```bash
export DB_HOST="db.<your-project-id>.supabase.co"
export DB_NAME="postgres"
export DB_USER="postgres"
export DB_PASSWORD="<your-database-password>"
export DB_PORT="5432"
```

---

### Option A: Running with Docker Compose (Recommended)

Run both the Backend (Edge Server A + Cloud Server B) and Frontend (React + Nginx) with a single command:

```bash
# Optional: create .env if configuring Supabase credentials
cp .env.example .env

# Build and start containers
docker compose up --build
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Edge Server A API**: `http://localhost:5000`
- **Cloud Server B API**: `http://localhost:5001`

To stop the services:
```bash
docker compose down
```

---

### Option B: Running the React Web Application (Manual Local Setup)

1. **Start the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open the printed URL (typically `http://localhost:5173`) in your browser.

2. **Start Backend Server A (Local Edge Server)**:
   ```bash
   cd Backend
   pip install -r requirements.txt
   python app.py
   ```
   Runs on `http://localhost:5000` (or configured port).

3. **Start Backend Server B (Local Cloud Server)**:
   ```bash
   cd Backend/server_b
   pip install -r requirements.txt
   python app.py
   ```

4. **Initialize Database Schema & Seeds**:
   Send a GET request to the setup endpoint:
   ```bash
   curl http://localhost:5000/api/setup
   ```

---

### Option C: Running the Standalone Tkinter Desktop Simulator

The desktop simulation runs locally without requiring a browser:

```bash
cd iot_task_offloading
pip install matplotlib
python main.py
```

Inside the application:
1. Select the material type, thickness, and cutting current.
2. Click **Generate & Offload Task** to run the physics matrix, execute GBFS and PSO evaluations, compare winning metrics, view live line and pie graphs, and log results.