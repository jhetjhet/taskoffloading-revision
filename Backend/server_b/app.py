from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════════════════
# SUPABASE REST API CONFIG
# Set these in Render → Environment Variables:
#   SUPABASE_URL = https://bsqxvqbrxwecdexkijpd.supabase.co
#   SUPABASE_KEY = your anon/public key
# ══════════════════════════════════════════════════
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

local_logs = []

def sb_headers():
    return {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation"
    }

def sb_post(table, data):
    """INSERT a row into a Supabase table."""
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=sb_headers(),
        json=data,
        timeout=5
    )
    r.raise_for_status()
    return r.json()

def sb_get(table, params=None):
    """GET rows from a Supabase table."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=sb_headers(),
        params=params or {},
        timeout=5
    )
    r.raise_for_status()
    return r.json()

# ══════════════════════════════════════════════════
# ROOT
# ══════════════════════════════════════════════════
@app.route("/")
def index():
    return jsonify({
        "status":  "online",
        "message": "EdgeOffload API — Server B",
        "routes": [
            "GET  /health",
            "GET  /api/health",
            "POST /api/gbfs",
            "POST /api/pso",
            "POST /api/offload",
            "GET  /api/logs"
        ]
    })

# ══════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════
@app.route("/health")
def health():
    if not SUPABASE_URL:
        return jsonify({"status": "ok", "db": "in-memory simulation", "server": "B"})
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/offload_logs?limit=1",
            headers=sb_headers(),
            timeout=5
        )
        if r.status_code in [200, 206]:
            return jsonify({"status": "ok", "db": "connected via Supabase REST", "server": "B"})
        else:
            return jsonify({"status": "error", "db": r.text}), 500
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 500

@app.route("/api/health")
def api_health():
    return jsonify({"status": "online", "server": "B"})

# ══════════════════════════════════════════════════
# POST /api/gbfs
# ══════════════════════════════════════════════════
@app.route("/api/gbfs", methods=["POST"])
def run_gbfs():
    try:
        m           = request.json["machine"]
        # Server B — Energy-Efficient node: lower energy, slightly higher latency
        latency     = round(m["avgLatency"] * 1.05 + m["transmissionDelay"] * 0.6, 2)
        throughput  = round(m["throughput"]  * 0.80, 2)
        energy      = round(m["energyConsumption"] * 0.65, 2)
        utilization = round(m["cpuUtilization"] * 0.75, 2)
        time        = round(latency + m["transmissionDelay"] * 1.1, 2)
        remark      = "Excellent" if latency < 80 else "Good" if latency < 100 else "Moderate"
        return jsonify({
            "latency":     latency,
            "throughput":  throughput,
            "energy":      energy,
            "utilization": utilization,
            "time":        time,
            "remark":      remark
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════
# POST /api/pso
# ══════════════════════════════════════════════════
@app.route("/api/pso", methods=["POST"])
def run_pso():
    try:
        m           = request.json["machine"]
        # Server B — Energy-Efficient node: PSO optimizes for energy over speed
        latency     = round(m["avgLatency"] * 0.98 + m["transmissionDelay"] * 0.5, 2)
        throughput  = round(m["throughput"]  * 0.85, 2)
        energy      = round(m["energyConsumption"] * 0.55, 2)
        utilization = round(m["cpuUtilization"] * 0.70, 2)
        time        = round(latency + m["transmissionDelay"] * 1.0, 2)
        remark      = "Excellent" if latency < 80 else "Good" if latency < 100 else "Moderate"
        return jsonify({
            "latency":     latency,
            "throughput":  throughput,
            "energy":      energy,
            "utilization": utilization,
            "time":        time,
            "remark":      remark
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════
# POST /api/offload  ← logs to Supabase with server = "B"
# ══════════════════════════════════════════════════
@app.route("/api/offload", methods=["POST"])
def offload_task():
    try:
        data             = request.json or {}
        measured_latency = round(min(data.get("gbfsLatency", 0), data.get("psoLatency", 0)) * 0.97, 2)
        log_entry = {
            "machine_id":       data.get("machineId"),
            "algorithm":        data.get("algorithm"),
            "target_server":    data.get("targetServer"),
            "gbfs_latency":     data.get("gbfsLatency"),
            "pso_latency":      data.get("psoLatency"),
            "measured_latency": measured_latency,
            "status":           "success",
            "server":           "B"
        }

        if SUPABASE_URL:
            try:
                sb_post("offload_logs", log_entry)
            except Exception:
                local_logs.insert(0, log_entry)
        else:
            local_logs.insert(0, log_entry)

        return jsonify({
            "status":          "success",
            "measuredLatency": measured_latency,
            "server":          "B",
            "algorithm":       data.get("algorithm")
        })
    except Exception as e:
        return jsonify({"error": str(e), "server": "B"}), 500

# ══════════════════════════════════════════════════
# GET /api/logs  ← only shows Server B logs
# ══════════════════════════════════════════════════
@app.route("/api/logs")
def get_logs():
    try:
        if SUPABASE_URL:
            rows = sb_get("offload_logs", {
                "select": "*",
                "server": "eq.B",
                "order":  "created_at.desc",
                "limit":  "50"
            })
            return jsonify(rows)
        return jsonify(local_logs[:50])
    except Exception:
        return jsonify(local_logs[:50])

# ══════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════

@app.route("/api/debug")
def debug():
    return jsonify({
        "supabase_url_set": bool(SUPABASE_URL),
        "supabase_key_set": bool(SUPABASE_KEY),
        "url_preview":      SUPABASE_URL[:40] if SUPABASE_URL else "EMPTY",
        "key_preview":      SUPABASE_KEY[:15] if SUPABASE_KEY else "EMPTY",
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1"))
