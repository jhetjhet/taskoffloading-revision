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
    telemetry: list[dict] = ()


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
    telemetry: list[dict] = []

    for task_idx, task in enumerate(tasks):
        feasible = [
            profile
            for profile in profiles.values()
            if _single_task_feasible(task, profile)
        ]
        candidates = {}
        for s_id, profile in profiles.items():
            is_feas = _single_task_feasible(task, profile)
            trans_ms = round((task.payload_size_mb / profile.bandwidth_mb_s) * 1000, 2)
            net_ms = round(profile.network_latency_ms, 2)
            proc_ms = round((task.processing_duration_sec / profile.processing_speed) * 1000, 2)
            est_latency = round(net_ms + trans_ms + proc_ms, 2)
            score = round((net_ms / 1000 + task.payload_size_mb / profile.bandwidth_mb_s) * 1000 + (proc_ms * 0.5), 2)
            res_avail = round((1.0 - (task.ram_demand_mb / profile.max_ram_mb)) * 100, 1) if is_feas else 0.0
            candidates[s_id.value] = {
                "server_id": s_id.value,
                "label": "Edge Server A" if s_id == ServerId.EDGE else "Cloud Server B",
                "latency_ms": est_latency,
                "proc_time_ms": proc_ms,
                "resource_avail": max(0.0, res_avail),
                "heuristic_score": score,
                "feasible": is_feas,
            }

        if not feasible:
            selected_server = ServerId.CLOUD
            reason = "Task requirements exceeded Edge limits; fell back to Cloud."
        else:
            selected = min(
                feasible,
                key=lambda profile: (
                    profile.network_latency_ms / 1000 + task.payload_size_mb / profile.bandwidth_mb_s,
                    task.processing_duration_sec / profile.processing_speed,
                    profile.server_id,
                ),
            )
            selected_server = selected.server_id
            if selected_server == ServerId.EDGE:
                reason = f"Edge selected with lower heuristic score ({candidates[ServerId.EDGE.value]['heuristic_score']}) and network latency."
            else:
                reason = f"Cloud selected with faster processing capability ({candidates[ServerId.CLOUD.value]['heuristic_score']})."

        allocation.append(selected_server)
        telemetry.append({
            "task_index": task_idx,
            "task_id": task.task_id,
            "task_name": task.task_name or task.task_id,
            "candidates": candidates,
            "selected_server": selected_server.value,
            "decision_reason": reason,
        })

    simulation = DiscreteEventSimulator(profiles, tick_sec).simulate(tasks, allocation)
    return AllocationResult(tuple(allocation), simulation, iterations_performed=len(tasks), telemetry=telemetry)


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
    telemetry: list[dict] = []

    def evaluate(position: list[int]) -> object:
        allocation = [ServerId.CLOUD if bit else ServerId.EDGE for bit in position]
        return simulator.simulate(tasks, allocation)

    swarm = []
    for p_idx in range(particles):
        position = [randomizer.randrange(2) for _ in range(dimensions)]
        result = evaluate(position)
        swarm.append({
            "id": f"P{p_idx + 1}",
            "position": position,
            "velocity": [randomizer.uniform(-0.2, 0.2) for _ in range(dimensions)],
            "best_position": position.copy(),
            "best_result": result,
            "result": result,
        })
    global_best = min(swarm, key=lambda particle: _fitness(particle["best_result"]))
    global_position = global_best["best_position"].copy()
    global_result = global_best["best_result"]

    # Record initial iteration 0 telemetry
    def build_iter_snapshot(iter_num: int) -> dict:
        part_summaries = []
        for p in swarm[:4]: # Top 4 particles for UI clarity
            pos_ratio = sum(p["position"]) / max(1, dimensions)
            leaning = "Cloud Server B" if pos_ratio >= 0.5 else "Edge Server A"
            fit_val = round(p["result"].total_completed_latency_sec + (p["result"].failed_count * 10.0), 3)
            part_summaries.append({
                "name": p["id"],
                "x": round(pos_ratio, 3),
                "fitness": fit_val,
                "leaning": leaning,
            })
        best_x = round(sum(global_position) / max(1, dimensions), 3)
        best_fit = round(global_result.total_completed_latency_sec + (global_result.failed_count * 10.0), 3)
        edge_count = global_position.count(0)
        cloud_count = global_position.count(1)
        return {
            "iteration": iter_num,
            "total_iterations": iterations,
            "best_fitness": best_fit,
            "best_x": best_x,
            "recommended_server": "SERVER_B" if best_x >= 0.5 else "SERVER_A",
            "global_allocation": ["SERVER_B" if bit else "SERVER_A" for bit in global_position],
            "edge_task_count": edge_count,
            "cloud_task_count": cloud_count,
            "particles": part_summaries,
        }

    telemetry.append(build_iter_snapshot(0))

    inertia, cognitive, social, max_velocity = 0.7, 1.5, 1.5, 4.0
    for iter_idx in range(1, iterations + 1):
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

        telemetry.append(build_iter_snapshot(iter_idx))

    allocation = tuple(ServerId.CLOUD if bit else ServerId.EDGE for bit in global_position)
    return AllocationResult(allocation, global_result, iterations, telemetry=telemetry)
