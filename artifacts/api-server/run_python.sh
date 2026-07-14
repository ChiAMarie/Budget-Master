#!/bin/bash
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
exec uvicorn python.main:app --host 0.0.0.0 --port "$PORT"
