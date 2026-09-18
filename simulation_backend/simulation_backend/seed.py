from __future__ import annotations

import asyncio
import csv
from pathlib import Path

from .database import apply_schema, connect


async def seed() -> None:
    data_dir = Path(__file__).parent.parent / "data"
    pool = await connect()
    try:
        await apply_schema(pool)
        async with pool.acquire() as connection:
            async with connection.transaction():
                with (data_dir / "machines.csv").open(newline="") as file:
                    for row in csv.DictReader(file):
                        await connection.execute(
                            """
                            INSERT INTO machines (id, name) VALUES ($1, $2)
                            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
                            """,
                            row["id"],
                            row["name"],
                        )
                with (data_dir / "task_templates.csv").open(newline="") as file:
                    for row in csv.DictReader(file):
                        await connection.execute(
                            """
                            INSERT INTO task_templates (
                                id, source_machine_id, task_name, payload_size_mb,
                                processing_duration_sec, cpu_demand_percent, ram_demand_mb,
                                max_tolerable_latency_sec
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (id) DO UPDATE SET
                                source_machine_id = EXCLUDED.source_machine_id,
                                task_name = EXCLUDED.task_name,
                                payload_size_mb = EXCLUDED.payload_size_mb,
                                processing_duration_sec = EXCLUDED.processing_duration_sec,
                                cpu_demand_percent = EXCLUDED.cpu_demand_percent,
                                ram_demand_mb = EXCLUDED.ram_demand_mb,
                                max_tolerable_latency_sec = EXCLUDED.max_tolerable_latency_sec
                            """,
                            row["id"],
                            row["source_machine_id"],
                            row["task_name"],
                            float(row["payload_size_mb"]),
                            float(row["processing_duration_sec"]),
                            float(row["cpu_demand_percent"]),
                            float(row["ram_demand_mb"]),
                            float(row["max_tolerable_latency_sec"]),
                        )
        print("Seeded 5 machines and 15 task templates.")
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(seed())
