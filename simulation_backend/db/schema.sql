CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE machines
    ADD COLUMN IF NOT EXISTS image TEXT;

CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY,
    source_machine_id TEXT NOT NULL REFERENCES machines(id),
    task_name TEXT NOT NULL,
    payload_size_mb DOUBLE PRECISION NOT NULL CHECK (payload_size_mb > 0),
    processing_duration_sec DOUBLE PRECISION NOT NULL CHECK (processing_duration_sec > 0),
    cpu_demand_percent DOUBLE PRECISION NOT NULL CHECK (cpu_demand_percent > 0),
    ram_demand_mb DOUBLE PRECISION NOT NULL CHECK (ram_demand_mb > 0),
    max_tolerable_latency_sec DOUBLE PRECISION NOT NULL CHECK (max_tolerable_latency_sec > 0),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    seed BIGINT NOT NULL,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE simulation_runs
    ADD COLUMN IF NOT EXISTS input JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS algorithm_results (
    run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    algorithm TEXT NOT NULL CHECK (algorithm IN ('GBFS', 'PSO')),
    allocation JSONB NOT NULL,
    iterations_performed INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL,
    result JSONB NOT NULL,
    PRIMARY KEY (run_id, algorithm)
);

CREATE TABLE IF NOT EXISTS task_execution_results (
    run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    algorithm TEXT NOT NULL CHECK (algorithm IN ('GBFS', 'PSO')),
    task_id TEXT NOT NULL,
    assigned_server TEXT NOT NULL CHECK (assigned_server IN ('SERVER_A', 'SERVER_B')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'TRANSFERRING', 'IN_QUEUE', 'RUNNING', 'FINISHED', 'FAILED')),
    transmission_time_sec DOUBLE PRECISION NOT NULL,
    queue_wait_time_sec DOUBLE PRECISION NOT NULL,
    execution_time_sec DOUBLE PRECISION NOT NULL,
    total_latency_sec DOUBLE PRECISION NOT NULL,
    cpu_usage_percent DOUBLE PRECISION NOT NULL,
    memory_usage_mb DOUBLE PRECISION NOT NULL,
    error_message TEXT,
    PRIMARY KEY (run_id, algorithm, task_id)
);

CREATE INDEX IF NOT EXISTS simulation_runs_created_at_idx ON simulation_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS task_execution_results_run_id_idx ON task_execution_results (run_id);
