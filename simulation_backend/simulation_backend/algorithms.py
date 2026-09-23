from __future__ import annotations

import random
from dataclasses import dataclass
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
    tasks: list[Task], profiles: Mapping[str, ServerProfile], tick_sec: float = 0.01
) -> AllocationResult:
    """Sequential greedy allocation considering immediate transfer, queue backlog, and capacity constraints."""
    allocation: list[ServerId] = []
    telemetry: list[dict] = []

    # Running load state across the batch for each server
    server_ram_used: dict[ServerId, float] = {s_id: 0.0 for s_id in profiles}
    server_storage_used: dict[ServerId, float] = {s_id: 0.0 for s_id in profiles}
    server_busy_time_sec: dict[ServerId, float] = {s_id: 0.0 for s_id in profiles}

    for task_idx, task in enumerate(tasks):
        candidates = {}
        feasible_servers: list[ServerId] = []

        for s_id, profile in profiles.items():
            single_fit = _single_task_feasible(task, profile)
            ram_fit = (server_ram_used[s_id] + task.ram_demand_mb) <= profile.max_ram_mb
            storage_fit = (server_storage_used[s_id] + task.payload_size_mb) <= profile.storage_mb
            is_feas = single_fit and ram_fit and storage_fit

            trans_ms = round((task.payload_size_mb / profile.bandwidth_mb_s) * 1000, 2)
            net_ms = round(profile.network_latency_ms, 2)
            proc_ms = round((task.processing_duration_sec / profile.processing_speed) * 1000, 2)
            queue_est_ms = round(server_busy_time_sec[s_id] * 1000, 2)

            # Combined estimated latency: Network RTT + Transmission + Queued Backlog + CPU Execution
            est_latency = round(net_ms + trans_ms + queue_est_ms + proc_ms, 2)
            score = round(net_ms + trans_ms + (queue_est_ms * 0.01) + (proc_ms * 0.1), 2)
            res_avail = round(max(0.0, (1.0 - ((server_ram_used[s_id] + task.ram_demand_mb) / profile.max_ram_mb)) * 100), 1) if single_fit else 0.0

            server_id = s_id.value if isinstance(s_id, ServerId) else str(s_id)
            candidates[server_id] = {
                "server_id": server_id,
                "label": server_id,
                "latency_ms": est_latency,
                "proc_time_ms": proc_ms,
                "queue_est_ms": queue_est_ms,
                "resource_avail": res_avail,
                "heuristic_score": score,
                "feasible": is_feas,
            }

            if is_feas:
                feasible_servers.append(s_id)

        if not feasible_servers:
            # If both exceed soft batch limits, pick Cloud (highest hardware capacity)
            selected_server = max(
                profiles,
                key=lambda server_id: (
                    profiles[server_id].max_ram_mb,
                    profiles[server_id].storage_mb,
                    profiles[server_id].processing_speed,
                ),
            )
            reason = f"No server met the batch constraints; allocated to {selected_server}."
        else:
            # Greedy choice: minimize total heuristic score (considering latency, backlog, and speed)
            selected_server = min(
                feasible_servers,
                key=lambda s_id: candidates[
                    s_id.value if isinstance(s_id, ServerId) else str(s_id)
                ]["heuristic_score"],
            )
            selected_score = candidates[
                selected_server.value if isinstance(selected_server, ServerId) else str(selected_server)
            ]["heuristic_score"]
            reason = f"{selected_server} selected with the lowest feasible heuristic score ({selected_score})."

        # Update running server state
        allocation.append(selected_server)
        server_ram_used[selected_server] += task.ram_demand_mb
        server_storage_used[selected_server] += task.payload_size_mb
        # Accumulate execution time scaled by cores
        profile_selected = profiles[selected_server]
        task_exec_sec = task.processing_duration_sec / profile_selected.processing_speed
        server_busy_time_sec[selected_server] = max(
            0.0, server_busy_time_sec[selected_server] + (task_exec_sec / max(1, profile_selected.cpu_cores)) - 0.2
        )

        telemetry.append({
            "task_index": task_idx,
            "task_id": task.task_id,
            "task_name": task.task_name or task.task_id,
            "candidates": candidates,
                "selected_server": (
                    selected_server.value
                    if isinstance(selected_server, ServerId)
                    else str(selected_server)
                ),
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


def compute_pso(
    tasks: list[Task],
    profiles: Mapping[str, ServerProfile],
    *,
    seed: int = 12345,
    particles: int = 12,
    iterations: int = 40,
    threshold: float = 0.5,
    tick_sec: float = 0.01,
) -> AllocationResult:
    """Search allocations across all configured servers using deterministic continuous PSO."""
    if particles < 2 or iterations < 1:
        raise ValueError("particles must be at least two and iterations must be positive")
    if not 0.0 <= threshold <= 1.0:
        raise ValueError("threshold must be within [0, 1]")

    randomizer = random.Random(seed)
    simulator = DiscreteEventSimulator(profiles, tick_sec)
    server_ids = list(profiles)
    dimensions = len(tasks)
    telemetry: list[dict] = []

    def allocate(position: list[float]) -> list[ServerId]:
        return [server_ids[min(int(value * len(server_ids)), len(server_ids) - 1)] for value in position]

    def evaluate(position: list[float]) -> object:
        return simulator.simulate(tasks, allocate(position))

    swarm = []
    for p_idx in range(particles):
        position = [randomizer.random() for _ in range(dimensions)]
        velocity = [randomizer.uniform(-0.3, 0.3) for _ in range(dimensions)]
        result = evaluate(position)
        swarm.append({
            "id": f"P{p_idx + 1}",
            "position": position,
            "velocity": velocity,
            "best_position": position.copy(),
            "best_result": result,
            "result": result,
        })

    global_best = min(swarm, key=lambda particle: _fitness(particle["best_result"]))
    global_position = global_best["best_position"].copy()
    global_result = global_best["best_result"]

    def build_iter_snapshot(iter_num: int) -> dict:
        part_summaries = []
        for p in swarm[:4]:
            pos_ratio = sum(p["position"]) / max(1, dimensions)
            leaning = server_ids[min(int(pos_ratio * len(server_ids)), len(server_ids) - 1)]
            fit_val = round(p["result"].total_completed_latency_sec + (p["result"].failed_count * 10.0), 3)
            part_summaries.append({
                "name": p["id"],
                "x": round(pos_ratio, 3),
                "fitness": fit_val,
                "leaning": leaning,
            })
        best_x = round(sum(global_position) / max(1, dimensions), 3)
        best_fit = round(global_result.total_completed_latency_sec + (global_result.failed_count * 10.0), 3)
        allocation = [server_ids[min(int(value * len(server_ids)), len(server_ids) - 1)] for value in global_position]
        allocation_counts = {server_id: allocation.count(server_id) for server_id in server_ids}
        return {
            "iteration": iter_num,
            "total_iterations": iterations,
            "best_fitness": best_fit,
            "best_x": best_x,
            "recommended_server": max(allocation_counts, key=allocation_counts.get),
            "global_allocation": allocation,
            "allocation_counts": allocation_counts,
            "edge_task_count": allocation_counts.get(ServerId.EDGE.value, 0),
            "cloud_task_count": allocation_counts.get(ServerId.CLOUD.value, 0),
            "particles": part_summaries,
        }

    telemetry.append(build_iter_snapshot(0))

    inertia, cognitive, social, max_velocity = 0.7, 1.5, 1.5, 1.0
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
                particle["position"][dimension] = max(
                    0.0,
                    min(1.0, particle["position"][dimension] + particle["velocity"][dimension]),
                )
            particle["result"] = evaluate(particle["position"])
            if _fitness(particle["result"]) < _fitness(particle["best_result"]):
                particle["best_position"] = particle["position"].copy()
                particle["best_result"] = particle["result"]
            if _fitness(particle["best_result"]) < _fitness(global_result):
                global_position = particle["best_position"].copy()
                global_result = particle["best_result"]

        telemetry.append(build_iter_snapshot(iter_idx))

    allocation = tuple(server_ids[min(int(value * len(server_ids)), len(server_ids) - 1)] for value in global_position)
    return AllocationResult(allocation, global_result, iterations, telemetry=telemetry)

