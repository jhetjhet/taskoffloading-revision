from fastapi.testclient import TestClient

from simulation_backend.api import app


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
