from simulation_backend.algorithms import compute_binary_pso, compute_gbfs
from simulation_backend.domain import (
    CLOUD_PROFILE,
    EDGE_PROFILE,
    ServerId,
    Task,
    TaskStatus,
)
from simulation_backend.engine import DiscreteEventSimulator

PROFILES = {ServerId.EDGE: EDGE_PROFILE, ServerId.CLOUD: CLOUD_PROFILE}


def make_task(task_id: str, **overrides: float) -> Task:
    values = {
        "payload_size_mb": 10.0,
        "processing_duration_sec": 1.0,
        "cpu_demand_percent": 50.0,
        "ram_demand_mb": 100.0,
        "max_tolerable_latency_sec": 30.0,
    }
    values.update(overrides)
    return Task(task_id=task_id, **values)


def test_simulator_shares_bandwidth_between_concurrent_transfers() -> None:
    tasks = [make_task("first"), make_task("second")]
    result = DiscreteEventSimulator(PROFILES, tick_sec=0.01).simulate(
        tasks, [ServerId.EDGE, ServerId.EDGE]
    )

    assert [task.status for task in result.tasks] == [TaskStatus.FINISHED, TaskStatus.FINISHED]
    assert [task.transmission_time_sec for task in result.tasks] == [0.25, 0.25]
    assert [task.queue_wait_time_sec for task in result.tasks] == [0.0, 0.0]


def test_simulator_emits_live_lifecycle_and_resource_telemetry() -> None:
    events = []
    task = make_task("telemetry", payload_size_mb=10, processing_duration_sec=0.03)

    DiscreteEventSimulator(PROFILES, tick_sec=0.01).simulate(
        [task], [ServerId.EDGE], on_event=events.append
    )

    statuses = [event["task"]["status"] for event in events]
    assert statuses == ["TRANSFERRING", "RUNNING", "FINISHED"]
    assert all("usage" in event for event in events)
    assert all("cpu_utilization_percent" in event["usage"] for event in events)
    assert all("memory_utilization_percent" in event["usage"] for event in events)
    assert all("storage_utilization_percent" in event["usage"] for event in events)
    assert events[1]["usage"]["running_tasks"] == 1
    assert events[1]["usage"]["cpu_utilization_percent"] == 25.0


def test_simulator_only_emits_queue_when_cpu_is_unavailable() -> None:
    tasks = [
        make_task(f"queued-{index}", cpu_demand_percent=100, processing_duration_sec=0.03)
        for index in range(3)
    ]
    events = []

    DiscreteEventSimulator(PROFILES, tick_sec=0.01).simulate(
        tasks, [ServerId.EDGE, ServerId.EDGE, ServerId.EDGE], on_event=events.append
    )

    statuses_by_task = {}
    for event in events:
        statuses_by_task.setdefault(event["task"]["task_id"], []).append(event["task"]["status"])

    assert statuses_by_task["queued-0"] == ["TRANSFERRING", "RUNNING", "FINISHED"]
    assert statuses_by_task["queued-1"] == ["TRANSFERRING", "RUNNING", "FINISHED"]
    assert statuses_by_task["queued-2"] == ["TRANSFERRING", "IN_QUEUE", "RUNNING", "FINISHED"]


def test_server_network_latency_and_processing_multiplier_are_accounted_for() -> None:
    task = make_task("timing", payload_size_mb=10, processing_duration_sec=2.5)
    result = DiscreteEventSimulator(PROFILES, tick_sec=0.01).simulate(
        [task], [ServerId.CLOUD]
    ).tasks[0]

    assert result.transmission_time_sec == 0.22
    assert result.execution_time_sec == 1.0
    assert result.total_latency_sec == 1.22


def test_simulator_fails_task_that_cannot_fit_server_ram() -> None:
    task = make_task("oversized", ram_demand_mb=501)
    result = DiscreteEventSimulator(PROFILES).simulate([task], [ServerId.EDGE])

    assert result.tasks[0].status == TaskStatus.FAILED
    assert result.tasks[0].error_message == "RAM demand exceeds server capacity"


def test_gbfs_prefers_edge_for_each_network_first_task() -> None:
    tasks = [make_task("first"), make_task("second")]
    result = compute_gbfs(tasks, PROFILES)

    assert result.allocation == (ServerId.EDGE, ServerId.EDGE)


def test_pso_is_reproducible_and_can_move_work_to_cloud() -> None:
    tasks = [
        make_task(f"task-{index}", processing_duration_sec=10, ram_demand_mb=100)
        for index in range(6)
    ]
    first = compute_binary_pso(tasks, PROFILES, seed=17, particles=10, iterations=20)
    second = compute_binary_pso(tasks, PROFILES, seed=17, particles=10, iterations=20)

    assert first.allocation == second.allocation
    assert ServerId.CLOUD in first.allocation
    assert first.simulation.failed_count <= 1


def test_pso_telemetry_exposes_full_global_allocation() -> None:
    tasks = [make_task(f"allocation-{index}") for index in range(3)]
    result = compute_binary_pso(tasks, PROFILES, seed=17, particles=4, iterations=3)
    final = result.telemetry[-1]

    assert len(final["global_allocation"]) == len(tasks)
    assert final["edge_task_count"] + final["cloud_task_count"] == len(tasks)
    assert set(final["global_allocation"]) <= {"SERVER_A", "SERVER_B"}
