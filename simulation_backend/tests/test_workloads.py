import pytest

from simulation_backend.domain import Task
from simulation_backend.workloads import generate_workload


@pytest.fixture
def templates() -> list[Task]:
    return [
        Task(f"{machine}-{level}", 1, 1, 10, 1, 10, task_name=f"{machine} {level}")
        for machine in ("A", "B", "C", "D", "E")
        for level in ("low", "mid", "high")
    ]


def test_generate_workload_keeps_template_set(templates: list[Task]) -> None:
    assert generate_workload(templates) == templates
    assert generate_workload(templates, workload="low") == templates
    assert generate_workload(templates, workload="mid") == templates
    assert generate_workload(templates, workload="high") == templates


def test_generate_workload_supports_repetition(templates: list[Task]) -> None:
    repeated = generate_workload(templates, multiplier=2)
    assert repeated == templates * 2


def test_generate_workload_supports_selected_ids(templates: list[Task]) -> None:
    subset = generate_workload(templates, selected_ids=["A-low", "B-mid"])
    assert subset == [templates[0], templates[4]]
