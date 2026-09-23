"""Redis executor isolated to one algorithm and one simulated server."""

import asyncio
import json
import os
from queue import Queue

import redis.asyncio as redis

from .domain import Task
from .engine import DiscreteEventSimulator
from .server_catalog import OFFLOAD_PROFILES, server_key

PROFILES = OFFLOAD_PROFILES

async def main() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
    algorithm = os.environ.get("SIMULATION_ALGORITHM")
    owner = os.environ.get("SIMULATION_OWNER")
    if not algorithm and owner:
        algorithm = owner.split(":", 1)[0]
    if algorithm not in {"GBFS", "PSO"}:
        raise ValueError("SIMULATION_ALGORITHM must be GBFS or PSO")
    event_delay_sec = max(0.0, float(os.environ.get("SIMULATION_EVENT_DELAY_SEC", "0.02")))
    time_scale = max(0.0, float(os.environ.get("SIMULATION_TIME_SCALE", "0.02")))
    execution_tick_sec = max(
        0.001, float(os.environ.get("SIMULATION_EXECUTION_TICK_SEC", "0.01"))
    )
    client = redis.from_url(redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.psubscribe(f"simulation:commands:{algorithm}:*")
    async for message in pubsub.listen():
        if message["type"] == "pmessage":
            command = json.loads(message["data"])
            if command.get("algorithm") != algorithm:
                continue
            raw_server_key = str(command["server"])
            server = next((server_id for server_id in PROFILES if server_key(server_id) == raw_server_key), None)
            if server is None:
                raise ValueError(f"unknown configured server: {raw_server_key}")
            tasks = [Task(**task) for task in command["tasks"]]
            events: Queue[dict | None] = Queue()

            def on_event(event: dict) -> None:
                events.put(event)

            async def simulate() -> object:
                try:
                    return await asyncio.to_thread(
                        DiscreteEventSimulator(
                            {server: PROFILES[server]}, tick_sec=execution_tick_sec
                        ).simulate,
                        tasks,
                        [server] * len(tasks),
                        on_event,
                    )
                finally:
                    events.put(None)

            simulation = asyncio.create_task(simulate())
            previous_simulated_time = 0.0
            while True:
                event = await asyncio.to_thread(events.get)
                if event is None:
                    break
                await client.publish(
                    "simulation:events",
                    json.dumps(
                        {
                            "event": "task",
                            "run_id": command["run_id"],
                            "algorithm": command["algorithm"],
                            **event["task"],
                        }
                    ),
                )
                await client.publish(
                    "simulation:events",
                    json.dumps(
                        {
                            "event": "server_usage",
                            "run_id": command["run_id"],
                            "algorithm": command["algorithm"],
                            **event["usage"],
                            "server_id": f"{command['algorithm']}:{event['usage']['server_id']}",
                            "placement": PROFILES[server].placement or event["usage"]["server_id"],
                        }
                    ),
                )
                simulated_time = float(event["usage"].get("simulated_time_sec", previous_simulated_time))
                wall_delay = max(event_delay_sec, (simulated_time - previous_simulated_time) * time_scale)
                if wall_delay:
                    await asyncio.sleep(wall_delay)
                previous_simulated_time = simulated_time
            await simulation


if __name__ == "__main__":
    asyncio.run(main())
