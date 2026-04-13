#!/usr/bin/env bash
set -uo pipefail

readonly EMULATOR_HUB_PORT=7516
readonly EMULATOR_FIRESTORE_PORT=7511

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="ava-dash"
BACKUP_DIR="$PROJECT_DIR/.firebase-backup/data"
INTERVAL=120

echo "[ava-dash-backup] Starting emulator backup loop (every ${INTERVAL}s)"
echo "[ava-dash-backup] Hub port: $EMULATOR_HUB_PORT"
echo "[ava-dash-backup] Backup dir: $BACKUP_DIR"

check_hub() {
    curl -s "http://localhost:${EMULATOR_HUB_PORT}/emulators" > /dev/null 2>&1
}

verify_hub() {
    local hub_response
    hub_response=$(curl -s "http://localhost:${EMULATOR_HUB_PORT}/emulators" 2>/dev/null)
    if [ -z "$hub_response" ]; then
        return 1
    fi
    if echo "$hub_response" | grep -q "\"firestore\"" && \
       echo "$hub_response" | grep -q "\"port\":${EMULATOR_FIRESTORE_PORT}"; then
        return 0
    fi
    echo "[ava-dash-backup] WARNING: Hub on port ${EMULATOR_HUB_PORT} doesn't match expected config (Firestore port ${EMULATOR_FIRESTORE_PORT})"
    return 1
}

while true; do
	sleep "$INTERVAL"

	if check_hub && verify_hub; then
		echo "[ava-dash-backup] $(date '+%H:%M:%S') Exporting emulator data..."
		mkdir -p "$BACKUP_DIR"
		if FIREBASE_EMULATOR_HUB="localhost:${EMULATOR_HUB_PORT}" \
		    firebase emulators:export "$BACKUP_DIR" --project "$PROJECT_ID" --force 2>&1; then
			echo "[ava-dash-backup] $(date '+%H:%M:%S') Export complete"
		else
			echo "[ava-dash-backup] $(date '+%H:%M:%S') Export failed (non-fatal)"
		fi
	else
		echo "[ava-dash-backup] $(date '+%H:%M:%S') Emulator hub not reachable or hub mismatch — skipping"
	fi
done
