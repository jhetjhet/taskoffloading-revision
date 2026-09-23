-- Allow configured virtual servers while preserving all existing allocations.
ALTER TABLE task_execution_results
    DROP CONSTRAINT IF EXISTS task_execution_results_assigned_server_check;

ALTER TABLE task_execution_results
    ADD CONSTRAINT task_execution_results_assigned_server_check
    CHECK (length(trim(assigned_server)) > 0);