from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

DEFAULT_MACHINES = [
    {"id":"M1","machine_id":"CPCM1","name":"CNC Plasma",      "task_size":50,"bandwidth":100,"processing_time":120,"queue_length":3,"cpu_utilization":60.0,"memory_usage":1.6,"transmission_delay":16,"energy_consumption":2.3,"throughput":12,"avg_latency":88, "category":"Cutting Machines",  "task_type":"Computation-Intensive"},
    {"id":"M2","machine_id":"PCM1", "name":"Plasma Cutting",  "task_size":40,"bandwidth":90, "processing_time":100,"queue_length":2,"cpu_utilization":55.0,"memory_usage":1.3,"transmission_delay":14,"energy_consumption":2.0,"throughput":15,"avg_latency":78, "category":"Cutting Machines",  "task_type":"Computation-Intensive"},
    {"id":"M3","machine_id":"PB2",  "name":"Paint Booth",     "task_size":20,"bandwidth":80, "processing_time":60, "queue_length":1,"cpu_utilization":45.0,"memory_usage":1.2,"transmission_delay":12,"energy_consumption":1.5,"throughput":16,"avg_latency":72, "category":"Finishing Machines","task_type":"Energy-Efficient"},
    {"id":"M4","machine_id":"WM1",  "name":"Arc Welding",     "task_size":30,"bandwidth":100,"processing_time":80, "queue_length":2,"cpu_utilization":55.0,"memory_usage":2.0,"transmission_delay":12,"energy_consumption":2.1,"throughput":18,"avg_latency":92, "category":"Welding Machines",  "task_type":"Computation-Intensive"},
    {"id":"M5","machine_id":"SM3",  "name":"Shearing Machine","task_size":25,"bandwidth":75, "processing_time":70, "queue_length":1,"cpu_utilization":50.0,"memory_usage":1.5,"transmission_delay":15,"energy_consumption":1.8,"throughput":14,"avg_latency":85, "category":"Cutting Machines",  "task_type":"Latency-Sensitive"},
]

local_logs = []

def format_machine(m):
    return {
        "id":                m.get("id"),
        "machineId":         m.get("machine_id") or m.get("machineId"),
        "name":              m.get("name"),
        "taskSize":          m.get("task_size") if m.get("task_size") is not None else m.get("taskSize"),
        "bandwidth":         m.get("bandwidth"),
        "processingTime":    m.get("processing_time") if m.get("processing_time") is not None else m.get("processingTime"),
        "queueLength":       m.get("queue_length") if m.get("queue_length") is not None else m.get("queueLength"),
        "cpuUtilization":    m.get("cpu_utilization") if m.get("cpu_utilization") is not None else m.get("cpuUtilization"),
        "memoryUsage":       m.get("memory_usage") if m.get("memory_usage") is not None else m.get("memoryUsage"),
        "transmissionDelay": m.get("transmission_delay") if m.get("transmission_delay") is not None else m.get("transmissionDelay"),
        "energyConsumption": m.get("energy_consumption") if m.get("energy_consumption") is not None else m.get("energyConsumption"),
        "throughput":        m.get("throughput"),
        "avgLatency":        m.get("avg_latency") if m.get("avg_latency") is not None else m.get("avgLatency"),
        "category":          m.get("category"),
        "taskType":          m.get("task_type") or m.get("taskType"),
    }

def sb_headers():
    return {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation"
    }

def sb_get(table, params=None):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=sb_headers(),
        params=params or {},
        timeout=5
    )
    r.raise_for_status()
    return r.json()

def sb_post(table, data):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=sb_headers(),
        json=data,
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
        "message": "EdgeOffload API — Server A",
        "routes": [
            "GET  /health",
            "GET  /api/health",
            "GET  /api/setup",
            "GET  /api/machines",
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
        return jsonify({"status": "ok", "db": "in-memory simulation", "server": "A"})
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/machines?limit=1",
            headers=sb_headers(),
            timeout=5
        )
        if r.status_code in [200, 206]:
            return jsonify({"status": "ok", "db": "connected via Supabase REST"})
        else:
            return jsonify({"status": "error", "db": r.text}), 500
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 500

@app.route("/api/health")
def api_health():
    return jsonify({"status": "online", "server": "A"})

# ══════════════════════════════════════════════════
# SETUP
# ══════════════════════════════════════════════════
@app.route("/api/setup")
def setup_db():
    if not SUPABASE_URL:
        return jsonify({"status": "ok", "message": "In-memory database ready — 5 default machines available"})
    try:
        existing = sb_get("machines", {"select": "id"})
        if len(existing) > 0:
            return jsonify({"status": "ok", "message": f"Already set up — {len(existing)} machines found"})

        for machine in DEFAULT_MACHINES:
            sb_post("machines", machine)
        return jsonify({"status": "ok", "message": "Database setup complete — 5 machines inserted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════
# GET /api/machines
# ══════════════════════════════════════════════════
@app.route("/api/machines")
def get_machines():
    try:
        if SUPABASE_URL:
            rows = sb_get("machines", {"select": "*", "order": "id"})
        else:
            rows = DEFAULT_MACHINES
        result = {m["id"]: format_machine(m) for m in rows}
        return jsonify(result)
    except Exception:
        result = {m["id"]: format_machine(m) for m in DEFAULT_MACHINES}
        return jsonify(result)

# ══════════════════════════════════════════════════
# GET /api/machines/<id>/task-data
# ══════════════════════════════════════════════════
@app.route("/api/machines/<machine_id>/task-data")
def get_task_data(machine_id):
    try:
        if SUPABASE_URL:
            rows = sb_get("machines", {"select": "*", "id": f"eq.{machine_id}"})
            if rows:
                return jsonify(format_machine(rows[0]))
        for m in DEFAULT_MACHINES:
            if m["id"] == machine_id or m["machine_id"] == machine_id:
                return jsonify(format_machine(m))
        return jsonify({"error": "Machine not found"}), 404
    except Exception:
        for m in DEFAULT_MACHINES:
            if m["id"] == machine_id or m["machine_id"] == machine_id:
                return jsonify(format_machine(m))
        return jsonify({"error": "Machine not found"}), 404

# ══════════════════════════════════════════════════
# POST /api/gbfs
# ══════════════════════════════════════════════════
@app.route("/api/gbfs", methods=["POST"])
def run_gbfs():
    try:
        m           = request.json["machine"]
        latency     = round(m["avgLatency"] * 0.90 + m["transmissionDelay"] * 0.5, 2)
        throughput  = round(m["throughput"]  * 0.88, 2)
        energy      = round(m["energyConsumption"] * 0.90, 2)
        utilization = round(m["cpuUtilization"] * 0.88, 2)
        time        = round(latency + m["transmissionDelay"], 2)
        remark      = "Excellent" if latency < 80 else "Good" if latency < 100 else "Moderate"
        return jsonify({"latency": latency, "throughput": throughput,
                        "energy": energy, "utilization": utilization,
                        "time": time, "remark": remark})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════
# POST /api/pso
# ══════════════════════════════════════════════════
@app.route("/api/pso", methods=["POST"])
def run_pso():
    try:
        m           = request.json["machine"]
        latency     = round(m["avgLatency"] * 0.82 + m["transmissionDelay"] * 0.4, 2)
        throughput  = round(m["throughput"]  * 0.95, 2)
        energy      = round(m["energyConsumption"] * 0.82, 2)
        utilization = round(m["cpuUtilization"] * 0.80, 2)
        time        = round(latency + m["transmissionDelay"] * 0.9, 2)
        remark      = "Excellent" if latency < 80 else "Good" if latency < 100 else "Moderate"
        return jsonify({"latency": latency, "throughput": throughput,
                        "energy": energy, "utilization": utilization,
                        "time": time, "remark": remark})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════
# POST /api/offload
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
            "status":           "success"
        }
        if SUPABASE_URL:
            try:
                sb_post("offload_logs", log_entry)
            except Exception:
                local_logs.insert(0, log_entry)
        else:
            local_logs.insert(0, log_entry)

        return jsonify({"status": "success", "measuredLatency": measured_latency,
                        "server": data.get("targetServer"), "algorithm": data.get("algorithm")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════
# GET /api/logs
# ══════════════════════════════════════════════════
@app.route("/api/logs")
def get_logs():
    try:
        if SUPABASE_URL:
            rows = sb_get("offload_logs", {"select": "*", "order": "created_at.desc", "limit": "50"})
            return jsonify(rows)
        return jsonify(local_logs[:50])
    except Exception:
        return jsonify(local_logs[:50])

# ══════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1"))
