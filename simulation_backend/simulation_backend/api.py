from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager, suppress
from dataclasses import asdict
from uuid import uuid4

import asyncpg
import redis.asyncio as redis
import socketio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .algorithms import compute_binary_pso, compute_gbfs
from .analytics import generate_analytics_report
from .database import connect
from .domain import CLOUD_PROFILE, EDGE_PROFILE, ServerId, Task, WorkerServerId

PROFILES = {ServerId.EDGE: EDGE_PROFILE, ServerId.CLOUD: CLOUD_PROFILE}
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.db = await connect()
    application.state.redis = redis.from_url(
        os.environ.get("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True
    )
    application.state.worker_events: dict[str, set[tuple[str, str]]] = {}
    application.state.worker_expected: dict[str, int] = {}
    application.state.worker_waiters: dict[str, asyncio.Event] = {}
    application.state.event_history: dict[str, list[dict[str, object]]] = {}
    application.state.server_usage_state: dict[str, dict[str, dict[str, int]]] = {}
    application.state.server_usage_seen: dict[str, dict[tuple[str, str, str], str]] = {}
    application.state.event_bridge = asyncio.create_task(_bridge_worker_events(application))
    yield
    application.state.event_bridge.cancel()
    with suppress(asyncio.CancelledError):
        await application.state.event_bridge
    await application.state.redis.aclose()
    await application.state.db.close()


app = FastAPI(title="Task Offloading Simulation API", version="1.0.0", lifespan=lifespan)
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)


class TaskInput(BaseModel):
    task_id: str
    payload_size_mb: float = Field(gt=0)
    processing_duration_sec: float = Field(gt=0)
    cpu_demand_percent: float = Field(gt=0, le=100)
    ram_demand_mb: float = Field(gt=0)
    max_tolerable_latency_sec: float = Field(gt=0)
    source_machine_id: str = ""
    task_name: str = ""

    def to_domain(self) -> Task:
        return Task(**self.model_dump())


class RunRequest(BaseModel):
    tasks: list[TaskInput] | None = None
    seed: int = 12345


def _record_to_task(record: asyncpg.Record) -> Task:
    return Task(
        task_id=record["id"],
        source_machine_id=record["source_machine_id"],
        task_name=record["task_name"],
        payload_size_mb=record["payload_size_mb"],
        processing_duration_sec=record["processing_duration_sec"],
        cpu_demand_percent=record["cpu_demand_percent"],
        ram_demand_mb=record["ram_demand_mb"],
        max_tolerable_latency_sec=record["max_tolerable_latency_sec"],
    )


async def _resolve_tasks(request: RunRequest) -> list[Task]:
    if not request.tasks:
        rows = await app.state.db.fetch(
            """
            SELECT id, source_machine_id, task_name, payload_size_mb, processing_duration_sec,
                   cpu_demand_percent, ram_demand_mb, max_tolerable_latency_sec
            FROM task_templates ORDER BY source_machine_id, id
            """
        )
        if not rows:
            raise HTTPException(status_code=409, detail="no task templates found; run the seed service")
        return [_record_to_task(row) for row in rows]

    if len(request.tasks) > 15:
        raise HTTPException(status_code=422, detail="a run accepts at most 15 tasks")
    return [task.to_domain() for task in request.tasks]


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    await app.state.db.fetchval("SELECT 1")
    await app.state.redis.ping()
    return {"status": "ok", "service": "simulation-api"}


@app.get("/api/v1/servers")
async def servers() -> list[dict[str, object]]:
    workers = (
        {
            "server_id": WorkerServerId.GBFS_EDGE.value,
            "algorithm": "GBFS",
            "placement": "EDGE",
            "name": "GBFS Edge",
            "network_latency_ms": EDGE_PROFILE.network_latency_ms,
            "processing_speed": EDGE_PROFILE.processing_speed,
            "storage_mb": EDGE_PROFILE.storage_mb,
            "max_ram_mb": EDGE_PROFILE.max_ram_mb,
            "cpu_cores": EDGE_PROFILE.cpu_cores,
            "bandwidth_mb_s": EDGE_PROFILE.bandwidth_mb_s,
        },
        {
            "server_id": WorkerServerId.GBFS_CLOUD.value,
            "algorithm": "GBFS",
            "placement": "CLOUD",
            "name": "GBFS Cloud",
            "network_latency_ms": CLOUD_PROFILE.network_latency_ms,
            "processing_speed": CLOUD_PROFILE.processing_speed,
            "storage_mb": CLOUD_PROFILE.storage_mb,
            "max_ram_mb": CLOUD_PROFILE.max_ram_mb,
            "cpu_cores": CLOUD_PROFILE.cpu_cores,
            "bandwidth_mb_s": CLOUD_PROFILE.bandwidth_mb_s,
        },
        {
            "server_id": WorkerServerId.PSO_EDGE.value,
            "algorithm": "PSO",
            "placement": "EDGE",
            "name": "PSO Edge",
            "network_latency_ms": EDGE_PROFILE.network_latency_ms,
            "processing_speed": EDGE_PROFILE.processing_speed,
            "storage_mb": EDGE_PROFILE.storage_mb,
            "max_ram_mb": EDGE_PROFILE.max_ram_mb,
            "cpu_cores": EDGE_PROFILE.cpu_cores,
            "bandwidth_mb_s": EDGE_PROFILE.bandwidth_mb_s,
        },
        {
            "server_id": WorkerServerId.PSO_CLOUD.value,
            "algorithm": "PSO",
            "placement": "CLOUD",
            "name": "PSO Cloud",
            "network_latency_ms": CLOUD_PROFILE.network_latency_ms,
            "processing_speed": CLOUD_PROFILE.processing_speed,
            "storage_mb": CLOUD_PROFILE.storage_mb,
            "max_ram_mb": CLOUD_PROFILE.max_ram_mb,
            "cpu_cores": CLOUD_PROFILE.cpu_cores,
            "bandwidth_mb_s": CLOUD_PROFILE.bandwidth_mb_s,
        },
    )
    return list(workers)


@app.get("/api/v1/servers/ping/{server_id}")
async def ping_server(server_id: str) -> dict[str, object]:
    valid = {member.value for member in WorkerServerId}
    if server_id not in valid:
        raise HTTPException(status_code=404, detail=f"unknown server_id: {server_id}")

    if server_id in {WorkerServerId.GBFS_EDGE.value, WorkerServerId.PSO_EDGE.value}:
        latency_ms = EDGE_PROFILE.network_latency_ms
    else:
        latency_ms = CLOUD_PROFILE.network_latency_ms

    return {
        "server_id": server_id,
        "status": "reachable",
        "latency_ms": latency_ms,
        "network_latency_ms": latency_ms,
    }


@app.get("/api/v1/machines")
async def machines() -> list[dict[str, str | None]]:
    rows = await app.state.db.fetch("SELECT id, name, image FROM machines ORDER BY id")
    return [dict(row) for row in rows]


@app.get("/api/v1/task-templates")
async def task_templates() -> list[dict]:
    rows = await app.state.db.fetch("SELECT * FROM task_templates ORDER BY source_machine_id, id")
    return [{**dict(row), "attributes": _json_value(row["attributes"])} for row in rows]


@app.get("/api/v1/workloads/{machine_id}")
async def workload_preview(machine_id: str) -> dict:
    rows = await app.state.db.fetch(
        """
        SELECT id, source_machine_id, task_name, payload_size_mb, processing_duration_sec,
               cpu_demand_percent, ram_demand_mb, max_tolerable_latency_sec
        FROM task_templates
        WHERE source_machine_id = $1
        ORDER BY id
        """,
        machine_id,
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"no task templates found for machine_id={machine_id}")
    tasks = [_record_to_task(row) for row in rows]
    return {"machine_id": machine_id, "task_count": len(tasks), "tasks": [asdict(task) for task in tasks]}


@app.post("/api/v1/runs", status_code=202)
async def create_run(request: RunRequest) -> dict[str, str]:
    tasks = await _resolve_tasks(request)
    run_id = str(uuid4())
    app.state.event_history[run_id] = []
    input_data = {"tasks": [asdict(task) for task in tasks]}
    await app.state.db.execute(
        "INSERT INTO simulation_runs (id, status, seed, input) VALUES ($1, 'QUEUED', $2, $3::jsonb)",
        run_id,
        request.seed,
        json.dumps(input_data),
    )
    asyncio.create_task(_execute_run(run_id, tasks, request.seed))
    return {"run_id": run_id, "status": "QUEUED"}


@app.get("/api/v1/runs/{run_id}")
async def get_run(run_id: str) -> dict:
    run = await app.state.db.fetchrow("SELECT * FROM simulation_runs WHERE id = $1", run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    results = await app.state.db.fetch(
        "SELECT algorithm, allocation, iterations_performed, failed_count, result "
        "FROM algorithm_results WHERE run_id = $1 ORDER BY algorithm",
        run_id,
    )
    input_data = _json_value(run["input"])
    analytics = input_data.get("analytics") if isinstance(input_data, dict) else None
    return {
        **dict(run),
        "input": input_data,
        "analytics": analytics,
        "algorithms": [
            {
                **dict(result),
                "allocation": _json_value(result["allocation"]),
                "result": _json_value(result["result"]),
            }
            for result in results
        ],
    }


@app.get("/api/v1/runs/{run_id}/analytics")
async def get_run_analytics(run_id: str) -> dict:
    """Dedicated endpoint providing the complete 6-section dashboard metrics report."""
    run = await app.state.db.fetchrow("SELECT id, status, input FROM simulation_runs WHERE id = $1", run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    
    input_data = _json_value(run["input"])
    if isinstance(input_data, dict) and "analytics" in input_data:
        return {"run_id": run_id, "status": run["status"], "analytics": input_data["analytics"]}
    
    # Fallback compute if completed run doesn't have it yet
    tasks_input = input_data.get("tasks", []) if isinstance(input_data, dict) else []
    if not tasks_input:
        raise HTTPException(status_code=400, detail="no tasks found for this run")
    
    tasks = [Task(**t) for t in tasks_input]
    gbfs = await asyncio.to_thread(compute_gbfs, tasks, PROFILES)
    pso = await asyncio.to_thread(compute_binary_pso, tasks, PROFILES)
    
    actual_rows = await app.state.db.fetch(
        "SELECT algorithm, task_id, status, total_latency_sec, execution_time_sec FROM task_execution_results WHERE run_id = $1",
        run_id,
    )
    report_data = generate_analytics_report(tasks, gbfs, pso, [dict(r) for r in actual_rows])
    return {"run_id": run_id, "status": run["status"], "analytics": report_data}


@app.get("/api/v1/runs")
async def history(limit: int = 50) -> list[dict]:
    rows = await app.state.db.fetch(
        "SELECT id, status, seed, created_at, completed_at FROM simulation_runs "
        "ORDER BY created_at DESC LIMIT $1",
        min(max(limit, 1), 100),
    )
    return [dict(row) for row in rows]


@sio.event
async def join_run(sid: str, data: dict[str, str]) -> None:
    if run_id := data.get("run_id"):
        await sio.enter_room(sid, run_id)
        for event in app.state.event_history.get(run_id, []):
            await sio.emit(event["name"], event["payload"], to=sid)


async def _emit_run_event(run_id: str, name: str, payload: dict[str, object]) -> None:
    app.state.event_history.setdefault(run_id, []).append({"name": name, "payload": payload})
    await sio.emit(name, payload, room=run_id)


async def _execute_run(run_id: str, tasks: list[Task], seed: int) -> None:
    await app.state.db.execute("UPDATE simulation_runs SET status = 'RUNNING' WHERE id = $1", run_id)
    await _emit_run_event(run_id, "run", {"run_id": run_id, "status": "RUNNING"})
    try:
        forecast_tick_sec = max(
            0.01, float(os.environ.get("SIMULATION_FORECAST_TICK_SEC", "0.1"))
        )
        gbfs, pso = await asyncio.gather(
            asyncio.to_thread(compute_gbfs, tasks, PROFILES, forecast_tick_sec),
            asyncio.to_thread(
                compute_binary_pso,
                tasks,
                PROFILES,
                seed=seed,
                tick_sec=forecast_tick_sec,
            ),
        )
        app.state.worker_events[run_id] = set()
        app.state.worker_expected[run_id] = len(tasks) * 2
        app.state.worker_waiters[run_id] = asyncio.Event()
        app.state.server_usage_state[run_id] = {}
        app.state.server_usage_seen[run_id] = {}
        for algorithm, result in (("GBFS", gbfs), ("PSO", pso)):
            serialized = _serialize_result(result)
            await _persist_result(run_id, algorithm, serialized)
            await _dispatch_workers(run_id, algorithm, tasks, result.allocation)
            for server in ServerId:
                await _emit_server_usage_snapshot(run_id, algorithm, server.value, {"TRANSFERRING": 0, "IN_QUEUE": 0, "RUNNING": 0, "FINISHED": 0, "FAILED": 0})
            await _emit_run_event(run_id, "algorithm", {"run_id": run_id, "algorithm": algorithm, **serialized})

        # Stream the decision-making traces in real-time so UI visualizes thinking phase
        trace_delay = max(0.05, float(os.environ.get("SIMULATION_DECISION_STEP_DELAY_SEC", "0.15")))

        async def _stream_gbfs_trace():
            for step in getattr(gbfs, "telemetry", []):
                await _emit_run_event(run_id, "gbfs_decision_step", {"run_id": run_id, "algorithm": "GBFS", **step})
                await asyncio.sleep(trace_delay)

        async def _stream_pso_trace():
            for iter_snap in getattr(pso, "telemetry", []):
                await _emit_run_event(run_id, "pso_decision_step", {"run_id": run_id, "algorithm": "PSO", **iter_snap})
                await asyncio.sleep(trace_delay * 0.5)

        await asyncio.gather(_stream_gbfs_trace(), _stream_pso_trace())
        run_timeout_sec = max(
            30.0, float(os.environ.get("SIMULATION_RUN_TIMEOUT_SEC", "3600"))
        )
        await asyncio.wait_for(
            app.state.worker_waiters[run_id].wait(), timeout=run_timeout_sec
        )

        # Retrieve actual task execution records from DB for validation
        actual_rows = await app.state.db.fetch(
            "SELECT algorithm, task_id, status, total_latency_sec, execution_time_sec FROM task_execution_results WHERE run_id = $1",
            run_id,
        )
        actual_task_dicts = [dict(r) for r in actual_rows]

        # Generate comprehensive 6-section dashboard analytics report
        report_data = generate_analytics_report(tasks, gbfs, pso, actual_task_dicts)

        # Store analytics JSON in simulation_runs input/summary or output
        await app.state.db.execute(
            """
            UPDATE simulation_runs 
            SET status = 'COMPLETED', completed_at = now(), input = jsonb_set(input, '{analytics}', $2::jsonb, true)
            WHERE id = $1
            """,
            run_id,
            json.dumps(report_data),
        )
        await _emit_run_event(run_id, "run_complete", {"run_id": run_id, "status": "COMPLETED", "analytics": report_data})
    except Exception as error:
        await app.state.db.execute("UPDATE simulation_runs SET status = 'FAILED' WHERE id = $1", run_id)
        await _emit_run_event(run_id, "run_failed", {"run_id": run_id, "error": str(error)})
    finally:
        app.state.worker_events.pop(run_id, None)
        app.state.worker_expected.pop(run_id, None)
        app.state.worker_waiters.pop(run_id, None)
        app.state.server_usage_state.pop(run_id, None)
        app.state.server_usage_seen.pop(run_id, None)
        if len(app.state.event_history.get(run_id, [])) > 5000:
            app.state.event_history[run_id] = app.state.event_history[run_id][-5000:]


# Maps raw ServerId values to the semantic placement labels the frontend expects.
_PLACEMENT_LABEL: dict[str, str] = {
    ServerId.EDGE.value: "EDGE",
    ServerId.CLOUD.value: "CLOUD",
}


def _build_server_usage_snapshot(server_id: str, algorithm: str, counts: dict[str, int]) -> dict[str, object]:
    """Build the initial zero-state snapshot emitted before workers start.

    NOTE: Once the simulation is running the workers publish their own
    ``server_usage`` events (via the engine's on_event callback) which
    carry accurate cpu/memory/storage_utilization_percent values computed
    from actual task demands.  This function is only used for the initial
    snapshot where all counts are zero.
    """
    tasks_in_flight = counts.get("TRANSFERRING", 0) + counts.get("IN_QUEUE", 0) + counts.get("RUNNING", 0)
    status = "IDLE" if tasks_in_flight == 0 else "BUSY"
    if counts.get("FAILED", 0) and tasks_in_flight == 0:
        status = "DEGRADED"

    # "GBFS:SERVER_A" → raw_server = "SERVER_A" → placement = "EDGE"
    raw_server = server_id.rsplit(":", 1)[-1]
    placement = _PLACEMENT_LABEL.get(raw_server, raw_server)

    return {
        "server_id": server_id,
        "algorithm": algorithm,
        "placement": placement,
        "status": status,
        "tasks_in_flight": tasks_in_flight,
        "queue_depth": counts.get("IN_QUEUE", 0),
        "running_tasks": counts.get("RUNNING", 0),
        "finished_tasks": counts.get("FINISHED", 0),
        "failed_tasks": counts.get("FAILED", 0),
        "cpu_utilization_percent": 0.0,
        "memory_utilization_percent": 0.0,
        "storage_utilization_percent": 0.0,
    }


async def _emit_server_usage_snapshot(run_id: str, algorithm: str, server_id: str, counts: dict[str, int]) -> None:
    server_key = f"{algorithm}:{server_id}"
    payload = _build_server_usage_snapshot(server_key, algorithm, counts)
    await _emit_run_event(run_id, "server_usage", {"run_id": run_id, **payload})


async def _persist_result(run_id: str, algorithm: str, result: dict) -> None:
    async with app.state.db.acquire() as connection:
        async with connection.transaction():
            await connection.execute(
                """
                INSERT INTO algorithm_results (run_id, algorithm, allocation, iterations_performed, failed_count, result)
                VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb)
                """,
                run_id,
                algorithm,
                json.dumps(result["allocation"]),
                result["iterations_performed"],
                result["failed_count"],
                json.dumps(result),
            )
            for task in result["tasks"]:
                await connection.execute(
                    """
                    INSERT INTO task_execution_results VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """,
                    run_id,
                    algorithm,
                    task["task_id"],
                    task["assigned_server"],
                    task["status"],
                    task["transmission_time_sec"],
                    task["queue_wait_time_sec"],
                    task["execution_time_sec"],
                    task["total_latency_sec"],
                    task["cpu_usage_percent"],
                    task["memory_usage_mb"],
                    task["error_message"],
                )


async def _dispatch_workers(run_id: str, algorithm: str, tasks: list[Task], allocation: tuple) -> None:
    for server in ServerId:
        assigned = [asdict(task) for task, target in zip(tasks, allocation) if target == server]
        await app.state.redis.publish(
            f"simulation:commands:{algorithm}:{server.value}",
            json.dumps({"run_id": run_id, "algorithm": algorithm, "server": server.value, "tasks": assigned}),
        )


def _serialize_result(result: object) -> dict:
    return {
        "allocation": [server.value for server in result.allocation],
        "iterations_performed": result.iterations_performed,
        "failed_count": result.simulation.failed_count,
        "telemetry": getattr(result, "telemetry", []),
        "tasks": [
            {
                "task_id": task.task_id,
                "assigned_server": task.assigned_server.value,
                "status": task.status.value,
                "transmission_time_sec": task.transmission_time_sec,
                "queue_wait_time_sec": task.queue_wait_time_sec,
                "execution_time_sec": task.execution_time_sec,
                "total_latency_sec": task.total_latency_sec,
                "cpu_usage_percent": task.cpu_usage_percent,
                "memory_usage_mb": task.memory_usage_mb,
                "error_message": task.error_message,
            }
            for task in result.simulation.tasks
        ],
    }


def _json_value(value: object) -> object:
    return json.loads(value) if isinstance(value, str) else value


async def _bridge_worker_events(application: FastAPI) -> None:
    pubsub = application.state.redis.pubsub()
    await pubsub.subscribe("simulation:events")
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            payload = json.loads(message["data"])
            event = payload.pop("event")
            if event == "task":
                run_id = payload["run_id"]
                server_name = payload.get("server_id") or payload.get("server")
                algorithm = payload["algorithm"]
                state = application.state.server_usage_state.setdefault(run_id, {})
                counts = state.setdefault(server_name, {"TRANSFERRING": 0, "IN_QUEUE": 0, "RUNNING": 0, "FINISHED": 0, "FAILED": 0})
                seen = application.state.server_usage_seen.setdefault(run_id, {})
                task_key = (algorithm, server_name, payload["task_id"])
                previous = seen.get(task_key)
                if previous and previous in counts:
                    counts[previous] = max(0, counts[previous] - 1)
                status = payload["status"]
                if status in counts:
                    counts[status] += 1
                seen[task_key] = status
            event_payload = {"run_id": payload["run_id"], **payload}
            await _emit_run_event(payload["run_id"], event, event_payload)
            if event == "task" and payload["status"] in {"FINISHED", "FAILED"}:
                received = application.state.worker_events.get(payload["run_id"])
                expected = application.state.worker_expected.get(payload["run_id"])
                waiter = application.state.worker_waiters.get(payload["run_id"])
                if received is not None and expected is not None and waiter is not None:
                    received.add((payload["algorithm"], payload["task_id"]))
                    if len(received) >= expected:
                        waiter.set()
    finally:
        await pubsub.aclose()
