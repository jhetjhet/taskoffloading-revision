from simulation_backend.api import _build_server_usage_snapshot


def test_server_usage_snapshot_reports_real_time_load() -> None:
    snapshot = _build_server_usage_snapshot(
        "GBFS:SERVER_A",
        "GBFS",
        {
            "TRANSFERRING": 2,
            "IN_QUEUE": 1,
            "RUNNING": 3,
            "FINISHED": 4,
            "FAILED": 1,
        },
    )

    assert snapshot["server_id"] == "GBFS:SERVER_A"
    assert snapshot["algorithm"] == "GBFS"
    assert snapshot["status"] == "BUSY"
    assert snapshot["tasks_in_flight"] == 6
    assert snapshot["finished_tasks"] == 4
    assert snapshot["failed_tasks"] == 1
    assert snapshot["cpu_utilization_percent"] == 0.0
    assert snapshot["memory_utilization_percent"] == 0.0
