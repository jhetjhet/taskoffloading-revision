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
    assert [task.transmission_time_sec for task in result.tasks] == [0.2, 0.2]
    assert [task.queue_wait_time_sec for task in result.tasks] == [0.0, 0.0]


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
