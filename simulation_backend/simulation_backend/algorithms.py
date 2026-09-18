from __future__ import annotations

import random
from dataclasses import dataclass
from math import exp
from typing import Mapping

from .domain import ServerId, ServerProfile, Task
from .engine import DiscreteEventSimulator


@dataclass(frozen=True, slots=True)
class AllocationResult:
    allocation: tuple[ServerId, ...]
    simulation: object
    iterations_performed: int = 0


def _single_task_feasible(task: Task, profile: ServerProfile) -> bool:
    return (
        task.ram_demand_mb <= profile.max_ram_mb
        and task.cpu_demand_percent <= profile.cpu_capacity_percent
        and task.payload_size_mb <= profile.storage_mb
    )


def compute_gbfs(
    tasks: list[Task], profiles: Mapping[ServerId, ServerProfile], tick_sec: float = 0.01
) -> AllocationResult:
    """Allocate in input order using immediate network cost, never future batch balance."""
    allocation: list[ServerId] = []
    for task in tasks:
        feasible = [
            profile
            for profile in profiles.values()
            if _single_task_feasible(task, profile)
        ]
        if not feasible:
            allocation.append(ServerId.CLOUD)
            continue
        selected = min(
            feasible,
            key=lambda profile: (
                profile.network_latency_ms / 1000 + task.payload_size_mb / profile.bandwidth_mb_s,
                task.processing_duration_sec / profile.processing_speed,
                profile.server_id,
            ),
        )
        allocation.append(selected.server_id)
    simulation = DiscreteEventSimulator(profiles, tick_sec).simulate(tasks, allocation)
    return AllocationResult(tuple(allocation), simulation)


def _fitness(result: object) -> tuple[float, float, float, float]:
    return (
        result.failed_count,
        result.sla_breach_count,
        result.total_completed_latency_sec,
        result.worst_completed_latency_sec,
    )


def compute_binary_pso(
    tasks: list[Task],
    profiles: Mapping[ServerId, ServerProfile],
    *,
    seed: int = 12345,
    particles: int = 12,
    iterations: int = 40,
    tick_sec: float = 0.01,
) -> AllocationResult:
    """Search binary Edge/Cloud allocations using deterministic binary PSO."""
    if particles < 2 or iterations < 1:
        raise ValueError("particles must be at least two and iterations must be positive")
    randomizer = random.Random(seed)
    simulator = DiscreteEventSimulator(profiles, tick_sec)
    dimensions = len(tasks)

    def evaluate(position: list[int]) -> object:
        allocation = [ServerId.CLOUD if bit else ServerId.EDGE for bit in position]
        return simulator.simulate(tasks, allocation)

    swarm = []
    for _ in range(particles):
        position = [randomizer.randrange(2) for _ in range(dimensions)]
        result = evaluate(position)
        swarm.append({
            "position": position,
            "velocity": [randomizer.uniform(-0.2, 0.2) for _ in range(dimensions)],
            "best_position": position.copy(),
            "best_result": result,
            "result": result,
        })
    global_best = min(swarm, key=lambda particle: _fitness(particle["best_result"]))
    global_position = global_best["best_position"].copy()
    global_result = global_best["best_result"]

    inertia, cognitive, social, max_velocity = 0.7, 1.5, 1.5, 4.0
    for _ in range(iterations):
        for particle in swarm:
            for dimension in range(dimensions):
                velocity = (
                    inertia * particle["velocity"][dimension]
                    + cognitive
                    * randomizer.random()
                    * (particle["best_position"][dimension] - particle["position"][dimension])
                    + social
                    * randomizer.random()
                    * (global_position[dimension] - particle["position"][dimension])
                )
                particle["velocity"][dimension] = max(-max_velocity, min(max_velocity, velocity))
                probability = 1 / (1 + exp(-particle["velocity"][dimension]))
                particle["position"][dimension] = int(randomizer.random() < probability)
            particle["result"] = evaluate(particle["position"])
            if _fitness(particle["result"]) < _fitness(particle["best_result"]):
                particle["best_position"] = particle["position"].copy()
                particle["best_result"] = particle["result"]
            if _fitness(particle["best_result"]) < _fitness(global_result):
                global_position = particle["best_position"].copy()
                global_result = particle["best_result"]
    allocation = tuple(ServerId.CLOUD if bit else ServerId.EDGE for bit in global_position)
    return AllocationResult(allocation, global_result, iterations)
