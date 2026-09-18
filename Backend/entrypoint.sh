#!/bin/sh
set -eu

SERVER_MODE="${SERVER_MODE:-all}"
PORT_A="${PORT_A:-5000}"
PORT_B="${PORT_B:-5001}"

if [ "$SERVER_MODE" = "a" ]; then
    echo "[Backend] Starting Edge Server A on port ${PORT_A}..."
    exec gunicorn --bind "0.0.0.0:${PORT_A}" --workers 2 "app:app"
elif [ "$SERVER_MODE" = "b" ]; then
    echo "[Backend] Starting Cloud Server B on port ${PORT_B}..."
    exec gunicorn --bind "0.0.0.0:${PORT_B}" --workers 2 --chdir "/app/server_b" "app:app"
fi

echo "[Backend] Starting dual simulation servers: Server A (${PORT_A}) and Server B (${PORT_B})..."
gunicorn --bind "0.0.0.0:${PORT_A}" --workers 2 "app:app" &
PID_A=$!
gunicorn --bind "0.0.0.0:${PORT_B}" --workers 2 --chdir "/app/server_b" "app:app" &
PID_B=$!

stop_servers() {
    kill -TERM "$PID_A" "$PID_B" 2>/dev/null || true
}

trap 'stop_servers; exit 143' TERM INT

while kill -0 "$PID_A" 2>/dev/null && kill -0 "$PID_B" 2>/dev/null; do
    sleep 1
done

stop_servers
wait "$PID_A" 2>/dev/null || STATUS=$?
wait "$PID_B" 2>/dev/null || STATUS=${STATUS:-$?}
exit "${STATUS:-0}"
