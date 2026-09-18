from __future__ import annotations

from collections.abc import Iterable

from .domain import Task


def generate_workload(
    templates: Iterable[Task],
    workload: str | None = None,
    *,
    multiplier: int = 1,
    selected_ids: Iterable[str] | None = None,
) -> list[Task]:
    """Return a batch built from task templates.

    Workload tiers are no longer stored on each task. The caller decides which templates
    belong in a batch and how many times to repeat them. The legacy `workload` argument
    is kept only for backward compatibility and is ignored for computation.
    """
    del workload
    template_list = list(templates)
    if multiplier < 1:
        raise ValueError("multiplier must be at least 1")

    if selected_ids is not None:
        selected_ids_set = set(selected_ids)
        selected = [task for task in template_list if task.task_id in selected_ids_set]
        if len(selected) != len(selected_ids_set):
            missing = selected_ids_set - {task.task_id for task in template_list}
            raise ValueError(f"unknown task ids requested: {sorted(missing)}")
        return selected * multiplier

    return template_list * multiplier
