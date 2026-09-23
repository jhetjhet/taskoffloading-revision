"""Configured offload server profiles shared by planning, workers, and reports."""

from __future__ import annotations

import json
import os
import re
from dataclasses import replace
from pathlib import Path
from typing import Any

from .domain import CLOUD_PROFILE, EDGE_PROFILE, ServerId, ServerProfile

_SERVER_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
_PROFILE_FIELDS = (
    "network_latency_ms",
    "processing_speed",
    "storage_mb",
    "max_ram_mb",
    "cpu_cores",
    "bandwidth_mb_s",
    "energy_coefficient",
)


def server_key(server_id: object) -> str:
    return str(server_id.value if isinstance(server_id, ServerId) else server_id)


def _default_profiles() -> dict[str, ServerProfile]:
    return {
        server_key(EDGE_PROFILE.server_id): replace(
            EDGE_PROFILE,
            server_id=server_key(EDGE_PROFILE.server_id),
            name="Edge Server A",
            placement="EDGE",
        ),
        server_key(CLOUD_PROFILE.server_id): replace(
            CLOUD_PROFILE,
            server_id=server_key(CLOUD_PROFILE.server_id),
            name="Cloud Server B",
            placement="CLOUD",
        ),
    }


def _configuration_payload() -> dict[str, Any] | None:
    raw_json = os.environ.get("SIMULATION_SERVER_PROFILES")
    if raw_json:
        return json.loads(raw_json)

    configured_path = os.environ.get("SIMULATION_SERVER_PROFILES_FILE")
    candidate = Path(configured_path) if configured_path else Path(__file__).with_name("server_profiles.json")
    if not candidate.exists():
        return None
    return json.loads(candidate.read_text(encoding="utf-8"))


def _validate_profile(server_id: object, raw_profile: object) -> ServerProfile:
    key = server_key(server_id)
    if not key or key == ServerId.LOCAL.value or not _SERVER_ID_PATTERN.fullmatch(key):
        raise ValueError(f"invalid offload server id: {key!r}")
    if not isinstance(raw_profile, dict):
        raise ValueError(f"profile for {key} must be an object")

    missing = [field for field in _PROFILE_FIELDS if field not in raw_profile]
    if missing:
        raise ValueError(f"profile for {key} is missing: {', '.join(missing)}")
    values: dict[str, Any] = {}
    for field in _PROFILE_FIELDS:
        try:
            values[field] = float(raw_profile[field])
        except (TypeError, ValueError) as error:
            raise ValueError(f"profile {key}.{field} must be numeric") from error
        if values[field] <= 0:
            raise ValueError(f"profile {key}.{field} must be positive")
    values["cpu_cores"] = int(values["cpu_cores"])
    if values["cpu_cores"] < 1:
        raise ValueError(f"profile {key}.cpu_cores must be a positive integer")

    placement = str(raw_profile.get("placement", key)).strip()
    name = str(raw_profile.get("name", key)).strip()
    if not name or not placement:
        raise ValueError(f"profile {key} requires non-empty name and placement")
    return ServerProfile(server_id=key, name=name, placement=placement, **values)


def load_profiles() -> dict[str, ServerProfile]:
    payload = _configuration_payload()
    if payload is None:
        return _default_profiles()
    if not isinstance(payload, dict) or not payload:
        raise ValueError("server profile configuration must be a non-empty JSON object")
    profiles = {}
    for server_id, raw_profile in payload.items():
        profile = _validate_profile(server_id, raw_profile)
        profiles[profile.server_id] = profile
    if len(profiles) != len(payload):
        raise ValueError("server profile IDs must be unique")
    return profiles


OFFLOAD_PROFILES: dict[str, ServerProfile] = load_profiles()
