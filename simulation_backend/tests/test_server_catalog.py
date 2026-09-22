import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from simulation_backend.api import RunRequest, app

client = TestClient(app)


def test_servers_list_has_four_algorithm_specific_nodes() -> None:
    response = client.get("/api/v1/servers")
    assert response.status_code == 200
    payload = response.json()
    assert [item["server_id"] for item in payload] == [
        "GBFS:SERVER_A",
        "GBFS:SERVER_B",
        "PSO:SERVER_A",
        "PSO:SERVER_B",
    ]


def test_ping_server_uses_algorithm_specific_id() -> None:
    response = client.get("/api/v1/servers/ping/GBFS:SERVER_A")
    assert response.status_code == 200
    assert response.json()["server_id"] == "GBFS:SERVER_A"
    assert response.json()["status"] == "reachable"


def test_run_request_accepts_custom_computation_properties() -> None:
    request = RunRequest(
        tasks=[
            {
                "task_id": "custom-1",
                "payload_size_mb": 42.5,
                "processing_duration_sec": 3.75,
                "cpu_demand_percent": 200,
                "ram_demand_mb": 256,
                "max_tolerable_latency_sec": 12,
                "source_machine_id": "machine-a",
                "task_name": "Custom task",
            }
        ]
    )

    task = request.tasks[0]
    assert task.payload_size_mb == 42.5
    assert task.processing_duration_sec == 3.75
    assert task.cpu_demand_percent == 200
    assert task.ram_demand_mb == 256
    assert task.max_tolerable_latency_sec == 12


@pytest.mark.parametrize(
    "field, value",
    [
        ("payload_size_mb", 0),
        ("processing_duration_sec", 0),
        ("cpu_demand_percent", 0),
        ("cpu_demand_percent", -1),
        ("ram_demand_mb", 0),
        ("max_tolerable_latency_sec", 0),
    ],
)
def test_run_request_rejects_invalid_custom_computation_property(field: str, value: float) -> None:
    task = {
        "task_id": "custom-invalid",
        "payload_size_mb": 10,
        "processing_duration_sec": 1,
        "cpu_demand_percent": 50,
        "ram_demand_mb": 100,
        "max_tolerable_latency_sec": 10,
    }
    task[field] = value

    with pytest.raises(ValidationError):
        RunRequest(tasks=[task])
