"""Redis executor isolated to one algorithm and one simulated server."""

import asyncio
import json
import os
from queue import Queue

import redis.asyncio as redis

from .domain import CLOUD_PROFILE, EDGE_PROFILE, ServerId, Task
from .engine import DiscreteEventSimulator

PROFILES = {ServerId.EDGE: EDGE_PROFILE, ServerId.CLOUD: CLOUD_PROFILE}

_PLACEMENT_LABEL: dict[str, str] = {
    ServerId.EDGE.value: "EDGE",
    ServerId.CLOUD.value: "CLOUD",
}


async def main() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
    owner = os.environ["SIMULATION_OWNER"]
    event_delay_sec = max(0.0, float(os.environ.get("SIMULATION_EVENT_DELAY_SEC", "0.02")))
    time_scale = max(0.0, float(os.environ.get("SIMULATION_TIME_SCALE", "0.02")))
    execution_tick_sec = max(
        0.001, float(os.environ.get("SIMULATION_EXECUTION_TICK_SEC", "0.01"))
    )
    client = redis.from_url(redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(f"simulation:commands:{owner}")
    async for message in pubsub.listen():
        if message["type"] == "message":
            command = json.loads(message["data"])
            if f"{command['algorithm']}:{command['server']}" != owner:
                continue
            server = ServerId(command["server"])
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
                            "placement": _PLACEMENT_LABEL.get(event["usage"]["server_id"], event["usage"]["server_id"]),
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
