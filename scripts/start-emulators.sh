#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="ava-dash"
BACKUP_DIR="$PROJECT_DIR/.firebase-backup/data"

cd "$PROJECT_DIR"

CURRENT_PROJECT=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
	echo "[ava-dash-emulators] ERROR: .firebaserc default project is '$CURRENT_PROJECT', expected '$PROJECT_ID'"
	exit 1
fi

echo "[ava-dash-emulators] Starting Firebase emulators for project: $PROJECT_ID"

if [ -d "$BACKUP_DIR" ]; then
	echo "[ava-dash-emulators] Found backup data at $BACKUP_DIR — importing..."
	firebase emulators:start \
		--project "$PROJECT_ID" \
		--import "$BACKUP_DIR" \
		--export-on-exit "$BACKUP_DIR"
else
	echo "[ava-dash-emulators] No backup found — starting fresh emulators..."
	mkdir -p "$BACKUP_DIR"
	firebase emulators:start \
		--project "$PROJECT_ID" \
		--export-on-exit "$BACKUP_DIR"
fi
