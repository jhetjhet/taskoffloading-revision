"""Redis executor isolated to one algorithm and one simulated server."""

import asyncio
import json
import os

import redis.asyncio as redis

from .domain import CLOUD_PROFILE, EDGE_PROFILE, ServerId, Task
from .engine import DiscreteEventSimulator

PROFILES = {ServerId.EDGE: EDGE_PROFILE, ServerId.CLOUD: CLOUD_PROFILE}


async def main() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
    owner = os.environ["SIMULATION_OWNER"]
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
            for task in tasks:
                await client.publish(
                    "simulation:events",
                    json.dumps(
                        {
                            "event": "task",
                            "run_id": command["run_id"],
                            "algorithm": command["algorithm"],
                            "server": server.value,
                            "task_id": task.task_id,
                            "status": "TRANSFERRING",
                        }
                    ),
                )
            results = DiscreteEventSimulator({server: PROFILES[server]}).simulate(
                tasks, [server] * len(tasks)
            )
            for task in results.tasks:
                await client.publish(
                    "simulation:events",
                    json.dumps(
                        {
                            "event": "task",
                            "run_id": command["run_id"],
                            "algorithm": command["algorithm"],
                            "server": server.value,
                            "task_id": task.task_id,
                            "status": task.status.value,
                            "error_message": task.error_message,
                        }
                    ),
                )


if __name__ == "__main__":
    asyncio.run(main())
