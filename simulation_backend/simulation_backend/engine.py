from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from math import inf
from typing import Mapping

from .domain import ServerId, ServerProfile, SimulationResult, Task, TaskResult, TaskStatus


@dataclass(slots=True)
class _RuntimeTask:
    task: Task
    server: ServerProfile
    status: TaskStatus = TaskStatus.PENDING
    remaining_payload_mb: float = 0.0
    remaining_execution_sec: float = 0.0
    transfer_started_at: float = 0.0
    transfer_finished_at: float | None = None
    run_started_at: float | None = None
    queue_wait_time_sec: float = 0.0
    error_message: str | None = None

    def __post_init__(self) -> None:
        self.remaining_payload_mb = self.task.payload_size_mb
        self.remaining_execution_sec = (
            self.task.processing_duration_sec / self.server.processing_speed
        )


class DiscreteEventSimulator:
    """Deterministic server simulation with equal-bandwidth transfer sharing."""

    def __init__(self, profiles: Mapping[ServerId, ServerProfile], tick_sec: float = 0.001) -> None:
        if tick_sec <= 0:
            raise ValueError("tick_sec must be positive")
        self.profiles = profiles
        self.tick_sec = tick_sec

    def simulate(self, tasks: list[Task], allocation: list[ServerId]) -> SimulationResult:
        if len(tasks) != len(allocation):
            raise ValueError("allocation length must match task count")
        runtimes = [
            _RuntimeTask(task, self.profiles[server]) for task, server in zip(tasks, allocation)
        ]
        server_tasks = {
            server_id: [runtime for runtime in runtimes if runtime.server.server_id == server_id]
            for server_id in self.profiles
        }
        for runtimes_for_server in server_tasks.values():
            self._run_server(runtimes_for_server)
        return SimulationResult(tuple(self._to_result(runtime) for runtime in runtimes))

    def _run_server(self, tasks: list[_RuntimeTask]) -> None:
        if not tasks:
            return
        profile = tasks[0].server
        queue: deque[_RuntimeTask] = deque()
        running: list[_RuntimeTask] = []
        transferring = list(tasks)
        ram_in_use = 0.0
        queue_storage_in_use = 0.0
        now = 0.0
        for runtime in transferring:
            runtime.status = TaskStatus.TRANSFERRING

        while transferring or queue or running:
            active_transfers = len(transferring)
            if active_transfers:
                transferred = profile.bandwidth_mb_s / active_transfers * self.tick_sec
                arrived: list[_RuntimeTask] = []
                for runtime in transferring:
                    runtime.remaining_payload_mb -= transferred
                    if runtime.remaining_payload_mb <= 1e-9:
                        runtime.transfer_finished_at = now + self.tick_sec
                        arrived.append(runtime)
                for runtime in arrived:
                    transferring.remove(runtime)
                    if runtime.task.ram_demand_mb > profile.max_ram_mb:
                        self._fail(
                            runtime, "RAM demand exceeds server capacity", now + self.tick_sec
                        )
                    elif runtime.task.cpu_demand_percent > profile.cpu_capacity_percent:
                        self._fail(
                            runtime, "CPU demand exceeds server capacity", now + self.tick_sec
                        )
                    elif ram_in_use + runtime.task.ram_demand_mb > profile.max_ram_mb:
                        self._fail(runtime, "RAM capacity unavailable", now + self.tick_sec)
                    elif queue_storage_in_use + runtime.task.payload_size_mb > profile.storage_mb:
                        self._fail(runtime, "Queue storage capacity exceeded", now + self.tick_sec)
                    else:
                        runtime.status = TaskStatus.IN_QUEUE
                        ram_in_use += runtime.task.ram_demand_mb
                        queue_storage_in_use += runtime.task.payload_size_mb
                        queue.append(runtime)

            available_cpu = profile.cpu_capacity_percent - sum(
                runtime.task.cpu_demand_percent for runtime in running
            )
            while queue and queue[0].task.cpu_demand_percent <= available_cpu:
                runtime = queue.popleft()
                queue_storage_in_use -= runtime.task.payload_size_mb
                runtime.status = TaskStatus.RUNNING
                runtime.run_started_at = now + self.tick_sec
                running.append(runtime)
                available_cpu -= runtime.task.cpu_demand_percent

            expired: list[_RuntimeTask] = []
            for runtime in queue:
                runtime.queue_wait_time_sec += self.tick_sec
                if (
                    self._current_latency(runtime, now + self.tick_sec)
                    > runtime.task.max_tolerable_latency_sec
                ):
                    expired.append(runtime)
            for runtime in expired:
                queue.remove(runtime)
                ram_in_use -= runtime.task.ram_demand_mb
                queue_storage_in_use -= runtime.task.payload_size_mb
                self._fail(runtime, "SLA deadline exceeded", now + self.tick_sec)

            completed: list[_RuntimeTask] = []
            for runtime in running:
                runtime.remaining_execution_sec -= self.tick_sec
                if runtime.remaining_execution_sec <= 1e-9:
                    completed.append(runtime)
            for runtime in completed:
                running.remove(runtime)
                ram_in_use -= runtime.task.ram_demand_mb
                total_latency = self._current_latency(runtime, now + self.tick_sec)
                if total_latency > runtime.task.max_tolerable_latency_sec:
                    self._fail(runtime, "SLA deadline exceeded", now + self.tick_sec)
                else:
                    runtime.status = TaskStatus.FINISHED
            now += self.tick_sec

    def _fail(self, runtime: _RuntimeTask, message: str, now: float) -> None:
        runtime.status = TaskStatus.FAILED
        runtime.error_message = message
        if runtime.transfer_finished_at is None:
            runtime.transfer_finished_at = now

    def _current_latency(self, runtime: _RuntimeTask, now: float) -> float:
        transfer = runtime.transfer_finished_at or now
        return transfer + runtime.queue_wait_time_sec + (
            runtime.task.processing_duration_sec / runtime.server.processing_speed
        )

    def _to_result(self, runtime: _RuntimeTask) -> TaskResult:
        transfer = runtime.transfer_finished_at or 0.0
        execution = runtime.task.processing_duration_sec / runtime.server.processing_speed
        total_latency = self._current_latency(runtime, transfer)
        return TaskResult(
            task_id=runtime.task.task_id,
            assigned_server=runtime.server.server_id,
            status=runtime.status,
            transmission_time_sec=round(transfer, 6),
            queue_wait_time_sec=round(runtime.queue_wait_time_sec, 6),
            execution_time_sec=round(execution, 6),
            total_latency_sec=round(total_latency, 6) if total_latency != inf else inf,
            cpu_usage_percent=runtime.task.cpu_demand_percent,
            memory_usage_mb=runtime.task.ram_demand_mb,
            error_message=runtime.error_message,
        )
