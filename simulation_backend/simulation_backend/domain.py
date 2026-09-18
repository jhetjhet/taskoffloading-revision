from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ServerId(StrEnum):
    EDGE = "SERVER_A"
    CLOUD = "SERVER_B"


class WorkerServerId(StrEnum):
    GBFS_EDGE = "GBFS:SERVER_A"
    GBFS_CLOUD = "GBFS:SERVER_B"
    PSO_EDGE = "PSO:SERVER_A"
    PSO_CLOUD = "PSO:SERVER_B"


class TaskStatus(StrEnum):
    PENDING = "PENDING"
    TRANSFERRING = "TRANSFERRING"
    IN_QUEUE = "IN_QUEUE"
    RUNNING = "RUNNING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


@dataclass(frozen=True, slots=True)
class ServerProfile:
    server_id: ServerId
    network_latency_ms: float
    processing_speed: float
    storage_mb: float
    max_ram_mb: float
    cpu_cores: int
    bandwidth_mb_s: float

    @property
    def cpu_capacity_percent(self) -> float:
        return self.cpu_cores * 100.0


EDGE_PROFILE = ServerProfile(
    server_id=ServerId.EDGE,
    network_latency_ms=50.0,
    processing_speed=1.0,
    storage_mb=250.0,
    max_ram_mb=500.0,
    cpu_cores=2,
    bandwidth_mb_s=100.0,
)

CLOUD_PROFILE = ServerProfile(
    server_id=ServerId.CLOUD,
    network_latency_ms=120.0,
    processing_speed=2.5,
    storage_mb=1000.0,
    max_ram_mb=2000.0,
    cpu_cores=8,
    bandwidth_mb_s=100.0,
)


@dataclass(frozen=True, slots=True)
class Task:
    task_id: str
    payload_size_mb: float
    processing_duration_sec: float
    cpu_demand_percent: float
    ram_demand_mb: float
    max_tolerable_latency_sec: float
    source_machine_id: str = ""
    task_name: str = ""

    def __post_init__(self) -> None:
        if self.payload_size_mb <= 0 or self.processing_duration_sec <= 0:
            raise ValueError("task payload and processing duration must be positive")
        if not 0 < self.cpu_demand_percent <= 100:
            raise ValueError("task CPU demand must be in (0, 100]")
        if self.ram_demand_mb <= 0 or self.max_tolerable_latency_sec <= 0:
            raise ValueError("task RAM demand and SLA must be positive")


@dataclass(frozen=True, slots=True)
class TaskResult:
    task_id: str
    assigned_server: ServerId
    status: TaskStatus
    transmission_time_sec: float
    queue_wait_time_sec: float
    execution_time_sec: float
    total_latency_sec: float
    cpu_usage_percent: float
    memory_usage_mb: float
    error_message: str | None = None


@dataclass(frozen=True, slots=True)
class SimulationResult:
    tasks: tuple[TaskResult, ...]

    @property
    def failed_count(self) -> int:
        return sum(task.status == TaskStatus.FAILED for task in self.tasks)

    @property
    def sla_breach_count(self) -> int:
        return sum(task.error_message == "SLA deadline exceeded" for task in self.tasks)

    @property
    def completed_tasks(self) -> tuple[TaskResult, ...]:
        return tuple(task for task in self.tasks if task.status == TaskStatus.FINISHED)

    @property
    def total_completed_latency_sec(self) -> float:
        return sum(task.total_latency_sec for task in self.completed_tasks)

    @property
    def worst_completed_latency_sec(self) -> float:
        return max((task.total_latency_sec for task in self.completed_tasks), default=0.0)
